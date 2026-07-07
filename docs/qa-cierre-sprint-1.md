# QA funcional y cierre — Sprint 1

## Proyecto

CRM / Sistema Web para Pastelería Nodatix

## Sprint

Sprint 1 — Clientes + autenticación base de administrador

## Issue relacionada

Issue S1-012 — QA funcional y cierre Sprint 1

## Responsable funcional

Josué

## Objetivo

Validar el flujo completo del Sprint 1 desde la perspectiva funcional:

- Login de administrador.
- Logout.
- Acceso privado.
- CRUD de clientes.
- Búsqueda por nombre y teléfono.
- Edición de cliente.
- Ficha de cliente.
- Historial vacío preparado.
- Desactivación lógica de cliente.

Esta validación define si el Sprint 2 puede iniciar o si existen bugs bloqueantes que deben resolverse antes.

---

# 1. Alcance de validación

## Incluido

- Probar login de administrador.
- Probar logout.
- Probar protección de rutas privadas.
- Crear cliente de prueba.
- Buscar cliente por nombre.
- Buscar cliente por teléfono.
- Editar cliente.
- Ver ficha de cliente.
- Validar historial vacío.
- Desactivar cliente.
- Registrar bugs o pendientes.
- Emitir resultado Go/No-Go para Sprint 2.

## Fuera de alcance

- Validar pedidos.
- Validar pagos.
- Validar calendario.
- Validar WhatsApp.
- Pruebas de carga.
- Auditoría completa de seguridad.
- Aprobar UX final de todo el sistema.

---

# 2. Datos de prueba sugeridos

## Usuario administrador

Usar el usuario administrador configurado para el entorno de prueba.

No documentar contraseñas reales en este archivo.

## Cliente de prueba

| Campo | Valor sugerido |
|---|---|
| Nombre | Cliente Prueba Sprint 1 |
| Teléfono | 2381234567 |
| WhatsApp | 2381234567 |
| Email | cliente.prueba@nodatix.test |
| Dirección | Dirección de prueba |
| Notas | Cliente creado para validación funcional del Sprint 1 |

---

# 3. Checklist funcional

## 3.1 Login y acceso privado

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Acceder a pantalla de login | Pendiente |  |
| Iniciar sesión con usuario admin válido | Pendiente |  |
| Redirigir correctamente al área privada | Pendiente |  |
| Bloquear acceso a rutas privadas sin sesión | Pendiente |  |
| Cerrar sesión correctamente | Pendiente |  |
| Después de logout, impedir acceso privado | Pendiente |  |

## 3.2 Clientes — creación

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Abrir módulo de clientes | Pendiente |  |
| Abrir formulario de nuevo cliente | Pendiente |  |
| Crear cliente con nombre y teléfono | Pendiente |  |
| Guardar campos opcionales si se capturan | Pendiente |  |
| Mostrar cliente en listado después de crear | Pendiente |  |
| Validar que cliente inicia activo | Pendiente |  |

## 3.3 Clientes — búsqueda

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Buscar cliente por nombre completo | Pendiente |  |
| Buscar cliente por coincidencia parcial de nombre | Pendiente |  |
| Buscar cliente por teléfono | Pendiente |  |
| Mostrar resultados correctos | Pendiente |  |
| No romper listado cuando no hay resultados | Pendiente |  |

## 3.4 Clientes — edición

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Abrir edición de cliente existente | Pendiente |  |
| Editar nombre o teléfono | Pendiente |  |
| Editar campos opcionales | Pendiente |  |
| Guardar cambios correctamente | Pendiente |  |
| Ver cambios reflejados en listado | Pendiente |  |
| Ver cambios reflejados en ficha | Pendiente |  |

## 3.5 Ficha de cliente

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Abrir ficha de cliente existente | Pendiente |  |
| Mostrar datos generales correctos | Pendiente |  |
| Mostrar estado activo/inactivo | Pendiente |  |
| Mostrar notas si existen | Pendiente |  |
| Mostrar acción para volver al listado | Pendiente |  |
| Mostrar acción de edición si aplica | Pendiente |  |

## 3.6 Historial vacío

| Prueba | Resultado | Evidencia / notas |
|---|---|---|
| Mostrar sección “Historial de pedidos” | Pendiente |  |
| Mostrar estado vacío cuando no hay pedidos | Pendiente |  |
| Texto base mostrado correctamente | Pendiente |  |
| No mostrar pedidos falsos o datos simulados | Pendiente |  |
| La sección queda preparada para Sprint 2 | Pendiente |  |

Texto esperado:

```txt
Este cliente aún no tiene pedidos registrados.