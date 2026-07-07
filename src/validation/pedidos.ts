import { z } from "zod";

import { EstadoPedido, TipoEntrega } from "@/generated/prisma/enums";

/**
 * Validaciones de backend para el módulo de pedidos (Sprint 2).
 *
 * Todo lo que entra por una Server Action se valida aquí ANTES de tocar la BD.
 * Nota multi-tenant: `pasteleria_id` NUNCA aparece en estos schemas. El tenant
 * se deriva siempre de `requireAdminContext()` en la capa de actions/servicio;
 * jamás se acepta desde input del cliente (body, form, query, headers, props).
 *
 * Además centraliza las reglas de transición de `estado_pedido` para que el
 * backend (S2-004) valide el cambio contra el estado actual de la BD.
 */

// --- Valores de enum (fuente de verdad: enums generados por Prisma) ---------
// `satisfies` garantiza en tiempo de compilación que estos literales coinciden
// con el enum real; si el schema Prisma cambia un valor, aquí falla el build.
const ESTADO_PEDIDO_VALUES = [
  "cotizacion",
  "confirmado",
  "en_preparacion",
  "listo_para_entregar",
  "entregado",
  "cancelado",
] as const satisfies readonly EstadoPedido[];

const TIPO_ENTREGA_VALUES = [
  "recoleccion",
  "domicilio",
] as const satisfies readonly TipoEntrega[];

export { ESTADO_PEDIDO_VALUES, TIPO_ENTREGA_VALUES };

// Etiquetas legibles en español para mensajes de error de transición.
export const ESTADO_PEDIDO_LABEL: Record<EstadoPedido, string> = {
  cotizacion: "Cotización",
  confirmado: "Confirmado",
  en_preparacion: "En preparación",
  listo_para_entregar: "Listo para entregar",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

// Longitudes máximas razonables por campo (sin sobre-validar en Sprint 2).
const MAX_ID = 60;
const MAX_NOMBRE_SNAPSHOT = 160;
const MAX_DESCRIPCION = 500;
const MAX_DIRECCION = 300;
const MAX_NOTAS = 1000;
const MAX_SEARCH = 120;
const MAX_ITEMS = 100;

// Dinero: acorde a `Decimal(10, 2)` del schema (evita overflow silencioso).
const MONEY_MAX = 99_999_999.99;
// Tope defensivo de cantidad para evitar valores absurdos / overflow.
const MAX_CANTIDAD = 100_000;

// Paginación del listado.
const MAX_TAKE = 50;
const DEFAULT_TAKE = 20;

// Formato de hora "HH:mm" en 24h: 00:00–23:59.
const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// --- Helpers de dinero (aritmética en centavos, sin errores de punto flotante) -

// Redondea a centavos como entero. Útil para comparar montos con exactitud.
function toCents(value: number): number {
  return Math.round(value * 100);
}

// Verdadero si el número tiene como máximo 2 decimales (tolerante al ruido de
// representación binaria: 19.99 * 100 no es exactamente 1999).
function hasAtMostTwoDecimals(value: number): boolean {
  const cents = value * 100;
  return Math.abs(cents - Math.round(cents)) < 1e-6;
}

// Convierte strings numéricos a number (para formularios). "" / espacios ->
// undefined; strings no numéricos se dejan pasar para que el número falle con
// un mensaje de tipo claro.
function toNumberOrKeep(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
}

// Reglas de un monto de dinero: número finito, >= 0, máximo 2 decimales y
// dentro del rango de `Decimal(10, 2)`.
function moneyNumber(label: string) {
  return z
    .number({ error: `${label} es obligatorio y debe ser un número.` })
    .refine((n) => Number.isFinite(n), {
      message: `${label} no es un número válido.`,
    })
    .min(0, `${label} no puede ser negativo.`)
    .max(MONEY_MAX, `${label} excede el máximo permitido.`)
    .refine(hasAtMostTwoDecimals, {
      message: `${label} no puede tener más de 2 decimales.`,
    });
}

// Monto de dinero requerido (acepta number o string numérico).
function money(label: string) {
  return z.preprocess(toNumberOrKeep, moneyNumber(label));
}

// --- Helpers de texto (mismo patrón que src/validation/clientes.ts) ---------

// Al CREAR: recorta; "", solo-espacios, null o undefined -> null.
function optionalText<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    }
    return value ?? null;
  }, schema);
}

