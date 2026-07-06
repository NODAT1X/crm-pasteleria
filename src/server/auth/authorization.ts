import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth/auth";
import { prisma } from "@/server/db/prisma";
import { RolUsuario } from "@/generated/prisma/enums";

// Módulo exclusivo de servidor: usa `headers()` y consulta Prisma. Nunca debe
// importarse desde un Client Component. No se importa "server-only" porque en
// este proyecto solo está disponible como interno compilado de Next (no como
// módulo top-level resoluble); la garantía la dan la ubicación (src/server) y
// las APIs de servidor que usa.

/**
 * Contexto del administrador autenticado y autorizado.
 *
 * Solo se construye tras validar en SERVIDOR: sesión de Better Auth + usuario
 * real en base de datos, activo, con rol admin y con pastelería asignada.
 *
 * IMPORTANTE: `pasteleriaId` SIEMPRE proviene de aquí (derivado de la sesión y
 * la BD). Nunca se recibe desde el frontend, query string ni body de la
 * petición. Todo el aislamiento multi-tenant se apoya en este valor.
 */
export type AdminContext = {
  userId: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  pasteleriaId: string;
};

/**
 * Obtiene el contexto admin validado en servidor, o `null` si la petición no
 * corresponde a un admin válido.
 *
 * Validaciones (en orden, corta en la primera que falle):
 *  1. Existe sesión de Better Auth.
 *  2. Existe el Usuario en BD para `session.user.id`.
 *  3. `usuario.activo === true`.
 *  4. `usuario.rol === "admin"`.
 *  5. `usuario.pasteleria_id` presente.
 *
 * No redirige ni lanza: devolver `null` deja que el llamador decida el flujo
 * (p. ej. una API que responde 401/403 en vez de redirigir).
 *
 * Memoizada por petición con `React.cache`: si el layout y la página la llaman
 * en el mismo request, la sesión y la consulta a BD se resuelven una sola vez.
 */
export const getCurrentAdminContext = cache(
  async (): Promise<AdminContext | null> => {
    const session = await auth.api.getSession({ headers: await headers() });

    // 1. Sin sesión válida no hay nada que autorizar.
    if (!session?.user?.id) {
      return null;
    }

    // 2. La cookie/sesión no basta: buscamos el usuario real en BD. Esto evita
    //    confiar en un token cuyo usuario pudo ser desactivado o eliminado.
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        pasteleria_id: true,
      },
    });

    if (!usuario) {
      return null;
    }

    // 3. Baja lógica: un usuario inactivo no puede operar aunque tenga sesión.
    if (!usuario.activo) {
      return null;
    }

    // 4. Sprint 1: solo el rol admin tiene acceso funcional.
    if (usuario.rol !== RolUsuario.admin) {
      return null;
    }

    // 5. Sin pastelería no hay tenant sobre el cual operar de forma segura.
    if (!usuario.pasteleria_id) {
      return null;
    }

    return {
      userId: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      pasteleriaId: usuario.pasteleria_id,
    };
  },
);

/**
 * Igual que `getCurrentAdminContext`, pero EXIGE un admin válido: si no lo hay,
 * redirige a `/login` y no retorna (el tipo de retorno garantiza al llamador un
 * `AdminContext` no nulo).
 *
 * Úsala como puerta de entrada de layouts, páginas y Server Actions del área
 * interna. Es la fuente autoritativa de seguridad del CRM; el middleware
 * (src/proxy.ts) solo hace un descarte optimista por cookie.
 */
export async function requireAdminContext(): Promise<AdminContext> {
  const context = await getCurrentAdminContext();

  if (!context) {
    redirect("/login");
  }

  return context;
}
