# QA funcional y cierre — Sprint 2

## Proyecto

CRM / Sistema Web para Pastelería Nodatix

## Sprint

Sprint 2 — Pedidos personalizados

## Issue relacionada

S2-012 — QA funcional y cierre Sprint 2

## Responsable funcional

Josué

---

# 1. Objetivo

Validar el flujo completo de pedidos personalizados desde producto y emitir resultado **GO / NO-GO** para el siguiente sprint.

El Sprint 2 debe permitir crear, consultar, editar y cambiar estado de pedidos personalizados asociados a clientes activos, usando estructura `pedido + pedido_items`.

---

# 2. Alcance de QA

## Incluido

- Probar login de administrador.
- Probar acceso privado.
- Validar acceso al módulo de pedidos.
- Crear pedido en estado `cotizacion`.
- Asociar pedido a cliente activo.
- Capturar uno o más items.
- Validar fecha de entrega obligatoria.
- Validar hora de entrega obligatoria.
- Validar cálculo de subtotales y total.
- Editar pedido.
- Cambiar estados válidos.
- Validar bloqueo en estados finales.
- Validar historial real en ficha de cliente.
- Registrar bugs, pendientes y resultado GO / NO-GO.

## Fuera de alcance

- Validar pagos.
- Validar anticipos.
- Validar saldo pendiente.
- Validar calendario visual.
- Validar WhatsApp.
- Validar plantillas de mensaje.
- Validar catálogo completo.
- Validar inventario.
- Pruebas de carga.
- Auditoría completa de seguridad.

---

# 3. Datos de prueba sugeridos

## Usuario administrador

Usar el usuario administrador configurado para el entorno de prueba.

No documentar contraseñas reales en este archivo.

## Cliente de prueba

| Campo | Valor sugerido |
|---|---|
| Nombre | Cliente Prueba Sprint 2 |
| Teléfono | 2381234567 |
| WhatsApp | 2381234567 |
| Email | cliente.sprint2@nodatix.test |
| Dirección | Dirección de prueba Sprint 2 |
| Notas | Cliente creado para validación funcional del Sprint 2 |

## Pedido de prueba

| Campo | Valor sugerido |
|---|---|
| Cliente | Cliente Prueba Sprint 2 |
| Estado inicial | cotizacion |
| Fecha de entrega | Fecha futura |
| Hora de entrega | 14:00 |
| Tipo de entrega | recoleccion |
| Dirección de entrega | Opcional |
| Notas internas | Pedido creado para QA Sprint 2 |

## Items de prueba

| Item | Nombre | Descripción | Cantidad | Precio unitario | Subtotal esperado |
|---|---|---|---:|---:|---:|
| 1 | Pastel personalizado | Tres leches, relleno de fresa, decoración azul | 1 | 650 | 650 |
| 2 | Cupcakes decorados | Caja con 6 cupcakes personalizados | 2 | 180 | 360 |

Total esperado:

| Concepto | Total |
|---|---:|
| Suma de subtotales | 1010 |

---

# 4. Checklist funcional

## 4.1 Entorno, login y acceso privado

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Ejecutar proyecto desde `develop` actualizado | Pendiente |  |
| Confirmar que la app carga correctamente | Pendiente |  |
| Acceder a `/login` | Pendiente |  |
| Iniciar sesión con usuario admin válido | Pendiente |  |
| Acceder al área privada | Pendiente |  |
| Validar que rutas privadas no cargan sin sesión | Pendiente |  |
| Cerrar sesión correctamente | Pendiente |  |
| Después de logout, impedir acceso privado | Pendiente |  |

---

## 4.2 Acceso al módulo de pedidos

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Ver acceso a Pedidos en navegación interna | Pendiente |  |
| Abrir `/pedidos` | Pendiente |  |
| Ver estado vacío si no existen pedidos | Pendiente |  |
| Ver botón o acción para crear nuevo pedido | Pendiente |  |
| Abrir `/pedidos/nuevo` | Pendiente |  |

---

## 4.3 Creación de pedido en cotización

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Seleccionar cliente activo existente | Pendiente |  |
| Intentar guardar sin cliente | Pendiente |  |
| Validar que el sistema bloquea pedido sin cliente | Pendiente |  |
| Capturar fecha de entrega | Pendiente |  |
| Intentar guardar sin fecha de entrega | Pendiente |  |
| Validar que fecha de entrega es obligatoria | Pendiente |  |
| Capturar hora de entrega | Pendiente |  |
| Intentar guardar sin hora de entrega | Pendiente |  |
| Validar que hora de entrega es obligatoria | Pendiente |  |
| Capturar tipo de entrega | Pendiente |  |
| Capturar notas internas | Pendiente |  |
| Guardar pedido válido | Pendiente |  |
| Validar que el pedido inicia como `cotizacion` | Pendiente |  |

