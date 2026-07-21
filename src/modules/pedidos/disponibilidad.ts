import { EstadoPedido } from "@/generated/prisma/enums";

/**
 * Reglas puras de disponibilidad de entregas a domicilio (S4-008).
 *
 * Contrato funcional: `docs/reglas-disponibilidad-calendario-sprint-4.md` (S4-007).
 *
 * Este módulo NO habla con Prisma ni con la sesión: solo contiene la aritmética
 * de la ventana operativa de 30 minutos y los textos funcionales, para poder
 * reutilizarlo desde el service, desde la Server Action de consulta y, en el
 * futuro, desde la UI del calendario. El filtrado por tenant / fecha / tipo /
 * estado y la lectura de pedidos bloqueantes viven en la capa de repositorio.
 *
 * Regla de la ventana (nunca centrada antes/después):
 *   La hora seleccionada por el cliente es el INICIO de la ventana operativa.
 *   ventana = [hora, hora + 30 minutos)
 *
 * Ejemplos obligatorios (pedido bloqueante a las 16:00 => ventana [16:00, 16:30)):
 *   nueva 16:15 -> conflicto (dentro de la ventana)
 *   nueva 16:30 -> permitido (borde superior excluido: no bloquea la hora completa)
 */

// Ventana operativa fija: 30 minutos hacia adelante desde la hora seleccionada.
export const VENTANA_ENTREGA_DOMICILIO_MIN = 30;

/**
 * Estados de pedido que SÍ bloquean disponibilidad (solo aplican a entregas a
 * domicilio). `entregado` y `cancelado` no bloquean; los eliminados ya no
 * existen en la BD (hard delete de S4-005), así que ni siquiera se consultan.
 */
export const ESTADOS_BLOQUEAN_DISPONIBILIDAD: readonly EstadoPedido[] = [
  EstadoPedido.cotizacion,
  EstadoPedido.confirmado,
  EstadoPedido.en_preparacion,
  EstadoPedido.listo_para_entregar,
];

// Mismo formato "HH:mm" en 24h que valida el schema de pedidos (HORA_REGEX).
const HORA_MINUTOS_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MINUTOS_EN_UN_DIA = 24 * 60;

/** Entrega a domicilio que bloquea disponibilidad (datos mínimos, del tenant). */
export type BloqueoDomicilio = {
  pedido_id: string;
  hora_entrega: string; // "HH:mm" en 24h
};

/**
 * Información mínima del pedido bloqueante que provoca el conflicto. No expone
 * datos sensibles: solo el id del propio pedido del tenant, su hora de inicio y
 * el fin de su ventana operativa (para construir el mensaje funcional).
 */
export type ConflictoDisponibilidad = {
  pedido_id: string;
  hora_entrega: string; // hora del bloqueante "HH:mm"
  fin_ventana: string; // fin de la ventana bloqueada "HH:mm"
};

/**
 * Convierte "HH:mm" (24h) a minutos desde medianoche. Devuelve `null` si el
 * formato no es válido: nunca se hace comparación lexicográfica de horas, todo
 * se resuelve con aritmética de minutos.
 */