// Al ACTUALIZAR (parcial): undefined -> undefined ("no tocar"); ""/espacios ->
// null ("limpiar"); texto -> recortado.
function patchText<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => {
    if (value === undefined) return undefined;
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    }
    return value;
  }, schema.optional());
}

// Filtro de texto opcional (listados): "" -> undefined (no filtra).
function optionalFilterText(max: number, message: string) {
  return z.preprocess((value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    }
    return value ?? undefined;
  }, z.string().max(max, message).optional());
}

// --- Campos compartidos -----------------------------------------------------

const clienteIdRequerido = z
  .string({ error: "El cliente es obligatorio." })
  .trim()
  .min(1, "El cliente es obligatorio.")
  .max(MAX_ID, "Identificador de cliente inválido.");

// Fecha de entrega requerida: acepta Date o string parseable; "" -> requerido.
const fechaEntregaRequerida = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : new Date(trimmed);
  }
  return value;
}, z.date({ error: "La fecha de entrega es obligatoria y debe ser válida." }));

// Hora de entrega requerida en formato "HH:mm".
const horaEntregaRequerida = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return value;
}, z
  .string({ error: "La hora de entrega es obligatoria." })
  .regex(
    HORA_REGEX,
    'La hora de entrega debe tener formato "HH:mm" en 24 horas (por ejemplo 09:00 o 13:30).',
  ));

const estadoPedidoValido = z.enum(ESTADO_PEDIDO_VALUES, {
  error: "El estado del pedido no es válido.",
});

const tipoEntregaValido = z.enum(TIPO_ENTREGA_VALUES, {
  error: "El tipo de entrega no es válido.",
});

// Cantidad: entera y mayor a 0 (sin fracciones en el MVP).
const cantidadRequerida = z.preprocess(
  toNumberOrKeep,
  z
    .number({ error: "La cantidad es obligatoria y debe ser un número." })
    .int("La cantidad debe ser un número entero.")
    .gt(0, "La cantidad debe ser mayor a 0.")
    .max(MAX_CANTIDAD, "La cantidad excede el máximo permitido."),
);

// --- Item de pedido ---------------------------------------------------------

/**
 * Schema de un renglón del pedido. Guarda un snapshot del producto (nombre,
 * descripción y precio) y valida que `subtotal === cantidad * precio_unitario`
 * usando aritmética en centavos para evitar errores de punto flotante.
 */
export const pedidoItemSchema = z
  .object({
    // Preparado para catálogo futuro: opcional y normalizado, sin relación.
    producto_id: optionalText(
      z
        .string()
        .max(MAX_ID, "Identificador de producto inválido.")
        .nullable(),
    ),
    nombre_snapshot: z
      .string({ error: "El nombre del producto es obligatorio." })
      .trim()
      .min(1, "El nombre del producto es obligatorio.")
      .max(
        MAX_NOMBRE_SNAPSHOT,
        `El nombre del producto debe tener como máximo ${MAX_NOMBRE_SNAPSHOT} caracteres.`,
      ),
    descripcion: optionalText(
      z
        .string()
        .max(
          MAX_DESCRIPCION,
          `La descripción debe tener como máximo ${MAX_DESCRIPCION} caracteres.`,
        )
        .nullable(),
    ),
    cantidad: cantidadRequerida,
    precio_unitario: money("El precio unitario"),
    subtotal: money("El subtotal"),
  })
  .superRefine((item, ctx) => {
    // Coherencia exacta en centavos: cantidad * precio_unitario === subtotal.
    const esperadoCents = item.cantidad * toCents(item.precio_unitario);
    const subtotalCents = toCents(item.subtotal);

    if (esperadoCents !== subtotalCents) {
      ctx.addIssue({
        code: "custom",
        path: ["subtotal"],
        message: `El subtotal no coincide con cantidad × precio unitario (esperado ${(
          esperadoCents / 100
        ).toFixed(2)}).`,
      });
    }
  });

// --- Crear pedido -----------------------------------------------------------

/**
 * Schema para CREAR un pedido. El estado inicial (`cotizacion`) lo fija el
 * backend/Prisma, por eso NO se acepta aquí. `total` es opcional (lo calcula el
 * backend en S2-004); si no viene se asume 0, y siempre se valida >= 0.
 */
