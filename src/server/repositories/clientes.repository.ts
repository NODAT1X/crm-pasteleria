import { Prisma } from "@/generated/prisma/client";
import type { Cliente } from "@/generated/prisma/client";
import type { OrigenCliente } from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";

/**
 * Repositorio de clientes: única capa que habla con Prisma para este módulo.
 *
 * REGLA MULTI-TENANT (barrera de datos):
 *  - Estas funciones NUNCA llaman a `requireAdminContext()`. Reciben el
 *    `pasteleriaId` ya derivado del contexto admin desde la capa de servicio.
 *  - TODA consulta filtra por `pasteleria_id`, de modo que un tenant jamás
 *    puede leer ni modificar clientes de otro.
 *  - Nunca se hace `delete`: la baja es lógica (`activo = false`).
 */

// Datos aceptados al crear. `pasteleria_id` se inyecta aparte desde el contexto,
// nunca forma parte de la entrada de negocio. `origen_cliente` y
// `revision_pendiente` (S5-009) los fija SIEMPRE el servicio (valores de
// confianza), nunca el input del formulario.
type CreateClienteData = {
  nombre: string;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  direccion: string | null;
  notas: string | null;
  origen_cliente: OrigenCliente;
  revision_pendiente: boolean;
};

// Datos aceptados al actualizar. `pasteleria_id` NO es actualizable: se omite a
// propósito del tipo para que sea imposible reasignar el tenant de un cliente.
type UpdateClienteData = {
  nombre?: string;
  telefono?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  direccion?: string | null;
  notas?: string | null;
};

export async function createCliente(params: {
  pasteleriaId: string;
  data: CreateClienteData;
}): Promise<Cliente> {
  const { pasteleriaId, data } = params;

  return prisma.cliente.create({
    data: {
      ...data,
      // Tenant SIEMPRE desde el contexto admin, nunca desde el input.
      pasteleria_id: pasteleriaId,
    },
  });
}

export async function listClientes(params: {
  pasteleriaId: string;
  search?: string;
  take: number;
  skip: number;
}): Promise<Cliente[]> {
  const { pasteleriaId, search, take, skip } = params;

  const where: Prisma.ClienteWhereInput = {
    pasteleria_id: pasteleriaId,
    // El listado solo devuelve clientes activos (soft-delete).
    activo: true,
  };

  if (search) {
    // Búsqueda por nombre (case-insensitive en PostgreSQL) o teléfono.
    where.OR = [
      { nombre: { contains: search, mode: "insensitive" } },
      { telefono: { contains: search } },
    ];
  }

  return prisma.cliente.findMany({
    where,
    orderBy: { nombre: "asc" },
    take,
    skip,
  });
}

/**
 * Clientes del tenant cuyo `whatsapp` o `telefono` coincide EXACTAMENTE con
 * alguno de los contactos capturados (S5-009). Se usa para la deduplicación de
 * la captura preliminar desde WhatsApp. Devuelve clientes ACTIVOS e INACTIVOS
 * (la decisión de qué hacer con cada caso vive en `resolverClientePreliminar`).
 *
 * Match exacto sobre los strings ya recortados; sin normalización avanzada de
 * teléfonos (issue futura). Cada contacto capturado se compara contra AMBOS
 * campos (`whatsapp` y `telefono`) del cliente, porque el mismo número puede
 * estar guardado en cualquiera de los dos.
 */
export async function findClientesByContacto(params: {
  pasteleriaId: string;
  whatsapp: string | null;
  telefono: string | null;
}): Promise<Cliente[]> {
  const { pasteleriaId, whatsapp, telefono } = params;

  const contactos = [whatsapp, telefono].filter(
    (contacto): contacto is string => contacto !== null && contacto.length > 0,
  );
  const distintos = [...new Set(contactos)];
  if (distintos.length === 0) {
    return [];
  }

  const or: Prisma.ClienteWhereInput[] = distintos.flatMap((contacto) => [
    { whatsapp: contacto },
    { telefono: contacto },
  ]);

  return prisma.cliente.findMany({
    where: { pasteleria_id: pasteleriaId, OR: or },
    orderBy: { created_at: "asc" },
  });
}

export async function findClienteById(params: {
  pasteleriaId: string;
  id: string;
}): Promise<Cliente | null> {
  const { pasteleriaId, id } = params;

  // `findFirst` con id + pasteleria_id: aunque el id sea único, el filtro por
  // tenant garantiza que no se pueda leer un cliente de otra pastelería.
  return prisma.cliente.findFirst({
    where: { id, pasteleria_id: pasteleriaId },
  });
}

export async function updateCliente(params: {
  pasteleriaId: string;
  id: string;
  data: UpdateClienteData;
}): Promise<Cliente | null> {
  const { pasteleriaId, id, data } = params;

  // `updateMany` permite exigir el filtro compuesto (id + tenant + activo) de
  // forma atómica. Si `count === 0`, el cliente no existe, es de otro tenant o
  // está inactivo: se trata como "no encontrado".
  const result = await prisma.cliente.updateMany({
    where: { id, pasteleria_id: pasteleriaId, activo: true },
    data,
  });

  if (result.count === 0) {
    return null;
  }

  return findClienteById({ pasteleriaId, id });
}

export async function deactivateCliente(params: {
  pasteleriaId: string;
  id: string;
}): Promise<boolean> {
  const { pasteleriaId, id } = params;

  // Baja LÓGICA: nunca `delete`. Solo pone `activo = false` si el cliente está
  // activo y pertenece al tenant. Devuelve si hubo algún registro afectado.
  const result = await prisma.cliente.updateMany({
    where: { id, pasteleria_id: pasteleriaId, activo: true },
    data: { activo: false },
  });

  return result.count > 0;
}
