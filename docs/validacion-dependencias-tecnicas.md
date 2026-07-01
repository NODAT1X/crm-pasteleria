# Validación de dependencias técnicas iniciales del MVP

Este documento registra la validación inicial de las dependencias técnicas principales para arrancar el desarrollo funcional del MVP del CRM Pastelería.

El objetivo no es implementar módulos, instalar nuevas dependencias ni cerrar decisiones avanzadas de arquitectura, sino confirmar que el stack base es compatible y suficiente para iniciar el desarrollo.

## Alcance de esta validación

Esta nota técnica valida:

- Versión de Next.js y TypeScript.
- Prisma y proveedor PostgreSQL previsto.
- Opción recomendada de autenticación: Better Auth o Auth.js.
- Alternativa recomendada para calendario UI: FullCalendar o react-big-calendar.
- Riesgos técnicos o decisiones pendientes.

## Fuera de alcance

Esta validación no contempla:

- Integrar calendario funcional completo.
- Implementar autenticación completa.
- Crear endpoints o módulos funcionales.
- Instalar dependencias nuevas sin aprobación técnica.
- Definir migraciones finales de base de datos.

## Dependencias actuales del proyecto

Con base en `package.json`, el proyecto actualmente utiliza:

| Área | Dependencia | Versión actual | Estado |
|---|---|---:|---|
| Framework | Next.js | 16.2.9 | Validado |
| UI base | React | 19.2.4 | Validado |
| Lenguaje | TypeScript | ^5 | Validado |
| Estilos | Tailwind CSS | ^4 | Validado |
| ORM | Prisma | ^7.8.0 | Validado |
| Cliente ORM | @prisma/client | ^7.8.0 | Validado |
| Base de datos | PostgreSQL / pg | ^8.22.0 | Validado |
| UI components | shadcn / Radix UI | shadcn ^4.12.0 / radix-ui ^1.6.1 | Validado |
| Iconos | lucide-react | ^1.23.0 | Validado |
| Linting | ESLint | ^9 | Validado |

## Validación de Next.js y TypeScript

El proyecto ya cuenta con Next.js, React y TypeScript instalados.

Versiones actuales:

```json
"next": "16.2.9",
"react": "19.2.4",
"react-dom": "19.2.4",
"typescript": "^5"
```

### Decisión

Se mantiene el stack actual:

```text
Next.js + React + TypeScript
```

### Motivo

Este stack está alineado con el Documento Maestro del proyecto, donde se plantea una arquitectura de monolito modular en la nube usando Next.js, React, Tailwind CSS, TypeScript, Prisma y PostgreSQL. :contentReference[oaicite:0]{index=0}

### Riesgos o notas

- El equipo debe validar localmente que la versión de Node.js sea compatible con el proyecto.
- Se recomienda validar el entorno con:
  - `node -v`
  - `npm -v`
  - `npm install`
  - `npm run dev`
  - `npm run build`
  - `npm run lint`

## Validación de Prisma y PostgreSQL

El proyecto ya cuenta con Prisma, cliente Prisma, adaptador PostgreSQL y `pg`.

Dependencias actuales:

```json
"@prisma/adapter-pg": "^7.8.0",
"@prisma/client": "^7.8.0",
"pg": "^8.22.0",
"prisma": "^7.8.0"
```

El archivo `prisma/schema.prisma` contiene configuración base:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

El archivo `.env.example` incluye:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

### Decisión

Se valida Prisma con PostgreSQL como base técnica inicial para el MVP.

### Motivo

El Documento Maestro define PostgreSQL como base de datos principal y Prisma como ORM con migraciones versionadas. También indica que el modelo debe estar preparado para crecer y usar `pasteleria_id` como base para aislamiento multi-tenant-ready. :contentReference[oaicite:1]{index=1}

### Riesgos o notas

- El esquema Prisma todavía no contiene modelos funcionales.
- Las migraciones deben esperar a que el equipo valide el modelo de datos inicial.
- No se deben ejecutar migraciones contra bases productivas desde entorno local.
- Toda configuración sensible debe permanecer en `.env` o variables seguras del hosting, nunca en el repositorio.

## Validación de autenticación

El Documento Maestro contempla autenticación con Better Auth o Auth.js, según el estándar técnico que defina el equipo. :contentReference[oaicite:2]{index=2}

