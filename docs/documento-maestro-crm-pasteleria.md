# Documento Maestro — CRM Pastelería Nodatix

## 1. Estado del documento

Este documento es la fuente normativa principal para la visión funcional, el alcance y las decisiones generales del CRM Pastelería Nodatix.

Consolida el estado verificable del producto al cierre de Sprint 4 y establece la base de planeación funcional y técnica previa al inicio de Sprint 5. Las reglas especializadas conservan su detalle en los documentos relacionados de cada módulo; cuando exista una regla más específica aprobada, debe interpretarse en conjunto con este Documento Maestro y sin contradecirlo.

| Campo | Valor |
|---|---|
| Producto | CRM Pastelería Nodatix |
| Tipo de documento | Documento Maestro funcional |
| Estado | Vigente |
| Corte funcional | Cierre de Sprint 4 |
| Siguiente enfoque | Sprint 5 — Automatización de pedidos y seguimiento por WhatsApp |
| Ruta oficial | `docs/documento-maestro-crm-pasteleria.md` |

Este documento no es un manual comercial ni un manual final de usuario.

## 2. Propósito del Documento Maestro

El propósito de este documento es:

- mantener una visión común del producto;
- delimitar el alcance funcional vigente;
- identificar los actores y sus responsabilidades;
- consolidar las reglas funcionales aprobadas;
- distinguir funcionalidades implementadas, planeadas y fuera de alcance;
- orientar la planeación de nuevas issues sin crear reglas por inferencia;
- servir como referencia de producto para el equipo Nodatix;
- establecer el punto de partida de Sprint 5.

Este documento no sustituye la evidencia de QA, las reglas detalladas por módulo, la documentación de autorización, las normas de Git ni las guías de entorno local.

## 3. Visión del producto

CRM Pastelería Nodatix es una aplicación web interna de tipo back-office para una pastelería o negocio de repostería.

Su objetivo es centralizar la operación diaria del negocio para que el administrador pueda controlar desde un solo sistema:

- clientes;
- pedidos personalizados;
- pagos, anticipos y abonos;
- saldos pendientes;
- movimientos financieros;
- entregas;
- disponibilidad;
- agenda operativa.

El producto prioriza la trazabilidad operativa y la consistencia de las reglas del negocio. No se define en esta etapa como una plataforma general de comercio electrónico ni como un SaaS completo.

## 4. Naturaleza del sistema

El sistema es un back-office administrativo con acceso restringido. La captura, consulta y actualización de la información operativa se realiza actualmente por el usuario administrador de la pastelería.

La aplicación funciona sobre información persistida en base de datos y aplica reglas del lado servidor para proteger el acceso, aislar la información por pastelería y derivar datos sensibles como el total pagado y el saldo pendiente.

La arquitectura funcional vigente corresponde a un MVP en desarrollo activo. El sistema resuelve la operación básica de clientes, pedidos, pagos y calendario, pero todavía no cubre procesos empresariales avanzados, venta autoservicio ni administración completa de una plataforma SaaS.

## 5. Actores del producto

### 5.1 Dueño o administrador de la pastelería

Es el usuario funcional activo del CRM. Registra y consulta clientes, administra pedidos, captura movimientos financieros, cambia estados, gestiona cancelaciones o eliminaciones y consulta la agenda de entregas.

También conserva la responsabilidad de validar pedidos sensibles, pagos, cancelaciones y cambios que afecten la operación.

### 5.2 Cliente final

Es la persona que solicita el pedido, proporciona los datos necesarios, realiza pagos y recibe o recoge el producto.

El cliente final todavía no cuenta con un portal propio ni accede directamente al CRM. Su información y sus solicitudes son gestionadas por el administrador.

### 5.3 Equipo Nodatix

Es responsable del análisis, diseño, desarrollo, QA, documentación y evolución controlada del producto. Debe respetar las decisiones aprobadas, el aislamiento de datos, el flujo de ramas y los criterios de calidad del repositorio.

### 5.4 Sistema automatizado

Representa los procesos controlados que calculan, validan o apoyan la operación conforme a reglas explícitas del CRM. Entre ellos se encuentran los cálculos financieros derivados, la validación de disponibilidad y, de manera planeada para Sprint 5, los flujos guiados de automatización por WhatsApp.

El sistema automatizado no sustituye la decisión del administrador en operaciones sensibles.

## 6. Alcance funcional implementado al cierre de Sprint 4

Al cierre de Sprint 4 se consideran implementadas y verificables las siguientes capacidades:

- autenticación administrativa sin registro público;
- protección de rutas internas;
- aislamiento de información por pastelería;
- alta, edición, listado, búsqueda y detalle de clientes;
- registro, consulta, edición y detalle de pedidos personalizados;
- asociación de pedidos con clientes;
- items o artículos por pedido;
- manejo del ciclo de estados del pedido;
- registro e historial de pagos y otros movimientos financieros;
- cálculo backend de total pagado y saldo pendiente;
- anulación de movimientos financieros sin borrar su rastro;
- cancelación de pedidos;
- eliminación definitiva de pedidos bajo la política MVP;
- validación de disponibilidad para entregas a domicilio;
- calendario operativo diario;
- calendario operativo semanal;
- filtros de calendario por estado y tipo de entrega;
- agenda de próximos pedidos;
- navegación desde calendario y agenda hacia el detalle del pedido.

La implementación de este alcance no implica que existan los módulos declarados como planeados o fuera de alcance en la sección 16.

## 7. Módulos del CRM

### 7.1 Autenticación y autorización

Restringe el acceso a las rutas internas, valida la sesión en el servidor y obtiene el contexto administrativo de la pastelería.

### 7.2 Clientes

Permite administrar la información básica del cliente, buscarlo y consultar su ficha. La baja de clientes es lógica mediante su estado activo; no equivale a la eliminación definitiva de pedidos.

### 7.3 Pedidos

Permite registrar pedidos personalizados asociados a un cliente, conservar su detalle e items, definir fecha, hora y tipo de entrega, consultar su estado y ejecutar las acciones operativas aprobadas.

### 7.4 Pagos y movimientos financieros

Permite registrar anticipos, abonos y liquidaciones, consultar el historial financiero, derivar montos pagados y saldos, y anular movimientos registrados por error sin eliminarlos físicamente desde la interfaz.

### 7.5 Cancelación y eliminación

Distingue la cancelación de una operación real de la eliminación administrativa de pruebas, duplicados o errores. La eliminación definitiva es una decisión del MVP y requiere confirmación proporcional a la sensibilidad del pedido.

### 7.6 Disponibilidad y calendario operativo

Valida ventanas de entrega a domicilio, presenta vistas diaria y semanal, ofrece filtros operativos y permite navegar al detalle del pedido.

### 7.7 Agenda de próximos pedidos

Presenta los pedidos activos próximos agrupados por día, con datos operativos como hora, cliente, tipo de entrega, estado y saldo pendiente.

## 8. Reglas funcionales clave

Las siguientes decisiones son obligatorias para el alcance actual:

- todo pedido válido debe estar asociado a un cliente existente y activo;
- todo pedido inicia en estado `cotizacion`;
- el pedido debe contener al menos un item;
- la fecha y la hora de entrega son obligatorias;
- el total del pedido se forma a partir de sus items y conceptos aplicables;
- los cálculos de pago y saldo tienen al backend como fuente de verdad;
- el administrador es el único rol funcional activo en el MVP;
- la información del negocio siempre debe aislarse por pastelería;
- cancelar y eliminar son acciones diferentes y no deben usarse como equivalentes;
- la disponibilidad se determina por tipo de entrega, estado y ventana horaria;
- ninguna automatización futura puede omitir las validaciones vigentes de pedidos, pagos, disponibilidad o estados.

Las reglas de módulo con mayor detalle deben consultarse en la documentación relacionada de la sección 18.

## 9. Estados de pedido

El ciclo vigente utiliza los siguientes estados:

| Estado | Significado funcional |
|---|---|
| `cotizacion` | Estado inicial del pedido; representa una intención todavía no confirmada. |
| `confirmado` | Pedido aceptado para continuar su operación. |
| `en_preparacion` | Pedido activo en proceso de preparación. |
| `listo_para_entregar` | Pedido preparado y pendiente de entrega o recolección. |
| `entregado` | Pedido completado. |
| `cancelado` | Pedido real que ya no se realizará. |

El estado del pedido y el estado de pago son conceptos distintos. Un pedido puede quedar `entregado` con saldo pendiente si el administrador confirma la advertencia correspondiente.

Para disponibilidad, únicamente `cotizacion`, `confirmado`, `en_preparacion` y `listo_para_entregar` bloquean una ventana cuando el tipo de entrega es domicilio. Los estados `entregado` y `cancelado` no bloquean disponibilidad.

## 10. Reglas de pagos y saldo

### 10.1 Movimientos financieros

Cada operación financiera se registra como un movimiento asociado al pedido. El historial puede incluir pagos, devoluciones, retenciones y anulaciones conforme al flujo correspondiente.

