# CRM Pastelería

CRM Pastelería es un sistema web desarrollado por Nodatix para apoyar la gestión operativa de una pastelería o negocio de repostería.

El proyecto centraliza información clave del negocio: clientes, pedidos personalizados, movimientos financieros (pagos, anticipos, saldos pendientes) y calendario operativo de entregas.

> Este README documenta el estado técnico y funcional real del proyecto al cierre de los Bloques 1 y 2 del Sprint 4. No es un manual de usuario final ni sustituye al Documento Maestro del proyecto.

## Descripción del proyecto

El proyecto consiste en una aplicación web interna de gestión operativa tipo back-office para una pastelería en crecimiento.

Aunque puede presentarse comercialmente como un CRM para pastelerías, su función principal es ayudar al negocio a controlar pedidos, clientes, pagos y entregas desde un solo lugar, con acceso exclusivo para el administrador del negocio.

## Documento Maestro

La fuente oficial del Documento Maestro del CRM Pastelería vive en:

```txt
docs/documento-maestro-crm-pasteleria.md
```

Este archivo concentra la visión funcional, alcance, reglas generales, decisiones de producto y relación con documentos complementarios del proyecto.

El `README.md` documenta el estado técnico y funcional real del repositorio, pero no reemplaza al Documento Maestro.

## Estado actual del MVP

El proyecto se encuentra en desarrollo activo del MVP. Al cierre de los Bloques 1 y 2 del Sprint 4, el sistema ya opera de forma funcional sobre una base de datos real (PostgreSQL + Prisma), con autenticación, aislamiento por pastelería y los módulos de clientes, pedidos, pagos y calendario operativo implementados y verificables en el código.

Este README no afirma que todo el Sprint 4 esté cerrado ni describe el contenido de bloques futuros del sprint: solo documenta lo que existe hoy en la rama.

## Funcionalidades implementadas y verificadas

Las siguientes funcionalidades están respaldadas por código, modelos de datos y/o documentación técnica vigente en `docs/`:

- **Gestión de clientes**: alta, edición, listado con búsqueda por nombre o teléfono y ficha de detalle. La baja de clientes es **lógica** (campo `activo`), nunca elimina el registro físicamente.
- **Registro, consulta y detalle de pedidos**: creación de pedidos con productos/artículos, listado con filtros y una ficha de detalle con información de entrega, cliente asociado, productos y notas internas.
- **Estados de pedidos**: ciclo de vida controlado (`cotización`, `confirmado`, `en preparación`, `listo para entregar`, `entregado`, `cancelado`), con reglas propias para cada transición.
- **Registro, consulta y anulación de movimientos financieros**: pagos (anticipo, abono, liquidación) por efectivo o transferencia, con historial y capacidad de anular un movimiento sin borrar su rastro.
- **Total, monto pagado y saldo pendiente**: calculados en el servidor a partir de los movimientos financieros aplicados, visibles en el detalle del pedido, en el listado y en la agenda.
- **Eliminación definitiva de pedidos**: acción de eliminar disponible desde el listado de pedidos, con confirmación (simple o reforzada según el estado y si el pedido tiene movimientos financieros asociados). Bajo las reglas actuales del MVP, esta eliminación es **definitiva** (no es soft delete) y remueve el pedido junto con sus artículos y movimientos financieros relacionados, sin dejar registros huérfanos. Ver `docs/politica-pedidos-sprint-4.md`.
- **Validación de disponibilidad**: las entregas a domicilio en estado activo bloquean una ventana operativa de 30 minutos a partir de la hora seleccionada; las recolecciones en sucursal no bloquean horario. Pedidos cancelados o eliminados liberan la disponibilidad. Ver `docs/reglas-disponibilidad-calendario-sprint-4.md`.
- **Calendario operativo diario y semanal**: vistas de entregas por día y por semana (lunes a domingo), con navegación directa al detalle de cada pedido.
- **Filtros por estado y tipo de entrega**: disponibles tanto en el calendario diario como en el semanal.
- **Agenda de próximos pedidos**: resumen agrupado por día de los pedidos activos más próximos, visible desde el listado de pedidos.
- **Navegación desde la agenda y los calendarios al detalle**: todas las vistas (agenda, calendario diario, calendario semanal) enlazan directamente a la ficha del pedido correspondiente.
- **Autenticación con Better Auth**: acceso restringido a un usuario administrador (sin registro público), con sesión validada en el servidor.
- **Aislamiento de información por pastelería desde el servidor**: el identificador de la pastelería (`pasteleria_id`) se deriva siempre de la sesión validada en el servidor y nunca se acepta desde el cliente (query string, body o formulario). Ver `docs/AUTORIZACION.md`.

