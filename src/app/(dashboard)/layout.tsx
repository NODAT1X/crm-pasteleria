import type { ReactNode } from "react";

import { requireAdminContext } from "@/server/auth/authorization";

// Todas las rutas internas bajo el grupo (dashboard) dependen de la sesión
// (cookies/headers) y de una consulta a BD: nunca se prerenderizan.
export const dynamic = "force-dynamic";

/**
 * Layout del grupo interno (dashboard).
 *
 * Punto ÚNICO de control de acceso del área privada: valida en SERVIDOR que la
 * petición corresponda a un admin activo, con rol admin y con pastelería, antes
 * de renderizar cualquier ruta hija. Si no cumple, `requireAdminContext`
 * redirige a /login.
 *
 * Así, cualquier ruta nueva que se cuelgue de este grupo queda protegida por
 * defecto sin tener que repetir el chequeo en cada página.
 */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdminContext();

  return <>{children}</>;
}
