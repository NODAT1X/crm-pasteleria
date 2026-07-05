import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "@/server/db/prisma";

// El secret DEBE venir de BETTER_AUTH_SECRET (o AUTH_SECRET) en runtime.
// Durante `next build` (fase de build de producción) el env real puede no estar
// cargado; en ESA fase usamos un placeholder para que el build no aborte. Nunca
// se usa para firmar sesiones reales: en runtime el env real lo sobrescribe y,
// si falta en producción, Better Auth aborta con un error explícito.
const isNextBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

const authSecret =
  process.env.BETTER_AUTH_SECRET ??
  process.env.AUTH_SECRET ??
  (isNextBuildPhase
    ? "build-phase-placeholder-secret-not-used-at-runtime"
    : undefined);

export const auth = betterAuth({
  secret: authSecret,
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    // Sprint 1: un solo admin, sin registro público. Se deshabilita el endpoint
    // de sign-up; el admin se crea con el script de setup (scripts/create-admin.ts),
    // que escribe directamente en la base y no expone ningún flujo público.
    disableSignUp: true,
  },
  // Better Auth usa su modelo lógico `user`, mapeado a la tabla/campos del
  // `Usuario` de dominio ya existente (S1-003). No se duplica el usuario.
  user: {
    modelName: "usuario",
    fields: {
      name: "nombre",
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  // nextCookies debe ir al final para poder setear cookies desde Server Actions
  // y route handlers de Next.
  plugins: [nextCookies()],
});
