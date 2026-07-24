import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { MovimientoFinanciero } from "@/generated/prisma/client";
import {
  EstadoMovimientoPago,
  EstadoPedido,
  TipoMovimientoPago,
  TipoPago,
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
import { evaluarBloqueoPagoPorCotizar } from "@/modules/pedidos/cotizacion-pendiente";
import {
  calcularSaldoPendiente,
  validarMontoPago,
} from "@/modules/pagos/reglas-financieras";
import {
  anularMovimientoFinancieroSchema,
  pedidoFinancieroQuerySchema,
  registrarPagoSchema,
} from "@/validation/pagos";

import type {
  AnticipoConfirmacionDTO,
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
/**
 * Exportada para que `pedidos.service.ts` la reutilice al enriquecer el
 * listado con el resumen financiero (S3-015), sin duplicar esta regla.
 */
export function sumarPagosAplicados(
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
 * Anticipo aplicado = suma (con Decimal) de los movimientos tipo `pago`,
 * estado `aplicado` y `tipo_pago = anticipo`. Es un subconjunto de
 * `sumarPagosAplicados`; se usa para calcular la retención por cancelación
 * (S3-019).
 */
export function sumarAnticiposAplicados(
  movimientos: MovimientoFinanciero[],
): Prisma.Decimal {
  return movimientos
    .filter(
      (movimiento) =>
        movimiento.tipo_movimiento === TipoMovimientoPago.pago &&
        movimiento.estado === EstadoMovimientoPago.aplicado &&
        movimiento.tipo_pago === TipoPago.anticipo,
    )
    .reduce((total, movimiento) => total.plus(movimiento.monto), DECIMAL_CERO);
}

/**
 * Fracción del anticipo aplicado que la pastelería retiene al cancelar un
 * pedido con pagos: 25%. Decimal (nunca 0.25 Float) para un cálculo exacto.
 */
export const RETENCION_CANCELACION_FRACCION = new Prisma.Decimal("0.25");

/**
 * Resumen financiero de una cancelación (todo en Decimal). Función PURA
 * reutilizada por la lectura para UI y por el flujo transaccional de
 * cancelación (S3-019), así las reglas viven en un solo lugar:
 *
 *  - `totalRecibido`     = pagos aplicados (todos los tipos de pago).
 *  - `anticipoAplicado`  = pagos aplicados con `tipo_pago = anticipo`.
 *  - `retencion`         = anticipoAplicado * 25%, redondeado a 2 decimales.
 *  - `devolucion`        = totalRecibido - retencion.
 *  - `tienePagosAplicados` = totalRecibido > 0.
 *
 * Las devoluciones/retenciones previas no cuentan como pagos recibidos porque
 * `sumarPagosAplicados`/`sumarAnticiposAplicados` solo suman `tipo_movimiento =
 * pago`. Los movimientos anulados tampoco cuentan (filtro `aplicado`).
 */
export type ResumenCancelacion = {
  totalRecibido: Prisma.Decimal;
  anticipoAplicado: Prisma.Decimal;
  retencion: Prisma.Decimal;
  devolucion: Prisma.Decimal;
  tienePagosAplicados: boolean;
};

export function calcularResumenCancelacion(
  movimientosAplicados: MovimientoFinanciero[],
): ResumenCancelacion {
  const totalRecibido = sumarPagosAplicados(movimientosAplicados);
  const anticipoAplicado = sumarAnticiposAplicados(movimientosAplicados);
  // Redondeo a 2 decimales (half-up, default de decimal.js) para que la
  // retención sea un monto válido de `Decimal(10, 2)`; la devolución se calcula
  // sobre la retención ya redondeada para que ambos reconcilien con el total.
  const retencion = anticipoAplicado
    .times(RETENCION_CANCELACION_FRACCION)
    .toDecimalPlaces(2);
  const devolucion = totalRecibido.minus(retencion);

  return {
    totalRecibido,
    anticipoAplicado,
    retencion,
    devolucion,
    tienePagosAplicados: totalRecibido.greaterThan(0),
  };
}

/**
 * Estado de pago derivado (S3-014):
 *  - `sin_pago`: total_pagado = 0
 *  - `pagado`:   total_pagado >= total_pedido
 *  - `parcial`:  el resto (0 < total_pagado < total_pedido)
 */
/**
 * Exportada para que `pedidos.service.ts` la reutilice al enriquecer el
 * listado con el resumen financiero (S3-015), sin duplicar esta regla.
 */
export function derivarEstadoPago(
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
  // Regla pura reutilizada (S5-003): saldo = total - pagado, clamp a 0.
  const saldoPendiente = calcularSaldoPendiente(pedido.total, totalPagado);

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

// --- Anticipo mínimo para confirmar (S3-018) ---------------------------------

/**
 * Fracción del total exigida como anticipo mínimo para pasar un pedido de
 * `cotizacion` a `confirmado`: 50%. Se define como Decimal (nunca 0.5 Float)
 * para que el cálculo `total * 0.50` sea exacto.
 */
export const ANTICIPO_MINIMO_FRACCION = new Prisma.Decimal("0.5");

/**
 * Evaluación del anticipo mínimo (todo en Decimal). Función PURA: la reutilizan
 * tanto la lectura para UI (`obtenerAnticipoConfirmacionPedidoService`) como la
 * regla de confirmación en `pedidos.service.ts`, así el 50% vive en un solo
 * lugar.
 */
export type AnticipoConfirmacion = {
  totalPedido: Prisma.Decimal;
  anticipoRequerido: Prisma.Decimal;
  anticipoRegistrado: Prisma.Decimal;
  faltante: Prisma.Decimal;
  cumple: boolean;
};

/**
 * Calcula el anticipo requerido (50% del total), el registrado (total pagado
 * aplicado) y el faltante. `anticipo_registrado` usa exactamente la misma regla
 * que el resumen (`sumarPagosAplicados`): solo movimientos tipo `pago` y estado
 * `aplicado`.
 */
export function evaluarAnticipoConfirmacion(
  totalPedido: Prisma.Decimal,
  movimientosAplicados: MovimientoFinanciero[],
): AnticipoConfirmacion {
  const anticipoRegistrado = sumarPagosAplicados(movimientosAplicados);
  const anticipoRequerido = totalPedido.times(ANTICIPO_MINIMO_FRACCION);
  const cumple = anticipoRegistrado.greaterThanOrEqualTo(anticipoRequerido);
  const faltanteBruto = anticipoRequerido.minus(anticipoRegistrado);
  const faltante = faltanteBruto.isNegative() ? DECIMAL_CERO : faltanteBruto;

  return {
    totalPedido,
    anticipoRequerido,
    anticipoRegistrado,
    faltante,
    cumple,
  };
}

/**
 * Mensaje de negocio (en español) cuando el anticipo no alcanza para confirmar.
 * Vive junto a la regla para que enforcement y texto no se separen.
 */
export function mensajeAnticipoInsuficiente(
  anticipo: AnticipoConfirmacion,
): string {
  return (
    "Para confirmar este pedido se requiere un anticipo mínimo del 50%. " +
    `Requerido: $${anticipo.anticipoRequerido.toFixed(2)}. ` +
    `Registrado: $${anticipo.anticipoRegistrado.toFixed(2)}. ` +
    `Faltante: $${anticipo.faltante.toFixed(2)}.`
  );
}

function toAnticipoConfirmacionDTO(
  pedidoId: string,
  anticipo: AnticipoConfirmacion,
): AnticipoConfirmacionDTO {
  return {
    pedido_id: pedidoId,
    // `Decimal` -> `number` solo como representación de salida (ver types.ts).
    total_pedido: anticipo.totalPedido.toNumber(),
    anticipo_requerido: anticipo.anticipoRequerido.toNumber(),
    anticipo_registrado: anticipo.anticipoRegistrado.toNumber(),
    faltante: anticipo.faltante.toNumber(),
    cumple: anticipo.cumple,
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

// --- Traducción de fallos de infraestructura ---------------------------------

const MENSAJE_SISTEMA_OCUPADO =
  "El sistema está ocupado procesando otras operaciones y no se pudo completar la solicitud. No se guardó ningún cambio; inténtalo de nuevo en unos segundos.";

const MENSAJE_SIN_CONEXION =
  "No se pudo conectar con la base de datos. No se guardó ningún cambio; inténtalo de nuevo en unos segundos.";

/**
 * SQLSTATE de PostgreSQL que significan "no hay conexión disponible" o "la
 * conexión se cayó", nunca "el dato es inválido". Llegan envueltos en un
 * `DriverAdapterError` del adaptador `pg`, que no es un error de Prisma y por
 * tanto no trae `code` propio.
 *
 * `XX000` es genérico, pero el pooler de Supabase lo usa para `EMAXCONNSESSION`
 * ("max clients reached in session mode"), así que se exige además ese texto
 * para no capturar cualquier error interno del servidor.
 */
const SQLSTATE_SIN_CONEXION = new Set([
  "53300", // too_many_connections
  "53400", // configuration_limit_exceeded
  "08000", // connection_exception
  "08001", // sqlclient_unable_to_establish_sqlconnection
  "08004", // sqlserver_rejected_establishment_of_sqlconnection
  "08006", // connection_failure
  "57P01", // admin_shutdown
  "57P03", // cannot_connect_now
]);

/**
 * Mensajes que `pg-pool` lanza como `Error` PLANO (sin código) cuando se agota
 * `connectionTimeoutMillis` esperando una conexión libre, o cuando la conexión
 * se corta por timeout. No son errores de Prisma ni del driver de Postgres, así
 * que solo se pueden reconocer por su texto (constantes de `pg-pool`).
 */
const MENSAJES_TIMEOUT_DEL_POOL = [
  "timeout exceeded when trying to connect",
  "Connection terminated due to connection timeout",
];

// `true` si el error viene del adaptador de driver o del pool por falta de
// conexiones disponibles (nunca por un dato inválido).
function esSaturacionDelDriver(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (MENSAJES_TIMEOUT_DEL_POOL.some((texto) => error.message === texto)) {
    return true;
  }

  if (error.name !== "DriverAdapterError") {
    return false;
  }

  const cause = error.cause as { code?: string; message?: string } | undefined;
  const code = cause?.code;
  if (!code) {
    return false;
  }

  if (code === "XX000") {
    return (cause?.message ?? "").includes("EMAXCONNSESSION");
  }
  return SQLSTATE_SIN_CONEXION.has(code);
}

/**
 * Traduce fallos de INFRAESTRUCTURA de Prisma (no de negocio) a un mensaje
 * funcional en español, o devuelve `null` si el error no es de infraestructura
 * (para que el llamador lo siga tratando como inesperado y lo registre).
 *
 * Ninguno de estos códigos significa que la operación fuera inválida: significan
 * que no se pudo llegar a ejecutar, o que se abortó. En todos los casos la
 * transacción NO se confirmó, así que no queda ningún movimiento financiero ni
 * cambio de estado a medias; por eso el mensaje afirma que no se guardó nada e
 * invita a reintentar.
 *
 * Exportada para que `pedidos.service.ts` y la capa de actions reutilicen la
 * misma traducción sin duplicar los textos.
 */
export function mensajeErrorDeInfraestructura(error: unknown): string | null {
  if (esSaturacionDelDriver(error)) {
    return MENSAJE_SISTEMA_OCUPADO;
  }

  let code: string | undefined;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    code = error.code;
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    code = error.errorCode;
  }

  switch (code) {
    // P2034: conflicto de serialización entre dos transacciones Serializable
    // simultáneas sobre el mismo pedido. La perdedora se aborta entera.
    case "P2034":
      return "Otra operación sobre este pedido se estaba procesando al mismo tiempo. No se guardó ningún cambio; inténtalo de nuevo.";
    // P2028: no se pudo abrir/sostener la transacción interactiva (pool saturado
    // o BD lenta). P2024: se agotó la espera por una conexión libre del pool.
    case "P2028":
    case "P2024":
      return MENSAJE_SISTEMA_OCUPADO;
    // Conectividad con la base de datos (servidor inalcanzable, credenciales,
    // timeout de arranque).
    case "P1001":
    case "P1002":
    case "P1008":
    case "P1017":
      return MENSAJE_SIN_CONEXION;
    default:
      return null;
  }
}

/**
 * Envuelve un flujo transaccional de pagos: convierte los fallos de
 * infraestructura en `PagoServiceError` (mensaje funcional) y deja pasar
 * cualquier otro error para que la action lo registre como inesperado.
 */
async function conErroresDeInfraestructuraControlados<T>(
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const mensaje = mensajeErrorDeInfraestructura(error);
    if (mensaje) {
      throw new PagoServiceError(mensaje);
    }
    throw error;
  }
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

  return conErroresDeInfraestructuraControlados(() =>
    runMovimientosFinancierosTransaction(
      async (tx) => {
        const pedido = await assertPedidoDelTenant({
          pasteleriaId,
          pedidoId: data.pedido_id,
          db: tx,
        });

        // Regla S3-019: un pedido cancelado no admite nuevos pagos (evitaría
        // movimientos posteriores a la cancelación). `entregado` NO se bloquea
        // aquí para no interferir con S3-021 (entrega con saldo pendiente).
        if (pedido.estado_pedido === EstadoPedido.cancelado) {
          throw new PagoServiceError(
            "No se pueden registrar pagos en un pedido cancelado.",
          );
        }

        // Regla S5-010: no se puede registrar un pago mientras el pedido tenga un
        // producto por cotizar o su total no esté cotizado (0 o menor). Va ANTES
        // del cálculo de saldo: con total 0 el saldo es 0 y el anti-sobrepago
        // respondería "ya pagado", un mensaje engañoso para una cotización
        // pendiente. La bandera y el total se leen de la BD dentro de la
        // transacción; nada llega del frontend.
        const bloqueoCotizacion = evaluarBloqueoPagoPorCotizar({
          tieneItemPorCotizar: pedido.tiene_item_por_cotizar,
          totalNoCotizado: pedido.total.lessThanOrEqualTo(0),
        });
        if (bloqueoCotizacion.bloqueado) {
          throw new PagoServiceError(bloqueoCotizacion.motivo);
        }

        const aplicados = await findMovimientosAplicadosByPedido({
          pasteleriaId,
          pedidoId: data.pedido_id,
          db: tx,
        });

        const totalPagado = sumarPagosAplicados(aplicados);
        const saldo = pedido.total.minus(totalPagado);

        // Regla: sin sobrepagos. El saldo es la cota superior del pago. La regla
        // pura (S5-003) decide; aquí se traduce el motivo al mensaje en español.
        const validacion = validarMontoPago(montoDecimal, saldo);
        if (!validacion.ok) {
          if (validacion.motivo === "pedido_pagado") {
            throw new PagoServiceError(
              "El pedido ya está pagado por completo; no admite más pagos.",
            );
          }
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
    ),
  );
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
 * Evaluación del anticipo mínimo para confirmar un pedido del tenant (S3-018),
 * calculada SIEMPRE desde la BD (total del pedido + movimientos aplicados).
 * Pensada como ayuda visual del detalle; la confirmación la sigue bloqueando
 * `changeEstadoPedidoService`.
 */
export async function obtenerAnticipoConfirmacionPedidoService(
  pasteleriaId: string,
  input: unknown,
): Promise<AnticipoConfirmacionDTO> {
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

  return toAnticipoConfirmacionDTO(
    pedido.id,
    evaluarAnticipoConfirmacion(pedido.total, aplicados),
  );
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

  return conErroresDeInfraestructuraControlados(() =>
    runMovimientosFinancierosTransaction(async (tx) => {
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
    }),
  );
}
