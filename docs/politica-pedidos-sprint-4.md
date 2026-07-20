# S4-004 — Política MVP de eliminación, cancelación y ocultamiento de pedidos

## Información general

| Campo | Detalle |
|---|---|
| Issue | S4-004 |
| Responsable principal | J0SU3-52 |
| Apoyo | miguelazaro, brayan3521110695 |
| Tipo | docs / product |
| Área | docs / qa |
| Prioridad | high |
| Rama sugerida | `docs/s4-004-politica-eliminacion-cancelacion-archivo` |
| Documento | `docs/politica-pedidos-sprint-4.md` |
| Estado del documento | Política funcional MVP reajustada |
| Relación directa | S4-005: acción visible de eliminar pedidos en listado |

---

## Objetivo

Definir una política funcional práctica para Sprint 4 que permita implementar urgentemente la acción visible de **eliminar pedidos** desde el listado, sin confundirla con la cancelación operativa de pedidos reales.

El objetivo principal de esta política es que el CRM permita limpiar pedidos de prueba, capturas erróneas o pedidos que el administrador ya no necesita ver, especialmente durante la etapa MVP y validación con la pastelería.

---

## Decisión principal de Sprint 4

Para Sprint 4, la acción **Eliminar pedido** sí debe existir en la vista de listado de pedidos.

Esta acción será parte necesaria del MVP porque:

- El equipo necesita eliminar pedidos de prueba o ejemplo.
- El dueño del negocio necesitará corregir capturas equivocadas.
- El CRM todavía no tiene reportes financieros formales, cortes contables, dashboards históricos o auditoría avanzada.
- El alcance actual prioriza operación básica y facilidad de uso.
- La acción debe estar disponible de forma clara, pero protegida con confirmación.

---

## Contexto funcional actual

El sistema ya maneja estados de pedido:

- `cotizacion`
- `confirmado`
- `en_preparacion`
- `listo_para_entregar`
- `entregado`
- `cancelado`

También maneja movimientos financieros asociados al pedido:

- pagos
- devoluciones
- retenciones
- movimientos aplicados
- movimientos anulados

Por eso, eliminar un pedido debe entenderse como una acción administrativa sensible, pero no debe bloquearse completamente en esta etapa MVP.

---

# 1. Diferencia entre eliminar y cancelar

## Eliminar pedido

Eliminar significa quitar un pedido del sistema y del flujo visible de operación.

Para Sprint 4, eliminar se usará principalmente para:

- Pedidos de prueba.
- Pedidos creados como ejemplo.
- Pedidos capturados por error.
- Pedidos duplicados.
- Pedidos que el administrador decide retirar del sistema durante operación MVP.

La eliminación debe ser clara, directa y visible desde el listado de pedidos.

## Cancelar pedido

Cancelar significa que el pedido sí existió como intención real de venta, pero ya no se realizará.

Se debe cancelar cuando:

- El cliente pidió el pastel o producto y después se arrepintió.
- El pedido ya tenía seguimiento real.
- El pedido ya tenía anticipo o abonos y se necesita manejar retención/devolución.
- Se quiere conservar el historial de que el pedido existió, pero no se completó.

Cancelar no debe sustituir a eliminar cuando el pedido solo fue una prueba, un error o un duplicado.

---

# 2. Política MVP de eliminación

## 2.1 Regla base

El botón **Eliminar** debe estar disponible en el listado de pedidos.

Antes de eliminar, el sistema debe mostrar una confirmación clara para evitar borrados accidentales.

## 2.2 Pedidos sin movimientos financieros

Los pedidos sin movimientos financieros pueden eliminarse de forma directa con confirmación.

Aplica para pedidos en estados:

- `cotizacion`
- `confirmado`
- `en_preparacion`
- `listo_para_entregar`
- `cancelado`
- `entregado`

### Decisión

Si no existen pagos, abonos, liquidaciones, devoluciones, retenciones ni movimientos anulados asociados, se permite eliminar el pedido.

### Motivo

En el MVP, un pedido sin movimientos financieros no tiene impacto monetario registrado. Si fue prueba, error o duplicado, debe poder eliminarse sin fricción excesiva.

---

## 2.3 Pedidos con movimientos financieros

Los pedidos con movimientos financieros también pueden eliminarse en Sprint 4, pero deben tratarse como eliminación sensible.

### Decisión MVP

Se permite eliminar pedidos con movimientos financieros, siempre que:

- El usuario administrador confirme explícitamente.
- El mensaje advierta que se eliminará también el historial financiero asociado al pedido.
- La eliminación se haga de forma completa y consistente.
- No queden movimientos financieros huérfanos.
- No se eliminen solo partes del pedido.

### Motivo

