# Validación parcial — Estabilización previa a pagos

## Proyecto

CRM / Sistema Web para Pastelería Nodatix

## Sprint

Sprint 3 — Primera parte: estabilización técnica y preparación previa a Pagos + saldo

## Issue relacionada

S3-010 — Validación parcial de estabilización previa a pagos

## Responsable funcional

J0SU3-52

---

# 1. Objetivo

Validar que la primera parte del Sprint 3 quedó estable antes de anexar o iniciar la segunda ronda de issues enfocadas en **Pagos + saldo**.

Esta validación confirma que las mejoras técnicas, de navegación y de experiencia base no rompieron el flujo existente de clientes y pedidos.

Esta validación **no sustituye el QA final del Sprint 3**.

---

# 2. Alcance de la validación

## Incluido

- Validar redirección de `/` con sesión y sin sesión.
- Validar login y acceso privado básico.
- Validar que el módulo de pedidos sigue funcionando después de limpiezas/refactor.
- Validar creación básica de pedido.
- Validar listado y detalle de pedidos.
- Validar edición básica de pedido.
- Validar búsqueda de cliente activo si fue implementada.
- Validar textos visibles si fueron ajustados.
- Registrar bugs o pendientes antes de iniciar Pagos + saldo.
- Confirmar si puede anexarse la segunda ronda de issues de Sprint 3.

## Fuera de alcance

- Validar pagos.
- Validar saldo.
- Validar abonos.
- Validar devoluciones.
- Validar retenciones.
- Validar calendario.
- Validar WhatsApp.
- Emitir cierre final del Sprint 3.

---

# 3. Issues consideradas

| Issue | Nombre | Resultado |
|---|---|---|
| S3-001 | Redireccionar ruta raíz del CRM | Pendiente |
| S3-002 | Preparar documento base de reglas de pagos y saldo | Pendiente |
| S3-003 | Separar componentes del formulario de pedido antes de agregar pagos | Pendiente / N/A |
| S3-004 | Mejorar buscador de cliente activo en nuevo pedido | Pendiente / N/A |
| S3-005 | Investigar tiempo de creación de pedido | Pendiente / N/A |
| S3-006 | Centralizar etiquetas de estados de pedido y tipos de entrega | Pendiente / N/A |
| S3-007 | Mejorar ordenamiento de pedidos desde backend | Pendiente / N/A |
| S3-008 | Revisar paginación y filtros básicos en listado de pedidos | Pendiente / N/A |
| S3-009 | Reemplazar textos técnicos para usuario final en pedidos | Pendiente / N/A |

> Nota: Si una issue no fue implementada en esta primera parte, marcar como `N/A` o documentar como pendiente no bloqueante.

---

# 4. Checklist funcional

## 4.1 Redirección de ruta raíz `/`

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Entrar a `/` sin sesión | Pendiente |  |
| Validar redirección a `/login` sin sesión | Pendiente |  |
| Iniciar sesión correctamente | Pendiente |  |
| Entrar a `/` con sesión activa | Pendiente |  |
| Validar redirección a ruta privada esperada | Pendiente |  |
| Confirmar que ya no aparece pantalla genérica/default | Pendiente |  |

Resultado esperado:

| Caso | Resultado esperado |
|---|---|
| Usuario sin sesión entra a `/` | Redirige a `/login` |
| Usuario con sesión entra a `/` | Redirige a `/pedidos` o ruta privada definida |
| Pantalla default/genérica | No debe mostrarse |

---

## 4.2 Login y acceso privado básico

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Abrir `/login` | Pendiente |  |
| Iniciar sesión con usuario admin válido | Pendiente |  |
| Acceder a `/clientes` con sesión | Pendiente |  |
| Acceder a `/pedidos` con sesión | Pendiente |  |
| Acceder a `/clientes` sin sesión | Pendiente |  |
| Acceder a `/pedidos` sin sesión | Pendiente |  |
| Cerrar sesión correctamente | Pendiente |  |
| Validar bloqueo/redirección después de logout | Pendiente |  |

---

## 4.3 Módulo de clientes

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Abrir listado de clientes | Pendiente |  |
| Buscar cliente por nombre | Pendiente |  |
| Buscar cliente por teléfono | Pendiente |  |
| Abrir ficha de cliente | Pendiente |  |
| Confirmar que cliente activo se visualiza correctamente | Pendiente |  |
| Confirmar que historial de pedidos sigue visible si existen pedidos | Pendiente |  |

---

