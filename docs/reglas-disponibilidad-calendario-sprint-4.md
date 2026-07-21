# Reglas de Disponibilidad — Calendario Operativo Sprint 4

## 1. Propósito del documento

Este documento define las reglas funcionales finales de disponibilidad que deberá usar el calendario operativo del CRM Pastelería durante Sprint 4.

Su objetivo es evitar ambigüedad antes de implementar:

- consultas de disponibilidad;
- bloqueo de horarios;
- formulario de pedidos;
- vistas operativas de calendario;
- validaciones visuales de horarios ocupados.

Este documento funciona como contrato funcional para las siguientes tareas del Sprint 4:

- S4-008
- S4-009
- S4-010
- S4-011

No define reglas avanzadas de capacidad, rutas, repartidores ni límite de personas. Es una política MVP de disponibilidad operativa.

---

## 2. Contexto funcional

Durante Sprint 4 se confirmó que el calendario operativo debe ayudar a evitar empalmes en entregas a domicilio.

También se confirmó que las cotizaciones con entrega a domicilio sí deben bloquear disponibilidad, pero únicamente sobre la ventana operativa asociada a la hora de entrega seleccionada por el cliente. Esta regla no significa que una cotización bloquee todo el día.

La hora seleccionada por el cliente representa el inicio de la ventana operativa.

Esta decisión toma como base la política aprobada en S4-004, donde se definió que:

- las entregas a domicilio bloquean una ventana operativa;
- los pedidos de recolección en sucursal pueden compartir horario;
- los pedidos cancelados no deben bloquear disponibilidad;
- los pedidos eliminados no bloquean disponibilidad porque ya no existen en el sistema.

---

## 3. Regla principal de disponibilidad

La disponibilidad del calendario se determina por cuatro factores:

1. Fecha de entrega.
2. Hora de entrega.
3. Tipo de entrega.
4. Estado del pedido.

Un pedido bloquea disponibilidad únicamente cuando cumple todas estas condiciones:

```txt
tipo_entrega = domicilio
estado_pedido ∈ cotizacion | confirmado | en_preparacion | listo_para_entregar
pedido existe en el sistema
fecha_entrega y hora_entrega coinciden con una ventana operativa bloqueante
```

Si cualquiera de esas condiciones no se cumple, el pedido no debe bloquear disponibilidad.

Regla clave:

```txt
El bloqueo aplica sobre una ventana horaria de 30 minutos a partir de la hora seleccionada, no sobre el día completo.
```

---

## 4. Tipos de entrega

### 4.1 Entrega a domicilio

Las entregas a domicilio sí bloquean disponibilidad operativa.

Esto aplica porque una entrega a domicilio requiere tiempo de traslado, preparación de salida, coordinación y posible margen operativo.

Para Sprint 4, cada entrega a domicilio bloquea una ventana fija de 30 minutos a partir de la hora de entrega seleccionada.

Importante:

```txt
Una entrega a domicilio no bloquea todo el día. Solo bloquea su ventana operativa de 30 minutos.
```

### 4.2 Recolección en sucursal

Los pedidos de recolección en sucursal no bloquean disponibilidad horaria.

Varios clientes pueden recoger pedidos en la misma hora o en horarios cercanos. Por lo tanto, el calendario puede mostrar varias recolecciones en el mismo horario sin considerarlas conflicto operativo.

---

## 5. Ventana operativa de 30 minutos

Para Sprint 4, una entrega a domicilio bloquea una ventana operativa total de 30 minutos.

La hora seleccionada por el cliente representa el inicio de la ventana operativa.

### Regla MVP

```txt
Una entrega a domicilio bloquea 30 minutos de disponibilidad operativa a partir de la hora seleccionada.
```

### Ejemplo funcional 1

Si existe una entrega a domicilio a las 4:00 p.m., el calendario debe considerarla como un bloqueo operativo de 30 minutos desde esa hora.

```txt
Entrega a domicilio: 4:00 p.m.
Ventana bloqueada: 4:00 p.m. a 4:30 p.m.
```

Esto significa que otra entrega a domicilio no debería poder asignarse dentro de esa misma ventana operativa.

### Ejemplo funcional 2

```txt
Entrega a domicilio: 11:15 p.m.
Ventana bloqueada: 11:15 p.m. a 11:45 p.m.
```