Aunque en una versión más madura convendría conservar trazabilidad financiera, en esta etapa el CRM todavía no contempla reportes contables formales, cortes financieros ni auditoría avanzada.

El uso actual necesita flexibilidad para limpiar pedidos de prueba o capturas equivocadas, incluso si durante pruebas se registraron anticipos, abonos o liquidaciones.

### Restricción funcional importante

Si se elimina un pedido con movimientos financieros, debe eliminarse como una unidad completa:

- Pedido.
- Items del pedido.
- Movimientos financieros relacionados.

No debe quedar historial financiero suelto sin pedido asociado.

---

## 2.4 Pedidos entregados o cancelados

Para Sprint 4, también se permite eliminar pedidos en estado final si el administrador lo confirma.

Estados finales:

- `entregado`
- `cancelado`

### Decisión MVP

Se permite eliminar pedidos entregados o cancelados cuando el administrador decida limpiar registros de prueba o pedidos que no deben permanecer visibles.

### Motivo

El CRM todavía está en etapa MVP y validación. El dueño puede necesitar limpiar registros sin depender todavía de una función de archivo formal.

---

# 3. Política de cancelación

## 3.1 Cuándo cancelar

Se debe usar **Cancelar** cuando el pedido sí representa una operación real del negocio que ya no se realizará.

Ejemplos:

- El cliente canceló el pedido.
- El pedido ya tenía anticipo.
- El pedido ya estaba confirmado.
- El pedido ya estaba en preparación.
- Se necesita registrar retención o devolución.
- Se quiere conservar historial operativo.

## 3.2 Pedidos sin pagos

Si el pedido no tiene pagos, puede cancelarse sin registrar retención ni devolución.

La cancelación debe:

- Cambiar el estado a `cancelado`.
- Conservar el pedido.
- Conservar la información del cliente y productos.
- Liberar disponibilidad de horario si era entrega a domicilio.

## 3.3 Pedidos con pagos

Si el pedido tiene pagos, debe usarse el flujo de cancelación financiera.

La cancelación debe:

- Calcular retención.
- Calcular devolución.
- Registrar los movimientos financieros correspondientes.
- Cambiar el pedido a `cancelado`.
- Conservar historial.

## 3.4 Regla actual de retención/devolución

Para pedidos con anticipo o pagos aplicados:

- Retención: 25% del anticipo aplicado.
- Devolución: total recibido menos retención.
- El historial debe conservar el pago original, la retención y la devolución.

---

# 4. Archivo y ocultamiento

## 4.1 Archivo

Para Sprint 4, **archivo no es prioridad**.

La acción urgente es eliminar pedidos desde el listado.

Archivar puede retomarse en una fase posterior si el equipo decide conservar pedidos históricos sin mostrarlos en la vista principal.

## 4.2 Ocultar del flujo operativo

Ocultar puede resolverse temporalmente mediante filtros por estado.

Por ejemplo, la vista principal puede permitir filtrar por:

- Activos.
- Cancelados.
- Entregados.
- Todos.

Pero ocultar no debe bloquear la implementación del botón eliminar.

---

# 5. Disponibilidad de horarios

## Decisión funcional

Los pedidos cancelados o eliminados deben liberar disponibilidad de horario.

Esto aplica especialmente para entregas a domicilio.

## Pedidos que bloquean disponibilidad

Deben bloquear disponibilidad los pedidos que cumplan:

- Tipo de entrega: `domicilio`.
- Estado activo.
- No cancelado.
- No eliminado.
- Fecha y hora vigentes.

Estados que bloquean disponibilidad:

- `cotizacion`
- `confirmado`
- `en_preparacion`
- `listo_para_entregar`

## Pedidos que no bloquean disponibilidad

No deben bloquear disponibilidad:

- Pedidos `cancelado`.
- Pedidos eliminados.
- Pedidos de tipo `recoleccion`.

## Ventana de bloqueo para domicilio

Cuando un pedido es de entrega a domicilio, debe bloquear una ventana operativa de 30 minutos.

Ejemplo:

| Pedido | Fecha | Hora | Tipo de entrega | Ventana bloqueada |
|---|---|---:|---|---|
| Pedido A | 26 de julio | 2:00 pm | domicilio | 2:00 pm a 2:30 pm |

Durante esa ventana no debe permitirse otro pedido de entrega a domicilio en la misma fecha y horario.

Después de los 30 minutos, puede permitirse otro horario.

## Recolección en sucursal

Los pedidos con tipo de entrega `recoleccion` sí pueden compartir el mismo horario.

Motivo:

- No ocupan ruta de entrega.
- No bloquean al repartidor.
- Pueden ser recogidos por varios clientes en horarios cercanos.

---

# 6. Tabla de decisiones

