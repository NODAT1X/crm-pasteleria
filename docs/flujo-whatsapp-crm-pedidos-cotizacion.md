# Flujo funcional WhatsApp a CRM para pedidos en cotización

- **Issue:** #194 — S5-007
- **Rama:** `docs/s5-007-flujo-whatsapp-crm`
- **Tipo:** docs / product / architecture
- **Estado:** definición funcional (no implementación)

Documentos base: `docs/documento-maestro-crm-pasteleria.md`,
`docs/decision-integracion-whatsapp-sprint-5.md` (S5-006),
`docs/politica-eliminacion-datos-reales-whatsapp.md` (S5-005),
`docs/qa-s5-004-concurrencia-disponibilidad.md` (S5-004),
`docs/reglas-disponibilidad-calendario-sprint-4.md`.

---

## 1. Propósito

Este documento define el **flujo funcional** por el cual un cliente inicia un
pedido desde WhatsApp y el CRM lo registra como una **cotización inicial** para
revisión del dueño. Es un contrato funcional **previo a la implementación**: no
es una especificación técnica productiva, no conecta la API de WhatsApp, no envía
mensajes reales ni crea webhooks, plantillas, tablas o migraciones.

La idea central es explícita: **WhatsApp no reemplaza al dueño.** WhatsApp captura
una solicitud y genera una cotización inicial en estado `cotizacion`; **no**
confirma automáticamente pedidos, **no** fija precios complejos y **no** valida
pagos. El dueño/administrador revisa, ajusta precio e items, valida pagos y
confirma el pedido conforme a las reglas vigentes.

Cualquier capacidad descrita como "futura" en este documento **no está
implementada** y debe convertirse en issues propias (ver sección 15).

---

## 2. Principios del flujo

- **WhatsApp es el canal de entrada**, no la fuente de verdad.
- **El CRM es la fuente de verdad** de pedidos, pagos, saldo, disponibilidad y
  estados.
- **El dueño/administrador valida** precio, items, pagos, confirmación y
  excepciones. La automatización no toma decisiones sensibles por él (Documento
  Maestro).
- **El sistema guía y registra**: conduce la captura, valida formato y
  disponibilidad, y crea la cotización.
- **El cliente proporciona datos**; no fija precio ni confirma el pedido.
- **No se prometen precios complejos automáticos.** Los pedidos personalizados
  requieren revisión humana del precio.
- **No se validan comprobantes automáticamente.** El pago real lo registra y
  valida el dueño.
- **La disponibilidad se valida con las reglas de Sprint 4 y la protección de
  concurrencia de S5-004**, siempre en backend.
- **El flujo no puede saltarse ninguna regla vigente** de pedidos, pagos,
  disponibilidad, estados, cancelación o eliminación.

---

## 3. Actores

| Actor | Rol en el flujo | Qué NO hace |
|---|---|---|
| **Cliente** | Inicia la conversación, proporciona sus datos y los del pedido deseado (producto, fecha, hora, tipo de entrega, dirección si aplica, notas). | No accede al CRM, no fija precio, no confirma el pedido, no valida su propio pago. |
| **Sistema / WhatsApp / CRM** | Guía la captura, valida formato y datos faltantes, consulta disponibilidad en backend, registra la solicitud como pedido en `cotizacion`, informa al cliente y deja el pedido visible para el dueño. | No decide precio final, no confirma, no marca como pagado, no valida comprobantes, no cancela ni elimina por su cuenta. |
| **Dueño / Administrador** | Revisa la cotización, corrige/completa datos, ajusta precio e items, envía cotización e instrucciones de anticipo, valida comprobante/transferencia, registra el pago real, confirma el pedido y gestiona excepciones, duplicados y cancelaciones. | No delega en la automatización las decisiones sensibles. |

---

## 4. Flujo conversacional principal

Secuencia paso a paso. Se marca **[A]** para pasos automáticos del sistema y
**[H]** para decisiones humanas del dueño.

1. **[Cliente]** Inicia la conversación por WhatsApp.
2. **[A]** El sistema **saluda** y explica brevemente el proceso (se captura una
   solicitud que el dueño revisará; no es una confirmación inmediata).
