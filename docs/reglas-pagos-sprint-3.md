# Reglas funcionales — Sprint 3: Pagos, saldo, devoluciones y retenciones

## Proyecto

CRM / Sistema Web para Pastelería Nodatix

## Sprint

Sprint 3 — Pagos + saldo

## Issues relacionadas

- S3-002 — Preparar documento base de reglas de pagos y saldo
- S3-011 — Actualizar reglas funcionales de pagos, saldo, devoluciones y retenciones

## Responsable funcional

J0SU3-52

## Estado del documento

Reglas confirmadas por el dueño de la pastelería.

Este documento ya no mantiene preguntas abiertas críticas para implementar Pagos + saldo en Sprint 3. Las decisiones pendientes documentadas corresponden a funcionalidades futuras o fuera del alcance del sprint actual.

---

# 1. Objetivo del módulo

Definir las reglas funcionales base para implementar el módulo de pagos y saldo en el CRM de pastelería.

El módulo debe permitir registrar pagos asociados a pedidos, calcular total pagado, calcular saldo pendiente, mostrar estado de pago, permitir abonos, manejar entrega con saldo pendiente y registrar cancelaciones con retención/devolución cuando existan pagos previos.

Este documento sirve como base funcional para las issues técnicas de la segunda parte del Sprint 3.

---

# 1.1 Actualización funcional S3-011

Esta actualización formaliza las reglas confirmadas por el dueño de la pastelería para implementar la segunda parte del Sprint 3.

Las reglas confirmadas son:

- El anticipo para confirmar pedido es del 50% del total.
- Los métodos de pago activos para el MVP son efectivo y transferencia.
- Tarjeta, terminal bancaria y Mercado Pago quedan para versión futura.
- Se aceptan abonos parciales, aunque son casos poco frecuentes.
- Las transferencias se registran con referencia o nota.
- La carga de captura/comprobante de transferencia queda fuera de Sprint 3.
- Un pedido puede entregarse con saldo pendiente, pero debe mostrar advertencia.
- Si un pedido se cancela y ya tenía anticipo, la pastelería retiene el 25% del anticipo pagado.
- El resto del anticipo se devuelve al cliente.
- El costo de envío se maneja como concepto/item adicional del pedido.
- Los límites de capacidad quedan para Sprint 4 / Calendario operativo.

Con esta actualización, el documento funciona como contrato funcional para las issues técnicas de pagos, saldo, historial financiero, anulación, entrega con saldo pendiente y cancelación con retención/devolución.

---

# 2. Contexto operativo confirmado

La pastelería trabaja principalmente con pedidos personalizados y pedidos de línea.

Para pagos:

- Se solicita anticipo para confirmar pedidos.
- El anticipo estándar es del 50%.
- Aceptan pagos en efectivo y transferencia bancaria.
- Los abonos parciales existen, pero son casos poco frecuentes.
- Normalmente los pedidos se pagan en uno o dos movimientos.
- El dueño de la pastelería registra o confirma los pagos.
- En transferencias, se guarda referencia o nota. La carga de captura queda para futuro.
- La entrega con saldo pendiente sí puede ocurrir, especialmente en pedidos grandes.
- En cancelaciones con anticipo, la pastelería retiene el 25% del anticipo y devuelve el resto al cliente.

---

# 3. Alcance funcional del Sprint 3

## Incluido

- Registrar pagos asociados a un pedido.
- Registrar anticipos.
- Registrar abonos.
- Registrar liquidaciones.
- Registrar método de pago.
- Registrar referencia o nota de transferencia.
- Calcular total pagado.
- Calcular saldo pendiente.
- Mostrar estado de pago derivado.
- Mostrar historial de movimientos financieros del pedido.
- Permitir anulación segura de movimientos registrados por error.
- Permitir entrega con saldo pendiente mostrando advertencia.
- Manejar cancelación de pedido con retención y devolución cuando existan pagos.
- Mantener todas las operaciones filtradas por `pasteleria_id` derivado de sesión.

## Fuera de alcance

- Pagos en línea.
- Integración con Mercado Pago.
- Terminal bancaria.
- Pago con tarjeta.
- Facturación.
- CFDI.
- Carga de comprobantes o capturas de transferencia.
- Automatización bancaria.
- Calendario operativo.
- WhatsApp.
- Inventario.
- Reportes financieros avanzados.
- Roles de empleado.
- Conciliación contable avanzada.

---

# 4. Principios funcionales