## 4.4 Módulo de pedidos después de limpiezas/refactor

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Abrir `/pedidos` | Pendiente |  |
| Ver listado de pedidos | Pendiente |  |
| Abrir `/pedidos/nuevo` | Pendiente |  |
| Seleccionar cliente activo | Pendiente |  |
| Capturar fecha de entrega | Pendiente |  |
| Capturar hora de entrega | Pendiente |  |
| Capturar tipo de entrega | Pendiente |  |
| Capturar uno o más conceptos/items | Pendiente |  |
| Validar cálculo visual de total | Pendiente |  |
| Crear pedido correctamente | Pendiente |  |
| Abrir detalle del pedido creado | Pendiente |  |
| Validar total persistido correctamente | Pendiente |  |
| Editar pedido | Pendiente |  |
| Confirmar que cambios se reflejan en detalle/listado | Pendiente |  |

---

## 4.5 Búsqueda de cliente activo en nuevo pedido

Aplica si la mejora fue implementada.

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Buscar cliente por nombre desde nuevo pedido | Pendiente / N/A |  |
| Buscar cliente por teléfono desde nuevo pedido | Pendiente / N/A |  |
| Seleccionar cliente desde resultados | Pendiente / N/A |  |
| Validar estado vacío si no hay coincidencias | Pendiente / N/A |  |
| Confirmar que no se puede seleccionar cliente inactivo | Pendiente / N/A |  |

---

## 4.6 Textos visibles y etiquetas

Aplica si se modificaron textos técnicos o labels.

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Revisar texto de `Items del pedido` o equivalente | Pendiente / N/A |  |
| Confirmar que los textos son claros para usuario final | Pendiente / N/A |  |
| Revisar etiquetas de estados de pedido | Pendiente / N/A |  |
| Revisar etiquetas de tipo de entrega | Pendiente / N/A |  |
| Confirmar que no se muestran textos técnicos innecesarios | Pendiente / N/A |  |

Textos sugeridos para usuario final:

| Texto técnico | Texto recomendado |
|---|---|
| Items del pedido | Conceptos del pedido / Productos del pedido |
| `cotizacion` | Cotización |
| `confirmado` | Confirmado |
| `en_preparacion` | En preparación |
| `listo_para_entregar` | Listo para entregar |
| `entregado` | Entregado |
| `cancelado` | Cancelado |
| `recoleccion` | Recolección |
| `domicilio` | Domicilio |

---

## 4.7 Rendimiento básico

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Medir tiempo aproximado al crear pedido | Pendiente / N/A |  |
| Confirmar que no tarda excesivamente | Pendiente / N/A |  |
| Registrar si vuelve a ocurrir demora cercana a 10 segundos | Pendiente / N/A |  |

Criterio funcional recomendado:

| Caso | Resultado |
|---|---|
| Guardado normal de pedido | No debería sentirse bloqueado o excesivamente tardado |
| Demora mayor a 8-10 segundos | Registrar como pendiente técnico |

---

## 4.8 Validación de no regresión

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Crear pedido con un item | Pendiente |  |
| Crear pedido con múltiples items | Pendiente |  |
| Validar total calculado desde items | Pendiente |  |
| Editar cantidad o precio de item | Pendiente |  |
| Confirmar recálculo correcto | Pendiente |  |
| Cambiar estado de pedido válido | Pendiente |  |
| Confirmar bloqueo en estados finales | Pendiente |  |
| Confirmar historial real en ficha de cliente | Pendiente |  |

---

# 5. Bugs encontrados

| ID | Descripción | Severidad | Bloqueante | Estado |
|---|---|---|---|---|
| BUG-01 | Pendiente | Pendiente | Pendiente | Pendiente |

---

# 6. Pendientes antes de Pagos + saldo

| ID | Pendiente | Prioridad | Bloquea pagos | Comentario |
|---|---|---|---|---|
| PEND-01 | Pendiente | Pendiente | Pendiente | Pendiente |

---

# 7. Resultado de validación parcial

## Resultado

Pendiente.

Opciones:

- Puede anexarse la segunda ronda de issues de Pagos + saldo.
- No debe anexarse todavía hasta corregir bloqueantes.

## Bugs bloqueantes activos

Pendiente.

## Decisión funcional

Pendiente.

---

# 8. Criterios para permitir continuidad hacia pagos

Puede anexarse o iniciarse la segunda ronda de issues de **Pagos + saldo** si:

- `/` redirige correctamente según sesión.
- Login y acceso privado funcionan.
- Clientes sigue funcionando.
- Pedidos sigue funcionando.
- Crear pedido sigue funcionando.
- Editar pedido sigue funcionando.
- Listado y detalle siguen funcionando.
- Historial de cliente sigue funcionando.
- No hay regresiones bloqueantes.
- No hay bugs bloqueantes activos.
- Los pendientes no bloqueantes quedan documentados.

---

# 9. Comentario final

Pendiente de validación funcional.