3. **[A]** El sistema **intenta identificar al cliente** por su teléfono/wa_id
   contra los clientes existentes. El pedido debe asociarse a un **cliente
   existente y activo** (Documento Maestro). Si el cliente **no existe**, está
   **inactivo** o hay **ambigüedad** (varias coincidencias, datos poco claros),
   la solicitud pasa a **revisión humana** o a un **flujo futuro de
   alta/vinculación controlada** conforme a las reglas de clientes (ver sección
   6.6 y 11). **El sistema no crea clientes automáticamente**: esta issue no
   define ni implementa el alta automática de clientes desde WhatsApp.
4. **[A]** El sistema solicita el **producto o tipo de pedido**.
5. **[A]** El sistema solicita la **descripción/detalles** suficientes para que el
   dueño pueda cotizar (sabor, tamaño, tema, personalización, cantidad
   aproximada). **No** se calcula precio en este paso.
6. **[A]** El sistema solicita la **fecha de entrega** (obligatoria).
7. **[A]** El sistema solicita la **hora de entrega** (obligatoria).
8. **[A]** El sistema solicita el **tipo de entrega**: entrega a domicilio o
   recolección en sucursal.
9. **[A]** Si es **domicilio**, el sistema solicita la **dirección de entrega**.
10. **[A]** El sistema solicita **notas o referencias** (opcional).
11. **[A]** El sistema **valida disponibilidad** con el backend (sección 7). Si el
    tipo de entrega es domicilio, aplica la ventana de 30 minutos; si es
    recolección, no bloquea.
12. **[A]** Si hay disponibilidad, el sistema **crea el pedido en estado
    `cotizacion`**, marcado como **origen WhatsApp** (requisito futuro, sección 8),
    asociado al cliente, **sin precio final automático** en pedidos
    personalizados.
13. **[A]** El sistema informa que **la solicitud fue recibida y será revisada**
    por el equipo (no es una confirmación ni una cotización final).
14. **[H]** El **dueño revisa** la cotización en el CRM.
15. **[H]** El dueño **ajusta precio e items** (completa el/los item(s) y el total
    derivado, según el mecanismo controlado de la sección 8).
16. **[H]** El dueño **envía la cotización e instrucciones de anticipo** al
    cliente.
17. **[Cliente]** El cliente **paga el anticipo** por el medio acordado.
18. **[H]** El dueño **valida el comprobante/pago** manualmente.
19. **[H]** El dueño **registra el pago en el CRM** y **confirma el pedido** solo
    si se cumple la regla vigente de anticipo mínimo (50 %) y demás reglas de
    pago.
20. **[A/H]** El sistema puede enviar **mensajes de seguimiento** asociados a los
    eventos de negocio del pedido (recibido, cotización en revisión, anticipo,
    confirmado, en preparación, listo, entregado, cancelación), como capacidad
    futura y con opt-in/plantillas aprobadas.

---

## 5. Diagrama textual (secuencia)

```txt
Cliente            WhatsApp / Sistema            CRM (backend)            Dueño / Admin
  |                       |                          |                         |
  |-- inicia conversa --->|                          |                         |
  |<-- saludo + guía -----|  [A]                     |                         |
  |-- datos cliente ----->|  [A] identifica/captura ->| (cliente activo?)      |
  |                       |                          |-- si no existe/inactivo/conflicto -> [H] revisión
  |-- producto/tipo ----->|  [A]                     |                         |
  |-- descripción ------->|  [A] (sin precio)        |                         |
  |-- fecha ------------->|  [A]                     |                         |
  |-- hora -------------->|  [A]                     |                         |
  |-- tipo entrega ------>|  [A]                     |                         |
  |-- (dirección dom.) -->|  [A]                     |                         |
  |-- notas ------------->|  [A]                     |                         |
  |                       |-- validar disponibilidad ->| [A] regla 30 min /    |
  |                       |                          |   recolección / lock    |
  |                       |<-- disponible / ocupado --|                         |
  |<-- horario ocupado ---|  (si ocupado: sugerir otro horario)                |
  |                       |-- crear pedido cotizacion ->| [A] origen WhatsApp   |
  |<-- solicitud recibida-|                          |-- visible para revisión ->|
  |                       |                          |                         |-- [H] revisa
  |                       |                          |                         |-- [H] ajusta precio/items
  |<------ cotización + instrucciones de anticipo (enviada por el dueño) ------|
  |-- paga anticipo ----->|                          |                         |
  |                       |                          |                         |-- [H] valida comprobante
  |                       |                          |<-- registra pago real ---|  [H]
  |                       |                          |<-- confirma pedido ------|  [H] (si cumple anticipo)
  |<--- mensajes de seguimiento (futuro, por evento de negocio + opt-in) ------|
```

