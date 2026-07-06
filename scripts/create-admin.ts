import "dotenv/config";

import { hashPassword } from "better-auth/crypto";

import { prisma } from "../src/server/db/prisma";

/**
 * Setup del administrador de la pastelería (Sprint 1).
 *
 * NO es registro público: se ejecuta manualmente contra una base local/development
 * ya migrada. Crea la pastelería y su único usuario admin, escribiendo la
 * credencial en `accounts` con el hash de Better Auth.
 *
 * Uso:
 *   npx tsx scripts/create-admin.ts
 *
 * Variables de entorno:
 *   ADMIN_EMAIL
 *   ADMIN_PASSWORD
 *   ADMIN_NOMBRE
 *   PASTELERIA_NOMBRE
 *   PASTELERIA_SLUG
 */
async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@pasteleria.local";
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error(
      "Falta ADMIN_PASSWORD. Define una contraseña en .env antes de crear el admin.",
    );
  }

  const nombre = process.env.ADMIN_NOMBRE ?? "Administrador";
  const pasteleriaNombre = process.env.PASTELERIA_NOMBRE ?? "Mi Pastelería";
  const pasteleriaSlug = process.env.PASTELERIA_SLUG ?? "mi-pasteleria";

  const existing = await prisma.usuario.findUnique({
    where: { email },
  });

  if (existing) {
    console.info(`El usuario ${email} ya existe. Nada que hacer.`);
    return;
  }

  const hashedPassword = await hashPassword(password);

  const usuario = await prisma.$transaction(async (tx) => {
    const pasteleria = await tx.pasteleria.upsert({
      where: { slug: pasteleriaSlug },
      update: {},
      create: {
        nombre: pasteleriaNombre,
        slug: pasteleriaSlug,
      },
    });

    const admin = await tx.usuario.create({
      data: {
        email,
        nombre,
        email_verified: true,
        pasteleria_id: pasteleria.id,
      },
    });

    await tx.account.create({
      data: {
        userId: admin.id,
        accountId: admin.id,
        providerId: "credential",
        password: hashedPassword,
      },
    });

    console.info(
      `Admin creado: ${admin.email} (pastelería: ${pasteleria.slug})`,
    );

    return admin;
  });

  return usuario;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });