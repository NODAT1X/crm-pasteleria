import { z } from "zod";

import type { MetodoPago, TipoPago } from "@/generated/prisma/enums";
import { pedidoIdSchema } from "@/validation/pedidos";

/**
 * Validaciones de backend para pagos y movimientos financieros (Sprint 3,
 * S3-013).
 *
 * Todo lo que entra por una Server Action se valida aquí ANTES de tocar la BD.
 * Nota multi-tenant: `pasteleria_id` NUNCA aparece en estos schemas. El tenant
 * se deriva siempre de `requireAdminContext()` en la capa de actions/servicio;
 * jamás se acepta desde input del cliente (body, form, query, headers, props).
 *
 * Tampoco se aceptan estados internos desde UI:
 *  - `tipo_movimiento` lo fija el caso de uso (pago / devolución / retención),
 *    por eso hay un schema por operación en lugar de uno genérico.
 *  - `estado` (aplicado/anulado) lo administra el backend; anular tiene su
 *    propio schema con `motivo` obligatorio.
 *
 * Estos schemas validan solo la FORMA del input. Las reglas contra datos de la
 * BD (pertenencia del pedido al tenant, saldo, total pagado, estado de pago)
 * se implementan después en la capa de service (issues posteriores de S3).
 */

// --- Valores de enum (fuente de verdad: enums generados por Prisma) ---------
// `satisfies` garantiza en tiempo de compilación que estos literales coinciden
// con el enum real; si el schema Prisma cambia un valor, aquí falla el build.
// Sprint 3: solo efectivo y transferencia (tarjeta / Mercado Pago fuera).
const METODO_PAGO_VALUES = [
  "efectivo",
  "transferencia",
] as const satisfies readonly MetodoPago[];

const TIPO_PAGO_VALUES = [
  "anticipo",
  "abono",
  "liquidacion",
] as const satisfies readonly TipoPago[];

export { METODO_PAGO_VALUES, TIPO_PAGO_VALUES };

// Longitudes máximas razonables por campo.
const MAX_ID = 60;
const MAX_REFERENCIA = 120;
const MAX_NOTAS = 500;
const MIN_MOTIVO = 3;
const MAX_MOTIVO = 500;

// Dinero: acorde a `Decimal(10, 2)` del schema (evita overflow silencioso).
const MONTO_MAX = 99_999_999.99;

// Formato numérico: entero con decimales opcionales (el signo se acepta aquí
// para poder responder "debe ser mayor a 0" en lugar de "número inválido").
const MONTO_NUMERICO_REGEX = /^-?\d+(\.\d+)?$/;
// Máximo 2 decimales (validación por regex: sin ruido de punto flotante).
const MONTO_DOS_DECIMALES_REGEX = /^-?\d+(\.\d{1,2})?$/;

// --- Helpers ------------------------------------------------------------------

/**
 * Texto opcional de formulario: recorta espacios; "", solo-espacios, `null` o
 * `undefined` se normalizan a `undefined` (el campo simplemente no se envía a
 * la BD y la columna queda NULL). Mensajes en español.
 */
function textoOpcional(label: string, max: number) {
  return z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length === 0 ? undefined : trimmed;
      }
      return value ?? undefined;
    },
    z
      .string()
      .max(max, `${label} debe tener como máximo ${max} caracteres.`)
      .optional(),
  );
}

/**
 * Monto de dinero de formulario (acepta number o string numérico).
 *
 * La validación se hace por regex sobre la forma de texto (sin aritmética de
 * punto flotante): número válido, máximo 2 decimales, mayor a 0 y dentro del
 * rango de `Decimal(10, 2)`. `Number` se usa solo para COMPARAR contra 0 y el
 * máximo (exacto para valores ya validados a 2 decimales), nunca para calcular.
 *
 * Devuelve `number` normalizado (mismo contrato que `money()` en pedidos.ts).
 * Los cálculos financieros reales (total pagado, saldo) los hará el backend
 * con Decimal; aquí no se calcula nada.
 */
const montoSchema = z.preprocess(
  (value) => {
    // Los formularios envían string; JSON puede enviar number.
    if (typeof value === "number") return String(value);
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    }
    return value;
  },
  z
    .string({ error: "El monto es obligatorio y debe ser un número." })
    .superRefine((value, ctx) => {
      if (!MONTO_NUMERICO_REGEX.test(value)) {
        ctx.addIssue({
          code: "custom",
          message: "El monto debe ser un número válido.",
        });
        return;
      }
      if (!MONTO_DOS_DECIMALES_REGEX.test(value)) {
        ctx.addIssue({
          code: "custom",
          message: "El monto debe tener máximo 2 decimales.",
        });
        return;
      }
      const monto = Number(value);
      if (monto <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "El monto debe ser mayor a 0.",
        });
        return;
      }
      if (monto > MONTO_MAX) {
        ctx.addIssue({
          code: "custom",
          message: "El monto excede el máximo permitido.",
        });
      }
    })
    .transform((value) => Number(value)),
);