Los pagos se clasifican operativamente como:

- `anticipo`: primer pago relacionado con la confirmación;
- `abono`: pago parcial posterior;
- `liquidacion`: pago final que cubre el saldo restante.

Los métodos de pago activos son:

- efectivo;
- transferencia.

### 10.2 Cálculos derivados

El total pagado se calcula con los movimientos válidos y aplicados del pedido. El saldo pendiente no se captura manualmente:

```txt
saldo pendiente = total del pedido - total pagado
```

El total pagado, el saldo pendiente y el estado de pago se derivan en backend.

### 10.3 Anulación

Un movimiento aplicado puede anularse con confirmación y motivo. El movimiento anulado deja de sumar al total pagado, pero permanece visible en el historial. Los movimientos financieros no deben borrarse físicamente desde la interfaz como mecanismo de corrección.

### 10.4 Entrega con saldo pendiente

Se permite marcar un pedido como entregado aunque tenga saldo pendiente, pero el sistema debe mostrar una advertencia clara y requerir confirmación. El estado de pago debe continuar reflejando el saldo pendiente.

### 10.5 Cancelación con pagos

Cuando se cancela un pedido con anticipo o pagos aplicados, se utiliza el flujo financiero aprobado:

- retención equivalente al 25 % del anticipo aplicado;
- devolución equivalente al total recibido menos la retención;
- registro de los movimientos correspondientes;
- conservación en el historial del pago original, la retención y la devolución;
- cambio del pedido a estado `cancelado`.

La devolución registrada en el CRM es un registro interno; no implica integración bancaria ni pasarela de pago.

## 11. Reglas de cancelación y eliminación MVP

### 11.1 Cancelación

Cancelar se usa cuando el pedido representa una operación real que ya no se realizará. Aplica, por ejemplo, cuando el cliente cancela un pedido que ya tenía seguimiento, confirmación, preparación o pagos.

La cancelación conserva la información del pedido, el cliente, los productos y el historial financiero. Si no existen pagos, no requiere registrar retención ni devolución. Si existen pagos, debe seguirse el flujo financiero aprobado.

### 11.2 Eliminación definitiva

Eliminar se usa principalmente para:

- pedidos de prueba o ejemplo;
- pedidos duplicados;
- pedidos capturados por error;
- registros que el administrador decide retirar durante la operación MVP.

La eliminación definitiva está permitida en el MVP para pedidos en cualquier estado:

- sin movimientos financieros, mediante confirmación simple;
- con movimientos financieros o en estados sensibles, mediante confirmación fuerte.

La eliminación debe ejecutarse como una unidad completa y consistente:

- pedido;
- items del pedido;
- movimientos financieros relacionados.

No deben quedar movimientos huérfanos ni deben afectarse el cliente u otros pedidos del mismo cliente.

La eliminación actual es hard delete. El soft delete, archivo u ocultamiento histórico formal quedan fuera del alcance actual.

## 12. Reglas de disponibilidad y calendario operativo

La disponibilidad vigente se rige por estas reglas:

- solo los pedidos con entrega a domicilio pueden bloquear disponibilidad;
- la recolección en sucursal no bloquea y puede compartir horario;
- cada domicilio bloqueante ocupa una ventana fija de 30 minutos;
- la hora seleccionada es el inicio de la ventana;
- la ventana termina 30 minutos después y no bloquea el día completo;
- una cotización con domicilio sí bloquea su ventana;
- los pedidos a domicilio `confirmado`, `en_preparacion` y `listo_para_entregar` también bloquean;
- los pedidos `entregado` y `cancelado` no bloquean;
- los pedidos eliminados no bloquean porque ya no existen;
- al editar un pedido, la validación debe excluir al propio pedido para evitar un falso conflicto;
- al cambiar fecha, hora, tipo de entrega o estado, la siguiente consulta refleja la nueva situación operativa.

La regla puede resumirse así:

```txt
bloquea disponibilidad =
  tipo de entrega: domicilio
  + estado: cotizacion | confirmado | en_preparacion | listo_para_entregar
  + ventana: [hora seleccionada, hora seleccionada + 30 minutos)
```

No existe capacidad diaria avanzada. Tampoco existen gestión de rutas, asignación de repartidores, optimización logística ni reprogramación por drag and drop.

El calendario operativo implementado incluye vista diaria, vista semanal, filtros por estado y tipo de entrega y navegación al detalle del pedido. La agenda muestra los próximos pedidos activos y no constituye un motor avanzado de planeación de producción.

