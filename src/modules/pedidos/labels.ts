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
  recoleccion: "Recolección",
  domicilio: "Domicilio",
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