## 4.1 Pagos como movimientos financieros

Los pagos no deben manejarse como un solo campo dentro del pedido.

Cada operación financiera debe registrarse como un movimiento asociado al pedido.

Tipos de movimiento recomendados:

| Tipo de movimiento | Descripción | Efecto funcional |
|---|---|---|
| `pago` | Dinero recibido del cliente | Suma a total pagado |
| `devolucion` | Dinero devuelto al cliente | Registra salida de dinero |
| `retencion` | Monto conservado por la pastelería en cancelación | Registra monto retenido |
| `anulacion` | Corrección de un movimiento capturado por error | Invalida o revierte el movimiento original |

Nombre técnico sugerido:

```txt
movimientos_financieros
```

También puede usarse `pagos` si se decide mantener un nombre más simple, siempre que el modelo soporte pagos, devoluciones, retenciones y anulaciones.

---

## 4.2 Total pagado derivado

El total pagado no debe capturarse manualmente.

Debe calcularse con base en los movimientos válidos del pedido.

Regla base:

```txt
total_pagado = suma de pagos aplicados
```

Las devoluciones y retenciones deben mostrarse en historial, pero no deben confundirse con el total original del pedido.

---

## 4.3 Saldo pendiente derivado

El saldo pendiente no debe capturarse manualmente.

Debe calcularse así:

```txt
saldo_pendiente = total_pedido - total_pagado
```

Si el total pagado es igual al total del pedido, el saldo pendiente es 0.

No se deben permitir saldos negativos en el flujo normal.

---

## 4.4 Estado de pago derivado

El estado de pago debe derivarse del total del pedido y del total pagado.

| Estado de pago | Regla |
|---|---|
| `sin_pago` | total_pagado = 0 |
| `parcial` | total_pagado > 0 y total_pagado < total_pedido |
| `pagado` | total_pagado >= total_pedido |
| `saldo_pendiente` | pedido entregado con saldo pendiente |
| `cancelado_con_movimientos` | pedido cancelado con pagos, retención o devolución registrada |

El estado de pago no debe editarse manualmente desde UI.

---

# 5. Reglas de anticipo

## 5.1 Anticipo estándar

La pastelería solicita anticipo del 50% para confirmar pedidos.

Regla:

```txt
anticipo_requerido = total_pedido * 0.50
```

## 5.2 Confirmación de pedido

Para pasar un pedido de `cotizacion` a `confirmado`, el sistema debe validar si el pedido cumple el anticipo requerido.

Regla recomendada:

| Caso | Resultado |
|---|---|
| Pedido sin pago | No debe confirmarse sin advertencia o bloqueo |
| Pedido con pago menor al 50% | No debe confirmarse, salvo decisión manual futura |
| Pedido con pago igual o mayor al 50% | Puede confirmarse |
| Pedido pagado completo | Puede confirmarse |

Para Sprint 3, la regla recomendada es bloquear confirmación si no se cumple el anticipo mínimo del 50%.

---

# 6. Métodos de pago

## 6.1 Métodos activos en Sprint 3

| Método | Estado |
|---|---|
| `efectivo` | Activo |
| `transferencia` | Activo |

## 6.2 Métodos futuros

| Método | Estado |
|---|---|
| `tarjeta` | Futuro |
| `mercado_pago` | Futuro |

No deben mostrarse métodos futuros como opciones activas en Sprint 3.

---

# 7. Transferencias

Para transferencias, el sistema debe permitir capturar:

| Campo | Obligatorio | Comentario |
|---|---|---|
| Método de pago | Sí | Debe ser `transferencia` |
| Monto | Sí | Mayor a 0 |
| Referencia | Opcional / recomendado | Número, folio o texto de referencia |
| Nota | Opcional / recomendado | Comentario operativo |
| Captura/comprobante | No | Fuera de Sprint 3 |

La carga de captura de pantalla o comprobante queda para una versión futura.

---

# 8. Abonos y liquidaciones

La pastelería acepta abonos parciales, aunque son casos poco frecuentes.

El sistema debe permitir múltiples pagos asociados al mismo pedido.

Tipos de pago recomendados:

| Tipo | Descripción |
|---|---|
| `anticipo` | Primer pago usado para confirmar pedido |
| `abono` | Pago parcial posterior |
| `liquidacion` | Pago final que cubre el saldo restante |

Reglas:

- Todo pago debe tener monto mayor a 0.
- Todo pago debe estar asociado a un pedido.
- Todo pago debe pertenecer al mismo `pasteleria_id` del pedido.
- No se debe aceptar `pasteleria_id` desde el frontend.
- El sistema debe derivar `pasteleria_id` desde sesión.
- No se debe permitir registrar un pago que exceda el saldo pendiente en flujo normal.

---

# 9. Sobrepagos

Para Sprint 3, los sobrepagos quedan fuera del flujo normal.

Regla:

```txt
No permitir registrar pagos mayores al saldo pendiente.
```

Si ocurre un caso real de sobrepago, debe resolverse manualmente ajustando el pedido, anulando el pago incorrecto o registrando la operación con apoyo del responsable.

---

# 10. Anulación de pagos

Los pagos aplicados no deben editarse directamente.

Si hubo error de captura, se debe anular el movimiento y registrar uno nuevo.

Reglas:

- Un movimiento aplicado puede ser anulado.
- Un movimiento anulado no suma al total pagado.
- El sistema debe conservar historial del movimiento anulado.
- La anulación debe requerir confirmación.
- La anulación debe permitir una nota o motivo.
- No se deben borrar movimientos financieros físicamente desde la UI.

---

# 11. Entrega con saldo pendiente

La pastelería permite entregar pedidos con saldo pendiente, principalmente cuando son pedidos grandes y ya tienen anticipo registrado.

Regla para Sprint 3:

| Caso | Resultado |
|---|---|
| Pedido pagado completo | Puede marcarse como entregado |
| Pedido con saldo pendiente | Puede marcarse como entregado, pero debe mostrar advertencia |
| Pedido sin ningún pago | Debe advertir claramente antes de entregar |

La advertencia debe indicar que el pedido será marcado como entregado aunque aún tiene saldo pendiente.

Texto sugerido:

```txt
Este pedido aún tiene saldo pendiente. ¿Deseas marcarlo como entregado de todos modos?
```

Si se confirma, el pedido puede quedar en estado `entregado`, pero el estado de pago debe seguir mostrando `saldo_pendiente` o equivalente.

---

# 12. Cancelación con pagos registrados

Cuando un pedido se cancela y ya tenía anticipo, la pastelería retiene el 25% del anticipo pagado y devuelve el resto al cliente.

## 12.1 Regla de retención

```txt
retencion = anticipo_pagado * 0.25
```

## 12.2 Regla de devolución

```txt
devolucion = anticipo_pagado - retencion
```

## 12.3 Ejemplo

| Concepto | Monto |
|---|---:|
| Anticipo pagado | $500.00 |
| Retención 25% del anticipo | $125.00 |
| Devolución al cliente | $375.00 |

## 12.4 Flujo funcional recomendado

Al cancelar un pedido con pagos registrados:

1. El sistema detecta que el pedido tiene pagos aplicados.
2. El sistema calcula la retención sugerida.
3. El sistema calcula la devolución sugerida.
4. El sistema muestra resumen al usuario.
5. El usuario confirma la cancelación.
6. El sistema registra movimiento de retención.
7. El sistema registra movimiento de devolución.
8. El pedido queda en estado `cancelado`.
9. El historial financiero muestra pago original, retención y devolución.

## 12.5 Restricciones

- No se debe cancelar silenciosamente un pedido con pagos.
- No se deben borrar pagos previos.
- No se deben editar pagos previos.
- La retención y devolución deben quedar visibles en el historial financiero.
- La devolución no implica integración bancaria; solo registro interno.

---

# 13. Edición de pedido con pagos existentes

Cuando un pedido ya tiene pagos registrados, editar el total puede afectar saldo y reglas de pago.

Reglas recomendadas para Sprint 3:

| Caso | Regla |
|---|---|
| Pedido sin pagos | Se puede editar normalmente si no está en estado final |
| Pedido con pagos y nuevo total mayor o igual al total pagado | Se puede editar y recalcular saldo |
| Pedido con pagos y nuevo total menor al total pagado | Debe bloquearse o requerir anulación/devolución previa |
| Pedido entregado | No editable |
| Pedido cancelado | No editable |

Regla principal:

```txt
No permitir que una edición deje el total del pedido por debajo del total pagado.
```

---

# 14. Costo de envío

Cuando exista entrega a domicilio, el costo de envío se suma como un concepto más del pedido.

Regla:

```txt
El envío debe capturarse como item/concepto del pedido.
```

Ejemplo:

| Concepto | Cantidad | Precio |
|---|---:|---:|
| Envío a domicilio | 1 | $80.00 |

