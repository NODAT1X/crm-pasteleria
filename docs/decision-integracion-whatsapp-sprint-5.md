# Decisión técnica y comercial de integración WhatsApp — Sprint 5 (S5-006)

## 1. Encabezado

| Campo | Valor |
|---|---|
| Issue | S5-006 — Definir decisión técnica y comercial de integración WhatsApp |
| Estado | Decisión documental preliminar — pendiente de revisión del equipo |
| Fecha de redacción | 23 de julio de 2026 |
| Fecha de consulta de fuentes oficiales | 23 de julio de 2026 |
| Propósito | Dejar una decisión suficientemente clara, condicionada y trazable entre WhatsApp Cloud API directa de Meta y un proveedor/BSP, para planear —no implementar— la integración de WhatsApp en el CRM Pastelería. |

Este documento es exclusivamente de arquitectura, producto y planeación comercial. No implementa ninguna integración, envío, webhook, plantilla real ni chatbot. No modifica código, esquema de base de datos, dependencias ni variables de entorno.

## 2. Contexto del CRM y alcance de S5-006

El CRM Pastelería Nodatix es un back-office administrativo en desarrollo activo de MVP (Sprint 5). Según `docs/documento-maestro-crm-pasteleria.md` (secciones 14 y 15) y `README.md`, WhatsApp es el **enfoque funcional planeado** de Sprint 5 —automatización guiada de pedidos y seguimiento operativo— pero **no está implementada la API oficial de WhatsApp**, no existe chatbot libre con inteligencia artificial, y el seguimiento actual es manual mediante enlaces `wa.me`.

`docs/politica-eliminacion-datos-reales-whatsapp.md` (S5-005) ya estableció que un pedido originado por WhatsApp puede representar una solicitud real y que la eventual automatización debe preservar trazabilidad suficiente para distinguir pruebas, duplicados y solicitudes reales; esa política es un insumo directo para los criterios de trazabilidad, idempotencia y eventos de negocio de este documento.

El alcance de S5-006 es exclusivamente **decidir y documentar**:

- si la integración se construye sobre Cloud API directa de Meta o sobre un proveedor/BSP;
- la estrategia de número telefónico;
- las categorías y plantillas iniciales candidatas;
- los eventos de negocio que eventualmente dispararían mensajes;
- los requisitos de webhooks, costos, riesgos y fases de implementación posterior.

Ninguna de estas decisiones se ejecuta en esta issue. La implementación real requiere issues posteriores, con sus propios criterios de aceptación y QA.

## 3. Requisitos funcionales y no funcionales de la integración

### 3.1 Funcionales

- Enviar mensajes operativos vinculados a un pedido existente (no conversación libre ni marketing masivo).
- Distinguir mensajes de utilidad, servicio, marketing y autenticación según la clasificación oficial de Meta.
- Permitir que el administrador siga siendo responsable de validar pedidos y cambios sensibles; la automatización no debe tomar decisiones no autorizadas (consistente con `documento-maestro-crm-pasteleria.md`, sección 14).
- Registrar el origen WhatsApp de un pedido o mensaje para efectos de trazabilidad y de la política de eliminación de datos reales.
- No interrumpir la operación actual del número de WhatsApp de la pastelería mientras no exista una decisión de número validada (ver sección 6).

### 3.2 No funcionales

- Trazabilidad: cada mensaje enviado debe poder asociarse a un pedido y a un evento de negocio concreto.
- Idempotencia: un mismo evento de negocio no debe generar mensajes duplicados ante reintentos o reprocesos.
- Seguridad: credenciales, tokens y secretos de firma deben manejarse fuera del código fuente y sin exposición en el cliente.
- Observabilidad: debe ser posible auditar qué se envió, cuándo, a quién, con qué plantilla/categoría y con qué resultado.
- Control de costos: debe existir visibilidad mensual del gasto por categoría y por pastelería antes de escalar el volumen de envío.
- Portabilidad razonable: la lógica de pedidos del CRM no debe acoplarse directamente al SDK o endpoints de un proveedor específico (ver sección 14).
- Cumplimiento: opt-in/consentimiento y políticas comerciales de Meta deben respetarse antes de cualquier envío real.

## 4. Comparativa: Cloud API directa de Meta vs. proveedor/BSP

| Criterio | Cloud API directa de Meta | Proveedor / BSP |
|---|---|---|
| Costos de Meta | Se pagan directamente a Meta por mensaje entregado, según categoría y mercado. Sin intermediario que agregue margen sobre esa tarifa. | Los mismos costos de Meta se trasladan al cliente, generalmente ya incluidos o facturados por el BSP. |
| Mensualidad / markup adicional | No aplica mensualidad de un tercero; solo el costo de Meta por mensaje. | Frecuente: mensualidad fija, markup por mensaje, costos por número, por usuario o por funcionalidades (plantillas, bandeja compartida, chatbot). Monto exacto **pendiente de validar** con cada proveedor concreto. |
| Complejidad técnica | Mayor: el equipo debe integrarse contra Graph API, gestionar tokens, verificación de negocio y webhooks propios. | Menor en el corto plazo: el BSP suele ofrecer SDK, panel y soporte de onboarding. |
| Tiempo de puesta en marcha | Depende de verificación de negocio y aprobación de número/plantillas ante Meta; puede ser más lento en la primera integración. | Potencialmente más rápido si el BSP ya tiene procesos de onboarding acelerados, aunque igual depende de la verificación de Meta subyacente. |
| Control sobre la integración | Alto: el equipo decide arquitectura, límites, reintentos y evolución sin depender de la hoja de ruta de un tercero. | Limitado por el producto y las decisiones técnicas del BSP. |
| Soporte | Soporte oficial de Meta para desarrolladores (documentación, canales de partners), sin un contrato de soporte dedicado. | Puede incluir soporte contractual especializado, útil si el equipo interno es pequeño. |
| Dependencia del proveedor | Solo de Meta como plataforma (dependencia inherente a cualquier opción, dado que ambas corren sobre WhatsApp Business Platform). | Dependencia adicional de Meta **y** del BSP (disponibilidad, condiciones comerciales, continuidad del servicio). |
| Portabilidad | Alta si se diseña con una capa de abstracción propia (sección 14); migrar de Cloud API directa a otro modelo requiere menos renegociación comercial. | Migrar de un BSP a otro o a Cloud API directa puede implicar recontratación, reconfiguración de webhooks y renegociación de precios. |
| Gestión de plantillas | Se gestionan directamente en Meta Business Manager / Graph API. | El BSP suele ofrecer un panel propio que internamente sincroniza con Meta; añade una capa intermedia de gestión. |
| Webhooks | El equipo implementa y opera su propio endpoint de webhooks conforme a la documentación de Meta. | El BSP puede intermediar los webhooks (reenviarlos, transformarlos), lo que añade un salto adicional y una dependencia de su disponibilidad. |
| Observabilidad | Depende enteramente de lo que el equipo construya sobre los eventos de Meta. | Algunos BSP incluyen dashboards y reportes propios, pero con menor control sobre el detalle interno. |
| Seguridad y manejo de credenciales | El equipo controla directamente tokens de acceso, secretos de verificación de webhook y rotación de credenciales. | Las credenciales pueden residir parcial o totalmente en la infraestructura del BSP, lo que traslada parte de la responsabilidad y del riesgo a un tercero. |
| Coexistence | Requiere validar elegibilidad directamente con Meta / Embedded Signup para conservar el número actual en la app de WhatsApp Business junto con Cloud API. | Depende de si el BSP concreto ofrece o soporta Coexistence para el número; no todos lo ofrecen igual. |

## 5. Decisión recomendada

**Se recomienda Cloud API directa de Meta como base para el MVP de la integración de WhatsApp.**

Razones principales:

- El equipo desarrolla su propio CRM y busca control técnico completo sobre la lógica de envío, reintentos, idempotencia y trazabilidad por pedido.
- Evita una mensualidad o markup adicional de un BSP sobre un producto que aún está en fase de MVP con volumen de mensajes desconocido.
- Evita una dependencia comercial adicional (más allá de la dependencia inherente de Meta como plataforma) mientras el volumen y los requisitos no justifiquen el soporte especializado de un BSP.
- Es consistente con el enfoque del Documento Maestro de mantener la automatización guiada y controlada por el equipo, sin ceder decisiones operativas a un tercero.

**Esta decisión es condicionada, no absoluta.** Un BSP se mantiene como alternativa válida si aparece alguno de estos bloqueos materiales durante la implementación posterior:

- dificultades de verificación u onboarding del negocio ante Meta que no puedan resolverse en un tiempo razonable;
- incompatibilidad técnica o comercial con el número oficial de la pastelería;
- Coexistence no disponible para la cuenta o la región al momento de implementar;
- necesidad contractual o regulatoria de soporte especializado que el equipo no pueda cubrir internamente;
- costo operativo de mantener la integración directa (desarrollo, mantenimiento, soporte interno) que resulte mayor que el beneficio frente a contratar un BSP.

Si se materializa alguno de estos bloqueos, la reevaluación debe documentarse como una nueva decisión, no como un cambio silencioso de arquitectura.

## 6. Estrategia del número telefónico

No se define ni se inventa un número telefónico en este documento. La estrategia acordada es:

1. Confirmar propiedad y acceso administrativo real al número oficial de la pastelería antes de cualquier paso técnico.
2. Priorizar el uso del número actual mediante **Coexistence** únicamente si Meta confirma elegibilidad para la cuenta y la región, y si esto no interrumpe la operación diaria en la WhatsApp Business App.
3. No migrar ni desconectar el número actual como parte de esta issue. Cualquier migración requiere una decisión explícita posterior.
4. Si Coexistence no resulta viable (por elegibilidad, requisitos técnicos del proveedor elegido para ofrecerlo, o riesgo operativo), usar un número dedicado independiente para piloto o implementación inicial, sin afectar el número que la pastelería ya usa operativamente.
5. La selección final del número (actual vía Coexistence, o número dedicado) queda como **requisito previo obligatorio** antes de conectar cualquier ambiente de producción.

Nota técnica: la documentación oficial de Meta sobre Embedded Signup para usuarios de la WhatsApp Business App describe requisitos de elegibilidad (versión mínima de la app, capacidad del negocio o de su partner técnico para operar webhooks, límite de throughput compartido de 20 mensajes por segundo entre app y Cloud API). Estos requisitos deben reverificarse contra la cuenta real de la pastelería antes de decidir la ruta de Coexistence.

## 7. Categorías de mensajes

Conforme a la documentación oficial de Meta, las categorías relevantes para el MVP son:

| Categoría | Definición | ¿En alcance inicial? |
|---|---|---|
| Utilidad | Mensajes no promocionales, específicos o solicitados por el usuario, o esenciales/críticos para la operación (confirmaciones de pedido, actualizaciones de estado, alertas de cuenta). | Sí — es la categoría principal del MVP. |
| Servicio | Respuestas dentro de la ventana de servicio de 24 horas iniciada por un mensaje del cliente, típicamente atendidas por una persona o un flujo guiado equivalente. | Sí, de forma limitada — solo como respuesta dentro de la ventana abierta por el cliente, no como plantilla saliente proactiva. |
| Marketing | Mensajes promocionales, de generación de demanda, reactivación o venta. | Fuera del alcance inicial. |
| Autenticación | Códigos de un solo uso (OTP) para verificación de identidad. | No necesaria para los flujos iniciales del CRM; el CRM no requiere verificación de identidad por WhatsApp en este alcance. |

Aclaración importante: **"servicio" no debe confundirse con una plantilla de utilidad.** Un mensaje de servicio solo puede enviarse dentro de la ventana de 24 horas abierta por el cliente y como respuesta a su interacción; una plantilla de utilidad puede enviarse fuera de esa ventana precisamente porque fue pre-aprobada por Meta para ese propósito operativo. Mezclar ambos conceptos llevaría a violar la ventana de servicio o a clasificar incorrectamente una plantilla, con riesgo de rechazo o recategorización por parte de Meta.

## 8. Plantillas iniciales propuestas para el MVP (conceptuales)

Estas plantillas son **propuestas de diseño**, no plantillas creadas en Meta ni texto final aprobable. La redacción exacta, aprobación y alta en Meta Business Manager corresponde a una fase de implementación posterior.

