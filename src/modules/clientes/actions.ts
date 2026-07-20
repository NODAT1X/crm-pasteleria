"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import type { Cliente } from "@/generated/prisma/client";
import { requireAdminContext } from "@/server/auth/authorization";
import { mensajeErrorDeInfraestructura } from "@/server/services/pagos.service";
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

  // Red de seguridad para errores de infraestructura que no hayan sido
  // convertidos por el service (S4-002).
  const mensajeInfraestructura = mensajeErrorDeInfraestructura(error);
  if (mensajeInfraestructura) {
    return mensajeInfraestructura;
  }

  console.error("[clientes] Error inesperado:", error);
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

/**
 * Resuelve el contexto admin traduciendo un fallo de INFRAESTRUCTURA a
 * `ActionResult`, en vez de dejar que la excepción escape hasta el Server
 * Component (S4-003).
 *
 * Se incluye aquí porque `/pedidos/nuevo` y el selector de cliente consumen
 * `listClientesAction`: sin esta guarda, una caída de pool/conexión rompe la
 * creación de pedidos con el mismo error crudo de Prisma que BUG-S3-022-002.
 *
 * `unstable_rethrow` re-lanza primero las señales internas de Next (redirect,
 * notFound, bailouts de renderizado dinámico), así el flujo de autenticación
 * queda intacto. Un error que NO sea de infraestructura también se re-lanza.
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

    console.error(
      "[clientes] Fallo de infraestructura en contexto admin:",
      error,
    );
    return { ok: false, error: mensaje };
  }
}

export async function createClienteAction(
  input: unknown,
): Promise<ActionResult<Cliente>> {
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    const cliente = await createClienteService(contexto.pasteleriaId, input);
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
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    const cliente = await updateClienteService(contexto.pasteleriaId, id, input);
    revalidatePath(CLIENTES_PATH);
    return { ok: true, data: cliente };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function listClientesAction(
  params?: unknown,
): Promise<ActionResult<Cliente[]>> {
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    const clientes = await listClientesService(contexto.pasteleriaId, params);
    return { ok: true, data: clientes };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function getClienteByIdAction(
  id: string,
): Promise<ActionResult<Cliente>> {
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    const cliente = await getClienteByIdService(contexto.pasteleriaId, id);
    return { ok: true, data: cliente };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function deactivateClienteAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    await deactivateClienteService(contexto.pasteleriaId, id);
    revalidatePath(CLIENTES_PATH);
    return { ok: true, data: { id: id.trim() } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}