---

## 4.4 Items del pedido y total

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Agregar un item al pedido | Pendiente |  |
| Agregar más de un item al pedido | Pendiente |  |
| Capturar nombre del item | Pendiente |  |
| Capturar descripción del item | Pendiente |  |
| Capturar cantidad | Pendiente |  |
| Capturar precio unitario | Pendiente |  |
| Validar subtotal por item | Pendiente |  |
| Validar total como suma de subtotales | Pendiente |  |
| Intentar guardar pedido sin items | Pendiente |  |
| Validar que no permite guardar sin items | Pendiente |  |
| Intentar usar cantidad menor o igual a 0 | Pendiente |  |
| Intentar usar precio negativo | Pendiente |  |
| Eliminar item antes de guardar | Pendiente |  |

---

## 4.5 Listado de pedidos

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Abrir listado de pedidos | Pendiente |  |
| Ver pedido recién creado en listado | Pendiente |  |
| Mostrar cliente asociado | Pendiente |  |
| Mostrar fecha de entrega | Pendiente |  |
| Mostrar hora de entrega | Pendiente |  |
| Mostrar estado del pedido | Pendiente |  |
| Mostrar total | Pendiente |  |
| Abrir detalle desde listado | Pendiente |  |
| No mostrar funcionalidades fuera de alcance | Pendiente |  |

---

## 4.6 Detalle de pedido

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Abrir `/pedidos/[id]` | Pendiente |  |
| Mostrar cliente asociado | Pendiente |  |
| Mostrar enlace o referencia hacia ficha de cliente | Pendiente |  |
| Mostrar fecha y hora de entrega | Pendiente |  |
| Mostrar tipo de entrega | Pendiente |  |
| Mostrar dirección de entrega si aplica | Pendiente |  |
| Mostrar estado del pedido | Pendiente |  |
| Mostrar items del pedido | Pendiente |  |
| Mostrar subtotal por item | Pendiente |  |
| Mostrar total del pedido | Pendiente |  |
| Mostrar notas internas | Pendiente |  |
| Controlar pedido inexistente o no disponible | Pendiente |  |

---

## 4.7 Edición básica de pedido

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Abrir edición de pedido existente | Pendiente |  |
| Editar fecha de entrega | Pendiente |  |
| Editar hora de entrega | Pendiente |  |
| Editar tipo de entrega | Pendiente |  |
| Editar dirección de entrega | Pendiente |  |
| Editar notas internas | Pendiente |  |
| Editar item existente | Pendiente |  |
| Agregar nuevo item en edición | Pendiente |  |
| Eliminar item en edición | Pendiente |  |
| Validar recálculo de total | Pendiente |  |
| Guardar cambios correctamente | Pendiente |  |
| Ver cambios reflejados en detalle | Pendiente |  |
| Ver cambios reflejados en listado | Pendiente |  |

---

## 4.8 Cambio de estado del pedido

Estados esperados:

| Estado | Tipo |
|---|---|
| `cotizacion` | En proceso |
| `confirmado` | En proceso |
| `en_preparacion` | En proceso |
| `listo_para_entregar` | En proceso |
| `entregado` | Final |
| `cancelado` | Final |

### Transiciones válidas

| Transición | Resultado | Evidencia / notas |
|---|---|---|
| `cotizacion` → `confirmado` | Pendiente |  |
| `cotizacion` → `cancelado` | Pendiente |  |
| `confirmado` → `en_preparacion` | Pendiente |  |
| `confirmado` → `cancelado` | Pendiente |  |
| `en_preparacion` → `listo_para_entregar` | Pendiente |  |
| `en_preparacion` → `cancelado` | Pendiente |  |
| `listo_para_entregar` → `entregado` | Pendiente |  |

### Bloqueos esperados

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Bloquear cambios desde `entregado` | Pendiente |  |
| Bloquear cambios desde `cancelado` | Pendiente |  |
| No permitir transiciones inválidas desde UI | Pendiente |  |
| Backend rechaza transiciones inválidas | Pendiente |  |
| Confirmar cancelación antes de aplicar | Pendiente |  |

---

## 4.9 Estados finales y bloqueo de edición

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Marcar pedido como `entregado` | Pendiente |  |
| Validar que `entregado` es estado final | Pendiente |  |
| Intentar editar pedido entregado | Pendiente |  |
| Validar bloqueo de edición en entregado | Pendiente |  |
| Marcar pedido como `cancelado` | Pendiente |  |
| Validar que `cancelado` es estado final | Pendiente |  |
| Intentar editar pedido cancelado | Pendiente |  |
| Validar bloqueo de edición en cancelado | Pendiente |  |

