import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

// Cliente Prisma centralizado. En desarrollo Next recarga los módulos en cada
// cambio, así que guardamos la instancia en `globalThis` para no abrir una nueva
// conexión (y agotar el pool) en cada HMR.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Configuración EXPLÍCITA del pool (S4-002). Sin estos valores `pg` usa
// `max = 10` y `connectionTimeoutMillis = 0`, defaults pensados para una BD
// local; aquí la BD es el pooler remoto de Supabase (~200 ms por viaje) y este
// pool lo comparten TODAS las consultas del proceso, incluidas las de sesión de
// Better Auth.
//
// IMPORTANTE: `POOL_MAX` debe quedar por DEBAJO del límite del pooler de
// Supabase en session mode (`pool_size: 15`). Si se pide más, el servidor
// responde `EMAXCONNSESSION` y la conexión falla en vez de esperar turno. Se
// dejan 3 conexiones de margen para migraciones/Prisma Studio.
const POOL_MAX = 12;
// Espera por una conexión libre del pool. Se alinea con el `maxWait` de las
// transacciones (ver movimientos-financieros.repository) para que una punta de
// carga se traduzca en espera y no en un error inmediato.
const POOL_CONNECTION_TIMEOUT_MS = 10_000;
const POOL_IDLE_TIMEOUT_MS = 30_000;

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: POOL_MAX,
    connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
  });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