| Plantilla conceptual | Objetivo | Evento disparador (candidato) | Categoría esperada | Variables mínimas | Condición de envío | ¿Requiere opt-in? | Riesgo de clasificación/rechazo |
|---|---|---|---|---|---|---|---|
| Pedido recibido / registrado | Confirmar al cliente que su solicitud fue capturada. | Alta de pedido en estado `cotización` o `confirmado` originado o vinculado a WhatsApp. | Utilidad | Nombre del cliente, folio o referencia del pedido, fecha estimada. | El pedido debe existir y tener un cliente identificable con número válido. | Sí, opt-in previo del cliente. | Bajo, si el texto es estrictamente informativo y no incluye ofertas. |
| Pedido confirmado | Notificar que el pedido pasó a estado confirmado. | Transición de estado a `confirmado`. | Utilidad | Folio, resumen breve del pedido, fecha/hora de entrega o recolección. | Solo un envío por transición real de estado. | Sí. | Bajo–medio si se incluye lenguaje promocional accidental. |
| Anticipo o pago registrado | Confirmar recepción de un pago (anticipo, abono o liquidación). | Registro de movimiento financiero aplicado al pedido. | Utilidad | Monto recibido, saldo restante (si aplica), folio del pedido. | Debe existir un movimiento financiero real y aplicado, no anulado. | Sí. | Bajo. |
| Recordatorio de saldo pendiente | Recordar un saldo pendiente antes de entrega/recolección. | Proximidad de fecha de entrega con saldo pendiente mayor a cero. | Utilidad | Folio, monto pendiente, fecha límite o de entrega. | No debe enviarse si el saldo ya fue liquidado o el pedido fue cancelado. | Sí. | Medio, si se percibe como cobranza insistente; requiere tono cuidadoso. |
| Recordatorio de entrega o recolección | Recordar fecha/hora y lugar de entrega o recolección. | Proximidad configurable a la fecha/hora de entrega. | Utilidad | Folio, fecha, hora, dirección o sucursal. | Pedido en estado activo (no cancelado ni entregado). | Sí. | Bajo. |
| Pedido listo | Notificar que el pedido está listo para entrega/recolección. | Transición de estado a `listo para entregar`. | Utilidad | Folio, lugar/forma de entrega. | Un solo envío por transición real de estado. | Sí. | Bajo. |
| Cambio relevante o cancelación del pedido | Informar un cambio significativo o la cancelación del pedido. | Transición a `cancelado` o edición relevante (fecha, monto, productos). | Utilidad | Folio, descripción breve del cambio, referencia a contacto humano si aplica. | Debe reflejar un cambio real y confirmado, no un borrador. | Sí. | Medio, si el mensaje se redacta de forma ambigua o parece justificar una queja; debe ser neutral y factual. |

Ninguna de estas plantillas debe redactarse con lenguaje promocional, ofertas, descuentos o llamados a la acción de venta: eso las reclasificaría como marketing y cambiaría su costo y condiciones de envío.

## 9. Eventos de negocio relacionados

Los eventos de negocio candidatos a disparar (en una fase posterior) los mensajes anteriores son:

- creación o confirmación de un pedido;
- registro de un pago (anticipo, abono, liquidación);
- existencia de saldo pendiente cercano a la fecha de entrega;
- proximidad de la fecha/hora de entrega o recolección;
- cambio de estado del pedido;
- cancelación del pedido.

Estos eventos **ya existen conceptualmente en el modelo de datos y reglas actuales del CRM** (pedidos, movimientos financieros, estados, disponibilidad), pero esta issue no afirma que exista hoy un disparador automático de mensajes de WhatsApp asociado a ellos. Distinguir el evento de negocio (algo que ya ocurre en el CRM) del envío efectivo de un mensaje (una acción nueva a implementar) es central para la fase posterior: la implementación deberá evitar mensajes duplicados ante reintentos, reprocesos o reenvíos de eventos, e incorporar idempotencia (por ejemplo, una clave única por pedido + tipo de evento + versión del estado).

## 10. Webhooks y estados

La implementación posterior necesitará un endpoint de webhooks propio para registrar, **cuando Meta los proporcione**, al menos:

- enviado;
- entregado;
- leído;
- fallido (incluyendo la causa u código de error reportado por Meta).

Además, deberá documentar y construir:

- un identificador externo del mensaje (el ID que asigna Meta) para correlacionar con el registro interno;
- timestamps de cada transición de estado;
- causa/motivo de fallo cuando el mensaje no se entregue;
- reintentos controlados y acotados, sin generar envíos duplicados;
- idempotencia en el procesamiento de eventos de webhook entrantes (Meta puede reenviar el mismo evento);
- trazabilidad por pedido: cada evento de webhook debe poder asociarse al pedido y a la plantilla/categoría que lo originó;
- validación de firma o autenticidad de la solicitud entrante (Meta documenta soporte de mTLS; el mecanismo exacto de verificación de firma debe confirmarse en la documentación de configuración del webhook antes de implementar);
- endpoint HTTPS dedicado y accesible solo para este propósito;
- manejo seguro de secretos (token de verificación del webhook, credenciales de acceso), fuera del código fuente y sin exposición en el cliente.

Esta issue **no crea el webhook**. Es un requisito documentado para la fase de implementación (ver sección 14).

## 11. Costos y control mensual

### 11.1 Modelo vigente al 23 de julio de 2026

Según la documentación oficial de Meta consultada en esta fecha:

- El cobro es **por mensaje entregado** (no por mensaje enviado ni por conversación), vigente desde el 1 de julio de 2025.
- **Marketing**: se cobra siempre que el mensaje se entrega.
- **Utilidad** y **Autenticación**: se cobran cuando se envían fuera de la ventana de servicio de 24 horas; son gratuitas si se envían dentro de una ventana de servicio abierta por el cliente. Ambas categorías tienen niveles de tarifa que mejoran (tarifa más baja) según el volumen de mensajes del negocio.
- **Servicio**: mensajes de respuesta dentro de la ventana de 24 horas, hoy gratuitos.
- Mensajes enviados dentro de ventanas de "entrada gratuita" (por ejemplo, 72 horas tras interacción con un anuncio o botón de llamada a la acción de una Página) no se cobran.
- La tarifa exacta depende del mercado (país) del número destinatario, no de un monto fijo global.

### 11.2 Cambio anunciado para el 1 de octubre de 2026

Meta ha anunciado que, a partir del **1 de octubre de 2026**:

- Los mensajes de servicio (no plantilla) comenzarán a tener cargo cuando se envíen **fuera** de la ventana de servicio de 24 horas, replicando el modelo de cobro por mensaje ya usado para plantillas. Hasta esa fecha, los mensajes de servicio dentro de la ventana siguen siendo gratuitos.
- Meta ajustará regiones de tarificación ("Rest of...") separando a varios mercados en tarifas propias; se mencionan cambios específicos para mercados como Bangladesh, Irak, Nepal, Sri Lanka (tarifas más bajas) y Kazajistán, Kuwait, Marruecos, Omán, Ucrania (tarifas más altas). México no aparece mencionado explícitamente en el contenido consultado como parte de este ajuste específico de región.
- Meta anunciará las tarifas exactas vigentes a partir de esa fecha aproximadamente el **1 de septiembre de 2026**.

**Dato pendiente de validación:** no existe, en las fuentes consultadas el 23 de julio de 2026, una tarifa numérica exacta y estable en pesos mexicanos (MXN) por mensaje de utilidad o de servicio aplicable a la pastelería. El sitio de precios de Meta incluye una calculadora interactiva con MXN como moneda seleccionable, pero el valor específico no se pudo extraer de forma estática y confiable, y en cualquier caso cambiará el 1 de octubre de 2026. **No se debe cotizar ni presupuestar con una tarifa fija sin volver a consultarla directamente en el simulador oficial de Meta en la fecha en que se vaya a implementar o cotizar el servicio.**

### 11.3 Diferencia entre costos de Meta y cargos de un BSP

- Los costos de Meta (por mensaje entregado, según categoría y mercado) existen **independientemente** de si se usa Cloud API directa o un BSP: un BSP no elimina ese costo, lo traslada o lo incluye en su facturación.
- Un BSP puede sumar, además, mensualidad fija, markup por mensaje, cobro por número, por asiento de usuario o por funcionalidades adicionales (bandeja compartida, chatbot, reportes). Estos montos son específicos de cada proveedor comercial y **no se inventan en este documento**; deben cotizarse formalmente si se evalúa un BSP concreto.

### 11.4 Fórmulas de costo (parametrizadas)

```
costo por pedido =
    Σ (mensajes entregados por categoría × tarifa vigente de esa categoría y mercado)
    + costo proporcional del BSP, si aplica (mensualidad o markup prorrateado por pedido)

costo mensual =
    costo total de mensajes entregados en el mes (por categoría y mercado)
    + mensualidad o cargos fijos del proveedor (si aplica BSP)
    + impuestos aplicables, si corresponden
```

