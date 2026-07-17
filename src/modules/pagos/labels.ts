import type { EstadoPagoDerivado } from "@/modules/pagos/types";

/**
 * Etiquetas visibles del estado de pago derivado (S3-015).
 *
 * Mismo criterio que `@/modules/pedidos/labels.ts`: aquí vive SOLO texto y
 * clases de presentación. `EstadoPagoDerivado` sigue siendo el tipo calculado
 * en `pagos.service.ts`; este archivo no cambia su valor ni su cálculo, solo
 * define cómo se muestra.
 *
 * El `Record<EstadoPagoDerivado, string>` obliga en compilación a contemplar
 * los 3 valores: si se agrega uno nuevo, este archivo deja de compilar hasta
 * etiquetarlo.
 */

export const ESTADO_PAGO_LABEL: Record<EstadoPagoDerivado, string> = {
  sin_pago: "Sin pago",
  parcial: "Pago parcial",
  pagado: "Pagado",
};

// Clases Tailwind del badge por estado (colores accesibles en fondo claro).
export const ESTADO_PAGO_BADGE_CLASS: Record<EstadoPagoDerivado, string> = {
  sin_pago: "bg-red-100 text-red-700",
  parcial: "bg-amber-100 text-amber-700",
  pagado: "bg-green-100 text-green-700",
};

// Fallback defensivo: si llegara un valor fuera del enum, la UI muestra texto
// humano y NUNCA el valor técnico.
const ESTADO_PAGO_FALLBACK_LABEL = "Estado de pago no disponible";
const ESTADO_PAGO_FALLBACK_BADGE_CLASS = "bg-muted text-muted-foreground";

/** Etiqueta visible del estado de pago (listado y detalle). */
export function getEstadoPagoLabel(estado: EstadoPagoDerivado): string {
  return ESTADO_PAGO_LABEL[estado] ?? ESTADO_PAGO_FALLBACK_LABEL;
}

/** Clases del badge visual del estado de pago. */
export function getEstadoPagoBadgeClass(estado: EstadoPagoDerivado): string {
  return ESTADO_PAGO_BADGE_CLASS[estado] ?? ESTADO_PAGO_FALLBACK_BADGE_CLASS;
}