Esto significa que otra entrega a domicilio no debería poder asignarse entre 11:15 p.m. y 11:45 p.m.

También significa que el sistema sí puede permitir otras entregas a domicilio el mismo día, siempre que estén fuera de esa ventana operativa.

Ejemplo:

```txt
Pedido A
Fecha: 29/07/2026
Tipo de entrega: domicilio
Hora: 11:15 p.m.
Ventana bloqueada: 11:15 p.m. a 11:45 p.m.

Pedido B
Fecha: 29/07/2026
Tipo de entrega: domicilio
Hora: 2:00 p.m.

Resultado:
Pedido B sí puede registrarse porque está en el mismo día, pero fuera de la ventana bloqueada por Pedido A.
```

### Nota de implementación

La forma exacta de calcular la ventana debe implementarse de forma centralizada en backend, siempre respetando el resultado funcional esperado:

```txt
No permitir empalmes operativos entre entregas a domicilio dentro de una ventana de 30 minutos.
```

La consulta no debe interpretar una entrega a domicilio como bloqueo de día completo.

Tampoco debe interpretar la ventana como un bloqueo centrado antes y después de la hora seleccionada.

Interpretación correcta:

```txt
hora seleccionada = inicio de ventana
fin de ventana = hora seleccionada + 30 minutos
```

---

## 6. Estados que bloquean disponibilidad

Los siguientes estados sí bloquean disponibilidad cuando el pedido es de entrega a domicilio:

| Estado del pedido | ¿Bloquea disponibilidad? | Motivo |
|---|---:|---|
| Cotización | Sí | Aunque aún no esté confirmada, representa una intención operativa sobre una fecha y hora específicas. |
| Confirmado | Sí | El pedido ya fue aceptado y debe reservarse el espacio operativo. |
| En preparación | Sí | El pedido está activo y forma parte de la operación real. |
| Listo para entregar | Sí | El pedido sigue pendiente de entrega y debe conservar su horario operativo. |

Importante:

```txt
Estos estados bloquean solo la ventana operativa de 30 minutos que inicia en la hora de entrega seleccionada. No bloquean el día completo.
```

---

## 7. Estados que no bloquean disponibilidad

Los siguientes estados no bloquean disponibilidad:

| Estado del pedido | ¿Bloquea disponibilidad? | Motivo |
|---|---:|---|
| Entregado | No | El pedido ya fue completado y no debe impedir nuevas asignaciones futuras. |
| Cancelado | No | El pedido ya no se realizará y libera disponibilidad. |

---

## 8. Matriz final de disponibilidad

| Tipo de entrega | Estado | ¿Bloquea horario? | Alcance del bloqueo | Regla |
|---|---|---:|---|---|
| Domicilio | Cotización | Sí | 30 minutos desde la hora seleccionada | Bloquea solo la ventana operativa asociada a la entrega. |
| Domicilio | Confirmado | Sí | 30 minutos desde la hora seleccionada | Bloquea solo la ventana operativa asociada a la entrega. |
| Domicilio | En preparación | Sí | 30 minutos desde la hora seleccionada | Bloquea solo la ventana operativa asociada a la entrega. |
| Domicilio | Listo para entregar | Sí | 30 minutos desde la hora seleccionada | Bloquea solo la ventana operativa asociada a la entrega. |
| Domicilio | Entregado | No | No aplica | Ya no bloquea nueva disponibilidad. |
| Domicilio | Cancelado | No | No aplica | Libera disponibilidad. |
| Recolección en sucursal | Cotización | No | No aplica | Puede compartir horario con otros pedidos. |
| Recolección en sucursal | Confirmado | No | No aplica | Puede compartir horario con otros pedidos. |
| Recolección en sucursal | En preparación | No | No aplica | Puede compartir horario con otros pedidos. |
| Recolección en sucursal | Listo para entregar | No | No aplica | Puede compartir horario con otros pedidos. |
| Recolección en sucursal | Entregado | No | No aplica | Ya fue completado. |
| Recolección en sucursal | Cancelado | No | No aplica | Ya no se realizará. |

---

## 9. Pedidos eliminados

Un pedido eliminado no bloquea disponibilidad.

Motivo:

```txt
Si el pedido fue eliminado, ya no existe en el sistema y no debe participar en consultas de disponibilidad, calendario ni validaciones de bloqueo.
```

