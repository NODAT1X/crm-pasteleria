/**
 * Reglas PURAS de resolución de cliente preliminar desde WhatsApp (S5-009).
 *
 * Este módulo NO habla con Prisma ni con la sesión: dado el contacto capturado y
 * las coincidencias por contacto que trae el repositorio (filtradas por tenant),
 * decide si se reutiliza un cliente existente, se crea un preliminar o el caso
 * va a revisión humana. No fusiona, no reactiva y no confirma identidad
 * automáticamente: ante cualquier duda, revisión humana.
 *
 * Match por contacto: exacto sobre strings ya recortados (trim) por la
 * validación. La normalización avanzada de teléfonos (lada, `+52`, espacios,
 * guiones) queda FUERA de alcance de esta issue (posible issue futura).
 */

// Coincidencia mínima por contacto (del repositorio; ya filtrada por tenant).
// Incluye clientes activos e inactivos: la decisión de qué hacer vive aquí.
export type CoincidenciaCliente = {
  id: string;
  activo: boolean;
};

// Contacto capturado, ya recortado por la validación. `null` si no vino.
export type CapturaContactoCliente = {
  nombre: string | null;
  whatsapp: string | null;
  telefono: string | null;
};

export type MotivoRevisionHumana =
  | "datos_insuficientes"
  | "cliente_inactivo"
  | "ambiguo";

export type ResolucionClientePreliminar =
  | { tipo: "existente"; clienteId: string }
  | { tipo: "crear_preliminar" }
  | { tipo: "revision_humana"; motivo: MotivoRevisionHumana };

function tieneTexto(value: string | null): boolean {
  return value !== null && value.trim().length > 0;
}

/**
 * Resuelve la captura preliminar contra las coincidencias por contacto:
 *  - datos insuficientes (sin nombre o sin contacto) -> revisión humana;
 *  - 0 coincidencias                                 -> crear preliminar;
 *  - 1 coincidencia activa                           -> reutilizar existente;
 *  - 1 coincidencia inactiva                         -> revisión humana;
 *  - más de 1 coincidencia (ambiguo)                 -> revisión humana.
 */
export function resolverClientePreliminar(
  captura: CapturaContactoCliente,
  coincidencias: readonly CoincidenciaCliente[],
): ResolucionClientePreliminar {
  const tieneNombre = tieneTexto(captura.nombre);
  const tieneContacto = tieneTexto(captura.whatsapp) || tieneTexto(captura.telefono);
  if (!tieneNombre || !tieneContacto) {
    return { tipo: "revision_humana", motivo: "datos_insuficientes" };
  }

  if (coincidencias.length === 0) {
    return { tipo: "crear_preliminar" };
  }

  if (coincidencias.length === 1) {
    const [coincidencia] = coincidencias;
    return coincidencia.activo
      ? { tipo: "existente", clienteId: coincidencia.id }
      : { tipo: "revision_humana", motivo: "cliente_inactivo" };
  }

  return { tipo: "revision_humana", motivo: "ambiguo" };
}
