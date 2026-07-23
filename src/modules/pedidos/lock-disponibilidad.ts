/**
 * Generación de la clave del advisory lock de disponibilidad (S5-004).
 *
 * Módulo PURO: no habla con Prisma ni con la sesión. Deriva una clave
 * determinista para `pg_advisory_xact_lock(int4, int4)` a partir de datos de
 * backend confiables (`pasteleriaId` + fecha operativa "YYYY-MM-DD"). Nunca se
 * usa un identificador de tenant proveniente del frontend.
 *
 * El lock es por **tenant + día**: dos escrituras de entrega a domicilio del
 * mismo tenant y la misma fecha se serializan; distintos tenants o distintos
 * días obtienen claves diferentes y conservan su concurrencia. Una eventual
 * colisión de hash solo provocaría serialización innecesaria (nunca incorrecta).
 */

/**
 * Hash FNV-1a de 32 bits, devuelto como entero con signo de 32 bits
 * (`-2^31 .. 2^31-1`), el rango que acepta `int4` de PostgreSQL. Determinista y
 * sin dependencias.
 */
function hash32(input: string): number {
  let h = 0x811c9dc5; // FNV offset basis (32 bits)
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    // FNV prime (32 bits) con `Math.imul` para mantener la multiplicación en 32 bits.
    h = Math.imul(h, 0x01000193);
  }
  // `| 0` normaliza a entero con signo de 32 bits.
  return h | 0;
}

/** Par de claves int4 para `pg_advisory_xact_lock(key1, key2)`. */
export type LockKeyDisponibilidad = {
  key1: number;
  key2: number;
};

/**
 * Clave del advisory lock de disponibilidad para un tenant y una fecha operativa
 * ("YYYY-MM-DD"). El lock se identifica por el PAR `(key1, key2)`: `key1`
 * deriva del tenant y `key2` de la fecha, de modo que el candado aplica a la
 * combinación exacta tenant+día.
 */
export function lockKeyDisponibilidad(
  pasteleriaId: string,
  fechaOperativa: string,
): LockKeyDisponibilidad {
  return {
    key1: hash32(`pasteleria:${pasteleriaId}`),
    key2: hash32(`fecha:${fechaOperativa}`),
  };
}
