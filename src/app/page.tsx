import { redirect } from "next/navigation";

import { getCurrentAdminContext } from "@/server/auth/authorization";

// La ruta raíz depende de la sesión (cookies/headers): nunca se prerenderiza.
export const dynamic = "force-dynamic";

export default async function Home() {
  const admin = await getCurrentAdminContext();

  redirect(admin ? "/dashboard" : "/login");
}