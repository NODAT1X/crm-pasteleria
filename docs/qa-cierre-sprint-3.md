# QA funcional y cierre Sprint 3 - Pagos, saldo y movimientos financieros

## Información general

| Campo | Detalle |
|---|---|
| Issue | S3-022 |
| Responsable principal | J0SU3-52 |
| Apoyo | Equipo completo |
| Sprint | Sprint 3 |
| Área validada | Pagos, saldo, anticipos, abonos, movimientos financieros, anulación y cancelación |
| Rama sugerida | `docs/s3-022-qa-cierre-pagos-saldo` |
| Documento | `docs/qa-cierre-sprint-3.md` |
| Resultado funcional | **GO condicionado** |

## Objetivo

Validar el flujo completo de pagos, saldo y movimientos financieros implementado durante la segunda parte del Sprint 3.

La revisión incluye registro de anticipo, abonos, liquidación, cálculo de total pagado, saldo pendiente, estado de pago, historial financiero, anulación de movimientos, cancelación con retención/devolución y entrega con saldo pendiente.

Este documento también registra bugs, pendientes y observaciones para utilizarlos como insumo en la planeación del siguiente sprint.

---

## Resumen ejecutivo

El Sprint 3 queda funcionalmente avanzado y la mayoría de los flujos financieros fueron validados correctamente.

Se validaron de forma satisfactoria los siguientes puntos:

- Registro de anticipo igual o mayor al mínimo requerido.
- Reflejo del anticipo en total pagado.
- Cálculo de saldo pendiente.
- Registro de abonos.
- Liquidación de pedido.
- Estado de pago liquidado/pagado.
- Historial de movimientos financieros.
- Anulación de movimientos.
- Cancelación con retención del 25% del anticipo y devolución del 75%.
- Entrega con saldo pendiente y advertencia al administrador.

Durante la validación se detectaron dos incidencias que deben documentarse para el siguiente sprint:

1. Error inesperado al intentar registrar un anticipo menor al 50%, lo que impidió validar completamente la regla de anticipo mínimo.
2. Error de conexión con la base de datos al regresar al listado de pedidos después de cancelar un pedido.

Adicionalmente, el build finalizó correctamente, pero Next.js mostró un warning no bloqueante relacionado con múltiples `package-lock.json`.

---

## Alcance validado

| Punto | Resultado | Observaciones |
|---|---|---|
| Crear checklist de validación Sprint 3 segunda parte | Validado | Documento generado como cierre funcional del Sprint 3. |
| Validar registro de anticipo, abono y liquidación | Validado | Flujos principales validados correctamente. |
| Validar cálculo de total pagado, saldo pendiente y estado de pago | Validado | Cálculos correctos en anticipo, abonos y liquidación. |
| Validar regla de anticipo mínimo del 50% para confirmar | No validado por bug | Se presentó error inesperado al intentar registrar anticipo menor al 50%. |
| Validar historial de movimientos | Validado | Historial muestra anticipos, abonos, liquidaciones y anulaciones. |
| Validar anulación de movimientos | Validado | Recalcula correctamente total pagado, saldo pendiente y estado si aplica. |
| Validar cancelación con retención del 25% del anticipo y devolución del resto | Validado | La regla se validó correctamente. |
| Validar entrega con saldo pendiente y advertencia | Validado | Advertencia visible y saldo pendiente conservado. |
| Confirmar fuera de alcance: tarjeta, Mercado Pago, comprobantes, facturación, calendario y WhatsApp | Validado | Se mantienen fuera de alcance del Sprint 3. |
| Registrar bugs, pendientes y resultado GO/NO-GO | Validado | Bugs y pendientes documentados. |

---

## Fuera de alcance confirmado

Los siguientes puntos no forman parte de la validación funcional de este Sprint:

- [x] Pruebas de carga.
- [x] Auditoría completa de seguridad.
- [x] Validación de Mercado Pago.
- [x] Validación de pagos con tarjeta.
- [x] Validación de comprobantes.
- [x] Validación de facturación.
- [x] Validación de calendario/capacidad.
- [x] Validación de WhatsApp.

---

## Entorno de validación

