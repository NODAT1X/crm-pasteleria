# QA de cierre — Sprint 4 Bloques 1 y 2

## 1. Información general

| Campo | Detalle |
|---|---|
| Documento | QA de cierre Sprint 4 — Bloques 1 y 2 |
| Proyecto | CRM Pastelería Nodatix |
| Sprint | Sprint 4 |
| Bloques cubiertos | Bloque 1 y Bloque 2 |
| Responsable funcional | J0SU3-52 |
| Apoyo | brayan3521110695, miguelazaro |
| Tipo | docs / qa |
| Estado | Cierre QA funcional y técnico |
| Resultado | GO con observaciones no bloqueantes |

---

## 2. Propósito

Este documento concentra la evidencia funcional y técnica de los Bloques 1 y 2 del Sprint 4.

Su objetivo es dejar registro claro de que el avance del sprint fue validado de forma controlada antes de continuar con el siguiente bloque o fase del proyecto.

Este documento evita depender de mensajes de chat, memoria del equipo o evidencia dispersa en PRs individuales.

---

## 3. Alcance del QA

Este cierre QA cubre los siguientes frentes:

- estabilización técnica de pagos, anticipos e infraestructura;
- política MVP de eliminación, cancelación y ocultamiento de pedidos;
- eliminación definitiva de pedidos desde listado;
- reorganización operativa del detalle de pedido;
- reglas funcionales de disponibilidad;
- bloqueo de horarios para entregas a domicilio;
- diferencia entre entrega a domicilio y recolección en sucursal;
- consulta de disponibilidad desde formulario;
- comportamiento al editar, cancelar o eliminar pedidos;
- vista diaria de entregas;
- vista semanal de entregas;
- filtros operativos por estado y tipo de entrega;
- agenda de próximos pedidos;
- navegación desde calendario o agenda hacia el detalle del pedido.

---

## 4. Fuera de alcance

Este documento no incluye:

- ejecución de nuevas pruebas automatizadas;
- corrección de bugs nuevos;
- implementación de funciones del Sprint 5;
- documentación comercial;
- manual de usuario final;
- reescritura de decisiones funcionales ya aprobadas;
- cambio de roadmap funcional;
- drag and drop para reprogramar entregas;
- notificaciones automáticas;
- rutas de reparto;
- asignación de repartidores;
- capacidad máxima diaria;
- reglas avanzadas por zona, distancia o complejidad.

---

## 5. PRs e issues relevantes

### Bloque 1 — Estabilización, eliminación y detalle de pedido

| PR | Tema | Resultado |
|---|---|---|
| #149 | Política MVP de eliminación, cancelación y ocultamiento de pedidos | Aprobado |
| #150 | Corrección de error en anticipo menor al 50% y manejo de errores de transacción | Aprobado |
| #151 | Manejo de errores de infraestructura en flujos de pedidos, pagos y clientes | Aprobado |
| #153 | Eliminación de pedidos desde listado | Aprobado |
| #154 | Reordenamiento de detalle de pedido por jerarquía operativa | Aprobado |
| #155 | Release de cierre del Bloque 1 hacia `main` | Integrado |

### Bloque 2 — Disponibilidad, calendario, agenda y navegación

| PR | Tema | Resultado |
|---|---|---|
| #166 | Reglas funcionales de disponibilidad para calendario operativo | Aprobado |
| #167 | Bloqueo de ventanas ocupadas para entregas a domicilio | Aprobado |
| #168 | Diferenciación funcional entre domicilio y recolección | Aprobado |
| #169 | QA de disponibilidad al editar/cancelar pedido | Aprobado |
| #170 | Disponibilidad visible en formulario de pedido | Aprobado |
| #171 | Vista diaria de entregas | Aprobado |
| #172 | Vista semanal de entregas | Aprobado |
| #173 | Filtros del calendario operativo | Aprobado |
| #174 | Agenda de próximos pedidos | Aprobado |
| #175 | Apertura del detalle desde calendario y agenda | Aprobado |
| #176 | Release de cierre del Bloque 2 hacia `main` | Integrado |

---

## 6. Validaciones funcionales — Bloque 1

### 6.1 Estabilización de anticipos y transacciones

Se validó que el flujo relacionado con anticipos y transacciones financieras quedara estable después de los errores detectados al cierre del Sprint 3.