- **Decisiones automáticas [A]:** guía de captura, validación de formato,
  consulta de disponibilidad en backend, creación de la cotización, mensajes
  informativos base.
- **Decisiones humanas [H]:** creación/vinculación de cliente ante conflicto,
  precio e items, cotización, validación de comprobante, registro de pago,
  confirmación, cancelación, manejo de duplicados y excepciones.

---

## 6. Campos capturados

### 6.1 Obligatorios para iniciar/capturar la solicitud
- **nombre del cliente**
- **teléfono WhatsApp** del cliente
- **producto o tipo de pedido**
- **descripción/detalles**

### 6.2 Necesarios para crear el pedido/cotización
- **fecha_entrega** (obligatoria)
- **hora_entrega** (obligatoria)
- **tipo_entrega** (`domicilio` o `recoleccion`)
- **direccion_entrega** (obligatoria **solo si** `tipo_entrega = domicilio`)
- **estado_pedido = `cotizacion`** (lo fija el backend, no la conversación)
- asociación a un **cliente existente y activo**

### 6.3 Opcionales
- **notas / referencias**

### 6.4 Completados o validados por el dueño
- **precio e items** (el total se deriva de los items; no es automático en
  pedidos personalizados)
- **estado_pago** (derivado por el backend a partir de los movimientos reales)
- confirmación del pedido y cualquier corrección de datos

### 6.5 Requisitos futuros (no implementados hoy)
- **origen = WhatsApp**: hoy `prisma/schema.prisma` **no** tiene un campo de
  origen en `Pedido`. Debe agregarse en una issue futura (sección 15) para poder
  marcar y distinguir estos pedidos.
- **identificador externo WhatsApp / `wa_id`**: para correlacionar la
  conversación con el cliente y el pedido.
- **referencia/conversación externa**: id de conversación o de mensaje de Meta
  para trazabilidad e idempotencia.

### 6.6 Reglas de cliente aplicadas a la captura
- El pedido **debe** asociarse a un cliente **existente y activo** (Documento
  Maestro).
- El sistema **solo intenta identificar** al cliente por teléfono/wa_id contra
  los clientes existentes. **No crea clientes automáticamente**: **esta issue no
  define ni implementa el alta automática de clientes desde WhatsApp.**
- Si el cliente **no existe**, la solicitud pasa a **revisión humana** o a un
  **flujo futuro de alta/vinculación controlada** conforme a las reglas de
  clientes. Cualquier creación o vinculación de cliente es una decisión del dueño
  o de una issue posterior, nunca una acción automática de este flujo.
- Si el cliente está **inactivo** o hay **ambigüedad** (varias coincidencias por
  el mismo teléfono, datos poco claros), la solicitud pasa a **revisión humana**
  antes de crear el pedido.

---

## 7. Validación de disponibilidad

- La disponibilidad se **valida antes de crear la cotización**.
- Si `tipo_entrega = domicilio`, aplica la **ventana operativa de 30 minutos**
  (regla direccional de Sprint 4/S5-004): la hora seleccionada es el inicio de la
  ventana `[hora, hora + 30 min)`.
- **Recolección en sucursal no bloquea** disponibilidad y puede compartir
  horario.
- Pedidos **`cancelado` y `entregado` no bloquean**; los pedidos **eliminados no
  participan** porque ya no existen (hard delete de S4-005).
- Una **cotización con domicilio sí bloquea** disponibilidad (los estados
  `cotizacion`, `confirmado`, `en_preparacion` y `listo_para_entregar` bloquean si
  son domicilio).
- La **disponibilidad final se valida en backend**; la validación **no debe
  confiar** en WhatsApp ni en ningún cliente/frontend.
- Si el horario **se ocupa durante el intento de guardado**, el backend debe
  **rechazar con un mensaje entendible** (mismo mensaje de conflicto de la ventana
  de 30 minutos).
- La **protección de concurrencia de S5-004** (advisory lock transaccional por
  `pasteleriaId + fecha`) aplica a las escrituras de domicilio: dos solicitudes
  concurrentes en la misma ventana se resuelven en **un éxito y un rechazo**. El
  flujo WhatsApp usa exactamente esta validación; **no** implementa una propia ni
  la evita.

