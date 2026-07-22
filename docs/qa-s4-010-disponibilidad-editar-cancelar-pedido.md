# QA S4-010 — Disponibilidad al editar o cancelar pedidos con horario reservado

- **Issue:** #159 — S4-010
- **Rama:** `feature/s4-010-disponibilidad-editar-cancelar-pedido`
- **Rama base:** `develop`
- **Tipo de cierre:** auditoría funcional + QA documental (sin cambios de lógica)
- **Documento base:** [`docs/reglas-disponibilidad-calendario-sprint-4.md`](./reglas-disponibilidad-calendario-sprint-4.md)

---

## 1. Objetivo de S4-010

Aplicar correctamente las reglas de disponibilidad cuando un pedido cambia su
fecha, hora, tipo de entrega o estado operativo. La disponibilidad debe
recalcularse cuando un pedido:

- deja de bloquear;
- empieza a bloquear;
- cambia la ventana que bloquea.

---

## 2. Conclusión de la auditoría

**Las 7 reglas obligatorias de S4-010 ya están completamente implementadas por
S4-008 (regla backend de la ventana de 30 minutos) y S4-005 (eliminación por
hard delete). No existen huecos funcionales y no se requieren cambios de código.**

El cierre de S4-010 es, por tanto, una **verificación**: se confirma que los
flujos de edición y cancelación interactúan correctamente con la regla de
disponibilidad ya construida, y se documentan las evidencias.

> **Nota clave — disponibilidad en vivo:** la disponibilidad NO se almacena. Se
> calcula en el momento (create / edit / consulta) a partir del estado actual de
> la base de datos, mediante `findBloqueosDomicilioPorFecha` +
> `detectarConflictoDomicilio`. **No existe una "reserva" persistida que haya que
> liberar manualmente.** Cuando un pedido deja de bloquear (cambia a recolección,
> se cancela, se entrega o se elimina), simplemente deja de aparecer en la
> siguiente consulta de disponibilidad. Cuando empieza a bloquear o cambia su
> ventana, la nueva situación se evalúa en la siguiente consulta. El "recálculo"
> es intrínseco al diseño.

---

## 3. Reglas obligatorias validadas

| # | Regla | ¿Cubierta? | Dónde se aplica |
|---|---|---|---|
| 1 | Domicilio que cambia fecha u hora valida que la nueva ventana no se empalme | ✅ | `updatePedidoService` calcula fecha/hora **efectivas** y llama `assertDisponibilidadEntrega` |
| 2 | Domicilio → recolección deja de bloquear | ✅ | Tipo efectivo `recoleccion` ⇒ `assertDisponibilidadEntrega` retorna temprano; y al persistirse, el filtro `tipo_entrega = domicilio` lo excluye de futuras consultas |
| 3 | Recolección → domicilio valida disponibilidad para la fecha/hora seleccionadas | ✅ | Tipo efectivo `domicilio` ⇒ se evalúa la ventana de 30 min |
| 4 | Pedido cancelado deja de bloquear | ✅ | `estado = cancelado` no está en los estados activos ⇒ excluido por el filtro del repositorio |
| 5 | Pedido entregado no bloquea | ✅ | `estado = entregado` no está en los estados activos ⇒ excluido por el filtro del repositorio |
| 6 | Pedido eliminado no participa (ya no existe) | ✅ | Hard delete de S4-005: la fila no existe en la tabla |
| 7 | Al editar, la consulta excluye el propio pedido (evita falso conflicto) | ✅ | `excludePedidoId` en `assertDisponibilidadEntrega` / `findBloqueosDomicilioPorFecha` |

Estados que bloquean disponibilidad (solo para `tipo_entrega = domicilio`):
`cotizacion`, `confirmado`, `en_preparacion`, `listo_para_entregar`.
Estados que NO bloquean: `entregado`, `cancelado`.

---

## 4. Cobertura por issue

### 4.1 Cubierto por S4-008
Toda la regla backend de disponibilidad, fuente de verdad de S4-010:

- Ventana operativa **direccional** de 30 minutos:
  `inicio_bloqueo <= hora_nueva < inicio_bloqueo + 30`.
- Filtro `tipo_entrega = domicilio` (las recolecciones no consumen ventana de reparto).
- Filtro de **estados activos** que bloquean.
- **Exclusión del propio pedido** en edición (`excludePedidoId`).
- Cálculo de tipo/fecha/hora **efectivos** en la edición parcial
  (`data.X ?? actual.X`), leídos con `findPedidoEntrega`.