## Funcionalidades planeadas o futuras

Estas funcionalidades forman parte del alcance conceptual del MVP pero **no están implementadas todavía**:

- Catálogo de productos frecuentes.
- Gestión completa de usuarios y roles (hoy solo existe un único rol funcional: administrador).
- Dashboard operativo con indicadores (hoy la pantalla de inicio es un marcador de posición sin métricas).
- Seguimiento manual por WhatsApp mediante enlaces `wa.me` y plantillas.

## Fuera de alcance actual

El proyecto no contempla, en esta etapa:

- WhatsApp API oficial.
- Recordatorios automáticos.
- Inventario de insumos.
- Producción por cocina.
- Facturación o pasarelas de pago.
- SaaS completo con billing.
- Multi-sucursal.
- Aplicación móvil o portal para cliente final.
- Reprogramación de entregas mediante arrastrar y soltar (drag-and-drop) en el calendario.
- Manual completo de usuario final.
- Documentación comercial.

Estas funcionalidades podrán evaluarse en fases posteriores, tras validar el sistema con una pastelería real.

## Stack tecnológico

Según `package.json`:

- Next.js 16.2.9
- React 19.2.4
- TypeScript
- Tailwind CSS v4
- Prisma ORM 7.8.0 (con `@prisma/adapter-pg`)
- PostgreSQL (`pg`)
- Better Auth
- Zod
- shadcn/ui, Radix UI (`radix-ui`), Lucide React
- ESLint
- npm
- Git y GitHub

## Requisitos previos

Antes de ejecutar el proyecto, asegúrate de tener instalado:

- Node.js 20.9 o superior
- npm
- Git
- Acceso a una base de datos PostgreSQL

## Instalación y configuración local

Clonar el repositorio:

```bash
git clone https://github.com/NODAT1X/crm-pasteleria.git
```

Entrar a la carpeta del proyecto:

```bash
cd crm-pasteleria
```

Instalar dependencias:

```bash
npm install
```

Crear un archivo `.env` a partir de `.env.example`:

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

> Importante: nunca subir el archivo `.env` real al repositorio. Las credenciales, secretos y URLs reales de base de datos deben mantenerse únicamente en el entorno local o en las variables del servicio de despliegue.

## Variables de entorno

Variables definidas en `.env.example`, sin valores reales:

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Cadena de conexión a la base de datos PostgreSQL. |
| `BETTER_AUTH_SECRET` | Secreto usado por Better Auth para firmar sesiones. Debe tener al menos 32 caracteres; puede generarse con `npx auth secret` u `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | URL base de la aplicación, usada por Better Auth para cookies y callbacks (por ejemplo, `http://localhost:3000` en desarrollo). |
| `NODE_ENV` | Entorno de ejecución (`development`, `production`, etc.). |
| `ADMIN_EMAIL` | Correo del administrador inicial, usado por el script de setup del admin. |
| `ADMIN_PASSWORD` | Contraseña del administrador inicial, usada solo por el script de setup local. |
| `ADMIN_NOMBRE` | Nombre a mostrar del administrador inicial. |
| `PASTELERIA_NOMBRE` | Nombre de la pastelería (tenant) creada durante el setup inicial. |
| `PASTELERIA_SLUG` | Identificador único (slug) de la pastelería creada durante el setup inicial. |

## Comandos disponibles

```bash
npm install                              # Instala dependencias
npm run dev                              # Levanta el servidor de desarrollo (http://localhost:3000)
npm run build                            # Genera el build de producción (ejecuta `prisma generate` antes)
npm run start                            # Ejecuta el build de producción (después de `npm run build`)
npm run lint                             # Ejecuta las validaciones de ESLint
npm run prisma:generate                  # Genera el cliente de Prisma
npx prisma validate                      # Valida el esquema de Prisma
npx prisma format                        # Formatea el esquema de Prisma
npx prisma migrate dev --name <nombre>   # Crea y aplica una migración en el entorno de desarrollo
```

> `prisma migrate dev` corresponde exclusivamente al flujo de **desarrollo local**. El repositorio contiene migraciones versionadas en `prisma/migrations/`; su aplicación en otros entornos (staging, producción) sigue un proceso distinto que no cubre este documento.

## Estructura general y módulos principales

Arquitectura de monolito modular. Estructura relevante bajo `src/`:

