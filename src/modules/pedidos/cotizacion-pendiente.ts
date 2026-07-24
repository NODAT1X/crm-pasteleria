import type { PedidoItemInput } from "@/validation/pedidos";

/**
 * Cotización pendiente con producto genérico "por cotizar" (S5-010).
 *
 * Base técnica PURA (sin Prisma, sin sesión, sin BD) para representar una
 * solicitud personalizada capturada antes de tener un precio final: un item
 * genérico controlado que respeta la regla vigente de "≥1 item + total derivado"
 * sin inventar estados nuevos, sin catálogo y sin migración.
 *
 * El item se identifica por un valor CENTINELA reservado en `producto_id`
 * (`String?` sin FK ni catálogo en el modelo actual), de modo que detectarlo es
 * una comparación exacta de string, sin ambigüedad y sin colisión posible con
 * un catálogo (que no existe). Mientras exista este item, el pedido:
 *  - NO puede confirmarse (el dueño debe ajustar items y precio real antes);
 *  - NO admite registro de pago/anticipo (no hay total real que cobrar).
 *
 * El dueño sustituye el item genérico por items reales con precio para continuar
 * el flujo normal; al hacerlo `pedidoTienePorCotizar` deja de ser verdadero y se
 * desbloquean confirmación y pago.
 */

// --- Constantes controladas --------------------------------------------------

/**
 * Valor centinela reservado para `PedidoItem.producto_id`. No es un id de
 * catálogo (no hay catálogo) ni un cuid: es un token interno que SOLO produce el
 * flujo autorizado de cotización. El guard de servicio impide inyectarlo desde
 * el formulario manual.
 */
export const PRODUCTO_POR_COTIZAR_ID = "__pedido_personalizado_por_cotizar__";

/** Nombre visible (snapshot) del item genérico por cotizar. */
export const NOMBRE_ITEM_POR_COTIZAR = "Pedido personalizado por cotizar";

// --- Mensajes de bloqueo (junto a la regla, para que no se separen) ----------

/**
 * Rechazo del item centinela cuando se intenta crear/editar desde el formulario
 * manual (sin la opción de confianza del flujo autorizado).
 */
export const MENSAJE_ITEM_POR_COTIZAR_NO_PERMITIDO_MANUAL =
  'No se puede agregar manualmente el producto "Pedido personalizado por cotizar". ' +
  "Este item lo genera únicamente el flujo autorizado de cotización; captura productos reales con su precio.";

/** Confirmación bloqueada porque el pedido conserva un item por cotizar. */
export const MENSAJE_CONFIRMACION_BLOQUEADA_POR_COTIZAR =
  "No se puede confirmar el pedido mientras tenga un producto por cotizar. " +
  "Ajusta los items y define el precio real antes de confirmar.";

/** Confirmación bloqueada porque el total aún no está cotizado (0 o menor). */
export const MENSAJE_CONFIRMACION_BLOQUEADA_TOTAL_NO_COTIZADO =
  "No se puede confirmar el pedido porque su total aún no está cotizado. " +
  "Define el precio real de los productos antes de confirmar.";

/** Pago bloqueado porque el pedido conserva un item por cotizar. */
export const MENSAJE_PAGO_BLOQUEADO_POR_COTIZAR =
  "No se puede registrar un pago mientras el pedido tenga un producto por cotizar. " +
  "El dueño debe ajustar los items y definir el precio real antes de registrar pagos.";

/** Pago bloqueado porque el total aún no está cotizado (0 o menor). */
export const MENSAJE_PAGO_BLOQUEADO_TOTAL_NO_COTIZADO =
  "No se puede registrar un pago porque el total del pedido aún no está cotizado. " +
  "Define el precio real antes de registrar pagos.";

// --- Detección ---------------------------------------------------------------

/**
 * Forma mínima para detectar el item genérico. Funciona con el input de Zod
 * (`PedidoItemInput`), con los items persistidos y con los DTOs de salida: todos
 * exponen `producto_id`.
 */
export type ItemConProductoId = { producto_id: string | null };

/** ¿Este item es el genérico "por cotizar"? (comparación exacta del centinela). */
export function esItemPorCotizar(item: ItemConProductoId): boolean {
  return item.producto_id === PRODUCTO_POR_COTIZAR_ID;
}

/** ¿El pedido tiene al menos un item genérico por cotizar? */
export function pedidoTienePorCotizar(
  items: readonly ItemConProductoId[],
): boolean {
  return items.some(esItemPorCotizar);
}

