/**
 * Utilidades de fecha operativa para la vista diaria de entregas (S4-012).
 *
 * Solo trabaja con el día calendario como string "YYYY-MM-DD": nunca expone ni
 * recibe un objeto `Date` con hora, para no arrastrar la zona horaria del
 * navegador ni del servidor a un cálculo que debe ser un día "puro". La
 * conversión a `Date` (medianoche UTC) para consultar el backend ocurre en
 * `@/validation/pedidos` (`fechaOperativaSchema`), la única fuente de verdad de
 * esa transformación y de la validación estricta de calendario.
 *
 * Módulo sin dependencias de Prisma ni de sesión: se importa tanto desde el
 * Server Component de la página como desde el selector de fecha en cliente.
 */

/**
 * Zona horaria operativa de la pastelería, fija por ahora porque el modelo
 * `Pasteleria` (Prisma) no tiene un campo de zona horaria configurable por
 * tenant. Sin este valor explícito, "HOY" se calcularía con la zona del
 * proceso que ejecuta el código: en un Server Component eso es la zona del
 * servidor (p. ej. UTC en Vercel), que puede NO coincidir con el día
 * calendario real de la pastelería en México — el mismo bug para el que se creó
 * este módulo, pero a nivel de "hoy" en vez de a nivel de conversión de fecha.
 *
 * `Intl.DateTimeFormat` con IANA timezone funciona igual en Node (servidor) y
 * en el navegador (cliente) sin dependencias nuevas, así que el botón "Hoy"
 * (cliente) y la fecha por defecto de la página (servidor) siempre calculan el
 * mismo día, sin importar en qué zona corra cada uno.
 */
const ZONA_HORARIA_PASTELERIA = "America/Mexico_City";

const FECHA_OPERATIVA_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Componentes de calendario (año, mes 1-12, día) de `fecha` tal como se ven en
 * `timeZone`, usando `formatToParts` (no el formato de texto de una locale)
 * para no depender de que un patrón como "en-CA" siga produciendo
 * "YYYY-MM-DD" en todos los entornos.
 */
function componentesFechaEnZona(
  fecha: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);

  const year = Number(partes.find((p) => p.type === "year")?.value);
  const month = Number(partes.find((p) => p.type === "month")?.value);
  const day = Number(partes.find((p) => p.type === "day")?.value);

  return { year, month, day };
}

/**
 * ¿El string tiene formato "YYYY-MM-DD" y representa un día de calendario
 * REAL? Mismo criterio estricto que `fechaOperativaSchema`: reconstruye la
 * fecha en UTC y compara sus componentes contra el input, para rechazar
 * fechas que JS normalizaría en silencio (p. ej. "2026-02-30").
 */
export function esFechaOperativaValida(value: string): boolean {
  const match = FECHA_OPERATIVA_REGEX.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const fecha = new Date(Date.UTC(year, month - 1, day));

  return (
    fecha.getUTCFullYear() === year &&
    fecha.getUTCMonth() === month - 1 &&
    fecha.getUTCDate() === day
  );
}

/**
 * Día calendario de HOY en el día operativo de la pastelería
 * (`ZONA_HORARIA_PASTELERIA`), NUNCA en la zona del proceso que ejecuta el
 * código. Ni `getFullYear()/getMonth()/getDate()` (zona del proceso) ni
 * `toISOString()` (siempre UTC) son correctos aquí: en producción (Vercel) el
 * servidor suele correr en UTC, que puede ir hasta 6 horas adelantado del día
 * en Ciudad de México y mostrar "mañana" como si fuera "hoy" cerca de la
 * medianoche. `componentesFechaEnZona` resuelve el día real en esa zona sin
 * importar dónde se ejecute el proceso.
 */
