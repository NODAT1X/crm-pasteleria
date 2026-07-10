import type { ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/layout/logout-button";
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
  const admin = await requireAdminContext();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">CRM Pastelería</p>
            <h1 className="text-xl font-semibold">Área interna</h1>
            <p className="text-sm text-muted-foreground">
              Sesión iniciada como {admin.email}
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/dashboard">Inicio</Link>
            </Button>

          <Button asChild variant="ghost">
            <Link href="/clientes">Clientes</Link>
          </Button>

          {/* Acceso interno al listado básico de pedidos agregado en S2-007. */}
          <Button asChild variant="ghost">
            <Link href="/pedidos">Pedidos</Link>
          </Button>

            <LogoutButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}