Donde, mientras no se confirme una tarifa oficial estable para México:

- `T_utilidad` = tarifa vigente por mensaje de utilidad entregado fuera de ventana de servicio (México), a confirmar en el simulador oficial antes de implementar.
- `T_servicio` = tarifa vigente por mensaje de servicio fuera de ventana (aplicable a partir del 1 de octubre de 2026), a confirmar antes de esa fecha.
- `T_marketing` = tarifa vigente por mensaje de marketing entregado (México); fuera del alcance inicial del MVP, se incluye solo como referencia para el modelo de costos.
- `T_autenticacion` = tarifa vigente por mensaje de autenticación (México); no aplica a los flujos iniciales del CRM.

### 11.5 Escenarios parametrizados

| Escenario | Pedidos/mes estimados | Mensajes de utilidad por pedido (aprox.) | Costo mensual estimado |
|---|---|---|---|
| Bajo | ~30 | ~3 (recibido, confirmado, listo) | 30 × 3 × `T_utilidad` |
| Medio | ~100 | ~4 (recibido, confirmado, recordatorio, listo) | 100 × 4 × `T_utilidad` |
| Alto | ~300 | ~5 (recibido, confirmado, recordatorio de saldo, recordatorio de entrega, listo) | 300 × 5 × `T_utilidad` |

Los tres escenarios son ilustrativos para dimensionar el orden de magnitud del gasto, no una proyección comercial comprometida. El monto real depende de la tarifa vigente al momento de operar, del volumen real de pedidos y de si se usa Cloud API directa o un BSP con cargos adicionales.

### 11.6 Control mensual y presupuesto

La implementación posterior deberá permitir, como mínimo:

- desglose mensual del gasto por pastelería (relevante si el CRM opera multi-tenant en el futuro), por categoría de mensaje, por estado de entrega y por cantidad de mensajes;
- una alerta o límite de presupuesto mensual configurable, para detectar desviaciones antes de que generen un costo inesperado;
- prohibición explícita de usar una tarifa histórica (por ejemplo, la vigente al 23 de julio de 2026) como precio permanente en cualquier cotización, presupuesto o cálculo de negocio: **toda tarifa debe reconfirmarse contra la fuente oficial de Meta antes de presupuestar, cotizar o implementar**, especialmente por el cambio anunciado para el 1 de octubre de 2026.

## 12. Riesgos y requisitos previos

- Consentimiento/opt-in del cliente antes de enviar cualquier plantilla.
- Cumplimiento de las políticas comerciales y de plantillas de Meta.
- Clasificación y aprobación de cada plantilla en la categoría correcta (riesgo de rechazo o recategorización automática a marketing si el contenido no es estrictamente no promocional).
- Confirmación de propiedad y acceso administrativo al número oficial de la pastelería.
- Verificación del negocio ante Meta (Business Manager), con tiempos no garantizados.
- Elegibilidad real de Coexistence para la cuenta y región, antes de comprometerse a esa ruta.
- Disponibilidad, seguridad y resiliencia del webhook productivo (no existe aún).
- Protección de datos personales de clientes (números telefónicos, contenido de mensajes) conforme a la normativa aplicable.
- Prevención de duplicados y control de reintentos en el envío y en el procesamiento de webhooks.
- Cambios de precio ya anunciados para el 1 de octubre de 2026, con tarifas exactas aún no publicadas.
- Riesgo de bloqueo o degradación de calidad del número (Meta mide calidad y puede limitar o suspender un número con mala calidad de mensajería).
- Dependencia adicional de un BSP, si se llegara a elegir esa alternativa.
- Necesidad de observabilidad y soporte operativo continuo una vez en producción.

## 13. Fuera de alcance de esta issue

Quedan expresamente fuera de esta issue:

- conectar la API de WhatsApp;
- crear plantillas reales en Meta Business Manager;
- enviar mensajes reales a clientes;
- crear o desplegar un webhook productivo;
- implementar un chatbot;
- implementar IA conversacional libre o abierta;
- campañas o mensajes de marketing;
- automatizar respuestas abiertas sin supervisión;
- modificar las reglas actuales del CRM (pedidos, pagos, disponibilidad, eliminación).

## 14. Plan de implementación posterior por fases (sin código)