export function horaAMinutos(hora: string): number | null {
  const match = HORA_MINUTOS_REGEX.exec(hora.trim());
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Minutos desde medianoche -> "HH:mm" en 24h (envuelve al día si excede). */
export function minutosAHora24(minutos: number): string {
  const m = ((minutos % MINUTOS_EN_UN_DIA) + MINUTOS_EN_UN_DIA) % MINUTOS_EN_UN_DIA;
  const horas = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(horas).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Minutos desde medianoche -> "H:mm a.m./p.m." en español (formato de la issue,
 * p. ej. "4:00 p.m."). Se usa solo para el mensaje funcional al usuario.
 */
export function formatHora12(minutos: number): string {
  const m = ((minutos % MINUTOS_EN_UN_DIA) + MINUTOS_EN_UN_DIA) % MINUTOS_EN_UN_DIA;
  const h24 = Math.floor(m / 60);
  const mins = m % 60;
  const sufijo = h24 < 12 ? "a.m." : "p.m.";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(mins).padStart(2, "0")} ${sufijo}`;
}

/**
 * ¿La hora de una nueva entrega a domicilio (`horaNuevaMin`) cae DENTRO de la
 * ventana operativa bloqueada por una entrega existente que inicia en
 * `inicioBloqueoMin`?
 *
 * Regla estricta de la issue (S4-008), direccional (nunca centrada ni simétrica):
 *   ventana bloqueada = [inicio_bloqueo, inicio_bloqueo + 30)
 *   conflicto  <=>  inicio_bloqueo <= hora_nueva < inicio_bloqueo + 30
 *
 * Solo se bloquean horarios IGUALES o POSTERIORES al inicio del bloqueo (hasta 30
 * min después). Un horario ANTERIOR a la entrega existente nunca se bloquea.
 *
 *   existente 16:00, nueva 16:15 -> 16:00 <= 16:15 < 16:30 -> conflicto
 *   existente 16:00, nueva 16:30 -> 16:30 !< 16:30         -> permitido (borde excluido)
 *   existente 16:15, nueva 16:00 -> 16:00 <  16:15         -> permitido (anterior)
 */
export function horaNuevaEnVentanaBloqueo(
  horaNuevaMin: number,
  inicioBloqueoMin: number,
): boolean {
  return (
    horaNuevaMin >= inicioBloqueoMin &&
    horaNuevaMin < inicioBloqueoMin + VENTANA_ENTREGA_DOMICILIO_MIN
  );
}

/**
 * Dado el conjunto de entregas a domicilio bloqueantes (ya filtradas por tenant,
 * fecha, tipo y estado activo en el repositorio) y la hora de una nueva entrega,
 * devuelve el primer conflicto por ventana de 30 min (el bloqueante más temprano
 * del día, para un mensaje determinista) o `null` si el horario está libre.
 */
export function detectarConflictoDomicilio(
  horaNueva: string,
  bloqueos: readonly BloqueoDomicilio[],
): ConflictoDisponibilidad | null {
  const nuevaMin = horaAMinutos(horaNueva);
  if (nuevaMin === null) {
    // La hora ya viene validada por Zod aguas arriba; si no se puede parsear,
    // no se puede evaluar el conflicto y no se bloquea por un dato ilegible.
    return null;
  }

  const conflicto = bloqueos
    .map((bloqueo) => ({ bloqueo, min: horaAMinutos(bloqueo.hora_entrega) }))
    .filter(
      (candidato): candidato is { bloqueo: BloqueoDomicilio; min: number } =>
        candidato.min !== null &&
        horaNuevaEnVentanaBloqueo(nuevaMin, candidato.min),
    )
    .sort((a, b) => a.min - b.min)[0];

  if (!conflicto) {
    return null;
  }

  return {
    pedido_id: conflicto.bloqueo.pedido_id,
    hora_entrega: conflicto.bloqueo.hora_entrega,
    fin_ventana: minutosAHora24(conflicto.min + VENTANA_ENTREGA_DOMICILIO_MIN),
  };
}

// Mensaje base cuando no se detalla el pedido bloqueante.
const MENSAJE_CONFLICTO_GENERICO =
  "El horario seleccionado no está disponible para entrega a domicilio. Ya existe una entrega programada dentro de la ventana operativa de 30 minutos.";

/**
 * Mensaje funcional en español para un conflicto de disponibilidad. Si se conoce
 * el pedido bloqueante, incluye su hora de inicio y el fin de la ventana ocupada;
 * en otro caso devuelve el mensaje genérico.
 */
export function mensajeConflictoDisponibilidad(
  conflicto: ConflictoDisponibilidad | null,
): string {
  if (!conflicto) {
    return MENSAJE_CONFLICTO_GENERICO;
  }

  const inicioMin = horaAMinutos(conflicto.hora_entrega);
  if (inicioMin === null) {
    return MENSAJE_CONFLICTO_GENERICO;
  }

  const inicio12 = formatHora12(inicioMin);
  const fin12 = formatHora12(inicioMin + VENTANA_ENTREGA_DOMICILIO_MIN);
  // `formatHora12` ya termina en "a.m."/"p.m." (con punto), así que no se agrega
  // otro punto final para no duplicarlo.
  return `El horario seleccionado no está disponible. Ya existe una entrega a domicilio a las ${inicio12}; la ventana ocupada termina a las ${fin12}`;
}
