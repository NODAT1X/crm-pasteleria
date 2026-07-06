"use server";

import { revalidatePath } from "next/cache";

import type { Cliente } from "@/generated/prisma/client";
import { requireAdminContext } from "@/server/auth/authorization";
import {
  ClienteServiceError,
  createClienteService,
  deactivateClienteService,
  getClienteByIdService,
  listClientesService,
  updateClienteService,
} from "@/server/services/clientes.service";

import type { ActionResult } from "./types";

/**
 * Server Actions de clientes: la ÚNICA superficie que la UI futura debe
 * consumir. Cada acción deriva `pasteleriaId` desde `requireAdminContext()`.
 * Nunca se recibe `pasteleriaId` como argumento ni desde input del cliente.
 */

const CLIENTES_PATH = "/clientes";

function toErrorMessage(error: unknown): string {
  if (error instanceof ClienteServiceError) {
    return error.message;
  }

  console.error("[clientes] Error inesperado:", error);
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

export async function createClienteAction(
  input: unknown,
): Promise<ActionResult<Cliente>> {
  const { pasteleriaId } = await requireAdminContext();

  try {
    const cliente = await createClienteService(pasteleriaId, input);
    revalidatePath(CLIENTES_PATH);
    return { ok: true, data: cliente };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function updateClienteAction(
  id: string,
  input: unknown,
): Promise<ActionResult<Cliente>> {
  const { pasteleriaId } = await requireAdminContext();

  try {
    const cliente = await updateClienteService(pasteleriaId, id, input);
    revalidatePath(CLIENTES_PATH);
    return { ok: true, data: cliente };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function listClientesAction(
  params?: unknown,
): Promise<ActionResult<Cliente[]>> {
  const { pasteleriaId } = await requireAdminContext();

  try {
    const clientes = await listClientesService(pasteleriaId, params);
    return { ok: true, data: clientes };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function getClienteByIdAction(
  id: string,
): Promise<ActionResult<Cliente>> {
  const { pasteleriaId } = await requireAdminContext();

  try {
    const cliente = await getClienteByIdService(pasteleriaId, id);
    return { ok: true, data: cliente };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function deactivateClienteAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const { pasteleriaId } = await requireAdminContext();

  try {
    await deactivateClienteService(pasteleriaId, id);
    revalidatePath(CLIENTES_PATH);
    return { ok: true, data: { id: id.trim() } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}