Validaciones cubiertas:

- corrección del error técnico al registrar o validar anticipos menores al 50%;
- manejo controlado de errores de transacción;
- manejo de errores de infraestructura y conexión;
- protección de flujos de pedidos, pagos y clientes ante errores no esperados;
- reducción de fallos visibles para el usuario administrador.

Resultado:

```txt
Validación aprobada.
```

### 6.2 Política MVP de eliminación de pedidos

Se aprobó la política funcional para diferenciar eliminar, cancelar y ocultar pedidos.

Validaciones cubiertas:

- eliminación permitida para pedidos de prueba, duplicados o capturados por error;
- cancelación reservada para pedidos reales que ya no se realizarán;
- eliminación permitida con confirmación simple cuando no hay movimientos financieros;
- eliminación permitida con confirmación fuerte cuando hay movimientos financieros;
- eliminación definitiva como decisión MVP;
- soft delete y archivo quedan fuera de alcance.

Resultado:

```txt
Política funcional aprobada.
```

### 6.3 Eliminación de pedidos desde listado

Se validó la implementación de eliminación desde el listado de pedidos.

Validaciones cubiertas:

- botón visible de eliminar en listado;
- confirmación simple para pedidos sin movimientos;
- confirmación reforzada para pedidos con movimientos o estados sensibles;
- eliminación transaccional de:
  - movimientos financieros relacionados;
  - items del pedido;
  - pedido;
- conservación del cliente;
- conservación de otros pedidos del mismo cliente;
- desaparición del pedido eliminado del listado;
- desaparición del pedido eliminado del historial del cliente;
- manejo de errores controlados.

Resultado:

```txt
Validación aprobada.
```

### 6.4 Detalle de pedido por jerarquía operativa

Se validó la reorganización de la pantalla de detalle del pedido.

Validaciones cubiertas:

- encabezado con cliente, estado, fecha, hora y tipo de entrega;
- resumen financiero visible en zona prioritaria;
- total, pagado, saldo pendiente y estado de pago visibles;
- separación entre acciones del pedido y acciones de pago;
- información de entrega y cliente en secciones claras;
- productos e historial financiero conservados;
- navegación hacia edición y listado;
- visualización correcta de acciones disponibles y no disponibles.

Resultado:

```txt
Validación aprobada.
```

---

## 7. Validaciones funcionales — Bloque 2

### 7.1 Reglas de disponibilidad

Se validaron y documentaron las reglas funcionales de disponibilidad para el calendario operativo.

Reglas validadas:

- entrega a domicilio bloquea disponibilidad;
- la ventana operativa es de 30 minutos;
- la hora seleccionada representa el inicio de la ventana;
- cotización con domicilio sí bloquea disponibilidad;
- cotización con domicilio no bloquea el día completo;
- cotización con domicilio no bloquea una hora completa;
- recolección en sucursal no bloquea disponibilidad;
- pedidos cancelados no bloquean disponibilidad;
- pedidos entregados no bloquean disponibilidad;
- pedidos eliminados no bloquean disponibilidad porque ya no existen.

Resultado:

```txt
Reglas aprobadas como contrato funcional.
```

### 7.2 Bloqueo de horarios para domicilio

Se validó la lógica backend para bloquear ventanas ocupadas de entrega a domicilio.

Validaciones cubiertas:

- bloqueo de ventana de 30 minutos;
- interpretación de hora seleccionada como inicio de ventana;
- exclusión de pedidos cancelados;
- exclusión de pedidos entregados;
- exclusión de pedidos eliminados;
- exclusión de pedidos de otra pastelería;
- no bloqueo de día completo;
- no bloqueo de una hora completa;
- no implementación de capacidad diaria avanzada;
- no implementación de rutas o repartidores.

Resultado:

```txt
Validación aprobada.
```

### 7.3 Domicilio vs recolección

Se validó la diferencia funcional entre entrega a domicilio y recolección en sucursal.

Validaciones cubiertas:

- domicilio ocupa ventana operativa de reparto;
- recolección en sucursal puede compartir horario;
- mensajes de ayuda diferenciados en formulario;
- visualización del tipo de entrega en listado;
- coexistencia visual de domicilio y recolección;
- backend mantiene domicilio como único tipo bloqueante.

Resultado:

```txt
Validación aprobada.
```