> El flujo puede consultar disponibilidad como ayuda conversacional, pero la
> **decisión autoritativa** ocurre en el backend al momento de crear el pedido,
> dentro de la transacción protegida.

---

## 8. Creación del pedido en CRM

- El pedido **entra en estado `cotizacion`**. No entra como `confirmado` ni como
  pagado.
- Debe quedar **marcado como origen WhatsApp** cuando exista el campo o mecanismo
  correspondiente (requisito futuro; hoy el schema no lo tiene).
- **No asume precio final automático** en pedidos personalizados: el precio y los
  items los completa/ajusta el dueño.
- Debe quedar **visible para revisión del dueño** en el CRM.
- **Tensión con el modelo actual:** el CRM vigente exige que todo pedido tenga
  **al menos un item** y un **total derivado de items**. WhatsApp **no** calcula
  precios complejos. Por lo tanto, si la implementación futura necesita crear el
  pedido **antes** de tener el precio final, deberá definir un **mecanismo técnico
  controlado y compatible con las reglas vigentes**, por ejemplo:
  - un **item preliminar** con descripción del pedido y precio pendiente;
  - un **producto genérico** de "pedido personalizado por cotizar";
  - un campo/estado interno de **precio pendiente** en el item;
  - o un **flujo equivalente** que respete la regla de "≥1 item + total derivado".

  **Esta issue no implementa ese mecanismo** ni elige uno; solo lo deja como
  decisión futura. **No** debe inventarse un **nuevo estado de pedido** (no
  existen `borrador`, `no_concretado` ni `abandonado`); cualquier concepto de ese
  tipo requiere una issue futura.

---

## 9. Revisión humana del dueño

El dueño/administrador, dentro del CRM:

- **revisa** los datos capturados;
- **corrige o completa** información faltante o ambigua;
- **ajusta precio e items** (define el total derivado de items);
- **decide si el pedido procede** o pasa a excepción;
- **envía la cotización e instrucciones de anticipo** al cliente;
- **valida el comprobante/transferencia** de forma manual (no automática);
- **registra el pago real** en el CRM (backend como fuente de verdad del dinero);
- **confirma el pedido solo si** cumple las reglas vigentes de anticipo/pago (por
  ejemplo, anticipo mínimo del 50 % para pasar de `cotizacion` a `confirmado`);
- **gestiona cancelación, duplicados y excepciones** conforme a las políticas
  vigentes (secciones 11 y 13).

La automatización **no** sustituye ninguna de estas decisiones.

---

## 10. Mensajes automáticos base

Plantillas **conceptuales** (no plantillas reales de Meta, no texto final
aprobable). Lenguaje **operativo, no promocional**; **sin** prometer precio
automático. Los corchetes `[ ]` son variables a resolver en la implementación.

| # | Momento | Texto conceptual base |
|---|---|---|
| 1 | Saludo inicial | "Hola [nombre]. Gracias por escribir a [pastelería]. Con gusto tomamos los datos de tu pedido para que el equipo lo revise y te comparta la cotización. ¿Me confirmas qué pedido te gustaría?" |
| 2 | Solicitud de dato faltante | "Para continuar necesito un dato más: [dato faltante, p. ej. la fecha de entrega]. ¿Me lo compartes, por favor?" |
| 3 | Horario no disponible | "Ese horario ya está ocupado para entrega a domicilio dentro de la ventana operativa. ¿Te funciona otra hora o fecha? Con gusto reviso la disponibilidad." |
| 4 | Solicitud recibida | "¡Listo, [nombre]! Recibimos tu solicitud para el [fecha] a las [hora]. La estamos registrando como cotización; el equipo la revisará y te contactará." |
| 5 | Cotización en revisión | "Tu solicitud está en revisión. En breve el equipo te compartirá el precio y los detalles de tu pedido." |
| 6 | Instrucciones de anticipo | "Para reservar tu pedido se requiere un anticipo. Cuando el equipo confirme la cotización, te compartirá el monto y los datos para realizarlo." |
| 7 | Pedido confirmado | "Tu pedido para el [fecha] a las [hora] quedó confirmado. Gracias por tu anticipo. Cualquier cambio, te avisamos por aquí." |
| 8 | Recordatorio de entrega/recolección | "Recordatorio: tu pedido es el [fecha] a las [hora] por [entrega a domicilio en la dirección registrada / recolección en sucursal]." |
| 9 | Pedido en preparación | "Tu pedido ya está en preparación. Te avisamos cuando esté listo." |
| 10 | Pedido listo | "Tu pedido ya está listo para [entrega/recolección] el [fecha] a las [hora]." |
| 11 | Pedido entregado | "Tu pedido fue [entregado/recolectado]. Gracias por confirmar." |
| 12 | Cancelación / no confirmado | "Registramos que tu pedido no continuará por ahora. Si deseas retomarlo o tienes dudas, escríbenos por aquí." |

