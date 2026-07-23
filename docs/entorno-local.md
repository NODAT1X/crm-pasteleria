# Entorno local

Este documento describe los pasos básicos para configurar el entorno local del proyecto CRM Pastelería.

El objetivo es que cualquier integrante del equipo pueda clonar, instalar y levantar el proyecto sin depender de instrucciones sueltas por chat.

> Este documento no incluye secretos reales, URLs productivas ni resolución de errores particulares de cada computadora.

---

## Alcance de la guía

Esta guía cubre únicamente la configuración técnica del entorno local: clonar el repositorio, instalar dependencias, configurar variables de entorno, ejecutar el proyecto y validar Prisma.

No es un manual de usuario final ni describe funcionalidades del sistema. Para el estado funcional y técnico del proyecto, ver `README.md`. Para el detalle de módulos y reglas de negocio, ver la documentación técnica en `docs/`.

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

Este comando instala las dependencias definidas en `package.json`, usando `package-lock.json` para fijar versiones.

## Configurar variables de entorno

El proyecto utiliza variables de entorno para la conexión a base de datos, la autenticación (Better Auth) y el setup inicial del administrador.

Existe un archivo de ejemplo sin valores reales:

```text
.env.example
```

Para trabajar localmente, crea un archivo `.env` a partir de `.env.example`.

En Linux, macOS o Git Bash:

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

> Requisito obligatorio: nunca subir el archivo `.env` real al repositorio. Puede contener credenciales, secretos o URLs reales de base de datos. Esa información debe mantenerse únicamente en el equipo local o en las variables seguras del servicio de despliegue correspondiente. El único archivo pensado para estar en el repositorio es `.env.example`.

### Variables usadas por la aplicación y Better Auth

Requisito obligatorio para levantar el proyecto y para que Better Auth funcione correctamente:

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Cadena de conexión a la base de datos PostgreSQL. |
| `BETTER_AUTH_SECRET` | Secreto usado por Better Auth para firmar sesiones. Debe tener al menos 32 caracteres; puede generarse con `npx auth secret` u `openssl rand -base64 32`. Este es el nombre oficial documentado, coincide con `.env.example`. |
| `BETTER_AUTH_URL` | URL base de la aplicación, usada por Better Auth para cookies y callbacks (por ejemplo, `http://localhost:3000` en desarrollo). |
| `NODE_ENV` | Entorno de ejecución (`development`, `production`, etc.). |

### Variables usadas para crear el administrador y la pastelería inicial

Solo son necesarias si se ejecuta el script de setup inicial descrito en [Crear el administrador inicial](#crear-el-administrador-inicial-si-aplica); no intervienen en el arranque normal de `npm run dev`:

| Variable | Uso |
|---|---|
| `ADMIN_EMAIL` | Correo del administrador inicial. |
| `ADMIN_PASSWORD` | Contraseña del administrador inicial, usada solo por el script de setup local. |
| `ADMIN_NOMBRE` | Nombre a mostrar del administrador inicial. |
| `PASTELERIA_NOMBRE` | Nombre de la pastelería (tenant) creada durante el setup inicial. |
| `PASTELERIA_SLUG` | Identificador único (slug) de la pastelería creada durante el setup inicial. |

No incluyas en `.env` ni en ningún commit valores reales de estas variables; usa siempre datos de prueba locales.

## Crear el administrador inicial, si aplica

El proyecto no tiene registro público: el acceso es de un único usuario administrador por pastelería. Para crear ese administrador en una base local ya migrada, existe el script `scripts/create-admin.ts`:

```bash
npx tsx scripts/create-admin.ts
```

Este script usa las variables `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NOMBRE`, `PASTELERIA_NOMBRE` y `PASTELERIA_SLUG` definidas en `.env` para crear la pastelería y el usuario administrador correspondientes. No sustituye la documentación funcional de usuarios ni administración; solo es un paso de configuración local.

## Comandos de desarrollo y validación

### Levantar servidor de desarrollo

```bash
npm run dev
```

Después abrir en el navegador:

```text
http://localhost:3000
```

### Ejecutar lint

```bash
npm run lint
```

Este comando ejecuta las validaciones configuradas con ESLint.

### Generar build de producción

```bash
npm run build
```

Este comando valida que el proyecto pueda compilar correctamente. `npm run build` ejecuta `prisma generate` automáticamente antes, mediante el script `prebuild` definido en `package.json`.

### Ejecutar build de producción

```bash
npm run start
```

> Este comando debe ejecutarse después de `npm run build`.

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
npm run prisma:generate
```

`prisma:generate` es el script disponible en `package.json`. La invocación directa equivalente es:

```bash
npx prisma generate
```

### Migraciones

Requisito obligatorio: las migraciones locales deben ejecutarse únicamente contra la base de datos de desarrollo correspondiente en el equipo local, nunca contra una base de datos productiva.

Ejemplo de comando para futuras migraciones:

```bash
npx prisma migrate dev --name nombre_de_la_migracion
```

> Esta guía no afirma que las migraciones estén aplicadas en todos los entornos; su aplicación fuera de desarrollo local (staging, producción) sigue un proceso distinto que no cubre este documento.

## Flujo de ramas y Pull Requests

El flujo oficial de trabajo con Git y GitHub está definido en `docs/REGLAS_GIT.md`; ese documento es la fuente de verdad. Resumen aplicado al entorno local:

- Rama base: `develop`.
- Cada tarea se trabaja en una rama propia creada desde `develop`, con formato `tipo/sprint-issue-descripcion`.
- Los Pull Requests se dirigen hacia `develop`, no hacia `main`.

Antes de iniciar una tarea:

```bash
git switch develop
git pull origin develop
```

Crear una rama nueva desde `develop`:

```bash
git switch -c tipo/sprint-issue-descripcion
```

Ejemplo vigente:

```bash
git switch -c docs/s4-018-entorno-local-advertencias
```

Al terminar la tarea:

```bash
git status
git add docs/entorno-local.md
git commit -m "docs: corrige entorno-local y documenta advertencias conocidas"
git push -u origin docs/s4-018-entorno-local-advertencias
```

El Pull Request debe apuntar hacia `develop`, no hacia `main`.

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

## Advertencias conocidas del entorno local

Esta sección documenta advertencias que pueden aparecer al configurar el entorno local, para no confundirlas con errores del proyecto.

### Advertencia no bloqueante: múltiples lockfiles

Algunas herramientas de Node.js (npm, o el propio Next.js) pueden advertir sobre la existencia de más de un archivo de bloqueo de dependencias (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`) cuando detectan alguno de estos archivos en una carpeta superior o cercana a la del proyecto.