## 13. Seguridad, autenticación y aislamiento por pastelería

El acceso interno utiliza Better Auth y no existe registro público. La sesión y el usuario se validan en el servidor; el middleware puede apoyar la experiencia de redirección, pero no es la fuente autoritativa de seguridad.

El contexto administrativo debe validar:

- sesión existente;
- usuario existente y activo;
- rol `admin`;
- asociación del usuario con una pastelería.

El identificador `pasteleria_id` se deriva exclusivamente de la sesión validada en el servidor. Está prohibido aceptar ese identificador desde query string, formularios, body, headers controlados por el cliente o props originadas en el frontend.

Toda consulta o escritura de datos del negocio debe filtrar por la pastelería del contexto administrativo. Esta regla aplica también a clientes, pedidos, movimientos financieros y consultas de disponibilidad.

El único rol funcional activo en el MVP es administrador. La gestión completa de usuarios y roles está planeada para una fase posterior.

## 14. WhatsApp en la visión del producto

WhatsApp será el enfoque funcional de Sprint 5. Su propósito será explorar la automatización de la entrada de pedidos y el seguimiento operativo, conectando la conversación guiada con las reglas vigentes del CRM.

La visión normativa para esta etapa es:

- usar un flujo guiado y controlado;
- capturar únicamente información definida y validable;
- conectar la interacción con pedidos existentes o con un flujo controlado de alta;
- respetar reglas de pedidos, pagos, disponibilidad y estados;
- mantener al administrador como responsable de validar pedidos sensibles y cambios operativos;
- evitar que la automatización tome decisiones no autorizadas.

En el estado actual no está implementada la API oficial de WhatsApp. Tampoco existe un chatbot libre con inteligencia artificial.

Sprint 5 no contempla marketing masivo, campañas publicitarias ni conversaciones autónomas abiertas. Cualquier integración técnica concreta deberá definirse, aprobarse y verificarse antes de documentarse como implementada.

## 15. Enfoque de Sprint 5

El enfoque planeado para Sprint 5 es:

```txt
Automatización de pedidos y seguimiento por WhatsApp
```

Este alcance está planeado y no debe interpretarse como implementado ni comprometido en su totalidad.

Los objetivos candidatos de planeación son:

- entrada guiada de pedidos desde WhatsApp;
- captura de datos mínimos necesarios;
- consulta o validación de disponibilidad;
- seguimiento del estado del pedido;
- mensajes operativos;
- conexión con pedidos existentes;
- apoyo al administrador.

Antes de desarrollar cada objetivo deberán definirse sus criterios de aceptación, límites, manejo de errores, permisos y relación con las reglas existentes. No se debe crear una automatización que evada la validación administrativa en operaciones sensibles.

## 16. Funcionalidades implementadas, planeadas y fuera de alcance

### 16.1 Implementadas

| Área | Capacidades |
|---|---|
| Acceso | Autenticación administrativa, protección de rutas y aislamiento por pastelería. |
| Clientes | Alta, edición, búsqueda, listado y detalle. |
| Pedidos | Alta, edición, listado, detalle, items, estados y tipos de entrega. |
| Finanzas | Anticipo, abono, liquidación, efectivo, transferencia, historial, saldo y anulación. |
| Acciones sensibles | Cancelación y eliminación definitiva MVP. |
| Disponibilidad | Validación de ventanas de 30 minutos para domicilio. |
| Operación | Calendario diario, calendario semanal, filtros, agenda y navegación al detalle. |

### 16.2 Planeadas o candidatas

Estas capacidades no están implementadas y requieren definición o aprobación antes de desarrollarse:

- automatización guiada de pedidos y seguimiento por WhatsApp;
- seguimiento manual por WhatsApp mediante enlaces y plantillas, según priorización;
- catálogo de productos frecuentes;
- dashboard operativo con indicadores;
- gestión completa de usuarios y roles.

### 16.3 Fuera de alcance actual

Quedan expresamente fuera del alcance actual:

- WhatsApp API oficial implementada;
- chatbot libre con inteligencia artificial;
- marketing masivo;
- campañas publicitarias desde el CRM;
- pasarelas de pago;
- facturación;
- multi-sucursal;
- rutas o repartidores;
- producción de cocina;
- inventario avanzado;
- aplicación móvil;
- portal de cliente final;
- SaaS completo con billing;
- drag and drop para calendario;
- capacidad diaria avanzada;
- reportes y auditoría financiera avanzados.

La presencia de una carpeta reservada, una referencia conceptual o un punto de roadmap no equivale a una funcionalidad implementada.

