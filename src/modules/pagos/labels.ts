import type { MetodoPago, TipoPago } from "@/generated/prisma/enums";
import type { EstadoPagoDerivado } from "@/modules/pagos/types";

/**
 * Etiquetas visibles del estado de pago derivado (S3-015) y de los enums de
 * captura de pago (S3-016: tipo de pago y método).
 *
 * Mismo criterio que `@/modules/pedidos/labels.ts`: aquí vive SOLO texto y
 * clases de presentación. Los enums (`EstadoPagoDerivado`, `TipoPago`,
 * `MetodoPago`) siguen siendo los calculados/validados en `pagos.service.ts` y
 * `validation/pagos.ts`; este archivo no cambia su valor, solo define cómo se
 * muestran.
 *
 * Los `Record<Enum, string>` obligan en compilación a contemplar todos los
 * valores: si se agrega uno nuevo, este archivo deja de compilar hasta
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

// --- Tipo de pago (S3-016: anticipo / abono / liquidación) -------------------

export const TIPO_PAGO_LABEL: Record<TipoPago, string> = {
  anticipo: "Anticipo",
  abono: "Abono",
  liquidacion: "Liquidación",
};

const TIPO_PAGO_FALLBACK_LABEL = "Tipo de pago no disponible";

/** Etiqueta visible del tipo de pago (selector del formulario y movimiento). */
export function getTipoPagoLabel(tipo: TipoPago): string {
  return TIPO_PAGO_LABEL[tipo] ?? TIPO_PAGO_FALLBACK_LABEL;
}

/** Opciones del selector de tipo de pago, derivadas del mapa de etiquetas. */
export const TIPO_PAGO_OPTIONS: readonly { value: TipoPago; label: string }[] =
  (Object.entries(TIPO_PAGO_LABEL) as [TipoPago, string][]).map(
    ([value, label]) => ({ value, label }),
  );

// --- Método de pago (S3-016: efectivo / transferencia) ----------------------

export const METODO_PAGO_LABEL: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
};

const METODO_PAGO_FALLBACK_LABEL = "Método de pago no disponible";

/** Etiqueta visible del método de pago (selector del formulario y movimiento). */
export function getMetodoPagoLabel(metodo: MetodoPago): string {
  return METODO_PAGO_LABEL[metodo] ?? METODO_PAGO_FALLBACK_LABEL;
}

/** Opciones del selector de método de pago, derivadas del mapa de etiquetas. */
export const METODO_PAGO_OPTIONS: readonly {
  value: MetodoPago;
  label: string;
}[] = (Object.entries(METODO_PAGO_LABEL) as [MetodoPago, string][]).map(
  ([value, label]) => ({ value, label }),
);
