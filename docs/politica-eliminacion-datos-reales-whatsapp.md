# Política de eliminación para datos reales y pedidos originados por WhatsApp

## 1. Propósito

Esta política define criterios funcionales y operativos para decidir cuándo eliminar definitivamente un pedido y cuándo conservarlo mediante cancelación, con atención especial a:

- datos de pruebas internas;
- datos de demostración;
- operación con clientes reales;
- pedidos que en el futuro puedan originarse desde WhatsApp;
- pedidos con movimientos financieros reales;
- barreras necesarias antes de operar en un contexto real.

Su objetivo es conservar la flexibilidad necesaria durante el MVP sin trasladar de forma automática a la operación real una práctica de eliminación concebida principalmente para pruebas, duplicados y errores de captura.

Este documento no modifica el comportamiento actual del sistema. Define una política para la planeación funcional de Sprint 5 y para la evaluación del riesgo previo a una operación real.

## 2. Contexto

Durante Sprint 4 se implementó la eliminación definitiva de pedidos como una decisión del MVP. El sistema actual permite eliminar un pedido junto con sus items y movimientos financieros relacionados, con confirmación simple o reforzada según su sensibilidad.

Esta capacidad respondió a necesidades propias del desarrollo y la validación:

- retirar pedidos de prueba;
- limpiar datos usados para QA;
- corregir capturas erróneas;
- eliminar duplicados;
- evitar registros huérfanos al eliminar.

El producto sigue en desarrollo activo como MVP. La documentación vigente no confirma una operación productiva con clientes reales ni una integración implementada con WhatsApp. La API oficial de WhatsApp y un chatbot libre con inteligencia artificial no forman parte del estado actual.

Sprint 5 plantea como enfoque funcional la automatización guiada de pedidos y el seguimiento por WhatsApp. Antes de que un canal externo pueda originar solicitudes reales, es necesario distinguir la limpieza de datos de prueba de la conservación de trazabilidad operativa y financiera.

## 3. Relación con la política MVP de Sprint 4

Esta política complementa, pero no revoca ni contradice, `docs/politica-pedidos-sprint-4.md`.

La política de Sprint 4 mantiene vigentes estas decisiones para el MVP actual:

- existe eliminación definitiva o hard delete;
- los pedidos sin movimientos financieros pueden eliminarse con confirmación simple;
- los pedidos con movimientos financieros pueden eliminarse con confirmación fuerte;
- la eliminación remueve como una sola unidad el pedido, sus items y sus movimientos relacionados;
- cancelar se utiliza cuando una operación real ya no se realizará;
- archivo y soft delete no están implementados.

La presente política agrega una clasificación por contexto y origen para reducir el riesgo cuando los datos representen clientes, pagos o comunicaciones reales.

La existencia de esta política documental no significa que el sistema ya reconozca técnicamente datos de prueba, demo, operación real u origen WhatsApp. Tampoco significa que el hard delete ya esté restringido por esas categorías.

## 4. Problema de riesgo

La eliminación definitiva es irreversible dentro del CRM: el pedido deja de existir y desaparecen también sus items y movimientos financieros relacionados.

En pruebas internas, esta consecuencia es útil para limpiar información artificial. En operación real puede provocar pérdida de:

- evidencia de que existió una solicitud del cliente;
- historial del seguimiento operativo;
- relación entre el pedido y sus movimientos financieros;
- contexto para resolver aclaraciones o incidencias;
- evidencia de datos recibidos desde un canal externo;
- información necesaria para revisar errores de automatización.

El riesgo aumenta cuando el pedido contiene pagos reales, ya fue confirmado, tuvo preparación o entrega, o se originó a partir de una interacción real por WhatsApp.

La confirmación reforzada reduce el riesgo de una acción accidental, pero no sustituye la conservación de trazabilidad. Mientras el sistema mantenga hard delete sin archivo, soft delete o auditoría mínima, la prevención depende también de la clasificación correcta del escenario y de la responsabilidad del administrador.

## 5. Clasificación de escenarios

Antes de decidir una eliminación, el equipo o el administrador debe clasificar el registro:

| Clasificación | Definición | Criterio principal |
|---|---|---|
| Prueba interna | Registro creado durante desarrollo, QA o validación técnica, sin representar una operación real. | Puede limpiarse conforme a la política MVP. |
| Demo | Registro ficticio utilizado para mostrar el producto, sin clientes, pagos ni evidencia operativa reales. | Puede eliminarse si su naturaleza ficticia está confirmada. |
| Operación real | Pedido que representa una solicitud, intención de compra, seguimiento o transacción de un cliente real. | Debe preservarse; cancelar es la acción preferente si ya no se realizará. |
| WhatsApp de prueba | Registro futuro generado al probar internamente un flujo de WhatsApp con datos no reales. | Puede eliminarse como dato de prueba. |
| WhatsApp real | Registro futuro derivado de una solicitud o comunicación de un cliente real por WhatsApp. | Debe conservar trazabilidad; eliminar no es el flujo normal. |
| Error o duplicado | Registro creado por captura equivocada o repetición sin representar una operación adicional. | Puede evaluarse para eliminación, siempre que se descarte impacto real. |

La clasificación no debe basarse únicamente en el estado del pedido. Un pedido en `cotizacion` puede representar una solicitud real, y un pedido `confirmado` puede formar parte de una demo.

## 6. Política para pruebas internas

Se permite la eliminación definitiva de:

- pedidos de prueba;
- errores de captura;
- pedidos duplicados;
- datos usados para QA;
- registros generados durante desarrollo.

Esta regla mantiene la política MVP vigente.

Antes de eliminar se debe confirmar que el registro no representa:

- un cliente real;
- un pago real;
- una solicitud real;
- evidencia necesaria para una incidencia en análisis;
- un pedido real creado por error de automatización que deba investigarse.

Si la prueba contiene movimientos financieros ficticios, la eliminación sigue requiriendo confirmación fuerte y debe remover el pedido, sus items y sus movimientos como una unidad completa.

## 7. Política para demos

Se permite la eliminación definitiva de datos de demo siempre que se cumplan todas estas condiciones:

- no representan clientes reales;
- no representan pagos reales;
- no constituyen evidencia operativa real;
- no corresponden a una solicitud real recibida por un canal externo;
- el administrador entiende que la acción es irreversible.

La confirmación debe ser simple cuando no existen movimientos financieros y reforzada cuando existen movimientos ficticios o un estado sensible.

Si existe duda sobre si el dato de demo se mezcló con información real, no debe eliminarse hasta verificar su origen e impacto.

## 8. Política para operación real

En operación real, cancelar debe ser la acción preferente para pedidos reales que ya no se realizarán.

La cancelación conserva el pedido, la relación con el cliente, los productos y el historial financiero. Si existen pagos, debe aplicarse la cancelación financiera ya aprobada, sin modificar sus reglas de retención y devolución.

La eliminación definitiva de un pedido real debe considerarse excepcional. Solo debería permitirse cuando se cumplan todas estas condiciones:

- el pedido fue capturado por error antes de tener operación real;
- no tiene movimientos financieros reales;
- no proviene de un flujo automatizado confirmado;
- el administrador confirma explícitamente la eliminación;
- el entorno y la política operativa aplicable permiten el hard delete.

Un pedido real con seguimiento, confirmación, preparación, entrega, cancelación o comunicación relevante debe conservarse. El hecho de que un pedido no tenga pagos no elimina su valor de trazabilidad.

Estas restricciones son una política operativa recomendada y una condición previa a producción. El repositorio actual no demuestra que todas ellas estén aplicadas técnicamente.

## 9. Política para pedidos originados desde WhatsApp

WhatsApp es un enfoque planeado para Sprint 5; no se asume que su API, automatización o creación de pedidos ya estén implementadas.

Un pedido originado desde WhatsApp puede tener mayor valor de trazabilidad porque podría representar:

- una solicitud real del cliente;
- información capturada desde un canal externo;
- una conversación automatizada guiada;
- una intención de compra;
- seguimiento operativo;
- evidencia de comunicación.

Los pedidos originados desde WhatsApp no deben eliminarse como flujo normal cuando representen una solicitud real del cliente.

Se aplican los siguientes criterios:

- si fue una prueba interna del flujo con datos ficticios, puede eliminarse;
- si fue una demo con datos ficticios, puede eliminarse;
- si fue una solicitud real que no continuará, debe cancelarse bajo el modelo vigente;
- una eventual marca de “no concretado” requeriría definición e implementación futura, porque no forma parte de los estados actuales;
- si tiene movimientos financieros reales, la eliminación no debe ser una acción normal;
- si fue un duplicado creado por error desde WhatsApp, puede evaluarse su eliminación después de confirmar cuál registro conserva la trazabilidad real;
- si fue creado automáticamente con datos incompletos, debe evaluarse su conservación como `cotizacion` o su cancelación antes de eliminarlo.

