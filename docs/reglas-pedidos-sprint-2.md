# Reglas funcionales de pedidos personalizados — Sprint 2

## Proyecto

CRM / Sistema Web para Pastelería Nodatix

## Sprint

Sprint 2 — Pedidos personalizados

## Issue relacionada

S2-001 — Reglas funcionales de pedidos personalizados

## Responsable funcional

Josué

---

# 1. Objetivo

Definir las reglas funcionales del Sprint 2 para el módulo de pedidos personalizados.

El objetivo del Sprint 2 es permitir que el administrador pueda registrar, consultar, editar y cambiar el estado de pedidos personalizados asociados a clientes activos.

Este sprint construye la base operativa de pedidos, pero no incluye pagos, calendario visual, WhatsApp, anticipos ni roles de empleado.

---

# 2. Decisiones funcionales aprobadas

| Decisión | Resultado |
|---|---|
| Estructura de datos | Se usará `pedido + pedido_items` |
| Estado inicial del pedido | Todo pedido inicia como `cotizacion` |
| Cliente asociado | Obligatorio |
| Cliente inactivo | No se puede usar para crear pedidos |
| Fecha de entrega | Obligatoria |
| Hora de entrega | Obligatoria |
| Items del pedido | Al menos un item obligatorio |
| Pagos | Fuera de Sprint 2 |
| Anticipos | Fuera de Sprint 2 |
| Calendario visual | Fuera de Sprint 2 |
| WhatsApp / seguimiento | Fuera de Sprint 2 |
| Roles de empleado | Fuera de Sprint 2 |

---

# 3. Regla principal del pedido

Todo pedido personalizado debe estar asociado a:

- Una pastelería.
- Un cliente activo.
- Una fecha de entrega.
- Una hora de entrega.
- Al menos un item del pedido.

El pedido no puede existir como registro válido si no tiene cliente o si no tiene items.

---

# 4. Asociación con cliente

## Regla

Un pedido debe asociarse obligatoriamente a un cliente existente y activo.

## Comportamiento esperado

- El administrador busca o selecciona un cliente existente.
- Si el cliente no existe, primero debe registrarse en el módulo de clientes.
- Si el cliente está desactivado, no puede usarse para crear un nuevo pedido.
- El sistema no debe aceptar `cliente_id` de otro tenant/pastelería.

## Fuera de alcance

- Crear clientes desde un modal avanzado dentro del pedido.
- Fusionar clientes duplicados.
- Reactivar clientes desde el flujo de pedidos.

---

# 5. Estructura funcional: pedido + pedido_items

## Pedido

El pedido representa la operación general: cliente, fecha, hora, tipo de entrega, estado, total y notas internas.

## Pedido items

Los `pedido_items` representan los productos o conceptos solicitados dentro del pedido.

Un pedido puede tener uno o varios items.

Ejemplos:

- Pastel personalizado.
- Cupcakes.
- Galletas decoradas.
- Mesa de postres.
- Producto especial sin catálogo.

---

# 6. Campos funcionales del pedido

| Campo | Obligatorio | Descripción |
|---|---|---|
| `pasteleria_id` | Sí | Se deriva desde la sesión del administrador. Nunca se recibe del frontend. |
| `cliente_id` | Sí | Cliente activo asociado al pedido. |
| `estado_pedido` | Sí | Estado actual del pedido. Inicia como `cotizacion`. |
| `fecha_entrega` | Sí | Fecha comprometida para entregar o recoger el pedido. |
| `hora_entrega` | Sí | Hora comprometida de entrega o recolección. |
| `tipo_entrega` | Sí | Tipo de entrega del pedido. |
| `direccion_entrega` | No | Dirección específica de entrega si aplica. |
| `total` | Sí | Total calculado del pedido. |
| `notas_internas` | No | Observaciones internas del pedido. |
| `created_at` | Sí | Fecha de creación. |
| `updated_at` | Sí | Fecha de última actualización. |

---

# 7. Tipo de entrega

Para Sprint 2 se permite capturar el tipo de entrega de forma básica.

Valores recomendados:

| Valor | Uso |
|---|---|
| `recoleccion` | El cliente recoge el pedido en la pastelería. |
| `domicilio` | La pastelería entrega el pedido al domicilio del cliente. |

## Regla

Si `tipo_entrega` es `domicilio`, se recomienda capturar `direccion_entrega`.

En Sprint 2, `direccion_entrega` puede ser opcional para no bloquear el flujo, pero debe quedar disponible para capturar información operativa.

---

# 8. Campos funcionales de pedido_items

| Campo | Obligatorio | Descripción |
|---|---|---|
| `pasteleria_id` | Sí | Se deriva desde sesión/tenant. Nunca desde frontend. |
| `pedido_id` | Sí | Pedido al que pertenece el item. |
| `producto_id` | No | Producto de catálogo si existe. Opcional en Sprint 2. |
| `nombre_snapshot` | Sí | Nombre del producto/concepto al momento de registrar el pedido. |
| `descripcion_snapshot` | No | Descripción o detalle personalizado del item. |
| `cantidad` | Sí | Cantidad solicitada. Debe ser mayor a 0. |
| `precio_unitario` | Sí | Precio unitario capturado al momento del pedido. |
| `subtotal` | Sí | Resultado de cantidad × precio unitario. |

---

# 9. Snapshot de item

## Regla

Cada `pedido_item` debe guardar snapshot de:

- Nombre.
- Descripción.
- Precio unitario.

## Motivo

El snapshot protege el historial del pedido.

Si en el futuro cambia el nombre, descripción o precio de un producto en catálogo, los pedidos antiguos deben conservar la información con la que fueron registrados.

## Ejemplo

Si hoy se registra:

- Nombre: Pastel tres leches personalizado.
- Descripción: Relleno de fresa, decoración azul, mensaje personalizado.
- Precio unitario: 650.

Ese pedido debe conservar esos datos aunque después el producto cambie de precio o descripción.

---

# 10. Total del pedido

## Regla

El total del pedido se calcula a partir de la suma de los subtotales de sus items.

```txt
total = suma de pedido_items.subtotal