- No se reprodujo esta advertencia durante la revisión actual del repositorio.
- Dentro del repositorio solo se verificó un `package-lock.json`, en la raíz del proyecto.
- Puede aparecer en determinadas computadoras si existe otro lockfile en una carpeta superior o cercana (por ejemplo, por sincronización de archivos, otro proyecto en una carpeta padre, o el uso combinado de npm/yarn/pnpm en el mismo equipo).
- Es una advertencia informativa y no bloqueante cuando `npm run lint` y `npm run build` concluyen correctamente.
- Depende de la configuración de cada computadora y no debe presentarse como un defecto general del proyecto.

Recomendación si aparece: verificar que los comandos se ejecuten desde la raíz del repositorio (`crm-pasteleria`) y revisar si existe algún lockfile externo en carpetas superiores. Cualquier lockfile externo debe revisarse antes de modificarlo o eliminarlo; esta guía no indica eliminar archivos automáticamente.

#### Revisión S4-021: verificación puntual del warning de múltiples `package-lock.json`

La issue S4-021 revisó específicamente el warning de Next.js/Turbopack relacionado con la detección de múltiples archivos `package-lock.json` en el entorno local.

Resultado de la verificación:

- El warning **no se reprodujo** en el build actual.
- `npm run build` **terminó correctamente**.
- Dentro del repositorio **solo existe un `package-lock.json`**, ubicado en la raíz del proyecto.
- Se confirmó con `git ls-files`, donde únicamente aparecen `package.json` y `package-lock.json` como archivos de paquete versionados.
- También se confirmó con `find . -name package-lock.json`, que solo encontró `./package-lock.json` dentro del repositorio.
- Se detectaron otros archivos `package-lock.json` en proyectos hermanos ubicados fuera del repositorio, dentro de una carpeta padre del entorno local. Esos archivos **no forman parte de `crm-pasteleria`**.
- **No se debe eliminar el `package-lock.json` del proyecto**: es el lockfile principal del repositorio y debe permanecer versionado.
- Si el warning aparece en otro equipo, se debe revisar si existe un `package-lock.json` en una carpeta padre o si el proyecto se está ejecutando desde una ubicación incorrecta.
- Mientras `npm run build` termine correctamente y dentro del repositorio solo exista el lockfile principal, el warning se considera una advertencia local **no bloqueante**.
- La corrección, si aplica localmente, consiste en ordenar la carpeta de trabajo o eliminar únicamente lockfiles accidentales fuera del repositorio. Nunca debe eliminarse el `package-lock.json` principal del proyecto.

**Veredicto:** warning no reproducible en el build actual. No se encontró problema dentro del repositorio. Se documenta como advertencia local no bloqueante en caso de aparecer en otros entornos.

### Problemas particulares de una computadora

Cualquier otro error de instalación, permisos, antivirus, red o configuración específica de un equipo queda fuera del alcance de esta guía y debe resolverse de forma individual.

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

Flujo oficial de ramas y Pull Requests:

```text
docs/REGLAS_GIT.md
```

Documento maestro del proyecto:

```text
Documento Maestro CRM Pastelería Nodatix v1.1
```
