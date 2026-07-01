# Reglas de ramas, Pull Requests y protección de main

Este documento define el flujo oficial de trabajo con Git y GitHub para el proyecto CRM / Sistema Web para Pastelería de Nodatix.

El objetivo es evitar cambios directos en ramas estables, Pull Requests sin contexto y tareas mezcladas en una misma rama.

---

## 1. Objetivo del flujo

El flujo de trabajo del repositorio busca:

- Trabajar por issue.
- Crear una rama por cada issue.
- Revisar todo cambio mediante Pull Request.
- Mantener `main` estable.
- Usar `develop` como rama de integración.
- Evitar mezclar tareas no relacionadas en una misma rama.
- Mantener trazabilidad entre issues, ramas, commits y Pull Requests.

---

## 2. Ramas oficiales

### `main`

`main` es la rama estable del proyecto.

Reglas:

- No se debe trabajar directamente sobre `main`.
- No se debe hacer push directo a `main`.
- Solo debe recibir cambios mediante Pull Request aprobado.
- Representa una versión estable o lista para release/deploy.
- Debe mantenerse protegida si GitHub lo permite.

### `develop`

`develop` es la rama de integración del proyecto.

Reglas:

- Las ramas normales de trabajo salen desde `develop`.
- Los Pull Requests diarios deben apuntar a `develop`.
- Aquí se integran tareas aprobadas antes de pasar a `main`.
- Debe mantenerse funcional y validable.

### Ramas por issue

Cada issue debe tener una rama propia.

Formato oficial:

```txt
tipo/sprint-issue-descripcion
```

Ejemplos:

```txt
docs/s0-008-reglas-git
chore/s0-007-estructura-carpetas
chore/s0-006-prisma-env
feature/s1-012-clientes-crud
fix/s1-018-validacion-pedidos
refactor/s1-020-servicios-pedidos
hotfix/prod-001-corregir-login
```

Tipos permitidos:

```txt
docs      Cambios de documentación.
chore     Configuración, estructura o mantenimiento.
feature   Nueva funcionalidad.
fix       Corrección de errores.
refactor  Mejora interna sin cambiar comportamiento esperado.
hotfix    Corrección urgente en producción.
```

Reglas de nombre:

- Usar minúsculas.
- Usar guiones medios.
- No usar espacios.
- No usar acentos.
- No usar caracteres especiales.
- Incluir referencia a sprint e issue cuando aplique.
- La descripción debe ser corta, clara y relacionada con la issue.

---

## 3. Flujo diario por issue

Este es el flujo normal para trabajar tareas del proyecto.

Pasos:

1. Tomar un issue asignado.
2. Actualizar `develop`.

```bash
git checkout develop
git pull origin develop
```

3. Crear una rama desde `develop`.

```bash
git checkout -b tipo/sprint-issue-descripcion
```

Ejemplo:

```bash
git checkout -b docs/s0-008-reglas-git
```

4. Trabajar los cambios.
5. Hacer commits claros y relacionados con la issue.
6. Subir la rama a GitHub.

```bash
git push -u origin tipo/sprint-issue-descripcion
```

7. Crear Pull Request hacia `develop`.
8. Solicitar revisión.
9. Aplicar ajustes si hay comentarios.
10. Hacer merge a `develop` solo cuando el PR esté aprobado.

---

## 4. Flujo de release

El flujo de release se usa cuando `develop` ya tiene un bloque estable de trabajo.

Pasos:

1. Validar que `develop` esté estable.
2. Crear Pull Request de `develop` hacia `main`.
3. Realizar revisión final.
4. Hacer merge a `main` solo si está listo.
5. Crear release/tag si aplica.
6. Hacer deploy si aplica.

Reglas:

- No se debe hacer Pull Request de cada issue pequeña directamente hacia `main`.
- `main` solo debe actualizarse cuando exista un bloque estable.
- El release debe venir desde `develop`, no desde una rama individual de trabajo.

---

## 5. Flujo de hotfix

El flujo de hotfix solo aplica cuando exista una versión en producción.

Pasos:

1. Detectar error en producción.
2. Crear rama `hotfix` desde `main`.

```bash
git checkout main
git pull origin main
git checkout -b hotfix/prod-xxx-descripcion
```

Ejemplo:

```bash
git checkout -b hotfix/prod-001-corregir-login
```

3. Corregir y probar.
4. Crear Pull Request hacia `main`.
5. Hacer merge a `main`.
6. Hacer release/deploy del hotfix.
7. Sincronizar `main` hacia `develop`.

Reglas:

- Las ramas `hotfix` salen desde `main`.
- Los hotfixes no salen desde `develop`.
- Después del hotfix, el cambio debe regresar a `develop`.
- No usar `hotfix` para errores normales de desarrollo.
- `hotfix` aplica únicamente para errores urgentes en producción.

---

## 6. Reglas de Pull Request

Todo Pull Request debe incluir:

- Qué se cambió.
- Cómo se probó.
- Evidencia.
- Riesgos o notas.
- Referencia al issue relacionado.