| Elemento | Resultado |
|---|---|
| Proyecto | CRM Pastelería Nodatix |
| Rama base | `develop` |
| Rama de trabajo sugerida | `docs/s3-022-qa-cierre-pagos-saldo` |
| Ambiente | Local |
| Ruta local | `C:\Users\Userss\Documents\Nodatix\crm-pasteleria` |
| Base de datos | Desarrollo / Supabase |
| Navegador | Chrome |
| Usuario de prueba | Admin |
| Next.js | 16.2.9 |
| Prisma Client | 7.8.0 |
| Resultado de lint | OK |
| Resultado de build | OK con warning no bloqueante |

---

## Validación técnica

### Resultado de `npm run lint`

| Comando | Resultado | Observaciones |
|---|---|---|
| `npm run lint` | OK | ESLint finalizó sin errores. |

### Resultado de `npm run build`

| Comando | Resultado | Observaciones |
|---|---|---|
| `npm run build` | OK con warning no bloqueante | La compilación finalizó correctamente. Next.js detectó múltiples lockfiles. |

### Observaciones del build

- Prisma Client generado correctamente.
- Next.js compiló correctamente.
- TypeScript finalizó correctamente.
- Las páginas se generaron correctamente.
- No se detectaron errores bloqueantes de build.
- Se detectó warning por múltiples `package-lock.json`.

### Warning técnico detectado

```txt
Warning: Next.js inferred your workspace root, but it may not be correct.
We detected multiple lockfiles and selected the directory of C:\Users\Userss\package-lock.json as the root directory.
Detected additional lockfiles:
* C:\Users\Userss\Documents\Nodatix\crm-pasteleria\package-lock.json
```

**Interpretación:**  
El warning no bloquea la compilación, pero debe revisarse para evitar problemas futuros con la detección del workspace root en Turbopack.

**Acción sugerida para siguiente sprint:**  
Revisar si debe eliminarse el `package-lock.json` externo ubicado en `C:\Users\Userss\package-lock.json` o configurar explícitamente `turbopack.root` en la configuración de Next.js.

---

# Checklist funcional

## 1. Registro de anticipo

**Objetivo:** Validar que se pueda registrar un anticipo en un pedido.

| Validación | Resultado | Observaciones |
|---|---|---|
| Se puede registrar un anticipo en un pedido | Validado | Se registró anticipo del 50% mínimo. |
| El anticipo se refleja en total pagado | Validado | El total pagado se actualizó correctamente. |
| El saldo pendiente disminuye correctamente | Validado | El saldo pendiente disminuyó conforme al anticipo registrado. |
| El movimiento aparece en el historial financiero | Validado | El movimiento apareció correctamente en historial. |

**Resultado del punto:** Validado.

**Evidencia:**  
Capturas funcionales pendientes de adjuntar en PR o evidencia del Sprint.

---

## 2. Regla de anticipo mínimo del 50%

**Objetivo:** Confirmar que el sistema no permita confirmar o registrar un anticipo inválido cuando no cumple con el mínimo requerido del 50%.

| Validación | Resultado | Observaciones |
|---|---|---|
| Pedido con anticipo menor al 50% no puede confirmarse | No validado por bug | Al intentar registrar un anticipo menor al 50%, ocurrió un error inesperado. |
| Pedido con anticipo igual o mayor al 50% puede confirmarse | Validado parcialmente | En el punto 1 se validó registro de anticipo del 50%. |
| El sistema muestra advertencia o bloqueo funcional correcto | No validado por bug | No se pudo confirmar si muestra validación controlada porque ocurrió error de transacción. |

**Resultado del punto:** No validado completamente por bug.

### Error detectado

```txt
[pagos] Error inesperado: Error [PrismaClientKnownRequestError]: Transaction API error: Unable to start a transaction in the given time.
    at async registrarPagoService (src\server\services\pagos.service.ts:397:12)
    at async registrarPagoAction (src\modules\pagos\actions.ts:65:23)

code: 'P2028'
clientVersion: '7.8.0'

POST /pedidos/cmrpzhaiv0005dgwdx9e5oo0s 200 in 17.2s
registrarPagoAction({"metodo_pago":"efectivo","monto":"900","notas":"restan", ...}) in 17094ms
```

### Interpretación funcional

El sistema no respondió con una validación controlada al intentar registrar un anticipo menor al 50%. En su lugar, se presentó un error de Prisma relacionado con el inicio de una transacción.

La regla de anticipo mínimo del 50% queda como punto pendiente de validación y debe retomarse en el siguiente sprint.