```text
src/
  app/
    (auth)/         Rutas públicas de autenticación (login)
    (dashboard)/    Rutas internas protegidas: clientes, pedidos, entregas
    api/auth/       Endpoint de Better Auth
  modules/
    clientes/       Acciones y tipos del módulo de clientes
    pedidos/        Acciones, disponibilidad, formatters y tipos del módulo de pedidos
    pagos/          Acciones y tipos de movimientos financieros
    calendario/, catalogo/, dashboard/, seguimiento/, usuarios/   Módulos aún sin implementación (carpetas reservadas)
  server/
    auth/           Configuración de Better Auth y autorización server-side
    db/             Cliente de Prisma
    repositories/    Acceso a datos por entidad
    services/       Lógica de negocio por módulo
  validation/       Esquemas de validación (Zod) por módulo
prisma/
  schema.prisma     Modelos de datos y migraciones
docs/               Documentación técnica y funcional por sprint
```

Referencia técnica adicional: `docs/ESTRUCTURA.md`.

## Autenticación y aislamiento por pastelería

La autenticación usa Better Auth con un único usuario administrador por pastelería (sin registro público). La sesión se valida en el servidor en el layout del grupo `(dashboard)`; cualquier ruta nueva dentro de ese grupo queda protegida por defecto.

El identificador de la pastelería (`pasteleria_id`) se obtiene siempre a partir de la sesión validada en el servidor, nunca desde el cliente. Toda consulta o escritura de datos del negocio filtra por ese identificador, evitando fuga de información entre pastelerías.

Detalle completo en `docs/AUTORIZACION.md` y `docs/decision-auth-sprint-1.md`.

## Flujo vigente de ramas y Pull Requests

El flujo oficial de trabajo con Git y GitHub está definido en `docs/REGLAS_GIT.md`. Resumen:

- `main` es la rama estable; no recibe push directo, solo Pull Requests aprobados.
- `develop` es la rama de integración; las ramas de trabajo salen desde aquí y los Pull Requests diarios apuntan hacia ella.
- Cada issue se trabaja en una rama propia, con formato `tipo/sprint-issue-descripcion` (tipos: `docs`, `chore`, `feature`, `fix`, `refactor`, `hotfix`).
- No se mezclan tareas distintas en una misma rama.
- Cada Pull Request debe describir el cambio, cómo se probó, y vincular su issue (`Closes #numero`).
- El flujo de release (`develop` → `main`) y el flujo de `hotfix` (desde `main`) siguen reglas específicas descritas en `docs/REGLAS_GIT.md`.

## Validaciones de calidad

Antes de abrir un Pull Request, se espera validar:

- `npm run lint` sin errores.
- `npm run build` compilando correctamente.
- `npx prisma validate` cuando se modifica el esquema de Prisma.
- Revisión manual de la funcionalidad afectada (el proyecto no cuenta con una suite de pruebas automatizada).

Checklist completo en `docs/checklist-qa-dod.md`.

## Documentación técnica adicional

La carpeta `docs/` contiene el detalle funcional y técnico por sprint, entre otros:

- `docs/ESTRUCTURA.md` — estructura base del proyecto.
- `docs/REGLAS_GIT.md` — flujo oficial de ramas y Pull Requests.
- `docs/AUTORIZACION.md` — autorización y aislamiento por pastelería.
- `docs/entorno-local.md` — configuración detallada del entorno local.
- `docs/reglas-clientes-admin-sprint-1.md`, `docs/reglas-pedidos-sprint-2.md`, `docs/reglas-pagos-sprint-3.md` — reglas funcionales por módulo.
- `docs/politica-pedidos-sprint-4.md` y `docs/reglas-disponibilidad-calendario-sprint-4.md` — política de eliminación/cancelación y reglas de disponibilidad del calendario.
- `docs/qa-cierre-sprint-1.md`, `docs/qa-cierre-sprint-2.md`, `docs/qa-cierre-sprint-3.md`, `docs/qa-s4-010-disponibilidad-editar-cancelar-pedido.md` — evidencia de cierre y QA por sprint.

> Este README resume el estado técnico y funcional del proyecto; no sustituye ni repite el detalle de estos documentos.

## Referencia al Documento Maestro

La definición funcional completa, el alcance del MVP y las decisiones principales del proyecto deben consultarse en el Documento Maestro oficial:

```text
Documento Maestro CRM Pastelería Nodatix v1.1
```

> **Este README no sustituye un manual de usuario final.** Es un documento de entrada técnico y funcional para el equipo de desarrollo.

## Equipo

Proyecto desarrollado por Nodatix.




