# Estructura base del monolito modular

Esta estructura está alineada con el Documento Maestro oficial del CRM Pastelería de Nodatix.

La ubicación oficial del Documento Maestro dentro del repositorio es:

```txt
docs/documento-maestro-crm-pasteleria.md
```

El objetivo original (Sprint 0) fue separar responsabilidades desde el inicio, antes de implementar CRUDs y reglas de negocio. Ese punto de partida ya quedó atrás: al cierre de Sprint 4, la arquitectura de monolito modular descrita aquí ya tiene CRUDs, reglas de negocio, validaciones y pruebas automatizadas implementadas dentro de cada capa. Este documento describe la organización de carpetas resultante, no un inventario de archivos; para el detalle de funcionalidades y reglas, ver `README.md` y `docs/documento-maestro-crm-pasteleria.md`.

## Estructura general

Árbol representativo bajo `src/` y directorios raíz relevantes (verificado contra el repositorio con `git ls-files`; no incluye cada archivo individual):

```txt
src/
  app/
    (auth)/
    (dashboard)/
    api/auth/
  components/
    ui/
    layout/
    shared/
  modules/
    clientes/
    pedidos/
    pagos/
    calendario/, catalogo/, dashboard/, seguimiento/, usuarios/
  server/
    auth/
    db/
    repositories/
    services/
  validation/
  lib/
  types/
prisma/
  schema.prisma
  migrations/
scripts/
  create-admin.ts
docs/
vitest.config.ts
```

## Responsabilidad de las capas

- **`app/(auth)/`**: rutas públicas de autenticación (login).
- **`app/(dashboard)/`**: rutas internas protegidas (clientes, pedidos, entregas y dashboard). Su `layout.tsx` valida la sesión y el rol para el renderizado de las páginas del grupo; las Server Actions y operaciones de datos mantienen su propia autorización server-side mediante `requireAdminContext()` (ver `docs/AUTORIZACION.md`).
- **`app/api/auth/`**: endpoint de Better Auth.
- **`components/ui/`**: componentes de interfaz base (shadcn/ui). **`components/layout/`**: componentes de layout del área interna. **`components/shared/`**: reservada para componentes compartidos entre módulos, sin implementación todavía.
- **`modules/`**: acciones de servidor (`actions.ts`) y tipos por dominio funcional; es la capa que consumen los componentes de `app/`. `clientes/`, `pedidos/` y `pagos/` ya tienen implementación; `pedidos/` y `pagos/` incluyen además sus pruebas automatizadas junto al código (por ejemplo `disponibilidad.test.ts`, `lock-disponibilidad.test.ts`, `reglas-financieras.test.ts`). `calendario/`, `catalogo/`, `dashboard/`, `seguimiento/` y `usuarios/` son módulos reservados: solo contienen un `.gitkeep`, sin implementación.
- **`server/auth/`**: configuración de Better Auth y autorización server-side (ver `docs/AUTORIZACION.md`).
- **`server/db/`**: cliente de Prisma.
- **`server/repositories/`**: única capa que habla directamente con Prisma; recibe siempre `pasteleriaId` ya resuelto, nunca lo deriva del cliente.
- **`server/services/`**: reglas de negocio que orquestan repositorios; es donde se aplican validaciones y reglas financieras/de disponibilidad antes de escribir datos.
- **`validation/`**: esquemas Zod que validan la entrada de cada módulo antes de llegar a los servicios; incluye pruebas de reglas de estado (`estados-pedido.test.ts`).
- **`lib/`**: utilidades transversales (por ejemplo, cliente de Better Auth en el navegador y helpers generales).
- **`types/`**: reservada para tipos compartidos entre módulos; solo contiene un `.gitkeep`, sin implementación.
- **`prisma/`**: `schema.prisma` con los modelos de datos y `migrations/` con las migraciones versionadas.
- **`scripts/create-admin.ts`**: script de setup del administrador y la pastelería inicial.
- **`docs/`**: documentación técnica y funcional por sprint.
- **`vitest.config.ts`**: configuración de las pruebas automatizadas (Vitest).

Este documento mantiene un nivel de detalle intencionalmente limitado a directorios y responsabilidades; no debe convertirse en un listado exhaustivo de archivos. Para funcionalidades implementadas, planeadas y fuera de alcance, ver `README.md` y `docs/documento-maestro-crm-pasteleria.md`.
