import { Prisma } from "@/generated/prisma/client";
import { TipoEntrega } from "@/generated/prisma/enums";
import type { EstadoPedido } from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";

/**
 * Repositorio de pedidos: única capa que habla con Prisma para este módulo.
 *
 * REGLA MULTI-TENANT (barrera de datos):
 *  - Estas funciones NUNCA llaman a `requireAdminContext()`. Reciben el
 *    `pasteleriaId` ya derivado del contexto admin desde la capa de servicio.
 *  - TODA consulta de Pedido y PedidoItem filtra por `pasteleria_id`, de modo
 *    que un tenant jamás puede leer ni modificar pedidos de otro.
 *  - `pasteleria_id` NUNCA es actualizable: no aparece en los tipos de update.
 *
 * DINERO: los importes llegan ya calculados por el servicio como strings con 2
 * decimales (p. ej. "1250.00") y se persisten tal cual en columnas `Decimal`.
 * Nunca se convierte un Float como fuente de verdad.
 */

// --- Includes / payloads (forma de los datos que devuelve el repositorio) ----

// Datos mínimos del cliente para el listado (para futuras vistas).
const clienteResumenSelect = {
  id: true,
  nombre: true,
  telefono: true,
  whatsapp: true,
} satisfies Prisma.ClienteSelect;

// Listado: pedido + resumen del cliente (sin items para no traer de más).
const listInclude = {
  cliente: { select: clienteResumenSelect },
} satisfies Prisma.PedidoInclude;

// Detalle: pedido + cliente completo + items.
const detalleInclude = {
  cliente: true,
  items: true,
} satisfies Prisma.PedidoInclude;

export type PedidoListPayload = Prisma.PedidoGetPayload<{
  include: typeof listInclude;
}>;

export type PedidoDetallePayload = Prisma.PedidoGetPayload<{
  include: typeof detalleInclude;
}>;

// --- Tipos de datos de entrada (dinero ya calculado como string 2 decimales) -

export type PedidoItemPersistData = {
  producto_id: string | null;
  nombre_snapshot: string;
  descripcion: string | null;
  cantidad: number;
  precio_unitario: string;
  subtotal: string;
};

export type CreatePedidoData = {
  cliente_id: string;
  fecha_entrega: Date;
  hora_entrega: string;
  tipo_entrega: TipoEntrega;
  direccion_entrega: string | null;
  notas_internas: string | null;
  total: string;
  items: PedidoItemPersistData[];
};

// Campos escalares actualizables. `pasteleria_id` se omite a propósito para que
// sea imposible reasignar el tenant. `total` solo se envía cuando se reemplazan
// items (el servicio recalcula el total en ese caso).
export type UpdatePedidoScalarData = {
  cliente_id?: string;
  fecha_entrega?: Date;
  hora_entrega?: string;
  tipo_entrega?: TipoEntrega;
  direccion_entrega?: string | null;
  notas_internas?: string | null;
  total?: string;
};

export type ListPedidosFilters = {
  search?: string;
  cliente_id?: string;
  estado_pedido?: EstadoPedido;
  fecha_entrega_desde?: Date;
  fecha_entrega_hasta?: Date;
  take: number;
  skip: number;
};

// --- Crear pedido -----------------------------------------------------------

/**
 * Crea un Pedido con sus PedidoItems. La escritura anidada de Prisma
 * (`items.create`) es ATÓMICA: el pedido y todos sus renglones se insertan en
 * una sola transacción, evitando estados parciales. `estado_pedido` se omite a
 * propósito para usar el default de Prisma (`cotizacion`).
 */
export async function createPedidoWithItems(params: {
  pasteleriaId: string;
  data: CreatePedidoData;
}): Promise<PedidoDetallePayload> {
  const { pasteleriaId, data } = params;

  return prisma.pedido.create({
    data: {
      // Tenant SIEMPRE desde el contexto admin, nunca desde el input.
      pasteleria_id: pasteleriaId,
      cliente_id: data.cliente_id,
      fecha_entrega: data.fecha_entrega,
      hora_entrega: data.hora_entrega,
      tipo_entrega: data.tipo_entrega,
      direccion_entrega: data.direccion_entrega,
      total: data.total,
      notas_internas: data.notas_internas,
      items: {
        create: data.items.map((item) => ({
          // Cada item también hereda el tenant desde el contexto.
          pasteleria_id: pasteleriaId,
          producto_id: item.producto_id,
          nombre_snapshot: item.nombre_snapshot,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
        })),
      },
    },
    include: detalleInclude,
  });
}