No se creará lógica especial de envío en Sprint 3.

---

# 15. Capacidad y límites de pedidos

La pastelería tiene límites operativos de capacidad.

Reglas conocidas:

- Aceptan aproximadamente 5 pedidos personalizados por día.
- Pueden entregar máximo 5 pedidos por horario.
- El máximo operativo diario es de aproximadamente 2500 personas.
- Cuando se alcanza el límite máximo, no deben aceptarse nuevos pedidos.

Sin embargo, la implementación de bloqueo por capacidad queda fuera del Sprint 3.

Esta regla se documenta para Sprint 4 — Calendario operativo y capacidad.

---

# 16. Seguridad y multi-tenant

Todas las operaciones de pagos deben respetar multi-tenant.

Reglas:

- Nunca aceptar `pasteleria_id` desde UI.
- Nunca aceptar `pasteleria_id` desde query params.
- Nunca aceptar `pasteleria_id` desde body de formularios.
- Derivar `pasteleria_id` desde sesión usando `requireAdminContext()`.
- Validar que el pedido pertenezca al `pasteleria_id` actual.
- Validar que el movimiento financiero pertenezca al mismo `pasteleria_id`.
- Filtrar toda consulta por `pasteleria_id`.

---

# 17. Reglas técnicas base

## 17.1 Decimal

Los montos deben manejarse como `Decimal`, no como `Float`.

## 17.2 Backend como fuente de verdad

El frontend puede mostrar cálculos visuales, pero el backend debe ser la fuente de verdad para:

- total pagado
- saldo pendiente
- estado de pago
- validación de anticipo
- validación de sobrepago
- retención
- devolución

## 17.3 Transacciones

Las operaciones críticas deben ejecutarse en transacción:

- Registrar pago.
- Anular pago.
- Cancelar pedido con retención/devolución.
- Editar pedido con pagos existentes.
- Cambiar estado a entregado con saldo pendiente.

---

# 18. Reglas confirmadas

| Regla | Estado |
|---|---|
| Anticipo del 50% | Confirmada |
| Abonos parciales permitidos | Confirmada |
| Métodos efectivo y transferencia | Confirmada |
| Tarjeta y Mercado Pago fuera del MVP actual | Confirmada |
| Entrega con saldo pendiente permitida con advertencia | Confirmada |
| Retención del 25% del anticipo en cancelación | Confirmada |
| Devolución del resto al cliente | Confirmada |
| Transferencia con referencia/nota | Confirmada |
| Captura de comprobante fuera de Sprint 3 | Confirmada |
| Envío como concepto adicional del pedido | Confirmada |
| Bloqueo por capacidad queda para Sprint 4 | Confirmada como regla futura |

---

# 19. Preguntas cerradas

| Pregunta | Respuesta |
|---|---|
| ¿Piden anticipo para confirmar pedido? | Sí, 50% |
| ¿Aceptan abonos parciales? | Sí, aunque son casos contados |
| ¿Qué métodos de pago manejan? | Efectivo y transferencia |
| ¿Permiten entregar con saldo pendiente? | Sí, con advertencia |
| ¿Qué pasa si cancelan con anticipo? | Retienen 25% del anticipo |
| ¿Qué pasa con el resto del anticipo? | Se devuelve al cliente |
| ¿Guardan referencia de transferencia? | Sí, referencia o nota; captura queda futuro |
| ¿Quién confirma pagos? | Dueño de la pastelería |
| ¿El envío se suma al total? | Sí, como concepto adicional |
| ¿Al llegar a capacidad máxima se bloquea? | Sí, pero se implementa en Sprint 4 |

---

# 20. Decisiones pendientes para futuro

Estas decisiones no bloquean Sprint 3:

| Tema | Sprint sugerido |
|---|---|
| Carga de comprobantes de transferencia | Futuro |
| Mercado Pago | Futuro |
| Tarjeta / terminal | Futuro |
| Facturación | Futuro |
| Bloqueo automático por capacidad | Sprint 4 |
| Calendario visual | Sprint 4 |
| WhatsApp | Sprint posterior |
| Reportes financieros avanzados | Futuro |
| Roles de empleado | Futuro |

---

# 21. Resultado funcional

Las reglas funcionales base del módulo Pagos + saldo quedan confirmadas.

El Sprint 3 puede continuar con las issues técnicas de pagos, saldo, historial financiero, anulación, entrega con saldo pendiente y cancelación con retención/devolución.