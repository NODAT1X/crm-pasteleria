import { z } from "zod";

import type { Cliente } from "@/generated/prisma/client";
import {
  createCliente,
  deactivateCliente,
  findClienteById,
  listClientes,
  updateCliente,
} from "@/server/repositories/clientes.repository";
import {
  clienteIdSchema,
  createClienteSchema,
  listClientesSchema,
  updateClienteSchema,
} from "@/validation/clientes";

/**
 * Capa de servicio / casos de uso de clientes.
 *
 * Responsabilidades:
 *  - Validar y normalizar la entrada con Zod (nunca confía en el input crudo).
 *  - Aplicar reglas de negocio (p. ej. no crear cliente sin nombre).
 *  - Traducir "no encontrado / no autorizado por tenant" a errores controlados.
 *
 * Multi-tenant: el `pasteleriaId` llega ya derivado del contexto admin desde la
 * capa de actions; el servicio lo pasa al repositorio pero jamás lo toma del
 * input de negocio.
 */

/**
 * Error de negocio con mensaje apto para mostrar al usuario final (en español).
 * Las actions lo capturan y lo convierten en `{ ok: false, error }`. Los errores
 * NO controlados (p. ej. de Prisma) no se propagan crudos al cliente.
 */
export class ClienteServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClienteServiceError";
  }
}

// Junta los mensajes de las incidencias de Zod en un texto legible. Como los
// mensajes ya están definidos en español en el schema, esto basta para la UI.
function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join(" ");
}

export async function createClienteService(
  pasteleriaId: string,
  input: unknown,
): Promise<Cliente> {
  const parsed = createClienteSchema.safeParse(input);
  if (!parsed.success) {
    // Incluye el caso "nombre vacío/ausente": el schema exige nombre no vacío.
    throw new ClienteServiceError(formatZodError(parsed.error));
  }

  return createCliente({ pasteleriaId, data: parsed.data });
}

export async function updateClienteService(
  pasteleriaId: string,
  id: string,
  input: unknown,
): Promise<Cliente> {
  const parsedId = clienteIdSchema.safeParse(id);
  if (!parsedId.success) {
    throw new ClienteServiceError("Identificador de cliente inválido.");
  }

  const parsed = updateClienteSchema.safeParse(input);
  if (!parsed.success) {
    throw new ClienteServiceError(formatZodError(parsed.error));
  }

  const updated = await updateCliente({
    pasteleriaId,
    id: parsedId.data,
    data: parsed.data,
  });

  if (!updated) {
    throw new ClienteServiceError(
      "El cliente no existe, no pertenece a tu pastelería o está inactivo.",
    );
  }

  return updated;
}

export async function listClientesService(
  pasteleriaId: string,
  params: unknown,
): Promise<Cliente[]> {
  // `params ?? {}` permite llamar sin argumentos y usar los valores por defecto.
  const parsed = listClientesSchema.safeParse(params ?? {});
  if (!parsed.success) {
    throw new ClienteServiceError(formatZodError(parsed.error));
  }

  return listClientes({ pasteleriaId, ...parsed.data });
}

export async function getClienteByIdService(
  pasteleriaId: string,
  id: string,
): Promise<Cliente> {
  const parsedId = clienteIdSchema.safeParse(id);
  if (!parsedId.success) {
    throw new ClienteServiceError("Identificador de cliente inválido.");
  }

  const cliente = await findClienteById({ pasteleriaId, id: parsedId.data });
  if (!cliente) {
    throw new ClienteServiceError(
      "El cliente no existe o no pertenece a tu pastelería.",
    );
  }

  return cliente;
}

export async function deactivateClienteService(
  pasteleriaId: string,
  id: string,
): Promise<void> {
  const parsedId = clienteIdSchema.safeParse(id);
  if (!parsedId.success) {
    throw new ClienteServiceError("Identificador de cliente inválido.");
  }

  const ok = await deactivateCliente({ pasteleriaId, id: parsedId.data });
  if (!ok) {
    throw new ClienteServiceError(
      "El cliente no existe, no pertenece a tu pastelería o ya está inactivo.",
    );
  }
}
