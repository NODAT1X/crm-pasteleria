import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Protección básica de rutas a nivel de proxy/middleware (Edge, sin tocar la
// base). Es un chequeo OPTIMISTA por presencia de cookie; la validación real de
// la sesión la hace cada página protegida en el servidor.
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  const isProtected = pathname.startsWith("/dashboard");
  const isLogin = pathname === "/login";

  if (isProtected && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLogin && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
