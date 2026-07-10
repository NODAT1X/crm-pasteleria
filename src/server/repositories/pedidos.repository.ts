import { Prisma } from "@/generated/prisma/client";
import type { EstadoPedido, TipoEntrega } from "@/generated/prisma/enums";
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
    // Vista operativa: primero la entrega más próxima; desempata por hora y creación.
    orderBy: [
      { fecha_entrega: "asc" },
      { hora_entrega: "asc" },
      { created_at: "desc" },
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
// `null` si no existe o pertenece a otra pastelería.
export async function findPedidoEstado(params: {
  pasteleriaId: string;
  id: string;
}): Promise<{ id: string; estado_pedido: EstadoPedido } | null> {
  const { pasteleriaId, id } = params;

  return prisma.pedido.findFirst({
    where: { id, pasteleria_id: pasteleriaId },
    select: { id: true, estado_pedido: true },
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
 */
export async function updateEstadoPedido(params: {
  pasteleriaId: string;
  id: string;
  estado: EstadoPedido;
}): Promise<PedidoDetallePayload | null> {
  const { pasteleriaId, id, estado } = params;

  const result = await prisma.pedido.updateMany({
    where: { id, pasteleria_id: pasteleriaId },
    data: { estado_pedido: estado },
  });

  if (result.count === 0) {
    return null;
  }

  return findPedidoDetalle({ pasteleriaId, id });
}