// --- Construcción del item genérico canónico ---------------------------------

/**
 * Item genérico canónico "Pedido personalizado por cotizar". Estructura fija:
 * `cantidad = 1`, `precio_unitario = 0`, `subtotal = 0` (total derivado 0). Es
 * un `PedidoItemInput` válido: pasa la validación de item (`precio ≥ 0` y la
 * coherencia `subtotal === cantidad × precio_unitario`, 1 × 0 === 0).
 *
 * `descripcion` (opcional) transporta el detalle de la solicitud capturada; se
 * recorta y se normaliza a `null` si queda vacía.
 */
export function crearItemPorCotizar(descripcion?: string | null): PedidoItemInput {
  const descripcionNormalizada =
    typeof descripcion === "string" && descripcion.trim().length > 0
      ? descripcion.trim()
      : null;

  return {
    producto_id: PRODUCTO_POR_COTIZAR_ID,
    nombre_snapshot: NOMBRE_ITEM_POR_COTIZAR,
    descripcion: descripcionNormalizada,
    cantidad: 1,
    precio_unitario: 0,
    subtotal: 0,
  };
}

// --- Guard de inyección desde el formulario manual ---------------------------

/**
 * ¿Es admisible este conjunto de items respecto al item centinela?
 *
 *  - Sin item centinela: siempre admisible (el caso normal del formulario).
 *  - Con item centinela: solo admisible si `permitirItemPorCotizar` es `true`
 *    (flujo backend autorizado). El formulario manual nunca pasa esa opción, así
 *    que no puede crear ni reintroducir el item genérico.
 *
 * El REEMPLAZO por items reales queda admisible por construcción: si el dueño
 * sustituye el genérico por productos con precio, ya no hay centinela y la
 * función devuelve `true`.
 */
export function itemPorCotizarPermitido(params: {
  items: readonly ItemConProductoId[];
  permitirItemPorCotizar: boolean;
}): boolean {
  return !pedidoTienePorCotizar(params.items) || params.permitirItemPorCotizar;
}

// --- Evaluación de bloqueo (confirmación / pago) -----------------------------

/**
 * Resultado de evaluar si una operación (confirmar / pagar) está bloqueada por
 * la cotización pendiente. No lanza: solo decide y aporta el mensaje.
 */
export type ResultadoBloqueoCotizacion =
  | { bloqueado: false }
  | { bloqueado: true; motivo: string };

/**
 * Bloqueo de CONFIRMACIÓN (S5-010). Se evalúa ANTES de la regla de anticipo
 * mínimo del 50%: con `total = 0` ese 50% es 0 y la regla de anticipo no
 * bloquearía (hueco que esta issue cierra). Prioridad: primero el item genérico
 * (causa concreta), luego el total no cotizado.
 */
export function evaluarBloqueoConfirmacionPorCotizar(params: {
  tieneItemPorCotizar: boolean;
  totalNoCotizado: boolean;
}): ResultadoBloqueoCotizacion {
  if (params.tieneItemPorCotizar) {
    return { bloqueado: true, motivo: MENSAJE_CONFIRMACION_BLOQUEADA_POR_COTIZAR };
  }
  if (params.totalNoCotizado) {
    return {
      bloqueado: true,
      motivo: MENSAJE_CONFIRMACION_BLOQUEADA_TOTAL_NO_COTIZADO,
    };
  }
  return { bloqueado: false };
}

/**
 * Bloqueo de REGISTRO DE PAGO/ANTICIPO (S5-010). Se evalúa ANTES del cálculo de
 * saldo: con `total = 0` el saldo es 0 y el anti-sobrepago respondería "ya
 * pagado", un mensaje engañoso para un pedido por cotizar. Misma prioridad que
 * la confirmación.
 */
export function evaluarBloqueoPagoPorCotizar(params: {
  tieneItemPorCotizar: boolean;
  totalNoCotizado: boolean;
}): ResultadoBloqueoCotizacion {
  if (params.tieneItemPorCotizar) {
    return { bloqueado: true, motivo: MENSAJE_PAGO_BLOQUEADO_POR_COTIZAR };
  }
  if (params.totalNoCotizado) {
    return { bloqueado: true, motivo: MENSAJE_PAGO_BLOQUEADO_TOTAL_NO_COTIZADO };
  }
  return { bloqueado: false };
}
