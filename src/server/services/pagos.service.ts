import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { MovimientoFinanciero } from "@/generated/prisma/client";
import {
  EstadoMovimientoPago,
  TipoMovimientoPago,
} from "@/generated/prisma/enums";
import {
  anularMovimientoFinanciero,
  createMovimientoFinanciero,
  findMovimientoById,
  findMovimientosAplicadosByPedido,
  findMovimientosByPedido,
  findPedidoFinanciero,
  runMovimientosFinancierosTransaction,
  type PedidoFinancieroPayload,
} from "@/server/repositories/movimientos-financieros.repository";
import {
  anularMovimientoFinancieroSchema,
  pedidoFinancieroQuerySchema,
  registrarPagoSchema,
} from "@/validation/pagos";

import type {
  EstadoPagoDerivado,
  MovimientoConResumenDTO,
  MovimientoFinancieroDTO,
  ResumenFinancieroPedido,
} from "@/modules/pagos/types";

/**
 * Capa de servicio / casos de uso de pagos y saldo (S3-014).
 *
 * Responsabilidades:
 *  - Validar y normalizar la entrada con Zod (nunca confía en el input crudo).
 *  - Reglas de negocio: el pedido debe pertenecer al tenant, no se permiten
 *    sobrepagos y el estado de pago se DERIVA (no se persiste) desde los
 *    movimientos aplicados. El backend es la fuente de verdad del dinero.
 *  - Componer los flujos transaccionales (registrar pago, anular movimiento)
 *    con las primitivas del repositorio.
 *  - Mapear las entidades de Prisma a DTOs planos y serializables.
 *
 * Multi-tenant: `pasteleriaId` llega ya derivado del contexto admin desde la
 * capa de actions; el servicio lo pasa al repositorio pero jamás lo toma del
 * input de negocio.
 *
 * Alcance S3-014: solo se REGISTRAN movimientos de tipo `pago`. Devoluciones y
 * retenciones se registrarán en issues posteriores (el listado ya las mostraría
 * si existieran, y el total pagado solo suma `tipo_movimiento = pago`).
 */

/**
 * Error de negocio con mensaje apto para el usuario final (en español). Las
 * actions lo capturan y lo convierten en `{ ok: false, error }`. Los errores NO
 * controlados (p. ej. de Prisma) no se propagan crudos al cliente.
 */
export class PagoServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PagoServiceError";
  }
}

// Junta los mensajes de las incidencias de Zod en un texto legible (ya están en
// español en el schema, así que basta para la UI).
function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join(" ");
}

// --- Dinero (Decimal como fuente de verdad, nunca Float) ---------------------
// El monto validado por Zod llega como `number` (máx. 2 decimales); aquí se
// convierte a string vía centavos ANTES de cualquier uso (mismo criterio que
// pedidos.service) y todos los cálculos usan `Prisma.Decimal`.

const DECIMAL_CERO = new Prisma.Decimal(0);

// Redondea un monto (ya validado a 2 decimales por Zod) a centavos enteros.
function toCents(value: number): number {
  return Math.round(value * 100);
}