Aclaraciones (de S5-006):

- **Mensajes reales requieren opt-in del cliente, aprobación de plantillas y
  configuración** futura en Meta.
- Un **mensaje de servicio dentro de la ventana de 24 horas** (respuesta a una
  interacción del cliente) **no es lo mismo** que una **plantilla de utilidad**
  (pre-aprobada, enviable fuera de esa ventana). No deben mezclarse.
- El **marketing queda fuera de alcance**: ningún mensaje puede incluir ofertas,
  descuentos ni llamados de venta (reclasificaría la plantilla como marketing).

---

## 11. Excepciones y casos alternos

| Caso | Tratamiento funcional |
|---|---|
| **Datos incompletos** | El sistema solicita el dato faltante (mensaje 2). Si sigue incompleto, no se crea el pedido o queda para revisión humana; no se inventa estado borrador. |
| **Fecha/hora inválida** | El backend rechaza el formato inválido; el sistema pide una fecha/hora válida. |
| **Horario no disponible** | Mensaje 3; se ofrece otro horario/fecha. La validación autoritativa es del backend. |
| **Producto personalizado** | Se captura descripción suficiente; el precio lo define el dueño (no automático). |
| **Cliente pide cambio después de cotizar** | El dueño ajusta el pedido en `cotizacion` (o el estado editable correspondiente); la disponibilidad se revalida si cambia fecha/hora/tipo a domicilio. |
| **Cliente envía comprobante** | El dueño valida manualmente y registra el pago real; no hay validación automática de comprobantes. |
| **Cliente duplica solicitud** | Se conserva el registro con trazabilidad válida; el duplicado se evalúa según S5-005 (sección 13). |
| **Cliente abandona la conversación** | No existe estado `abandonado`. Queda como `cotizacion` para revisión o se cancela según el caso; su tratamiento sistemático es requisito futuro. |
| **Pedido urgente** | Se captura igual; el dueño decide viabilidad. No hay reglas de capacidad especiales en este alcance. |
| **Domicilio sin dirección** | La dirección es obligatoria para domicilio; el sistema la solicita antes de crear el pedido. |
| **Recolección sin dirección** | Correcto: la recolección **no** requiere dirección. |
| **Precio requiere revisión humana** | Siempre: el precio final es responsabilidad del dueño. |
| **Cliente existente/inactivo** | Inactivo o en conflicto → revisión humana antes de crear el pedido (sección 6). |
| **Solicitud de WhatsApp que no continúa** | Se cancela o se conserva como `cotizacion` según S5-005; no se elimina si es real. |
| **Cotización creada pero no confirmada** | Permanece como `cotizacion`; bloquea disponibilidad si es domicilio; no se asume `no_concretado`. |

---

## 12. Prevención de duplicados e historial (requisitos futuros)

Definido como **requisito futuro** (no implementado hoy):

- **guardar historial de mensajes** entrantes y salientes;
- **identificar la conversación** por teléfono/`wa_id`;
- **evitar crear múltiples cotizaciones** por la misma conversación activa;
- **deduplicar webhooks o mensajes repetidos** (Meta puede reenviar eventos);
- **registrar la trazabilidad de origen** (prueba / duplicado / solicitud real);
- **asociar cada mensaje a un cliente y a un pedido**;
- permitir **auditoría** de qué se envió/recibió, cuándo y con qué resultado;
- garantizar **idempotencia por evento de negocio** (p. ej. clave única por
  `pedido + tipo de evento + versión de estado`);
- **correlación con el ID externo de Meta** cuando exista.

Estos puntos provienen de S5-006 y S5-005 y son insumo directo de las issues de
implementación (sección 15).

---

## 13. Política de eliminación/cancelación aplicada al flujo WhatsApp

