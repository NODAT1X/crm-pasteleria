import { ESTADO_PEDIDO_VALUES, TIPO_ENTREGA_VALUES } from "@/validation/pedidos";

/**
 * Saneo de los filtros OPCIONALES del calendario operativo (S4-014) leídos desde
 * la URL (`?estado=&tipo=`), compartido por la vista diaria y la semanal.
 *
 * Módulo sin dependencias de Prisma ni de sesión: solo valida el string de la
 * URL contra los valores del enum. Un valor ausente o manipulado se normaliza a
 * cadena vacía (= sin filtro), de modo que un parámetro inválido NUNCA rompe la
 * vista: simplemente se mantiene el comportamiento base. Mismo criterio que
 * `sanitizeEstadoParam` del listado de pedidos.
 */

/** Estado del pedido válido del enum, o "" (sin filtro) si no lo es. */
export function sanitizeEstadoPedidoParam(
  value: string | undefined | null,
): string {
  if (!value) return "";
  return (ESTADO_PEDIDO_VALUES as readonly string[]).includes(value)
    ? value
    : "";
}

/** Tipo de entrega válido del enum, o "" (sin filtro) si no lo es. */
export function sanitizeTipoEntregaParam(
  value: string | undefined | null,
): string {
  if (!value) return "";
  return (TIPO_ENTREGA_VALUES as readonly string[]).includes(value)
    ? value
    : "";
}