/**
 * Objeto estricto con mensaje en español para campos extra. Rechaza cualquier
 * clave no declarada (`pasteleria_id`, `estado`, `tipo_movimiento`, etc.).
 */
function strictObjectEs<T extends z.ZodRawShape>(shape: T) {
  return z.strictObject(shape, {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `Se recibieron campos no permitidos: ${issue.keys.join(", ")}.`
        : undefined,
  });
}

// --- Campos compartidos -------------------------------------------------------

const metodoPagoValido = z.enum(METODO_PAGO_VALUES, {
  error: "El método de pago no es válido. Métodos permitidos: efectivo y transferencia.",
});

// Método de pago opcional (selects de formulario pueden enviar ""): "" o null
// se normalizan a `undefined`.
const metodoPagoOpcional = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === ""
      ? undefined
      : (value ?? undefined),
  metodoPagoValido.optional(),
);

const tipoPagoValido = z.enum(TIPO_PAGO_VALUES, {
  error:
    "El tipo de pago no es válido. Tipos permitidos: anticipo, abono y liquidación.",
});

// Identificador de movimiento financiero (cuid): solo texto no vacío.
const movimientoIdRequerido = z
  .string({ error: "Identificador de movimiento inválido." })
  .trim()
  .min(1, "Identificador de movimiento inválido.")
  .max(MAX_ID, "Identificador de movimiento inválido.");

// --- Registrar pago -----------------------------------------------------------

/**
 * Schema para REGISTRAR UN PAGO (tipo_movimiento = `pago`, fijado por el
 * backend, nunca por la UI).
 *
 * Para transferencia, la referencia es operativamente recomendable pero NO
 * bloquea en esta issue (decisión confirmada en S3-013).
 */
export const registrarPagoSchema = strictObjectEs({
  pedido_id: pedidoIdSchema,
  tipo_pago: tipoPagoValido,
  metodo_pago: metodoPagoValido,
  monto: montoSchema,
  referencia: textoOpcional("La referencia", MAX_REFERENCIA),
  notas: textoOpcional("Las notas", MAX_NOTAS),
});

// --- Registrar devolución -------------------------------------------------------

/**
 * Schema para REGISTRAR UNA DEVOLUCIÓN (tipo_movimiento = `devolucion`, fijado
 * por el backend). No acepta `tipo_pago`: una devolución no es
 * anticipo/abono/liquidación. `metodo_pago` es opcional (cómo se devolvió el
 * dinero, si se quiere registrar).
 */
export const registrarDevolucionSchema = strictObjectEs({
  pedido_id: pedidoIdSchema,
  monto: montoSchema,
  metodo_pago: metodoPagoOpcional,
  referencia: textoOpcional("La referencia", MAX_REFERENCIA),
  notas: textoOpcional("Las notas", MAX_NOTAS),
});

// --- Registrar retención --------------------------------------------------------

/**
 * Schema para REGISTRAR UNA RETENCIÓN (tipo_movimiento = `retencion`, fijado
 * por el backend). No acepta `metodo_pago`: la retención no es un cobro nuevo,
 * es dinero ya recibido que la pastelería conserva ante una cancelación.
 * Tampoco acepta `tipo_pago`.
 */
export const registrarRetencionSchema = strictObjectEs({
  pedido_id: pedidoIdSchema,
  monto: montoSchema,
  referencia: textoOpcional("La referencia", MAX_REFERENCIA),
  notas: textoOpcional("Las notas", MAX_NOTAS),
});

// --- Anular movimiento financiero ------------------------------------------------

/**
 * Schema para ANULAR un movimiento financiero. La anulación no borra: el
 * backend marcará el movimiento como `anulado` (EstadoMovimientoPago). El
 * `motivo` es obligatorio para evitar anulaciones silenciosas. El tenant y la
 * pertenencia del movimiento se verifican en el service, no aquí.
 */
export const anularMovimientoFinancieroSchema = strictObjectEs({
  movimiento_id: movimientoIdRequerido,
  motivo: z
    .string({ error: "El motivo de la anulación es obligatorio." })
    .trim()
    .min(
      MIN_MOTIVO,
      `El motivo de la anulación es obligatorio y debe tener al menos ${MIN_MOTIVO} caracteres.`,
    )
    .max(
      MAX_MOTIVO,
      `El motivo debe tener como máximo ${MAX_MOTIVO} caracteres.`,
    ),
});

// --- Tipos inferidos (única fuente de verdad, sin duplicar formas a mano) ----

export type RegistrarPagoInput = z.infer<typeof registrarPagoSchema>;
export type RegistrarDevolucionInput = z.infer<typeof registrarDevolucionSchema>;
export type RegistrarRetencionInput = z.infer<typeof registrarRetencionSchema>;
export type AnularMovimientoFinancieroInput = z.infer<
  typeof anularMovimientoFinancieroSchema
>;