### 7.4 Disponibilidad en formulario

Se validó la disponibilidad visible desde el formulario de pedido.

Validaciones cubiertas:

- consulta automática al seleccionar fecha, hora y domicilio;
- estados visuales de espera, consulta, disponible, conflicto, error y recolección compartida;
- bloqueo temporal de envío mientras se consulta disponibilidad;
- bloqueo cuando existe conflicto conocido;
- prevención de respuestas asíncronas obsoletas;
- edición de pedido sin autoconflicto mediante `pedido_id`;
- backend como fuente definitiva al guardar;
- cotización con domicilio bloquea correctamente;
- recolección permite horario compartido;
- no se bloquea el día completo.

Resultado:

```txt
Validación aprobada.
```

### 7.5 Vista diaria de entregas

Se validó la vista diaria de entregas en `/entregas`.

Validaciones cubiertas:

- consulta por fecha específica;
- navegación por día anterior, hoy y día siguiente;
- pedidos ordenados por hora;
- visualización de cliente, estado, tipo de entrega y saldo pendiente;
- diferenciación visual entre domicilio y recolección;
- navegación al detalle del pedido;
- estado vacío cuando no hay pedidos;
- uso de fecha local operativa de México.

Resultado:

```txt
Validación aprobada.
```

### 7.6 Vista semanal de entregas

Se validó la vista semanal de entregas en `/entregas/semana`.

Validaciones cubiertas:

- agrupación de pedidos de lunes a domingo;
- visualización de siete días aunque existan días vacíos;
- navegación por semana anterior, actual y siguiente;
- selector entre vista diaria y semanal;
- conservación de fecha seleccionada;
- una sola consulta por rango semanal;
- aislamiento por tenant;
- apertura del detalle desde la vista semanal;
- diseño responsive.

Resultado:

```txt
Validación aprobada.
```

### 7.7 Filtros del calendario operativo

Se validaron filtros por estado y tipo de entrega.

Validaciones cubiertas:

- filtros por estado en vista diaria;
- filtros por tipo de entrega en vista diaria;
- filtros equivalentes en vista semanal;
- persistencia en URL mediante `estado` y `tipo`;
- limpieza de filtros sin perder fecha seleccionada;
- conservación de filtros al cambiar entre día y semana;
- visualización de pedidos cancelados o entregados solo con filtro explícito;
- exclusión de pedidos eliminados por hard delete.

Resultado:

```txt
Validación aprobada.
```

### 7.8 Agenda de próximos pedidos

Se validó la sección de próximos pedidos dentro de `/pedidos`.

Validaciones cubiertas:

- visualización de pedidos activos próximos;
- límite de pedidos próximos más cercanos;
- agrupación por fecha;
- orden correcto por hora;
- visualización de hora, cliente, tipo de entrega, estado y saldo pendiente;
- exclusión de pedidos cancelados;
- navegación al detalle;
- navegación al calendario;
- estado vacío cuando no hay próximos pedidos;
- aislamiento por pastelería.

Resultado:

```txt
Validación aprobada.
```

### 7.9 Flujo calendario / agenda → detalle

Se validó el flujo operativo completo:

```txt
calendario / agenda → detalle de pedido → acción operativa
```

Validaciones cubiertas:

- apertura de detalle desde vista diaria;
- apertura de detalle desde vista semanal;
- apertura de detalle desde próximos pedidos;
- navegación a la ruta existente `/pedidos/[id]`;
- texto visible `Abrir detalle` en tarjetas clicables;
- `aria-label` para accesibilidad;
- conservación de jerarquía operativa del detalle;
- regreso a la vista anterior mediante navegación del navegador;
- filtros existentes continúan funcionando;
- pedidos eliminados no aparecen como enlaces.

Resultado:

```txt
Validación aprobada.
```

---

## 8. Validaciones técnicas registradas

