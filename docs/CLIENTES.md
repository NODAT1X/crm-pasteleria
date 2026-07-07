# Módulo de Clientes — Sprint 1

CRM / Sistema Web para Pastelería Nodatix.

Este documento resume las reglas de datos y de UI del módulo de clientes tal como
quedan al cierre del Sprint 1. Complementa la capa backend descrita en el código
(`src/server/repositories/clientes.repository.ts`,
`src/server/services/clientes.service.ts`, `src/modules/clientes/actions.ts`) y las
reglas de autorización de `docs/AUTORIZACION.md`.

## Baja lógica (soft-delete)

- **En el MVP / Sprint 1 NO existe borrado físico de clientes.** El código nunca
  ejecuta `delete` sobre la tabla `Cliente`.
- **"Desactivar cliente" significa `activo = false`.** La baja es lógica: el
  registro y toda su información se conservan en la base de datos.
- La desactivación se ejecuta con `updateMany` filtrando por
  `where: { id, pasteleria_id, activo: true }` y `data: { activo: false }`, de forma
  atómica. Si no afecta filas (cliente inexistente, de otro tenant o ya inactivo),
  la operación se trata como "no encontrado" y devuelve error controlado.

## Visibilidad en el listado

- **El listado principal (`/clientes`) muestra únicamente clientes con
  `activo = true`.** El filtro vive en el repositorio (`listClientes`), no en la UI.
- Un cliente desactivado desaparece del listado activo, pero sigue existiendo en la
  base de datos con `activo = false`.

## Restauración

- **La restauración (reactivar un cliente) queda fuera del alcance del MVP /
  Sprint 1.** No hay UI ni action para volver a poner `activo = true`.

## Multi-tenant y seguridad

- **El tenant (`pasteleria_id`) se deriva SIEMPRE desde la sesión** vía
  `requireAdminContext()` en la capa de actions. Nunca se acepta desde el frontend
  (props, body, query string ni headers).
- La UI solo puede pasar `cliente.id`; jamás pasa `pasteleriaId`.
- Todas las server actions de clientes exigen sesión de administrador válida a través
  de `requireAdminContext()` (redirige a `/login` si no la hay).
- Toda consulta al repositorio filtra por `pasteleria_id`, de modo que un tenant no
  puede leer ni modificar clientes de otra pastelería.

## Flujo de UI de desactivación (S1-011)

- El botón **"Desactivar cliente"** vive en la ficha del cliente
  (`/clientes/[id]`), dentro de la tarjeta de estado, y solo se muestra si el
  cliente está activo.
- Componente: `src/app/(dashboard)/clientes/_components/desactivar-cliente-button.tsx`
  (Client Component con `useTransition`).
- Antes de desactivar se pide **confirmación explícita** (`window.confirm()`), con un
  texto que aclara que el cliente dejará de aparecer en el listado principal, que no
  se elimina el registro y que la información se conserva.
- Al confirmar se llama a `deactivateClienteAction(id)`. Si `ok: true`, se redirige a
  `/clientes` y se refresca; si `ok: false`, se muestra el mensaje de error.
