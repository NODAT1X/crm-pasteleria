"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { requireAdminContext } from "@/server/auth/authorization";
import { mensajeErrorDeInfraestructura } from "@/server/services/pagos.service";
import {
  PedidoServiceError,
  cancelarPedidoConRetencionDevolucionService,
  changeEstadoPedidoService,
  createPedidoService,
  eliminarPedidoService,
  getPedidoByIdService,
  listPedidosDelDiaService,
  listPedidosDeLaSemanaService,
  listPedidosProximosService,
  listPedidosService,
  obtenerResumenCancelacionPedidoService,
  updatePedidoService,
  verificarDisponibilidadEntregaService,
} from "@/server/services/pedidos.service";

import type {
  ActionResult,
  DisponibilidadEntregaDTO,
  PedidoDetalleDTO,
  PedidoListItemDTO,
  ResumenCancelacionPedidoDTO,
  SemanaEntregasDTO,
} from "./types";

/**
 * Server Actions de pedidos: la ÚNICA superficie que la UI futura debe
 * consumir. Cada acción deriva `pasteleriaId` desde `requireAdminContext()`.
 * Nunca se recibe `pasteleriaId` como argumento ni desde input del cliente.
 *
 * `requireAdminContext()` se ejecuta FUERA del try/catch: puede disparar
 * `redirect()` (que funciona lanzando internamente) y no debe quedar atrapado
 * por el catch genérico que traduce errores de negocio.
 */

const PEDIDOS_PATH = "/pedidos";
const DASHBOARD_PATH = "/dashboard";