---

## 4.10 Historial real en ficha de cliente

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Abrir ficha del cliente con pedidos | Pendiente |  |
| Ver historial real de pedidos | Pendiente |  |
| Mostrar fecha de entrega | Pendiente |  |
| Mostrar hora de entrega | Pendiente |  |
| Mostrar estado del pedido | Pendiente |  |
| Mostrar total | Pendiente |  |
| Abrir detalle de pedido desde ficha de cliente | Pendiente |  |
| Cliente sin pedidos conserva estado vacío | Pendiente |  |
| No mostrar pedidos fuera del cliente actual | Pendiente |  |

Texto vacío esperado para cliente sin pedidos:

> Este cliente aún no tiene pedidos registrados.

---

## 4.11 Validación de fuera de alcance

| Funcionalidad | Resultado | Evidencia / notas |
|---|---|---|
| No existe módulo funcional de pagos | Pendiente |  |
| No existe captura de anticipo | Pendiente |  |
| No existe saldo pendiente funcional | Pendiente |  |
| No existe calendario visual | Pendiente |  |
| No existe integración WhatsApp | Pendiente |  |
| No existe catálogo completo obligatorio | Pendiente |  |
| No existe rol empleado activo | Pendiente |  |
| No se prometen funciones fuera del Sprint 2 en UI | Pendiente |  |

---

# 5. Bugs encontrados

| ID | Descripción | Severidad | Bloqueante | Estado |
|---|---|---|---|---|
| BUG-01 | Durante la validación inicial apareció un problema relacionado con Prisma al intentar acceder al módulo de pedidos. El bug fue corregido y posteriormente el flujo pudo validarse correctamente. | Alta | No actualmente | Resuelto |

---

# 6. Pendientes no bloqueantes

| ID | Pendiente | Prioridad | Comentario |
|---|---|---|---|
| PEND-01 | Cambiar el texto “Items del pedido” por un texto más claro para el dueño de la pastelería. | Baja | Se recomienda usar “Productos del pedido” o “Conceptos del pedido”, porque “Datos del pedido” puede confundirse con fecha, hora, cliente y notas. |
| PEND-02 | Mejorar el buscador de cliente activo en el formulario de nuevo pedido. | Media | Actualmente el cliente puede seleccionarse desde el desplegable, pero el buscador no funciona como motor de búsqueda independiente ni tiene botón de búsqueda. Conforme aumenten los clientes, esto puede afectar la operación. |
| PEND-03 | Revisar tiempo de creación de pedido. | Baja / Media | El pedido se crea correctamente, pero el guardado tarda aproximadamente 10 segundos. No bloquea el flujo, pero conviene monitorearlo y optimizarlo si se mantiene. |

---

# 7. Resultado final QA

## Resultado

GO para iniciar el siguiente sprint.

## Bugs bloqueantes

Ninguno activo.

## Decisión funcional

Sprint 3 puede iniciar: Sí.

## Comentario

Se validó correctamente el flujo funcional del Sprint 2 desde producto. El sistema permite crear pedidos personalizados asociados a clientes activos, capturar items, calcular total, validar campos obligatorios, listar pedidos, consultar detalle, editar pedidos, cambiar estados válidos, bloquear edición en estados finales y mostrar historial real en la ficha del cliente.

También se confirmó que pagos, calendario visual y WhatsApp no están activos, respetando el alcance definido para Sprint 2.

Durante QA se detectó un bug inicial relacionado con Prisma, pero fue corregido y no quedó como bloqueo activo. Los pendientes encontrados son de experiencia de usuario, búsqueda y rendimiento, por lo que no impiden iniciar el siguiente sprint.

# 8. Criterios para GO

El Sprint 2 puede cerrarse con GO si:

- Login y acceso privado funcionan.
- Se puede crear pedido asociado a cliente activo.
- El pedido inicia como `cotizacion`.
- Fecha y hora de entrega son obligatorias.
- Se puede capturar al menos un item.
- El total se calcula desde items.
- Se puede consultar listado de pedidos.
- Se puede consultar detalle de pedido.
- Se puede editar pedido no final.
- Se pueden cambiar estados válidos.
- Se bloquea edición/cambio en estados finales.
- La ficha del cliente muestra historial real de pedidos.
- No quedan bugs bloqueantes.
- Los pendientes no bloqueantes quedan documentados.

---

# 9. Comentario final

Pendiente de validación funcional.