1. **Validación comercial y del número**: confirmar propiedad del número, decidir Coexistence vs. número dedicado (sección 6), completar verificación de negocio ante Meta.
2. **Entorno de prueba**: habilitar una cuenta/número de prueba (sandbox o número dedicado no productivo) para validar el flujo sin afectar clientes reales.
3. **Plantillas**: redactar, someter a aprobación y dar seguimiento al estado de las plantillas conceptuales de la sección 8 en Meta Business Manager.
4. **Adaptador de proveedor**: diseñar una capa de abstracción interna (puerto/adaptador) entre la lógica de pedidos del CRM y el proveedor de mensajería, de modo que el código de negocio invoque una interfaz propia ("enviar notificación de pedido") en lugar de llamar directamente al SDK o a los endpoints de Meta. Esto permite migrar entre Cloud API directa y un BSP —o cambiar de BSP— sin reescribir la lógica de pedidos. Es una decisión arquitectónica que se documenta aquí; su implementación corresponde a una issue posterior.
5. **Envío controlado**: implementar el envío real solo para el entorno de prueba, con idempotencia y control de duplicados desde el diseño inicial.
6. **Webhook y trazabilidad**: implementar el endpoint de webhooks (sección 10) y asociar cada evento a su pedido de origen.
7. **Piloto**: operar con un subconjunto reducido y controlado de pedidos reales, con monitoreo activo de costos, calidad del número y entregabilidad.
8. **Producción y monitoreo**: escalar al resto de la operación solo después de validar el piloto, con presupuesto, alertas y observabilidad ya definidos (sección 11.6).

## 15. Criterios para reconsiderar la decisión

La decisión de usar Cloud API directa debe reabrirse si, durante la implementación:

- la verificación de negocio o la elegibilidad de Coexistence se bloquean sin una ruta clara de solución;
- el número oficial de la pastelería no puede vincularse de forma viable ni siquiera con un número dedicado;
- el costo real de mantener la integración directa (tiempo de desarrollo, mantenimiento, soporte de incidentes) supera de forma sostenida el costo estimado de contratar un BSP;
- surge un requisito contractual, regulatorio o comercial que exija soporte especializado de un tercero;
- las tarifas confirmadas para el 1 de octubre de 2026 (u otro cambio posterior) alteran significativamente la viabilidad económica del modelo directo.

Cualquier cambio de decisión debe documentarse formalmente, no aplicarse como un ajuste silencioso durante el desarrollo.

## 16. Conclusión ejecutiva

Para el MVP del CRM Pastelería, se recomienda construir la integración de WhatsApp sobre Cloud API directa de Meta, priorizando control técnico, trazabilidad por pedido y evitar una dependencia o mensualidad adicional de un BSP, siempre detrás de una capa de abstracción interna que preserve la posibilidad de migrar de proveedor. Esta recomendación es condicionada a que no aparezcan bloqueos materiales de verificación, elegibilidad de Coexistence, costo operativo o requisitos contractuales, en cuyo caso un BSP queda disponible como alternativa documentada. Ninguna tarifa de este documento debe tratarse como definitiva: el modelo de precios vigente al 23 de julio de 2026 coexiste con un cambio ya anunciado por Meta para el 1 de octubre de 2026, con tarifas exactas aún no publicadas, por lo que toda cotización o presupuesto debe reconfirmarse contra la fuente oficial antes de implementar.

## 17. Fuentes oficiales (consultadas el 23 de julio de 2026)

- https://whatsappbusiness.com/products/platform-pricing/
- https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing
- https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages
- https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform
- https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization
- https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview
- https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users

Documentos internos relacionados consultados:

- `README.md`
- `docs/documento-maestro-crm-pasteleria.md`
- `docs/politica-eliminacion-datos-reales-whatsapp.md`
- `docs/ESTRUCTURA.md`
- `docs/decision-auth-sprint-1.md` (referencia de formato de decisión técnica previa)

## 18. Registro de validación del equipo

| Rol | Nombre | Estado | Fecha |
|---|---|---|---|
| Producto / negocio | Pendiente de asignar | Pendiente de revisión | — |
| Técnico | Pendiente de asignar | Pendiente de revisión | — |

Ninguna aprobación se da por hecha en este documento. La validación formal del equipo queda pendiente y debe registrarse aquí una vez ocurra, con nombre real y fecha.