export const createPedidoSchema = z.object({
  cliente_id: clienteIdRequerido,
  fecha_entrega: fechaEntregaRequerida,
  hora_entrega: horaEntregaRequerida,
  tipo_entrega: tipoEntregaValido,
  direccion_entrega: optionalText(
    z
      .string()
      .max(
        MAX_DIRECCION,
        `La dirección de entrega debe tener como máximo ${MAX_DIRECCION} caracteres.`,
      )
      .nullable(),
  ),
  total: z.preprocess(
    (value) =>
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "")
        ? 0
        : value,
    moneyNumber("El total"),
  ),
  notas_internas: optionalText(
    z
      .string()
      .max(
        MAX_NOTAS,
        `Las notas internas deben tener como máximo ${MAX_NOTAS} caracteres.`,
      )
      .nullable(),
  ),
  items: z
    .array(pedidoItemSchema)
    .min(1, "El pedido debe tener al menos un producto.")
    .max(MAX_ITEMS, `El pedido no puede tener más de ${MAX_ITEMS} productos.`),
});

// --- Actualizar pedido (parcial) --------------------------------------------

/**
 * Schema para ACTUALIZAR un pedido. Edición parcial: todos los campos son
 * opcionales y debe enviarse al menos uno. NO maneja cambio de estado (eso va
 * por `changeEstadoPedidoSchema`). Si se envían `items`, deben ser >= 1 y
 * coherentes en subtotal. Los textos opcionales vacíos se normalizan a `null`.
 */
export const updatePedidoSchema = z
  .object({
    cliente_id: clienteIdRequerido.optional(),
    fecha_entrega: fechaEntregaRequerida.optional(),
    hora_entrega: horaEntregaRequerida.optional(),
    tipo_entrega: tipoEntregaValido.optional(),
    direccion_entrega: patchText(
      z
        .string()
        .max(
          MAX_DIRECCION,
          `La dirección de entrega debe tener como máximo ${MAX_DIRECCION} caracteres.`,
        )
        .nullable(),
    ),
    total: z.preprocess(toNumberOrKeep, moneyNumber("El total")).optional(),
    notas_internas: patchText(
      z
        .string()
        .max(
          MAX_NOTAS,
          `Las notas internas deben tener como máximo ${MAX_NOTAS} caracteres.`,
        )
        .nullable(),
    ),
    items: z
      .array(pedidoItemSchema)
      .min(1, "El pedido debe tener al menos un producto.")
      .max(MAX_ITEMS, `El pedido no puede tener más de ${MAX_ITEMS} productos.`)
      .optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Debes enviar al menos un campo para actualizar.",
  });

// --- Listar / buscar pedidos ------------------------------------------------

// Filtro de fecha opcional (listado): "" -> undefined.
const fechaFilterOpcional = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : new Date(trimmed);
  }
  return value ?? undefined;
}, z.date({ error: "La fecha del filtro no es válida." }).optional());

/**
 * Schema para LISTAR / BUSCAR pedidos. Filtros básicos por tenant; el
 * `pasteleria_id` NO forma parte de la entrada (se deriva del contexto).
 */
export const listPedidosSchema = z
  .object({
    search: optionalFilterText(
      MAX_SEARCH,
      `La búsqueda debe tener como máximo ${MAX_SEARCH} caracteres.`,
    ),
    cliente_id: optionalFilterText(MAX_ID, "Identificador de cliente inválido."),
    estado_pedido: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      estadoPedidoValido.optional(),
    ),
    fecha_entrega_desde: fechaFilterOpcional,
    fecha_entrega_hasta: fechaFilterOpcional,
    take: z.coerce
      .number()
      .default(DEFAULT_TAKE)
      .transform((value) => {
        const n = Math.trunc(value);
        if (Number.isNaN(n) || n < 1) return 1;
        return Math.min(n, MAX_TAKE);
      }),
    skip: z.coerce
      .number()
      .default(0)
      .transform((value) => {
        const n = Math.trunc(value);
        return Number.isNaN(n) || n < 0 ? 0 : n;
      }),
  })
  .refine(
    (data) =>
      !data.fecha_entrega_desde ||
      !data.fecha_entrega_hasta ||
      data.fecha_entrega_desde <= data.fecha_entrega_hasta,
    {
      message:
        'La fecha "desde" no puede ser posterior a la fecha "hasta".',
      path: ["fecha_entrega_hasta"],
    },
  );

// --- Identificador y cambio de estado ---------------------------------------

