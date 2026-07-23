# QA S5-004 — Protección de disponibilidad ante escrituras concurrentes

- **Issue:** #191 — S5-004
- **Rama:** `fix/s5-004-concurrencia-disponibilidad`
- **Rama base:** `develop`
- **Tipo:** fix / backend / concurrencia
- **Documento base:** [`docs/reglas-disponibilidad-calendario-sprint-4.md`](./reglas-disponibilidad-calendario-sprint-4.md)

---

## 1. Riesgo identificado

La validación de disponibilidad de entregas a domicilio (S4-008) y la escritura
del pedido ocurrían como **operaciones separadas**, sin una transacción común:

- **Crear:** `createPedidoService` leía los bloqueos (`findBloqueosDomicilioPorFecha`,
  un `SELECT`) y, por separado, insertaba el pedido (`createPedidoWithItems`).
- **Editar:** `updatePedidoService` validaba disponibilidad (un `SELECT`) **fuera**
  de la transacción de escritura de `updatePedidoWithItems`.

Esto abría una **condición de carrera read-then-write (TOCTOU)**:

```txt
Solicitud A: crea domicilio 4:15 p.m.   Solicitud B: crea domicilio 4:15 p.m.
  A: SELECT bloqueos -> ventana libre      B: SELECT bloqueos -> ventana libre
  A: INSERT pedido (OK)                     B: INSERT pedido (OK)  <-- doble reserva
```

Con aislamiento por defecto (Read Committed) ninguno de los dos `SELECT` ve el
`INSERT` no confirmado del otro, así que **ambas** escrituras podían empalmar dos
entregas a domicilio en la misma ventana de 30 minutos.

---

## 2. Estrategia elegida

**Advisory lock transaccional de PostgreSQL** (`pg_advisory_xact_lock`) por
**`pasteleriaId` + fecha operativa**, adquirido al inicio de una transacción que
luego: (1) toma el lock, (2) consulta bloqueos, (3) valida conflicto, (4) crea o
actualiza el pedido. Todo dentro de la MISMA transacción.

Por qué esta estrategia:

- **No requiere cambios de schema ni migrations:** los advisory locks son de
  runtime. Una `EXCLUDE` constraint sobre solapamiento de intervalos sí exigiría
  `btree_gist` + columnas generadas + migration (fuera de alcance).
- **Transaccional, no de sesión:** `pg_advisory_xact_lock` se libera solo al
  `COMMIT`/`ROLLBACK`; no puede quedar colgado y es seguro bajo el pooler de
  Supabase (un lock de sesión sí sería frágil con conexiones reutilizadas).
- **Por tenant + día, no global:** la clave deriva de `(pasteleriaId, día)`, así
  que solo se serializan escrituras de domicilio del mismo tenant y día; otros
  días, otros tenants y las recolecciones conservan su concurrencia.
- **No necesita `Serializable`** ni reintentos por `P2034`: el lock ya da
  exclusión mutua.

### Por qué elimina la carrera

El lock convierte el bloque leer-validar-escribir en una **sección crítica**
serial para el mismo `(tenant, día)`:

```txt
A: pg_advisory_xact_lock(k) -> SELECT (libre) -> INSERT -> COMMIT (libera lock)
B: pg_advisory_xact_lock(k)  ...espera a A...  -> SELECT (ve el pedido de A)
   -> detecta conflicto -> ROLLBACK con error funcional
```

Como B solo puede leer **después** de adquirir el lock (ya liberado por A tras su
`COMMIT`), el `SELECT` de B ya ve el pedido de A y detecta el conflicto. Resultado:
**un solo éxito y un rechazo**, incluso con Read Committed.

---

## 3. Qué se protege y qué NO cambia

- **Create domicilio:** `createPedidoService` envuelve validación + inserción en
  `conLockDisponibilidad(pasteleriaId, fecha, ...)`.
- **Update hacia domicilio:** `updatePedidoService` calcula el tipo/fecha/hora
  EFECTIVOS; si el pedido queda a domicilio, valida + escribe bajo el mismo lock,
  excluyéndose a sí mismo. Cubre también el cambio de `recoleccion` a `domicilio`.
- **Recolección:** no consume disponibilidad de reparto; se sigue creando/editando
  **sin lock**, conservando el horario compartido.
- **Cancelado / entregado / eliminado:** no bloquean. La consulta de bloqueos
  sigue filtrando por estados activos (`ESTADOS_BLOQUEAN_DISPONIBILIDAD`) y los
  eliminados no existen (hard delete S4-005). El lock no cambia esa regla.
- **Regla de ventana de 30 minutos:** intacta (`disponibilidad.ts` no se tocó).
- **Reglas de pagos, cancelación y estados bloqueantes:** intactas.
- **Prisma schema / migrations:** sin cambios.

La clave del lock (`lockKeyDisponibilidad`) deriva de datos de backend confiables
(`pasteleriaId` del contexto admin, nunca del frontend). El SQL está
parametrizado por Prisma (`$queryRaw` con `$1`/`$2` y cast `::int4`); no se
concatena SQL.

---

## 4. Qué cubren los unit tests y qué no

Cubierto sin base de datos (Vitest):

- `src/modules/pedidos/lock-disponibilidad.test.ts`: la clave del lock es
  determinista, sensible a tenant y a fecha, y cae en el rango `int4`.
- Suite de disponibilidad existente (`disponibilidad.test.ts`): la regla de 30
  minutos, direccional, sigue intacta.

**No** cubierto por unit tests (requiere PostgreSQL real):

- La exclusión mutua efectiva del advisory lock entre dos transacciones
  concurrentes. Es comportamiento del motor; no se simula sin BD y **no** se
  mockea Prisma de forma frágil.

---

## 5. Cómo validar la concurrencia real (manual/técnico)

En un entorno con PostgreSQL (base de desarrollo), la exclusión del advisory lock
se puede comprobar con dos sesiones `psql` sobre la misma clave:

```sql
-- Sesión 1
BEGIN;
SELECT pg_advisory_xact_lock(<key1>, <key2>);  -- adquiere el lock
-- (mantener la transacción abierta)

-- Sesión 2 (en paralelo)
BEGIN;
SELECT pg_advisory_xact_lock(<key1>, <key2>);  -- QUEDA BLOQUEADA hasta que la sesión 1 haga COMMIT/ROLLBACK
```

`<key1>`/`<key2>` son los que produce `lockKeyDisponibilidad(pasteleriaId, "YYYY-MM-DD")`.

A nivel de aplicación, la reproducción del doble booking sería lanzar dos
`createPedidoAction` de domicilio a la misma fecha/hora en paralelo contra la BD
de desarrollo y verificar que exactamente uno tiene éxito y el otro recibe el
mensaje de conflicto de la ventana de 30 minutos.

---

## 6. Resultado de validaciones

- `npm test`: ✅ (incluye las pruebas nuevas del helper de key y la suite previa).
- `npm run lint`: ✅.
- `npm run build`: ✅.

## 7. Confirmaciones

- ✅ No se tocó `prisma/schema.prisma`.
- ✅ No se crearon migrations.
- ✅ No se usó base de datos real en unit tests ni se mockeó Prisma.
- ✅ No se cambió la regla de disponibilidad de 30 minutos ni los estados bloqueantes.
- ✅ No se hizo commit.
