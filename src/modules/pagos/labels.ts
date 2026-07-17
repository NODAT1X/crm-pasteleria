import type {
  EstadoMovimientoPago,
  MetodoPago,
  TipoMovimientoPago,
  TipoPago,
} from "@/generated/prisma/enums";
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

/**
 * Etiquetas del historial financiero (S3-017): tipo de movimiento, estado del
 * movimiento, tipo de pago y método de pago. Mismo criterio que
 * `ESTADO_PAGO_LABEL`: solo texto/clases de presentación, nunca cambian el
 * valor del enum ni las reglas de negocio.
 */

export const TIPO_MOVIMIENTO_PAGO_LABEL: Record<TipoMovimientoPago, string> = {
  pago: "Pago",
  devolucion: "Devolución",
  retencion: "Retención",
};

export const ESTADO_MOVIMIENTO_PAGO_LABEL: Record<EstadoMovimientoPago, string> = {
  aplicado: "Aplicado",
  anulado: "Anulado",
};

// Clases Tailwind del badge por estado del movimiento (distinto del estado de
// pago del pedido: aquí solo hay dos valores posibles).
export const ESTADO_MOVIMIENTO_PAGO_BADGE_CLASS: Record<
  EstadoMovimientoPago,
  string
> = {
  aplicado: "bg-green-100 text-green-700",
  anulado: "bg-muted text-muted-foreground",
};

const TIPO_MOVIMIENTO_PAGO_FALLBACK_LABEL = "Movimiento no disponible";
const ESTADO_MOVIMIENTO_PAGO_FALLBACK_LABEL = "Estado no disponible";
const ESTADO_MOVIMIENTO_PAGO_FALLBACK_BADGE_CLASS =
  "bg-muted text-muted-foreground";

/** Etiqueta visible del tipo de movimiento (pago, devolución, retención). */
export function getTipoMovimientoPagoLabel(tipo: TipoMovimientoPago): string {
  return TIPO_MOVIMIENTO_PAGO_LABEL[tipo] ?? TIPO_MOVIMIENTO_PAGO_FALLBACK_LABEL;
}

/** Etiqueta visible del estado del movimiento (aplicado/anulado). */
export function getEstadoMovimientoPagoLabel(
  estado: EstadoMovimientoPago,
): string {
  return (
    ESTADO_MOVIMIENTO_PAGO_LABEL[estado] ??
    ESTADO_MOVIMIENTO_PAGO_FALLBACK_LABEL
  );
}

/** Clases del badge visual del estado del movimiento. */
export function getEstadoMovimientoPagoBadgeClass(
  estado: EstadoMovimientoPago,
): string {
  return (
    ESTADO_MOVIMIENTO_PAGO_BADGE_CLASS[estado] ??
    ESTADO_MOVIMIENTO_PAGO_FALLBACK_BADGE_CLASS
  );
}

// --- Tipo de pago (S3-016: anticipo / abono / liquidación) -------------------

export const TIPO_PAGO_LABEL: Record<TipoPago, string> = {
  anticipo: "Anticipo",
  abono: "Abono",
  liquidacion: "Liquidación",
};

const TIPO_PAGO_FALLBACK_LABEL = "No especificado";

/** Etiqueta visible del tipo de pago (opcional: solo aplica a `tipo_movimiento = pago`). */
export function getTipoPagoLabel(tipo: TipoPago | null): string {
  if (!tipo) return TIPO_PAGO_FALLBACK_LABEL;
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

const METODO_PAGO_FALLBACK_LABEL = "No especificado";

/** Etiqueta visible del método de pago (opcional: devoluciones/retenciones). */
export function getMetodoPagoLabel(metodo: MetodoPago | null): string {
  if (!metodo) return METODO_PAGO_FALLBACK_LABEL;
  return METODO_PAGO_LABEL[metodo] ?? METODO_PAGO_FALLBACK_LABEL;
}

/** Opciones del selector de método de pago, derivadas del mapa de etiquetas. */
export const METODO_PAGO_OPTIONS: readonly {
  value: MetodoPago;
  label: string;
}[] = (Object.entries(METODO_PAGO_LABEL) as [MetodoPago, string][]).map(
  ([value, label]) => ({ value, label }),
);