- **Cortocircuito de recolección**: nunca consulta ni bloquea.
- Mensaje funcional de conflicto en español (menciona la entrega a domicilio y
  el fin de la ventana ocupada).
- Barrera **multi-tenant**: `pasteleria_id` siempre derivado del contexto admin,
  nunca aceptado desde el frontend.

Cubre las reglas 1, 2, 3, 4, 5 y 7.

### 4.2 Cubierto por S4-005
Eliminación de pedidos por **hard delete** (borrado físico transaccional del
pedido, sus items y sus movimientos). Un pedido eliminado deja de existir en la
tabla, por lo que no participa en ninguna consulta de disponibilidad.

Cubre la regla 6.

### 4.3 Apoyado por S4-009
Interfaz diferenciada domicilio vs. recolección: textos de ayuda contextual en el
formulario y el indicador de tipo de entrega en el listado. No es un requisito
funcional de S4-010, pero refuerza la claridad para el administrador sobre qué
pedidos consumen disponibilidad de reparto y cuáles no.

---

## 5. Validaciones A–H (casos de prueba mínimos)

Verificadas a nivel de lógica reproduciendo el **pipeline real del backend**
(filtro de `findBloqueosDomicilioPorFecha` + `assertDisponibilidadEntrega`,
reutilizando las constantes/funciones reales de S4-008
`ESTADOS_BLOQUEAN_DISPONIBILIDAD` y `detectarConflictoDomicilio`). Todas las
fechas/horas usan el mismo día y `HH:mm` en 24 h (4:00 p.m. = `16:00`).

| Caso | Escenario | Resultado esperado | Resultado |
|---|---|---|---|
| A | Existe domicilio activo a las 4:00 p.m. (base) | Bloquea `[16:00, 16:30)` | ✅ |
| B | Editar otro domicilio a las 4:15 p.m. | Conflicto | ✅ |
| C | Editar otro domicilio a las 4:30 p.m. | Permitido (borde superior excluido) | ✅ |
| D | Cambiar domicilio → recolección | Libera disponibilidad (no bloquea ni a sí mismo ni a otros) | ✅ |
| E | Cambiar recolección → domicilio | Valida: conflicto si cae en ventana, permitido si está libre | ✅ |
| F | Cancelar el domicilio | Su ventana queda libre para un nuevo domicilio a las 4:15 p.m. | ✅ |
| G | Domicilio entregado | No bloquea disponibilidad futura | ✅ |
| H | Editar el propio pedido sin cambiar horario | Sin autoconflicto (se excluye a sí mismo) | ✅ |

Mensaje de conflicto verificado en el caso B:

```txt
El horario seleccionado no está disponible. Ya existe una entrega a domicilio a
las 4:00 p.m.; la ventana ocupada termina a las 4:30 p.m.
```

**Resultado del smoke test: 11/11 OK** (casos A–H más los sub-casos de D y E y
el sub-caso de pedido eliminado).

> El smoke test se ejecutó como herramienta de verificación temporal fuera del
> repositorio; **no se versionó ningún test ni se agregó test runner**, conforme
> al alcance de cierre de S4-010.

---

## 6. Resultado de validaciones finales

- **`npm run lint`:** ✅ sin errores.
- **`npm run build`:** ✅ compiló correctamente (TypeScript OK, páginas generadas).
- **`git status -uall`:** sin cambios de código de aplicación; el único archivo
  agregado es este documento de QA.

---

## 7. Confirmaciones

- ✅ **No se tocó backend** (`disponibilidad.ts`, `pedidos.service.ts`,
  `pedidos.repository.ts`, `validation/pedidos.ts`, `actions.ts`, `types.ts`).
- ✅ **No se tocó frontend** (formulario de pedido, `entrega-fields.tsx`,
  `cambiar-estado-pedido.tsx`, páginas de pedidos).
- ✅ **No se tocó** `prisma/schema.prisma`.
- ✅ **No se crearon migrations.**
- ✅ **No se implementó calendario visual** (ni drag and drop).
- ✅ **No se agregó test runner** ni test versionado.
- ✅ **No se hizo commit.**

---

## 8. Fuera de alcance (confirmado)

Reprogramación avanzada, drag and drop, historial de cambios de horario,
notificaciones, sobrecupo manual, rutas de reparto, repartidores, capacidad
diaria, capacidad por personas, calendario visual completo, edición masiva y
límite de recolecciones.