**Acción sugerida para siguiente sprint:**  
Crear issue para revisar el flujo de validación de anticipo menor al 50%, evitar error de transacción y asegurar que el sistema muestre una respuesta clara al usuario.

**Evidencia:**  
Log de error documentado en este archivo.

---

## 3. Registro de abonos

**Objetivo:** Validar que los abonos actualicen correctamente los importes financieros del pedido.

| Validación | Resultado | Observaciones |
|---|---|---|
| Se puede registrar un abono posterior al anticipo | Validado | El sistema permitió registrar el abono. |
| El total pagado aumenta correctamente | Validado | El total pagado se actualizó correctamente. |
| El saldo pendiente disminuye correctamente | Validado | El saldo pendiente disminuyó correctamente en el resumen de pago. |
| El estado de pago se mantiene como parcial si aún hay saldo | Validado | El comportamiento fue correcto según el saldo pendiente. |
| El movimiento aparece en el historial financiero | Validado | El movimiento apareció correctamente en historial. |

**Resultado del punto:** Validado.

**Evidencia:**  
Capturas funcionales pendientes de adjuntar en PR o evidencia del Sprint.

---

## 4. Liquidación del pedido

**Objetivo:** Validar que un pedido pueda quedar liquidado cuando el total pagado cubre el total del pedido.

| Validación | Resultado | Observaciones |
|---|---|---|
| Se puede registrar el pago final | Validado | El pago final se registró correctamente. |
| El total pagado coincide con el total del pedido | Validado | El total pagado coincidió con el total del pedido. |
| El saldo pendiente queda en $0.00 | Validado | El saldo quedó liquidado correctamente. |
| El estado de pago cambia a liquidado/pagado | Validado | El estado cambió correctamente a liquidado/pagado. |
| El movimiento de liquidación aparece en historial | Validado | El movimiento apareció correctamente en historial. |

**Resultado del punto:** Validado.

**Evidencia:**  
Capturas funcionales pendientes de adjuntar en PR o evidencia del Sprint.

---

## 5. Historial de movimientos financieros

**Objetivo:** Validar que los movimientos financieros queden registrados de forma clara y trazable.

| Validación | Resultado | Observaciones |
|---|---|---|
| El historial muestra anticipos | Validado | Se visualizan correctamente. |
| El historial muestra abonos | Validado | Se visualizan correctamente. |
| El historial muestra liquidaciones | Validado | Se visualizan correctamente. |
| El historial muestra anulaciones | Validado | Se visualizan correctamente. |
| Cada movimiento muestra monto, tipo y fecha | Validado | La información se muestra correctamente. |
| Los movimientos mantienen trazabilidad funcional | Validado | El historial conserva trazabilidad suficiente para validación funcional. |

**Resultado del punto:** Validado.

**Evidencia:**  
Capturas funcionales pendientes de adjuntar en PR o evidencia del Sprint.

---

## 6. Anulación de movimientos

**Objetivo:** Validar que la anulación de movimientos financieros ajuste correctamente el saldo del pedido.

| Validación | Resultado | Observaciones |
|---|---|---|
| Se puede anular un movimiento financiero | Validado | El sistema permitió anular el movimiento. |
| El movimiento anulado queda identificado en historial | Validado | La anulación quedó reflejada en historial. |
| El total pagado se recalcula correctamente | Validado | El total pagado se recalculó correctamente. |
| El saldo pendiente se recalcula correctamente | Validado | El saldo pendiente se actualizó correctamente. |
| El estado de pago se actualiza si aplica | Validado | El estado se actualizó de acuerdo con el nuevo saldo. |

**Resultado del punto:** Validado.

**Evidencia:**  
Capturas funcionales pendientes de adjuntar en PR o evidencia del Sprint.

---

## 7. Cancelación con retención y devolución

**Objetivo:** Validar la regla de cancelación con retención del 25% del anticipo y devolución del resto.

| Validación | Resultado | Observaciones |
|---|---|---|
| Se puede cancelar un pedido con anticipo registrado | Validado | El pedido se canceló correctamente. |
| El sistema calcula retención del 25% del anticipo | Validado | La retención se calculó correctamente. |
| El sistema calcula devolución del 75% restante | Validado | La devolución se calculó correctamente. |
| La cancelación queda reflejada funcionalmente | Validado | El estado y la información del pedido reflejan la cancelación. |
| El historial conserva los movimientos relacionados | Validado | El historial conservó los movimientos relacionados. |

