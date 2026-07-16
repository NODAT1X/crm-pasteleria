/**
 * Formateadores de presentación del módulo de pedidos.
 *
 * Igual que `labels.ts`, aquí vive SOLO texto de salida: no cambia el valor
 * interno de `hora_entrega` (que se sigue guardando y enviando al backend como
 * `HH:mm` en 24 horas), ni las validaciones, ni las reglas de negocio.
 */

// Mismo formato que valida el backend para `hora_entrega`: "HH:mm" en 24 horas.
const HORA_HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Formatea la hora de entrega (`HH:mm`, 24 h) a 12 horas con a.m./p.m. para el
 * dueño de la pastelería.
 *
 *   00:00 -> 12:00 a.m.    12:00 -> 12:00 p.m.
 *   00:59 -> 12:59 a.m.    14:16 -> 2:16 p.m.
 *                          23:42 -> 11:42 p.m.
 *
 * El formato se construye a mano (en vez de `Intl.DateTimeFormat`) para que sea
 * determinista: la salida de `es-MX` depende de la versión de ICU y puede diferir
 * entre el servidor y el navegador.
 *
 * Nunca lanza: si el valor no tiene formato válido, devuelve el original tal cual
 * como fallback defensivo.
 */
export function formatHoraEntrega(hora: string): string {
  const match =
    typeof hora === "string" ? HORA_HH_MM_REGEX.exec(hora.trim()) : null;

  if (!match) return hora;

  const horas24 = Number(match[1]);
  const minutos = match[2];

  // 00 y 12 se muestran ambas como "12" (medianoche y mediodía).
  const horas12 = horas24 % 12 === 0 ? 12 : horas24 % 12;
  const sufijo = horas24 < 12 ? "a.m." : "p.m.";

  return `${horas12}:${minutos} ${sufijo}`;
}