Durante los PRs del bloque se reportaron o ejecutaron las siguientes validaciones:

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run dev
```

Resultado consolidado:

| Validación | Estado |
|---|---|
| TypeScript | OK |
| ESLint | OK |
| Build | OK |
| Validación manual en navegador | OK |
| QA funcional por flujo | OK |

No se registran cambios de esquema de base de datos como parte del cierre de Bloques 1 y 2.

---

## 9. Evidencia visual

La evidencia visual se encuentra distribuida en las validaciones manuales y capturas anexadas o revisadas durante los PRs individuales.

Evidencia esperada/conservada:

- captura del listado con eliminación de pedidos;
- captura de confirmación simple o fuerte de eliminación;
- captura del detalle reorganizado;
- captura de disponibilidad en formulario;
- captura de vista diaria de entregas;
- captura de vista semanal de entregas;
- captura de filtros del calendario operativo;
- captura de próximos pedidos;
- captura del detalle abierto desde calendario o agenda.

Nota:

```txt
Si alguna captura no quedó adjunta directamente en el repositorio, el PR individual y la validación manual registrada funcionan como evidencia funcional mínima.
```

---

## 10. Observaciones no bloqueantes

### 10.1 Warning de Next.js / Turbopack por múltiples lockfiles

Durante `npm run build` se ha observado un warning no bloqueante relacionado con múltiples archivos `package-lock.json` en el entorno local.

Ejemplo de rutas reportadas:

```txt
C:\Users\Userss\package-lock.json
C:\Users\Userss\Documents\Nodatix\crm-pasteleria\package-lock.json
```

Impacto:

```txt
No bloquea el build.
```

Recomendación:

```txt
Revisar posteriormente la configuración de root de Turbopack o limpiar el lockfile externo si no corresponde al proyecto.
```

### 10.2 Pruebas automatizadas

El proyecto no cuenta todavía con una suite formal de pruebas automatizadas para estos flujos.

Impacto:

```txt
No bloquea el cierre de Bloques 1 y 2 porque se realizó QA manual funcional y validación técnica.
```

Recomendación:

```txt
Evaluar pruebas automatizadas en una fase posterior cuando los flujos principales estén más estables.
```

### 10.3 Alcance avanzado de calendario

Quedan fuera de Sprint 4 Bloques 1 y 2:

- capacidad máxima diaria;
- rutas de reparto;
- repartidores;
- drag and drop;
- optimización geográfica;
- reglas por distancia o zona.

Impacto:

```txt
No bloquea el cierre del bloque porque fueron decisiones explícitas fuera de alcance.
```

---

## 11. Riesgos

| Riesgo | Severidad | Estado | Mitigación |
|---|---|---|---|
| Dependencia de QA manual | Media | No bloqueante | Mantener documentación de pruebas por PR. |
| Warning de múltiples lockfiles | Baja | No bloqueante | Revisar en tarea técnica futura. |
| Reglas avanzadas de calendario fuera de alcance | Baja | Controlado | Documentadas como futuras. |
| Evidencia visual dispersa | Media | No bloqueante | Este documento consolida referencias funcionales. |

---

## 12. Pendientes recomendados

Pendientes no bloqueantes para fases posteriores:

- evaluar suite mínima de pruebas automatizadas;
- revisar warning de múltiples `package-lock.json`;
- conservar capturas clave en el repositorio si el equipo decide versionar evidencia visual;
- revisar documentación final del Sprint 4 completo al cierre del Bloque 3;
- actualizar el Documento Maestro si alguna regla del Sprint 4 se vuelve parte estable del producto.

---

## 13. Veredicto de cierre QA

Resultado:

```txt
GO con observaciones no bloqueantes
```

Motivo:

- Los flujos principales de Bloques 1 y 2 fueron implementados y validados.
- No existen bugs bloqueantes documentados para impedir la continuidad.
- El build y lint fueron reportados como correctos.
- Las observaciones existentes no impiden usar el sistema ni continuar el Sprint 4.
- Los puntos pendientes corresponden a mejoras técnicas, evidencia documental o alcance futuro.

Decisión:

```txt
Sprint 4 Bloques 1 y 2 quedan funcionalmente cerrados y aptos para continuar con el siguiente bloque/fase.
```

---

## 14. Comentario de aprobación funcional sugerido

```txt
Se revisa y aprueba el cierre QA de Sprint 4 Bloques 1 y 2.

El bloque consolida estabilización técnica, eliminación de pedidos, reorganización del detalle, reglas de disponibilidad, formulario con disponibilidad, calendario diario/semanal, filtros, próximos pedidos y navegación hacia el detalle.

Resultado: GO con observaciones no bloqueantes.

Las observaciones registradas no impiden continuar con el siguiente bloque del sprint.
```