**Ejemplo esperado de regla validada:**

| Anticipo | Retención 25% | Devolución 75% |
|---:|---:|---:|
| $500.00 | $125.00 | $375.00 |
| $1,000.00 | $250.00 | $750.00 |

**Resultado del punto:** Validado.

**Evidencia:**  
Capturas funcionales pendientes de adjuntar en PR o evidencia del Sprint.

---

## 8. Entrega con saldo pendiente

**Objetivo:** Validar que el sistema advierta cuando se intenta entregar un pedido que aún tiene saldo pendiente.

| Validación | Resultado | Observaciones |
|---|---|---|
| Pedido con saldo pendiente muestra advertencia al entregar | Validado | El sistema mostró advertencia. |
| La advertencia es clara para el usuario administrador | Validado | La advertencia fue entendible para el administrador. |
| El sistema no liquida automáticamente el pedido | Validado | El sistema conserva el saldo pendiente. |
| El saldo pendiente se mantiene visible | Validado | El saldo pendiente continúa visible. |

**Resultado del punto:** Validado.

**Evidencia:**  
Capturas funcionales pendientes de adjuntar en PR o evidencia del Sprint.

---

# Bugs encontrados

## BUG-S3-022-001 - Error de transacción al registrar anticipo menor al 50%

| Campo | Detalle |
|---|---|
| Tipo | Bug funcional / transacción |
| Severidad | Alta |
| Estado | Pendiente para siguiente sprint |
| Módulo | Pagos |
| Acción afectada | Registro de anticipo menor al 50% |
| Archivo relacionado | `src/server/services/pagos.service.ts` |
| Acción relacionada | `registrarPagoAction` |
| Código Prisma | `P2028` |
| Resultado esperado | El sistema debe bloquear o advertir que el anticipo no cumple el mínimo del 50%, sin lanzar error inesperado. |
| Resultado obtenido | Se lanzó error de transacción: `Unable to start a transaction in the given time`. |

### Descripción

Durante la validación de la regla de anticipo mínimo del 50%, al intentar registrar un anticipo menor al 50% del precio del pedido, el sistema no mostró una validación controlada. En su lugar, ocurrió un error inesperado de Prisma.

### Evidencia técnica

```txt
[pagos] Error inesperado: Error [PrismaClientKnownRequestError]: Transaction API error: Unable to start a transaction in the given time.
    at async registrarPagoService (src\server\services\pagos.service.ts:397:12)
    at async registrarPagoAction (src\modules\pagos\actions.ts:65:23)

code: 'P2028'
clientVersion: '7.8.0'
```

### Impacto

Este bug impidió validar completamente la regla de anticipo mínimo del 50%.  
No bloquea todos los flujos financieros, pero sí deja pendiente una regla importante de negocio para Sprint 4.

### Recomendación para planeación

Crear issue en el siguiente sprint para:

- Revisar la validación previa al inicio de la transacción.
- Evitar que un anticipo menor al 50% llegue a una operación financiera que termine en timeout.
- Mostrar una alerta o mensaje funcional claro al usuario.
- Agregar prueba manual y, si aplica, validación automatizada para anticipo menor al 50%.

---

## BUG-S3-022-002 - Error de conexión a base de datos al regresar al listado después de cancelar pedido

| Campo | Detalle |
|---|---|
| Tipo | Bug técnico / conectividad / infraestructura |
| Severidad | Media |
| Estado | Pendiente para siguiente sprint |
| Módulo | Pedidos |
| Acción afectada | Regresar al listado de pedidos después de cancelar un pedido |
| Ruta afectada | `/pedidos` |
| Archivo relacionado | `src/app/(dashboard)/pedidos/page.tsx` |
| Acción relacionada | `listPedidosAction` |
| Dependencia afectada | Supabase / Prisma / conexión a base de datos |
| Resultado esperado | Al regresar al listado, el sistema debe cargar la lista de pedidos correctamente. |
| Resultado obtenido | Se lanzó error porque no se pudo alcanzar el servidor de base de datos. |

### Descripción

Después de cancelar correctamente un pedido, al intentar regresar al apartado de listado de pedidos desde la interfaz, se presentó un error de conexión con la base de datos.

### Evidencia técnica