// --- Listar pedidos ---------------------------------------------------------

export async function listPedidos(params: {
  pasteleriaId: string;
  filters: ListPedidosFilters;
}): Promise<PedidoListPayload[]> {
  const { pasteleriaId, filters } = params;

  const where: Prisma.PedidoWhereInput = {
    // Aislamiento multi-tenant: siempre por pasteleria_id.
    pasteleria_id: pasteleriaId,
  };

  if (filters.cliente_id) {
    where.cliente_id = filters.cliente_id;
  }

  if (filters.estado_pedido) {
    where.estado_pedido = filters.estado_pedido;
  }

  if (filters.fecha_entrega_desde || filters.fecha_entrega_hasta) {
    where.fecha_entrega = {
      ...(filters.fecha_entrega_desde
        ? { gte: filters.fecha_entrega_desde }
        : {}),
      ...(filters.fecha_entrega_hasta
        ? { lte: filters.fecha_entrega_hasta }
        : {}),
    };
  }

  if (filters.search) {
    // Búsqueda sencilla: datos básicos del cliente o notas del pedido.
    where.OR = [
      { cliente: { nombre: { contains: filters.search, mode: "insensitive" } } },
      { cliente: { telefono: { contains: filters.search } } },
      { cliente: { whatsapp: { contains: filters.search } } },
      { notas_internas: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return prisma.pedido.findMany({
    where,
    include: listInclude,
    /**
     * Vista operativa: primero la entrega más próxima.
     *
     *  1. `fecha_entrega` asc: el día de entrega manda.
     *  2. `hora_entrega` asc: se guarda como "HH:mm" en 24 h con cero a la
     *     izquierda, así que el orden alfabético de Postgres coincide con el
     *     cronológico ("09:00" < "13:30" < "23:59").
     *  3. `created_at` desc: entre entregas a la misma fecha y hora, el pedido
     *     más reciente primero.
     *  4. `id` asc: desempate final. `created_at` es un timestamp y dos pedidos
     *     creados en el mismo instante podrían empatar; sin este criterio el
     *     orden de esas filas lo decide Postgres y puede cambiar entre consultas,
     *     duplicando o saltando filas al paginar con `take`/`skip`.
     */
    orderBy: [
      { fecha_entrega: "asc" },
      { hora_entrega: "asc" },
      { created_at: "desc" },
      { id: "asc" },
    ],
    take: filters.take,
    skip: filters.skip,
  });
}

// --- Detalle ----------------------------------------------------------------

export async function findPedidoDetalle(params: {
  pasteleriaId: string;
  id: string;
}): Promise<PedidoDetallePayload | null> {
  const { pasteleriaId, id } = params;

  // `findFirst` con id + pasteleria_id: nunca devuelve un pedido de otro tenant.
  return prisma.pedido.findFirst({
    where: { id, pasteleria_id: pasteleriaId },
    include: detalleInclude,
  });
}

// Estado actual de un pedido del tenant (para validar transiciones). Devuelve
// `null` si no existe o pertenece a otra pastelería. Acepta un `db` opcional
// (cliente de transacción) para leer dentro de un flujo atómico (S3-019).
export async function findPedidoEstado(params: {
  pasteleriaId: string;
  id: string;
  db?: Prisma.TransactionClient;
}): Promise<{ id: string; estado_pedido: EstadoPedido } | null> {
  const { pasteleriaId, id, db = prisma } = params;

  return db.pedido.findFirst({
    where: { id, pasteleria_id: pasteleriaId },
    select: { id: true, estado_pedido: true },
  });
}

// Estado + datos de entrega actuales de un pedido del tenant. Se usa en la
// edición (S4-008) para calcular el tipo/fecha/hora EFECTIVOS tras un patch
// parcial y validar la disponibilidad con esos valores. `null` si no existe o
// es de otro tenant.
export async function findPedidoEntrega(params: {
  pasteleriaId: string;
  id: string;
}): Promise<{
  id: string;
  estado_pedido: EstadoPedido;
  tipo_entrega: TipoEntrega;
  fecha_entrega: Date;
  hora_entrega: string;
} | null> {
  const { pasteleriaId, id } = params;

  return prisma.pedido.findFirst({
    where: { id, pasteleria_id: pasteleriaId },
    select: {
      id: true,
      estado_pedido: true,
      tipo_entrega: true,
      fecha_entrega: true,
      hora_entrega: true,
    },
  });
}

// --- Disponibilidad de entregas a domicilio (S4-008) ------------------------

// Límites [inicio, fin) del día UTC de una fecha de entrega. Las fechas se
// persisten como medianoche UTC (el input es una fecha sin hora), así que el
// rango cubre todo el día sin depender de la zona horaria del servidor.
function rangoDelDiaUTC(fecha: Date): { gte: Date; lt: Date } {
  const inicio = new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
  );
  const fin = new Date(inicio);
  fin.setUTCDate(fin.getUTCDate() + 1);
  return { gte: inicio, lt: fin };
}

/**
 * Entregas a DOMICILIO que bloquean disponibilidad en una fecha (S4-008).
 *
 * Filtra SIEMPRE por:
 *  - `pasteleria_id` (barrera multi-tenant: nunca cruza pastelerías);
 *  - `tipo_entrega = domicilio` (las recolecciones no consumen ventana);
 *  - `estado_pedido ∈ estados` (estados activos que pasa el servicio);
 *  - `fecha_entrega` dentro del día indicado.
 *
 * `excludePedidoId` excluye el propio pedido en edición para que no se
 * autoconflictúe. Los pedidos eliminados (hard delete de S4-005) ya no existen
 * en la tabla, por lo que quedan excluidos de forma natural. Devuelve solo el
 * `id` y la `hora_entrega` (no trae datos de más); la aritmética de la ventana
 * de 30 min vive en `@/modules/pedidos/disponibilidad`.
 */
export async function findBloqueosDomicilioPorFecha(params: {
  pasteleriaId: string;
  fecha_entrega: Date;
  estados: readonly EstadoPedido[];
  excludePedidoId?: string;
}): Promise<{ id: string; hora_entrega: string }[]> {
  const { pasteleriaId, fecha_entrega, estados, excludePedidoId } = params;
  const { gte, lt } = rangoDelDiaUTC(fecha_entrega);

  const where: Prisma.PedidoWhereInput = {
    pasteleria_id: pasteleriaId,
    tipo_entrega: TipoEntrega.domicilio,
    estado_pedido: { in: [...estados] },
    fecha_entrega: { gte, lt },
  };

  if (excludePedidoId) {
    where.id = { not: excludePedidoId };
  }

  return prisma.pedido.findMany({
    where,
    select: { id: true, hora_entrega: true },
    orderBy: [{ hora_entrega: "asc" }, { id: "asc" }],
  });
}

// --- Vista diaria de entregas (S4-012) ---------------------------------------

/**
 * Pedidos programados para una fecha exacta del tenant (S4-012), en los
 * estados que el llamador indique (el service pasa los mismos estados activos
 * de S4-007, `ESTADOS_BLOQUEAN_DISPONIBILIDAD`; este repositorio no decide esa
 * regla, solo filtra por lo que recibe).
 *
 * Reutiliza `rangoDelDiaUTC` (S4-008) para acotar el día completo y
 * `listInclude` (mismo shape que el listado general) para no duplicar el
 * include. Los pedidos eliminados (hard delete de S4-005) ya no existen en la
 * tabla, así que quedan excluidos de forma natural, sin filtro adicional.
 *
 * Orden: hora de entrega ascendente y, para empates, un desempate determinista
 * (`created_at` asc, `id` asc) para que el orden no dependa de cómo Postgres
 * resuelva el empate entre corridas.
 */
export async function findPedidosDelDia(params: {
  pasteleriaId: string;
  fecha: Date;
  estados: readonly EstadoPedido[];
  tipoEntrega?: TipoEntrega;
}): Promise<PedidoListPayload[]> {
  const { pasteleriaId, fecha, estados, tipoEntrega } = params;
  const { gte, lt } = rangoDelDiaUTC(fecha);

  return prisma.pedido.findMany({
    where: {
      pasteleria_id: pasteleriaId,
      estado_pedido: { in: [...estados] },
      fecha_entrega: { gte, lt },
      // Filtro opcional por tipo de entrega (S4-014); si es undefined, no se
      // agrega y conviven domicilio y recolección.
      ...(tipoEntrega ? { tipo_entrega: tipoEntrega } : {}),
    },
    include: listInclude,
    orderBy: [
      { hora_entrega: "asc" },
      { created_at: "asc" },
      { id: "asc" },
    ],
  });
}

// --- Vista semanal de entregas (S4-013) --------------------------------------

/**
 * Pedidos del tenant con `fecha_entrega` dentro de un rango [desde, hasta)
 * arbitrario, en los estados que indique el llamador (el service pasa los
 * mismos estados activos de S4-007/S4-012, `ESTADOS_BLOQUEAN_DISPONIBILIDAD`;
 * este repositorio no decide esa regla).
 *
 * UNA sola consulta por rango para toda la semana (lunes a domingo), en vez de
 * siete consultas por día: el service calcula `desde` (lunes) / `hasta`
 * (lunes siguiente, exclusivo) y aquí solo se filtra. Los pedidos eliminados
 * (hard delete de S4-005) ya no existen en la tabla, así que quedan excluidos
 * de forma natural.
 *
 * Orden: `fecha_entrega` asc (agrupable por día en el service), `hora_entrega`
 * asc dentro del día y el mismo desempate determinista que la vista diaria
 * (`created_at` asc, `id` asc).
 */
export async function findPedidosPorRango(params: {
  pasteleriaId: string;
  desde: Date;
  hasta: Date;
  estados: readonly EstadoPedido[];
  tipoEntrega?: TipoEntrega;
}): Promise<PedidoListPayload[]> {
  const { pasteleriaId, desde, hasta, estados, tipoEntrega } = params;

  return prisma.pedido.findMany({
    where: {
      pasteleria_id: pasteleriaId,
      estado_pedido: { in: [...estados] },
      fecha_entrega: { gte: desde, lt: hasta },
      // Filtro opcional por tipo de entrega (S4-014); si es undefined, no se
      // agrega y conviven domicilio y recolección.
      ...(tipoEntrega ? { tipo_entrega: tipoEntrega } : {}),
    },
    include: listInclude,
    orderBy: [
      { fecha_entrega: "asc" },
      { hora_entrega: "asc" },
      { created_at: "asc" },
      { id: "asc" },
    ],
  });
}

// --- Editar pedido ----------------------------------------------------------

/**
 * Actualiza los campos escalares de un Pedido y, si se envían `items`, los
 * REEMPLAZA por completo (estrategia MVP). Todo ocurre dentro de una única
 * transacción interactiva para evitar estados parciales (p. ej. items borrados
 * sin recrear). Devuelve `null` si el pedido no existe o es de otro tenant.
 */
export async function updatePedidoWithItems(params: {
  pasteleriaId: string;
  id: string;
  data: UpdatePedidoScalarData;
  items?: PedidoItemPersistData[];
}): Promise<PedidoDetallePayload | null> {
  const { pasteleriaId, id, data, items } = params;

  return prisma.$transaction(async (tx) => {
    // 1. Confirmar existencia dentro del tenant (barrera multi-tenant).
    const existing = await tx.pedido.findFirst({
      where: { id, pasteleria_id: pasteleriaId },
      select: { id: true },
    });
    if (!existing) {
      return null;
    }

    // 2. Actualizar solo los campos escalares presentes. Prisma refresca
    //    `updated_at` aunque `data` venga vacío (p. ej. si solo cambian items).
    const updateResult = await tx.pedido.updateMany({
    where: { id, pasteleria_id: pasteleriaId },
    data,
    });

    if (updateResult.count === 0) {
    return null;
  }

    // 3. Reemplazo de items (solo si vienen en la petición).
    if (items) {
      await tx.pedidoItem.deleteMany({
        where: { pedido_id: id, pasteleria_id: pasteleriaId },
      });
      await tx.pedidoItem.createMany({
        data: items.map((item) => ({
          pasteleria_id: pasteleriaId,
          pedido_id: id,
          producto_id: item.producto_id,
          nombre_snapshot: item.nombre_snapshot,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
        })),
      });
    }

    // 4. Releer el detalle actualizado dentro de la misma transacción.
    return tx.pedido.findFirst({
      where: { id, pasteleria_id: pasteleriaId },
      include: detalleInclude,
    });
  });
}

// --- Cambiar estado ---------------------------------------------------------

/**
 * Actualiza SOLO `estado_pedido`. El filtro compuesto (id + pasteleria_id) es
 * atómico: si `count === 0`, el pedido no existe o es de otro tenant y se trata
 * como "no encontrado". La validez de la transición la garantiza el servicio.
 *
 * Acepta un `db` opcional (cliente de transacción) para que la cancelación con
 * retención/devolución (S3-019) registre los movimientos y cambie el estado en
 * un mismo flujo atómico.
 */
export async function updateEstadoPedido(params: {
  pasteleriaId: string;
  id: string;
  estado: EstadoPedido;
  db?: Prisma.TransactionClient;
}): Promise<PedidoDetallePayload | null> {
  const { pasteleriaId, id, estado, db = prisma } = params;

  const result = await db.pedido.updateMany({
    where: { id, pasteleria_id: pasteleriaId },
    data: { estado_pedido: estado },
  });

  if (result.count === 0) {
    return null;
  }

  // Relectura del detalle con el MISMO cliente (dentro de la transacción si se
  // pasó `db`), para no leer fuera del flujo atómico.
  return db.pedido.findFirst({
    where: { id, pasteleria_id: pasteleriaId },
    include: detalleInclude,
  });
}

// --- Eliminar pedido (S4-005) ------------------------------------------------

export type PedidoEliminadoData = {
  id: string;
  cliente_id: string;
  estado_pedido: EstadoPedido;
};

/**
 * Elimina un Pedido junto con sus PedidoItem y MovimientoFinanciero como una
 * unidad completa, dentro de una única transacción interactiva.
 *
 * Ninguna de las dos relaciones (`PedidoItem.pedido_id`, `MovimientoFinanciero.
 * pedido_id`) tiene `onDelete: Cascade` en el schema (son FKs reales de
 * Postgres, requeridas -> default `Restrict`), así que `prisma.pedido.delete`
 * fallaría por violación de FK si hay hijos. Por eso el orden es SIEMPRE:
 * movimientos financieros -> items -> pedido.
 *
 * Barrera multi-tenant: cada paso filtra por `pasteleria_id` (nunca se borra
 * por `id` suelto). Devuelve `null` si el pedido no existe o es de otro
 * tenant, sin tocar nada (política S4-004: sin restricción por estado, se
 * permite eliminar en cualquier estado del ciclo de vida).
 */
export async function deletePedidoConMovimientos(params: {
  pasteleriaId: string;
  id: string;
}): Promise<PedidoEliminadoData | null> {
  const { pasteleriaId, id } = params;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.pedido.findFirst({
      where: { id, pasteleria_id: pasteleriaId },
      select: { id: true, cliente_id: true, estado_pedido: true },
    });
    if (!existing) {
      return null;
    }

    await tx.movimientoFinanciero.deleteMany({
      where: { pedido_id: id, pasteleria_id: pasteleriaId },
    });

    await tx.pedidoItem.deleteMany({
      where: { pedido_id: id, pasteleria_id: pasteleriaId },
    });

    const deleted = await tx.pedido.deleteMany({
      where: { id, pasteleria_id: pasteleriaId },
    });

    if (deleted.count === 0) {
      return null;
    }

    return existing;
  });
}