Esto aplica tanto para pedidos eliminados sin movimientos financieros como para pedidos eliminados con movimientos financieros, conforme a la política MVP de eliminación aprobada en Sprint 4.

---

## 10. Pedidos cancelados

Un pedido cancelado no bloquea disponibilidad.

Motivo:

```txt
El pedido cancelado representa una operación que ya no se realizará.
```

Por lo tanto, si un pedido a domicilio estaba bloqueando una ventana operativa y luego pasa a estado `cancelado`, esa ventana debe quedar disponible nuevamente para nuevos pedidos.

Importante:

```txt
La liberación aplica sobre la ventana horaria del pedido cancelado, no sobre todo el día.
```

---

## 11. Cotizaciones con entrega a domicilio

Las cotizaciones con entrega a domicilio sí bloquean disponibilidad operativa.

Esta regla queda definida explícitamente para Sprint 4.

La cotización no bloquea todo el día. Bloquea únicamente la ventana operativa de 30 minutos que inicia en la hora de entrega seleccionada por el cliente.

Motivo funcional:

```txt
Una cotización con entrega a domicilio puede convertirse en pedido confirmado y ya representa una intención operativa sobre una fecha y hora específicas.
```

Por lo tanto, mientras la cotización exista y esté activa, debe reservar temporalmente esa ventana operativa.

Ejemplo:

```txt
Pedido A
Fecha de entrega: 29/07/2026
Tipo de entrega: domicilio
Estado: cotización
Hora: 4:00 p.m.
Ventana bloqueada: 4:00 p.m. a 4:30 p.m.
```

Resultado:

```txt
El horario debe considerarse ocupado para otra entrega a domicilio entre 4:00 p.m. y 4:30 p.m.
No se bloquea todo el día 29/07/2026.
```

Por lo tanto, el sistema puede seguir permitiendo otras entregas a domicilio el mismo día, siempre que no se empalmen con esa ventana.

Ejemplo permitido:

```txt
Pedido A
Fecha: 29/07/2026
Tipo: domicilio
Estado: cotización
Hora: 4:00 p.m.
Ventana bloqueada: 4:00 p.m. a 4:30 p.m.

Pedido B
Fecha: 29/07/2026
Tipo: domicilio
Estado: cotización
Hora: 6:00 p.m.

Resultado:
Pedido B puede registrarse porque está fuera de la ventana bloqueada por Pedido A.
```

Ejemplo no permitido:

```txt
Pedido A
Fecha: 29/07/2026
Tipo: domicilio
Estado: cotización
Hora: 4:00 p.m.
Ventana bloqueada: 4:00 p.m. a 4:30 p.m.

Pedido B
Fecha: 29/07/2026
Tipo: domicilio
Estado: confirmado
Hora: 4:15 p.m.

Resultado:
Pedido B no debería permitirse porque cae dentro de la ventana bloqueada por Pedido A.
```

---

## 12. Recolecciones en sucursal

Las recolecciones en sucursal no bloquean disponibilidad.

Ejemplo:

```txt
Pedido A
Tipo de entrega: recolección en sucursal
Hora: 5:00 p.m.

Pedido B
Tipo de entrega: recolección en sucursal
Hora: 5:00 p.m.
```

Resultado:

```txt
Ambos pedidos pueden coexistir en el mismo horario.
```

También puede coexistir una recolección con una entrega a domicilio en el mismo horario, porque la recolección no consume ventana operativa de reparto.

Ejemplo:

```txt
Pedido A
Tipo de entrega: domicilio
Estado: confirmado
Hora: 5:00 p.m.

Pedido B
Tipo de entrega: recolección en sucursal
Estado: confirmado
Hora: 5:00 p.m.
```

Resultado:

```txt
Pedido B puede existir en el mismo horario porque es recolección y no bloquea disponibilidad operativa.
```

---

## 13. Reglas que deben implementar S4-008, S4-009, S4-010 y S4-011

Las siguientes tareas deben respetar estas reglas sin reinterpretarlas.

### Backend

- Consultar disponibilidad considerando únicamente pedidos existentes.
- Considerar como bloqueantes solo pedidos a domicilio.
- Considerar como bloqueantes solo estados activos:
  - cotización;
  - confirmado;
  - en preparación;
  - listo para entregar.