// Identificador de pedido (cuid). Solo exigimos texto no vacío.
export const pedidoIdSchema = z
  .string({ error: "Identificador de pedido inválido." })
  .trim()
  .min(1, "Identificador de pedido inválido.")
  .max(MAX_ID, "Identificador de pedido inválido.");

/**
 * Schema para CAMBIAR el estado de un pedido. Valida solo la FORMA de entrada
 * (`pedido_id` + `estado_pedido` destino válido). La transición real contra el
 * estado actual (que vendrá de BD en S2-004) se valida con
 * `validateEstadoPedidoTransition` / `canChangeEstadoPedido`.
 */
export const changeEstadoPedidoSchema = z.object({
  pedido_id: pedidoIdSchema,
  estado_pedido: estadoPedidoValido,
});

// --- Reglas de transición de estado (centralizadas) -------------------------

export type EstadoPedidoValue = EstadoPedido;

/**
 * Transiciones permitidas por estado. `Record<EstadoPedido, ...>` obliga (en
 * compilación) a contemplar todos los estados: si se agrega uno nuevo al enum,
 * este mapa deja de compilar hasta actualizarlo.
 *
 *  - cotizacion         -> confirmado | cancelado
 *  - confirmado         -> en_preparacion | cancelado
 *  - en_preparacion     -> listo_para_entregar | cancelado
 *  - listo_para_entregar -> entregado
 *  - entregado          -> (estado final)
 *  - cancelado          -> (estado final)
 *
 * No hay self-transition (un estado nunca se lista a sí mismo).
 */
const TRANSICIONES_ESTADO: Record<EstadoPedido, readonly EstadoPedido[]> = {
  cotizacion: [EstadoPedido.confirmado, EstadoPedido.cancelado],
  confirmado: [EstadoPedido.en_preparacion, EstadoPedido.cancelado],
  en_preparacion: [EstadoPedido.listo_para_entregar, EstadoPedido.cancelado],
  listo_para_entregar: [EstadoPedido.entregado],
  entregado: [],
  cancelado: [],
};

/** Estados a los que se puede avanzar desde `estado` (vacío si es final). */
export function getNextEstadosPedido(
  estado: EstadoPedido,
): EstadoPedidoValue[] {
  return [...(TRANSICIONES_ESTADO[estado] ?? [])];
}

/** ¿Es válida la transición `from -> to`? (sin self-transition). */
export function canChangeEstadoPedido(
  from: EstadoPedido,
  to: EstadoPedido,
): boolean {
  return (TRANSICIONES_ESTADO[from] ?? []).includes(to);
}

export type EstadoPedidoTransitionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Valida la transición `from -> to` devolviendo un resultado con mensaje claro
 * en español (no lanza). Pensada para usarse en el backend (S2-004) contra el
 * estado actual leído de la BD.
 */
export function validateEstadoPedidoTransition(
  from: EstadoPedido,
  to: EstadoPedido,
): EstadoPedidoTransitionResult {
  const fromLabel = ESTADO_PEDIDO_LABEL[from];
  const toLabel = ESTADO_PEDIDO_LABEL[to];
  const permitidos = TRANSICIONES_ESTADO[from] ?? [];

  if (from === to) {
    return {
      ok: false,
      error: `El pedido ya se encuentra en estado "${fromLabel}".`,
    };
  }

  if (permitidos.length === 0) {
    return {
      ok: false,
      error: `El pedido está en estado final "${fromLabel}" y no admite más cambios.`,
    };
  }

  if (!permitidos.includes(to)) {
    const opciones = permitidos
      .map((estado) => `"${ESTADO_PEDIDO_LABEL[estado]}"`)
      .join(", ");
    return {
      ok: false,
      error: `No se permite cambiar el pedido de "${fromLabel}" a "${toLabel}". Estados válidos: ${opciones}.`,
    };
  }

  return { ok: true };
}

// --- Tipos inferidos (única fuente de verdad, sin duplicar formas a mano) ----

export type PedidoItemInput = z.infer<typeof pedidoItemSchema>;
export type CreatePedidoInput = z.infer<typeof createPedidoSchema>;
export type UpdatePedidoInput = z.infer<typeof updatePedidoSchema>;
export type ListPedidosInput = z.infer<typeof listPedidosSchema>;
export type ChangeEstadoPedidoInput = z.infer<typeof changeEstadoPedidoSchema>;
export type PedidoIdInput = z.infer<typeof pedidoIdSchema>;