| Caso | Acción permitida | Confirmación | Decisión |
|---|---|---|---|
| Pedido de prueba sin pagos | Eliminar | Sí | Permitido. |
| Pedido duplicado sin pagos | Eliminar | Sí | Permitido. |
| Pedido en `cotizacion` sin pagos | Eliminar o cancelar | Sí | Eliminar si fue error; cancelar si fue operación real. |
| Pedido confirmado sin pagos | Eliminar o cancelar | Sí | Permitido eliminar en MVP, pero cancelar si fue pedido real. |
| Pedido con anticipo | Eliminar o cancelar | Confirmación fuerte | Cancelar si fue operación real; eliminar si fue prueba/error. |
| Pedido con abonos | Eliminar o cancelar | Confirmación fuerte | Cancelar si fue operación real; eliminar si fue prueba/error. |
| Pedido liquidado | Eliminar | Confirmación fuerte | Permitido en MVP si el administrador lo decide. |
| Pedido cancelado | Eliminar | Sí | Permitido para limpieza de registros. |
| Pedido entregado | Eliminar | Confirmación fuerte | Permitido en MVP si el administrador lo decide. |
| Pedido con movimientos anulados | Eliminar | Confirmación fuerte | Permitido si se elimina de forma completa y consistente. |

---

# 7. Mensajes sugeridos

## 7.1 Confirmación para pedido sin movimientos financieros

```txt
¿Seguro que deseas eliminar este pedido?

El pedido no tiene pagos ni movimientos financieros registrados. Esta acción eliminará el pedido del sistema.
```

## 7.2 Confirmación para pedido con movimientos financieros

```txt
Este pedido tiene pagos o movimientos financieros registrados.

Si lo eliminas, también se eliminará el historial financiero asociado a este pedido. Usa esta acción solo si se trata de un pedido de prueba, duplicado o capturado por error.

¿Deseas eliminarlo definitivamente?
```

## 7.3 Confirmación para pedido entregado

```txt
Este pedido ya fue entregado.

Eliminarlo quitará el registro del sistema. Usa esta acción solo si fue un pedido de prueba o si el administrador decidió retirarlo del CRM.

¿Deseas continuar?
```

## 7.4 Confirmación para pedido cancelado

```txt
Este pedido está cancelado.

Eliminarlo quitará el registro del sistema y liberará cualquier referencia operativa visible.

¿Deseas continuar?
```

## 7.5 Mensaje de éxito

```txt
Pedido eliminado correctamente.
```

## 7.6 Mensaje de error

```txt
No se pudo eliminar el pedido. Inténtalo nuevamente o revisa si el pedido todavía tiene información relacionada.
```

---

# 8. Requisitos mínimos para S4-005

La implementación de S4-005 debe considerar:

- Botón visible de eliminar en el listado de pedidos.
- Confirmación antes de eliminar.
- Mensaje diferente si el pedido tiene movimientos financieros.
- Eliminación consistente de pedido, items y movimientos relacionados.
- Revalidación del listado después de eliminar.
- Manejo de error entendible.
- No dejar movimientos financieros huérfanos.
- No modificar pagos existentes de otros pedidos.
- No afectar clientes.

---

# 9. Decisiones que quedan fuera de S4-004

Esta política no implementa:

- Código del botón eliminar.
- Cambios de base de datos.
- Reportes financieros.
- Auditoría avanzada.
- Archivo persistente.
- Soft delete.
- Calendario completo.
- Dashboard financiero.
- Historial contable formal.

---

# 10. Comentario de aprobación funcional sugerido

```txt
Se revisó y aprueba la política MVP de eliminación, cancelación y ocultamiento de pedidos para Sprint 4.

Decisiones principales:
- El botón Eliminar sí debe existir en el listado de pedidos.
- En Sprint 4 se permitirá eliminar pedidos como acción administrativa del MVP.
- Los pedidos sin movimientos financieros podrán eliminarse con confirmación simple.
- Los pedidos con movimientos financieros podrán eliminarse con confirmación fuerte, eliminando el pedido como unidad completa junto con sus items y movimientos relacionados.
- Cancelar se usará cuando el pedido fue una operación real que ya no se realizará.
- Los pedidos cancelados o eliminados liberan disponibilidad de horario.
- Las entregas a domicilio bloquean una ventana de 30 minutos.
- Los pedidos de recolección pueden compartir horario.
- Archivo/soft delete queda fuera de alcance por ahora.

Esta política queda como base funcional para implementar S4-005.
```

---

# 11. Veredicto

**Resultado:** Política reajustada y lista para revisión del equipo.

S4-004 puede cerrarse cuando el equipo apruebe esta política como base para implementar el botón visible de eliminar pedidos en S4-005.