- Excluir pedidos cancelados.
- Excluir pedidos entregados.
- Excluir pedidos eliminados porque ya no existen.
- Aplicar ventana operativa de 30 minutos para entregas a domicilio.
- Interpretar la hora seleccionada como inicio de la ventana operativa.
- Aplicar el bloqueo sobre fecha y hora, no sobre el día completo.
- Permitir múltiples entregas a domicilio el mismo día si sus ventanas operativas no se empalman.

### Frontend

- Mostrar visualmente los horarios bloqueados por entregas a domicilio activas.
- Mostrar bloqueos por ventana horaria, no por día completo.
- Representar cada bloqueo como una ventana de 30 minutos desde la hora seleccionada.
- Permitir recolecciones en horarios compartidos.
- Evitar mostrar pedidos cancelados como bloqueantes.
- Evitar mostrar pedidos entregados como bloqueantes.
- Explicar visualmente cuando un horario esté ocupado por una entrega a domicilio.
- Permitir seleccionar otros horarios del mismo día cuando estén fuera de una ventana bloqueada.

### Formularios

- Si el usuario intenta capturar una entrega a domicilio dentro de una ventana bloqueada, el sistema debe advertir o impedir la asignación según el alcance de la tarea correspondiente.
- Si el usuario captura una entrega a domicilio en el mismo día pero fuera de una ventana bloqueada, el sistema debe permitirla.
- Si el usuario captura una recolección en sucursal, no debe bloquearse por horarios ya ocupados.
- Si el pedido es cotización con domicilio, debe tratarse como bloqueante solo en su ventana horaria.
- La hora seleccionada debe tratarse como inicio de la ventana operativa.

---

## 14. Fuera de alcance para Sprint 4

Este documento no define ni aprueba:

- bloqueo de día completo por tener una cotización o entrega a domicilio;
- bloqueo de una hora completa por entrega a domicilio;
- bloqueo centrado antes y después de la hora seleccionada;
- capacidad máxima diaria;
- número máximo de pedidos por hora;
- número máximo de personas atendidas;
- rutas de reparto;
- asignación de repartidores;
- optimización geográfica;
- duración variable por distancia;
- horarios especiales por zona;
- reglas por tamaño o complejidad del pastel;
- sobrecupo manual;
- calendario avanzado por recursos.

Estas reglas pueden evaluarse en una fase futura, pero no forman parte del contrato funcional de Sprint 4.

---

## 15. Criterios de aceptación funcional

La política se considera lista cuando el equipo aprueba que:

- Las entregas a domicilio bloquean una ventana operativa de 30 minutos.
- La hora seleccionada representa el inicio de la ventana operativa.
- El bloqueo aplica sobre la hora seleccionada, no sobre el día completo.
- Las recolecciones en sucursal pueden compartir horario.
- Las cotizaciones con entrega a domicilio sí bloquean disponibilidad.
- Las cotizaciones con entrega a domicilio bloquean solo su ventana operativa.
- Los pedidos confirmados, en preparación y listos para entregar bloquean disponibilidad si son a domicilio.
- Los pedidos entregados no bloquean nueva disponibilidad operativa.
- Los pedidos cancelados no bloquean disponibilidad.
- Los pedidos eliminados no bloquean disponibilidad porque ya no existen.
- Las reglas avanzadas de capacidad quedan fuera de alcance.
- El documento puede usarse como contrato funcional para implementar backend y frontend del calendario operativo.

---

## 16. Veredicto funcional

Para Sprint 4, la regla final de disponibilidad queda aprobada de la siguiente forma:

```txt
Solo los pedidos existentes con entrega a domicilio y estado activo bloquean disponibilidad.
```

Estados activos bloqueantes:

```txt
cotizacion
confirmado
en_preparacion
listo_para_entregar
```

Estados no bloqueantes:

```txt
entregado
cancelado
```

Tipos de entrega no bloqueantes:

```txt
recoleccion en sucursal
```

Pedidos no existentes:

```txt
eliminados
```

Alcance del bloqueo:

```txt
El bloqueo aplica únicamente sobre la ventana operativa de 30 minutos que inicia en la hora de entrega seleccionada.
No bloquea el día completo.
No bloquea una hora completa.
No se interpreta como una ventana centrada antes y después de la hora seleccionada.
```

Esta política queda lista para ser utilizada como base funcional por las tareas de implementación del calendario operativo.