import { Prisma } from "@/generated/prisma/client";
import type { MovimientoFinanciero } from "@/generated/prisma/client";
import { EstadoMovimientoPago } from "@/generated/prisma/enums";
import type {
  EstadoPedido,
  MetodoPago,
  TipoMovimientoPago,
  TipoPago,
} from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";

/**
 * Repositorio de movimientos financieros: única capa que habla con Prisma para
 * este módulo (S3-014).
 *
 * REGLA MULTI-TENANT (barrera de datos):
 *  - Estas funciones NUNCA llaman a `requireAdminContext()`. Reciben el
 *    `pasteleriaId` ya derivado del contexto admin desde la capa de servicio.
 *  - TODA consulta filtra por `pasteleria_id`: un tenant jamás puede leer ni
 *    modificar movimientos de otro.
 *  - `pasteleria_id` y `pedido_id` NUNCA son actualizables.
 *
 * DINERO: los montos llegan del servicio como strings con 2 decimales
 * (p. ej. "150.00") y se persisten tal cual en la columna `Decimal`. Nunca se
 * usa Float como fuente de verdad.
 *
 * TRANSACCIONES: cada función acepta un `db` opcional (cliente de transacción)
 * para que el servicio componga flujos atómicos con
 * `runMovimientosFinancierosTransaction` sin importar Prisma directamente.
 */

// --- Transacciones ------------------------------------------------------------

/**
 * Presupuestos de la transacción interactiva.
 *
 * Los defaults de Prisma (`maxWait` 2 s para OBTENER la conexión y `timeout`
 * 5 s para el cuerpo) asumen una BD local. Contra el pooler remoto de Supabase
 * cada viaje cuesta ~200 ms y el pool se comparte con el render del detalle de
 * pedido, así que abrir la transacción puede tardar más de 2 s; cuando eso pasa
 * Prisma aborta con `P2028` ("Unable to start a transaction in the given time")
 * ANTES de ejecutar ninguna regla de negocio, y el usuario recibe un error
 * técnico en lugar de una validación (bug S4-002 / BUG-S3-022-001).
 *
 * Los valores se amplían a la latencia real del entorno. El cuerpo sigue siendo
 * corto (2 lecturas + 1 escritura), así que el `timeout` es un tope de
 * seguridad, no el caso normal.
 */
const TRANSACTION_MAX_WAIT_MS = 10_000;
const TRANSACTION_TIMEOUT_MS = 15_000;

/**
 * Ejecuta `fn` dentro de `prisma.$transaction`. Permite fijar el nivel de
 * aislamiento (p. ej. `Serializable` para registrar pagos: dos pagos
 * concurrentes al mismo pedido no pueden leer ambos el saldo viejo y sobrepagar).
 */
export function runMovimientosFinancierosTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: {
    isolationLevel?: Prisma.TransactionIsolationLevel;
    maxWait?: number;
    timeout?: number;
  },
): Promise<T> {
  return prisma.$transaction(fn, {
    maxWait: TRANSACTION_MAX_WAIT_MS,
    timeout: TRANSACTION_TIMEOUT_MS,
    ...options,
  });
}

// --- Tipos de datos de entrada (dinero ya calculado como string 2 decimales) -

export type MovimientoFinancieroCreateData = {
  pedido_id: string;
  tipo_movimiento: TipoMovimientoPago;
  metodo_pago: MetodoPago | null;
  tipo_pago: TipoPago | null;
  monto: string;
  referencia: string | null;
  notas: string | null;
};

// --- Lectura del pedido (solo lo financiero) ----------------------------------

export type PedidoFinancieroPayload = {
  id: string;
  total: Prisma.Decimal;
  estado_pedido: EstadoPedido;
};

/**
 * Datos mínimos del pedido para cálculos financieros (`id`, `total` y
 * `estado_pedido`). Lectura de SOLO consulta sobre Pedido (no lo modifica): vive
 * aquí y no en pedidos.repository porque el resumen financiero necesita leer el
 * total dentro de la MISMA transacción que los movimientos. `estado_pedido`
 * permite bloquear pagos en pedidos cancelados (S3-019). Devuelve `null` si el
 * pedido no existe o pertenece a otro tenant.
 */
export async function findPedidoFinanciero(params: {
  pasteleriaId: string;
  pedidoId: string;
  db?: Prisma.TransactionClient;
}): Promise<PedidoFinancieroPayload | null> {
  const { pasteleriaId, pedidoId, db = prisma } = params;

  return db.pedido.findFirst({
    where: { id: pedidoId, pasteleria_id: pasteleriaId },
    select: { id: true, total: true, estado_pedido: true },
  });
}

// --- Consultas de movimientos ---------------------------------------------------

/**
 * Orden del historial: movimiento más reciente primero (`fecha_recepcion`
 * desc, `created_at` desc) con `id` asc como desempate estable (dos filas
 * creadas en el mismo instante no deben reordenarse entre consultas).
 */
const ORDEN_HISTORIAL = [
  { fecha_recepcion: "desc" },
  { created_at: "desc" },
  { id: "asc" },
] satisfies Prisma.MovimientoFinancieroOrderByWithRelationInput[];

/** Todos los movimientos de un pedido del tenant (aplicados y anulados). */
export async function findMovimientosByPedido(params: {
  pasteleriaId: string;
  pedidoId: string;
  db?: Prisma.TransactionClient;
}): Promise<MovimientoFinanciero[]> {
  const { pasteleriaId, pedidoId, db = prisma } = params;

  return db.movimientoFinanciero.findMany({
    where: { pasteleria_id: pasteleriaId, pedido_id: pedidoId },
    orderBy: ORDEN_HISTORIAL,
  });
}