Un eventual concepto técnico de borrador para capturas incompletas requiere una decisión futura. Este documento no crea un nuevo estado ni asume que ya existe.

La automatización futura debe conservar suficiente información de origen para que el administrador pueda distinguir una prueba, un duplicado y una solicitud real. Esta necesidad es un criterio de planeación, no una capacidad implementada.

## 10. Pedidos con movimientos financieros

Un pedido con pagos, anticipos, abonos, liquidaciones, retenciones o devoluciones reales no debe eliminarse como acción normal.

Si el pedido representa una operación real que ya no se realizará, debe utilizarse la cancelación financiera aprobada:

- calcular la retención conforme a la regla vigente;
- calcular la devolución correspondiente;
- registrar los movimientos financieros;
- conservar el historial;
- cambiar el pedido a `cancelado`.

Esta política no cambia la regla aprobada de retención del 25 % del anticipo aplicado ni la devolución del total recibido menos la retención.

El comportamiento técnico del MVP todavía permite hard delete de pedidos con movimientos financieros mediante confirmación fuerte. Mientras esa capacidad se mantenga, su uso sobre movimientos reales debe considerarse riesgoso, excepcional y sujeto a confirmación reforzada.

La confirmación reforzada debe advertir que también se eliminará el historial financiero asociado. No convierte la eliminación en una práctica recomendada para datos reales.

Los movimientos anulados permanecen sensibles porque forman parte del historial de correcciones. La anulación de un pago, por sí sola, no transforma un pedido real en dato de prueba.

## 11. Cuándo eliminar y cuándo cancelar

### Eliminar

Eliminar es apropiado cuando el registro no representa una operación real y su permanencia no aporta trazabilidad necesaria. Los casos principales son:

- pruebas internas;
- datos de QA;
- demos con información ficticia;
- duplicados;
- capturas erróneas sin operación real;
- registros ficticios creados al probar un futuro flujo de WhatsApp.

### Cancelar

Cancelar es apropiado cuando el pedido sí existió como solicitud u operación real, pero ya no se realizará. Debe preferirse cuando:

- el cliente realizó una solicitud real;
- existió seguimiento operativo;
- el pedido fue confirmado o avanzó en su preparación;
- existen pagos reales;
- se necesita registrar retención o devolución;
- el pedido proviene de una interacción real por WhatsApp.

La cancelación preserva el historial. La eliminación lo remueve definitivamente del CRM.

Cuando exista duda razonable sobre la naturaleza real del pedido, se debe conservar y revisar antes de eliminar.

## 12. Tabla de casos y decisiones

| Escenario | Origen | ¿Eliminar? | Acción preferente | Nivel de confirmación | Motivo |
|---|---|---|---|---|---|
| Pedido de prueba sin pagos | Interno / QA | Sí | Eliminar | Simple | No representa operación ni dinero real. |
| Pedido demo sin pagos | Demo | Sí, si se confirma que todos los datos son ficticios | Eliminar | Simple | Puede limpiarse sin perder trazabilidad real. |
| Pedido real sin pagos | Captura administrativa | Solo excepcionalmente si fue un error sin operación real | Cancelar | Reforzada si se autoriza eliminar | La solicitud real conserva valor operativo aunque no tenga pagos. |
| Pedido real con anticipo | Captura administrativa | No como acción normal | Cancelación financiera | Reforzada si el hard delete sigue temporalmente disponible | Deben conservarse el pago, la retención y la devolución. |
| Pedido real liquidado | Captura administrativa | No como acción normal | Conservar; cancelar solo si corresponde al flujo real | Reforzada si el hard delete sigue temporalmente disponible | La operación y sus movimientos tienen alta sensibilidad. |
| Pedido cancelado real | Captura administrativa | No como limpieza normal | Conservar cancelado | Reforzada si excepcionalmente se autoriza eliminar | La cancelación conserva evidencia de la operación real. |
| Pedido originado desde WhatsApp en prueba | WhatsApp de prueba | Sí | Eliminar | Simple sin movimientos; reforzada con movimientos ficticios | Es dato de validación del flujo, no solicitud real. |
| Pedido originado desde WhatsApp real sin pagos | WhatsApp real | No como flujo normal | Cancelar si no continuará; conservar como `cotizacion` mientras se evalúa | No aplica a eliminación normal | Conserva solicitud, intención y evidencia del canal. |
| Pedido originado desde WhatsApp real con pagos | WhatsApp real | No como acción normal | Cancelación financiera | Reforzada si el hard delete sigue temporalmente disponible | Combina trazabilidad del canal con movimientos financieros reales. |
| Pedido duplicado creado por error desde WhatsApp | WhatsApp | Sí, después de identificar el registro válido y confirmar que el duplicado no agrega operación real | Eliminar el duplicado | Reforzada | Debe conservarse el registro que contiene la trazabilidad válida. |
| Pedido incompleto capturado desde WhatsApp | WhatsApp | Depende de si fue prueba o solicitud real | Conservar como `cotizacion` o cancelar si fue real; eliminar si fue prueba | Reforzada ante duda | Los estados borrador o no concretado no existen actualmente y no deben asumirse. |

