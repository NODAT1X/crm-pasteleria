# Checklist de QA inicial y Definition of Done

Este documento define el checklist mínimo de calidad para cerrar tareas durante el MVP del CRM Pastelería.

El objetivo es evitar cerrar issues incompletas, sin evidencia o con cambios que no fueron revisados correctamente.

> Este checklist aplica para tareas técnicas, cambios de interfaz, documentación y configuración inicial del proyecto.

> Si algún punto del checklist no aplica para una tarea específica, debe indicarse como "No aplica" en la descripción del Pull Request o en el comentario de revisión.

## Definition of Done general

Una tarea se considera terminada cuando cumple con los siguientes puntos:

- [ ] La tarea cumple el alcance definido en la issue.
- [ ] Los cambios están en una rama propia creada desde `develop`.
- [ ] No se trabajó directamente sobre `main` ni sobre `develop`.
- [ ] El Pull Request apunta hacia `develop`.
- [ ] El PR está vinculado con la issue correspondiente.
- [ ] El PR describe claramente qué se cambió y cómo revisar los cambios.
- [ ] No se mezclaron cambios de varias tareas en una sola rama.
- [ ] No se agregaron archivos innecesarios al repositorio.
- [ ] No se subieron secretos, credenciales, tokens ni archivos `.env` reales.
- [ ] El cambio fue revisado por al menos un integrante del equipo cuando aplique.
- [ ] La issue puede moverse a `Listo` solo después de que el PR sea aprobado o mergeado según el flujo del sprint.

## Checklist para Pull Request técnico

Antes de abrir o solicitar revisión de un PR técnico, validar:

- [ ] La rama tiene un nombre relacionado con la issue.
- [ ] El proyecto compila correctamente cuando la tarea incluye cambios técnicos.
- [ ] Las dependencias se instalan correctamente con `npm install` cuando la tarea requiere validar entorno.
- [ ] El proyecto levanta en desarrollo con `npm run dev` cuando aplica.
- [ ] El build se ejecuta correctamente con `npm run build` cuando aplica.
- [ ] El lint se ejecuta con `npm run lint` cuando aplica.
- [ ] No hay errores visibles en consola del navegador cuando la tarea incluye cambios de UI o frontend.
- [ ] No hay código comentado innecesario.
- [ ] No hay `console.log` temporales.
- [ ] No se duplicó lógica innecesariamente.
- [ ] Las validaciones importantes no dependen solo del frontend.
- [ ] Si se modifica Prisma, se valida el esquema con `npx prisma validate`.
- [ ] Si se agregan migraciones, fueron revisadas antes de ejecutarse en ambientes compartidos.
- [ ] El PR incluye evidencia suficiente: captura, explicación, comando ejecutado o descripción de prueba.

## Checklist para cambios de UI

Cuando la tarea incluya cambios visuales o de interfaz, validar:

- [ ] La pantalla o componente cumple el objetivo de la issue.
- [ ] La interfaz es clara y fácil de entender.
- [ ] Los textos visibles están en español y sin errores ortográficos evidentes.
- [ ] Los estados principales son comprensibles para el usuario.
- [ ] La vista no se rompe en tamaños comunes de pantalla.
- [ ] Los botones o acciones principales son visibles.
- [ ] Los formularios muestran campos necesarios de forma ordenada.
- [ ] Los mensajes de error o validación son entendibles.
- [ ] No se agregaron elementos visuales fuera del alcance del MVP.
- [ ] El cambio visual fue revisado mediante captura o prueba local.

## Checklist para documentación

Cuando la tarea sea de documentación, validar:

- [ ] El documento existe en la ruta indicada por la issue.
- [ ] El contenido es claro para un integrante del equipo.
- [ ] La documentación no contradice el Documento Maestro.
- [ ] No se documentan módulos futuros como si ya estuvieran implementados.
- [ ] No se incluyen secretos reales, contraseñas ni URLs productivas.
- [ ] Los comandos documentados existen o aplican al proyecto actual.
- [ ] La documentación indica límites o fuera de alcance cuando sea necesario.
- [ ] El archivo usa formato Markdown entendible.
- [ ] El documento fue revisado al menos parcialmente por otro integrante del equipo.

## Criterios mínimos para mover una issue a Listo

Una issue puede moverse a `Listo` o `Done` cuando:

- [ ] La tarea cumple los criterios de aceptación de la issue.
- [ ] Existe un PR relacionado o evidencia clara del cambio.
- [ ] El PR fue revisado o validado por el responsable correspondiente.
- [ ] No hay cambios pendientes sin subir.
- [ ] No hay conflictos abiertos con `develop`.
- [ ] La rama fue creada correctamente desde `develop`.
- [ ] El cambio no rompe tareas ya integradas.
- [ ] Si la tarea dependía de otra, la dependencia ya fue resuelta o mergeada.
- [ ] La evidencia esperada fue agregada en el PR o en comentarios de la issue.
- [ ] El equipo está de acuerdo en que la tarea quedó cerrada.

## Evidencia mínima esperada por tipo de tarea

### Tarea técnica

Evidencia recomendada:

- Comandos ejecutados.
- Captura del proyecto funcionando cuando aplique.
- Explicación breve de validación.
- Resultado de `npm run build` o `npm run lint` cuando aplique.
- Resultado de `npx prisma validate` si se modificó Prisma.

### Tarea de documentación

Evidencia recomendada:

- Ruta del documento creado o actualizado.
- Resumen de qué se documentó.
- Comentario de revisión de otro integrante.
- Confirmación de que no incluye secretos reales.
- Confirmación de que no documenta módulos futuros como si ya estuvieran implementados.

### Tarea de UI

Evidencia recomendada:

- Captura de pantalla.
- Descripción del flujo probado.
- Validación visual en tamaño de pantalla común.
- Confirmación de que cumple el alcance de la issue.
- Confirmación de que no agrega elementos fuera del MVP.

## Fuera de alcance

Este checklist no cubre:

- Suite automatizada completa de pruebas.
- Control de calidad empresarial formal.
- Pruebas de carga o rendimiento avanzado.
- Auditoría de seguridad completa.
- Revisión legal o comercial del producto.
- Validación final con cliente real.

## Notas del Sprint 0

Durante el Sprint 0, las ramas de trabajo deben salir desde `develop` y los Pull Requests deben apuntar hacia `develop`.

El objetivo de este checklist es mantener orden mínimo antes de avanzar a los siguientes sprints.