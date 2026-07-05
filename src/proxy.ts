import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Protección básica de rutas a nivel de proxy/middleware (Edge, sin tocar la
// base). Es un chequeo OPTIMISTA por presencia de cookie: sirve para evitar
// renders innecesarios cuando claramente no existe sesión.
//
// NO es la capa de seguridad. La cookie no se valida aquí: no se verifica firma,
// expiración, ni que el usuario siga activo/admin en BD.
//
// La seguridad REAL vive en servidor: el layout del grupo interno
// src/app/(dashboard)/layout.tsx llama a requireAdminContext(), que valida
// sesión + usuario real en BD (activo, rol admin, con pasteleria_id).
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};