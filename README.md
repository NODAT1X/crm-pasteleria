# CRM Pastelería

CRM Pastelería es un sistema web desarrollado por Nodatix para apoyar la gestión operativa de una pastelería o negocio de repostería.

El objetivo del proyecto es construir una primera versión MVP que permita centralizar información clave del negocio, como clientes, pedidos personalizados, pagos, anticipos, saldos pendientes, entregas y seguimiento manual por WhatsApp.

> Este README documenta la base inicial del proyecto. No representa un manual final de usuario ni confirma que todos los módulos del MVP ya estén implementados.

## Descripción del proyecto

El proyecto consiste en una aplicación web interna de gestión operativa tipo back-office para una pastelería en crecimiento.

Aunque puede presentarse comercialmente como un CRM para pastelerías, su función principal es ayudar al negocio a controlar pedidos, clientes, pagos, entregas y seguimiento comercial ligero desde un solo lugar.

El sistema busca resolver problemas comunes como:

- Pedidos dispersos en libretas, notas o mensajes.
- Falta de historial de clientes.
- Anticipos, abonos y saldos pendientes difíciles de controlar.
- Entregas con fechas y horarios sensibles.
- Seguimiento por WhatsApp sin registro interno.

## Stack técnico base

El proyecto utiliza el siguiente stack inicial:

- Next.js 16.2.9
- React 19.2.4
- TypeScript
- Tailwind CSS v4
- Prisma ORM 7.8.0
- PostgreSQL
- shadcn/ui
- Radix UI
- Lucide React
- ESLint
- npm
- Git y GitHub

## Arquitectura base

La arquitectura del proyecto sigue un enfoque de monolito modular.

Esto significa que el sistema se desarrolla en una sola base de código, pero organizado internamente por responsabilidades y módulos para facilitar mantenimiento y crecimiento.

La estructura inicial está pensada para separar:

- Interfaz de usuario.
- Componentes reutilizables.
- Módulos funcionales.
- Lógica de servidor.
- Validaciones.
- Tipos compartidos.
- Utilidades generales.
- Configuración de base de datos.

Referencia técnica de estructura:

```text
docs/ESTRUCTURA.md
```

## Requisitos previos

Antes de ejecutar el proyecto, asegúrate de tener instalado:

- Node.js
- npm
- Git

## Instalación

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

## Variables de entorno

El proyecto utiliza variables de entorno para configurar servicios como base de datos, autenticación y entorno de ejecución.

Crear un archivo `.env` a partir de `.env.example`:

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Variables base requeridas:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
AUTH_SECRET="replace-with-secure-random-secret"
NODE_ENV="development"
```

> Importante: nunca subir el archivo `.env` real al repositorio.  
> Las credenciales, tokens, secretos o URLs reales de base de datos deben mantenerse únicamente en el entorno local o en las variables del servicio de despliegue.

## Ejecución en desarrollo

Levantar el servidor de desarrollo:

```bash
npm run dev
```

Abrir en el navegador:

```text
http://localhost:3000
```

## Scripts disponibles

Ejecutar el proyecto en modo desarrollo:

```bash
npm run dev
```

Generar build de producción:

```bash
npm run build
```

Ejecutar el proyecto en modo producción después del build:

```bash
npm run start
```

Ejecutar validaciones de linting:

```bash
npm run lint
```

## Base de datos

El proyecto contempla PostgreSQL como base de datos principal y Prisma como ORM.

Actualmente el esquema Prisma contiene la configuración base del datasource PostgreSQL y el generador del cliente Prisma. Los modelos definitivos deberán agregarse conforme avance el desarrollo del MVP y se validen las decisiones técnicas del Documento Maestro.

Archivo principal:

```text
prisma/schema.prisma
```

## Alcance MVP

El MVP se enfoca en resolver el flujo operativo básico de una pastelería, evitando agregar complejidad innecesaria desde la primera versión.

El alcance funcional considerado para el MVP incluye:

- Gestión básica de clientes.
- Registro de pedidos personalizados.
- Control de pagos, anticipos, abonos y saldo pendiente.
- Seguimiento manual por WhatsApp mediante enlaces `wa.me` y plantillas.
- Calendario de entregas por día o semana.
- Catálogo básico de productos frecuentes.
- Dashboard básico de operación.
- Usuarios y roles simples.

> Los puntos anteriores representan el alcance funcional planeado para el MVP. No significan que todos los módulos ya estén construidos.

## Fuera de alcance inicial

Para proteger el MVP, la primera versión no contempla:

- WhatsApp API oficial.
- Recordatorios automáticos.
- Inventario de insumos.
- Producción por cocina.
- Facturación o pasarelas de pago.
- SaaS completo con billing.
- Multi-sucursal.
- App móvil o portal para cliente final.
- Manual completo de usuario final.
- Documentación comercial.

Estas funcionalidades podrán evaluarse en fases posteriores después de validar el sistema con una pastelería real.

## Reglas básicas de ramas y Pull Requests

Para el Sprint 0, el flujo de trabajo base es:

```text
main
└── develop
    └── rama de issue
```

Reglas mínimas:

- No hacer push directo a `main`.
- No trabajar directamente sobre `develop`.
- Cada issue debe trabajarse en una rama propia.
- Las ramas de trabajo deben salir desde `develop`.
- Los Pull Requests del Sprint 0 deben apuntar hacia `develop`.
- No mezclar varias tareas en una misma rama.
- Cada Pull Request debe explicar qué se cambió y cómo revisar los cambios.
- Cada Pull Request debe vincularse con su issue correspondiente.

Formato sugerido de ramas:

```text
docs/s0-009-readme-inicial
chore/s0-xxx-nombre-tarea
feature/s0-xxx-nombre-tarea
fix/s0-xxx-nombre-tarea
```

Este flujo se usa de forma temporal para Sprint 0. Las reglas finales de ramas, Pull Requests y protección de ramas se definirán en la issue correspondiente al flujo de trabajo Git/GitHub.

## Referencia al Documento Maestro

La definición funcional, alcance del MVP, criterios generales, arquitectura recomendada, reglas de negocio y decisiones principales del proyecto deben consultarse en el Documento Maestro oficial:

```text
Documento Maestro CRM Pastelería Nodatix v1.1
```

Este README resume únicamente la información necesaria para instalar, ejecutar y entender la base técnica inicial del proyecto.

## Estado del proyecto

Proyecto en fase inicial de configuración, documentación base y preparación técnica para Sprint 0.

## Equipo

Proyecto desarrollado por Nodatix.