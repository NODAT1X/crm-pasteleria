"use server";

import { revalidatePath } from "next/cache";

import { requireAdminContext } from "@/server/auth/authorization";
import {
  PedidoServiceError,
  changeEstadoPedidoService,
  createPedidoService,
  getPedidoByIdService,
  listPedidosService,
  updatePedidoService,
} from "@/server/services/pedidos.service";

import type {
  ActionResult,
  PedidoDetalleDTO,
  PedidoListItemDTO,
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

  console.error("[pedidos] Error inesperado:", error);
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
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
  const { pasteleriaId } = await requireAdminContext();

  try {
    const pedido = await createPedidoService(pasteleriaId, input);
    revalidatePedidoPaths(pedido.cliente_id, pedido.id);
    return { ok: true, data: pedido };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function listPedidosAction(
  params?: unknown,
): Promise<ActionResult<PedidoListItemDTO[]>> {
  const { pasteleriaId } = await requireAdminContext();

  try {
    const pedidos = await listPedidosService(pasteleriaId, params);
    return { ok: true, data: pedidos };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function getPedidoByIdAction(
  id: string,
): Promise<ActionResult<PedidoDetalleDTO>> {
  const { pasteleriaId } = await requireAdminContext();

  try {
    const pedido = await getPedidoByIdService(pasteleriaId, id);
    return { ok: true, data: pedido };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function updatePedidoAction(
  id: string,
  input: unknown,
): Promise<ActionResult<PedidoDetalleDTO>> {
  const { pasteleriaId } = await requireAdminContext();

  try {
    const pedido = await updatePedidoService(pasteleriaId, id, input);
    revalidatePedidoPaths(pedido.cliente_id, pedido.id);
    return { ok: true, data: pedido };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function changeEstadoPedidoAction(
  input: unknown,
): Promise<ActionResult<PedidoDetalleDTO>> {
  const { pasteleriaId } = await requireAdminContext();

  try {
    const pedido = await changeEstadoPedidoService(pasteleriaId, input);
    revalidatePedidoPaths(pedido.cliente_id, pedido.id);
    return { ok: true, data: pedido };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
