import { z } from "zod";

import type { Cliente } from "@/generated/prisma/client";
import { OrigenCliente } from "@/generated/prisma/enums";
import {
  resolverClientePreliminar,
  type MotivoRevisionHumana,
} from "@/modules/clientes/cliente-preliminar";
import {
  createCliente,
  deactivateCliente,
  findClienteById,
  findClientesByContacto,
  listClientes,
  updateCliente,
} from "@/server/repositories/clientes.repository";
import {
  capturarClientePreliminarSchema,
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

  // Alta MANUAL (S5-009): el origen y la revisión los fija el backend de forma
  // explícita (`manual` / sin revisión), nunca el input del formulario.
  return createCliente({
    pasteleriaId,
    data: {
      ...parsed.data,
      origen_cliente: OrigenCliente.manual,
      revision_pendiente: false,
    },
  });
}

/**
 * Resultado de la captura preliminar de un cliente desde WhatsApp (S5-009).
 * Unión discriminada: reutilización de un cliente activo, creación de un cliente
 * preliminar, o derivación a revisión humana (sin fusionar, reactivar ni
 * confirmar identidad automáticamente).
 */
export type CapturaClientePreliminarResult =
  | { tipo: "existente"; cliente: Cliente }
  | { tipo: "preliminar_creado"; cliente: Cliente }
  | { tipo: "revision_humana"; motivo: MotivoRevisionHumana };

/**
 * Captura preliminar de un cliente desde WhatsApp (S5-009). Flujo de CONFIANZA:
 * pensado para ser invocado por código de servidor autorizado (un flujo WhatsApp
 * futuro), NUNCA desde el formulario público de clientes ni desde una Server
 * Action expuesta en esta issue.
 *
 * Deduplica por contacto (whatsapp/telefono) dentro del tenant y aplica las
 * reglas puras de `resolverClientePreliminar`:
 *  - crea un cliente preliminar (`origen_cliente = whatsapp`,
 *    `revision_pendiente = true`, `activo = true`) cuando no hay coincidencias;
 *  - reutiliza un cliente activo cuando hay exactamente una coincidencia activa;
 *  - deriva a revisión humana en casos inactivos, ambiguos o de datos
 *    insuficientes. No fusiona ni reactiva clientes automáticamente.
 */
export async function capturarClientePreliminarWhatsappService(
  pasteleriaId: string,
  input: unknown,
): Promise<CapturaClientePreliminarResult> {
  const parsed = capturarClientePreliminarSchema.safeParse(input);
  if (!parsed.success) {
    throw new ClienteServiceError(formatZodError(parsed.error));
  }
  const data = parsed.data;

  const coincidencias = await findClientesByContacto({
    pasteleriaId,
    whatsapp: data.whatsapp,
    telefono: data.telefono,
  });

  const resolucion = resolverClientePreliminar(
    { nombre: data.nombre, whatsapp: data.whatsapp, telefono: data.telefono },
    coincidencias.map((cliente) => ({ id: cliente.id, activo: cliente.activo })),
  );

  if (resolucion.tipo === "revision_humana") {
    return { tipo: "revision_humana", motivo: resolucion.motivo };
  }

  if (resolucion.tipo === "existente") {
    const cliente = coincidencias.find((c) => c.id === resolucion.clienteId);
    // El id proviene de las coincidencias; el fallback es defensivo.
    if (!cliente) {
      return { tipo: "revision_humana", motivo: "ambiguo" };
    }
    return { tipo: "existente", cliente };
  }

  // `crear_preliminar`: cliente nuevo desde WhatsApp. Origen y revisión son
  // valores de CONFIANZA fijados aquí; `activo = true` (default) para no
  // bloquear una futura cotización, con `revision_pendiente = true` para el dueño.
  const cliente = await createCliente({
    pasteleriaId,
    data: {
      nombre: data.nombre,
      telefono: data.telefono,
      whatsapp: data.whatsapp,
      email: data.email,
      direccion: data.direccion,
      notas: data.notas,
      origen_cliente: OrigenCliente.whatsapp,
      revision_pendiente: true,
    },
  });

  return { tipo: "preliminar_creado", cliente };
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