Integra `docs/politica-eliminacion-datos-reales-whatsapp.md` (S5-005):

- **WhatsApp de prueba con datos ficticios:** puede eliminarse como dato de
  prueba (confirmación simple sin movimientos; reforzada con movimientos
  ficticios).
- **WhatsApp real:** **no se elimina como flujo normal**.
- **Si no continuará:** se **cancela** bajo el modelo vigente o se **conserva
  como `cotizacion`** mientras se evalúa.
- **Si tiene pagos reales:** **no se elimina** como acción normal; si ya no se
  realizará, se usa la **cancelación financiera** aprobada (retención del 25 % del
  anticipo aplicado y devolución del total recibido menos la retención, sin
  cambiar esas reglas).
- **Si es duplicado:** se conserva el registro con **trazabilidad válida**; el
  duplicado solo se evalúa tras identificar cuál conserva el origen real.
- **No se asume** estado `no_concretado` ni `borrador`: no existen.

---

## 14. Límites del MVP

Explícitamente, esta etapa **no** incluye:

- bot libre con IA conversacional;
- precios automáticos complejos;
- validación automática de comprobantes;
- pasarela de pago;
- optimización de rutas;
- asignación de repartidor;
- campañas masivas / marketing;
- envío productivo de mensajes hasta integrar WhatsApp real;
- webhook productivo;
- nuevas tablas, migraciones o cambios de Prisma en esta issue;
- creación de un nuevo estado de pedido.

---

## 15. Requisitos futuros convertibles en issues

1. Agregar campo **`origen_pedido`** (o equivalente) al modelo `Pedido` para
   marcar y distinguir el origen WhatsApp.
2. Crear la **entidad/concepto de conversación WhatsApp** (teléfono/`wa_id`,
   referencia externa, historial).
3. Crear el **endpoint webhook** de Meta (con verificación de firma/autenticidad).
4. Crear **prevención de duplicados e idempotencia** por evento de negocio.
5. Crear una **cola de mensajes** para el envío controlado.
6. **Registrar mensajes entrantes y salientes** con su estado (enviado,
   entregado, leído, fallido).
7. Integrar **plantillas aprobadas** y sus categorías (utilidad/servicio).
8. **Conectar los estados del pedido con los mensajes automáticos** por evento.
9. Crear una **pantalla en el CRM para revisar cotizaciones originadas por
   WhatsApp**.
10. **Resolver el mecanismo de cotización pendiente de precio** compatible con la
    regla de "≥1 item + total derivado" (item preliminar / producto genérico /
    precio pendiente).
11. Definir el **tratamiento de solicitudes abandonadas o no concretadas** (sin
    inventar estados hasta decidirlo).
12. Definir **opt-in y consentimiento** del cliente.
13. Definir **ambiente sandbox / número de prueba** (Coexistence vs. número
    dedicado, según S5-006).
14. Diseñar la **capa/adaptador de proveedor** (puerto/adaptador) para no acoplar
    la lógica del CRM al SDK/endpoints de Meta (S5-006 §14).

---

## 16. Criterios de aceptación funcional

- El documento **existe** en `docs/flujo-whatsapp-crm-pedidos-cotizacion.md`.
- El flujo **diferencia** claramente cliente / sistema / dueño (secciones 3, 4, 5).
- El pedido **entra como `cotizacion`** y debe quedar marcado como **origen
  WhatsApp** cuando exista el campo/mecanismo (secciones 8, 15).
- **No se promete precio automático complejo**; el precio lo define el dueño
  (secciones 2, 8, 9).
- Se usa la **disponibilidad de Sprint 4 / S5-004**, validada en backend, con la
  protección de concurrencia (sección 7).
- Se identifican los **mensajes automáticos base** y los **puntos de decisión
  humana** (secciones 4, 5, 10).
- El documento **puede convertirse en issues de implementación** (sección 15).

---

### Consistencia terminológica

Este documento usa de forma consistente: **pedido**, **cotización** (estado
`cotizacion`), **cliente**, **entrega a domicilio**, **recolección en sucursal**,
**anticipo**, **disponibilidad** y **dueño/administrador**. No afirma capacidades
no implementadas: WhatsApp real, el campo de origen, los webhooks, las plantillas
y la prevención de duplicados son **requisitos futuros**, no funcionalidades
vigentes.
