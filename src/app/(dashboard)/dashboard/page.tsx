import { requireAdminContext } from "@/server/auth/authorization";

import { LogoutButton } from "./logout-button";

// Depende de la sesión (cookies/headers): siempre dinámica.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Contexto autoritativo desde servidor: sesión de Better Auth + usuario real
  // en BD (activo, admin, con pastelería). El layout del grupo ya exige admin;
  // aquí reutilizamos el mismo contexto (memoizado por request) para pintar
  // datos sin confiar en el frontend. `pasteleriaId` sale de la sesión, nunca
  // del cliente.
  const admin = await requireAdminContext();

  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Panel</h1>
          <p className="text-sm text-muted-foreground">
            Sesión iniciada como {admin.email}
          </p>
        </div>
        <LogoutButton />
      </div>
    </main>
  );
}