// Convierte centavos enteros a un string "entero.decimales" con 2 decimales,
// apto para persistir directamente en una columna `Decimal` sin pasar por Float.
function centsToDecimalString(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const entero = Math.floor(abs / 100);
  const decimales = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${entero}.${decimales}`;
}

// `number` de Zod -> string decimal de 2 posiciones ("150.5" -> "150.50").
function montoToDecimalString(monto: number): string {
  return centsToDecimalString(toCents(monto));
}

// --- Cálculo de resumen financiero (derivado, nunca persistido) ---------------

/**
 * Total pagado = suma (con Decimal) de los movimientos con
 * `tipo_movimiento = pago` y `estado = aplicado`. Devoluciones, retenciones y
 * movimientos anulados NO suman (regla S3-014).
 */
function sumarPagosAplicados(
  movimientos: MovimientoFinanciero[],
): Prisma.Decimal {
  return movimientos
    .filter(
      (movimiento) =>
        movimiento.tipo_movimiento === TipoMovimientoPago.pago &&
        movimiento.estado === EstadoMovimientoPago.aplicado,
    )
    .reduce((total, movimiento) => total.plus(movimiento.monto), DECIMAL_CERO);
}

/**
 * Estado de pago derivado (S3-014):
 *  - `sin_pago`: total_pagado = 0
 *  - `pagado`:   total_pagado >= total_pedido
 *  - `parcial`:  el resto (0 < total_pagado < total_pedido)
 */
function derivarEstadoPago(
  totalPedido: Prisma.Decimal,
  totalPagado: Prisma.Decimal,
): EstadoPagoDerivado {
  if (totalPagado.lessThanOrEqualTo(0)) {
    return "sin_pago";
  }
  if (totalPagado.greaterThanOrEqualTo(totalPedido)) {
    return "pagado";
  }
  return "parcial";
}

/**
 * Construye el resumen financiero desde el pedido y sus movimientos APLICADOS.
 * `saldo_pendiente = total_pedido - total_pagado`; como el flujo normal impide
 * sobrepagos, nunca debería ser negativo (el clamp a 0 es solo defensa ante
 * datos anómalos históricos, y en ese caso el estado ya sería `pagado`).
 */
function buildResumen(
  pedido: PedidoFinancieroPayload,
  movimientosAplicados: MovimientoFinanciero[],
): ResumenFinancieroPedido {
  const totalPagado = sumarPagosAplicados(movimientosAplicados);
  const saldo = pedido.total.minus(totalPagado);
  const saldoPendiente = saldo.isNegative() ? DECIMAL_CERO : saldo;

  return {
    pedido_id: pedido.id,
    // `Decimal` -> `number` solo como representación de salida (ver types.ts).
    total_pedido: pedido.total.toNumber(),
    total_pagado: totalPagado.toNumber(),
    saldo_pendiente: saldoPendiente.toNumber(),
    estado_pago: derivarEstadoPago(pedido.total, totalPagado),
    movimientos_count: movimientosAplicados.length,
  };
}

// --- Mapeo a DTOs (planos y serializables) ----------------------------------

function toMovimientoDTO(
  movimiento: MovimientoFinanciero,
): MovimientoFinancieroDTO {
  return {
    id: movimiento.id,
    pedido_id: movimiento.pedido_id,
    tipo_movimiento: movimiento.tipo_movimiento,
    metodo_pago: movimiento.metodo_pago,
    tipo_pago: movimiento.tipo_pago,
    // `Decimal` -> `number` solo como representación de salida.
    monto: movimiento.monto.toNumber(),
    referencia: movimiento.referencia,
    notas: movimiento.notas,
    estado: movimiento.estado,
    fecha_recepcion: movimiento.fecha_recepcion,
    created_at: movimiento.created_at,
  };
}

// --- Guardas compartidas -------------------------------------------------------

/**
 * Verifica que el pedido exista y pertenezca al tenant actual (barrera
 * multi-tenant). Lanza `PagoServiceError` si no.
 */
async function assertPedidoDelTenant(params: {
  pasteleriaId: string;
  pedidoId: string;
  db?: Prisma.TransactionClient;
}): Promise<PedidoFinancieroPayload> {
  const pedido = await findPedidoFinanciero(params);
  if (!pedido) {
    throw new PagoServiceError(
      "El pedido no existe o no pertenece a tu pastelería.",
    );
  }
  return pedido;
}

// Conflicto de serialización (dos transacciones Serializable simultáneas sobre
// el mismo pedido): Prisma lo reporta como P2034.
function isConflictoDeConcurrencia(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

// --- Casos de uso -----------------------------------------------------------

/**
 * Registra un PAGO de un pedido. Transaccional con aislamiento `Serializable`:
 * leer pedido -> leer movimientos aplicados -> validar saldo -> crear
 * movimiento ocurre de forma atómica, y dos pagos concurrentes al mismo pedido
 * no pueden leer ambos el saldo viejo y sobrepagar (uno de los dos falla con
 * P2034 y se traduce a un error claro de reintento).
 *
 * `tipo_movimiento = pago` y `estado = aplicado` los fija el backend; la UI
 * jamás los envía (el schema estricto rechaza campos extra).
 */
export async function registrarPagoService(
  pasteleriaId: string,
  input: unknown,
): Promise<MovimientoConResumenDTO> {
  const parsed = registrarPagoSchema.safeParse(input);
  if (!parsed.success) {
    throw new PagoServiceError(formatZodError(parsed.error));
  }
  const data = parsed.data;

  // number validado (>0, 2 decimales) -> string decimal ANTES de calcular.
  const montoString = montoToDecimalString(data.monto);
  const montoDecimal = new Prisma.Decimal(montoString);

  try {
    return await runMovimientosFinancierosTransaction(
      async (tx) => {
        const pedido = await assertPedidoDelTenant({
          pasteleriaId,
          pedidoId: data.pedido_id,
          db: tx,
        });

        const aplicados = await findMovimientosAplicadosByPedido({
          pasteleriaId,
          pedidoId: data.pedido_id,
          db: tx,
        });

        const totalPagado = sumarPagosAplicados(aplicados);
        const saldo = pedido.total.minus(totalPagado);

        // Regla: sin sobrepagos. El saldo es la cota superior del pago.
        if (saldo.lessThanOrEqualTo(0)) {
          throw new PagoServiceError(
            "El pedido ya está pagado por completo; no admite más pagos.",
          );
        }
        if (montoDecimal.greaterThan(saldo)) {
          throw new PagoServiceError(
            `El pago excede el saldo pendiente del pedido ($${saldo.toFixed(2)}). No se permiten sobrepagos.`,
          );
        }

        const movimiento = await createMovimientoFinanciero({
          pasteleriaId,
          data: {
            pedido_id: data.pedido_id,
            // El caso de uso fija el tipo; nunca viene de la UI.
            tipo_movimiento: TipoMovimientoPago.pago,
            metodo_pago: data.metodo_pago,
            tipo_pago: data.tipo_pago,
            monto: montoString,
            referencia: data.referencia ?? null,
            notas: data.notas ?? null,
          },
          db: tx,
        });

        // Resumen recalculado con el pago recién creado incluido.
        const resumen = buildResumen(pedido, [...aplicados, movimiento]);
        return { movimiento: toMovimientoDTO(movimiento), resumen };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (isConflictoDeConcurrencia(error)) {
      throw new PagoServiceError(
        "Otro movimiento de este pedido se estaba registrando al mismo tiempo. Inténtalo de nuevo.",
      );
    }
    throw error;
  }
}

/**
 * Lista TODOS los movimientos financieros de un pedido del tenant (aplicados y
 * anulados, más reciente primero). Valida primero que el pedido pertenezca al
 * tenant para distinguir "pedido inexistente/ajeno" de "sin movimientos".
 */
export async function listarMovimientosFinancierosService(
  pasteleriaId: string,
  input: unknown,
): Promise<MovimientoFinancieroDTO[]> {
  const parsed = pedidoFinancieroQuerySchema.safeParse(input);
  if (!parsed.success) {
    throw new PagoServiceError(formatZodError(parsed.error));
  }

  await assertPedidoDelTenant({
    pasteleriaId,
    pedidoId: parsed.data.pedido_id,
  });

  const movimientos = await findMovimientosByPedido({
    pasteleriaId,
    pedidoId: parsed.data.pedido_id,
  });

  return movimientos.map(toMovimientoDTO);
}

/**
 * Resumen financiero de un pedido del tenant, calculado SIEMPRE desde la BD
 * (total del pedido + movimientos aplicados). Nada se toma del frontend y nada
 * se persiste en Pedido.
 */
export async function obtenerResumenFinancieroPedidoService(
  pasteleriaId: string,
  input: unknown,
): Promise<ResumenFinancieroPedido> {
  const parsed = pedidoFinancieroQuerySchema.safeParse(input);
  if (!parsed.success) {
    throw new PagoServiceError(formatZodError(parsed.error));
  }

  const pedido = await assertPedidoDelTenant({
    pasteleriaId,
    pedidoId: parsed.data.pedido_id,
  });

  const aplicados = await findMovimientosAplicadosByPedido({
    pasteleriaId,
    pedidoId: parsed.data.pedido_id,
  });

  return buildResumen(pedido, aplicados);
}

/**
 * Anula un movimiento financiero del tenant. Transaccional: verificar que
 * existe y no está anulado -> marcar `estado = anulado` (nunca se borra
 * físicamente) -> recalcular el resumen del pedido, todo atómico.
 *
 * El `motivo` (obligatorio en el schema) se ANEXA a las notas del movimiento
 * sin perder la nota original.
 */
export async function anularMovimientoFinancieroService(
  pasteleriaId: string,
  input: unknown,
): Promise<MovimientoConResumenDTO> {
  const parsed = anularMovimientoFinancieroSchema.safeParse(input);
  if (!parsed.success) {
    throw new PagoServiceError(formatZodError(parsed.error));
  }
  const { movimiento_id, motivo } = parsed.data;

  return runMovimientosFinancierosTransaction(async (tx) => {
    const movimiento = await findMovimientoById({
      pasteleriaId,
      id: movimiento_id,
      db: tx,
    });

    if (!movimiento) {
      throw new PagoServiceError(
        "El movimiento no existe o no pertenece a tu pastelería.",
      );
    }
    if (movimiento.estado === EstadoMovimientoPago.anulado) {
      throw new PagoServiceError("El movimiento ya está anulado.");
    }

    // Anexar el motivo de forma clara sin perder la nota anterior.
    const notaAnulacion = `[Anulación] ${motivo}`;
    const notas = movimiento.notas
      ? `${movimiento.notas}\n${notaAnulacion}`
      : notaAnulacion;

    const anulado = await anularMovimientoFinanciero({
      pasteleriaId,
      id: movimiento.id,
      notas,
      db: tx,
    });

    // El update condicionado (estado = aplicado) no afectó filas: otro proceso
    // lo anuló entre la lectura y el update.
    if (!anulado) {
      throw new PagoServiceError("El movimiento ya está anulado.");
    }

    // Recalcular el resumen del pedido dentro de la misma transacción.
    const pedido = await assertPedidoDelTenant({
      pasteleriaId,
      pedidoId: movimiento.pedido_id,
      db: tx,
    });
    const aplicados = await findMovimientosAplicadosByPedido({
      pasteleriaId,
      pedidoId: movimiento.pedido_id,
      db: tx,
    });

    return {
      movimiento: toMovimientoDTO(anulado),
      resumen: buildResumen(pedido, aplicados),
    };
  });
}