function toErrorMessage(error: unknown): string {
  if (error instanceof PedidoServiceError) {
    return error.message;
  }

  // Red de seguridad para errores de infraestructura que no hayan sido
  // convertidos por el service: un fallo de pool/conexión de Prisma (P2028,
  // P2024, P1001...) se traduce aquí a un mensaje funcional en vez de caer en
  // el genérico "error inesperado" (S4-002).
  const mensajeInfraestructura = mensajeErrorDeInfraestructura(error);
  if (mensajeInfraestructura) {
    return mensajeInfraestructura;
  }

  console.error("[pedidos] Error inesperado:", error);
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

/**
 * Resuelve el contexto admin traduciendo un fallo de INFRAESTRUCTURA a
 * `ActionResult`, en vez de dejar que la excepción escape hasta el Server
 * Component (S4-003).
 *
 * `requireAdminContext()` consulta la BD dos veces (sesión de Better Auth +
 * usuario del tenant), así que es tan sensible a una caída de pool/conexión
 * como el propio service. Hasta ahora se llamaba FUERA del try/catch —a
 * propósito, para no atrapar el `redirect()` de Next, que funciona lanzando— y
 * por eso `toErrorMessage` nunca llegaba a ver estos errores: el listado moría
 * con el error crudo de Prisma en pantalla (BUG-S3-022-002).
 *
 * `unstable_rethrow` re-lanza primero las señales internas de Next (redirect,
 * notFound, bailouts de renderizado dinámico), así el flujo de autenticación
 * queda intacto. Un error que NO sea de infraestructura también se re-lanza:
 * es un fallo real y debe llegar al error boundary en vez de disfrazarse de
 * "inténtalo de nuevo".
 */
async function resolverContextoAdmin(): Promise<
  { ok: true; pasteleriaId: string } | { ok: false; error: string }
> {
  try {
    const { pasteleriaId } = await requireAdminContext();
    return { ok: true, pasteleriaId };
  } catch (error) {
    unstable_rethrow(error);

    const mensaje = mensajeErrorDeInfraestructura(error);
    if (!mensaje) {
      throw error;
    }

    console.error("[pedidos] Fallo de infraestructura en contexto admin:", error);
    return { ok: false, error: mensaje };
  }
}

// Revalida las rutas útiles tras una mutación (aún sin UI en esta issue).
function revalidatePedidoPaths(clienteId?: string, pedidoId?: string): void {
  revalidatePath(PEDIDOS_PATH);
  revalidatePath(DASHBOARD_PATH);

  if (pedidoId) {
    revalidatePath(`/pedidos/${pedidoId}`);
  }

  if (clienteId) {
    revalidatePath(`/clientes/${clienteId}`);
  }
}

export async function createPedidoAction(
  input: unknown,
): Promise<ActionResult<PedidoDetalleDTO>> {
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    const pedido = await createPedidoService(contexto.pasteleriaId, input);
    revalidatePedidoPaths(pedido.cliente_id, pedido.id);
    return { ok: true, data: pedido };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function listPedidosAction(
  params?: unknown,
): Promise<ActionResult<PedidoListItemDTO[]>> {
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    const pedidos = await listPedidosService(contexto.pasteleriaId, params);
    return { ok: true, data: pedidos };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

/**
 * Vista diaria de entregas (S4-012): pedidos del tenant programados para una
 * fecha exacta, en los estados activos de S4-007 (ver
 * `listPedidosDelDiaService`). `fecha` es un valor `unknown` (normalmente
 * "YYYY-MM-DD") que se valida en el service; el `pasteleriaId` se deriva
 * SIEMPRE del contexto admin, nunca del input.
 */
export async function listPedidosDelDiaAction(
  fecha: unknown,
  filtros?: unknown,
): Promise<ActionResult<PedidoListItemDTO[]>> {
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    const pedidos = await listPedidosDelDiaService(
      contexto.pasteleriaId,
      fecha,
      filtros,
    );
    return { ok: true, data: pedidos };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

/**
 * Vista semanal de entregas (S4-013): pedidos del tenant de lunes a domingo,
 * agrupados por día, en los mismos estados activos que la vista diaria (ver
 * `listPedidosDeLaSemanaService`). `fecha` es la fecha ANCLA (`unknown`,
 * normalmente "YYYY-MM-DD") que el service usa para calcular el lunes y el
 * domingo de esa semana; el `pasteleriaId` se deriva SIEMPRE del contexto
 * admin, nunca del input.
 */
export async function listPedidosDeLaSemanaAction(
  fecha: unknown,
  filtros?: unknown,
): Promise<ActionResult<SemanaEntregasDTO>> {
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    const semana = await listPedidosDeLaSemanaService(
      contexto.pasteleriaId,
      fecha,
      filtros,
    );
    return { ok: true, data: semana };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

/**
 * Agenda operativa resumida (S4-015): próximos pedidos del tenant, ordenados
 * por fecha y hora de entrega. Sin parámetros de entrada: el horizonte y el
 * límite están centralizados en `listPedidosProximosService`, no en la UI. El
 * `pasteleriaId` se deriva SIEMPRE del contexto admin.
 */
export async function listPedidosProximosAction(): Promise<
  ActionResult<PedidoListItemDTO[]>
> {
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    const pedidos = await listPedidosProximosService(contexto.pasteleriaId);
    return { ok: true, data: pedidos };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function getPedidoByIdAction(
  id: string,
): Promise<ActionResult<PedidoDetalleDTO>> {
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    const pedido = await getPedidoByIdService(contexto.pasteleriaId, id);
    return { ok: true, data: pedido };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function updatePedidoAction(
  id: string,
  input: unknown,
): Promise<ActionResult<PedidoDetalleDTO>> {
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    const pedido = await updatePedidoService(contexto.pasteleriaId, id, input);
    revalidatePedidoPaths(pedido.cliente_id, pedido.id);
    return { ok: true, data: pedido };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function changeEstadoPedidoAction(
  input: unknown,
): Promise<ActionResult<PedidoDetalleDTO>> {
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    const pedido = await changeEstadoPedidoService(
      contexto.pasteleriaId,
      input,
    );
    revalidatePedidoPaths(pedido.cliente_id, pedido.id);
    return { ok: true, data: pedido };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

/**
 * Consulta la disponibilidad de una entrega (S4-008) sin crear ni editar nada.
 * Pensada para uso futuro de la UI/calendario: dado `fecha_entrega`,
 * `hora_entrega`, `tipo_entrega` (y opcionalmente `pedido_id` a excluir en
 * edición), indica si el horario está libre según la ventana operativa de 30
 * min. El `pasteleriaId` se deriva del contexto admin; nunca del input.
 */
export async function verificarDisponibilidadEntregaAction(
  input: unknown,
): Promise<ActionResult<DisponibilidadEntregaDTO>> {
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    const disponibilidad = await verificarDisponibilidadEntregaService(
      contexto.pasteleriaId,
      input,
    );
    return { ok: true, data: disponibilidad };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

/**
 * Resumen de cancelación (retención/devolución) de un pedido del tenant. Solo
 * lectura, para mostrar la confirmación antes de cancelar (S3-019). Solo acepta
 * `pedido_id`; los montos se calculan en backend.
 */
export async function obtenerResumenCancelacionPedidoAction(
  input: unknown,
): Promise<ActionResult<ResumenCancelacionPedidoDTO>> {
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    const resumen = await obtenerResumenCancelacionPedidoService(
      contexto.pasteleriaId,
      input,
    );
    return { ok: true, data: resumen };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

/**
 * Cancela un pedido registrando la retención y la devolución que correspondan,
 * de forma transaccional (S3-019). Solo acepta `pedido_id`; nunca montos ni
 * `pasteleria_id` desde el frontend.
 */
export async function cancelarPedidoConRetencionDevolucionAction(
  input: unknown,
): Promise<ActionResult<PedidoDetalleDTO>> {
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    const pedido = await cancelarPedidoConRetencionDevolucionService(
      contexto.pasteleriaId,
      input,
    );
    revalidatePedidoPaths(pedido.cliente_id, pedido.id);
    return { ok: true, data: pedido };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

/**
 * Elimina un pedido del listado de forma transaccional (S4-005): borra el
 * pedido, sus items y sus movimientos financieros como una unidad completa,
 * sin afectar al cliente ni a otros pedidos. Solo acepta `pedido_id`; nunca
 * `pasteleria_id` desde el frontend. Sin restricción por estado (política
 * MVP S4-004): se permite eliminar en cualquier estado del ciclo de vida.
 */
export async function eliminarPedidoAction(
  input: unknown,
): Promise<ActionResult<{ pedido_id: string }>> {
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    const { pedido_id, cliente_id } = await eliminarPedidoService(
      contexto.pasteleriaId,
      input,
    );
    revalidatePedidoPaths(cliente_id, pedido_id);
    return { ok: true, data: { pedido_id } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
