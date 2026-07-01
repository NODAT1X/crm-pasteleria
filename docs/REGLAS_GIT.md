# Reglas de ramas, Pull Requests y protección de main

Este documento define el flujo oficial de trabajo con Git y GitHub para el proyecto CRM / Sistema Web para Pastelería de Nodatix.

El objetivo es evitar cambios directos en ramas estables, Pull Requests sin contexto y tareas mezcladas en una misma rama.

## Objetivo del flujo

- Trabajar por issue.
- Crear una rama por cada issue.
- Revisar todo cambio mediante Pull Request.
- Mantener `main` estable.
- Usar `develop` como rama de integración.
- Evitar mezclar tareas no relacionadas en la misma rama.

## Ramas oficiales

### `main`

Rama estable del proyecto.

Reglas:

- No se debe trabajar directamente sobre `main`.
- No se debe hacer push directo a `main`.
- Solo debe recibir cambios mediante Pull Request aprobado.
- Representa una versión estable o lista para release/deploy.

### `develop`

Rama de integración del proyecto.

Reglas:

- Las ramas normales de trabajo salen desde `develop`.
- Los Pull Requests diarios deben apuntar a `develop`.
- Aquí se integran tareas aprobadas antes de pasar a `main`.

### Ramas por issue

Cada issue debe tener una rama propia.

Formato:

```txt
tipo/sprint-issue-descripcion