Actualmente, en `package.json` no se identifica todavía una dependencia de autenticación instalada, como Better Auth o Auth.js.

### Opciones evaluadas

| Opción | Estado | Observación |
|---|---|---|
| Better Auth | Recomendada como primera opción | Opción viable si el equipo busca una integración moderna con Next.js y control de sesiones. |
| Auth.js | Alternativa válida | Opción madura para autenticación web, especialmente si el equipo prefiere el ecosistema Auth.js. |

### Decisión recomendada

Usar Better Auth como primera opción para el MVP, dejando Auth.js como alternativa si durante la implementación se detecta una mejor adaptación al flujo del proyecto.

### Motivo

El MVP requiere autenticación interna con roles básicos, rutas protegidas y validación en backend. El Documento Maestro define login, sesiones seguras, verificación de sesión y rol en backend como parte de los lineamientos de seguridad. :contentReference[oaicite:3]{index=3}

### Riesgos o decisiones pendientes

- Definir formalmente si se usará Better Auth o Auth.js antes de implementar login.
- Validar cómo se manejarán sesiones, roles y protección de rutas.
- Confirmar si los roles iniciales serán únicamente `Admin` y `Empleado`.
- No implementar autenticación completa dentro de esta tarea.

## Validación de calendario UI

El Documento Maestro contempla una vista de calendario de entregas por día o semana. :contentReference[oaicite:4]{index=4}

Actualmente, en `package.json` no se identifica una dependencia de calendario instalada, como FullCalendar o react-big-calendar.

### Opciones evaluadas

| Opción | Estado | Observación |
|---|---|---|
| FullCalendar | Recomendada como primera opción | Opción robusta para vistas de calendario, eventos y configuración visual. |
| react-big-calendar | Alternativa válida | Opción más simple para calendario tipo agenda, útil si se busca una integración más ligera. |

### Decisión recomendada

Usar FullCalendar como primera opción para el calendario de entregas del MVP.

### Motivo

El calendario del MVP necesita representar pedidos por fecha y hora de entrega, con posibilidad de vistas diaria o semanal. FullCalendar ofrece una base más completa para manejar eventos, vistas y futuras necesidades de interacción.

### Riesgos o decisiones pendientes

- No instalar todavía la dependencia hasta que se inicie la tarea funcional del calendario.
- Validar tamaño de bundle e integración visual con Tailwind/shadcn cuando se implemente.
- Confirmar si el MVP requiere solo vista semanal/diaria o también vista mensual.
- Evitar integrar Google Calendar, rutas, inventario o automatizaciones fuera del MVP.

## Validación general contra Documento Maestro

La decisión técnica no contradice el Documento Maestro porque mantiene:

- Next.js como framework principal.
- TypeScript como lenguaje base.
- PostgreSQL como base de datos.
- Prisma como ORM.
- Arquitectura de monolito modular.
- Autenticación pendiente entre Better Auth o Auth.js.
- Calendario como vista interna de pedidos, no integración externa.
- Enfoque MVP sin módulos futuros innecesarios.

## Decisiones técnicas iniciales

| Área | Decisión |
|---|---|
| Framework | Mantener Next.js 16.2.9 |
| Lenguaje | Mantener TypeScript |
| Base de datos | Mantener PostgreSQL |
| ORM | Mantener Prisma 7.8.0 |
| Auth | Recomendar Better Auth; Auth.js queda como alternativa |
| Calendario UI | Recomendar FullCalendar; react-big-calendar queda como alternativa |
| Instalación de nuevas dependencias | No realizar en esta tarea |

## Riesgos registrados

- La autenticación aún no está implementada ni instalada.
- El calendario UI aún no está instalado ni validado en interfaz.
- Prisma todavía no tiene modelos funcionales definidos.
- La estructura final de roles y permisos debe validarse antes de implementar auth.
- Las dependencias de calendario deben instalarse únicamente cuando exista una tarea funcional para calendario.
- La decisión de auth debe cerrarse antes de construir login y protección de rutas.
- El equipo debe evitar instalar dependencias nuevas sin una tarea técnica que lo justifique.

## Resultado de validación

La base técnica actual es suficiente para arrancar el desarrollo funcional del MVP, siempre que las decisiones pendientes de autenticación y calendario se cierren antes de implementar esos módulos.

No se agregan dependencias nuevas en esta tarea.

No se implementan módulos funcionales.

No se contradice el Documento Maestro.