/**
 * Solo los movimientos con `estado = aplicado` de un pedido del tenant: son los
 * únicos que participan en total pagado / saldo (los anulados no suman).
 */
export async function findMovimientosAplicadosByPedido(params: {
  pasteleriaId: string;
  pedidoId: string;
  db?: Prisma.TransactionClient;
}): Promise<MovimientoFinanciero[]> {
  const { pasteleriaId, pedidoId, db = prisma } = params;

  return db.movimientoFinanciero.findMany({
    where: {
      pasteleria_id: pasteleriaId,
      pedido_id: pedidoId,
      estado: EstadoMovimientoPago.aplicado,
    },
    orderBy: ORDEN_HISTORIAL,
  });
}

/**
 * Movimientos APLICADOS de varios pedidos del tenant en una sola consulta
 * (evita N+1 al enriquecer un listado de pedidos con su resumen financiero).
 * Sin orden particular: quien la consuma agrupa por `pedido_id`.
 */
export async function findMovimientosAplicadosByPedidoIds(params: {
  pasteleriaId: string;
  pedidoIds: string[];
  db?: Prisma.TransactionClient;
}): Promise<MovimientoFinanciero[]> {
  const { pasteleriaId, pedidoIds, db = prisma } = params;

  if (pedidoIds.length === 0) {
    return [];
  }

  return db.movimientoFinanciero.findMany({
    where: {
      pasteleria_id: pasteleriaId,
      pedido_id: { in: pedidoIds },
      estado: EstadoMovimientoPago.aplicado,
    },
  });
}

/**
 * Cuenta TODOS los movimientos (aplicados + anulados) de varios pedidos del
 * tenant, agrupados por `pedido_id`, en una sola consulta batch (evita N+1 al
 * enriquecer el listado). A diferencia de `findMovimientosAplicadosByPedidoIds`,
 * aquí NO se filtra por `estado`: la política de eliminación (S4-005) exige
 * confirmación fuerte si existe CUALQUIER movimiento, incluidos los anulados,
 * aunque no tengan impacto en el saldo.
 */
export async function countMovimientosByPedidoIds(params: {
  pasteleriaId: string;
  pedidoIds: string[];
}): Promise<Map<string, number>> {
  const { pasteleriaId, pedidoIds } = params;

  if (pedidoIds.length === 0) {
    return new Map();
  }

  const grupos = await prisma.movimientoFinanciero.groupBy({
    by: ["pedido_id"],
    where: {
      pasteleria_id: pasteleriaId,
      pedido_id: { in: pedidoIds },
    },
    _count: { _all: true },
  });

  return new Map(grupos.map((grupo) => [grupo.pedido_id, grupo._count._all]));
}

/** Un movimiento por id dentro del tenant (o `null`). */
export async function findMovimientoById(params: {
  pasteleriaId: string;
  id: string;
  db?: Prisma.TransactionClient;
}): Promise<MovimientoFinanciero | null> {
  const { pasteleriaId, id, db = prisma } = params;

  return db.movimientoFinanciero.findFirst({
    where: { id, pasteleria_id: pasteleriaId },
  });
}

// --- Escritura -------------------------------------------------------------------

/**
 * Crea un movimiento financiero SIEMPRE con `estado = aplicado` (un movimiento
 * nace válido; anular es la única mutación de estado permitida). El tenant
 * viene del contexto admin, nunca del input.
 */
export async function createMovimientoFinanciero(params: {
  pasteleriaId: string;
  data: MovimientoFinancieroCreateData;
  db?: Prisma.TransactionClient;
}): Promise<MovimientoFinanciero> {
  const { pasteleriaId, data, db = prisma } = params;

  return db.movimientoFinanciero.create({
    data: {
      pasteleria_id: pasteleriaId,
      pedido_id: data.pedido_id,
      tipo_movimiento: data.tipo_movimiento,
      metodo_pago: data.metodo_pago,
      tipo_pago: data.tipo_pago,
      monto: data.monto,
      referencia: data.referencia,
      notas: data.notas,
      estado: EstadoMovimientoPago.aplicado,
    },
  });
}

/**
 * Marca un movimiento como `anulado` (NUNCA se borra físicamente) y reemplaza
 * `notas` con el texto ya compuesto por el servicio (nota original + motivo).
 *
 * El `where` exige `estado = aplicado`, así el update es atómico: si otro
 * proceso lo anuló primero (o no existe / es de otro tenant), `count === 0` y
 * se devuelve `null` sin tocar nada.
 */
export async function anularMovimientoFinanciero(params: {
  pasteleriaId: string;
  id: string;
  notas: string;
  db?: Prisma.TransactionClient;
}): Promise<MovimientoFinanciero | null> {
  const { pasteleriaId, id, notas, db = prisma } = params;

  const result = await db.movimientoFinanciero.updateMany({
    where: {
      id,
      pasteleria_id: pasteleriaId,
      estado: EstadoMovimientoPago.aplicado,
    },
    data: {
      estado: EstadoMovimientoPago.anulado,
      notas,
    },
  });

  if (result.count === 0) {
    return null;
  }

  return db.movimientoFinanciero.findFirst({
    where: { id, pasteleria_id: pasteleriaId },
  });
}
