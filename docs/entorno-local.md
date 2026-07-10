AUTH_SECRET# Entorno local

Este documento describe los pasos básicos para configurar el entorno local del proyecto CRM Pastelería.

El objetivo es que cualquier integrante del equipo pueda clonar, instalar y levantar el proyecto sin depender de instrucciones sueltas por chat.

> Este documento no incluye secretos reales, URLs productivas ni resolución de errores particulares de cada computadora.
---
## Requisitos previos

Antes de iniciar, asegúrate de tener instalado:

- Git
- Node.js 20.9 o superior
- npm
- Editor de código, recomendado: Visual Studio Code

Para validar las versiones instaladas:

```bash
node -v
npm -v
git --version
```

## Clonar el repositorio

```bash
git clone https://github.com/NODAT1X/crm-pasteleria.git
```

Entrar a la carpeta del proyecto:

```bash
cd crm-pasteleria
```

## Instalar dependencias

```bash
npm install
```

Este comando instala las dependencias definidas en `package.json`.

## Variables de entorno

El proyecto utiliza variables de entorno para configurar servicios como base de datos, autenticación y entorno de ejecución.

Existe un archivo de ejemplo:

```text
.env.example
```

Para trabajar localmente, se debe crear un archivo `.env` a partir de `.env.example`.

En Linux, macOS o Git Bash:

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## Agregar script seguro para Prisma generate

Abre:

```powershell
code package.json

```

## Variables de entorno necesarias

Crear archivo `.env` con base en `.env.example`.

Variables principales:

```env
DATABASE_URL="..."
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="http://localhost:3000"

### Importante

Nunca subir el archivo `.env` real al repositorio.

El archivo `.env` puede contener credenciales, secretos, tokens o URLs reales de base de datos. Esa información debe mantenerse únicamente en el equipo local o en las variables seguras del servicio de despliegue correspondiente.

El archivo que sí puede estar en el repositorio es:

```text
.env.example
```

## Comandos básicos del proyecto

### Levantar servidor de desarrollo

```bash
npm run dev
```

Después abrir en el navegador:

```text
http://localhost:3000
```

### Generar build de producción

```bash
npm run build
```

Este comando valida que el proyecto pueda compilar correctamente.

### Ejecutar build de producción

```bash
npm run start
```

> Este comando debe ejecutarse después de `npm run build`.

### Ejecutar lint

```bash
npm run lint
```

Este comando ejecuta las validaciones configuradas con ESLint.

## Comandos de Prisma

El proyecto usa Prisma como ORM y PostgreSQL como base de datos.

Archivo principal de Prisma:

```text
prisma/schema.prisma
```

### Validar esquema Prisma

```bash
npx prisma validate
```

### Formatear esquema Prisma

```bash
npx prisma format
```

### Generar cliente Prisma

```bash
npx prisma generate
```

### Migraciones

Las migraciones deben ejecutarse únicamente cuando el esquema Prisma ya tenga modelos definidos y el equipo técnico haya validado la estructura de base de datos.

Ejemplo de comando para futuras migraciones:

```bash
npx prisma migrate dev --name nombre_de_la_migracion
```

> No ejecutar migraciones contra bases de datos productivas desde entorno local.

## Flujo recomendado para trabajar localmente

Antes de iniciar una tarea:

```bash
git switch develop
git pull origin develop
```

Crear una rama nueva desde `develop`:

```bash
git switch -c tipo/s0-xxx-nombre-tarea
```

Ejemplo:

```bash
git switch -c docs/s0-010-entorno-local
```

Al terminar la tarea:

```bash
git status
git add .
git commit -m "docs: agrega documentación de entorno local"
git push -u origin docs/s0-010-entorno-local
```

El Pull Request debe apuntar hacia:

```text
develop
```

No hacia `main`.

## Checklist de verificación local

Antes de abrir un Pull Request, validar lo siguiente:

- [ ] El repositorio fue clonado correctamente.
- [ ] Se está trabajando en una rama propia, no directamente en `main` ni `develop`.
- [ ] Node.js está en versión 20.9 o superior.
- [ ] npm está instalado correctamente.
- [ ] Las dependencias se instalaron con `npm install`.
- [ ] El archivo `.env` fue creado a partir de `.env.example`.
- [ ] No se agregaron secretos reales al repositorio.
- [ ] El proyecto levanta con `npm run dev`.
- [ ] El proyecto compila con `npm run build`.
- [ ] El lint se ejecuta con `npm run lint`.
- [ ] Si aplica, Prisma valida correctamente con `npx prisma validate`.

## Fuera de alcance

Este documento no cubre:

- Errores particulares de cada computadora.
- Configuración completa de despliegue productivo.
- Secretos reales del proyecto.
- URLs productivas de base de datos.
- Configuración avanzada de hosting.
- Manual de usuario final.

## Referencias internas

Documentación técnica de estructura:

```text
docs/ESTRUCTURA.md
```

Documento maestro del proyecto:

```text
Documento Maestro CRM Pastelería Nodatix v1.1
```