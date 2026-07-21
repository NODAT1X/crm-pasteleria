import type { EstadoPedido, TipoEntrega } from "@/generated/prisma/enums";

/**
 * Etiquetas visibles del módulo de pedidos (única fuente de verdad).
 *
 * Aquí vive SOLO texto de presentación. Los valores internos siguen siendo los
 * del enum de Prisma (`en_preparacion`, `listo_para_entregar`, `recoleccion`,
 * ...): este archivo no cambia enums, reglas de negocio ni transiciones, solo
 * define cómo se muestran esos valores al usuario.
 *
 * Es una hoja sin dependencias (únicamente los tipos del enum generado), por eso
 * `@/validation/pedidos` puede reutilizar `ESTADO_PEDIDO_LABEL` para sus mensajes
 * de error sin provocar un import circular.
 *
 * Los `Record<EstadoPedido, string>` / `Record<TipoEntrega, string>` obligan en
 * compilación a contemplar todos los valores: si se agrega uno al enum, este
 * archivo deja de compilar hasta etiquetarlo.
 */

// Nombre del estado (describe el estado en sí: listado, detalle, historial).
export const ESTADO_PEDIDO_LABEL: Record<EstadoPedido, string> = {
  cotizacion: "Cotización",
  confirmado: "Confirmado",
  en_preparacion: "En preparación",
  listo_para_entregar: "Listo para entregar",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

// Nombre del tipo de entrega (detalle y selector del formulario).
export const TIPO_ENTREGA_LABEL: Record<TipoEntrega, string> = {
  recoleccion: "En sucursal",
  domicilio: "A domicilio",
};

/**
 * Texto orientado a la ACCIÓN de mover el pedido a cada estado destino (distinto
 * del label del estado, que solo lo nombra). Se usa en los botones de cambio de
 * estado.
 *
 * `cotizacion` se etiqueta para completar el `Record`, aunque hoy ninguna
 * transición apunta a `cotizacion` (ver `TRANSICIONES_ESTADO` en
 * `@/validation/pedidos`), por lo que ningún botón la muestra todavía.
 */
export const ACCION_CAMBIO_ESTADO_PEDIDO_LABEL: Record<EstadoPedido, string> = {
  cotizacion: "Regresar a cotización",
  confirmado: "Confirmar pedido",
  en_preparacion: "Pasar a preparación",
  listo_para_entregar: "Marcar listo para entregar",
  entregado: "Marcar como entregado",
  cancelado: "Cancelar pedido",
};

// Fallbacks defensivos: si llegara un valor fuera del enum (dato viejo, valor
// crudo), la UI muestra texto humano y NUNCA el valor técnico.
const ESTADO_PEDIDO_FALLBACK_LABEL = "Estado no disponible";
const TIPO_ENTREGA_FALLBACK_LABEL = "Tipo de entrega no disponible";
const ACCION_CAMBIO_ESTADO_FALLBACK_LABEL = "Cambiar estado";

/** Etiqueta visible del estado del pedido (listado, detalle, historial). */
export function getEstadoPedidoLabel(estado: EstadoPedido): string {
  return ESTADO_PEDIDO_LABEL[estado] ?? ESTADO_PEDIDO_FALLBACK_LABEL;
}

/** Etiqueta visible del tipo de entrega. */
export function getTipoEntregaLabel(tipo: TipoEntrega): string {
  return TIPO_ENTREGA_LABEL[tipo] ?? TIPO_ENTREGA_FALLBACK_LABEL;
}

/**
 * Texto de ayuda que explica el efecto de cada tipo de entrega sobre la
 * disponibilidad operativa de reparto (S4-009). Solo presentación: refuerza la
 * regla de S4-008 sin reimplementarla —únicamente las entregas a domicilio
 * ocupan una ventana de reparto de 30 minutos; las recolecciones en sucursal no
 * bloquean y pueden compartir horario con otros pedidos.
 */
export const TIPO_ENTREGA_AYUDA_DISPONIBILIDAD: Record<TipoEntrega, string> = {
  domicilio:
    "Las entregas a domicilio ocupan una ventana de reparto de 30 minutos desde su hora programada. Si este horario cae dentro de una ventana activa, el sistema lo bloqueará.",
  recoleccion:
    "Las recolecciones en sucursal no bloquean disponibilidad de reparto. Pueden compartir horario con otros pedidos.",
};

const TIPO_ENTREGA_AYUDA_FALLBACK =
  "Selecciona el tipo de entrega del pedido.";

/**
 * Ayuda visible sobre disponibilidad de reparto según el tipo de entrega
 * (S4-009). No decide nada: la regla real vive en el backend (S4-008).
 */
export function getTipoEntregaAyudaDisponibilidad(tipo: TipoEntrega): string {
  return TIPO_ENTREGA_AYUDA_DISPONIBILIDAD[tipo] ?? TIPO_ENTREGA_AYUDA_FALLBACK;
}

/** Texto del botón que mueve el pedido al estado destino indicado. */
export function getAccionCambioEstadoPedidoLabel(estado: EstadoPedido): string {
  return (
    ACCION_CAMBIO_ESTADO_PEDIDO_LABEL[estado] ??
    ACCION_CAMBIO_ESTADO_FALLBACK_LABEL
  );
}

/**
 * Opciones del selector de tipo de entrega, derivadas del mapa de etiquetas para
 * que el `<select>` no vuelva a duplicar los valores ni los textos.
 */
export const TIPO_ENTREGA_OPTIONS: readonly {
  value: TipoEntrega;
  label: string;
}[] = (Object.entries(TIPO_ENTREGA_LABEL) as [TipoEntrega, string][]).map(
  ([value, label]) => ({ value, label }),
);