Cada PR debe cerrar o vincular un issue usando:

```txt
Closes #numero
```

Ejemplo:

```txt
Closes #8
```

---

## 7. Reglas de revisión

Antes de aprobar un Pull Request, se debe revisar:

- Que el PR apunte a la rama correcta.
- Que la rama tenga un nombre válido.
- Que el PR corresponda a un solo issue.
- Que no mezcle tareas no relacionadas.
- Que incluya evidencia de validación.
- Que no suba archivos sensibles.
- Que no incluya `.env`.
- Que no incluya secretos reales.
- Que no incluya datos reales de cliente.
- Que respete el alcance de la issue.
- Que no agregue módulos fuera del MVP sin aprobación.
- Que no implemente lógica fuera del alcance definido.
- Que build y lint no fallen cuando aplique.

---

## 8. Regla de un issue por rama

Cada rama debe corresponder a una sola issue.

Correcto:

```txt
docs/s0-008-reglas-git
```

Incorrecto:

```txt
docs/s0-008-reglas-git-y-readme-y-prisma
```

No se deben mezclar tareas distintas en una misma rama.

Ejemplos de mezcla incorrecta:

- Documentar reglas Git y modificar Prisma.
- Crear estructura de carpetas y agregar CRUD.
- Corregir README y crear pantallas funcionales.
- Agregar configuración y cambiar lógica de negocio.

---

## 9. Commits

Los commits deben ser claros y relacionados con la rama de trabajo.

Formato recomendado:

```txt
tipo: descripcion breve
```

Ejemplos:

```txt
docs: define git workflow rules
chore: add modular folder structure
chore: configure prisma environment
fix: correct order status validation
feature: add client creation form
```

Reglas:

- No hacer commits enormes con tareas mezcladas.
- No usar mensajes genéricos como `cambios`, `update` o `fix cosas`.
- No incluir archivos generados innecesarios.
- No commitear secretos ni archivos locales.

---

## 10. Protección de main

La regla esperada es que `main` no reciba push directo.

Configuración recomendada si GitHub lo permite:

- Require a pull request before merging.
- Require approvals.
- Require conversation resolution before merging.
- Block force pushes.
- Block branch deletion.
- Apply rule to `main`.

No es necesario configurar todavía:

- CI complejo.
- Merge queue.
- Deployments obligatorios.
- Reglas enterprise de aprobación.
- Status checks avanzados.

Si el tipo de cuenta o permisos del repositorio no permite configurar todas las reglas, se debe dejar evidencia o comentario explicando la limitación.

Ejemplo de nota:

```md
## Nota sobre protección de main

Se intentó configurar protección para `main`, pero el repositorio o tipo de cuenta no permite aplicar todas las reglas desde esta configuración.

Regla operativa acordada:

- No hacer push directo a `main`.
- Todo cambio hacia `main` debe pasar por Pull Request aprobado.
```

---

## 11. Relación con el Documento Maestro

El flujo de Git debe respetar la estrategia técnica del proyecto:

- Desarrollo ordenado.
- Monolito modular.
- Cambios pequeños y trazables.
- Separación por módulos del MVP.
- Evitar sobredimensionar el proceso.
- Evitar implementar módulos fuera del alcance inicial.

Los módulos del MVP deben trabajarse por issues pequeñas y trazables, siguiendo el orden de preparación técnica, clientes, pedidos, pagos, seguimiento WhatsApp, calendario, catálogo, dashboard y validación final.

---

## 12. Módulos fuera del MVP

No se deben agregar ramas, PRs o tareas para módulos fuera del MVP sin aprobación previa.

Quedan fuera del MVP inicial:

- WhatsApp API oficial.
- Inventario de insumos.
- Producción por cocina.
- Facturación.
- Pasarelas de pago.
- SaaS billing.
- Multi-sucursal completo.
- App móvil.
- Portal de cliente.
- Reportes avanzados.

---

## 13. Resumen del flujo oficial

### Flujo diario

```txt
Issue asignado
→ Crear rama desde develop
→ Trabajar cambios y commits
→ Push a GitHub
→ Pull Request hacia develop
→ Revisión
→ Merge a develop
→ Validar en develop / staging
```

### Flujo de release

```txt
develop estable
→ Pull Request develop hacia main
→ Revisión final
→ Merge a main
→ Release / tag
→ Deploy
```

### Flujo de hotfix

```txt
Error en producción
→ Crear hotfix desde main
→ Corregir y probar
→ Pull Request hotfix hacia main
→ Merge a main
→ Release / deploy hotfix
→ Sincronizar main hacia develop
```

---

## 14. Regla principal

Nadie trabaja directo en `main`.

Todo cambio debe pasar por:

```txt
Issue
→ Rama
→ Commit
→ Push
→ Pull Request
→ Revisión
→ Merge controlado
```

El objetivo es trabajar por issue, revisar por Pull Request, mantener `main` estable y evitar tareas mezcladas.