La columna “¿Eliminar?” expresa la política objetivo. No afirma que el sistema ya aplique técnicamente todos los bloqueos o clasificaciones.

## 13. Barrera previa a producción real

Antes de operar con clientes reales o con un flujo real de WhatsApp, el equipo debe decidir, documentar y validar al menos una combinación suficiente de estas opciones:

1. Mantener hard delete únicamente para pruebas internas y demos.
2. Restringir la eliminación de pedidos reales.
3. Agregar confirmación reforzada según el origen y la sensibilidad del pedido.
4. Implementar archivo o soft delete.
5. Implementar auditoría mínima de eventos sensibles.

Esta decisión debe acompañarse de criterios de aceptación y QA que comprueben la conducta seleccionada.

Mientras no se cierre esta barrera, la política MVP no debe interpretarse como autorización operativa general para eliminar datos reales. La flexibilidad técnica actual constituye un riesgo conocido que debe resolverse antes de afirmar que el producto está preparado para esa operación.

Esta issue solo documenta la barrera. No implementa ninguna de las opciones anteriores ni confirma que exista un entorno productivo real.

## 14. Recomendación de evolución futura

La evolución recomendada es separar técnicamente la limpieza de datos artificiales de la conservación de operaciones reales.

Las alternativas que deben evaluarse en futuras issues son:

- clasificación verificable del contexto del registro: prueba, demo u operación real;
- identificación del canal de origen cuando existan integraciones;
- restricción del hard delete según origen, estado y movimientos;
- confirmaciones reforzadas con mensajes específicos;
- archivo o soft delete para retirar pedidos de la operación sin perder su historial;
- auditoría mínima de acciones sensibles;
- tratamiento controlado de capturas incompletas, borradores o solicitudes no concretadas.

Ninguna de estas alternativas se considera implementada por estar mencionada en esta política. Cada una requiere definición funcional, análisis de datos, diseño técnico, implementación y QA.

La evolución no debe alterar por inferencia las reglas financieras ya aprobadas.

## 15. Fuera de alcance

Esta política no incluye:

- cambios de código;
- cambios en Prisma o base de datos;
- migraciones;
- implementación de soft delete o archivo;
- auditoría financiera completa;
- creación de nuevos estados de pedido;
- cambios a las reglas de cancelación financiera;
- integración con WhatsApp API oficial;
- chatbot libre con inteligencia artificial;
- marketing masivo;
- definición de un entorno productivo;
- implementación de controles por origen;
- recuperación de pedidos ya eliminados.

## 16. Veredicto funcional

La eliminación definitiva sigue siendo válida para pruebas internas, QA, demos ficticias, duplicados y errores que no representan una operación real.

Para pedidos reales, cancelar debe ser la acción preferente cuando la operación ya no se realizará. Los pedidos con movimientos financieros reales y las futuras solicitudes reales originadas desde WhatsApp requieren mayor conservación de trazabilidad y no deben eliminarse como flujo normal.

El hard delete implementado durante el MVP continúa siendo una capacidad vigente, pero su disponibilidad técnica no debe confundirse con una recomendación para datos reales. Mientras se mantenga, su uso sobre información sensible debe considerarse excepcional y riesgoso.

Antes de operar con clientes reales o WhatsApp real, el equipo debe cerrar la barrera definida en esta política y verificar técnicamente la opción elegida.

Con esta distinción, el equipo puede planear Sprint 5 sin afirmar que WhatsApp ya está implementado ni perder de vista el riesgo operativo asociado a la eliminación irreversible.