export function hoyFechaOperativaLocal(): string {
  const { year, month, day } = componentesFechaEnZona(
    new Date(),
    ZONA_HORARIA_PASTELERIA,
  );
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Devuelve `value` si es una fecha operativa válida; en otro caso, HOY (día
 * operativo de la pastelería), como alternativa segura y consistente ante una
 * fecha inválida o ausente en la URL.
 */
export function sanitizeFechaOperativa(
  value: string | undefined | null,
): string {
  if (value && esFechaOperativaValida(value)) {
    return value;
  }
  return hoyFechaOperativaLocal();
}

/**
 * Suma (o resta) días de calendario a una fecha operativa YA VÁLIDA. La
 * aritmética se hace en UTC (`Date.UTC` + `setUTCDate`) porque, al tratarse de
 * un día puro sin hora, sumar en UTC nunca cruza un cambio de horario de
 * verano ni depende de la zona horaria del proceso. Esto es independiente de
 * `ZONA_HORARIA_PASTELERIA`: una vez que ya se tiene un día calendario válido
 * (por ejemplo, el que devolvió `hoyFechaOperativaLocal`), sumar/restar días
 * es aritmética de calendario pura, no un cálculo de "ahora".
 */
export function sumarDiasFechaOperativa(value: string, dias: number): string {
  const match = FECHA_OPERATIVA_REGEX.exec(value);
  if (!match) return hoyFechaOperativaLocal();

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const fecha = new Date(Date.UTC(year, month - 1, day));
  fecha.setUTCDate(fecha.getUTCDate() + dias);

  const y = fecha.getUTCFullYear();
  const m = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const d = String(fecha.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Formatea una fecha operativa "YYYY-MM-DD" a un texto legible en español
 * (p. ej. "martes, 5 de agosto de 2026"), interpretada siempre en UTC para que
 * coincida exactamente con el día calendario del string — mismo criterio que
 * el resto del módulo de pedidos al formatear `fecha_entrega`
 * (`timeZone: "UTC"`).
 */
export function formatFechaOperativaLarga(value: string): string {
  const fecha = new Date(`${value}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(fecha);
}

/**
 * Nombre del día de la semana de una fecha operativa "YYYY-MM-DD" (p. ej.
 * "Lunes"), capitalizado. Usado por las tarjetas de día de la vista semanal
 * (S4-013). Mismo criterio `timeZone: "UTC"` que el resto del módulo: el día
 * de la semana se calcula del string de calendario, nunca de la zona del
 * proceso.
 */
export function formatNombreDiaSemana(value: string): string {
  const fecha = new Date(`${value}T00:00:00.000Z`);
  const nombre = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    timeZone: "UTC",
  }).format(fecha);
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

/**
 * Fecha operativa "YYYY-MM-DD" a un texto corto sin año (p. ej. "5 de
 * agosto"), para las tarjetas de día de la vista semanal (S4-013) donde el año
 * ya aparece en el encabezado del rango (`formatRangoSemanaLarga`).
 */
export function formatFechaOperativaCorta(value: string): string {
  const fecha = new Date(`${value}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(fecha);
}

const MESES_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/**
 * Encabezado legible del rango lunes–domingo de la vista semanal (S4-013), p.
 * ej. "21–27 de julio de 2026", o con mes/año explícitos en cada extremo
 * cuando la semana cruza de mes ("28 de julio–3 de agosto de 2026") o de año
 * ("29 de diciembre de 2025–4 de enero de 2026"). Preposiciones y meses en
 * minúsculas (escritura natural en español); el guion no lleva espacios
 * alrededor.
 *
 * Trabaja directamente sobre los componentes del string "YYYY-MM-DD" (sin
 * pasar por `Date`/`Intl`): son valores de calendario ya validados por
 * `esFechaOperativaValida` / `fechaOperativaSchema`, así que no hay ambigüedad
 * de zona horaria que resolver aquí.
 */
export function formatRangoSemanaLarga(lunes: string, domingo: string): string {
  const lunesMatch = FECHA_OPERATIVA_REGEX.exec(lunes);
  const domingoMatch = FECHA_OPERATIVA_REGEX.exec(domingo);
  if (!lunesMatch || !domingoMatch) return `${lunes} – ${domingo}`;

  const yLunes = Number(lunesMatch[1]);
  const mLunes = Number(lunesMatch[2]);
  const dLunes = Number(lunesMatch[3]);
  const yDomingo = Number(domingoMatch[1]);
  const mDomingo = Number(domingoMatch[2]);
  const dDomingo = Number(domingoMatch[3]);

  const mismoAnio = yLunes === yDomingo;
  const mismoMes = mismoAnio && mLunes === mDomingo;

  const inicio = mismoMes
    ? `${dLunes}`
    : mismoAnio
      ? `${dLunes} de ${MESES_ES[mLunes - 1]}`
      : `${dLunes} de ${MESES_ES[mLunes - 1]} de ${yLunes}`;

  const fin = `${dDomingo} de ${MESES_ES[mDomingo - 1]} de ${yDomingo}`;

  return `${inicio}–${fin}`;
}