## 17. Roadmap funcional

| Etapa | Estado | Resultado funcional |
|---|---|---|
| Sprint 1 | Implementado | Base de autenticación administrativa, aislamiento por pastelería y clientes. |
| Sprint 2 | Implementado | Base operativa de pedidos personalizados y ciclo de estados. |
| Sprint 3 | Implementado | Pagos, movimientos financieros, total pagado, saldo y reglas de cancelación financiera. |
| Sprint 4 | Implementado | Estabilización, política de eliminación, disponibilidad, calendario, agenda y navegación operativa. |
| Sprint 5 | Planeado | Automatización de pedidos y seguimiento por WhatsApp mediante flujos guiados y controlados. |
| Fases posteriores | Sujetas a aprobación | Catálogo, dashboard, usuarios y roles u otras capacidades priorizadas. |

El roadmap expresa orientación funcional. No sustituye la creación de issues, la aprobación de alcance, el diseño técnico, el QA ni el flujo de Pull Requests.

## 18. Documentación relacionada

| Documento | Función |
|---|---|
| `README.md` | Estado técnico y funcional verificable del repositorio. |
| `docs/politica-pedidos-sprint-4.md` | Política aprobada de cancelación, eliminación y ocultamiento MVP. |
| `docs/reglas-disponibilidad-calendario-sprint-4.md` | Reglas detalladas de disponibilidad y calendario. |
| `docs/qa-cierre-sprint-4-bloques-1-2.md` | Evidencia consolidada de QA de Sprint 4, bloques 1 y 2. |
| `docs/qa-s4-010-disponibilidad-editar-cancelar-pedido.md` | Evidencia de disponibilidad al editar, cancelar, entregar o eliminar. |
| `docs/reglas-pagos-sprint-3.md` | Contrato funcional detallado de pagos, saldo, anulación, retención y devolución. |
| `docs/reglas-pedidos-sprint-2.md` | Reglas base de pedidos personalizados. |
| `docs/reglas-clientes-admin-sprint-1.md` | Reglas base de clientes y rol administrador. |
| `docs/AUTORIZACION.md` | Autorización, protección de rutas y aislamiento por pastelería. |
| `docs/REGLAS_GIT.md` | Flujo oficial de ramas, commits y Pull Requests. |
| `docs/checklist-qa-dod.md` | Criterios mínimos de QA y Definition of Done. |
| `docs/entorno-local.md` | Configuración y validación del entorno local. |

Si existe una diferencia aparente, debe revisarse la fecha, el alcance y el nivel de especialización de cada documento. No se debe resolver una contradicción inventando una regla nueva.

## 19. Criterios para actualizar este documento

Este Documento Maestro debe actualizarse cuando:

- se apruebe una nueva decisión funcional de alcance general;
- una funcionalidad planeada pase a estar implementada y verificable;
- cambie una regla que afecte a varios módulos;
- se cierre un sprint con impacto en la visión o el roadmap;
- se agregue o retire una exclusión relevante;
- cambien los actores, responsabilidades o límites del producto.

Toda actualización debe:

- estar respaldada por una issue, decisión aprobada, código verificable o evidencia de QA, según corresponda;
- distinguir claramente entre implementado, planeado y fuera de alcance;
- evitar promesas comerciales o funcionalidades no verificables;
- mantener consistencia con los documentos especializados;
- actualizar las referencias relacionadas cuando aplique;
- seguir `docs/REGLAS_GIT.md` y `docs/checklist-qa-dod.md`;
- excluir secretos, credenciales y datos productivos.

No debe actualizarse este documento para describir como vigente una propuesta todavía no aprobada.

## 20. Veredicto funcional

Al cierre de Sprint 4, CRM Pastelería Nodatix dispone de una base operativa verificable para administrar clientes, pedidos personalizados, movimientos financieros, saldos, cancelaciones, eliminaciones, disponibilidad y agenda de entregas con aislamiento por pastelería.

El producto sigue siendo un back-office administrativo de MVP. No ofrece portal para cliente final, WhatsApp API oficial, chatbot libre con IA ni las demás capacidades declaradas fuera de alcance.

El siguiente enfoque funcional es Sprint 5: automatización de pedidos y seguimiento por WhatsApp. Este trabajo debe planearse como una extensión guiada y controlada del CRM, subordinada a las reglas ya aprobadas y a la validación del administrador.

Con esta consolidación, el Documento Maestro queda apto como fuente base para la planeación funcional y técnica de Sprint 5.
