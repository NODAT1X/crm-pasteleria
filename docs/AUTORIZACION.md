# Autorización y protección de rutas internas

## Proyecto

CRM / Sistema Web para Pastelería Nodatix

## Sprint

Sprint 1 — Clientes + autenticación base de administrador

## Issue relacionada

Issue S1-005 — Proteger rutas internas y validar acceso admin

## Objetivo

Documentar cómo se protege el área interna del CRM y cómo se obtiene, de forma
segura, la pastelería (`pasteleria_id`) sobre la que opera el usuario. La regla
central es simple: **la autorización se decide en el servidor, contra la base de
datos, en cada petición**.

---

## 1. Capas de protección

Existen dos capas, con responsabilidades distintas:

| Capa | Archivo | Qué hace | ¿Es seguridad? |
|---|---|---|---|
| Middleware (Edge) | `src/proxy.ts` | Redirección **optimista** por presencia de cookie. E| Middleware (Edge) | `src/proxy.ts` | Redirección **optimista** por presencia de cookie. Si una ruta interna no tiene cookie de sesión, redirige a `/login`. | **No.** Solo UX. No valida la cookie. | | **No.** Solo UX. No valida la cookie. |
| Servidor (RSC) | `src/server/auth/authorization.ts` | Valida sesión + usuario real en BD (activo, rol admin, con pastelería). | **Sí.** Fuente autoritativa. |

> La cookie del middleware no se verifica (firma, expiración, estado del usuario).
> Un atacante podría falsificar su presencia; por eso **nunca** se confía en esa
> capa para autorizar. La decisión real siempre ocurre en el servidor.

---

## 2. Cómo se valida una ruta interna

Toda ruta interna vive bajo el grupo `src/app/(dashboard)/`. El layout de ese
grupo es el punto único de control de acceso:

```
src/app/(dashboard)/layout.tsx   ->  await requireAdminContext()
```

`requireAdminContext()` (en `src/server/auth/authorization.ts`) ejecuta, en este
orden, y **corta en la primera validación que falle**:

1. Obtiene la sesión en servidor con Better Auth:

   ```ts
   const session = await auth.api.getSession({ headers: await headers() });
   ```

2. Verifica que exista sesión (`session.user.id`).
3. Busca el **Usuario real** en Prisma por `session.user.id`.
4. Verifica que el usuario exista en BD.
5. Verifica `usuario.activo === true`.
6. Verifica `usuario.rol === "admin"`.
7. Verifica que `usuario.pasteleria_id` exista.

Si todo pasa, devuelve un `AdminContext`. Si algo falla, `requireAdminContext()`
**redirige a `/login`** y no retorna.

Como la validación está en el **layout del grupo**, cualquier ruta nueva que se
cuelgue de `(dashboard)` queda protegida por defecto, sin repetir el chequeo.

### Dos funciones, dos usos

- `getCurrentAdminContext()` → devuelve `AdminContext | null`. No redirige ni
  lanza. Úsala cuando el llamador quiere decidir el flujo (por ejemplo, una API
  que responde `401/403` en vez de redirigir).
- `requireAdminContext()` → devuelve `AdminContext` o redirige a `/login`. Úsala
  como puerta de entrada de layouts, páginas y Server Actions internas.

Ambas están **memoizadas por petición** con `React.cache`: aunque el layout y la
página las llamen en el mismo request, la sesión y la consulta a BD se resuelven
una sola vez.

### Ejemplo en una página

```tsx
// src/app/(dashboard)/dashboard/page.tsx
import { requireAdminContext } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const admin = await requireAdminContext();
  // admin.userId, admin.email, admin.nombre, admin.rol, admin.pasteleriaId
  return <p>Sesión iniciada como {admin.email}</p>;
}
```

---

## 3. Cómo se obtiene `pasteleria_id` desde la sesión

El `pasteleria_id` **no viaja por la red desde el cliente**. Se deriva así:

```
cookie de sesión  ->  Better Auth (getSession)  ->  session.user.id
                                                        |
                                                        v
                          Prisma: usuario.findUnique({ where: { id } })
                                                        |
                                                        v
                                  usuario.pasteleria_id  ->  AdminContext.pasteleriaId
```

El valor final vive en `AdminContext.pasteleriaId` y es la **única** fuente
válida del tenant para el resto de la aplicación.

---

## 4. Regla de oro: nunca recibir `pasteleria_id` desde el frontend

**Prohibido** aceptar `pasteleria_id` (o `pasteleriaId`) desde:

- query string (`?pasteleria_id=...`),
- body de un `POST`/Server Action,
- headers controlados por el cliente,
- campos de formulario ocultos,
- props que provengan del cliente.

Si se aceptara, cualquier usuario podría cambiar ese valor y **leer o escribir
datos de otra pastelería** (fuga de datos entre tenants). El `pasteleria_id`
siempre se toma de `AdminContext`, obtenido en servidor.

```ts
// ❌ MAL — el cliente decide el tenant
async function listarClientes(pasteleriaId: string) { /* ... */ }

// ✅ BIEN — el tenant se deriva de la sesión en servidor
async function listarClientes() {
  const { pasteleriaId } = await requireAdminContext();
  // usar pasteleriaId derivado, nunca uno recibido por parámetro del cliente
}
```

---

## 5. Ejemplo futuro: consulta Prisma filtrada por `pasteleria_id`

Cuando se implemente el CRUD (fuera del alcance de S1-005), toda consulta a datos
del tenant debe filtrar por el `pasteleriaId` del contexto. Ejemplo ilustrativo:

```ts
import { requireAdminContext } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";

// Server Action / RSC dentro del grupo (dashboard)
export async function listarClientes() {
  const { pasteleriaId } = await requireAdminContext();

  // El WHERE incluye SIEMPRE pasteleria_id: aislamiento por tenant.
  return prisma.cliente.findMany({
    where: {
      pasteleria_id: pasteleriaId, // <- del contexto, no del cliente
      activo: true,
    },
    orderBy: { nombre: "asc" },
  });
}

// En escritura, el tenant también se fija desde el contexto:
export async function crearCliente(input: { nombre: string; telefono?: string }) {
  const { pasteleriaId } = await requireAdminContext();

  return prisma.cliente.create({
    data: {
      nombre: input.nombre,
      telefono: input.telefono,
      pasteleria_id: pasteleriaId, // <- nunca desde `input`
    },
  });
}
```

Regla práctica: **`pasteleria_id` nunca sale de `input`; siempre sale del
`AdminContext`.**

---

## 6. Resumen

- La UI/middleware pueden ayudar, pero **no autorizan**.
- La autorización real es server-side, contra BD, en cada request:
  `requireAdminContext()` en el layout de `(dashboard)`.
- El tenant (`pasteleria_id`) se deriva de la sesión, **nunca** del cliente.
- Toda consulta de datos del tenant filtra por el `pasteleriaId` del contexto.