```txt
Error Type:
Console PrismaClientKnownRequestError

Error Message:
Invalid `db[model].findFirst()` invocation

Can't reach database server at aws-1-us-east-2.pooler.supabase.com

at requireAdminContext (src\server\auth\authorization.ts:112:19)
at listPedidosAction (src\modules\pedidos\actions.ts:77:28)
at PedidosPage (src\app\(dashboard)\pedidos\page.tsx:75:18)

Next.js version: 16.2.9 (Turbopack)
```

### Impacto

La cancelación del pedido sí se ejecutó correctamente, pero la navegación posterior al listado falló por un problema de conexión con la base de datos.

El error parece estar relacionado con conectividad, pooler de Supabase o estabilidad de la conexión en ambiente local, por lo que se documenta como pendiente técnico de severidad media.

### Recomendación para planeación

Crear issue en el siguiente sprint para:

- Revisar estabilidad de conexión con Supabase.
- Confirmar configuración de variables de entorno.
- Validar comportamiento del pooler.
- Agregar manejo de error más amigable en vistas que cargan datos.
- Confirmar si el error es reproducible o fue intermitente.

---

# Pendientes no bloqueantes

| ID | Pendiente | Prioridad | Sprint sugerido | Observaciones |
|---|---|---|---|---|
| PEND-S3-022-001 | Revisar warning de Next.js por múltiples lockfiles | Media | Sprint 4 | No bloqueó el build, pero conviene corregirlo para evitar problemas con Turbopack. |
| PEND-S3-022-002 | Adjuntar capturas funcionales al PR o evidencia del Sprint | Media | Cierre Sprint 3 / Sprint 4 | El documento registra resultados, pero las capturas deben adjuntarse como evidencia si el equipo las requiere. |
| PEND-S3-022-003 | Retomar validación de regla de anticipo menor al 50% | Alta | Sprint 4 | Actualmente no pudo validarse por BUG-S3-022-001. |
| PEND-S3-022-004 | Revisar manejo de errores de base de datos en listados | Media | Sprint 4 | Relacionado con BUG-S3-022-002. |

---

# Resultado GO/NO-GO

| Criterio | Resultado | Observaciones |
|---|---|---|
| Flujos financieros principales validados | Validado | Anticipo válido, abonos, liquidación, historial, anulación, cancelación y entrega con saldo pendiente fueron validados. |
| Bugs bloqueantes en pagos/saldo | No hay bloqueo total, pero existe bug pendiente | BUG-S3-022-001 afecta validación de anticipo menor al 50%. |
| Pendientes registrados | Validado | Bugs y pendientes documentados para planeación del siguiente sprint. |
| Sprint 4 puede iniciar | Sí, condicionado | Deben contemplarse bugs y pendientes en planeación del Sprint 4. |

## Decisión funcional

**Resultado:** GO condicionado.

Sprint 4 puede iniciar porque la mayoría de los flujos financieros principales del Sprint 3 fueron validados correctamente y no se detectó un bloqueo total del módulo de pagos/saldo.

Sin embargo, el Sprint 4 debe contemplar como prioridad la atención de los bugs documentados, especialmente la validación del anticipo menor al 50%, ya que esta regla no pudo validarse completamente por un error de transacción.

---

# Evidencia esperada

- Capturas del registro de anticipo.
- Capturas del cálculo de saldo pendiente.
- Capturas del historial de movimientos.
- Capturas de anulación de movimiento.
- Capturas de cancelación con retención/devolución.
- Capturas de entrega con saldo pendiente y advertencia.
- Resultado de `npm run lint`.
- Resultado de `npm run build`.
- Logs de errores documentados en este archivo.

---

# Conclusión

El cierre funcional del Sprint 3 se considera **GO condicionado**.

Los flujos principales de pagos, saldo y movimientos financieros fueron validados satisfactoriamente en su mayoría. El sistema permite registrar anticipos válidos, abonos, liquidaciones, consultar historial, anular movimientos, cancelar pedidos con retención/devolución y advertir entrega con saldo pendiente.

No obstante, quedan incidencias que deben contemplarse en la planeación del siguiente sprint:

1. Corregir y validar el comportamiento cuando se intenta registrar un anticipo menor al 50%.
2. Revisar el error de conexión con Supabase al regresar al listado de pedidos después de cancelar.
3. Revisar warning de múltiples lockfiles detectado por Next.js/Turbopack.

Con estos puntos documentados, el Sprint 3 puede cerrarse funcionalmente y Sprint 4 puede iniciar de manera condicionada, priorizando los bugs y pendientes registrados.