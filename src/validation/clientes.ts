import { z } from "zod";

/**
 * Validaciones de backend para el módulo de clientes.
 *
 * Todo lo que entra por una Server Action se valida aquí ANTES de tocar la BD.
 * Nota multi-tenant: `pasteleria_id` NUNCA aparece en estos schemas. El tenant
 * se deriva siempre de `requireAdminContext()` en la capa de actions/servicio;
 * jamás se acepta desde input del cliente (body, form, query, headers, props).
 */

// Longitudes máximas razonables por campo (sin sobre-validar en Sprint 1).
const MAX_NOMBRE = 120;
const MAX_TELEFONO = 30;
const MAX_WHATSAPP = 30;
const MAX_EMAIL = 160;
const MAX_DIRECCION = 300;
const MAX_NOTAS = 1000;
const MAX_SEARCH = 120;

// Límite duro de resultados por página para el listado.
const MAX_TAKE = 50;
const DEFAULT_TAKE = 20;

/**
 * Normaliza un campo de texto opcional al CREAR: recorta espacios y convierte
 * "", solo-espacios, `null` o `undefined` en `null` antes de validar el schema
 * interno. Así lo que se persiste siempre es texto con contenido o `null`
 * (normalización consistente para la BD).
 */
function optionalText<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    }
    return value ?? null;
  }, schema);
}

/**
 * Igual que `optionalText`, pero pensado para ACTUALIZACIONES parciales:
 *  - `undefined` (campo ausente)  -> se conserva `undefined` = "no tocar".
 *  - "" / solo-espacios / `null`  -> `null` = "limpiar el valor".
 *  - texto                        -> texto recortado.
 *
 * Prisma ignora las claves `undefined` en un `update`, por lo que este patrón
 * permite distinguir "no enviar el campo" de "vaciarlo explícitamente".
 */
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

// `nombre` es obligatorio al crear: se recorta y no puede quedar vacío.
const nombreCreate = z
  .string({ error: "El nombre es obligatorio." })
  .trim()
  .min(1, "El nombre es obligatorio.")
  .max(MAX_NOMBRE, `El nombre debe tener como máximo ${MAX_NOMBRE} caracteres.`);

// `nombre` al actualizar es opcional, pero si viene no puede quedar vacío.
const nombreUpdate = z
  .string()
  .trim()
  .min(1, "El nombre no puede quedar vacío.")
  .max(MAX_NOMBRE, `El nombre debe tener como máximo ${MAX_NOMBRE} caracteres.`)
  .optional();

/**
 * Schema para CREAR un cliente. Los campos opcionales quedan normalizados a
 * `string` con contenido o `null`, listos para persistir.
 */
export const createClienteSchema = z.object({
  nombre: nombreCreate,
  telefono: optionalText(
    z
      .string()
      .max(MAX_TELEFONO, `El teléfono debe tener como máximo ${MAX_TELEFONO} caracteres.`)
      .nullable(),
  ),
  whatsapp: optionalText(
    z
      .string()
      .max(MAX_WHATSAPP, `El WhatsApp debe tener como máximo ${MAX_WHATSAPP} caracteres.`)
      .nullable(),
  ),
  email: optionalText(
    z
      .email("El correo electrónico no es válido.")
      .max(MAX_EMAIL, `El correo debe tener como máximo ${MAX_EMAIL} caracteres.`)
      .nullable(),
  ),
  direccion: optionalText(
    z
      .string()
      .max(MAX_DIRECCION, `La dirección debe tener como máximo ${MAX_DIRECCION} caracteres.`)
      .nullable(),
  ),
  notas: optionalText(
    z
      .string()
      .max(MAX_NOTAS, `Las notas deben tener como máximo ${MAX_NOTAS} caracteres.`)
      .nullable(),
  ),
});

/**
 * Schema para ACTUALIZAR un cliente. Todos los campos son opcionales (update
 * parcial). Debe enviarse al menos uno. Los campos ausentes se omiten del
 * `update` de Prisma; enviar "" limpia el valor a `null`.
 */
export const updateClienteSchema = z
  .object({
    nombre: nombreUpdate,
    telefono: patchText(
      z
        .string()
        .max(MAX_TELEFONO, `El teléfono debe tener como máximo ${MAX_TELEFONO} caracteres.`)
        .nullable(),
    ),
    whatsapp: patchText(
      z
        .string()
        .max(MAX_WHATSAPP, `El WhatsApp debe tener como máximo ${MAX_WHATSAPP} caracteres.`)
        .nullable(),
    ),
    email: patchText(
      z
        .email("El correo electrónico no es válido.")
        .max(MAX_EMAIL, `El correo debe tener como máximo ${MAX_EMAIL} caracteres.`)
        .nullable(),
    ),
    direccion: patchText(
      z
        .string()
        .max(MAX_DIRECCION, `La dirección debe tener como máximo ${MAX_DIRECCION} caracteres.`)
        .nullable(),
    ),
    notas: patchText(
      z
        .string()
        .max(MAX_NOTAS, `Las notas deben tener como máximo ${MAX_NOTAS} caracteres.`)
        .nullable(),
    ),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Debes enviar al menos un campo para actualizar.",
  });

/**
 * Schema para LISTAR / BUSCAR clientes.
 *  - `search`: opcional, recortado; "" se descarta (no filtra).
 *  - `take`:   entero acotado a [1, 50] (por defecto 20).
 *  - `skip`:   entero >= 0 (por defecto 0) para paginación.
 */
export const listClientesSchema = z.object({
  search: z.preprocess((value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    }
    return value ?? undefined;
  }, z.string().max(MAX_SEARCH, `La búsqueda debe tener como máximo ${MAX_SEARCH} caracteres.`).optional()),
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
});

// Identificador de cliente (cuid generado por Prisma): solo exigimos texto no
// vacío para no acoplarnos al formato exacto del generador.
export const clienteIdSchema = z
  .string({ error: "Identificador de cliente inválido." })
  .trim()
  .min(1, "Identificador de cliente inválido.");
