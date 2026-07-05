import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth/auth";

import { LogoutButton } from "./logout-button";

// Depende de la sesión (cookies/headers): siempre dinámica.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  // Verificación autoritativa en servidor (el middleware solo hace un chequeo
  // optimista por cookie). Sin sesión -> al login.
  if (!session) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Panel</h1>
          <p className="text-sm text-muted-foreground">
            Sesión iniciada como {session.user.email}
          </p>
        </div>
        <LogoutButton />
      </div>
    </main>
  );
}
