import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { Cliente } from "@/generated/prisma/client";
import type { MovimientoFinanciero } from "@/generated/prisma/client";
import {
  EstadoPedido,
  OrigenPedido,
  TipoEntrega,
  TipoMovimientoPago,
} from "@/generated/prisma/enums";
import {
  ESTADOS_BLOQUEAN_DISPONIBILIDAD,
  detectarConflictoDomicilio,
  mensajeConflictoDisponibilidad,
  type ConflictoDisponibilidad,
} from "@/modules/pedidos/disponibilidad";
import { hoyFechaOperativaLocal } from "@/modules/pedidos/fecha-operativa";
import { findClienteById } from "@/server/repositories/clientes.repository";
import {
  countMovimientosByPedidoIds,
  createMovimientoFinanciero,
  findMovimientosAplicadosByPedido,
  findMovimientosAplicadosByPedidoIds,
  findPedidoFinanciero,
  runMovimientosFinancierosTransaction,
} from "@/server/repositories/movimientos-financieros.repository";
import {
  adquirirLockDisponibilidad,
  createPedidoWithItems,
  deletePedidoConMovimientos,
  findBloqueosDomicilioPorFecha,
  findPedidoDetalle,
  findPedidoEntrega,
  findPedidoEstado,
  findPedidosDelDia,
  findPedidosPorRango,
  listPedidos,
  runPedidoTransaction,
  updateEstadoPedido,
  updatePedidoWithItems,
  type PedidoDetallePayload,
  type PedidoItemPersistData,
  type PedidoListPayload,
  type UpdatePedidoScalarData,
} from "@/server/repositories/pedidos.repository";
import {
  calcularResumenCancelacion,
  derivarEstadoPago,
  evaluarAnticipoConfirmacion,
  mensajeAnticipoInsuficiente,
  mensajeErrorDeInfraestructura,
  sumarPagosAplicados,
  type ResumenCancelacion,
} from "@/server/services/pagos.service";
import {
  cancelarPedidoSchema,
  changeEstadoPedidoSchema,
  createPedidoSchema,
  eliminarPedidoSchema,
  entregasFiltrosSchema,
  fechaOperativaSchema,
  listPedidosSchema,
  pedidoIdSchema,
  updatePedidoSchema,
  validateEstadoPedidoTransition,
  verificarDisponibilidadSchema,
  type PedidoItemInput,
} from "@/validation/pedidos";

import type {
  DiaSemanaEntregasDTO,
  DisponibilidadEntregaDTO,
  PedidoDetalleDTO,
  PedidoItemDTO,
  PedidoListItemDTO,
  PedidoSemanaItemDTO,
  ResumenCancelacionPedidoDTO,
  SemanaEntregasDTO,
} from "@/modules/pedidos/types";

/**
 * Capa de servicio / casos de uso de pedidos.
 *
 * Responsabilidades:
 *  - Validar y normalizar la entrada con Zod (nunca confía en el input crudo).
 *  - Aplicar reglas de negocio: cliente existente/activo/del tenant, cálculo de
 *    subtotales y total (el backend es la fuente de verdad del dinero) y
 *    transiciones de estado válidas.
 *  - Traducir "no encontrado / cliente inactivo / transición inválida" a
 *    errores controlados con mensaje en español.
 *  - Mapear las entidades de Prisma a DTOs planos y serializables.
 *
 * Multi-tenant: `pasteleriaId` llega ya derivado del contexto admin desde la
 * capa de actions; el servicio lo pasa al repositorio pero jamás lo toma del
 * input de negocio.
 */

/**
 * Error de negocio con mensaje apto para el usuario final (en español). Las
 * actions lo capturan y lo convierten en `{ ok: false, error }`. Los errores NO
 * controlados (p. ej. de Prisma) no se propagan crudos al cliente.
 */
export class PedidoServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PedidoServiceError";
  }
}

// Junta los mensajes de las incidencias de Zod en un texto legible (ya están en
// español en el schema, así que basta para la UI).
function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join(" ");
}

/**
 * Envuelve un flujo transaccional de pedidos: convierte los fallos de
 * INFRAESTRUCTURA de Prisma (pool saturado, transacción que no pudo abrirse,
 * conflicto de serialización, BD inalcanzable) en `PedidoServiceError` con un
 * mensaje funcional, y deja pasar cualquier otro error para que la action lo
 * registre como inesperado.
 *
 * La traducción vive en `pagos.service` para que ambos módulos compartan los
 * mismos textos. En todos esos casos la transacción se revirtió, así que el
 * pedido conserva su estado anterior y no queda ningún movimiento a medias.
 */
async function conErroresDeInfraestructuraControlados<T>(
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const mensaje = mensajeErrorDeInfraestructura(error);
    if (mensaje) {
      throw new PedidoServiceError(mensaje);
    }
    throw error;
  }
}

// --- Dinero (aritmética en centavos, sin Float como fuente de verdad) --------

// Tope de `Decimal(10, 2)` en centavos: 99_999_999.99 -> 9_999_999_999.
const MAX_MONEY_CENTS = 9_999_999_999;

// Redondea un monto (ya validado a 2 decimales por Zod) a centavos enteros.
function toCents(value: number): number {
  return Math.round(value * 100);
}

// Convierte centavos enteros a un string "entero.decimales" con 2 decimales,
// apto para persistir directamente en una columna `Decimal` sin pasar por Float.
function centsToDecimalString(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const entero = Math.floor(abs / 100);
  const decimales = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${entero}.${decimales}`;
}

type ItemsCalculo = {
  items: PedidoItemPersistData[];
  total: string;
};

/**
 * Calcula los subtotales de cada item (`cantidad * precio_unitario`) y el total
 * del pedido (suma de subtotales), SIEMPRE en el backend. El subtotal/total que
 * pudiera venir del input se ignora: aquí está la fuente de verdad del dinero.
 */
function calcularItemsYTotal(items: PedidoItemInput[]): ItemsCalculo {
  let totalCents = 0;

  const persistItems = items.map((item) => {
    const precioCents = toCents(item.precio_unitario);
    const subtotalCents = item.cantidad * precioCents;
    totalCents += subtotalCents;

    return {
      producto_id: item.producto_id,
      nombre_snapshot: item.nombre_snapshot,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: centsToDecimalString(precioCents),
      subtotal: centsToDecimalString(subtotalCents),
    } satisfies PedidoItemPersistData;
  });

  if (totalCents > MAX_MONEY_CENTS) {
    throw new PedidoServiceError(
      "El total del pedido excede el máximo permitido.",
    );
  }

  return { items: persistItems, total: centsToDecimalString(totalCents) };
}

// --- Reglas de cliente (multi-tenant + activo) ------------------------------

/**
 * Verifica que el cliente exista, pertenezca al tenant y esté activo. Devuelve
 * el cliente para reutilizarlo; lanza `PedidoServiceError` diferenciando "no
 * existe / otro tenant" de "inactivo".
 */
async function assertClienteAsignable(
  pasteleriaId: string,
  clienteId: string,
): Promise<Cliente> {
  // `findClienteById` ya filtra por id + pasteleria_id (barrera multi-tenant).
  const cliente = await findClienteById({ pasteleriaId, id: clienteId });

  if (!cliente) {
    throw new PedidoServiceError(
      "El cliente no existe o no pertenece a tu pastelería.",
    );
  }

  if (!cliente.activo) {
    throw new PedidoServiceError(
      "El cliente está inactivo; no es posible asignarle pedidos.",
    );
  }

  return cliente;
}

// --- Mapeo a DTOs (planos y serializables) ----------------------------------

function toItemDTO(item: PedidoDetallePayload["items"][number]): PedidoItemDTO {
  return {
    id: item.id,
    producto_id: item.producto_id,
    nombre_snapshot: item.nombre_snapshot,
    descripcion: item.descripcion,
    cantidad: item.cantidad,
    // `Decimal` -> `number` solo como representación de salida.
    precio_unitario: item.precio_unitario.toNumber(),
    subtotal: item.subtotal.toNumber(),
  };
}

/**
 * `movimientosAplicados` ya viene filtrado a este pedido (agrupado en
 * `listPedidosService` desde una única consulta batch). El cálculo de total
 * pagado / saldo / estado de pago reutiliza las mismas funciones puras de
 * `pagos.service.ts` — no se reimplementa la regla aquí.
 */
function toListItemDTO(
  pedido: PedidoListPayload,
  movimientosAplicados: MovimientoFinanciero[],
  cantidadMovimientos: number,
): PedidoListItemDTO {
  const totalPagado = sumarPagosAplicados(movimientosAplicados);
  const saldoBruto = pedido.total.minus(totalPagado);
  const saldoPendiente = saldoBruto.isNegative()
    ? new Prisma.Decimal(0)
    : saldoBruto;

  return {
    id: pedido.id,
    cliente_id: pedido.cliente_id,
    estado_pedido: pedido.estado_pedido,
    fecha_entrega: pedido.fecha_entrega,
    hora_entrega: pedido.hora_entrega,
    tipo_entrega: pedido.tipo_entrega,
    direccion_entrega: pedido.direccion_entrega,
    total: pedido.total.toNumber(),
    notas_internas: pedido.notas_internas,
    origen_pedido: pedido.origen_pedido,
    created_at: pedido.created_at,
    updated_at: pedido.updated_at,
    cliente: {
      id: pedido.cliente.id,
      nombre: pedido.cliente.nombre,
      telefono: pedido.cliente.telefono,
      whatsapp: pedido.cliente.whatsapp,
      origen_cliente: pedido.cliente.origen_cliente,
      revision_pendiente: pedido.cliente.revision_pendiente,
    },
    total_pagado: totalPagado.toNumber(),
    saldo_pendiente: saldoPendiente.toNumber(),
    estado_pago: derivarEstadoPago(pedido.total, totalPagado),
    tiene_movimientos_financieros: cantidadMovimientos > 0,
    cantidad_movimientos_financieros: cantidadMovimientos,
  };
}

function toDetalleDTO(pedido: PedidoDetallePayload): PedidoDetalleDTO {
  return {
    id: pedido.id,
    cliente_id: pedido.cliente_id,
    estado_pedido: pedido.estado_pedido,
    fecha_entrega: pedido.fecha_entrega,
    hora_entrega: pedido.hora_entrega,
    tipo_entrega: pedido.tipo_entrega,
    direccion_entrega: pedido.direccion_entrega,
    total: pedido.total.toNumber(),
    notas_internas: pedido.notas_internas,
    origen_pedido: pedido.origen_pedido,
    created_at: pedido.created_at,
    updated_at: pedido.updated_at,
    cliente: pedido.cliente,
    items: pedido.items.map(toItemDTO),
  };
}

// --- Disponibilidad de entregas a domicilio (S4-008) ------------------------

/**
 * Resultado interno de evaluar la disponibilidad de una entrega a domicilio.
 * Reutilizable por creación, edición y por la consulta explícita.
 */
type ResultadoDisponibilidadDomicilio =
  | { disponible: true }
  | { disponible: false; motivo: string; conflicto: ConflictoDisponibilidad };

/**
 * Evalúa si una entrega a DOMICILIO puede registrarse en `fecha_entrega` +
 * `hora_entrega` sin caer dentro de la ventana operativa de 30 min de otra
 * entrega a domicilio ACTIVA del mismo tenant y día.
 *
 * Barrera multi-tenant: el `pasteleriaId` llega del contexto admin y se propaga
 * a la consulta; nunca sale del input de negocio. `excludePedidoId` se usa en
 * edición para no autoconflictuar el pedido consigo mismo. Solo aplica a
 * domicilio: recolección se resuelve como disponible antes de llamar aquí.
 */
async function evaluarDisponibilidadDomicilio(params: {
  pasteleriaId: string;
  fecha_entrega: Date;
  hora_entrega: string;
  excludePedidoId?: string;
  db?: Prisma.TransactionClient;
}): Promise<ResultadoDisponibilidadDomicilio> {
  const { pasteleriaId, fecha_entrega, hora_entrega, excludePedidoId, db } =
    params;

  const bloqueos = await findBloqueosDomicilioPorFecha({
    pasteleriaId,
    fecha_entrega,
    estados: ESTADOS_BLOQUEAN_DISPONIBILIDAD,
    excludePedidoId,
    db,
  });

  const conflicto = detectarConflictoDomicilio(
    hora_entrega,
    bloqueos.map((bloqueo) => ({
      pedido_id: bloqueo.id,
      hora_entrega: bloqueo.hora_entrega,
    })),
  );

  if (!conflicto) {
    return { disponible: true };
  }

  return {
    disponible: false,
    motivo: mensajeConflictoDisponibilidad(conflicto),
    conflicto,
  };
}

/**
 * Regla S4-008 aplicada en creación/edición: si la entrega es a domicilio y su
 * horario cae dentro de la ventana ocupada de otra entrega a domicilio activa,
 * rechaza con un error de dominio controlado (mensaje funcional en español).
 * Para recolección no consulta nada: nunca bloquea disponibilidad.
 */
async function assertDisponibilidadEntrega(params: {
  pasteleriaId: string;
  tipo_entrega: TipoEntrega;
  fecha_entrega: Date;
  hora_entrega: string;
  excludePedidoId?: string;
  db?: Prisma.TransactionClient;
}): Promise<void> {
  if (params.tipo_entrega !== TipoEntrega.domicilio) {
    return;
  }

  const disponibilidad = await evaluarDisponibilidadDomicilio({
    pasteleriaId: params.pasteleriaId,
    fecha_entrega: params.fecha_entrega,
    hora_entrega: params.hora_entrega,
    excludePedidoId: params.excludePedidoId,
    db: params.db,
  });

  if (!disponibilidad.disponible) {
    throw new PedidoServiceError(disponibilidad.motivo);
  }
}

/**
 * Ejecuta `fn` dentro de una transacción que primero adquiere un advisory lock
 * transaccional por `(pasteleriaId, día de entrega)` (S5-004). Cierra la carrera
 * read-then-write de disponibilidad: mientras la transacción viva, ninguna otra
 * escritura de entrega a domicilio del MISMO tenant y día puede leer la ventana
 * ni escribir. El lock se libera solo al COMMIT/ROLLBACK. Los fallos de
 * infraestructura (no poder abrir la transacción, espera del pool) se traducen a
 * un `PedidoServiceError` con mensaje funcional (S4-002/S4-003).
 *
 * Solo se usa para entregas a domicilio: la recolección no consume disponibilidad
 * de reparto y sigue escribiéndose sin lock, conservando el horario compartido.
 */
function conLockDisponibilidad<T>(
  pasteleriaId: string,
  fecha_entrega: Date,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return conErroresDeInfraestructuraControlados(() =>
    runPedidoTransaction(async (tx) => {
      await adquirirLockDisponibilidad({ pasteleriaId, fecha_entrega, db: tx });
      return fn(tx);
    }),
  );
}

/**
 * Consulta explícita de disponibilidad (S4-008), pensada para uso futuro de la
 * UI/calendario. Valida la forma de entrada con Zod y devuelve un DTO sencillo.
 * Recolección siempre disponible; domicilio se evalúa contra la ventana de 30
 * min. `pedido_id` opcional excluye el propio pedido al editar.
 */
export async function verificarDisponibilidadEntregaService(
  pasteleriaId: string,
  input: unknown,
): Promise<DisponibilidadEntregaDTO> {
  const parsed = verificarDisponibilidadSchema.safeParse(input);
  if (!parsed.success) {
    throw new PedidoServiceError(formatZodError(parsed.error));
  }

  const { fecha_entrega, hora_entrega, tipo_entrega, pedido_id } = parsed.data;

  // Recolección en sucursal no consume ventana operativa (doc S4-007 §12).
  if (tipo_entrega !== TipoEntrega.domicilio) {
    return { disponible: true };
  }

  const disponibilidad = await evaluarDisponibilidadDomicilio({
    pasteleriaId,
    fecha_entrega,
    hora_entrega,
    excludePedidoId: pedido_id,
  });

  if (disponibilidad.disponible) {
    return { disponible: true };
  }

  return {
    disponible: false,
    motivo: disponibilidad.motivo,
    conflicto: disponibilidad.conflicto,
  };
}

// --- Casos de uso -----------------------------------------------------------

export async function createPedidoService(
  pasteleriaId: string,
  input: unknown,
  options?: { origenPedido?: OrigenPedido },
): Promise<PedidoDetalleDTO> {
  const parsed = createPedidoSchema.safeParse(input);
  if (!parsed.success) {
    throw new PedidoServiceError(formatZodError(parsed.error));
  }

  // Origen del pedido (S5-008): valor de CONFIANZA, nunca del input del
  // formulario. El default es `manual`; solo código de servidor autorizado
  // (flujo WhatsApp futuro) puede pasar `OrigenPedido.whatsapp` por `options`.
  const origenPedido = options?.origenPedido ?? OrigenPedido.manual;

  // Regla: el cliente debe existir, ser del tenant y estar activo.
  await assertClienteAsignable(pasteleriaId, parsed.data.cliente_id);

  // El backend calcula subtotales y total; el schema no acepta total del input.
  const { items, total } = calcularItemsYTotal(parsed.data.items);

  const persistData = {
    cliente_id: parsed.data.cliente_id,
    fecha_entrega: parsed.data.fecha_entrega,
    hora_entrega: parsed.data.hora_entrega,
    tipo_entrega: parsed.data.tipo_entrega,
    direccion_entrega: parsed.data.direccion_entrega,
    notas_internas: parsed.data.notas_internas,
    total,
    origen_pedido: origenPedido,
    items,
  };

  // Recolección en sucursal no consume disponibilidad de reparto: se crea sin
  // lock, conservando el horario compartido (comportamiento S4-009).
  if (parsed.data.tipo_entrega !== TipoEntrega.domicilio) {
    const pedido = await createPedidoWithItems({ pasteleriaId, data: persistData });
    return toDetalleDTO(pedido);
  }

  // Domicilio (S4-008 + S5-004): la validación de la ventana de 30 min y la
  // inserción ocurren dentro de UNA transacción que primero adquiere el advisory
  // lock por (tenant, día). Así dos creaciones concurrentes de domicilio en la
  // misma ventana se resuelven en un solo éxito y un rechazo, en vez de colarse
  // ambas por leer la ventana libre antes de que la otra escriba.
  const pedido = await conLockDisponibilidad(
    pasteleriaId,
    parsed.data.fecha_entrega,
    async (tx) => {
      await assertDisponibilidadEntrega({
        pasteleriaId,
        tipo_entrega: parsed.data.tipo_entrega,
        fecha_entrega: parsed.data.fecha_entrega,
        hora_entrega: parsed.data.hora_entrega,
        db: tx,
      });
      return createPedidoWithItems({ pasteleriaId, data: persistData, db: tx });
    },
  );

  return toDetalleDTO(pedido);
}

/**
 * Resumen financiero batch (evita N+1) de una lista de pedidos ya consultada,
 * mapeada al DTO de listado. Reutilizado por `listPedidosService` y por
 * `listPedidosDelDiaService` (S4-012) para no duplicar las mismas dos queries
 * ni el cálculo de total pagado / saldo / estado de pago.
 *
 *  - `movimientos` (solo aplicados): total pagado / saldo / estado de pago.
 *  - `cantidadPorPedido` (aplicados + anulados, S4-005): decide si el
 *    listado debe ofrecer confirmación simple o fuerte al eliminar.
 */
async function mapPedidosConResumenFinanciero(
  pasteleriaId: string,
  pedidos: PedidoListPayload[],
): Promise<PedidoListItemDTO[]> {
  const pedidoIds = pedidos.map((pedido) => pedido.id);

  const [movimientos, cantidadPorPedido] = await Promise.all([
    findMovimientosAplicadosByPedidoIds({ pasteleriaId, pedidoIds }),
    countMovimientosByPedidoIds({ pasteleriaId, pedidoIds }),
  ]);

  const movimientosPorPedido = new Map<string, MovimientoFinanciero[]>();
  for (const movimiento of movimientos) {
    const lista = movimientosPorPedido.get(movimiento.pedido_id) ?? [];
    lista.push(movimiento);
    movimientosPorPedido.set(movimiento.pedido_id, lista);
  }

  return pedidos.map((pedido) =>
    toListItemDTO(
      pedido,
      movimientosPorPedido.get(pedido.id) ?? [],
      cantidadPorPedido.get(pedido.id) ?? 0,
    ),
  );
}

export async function listPedidosService(
  pasteleriaId: string,
  params: unknown,
): Promise<PedidoListItemDTO[]> {
  // `params ?? {}` permite llamar sin argumentos y usar los valores por defecto.
  const parsed = listPedidosSchema.safeParse(params ?? {});
  if (!parsed.success) {
    throw new PedidoServiceError(formatZodError(parsed.error));
  }

  const pedidos = await listPedidos({ pasteleriaId, filters: parsed.data });

  return mapPedidosConResumenFinanciero(pasteleriaId, pedidos);
}

/**
 * Resuelve los filtros OPCIONALES del calendario (S4-014), compartidos por la
 * vista diaria y la semanal. Valida la forma con `entregasFiltrosSchema` (nunca
 * confía en el input crudo; jamás acepta `pasteleria_id`).
 *
 *  - Sin `estado_pedido`: se mantiene el comportamiento BASE de la vista (solo
 *    estados activos de S4-007, `ESTADOS_BLOQUEAN_DISPONIBILIDAD`). Con un estado
 *    específico (incluidos `entregado`/`cancelado`), la vista muestra solo ese.
 *  - `tipo_entrega` ausente: ambos tipos; presente: solo ese tipo.
 *
 * No modifica la regla de disponibilidad ni los estados bloqueantes de S4-008:
 * `ESTADOS_BLOQUEAN_DISPONIBILIDAD` se reutiliza tal cual como default de la vista.
 */
function resolverFiltrosEntregas(filtros: unknown): {
  estados: readonly EstadoPedido[];
  tipoEntrega?: TipoEntrega;
} {
  const parsed = entregasFiltrosSchema.safeParse(filtros ?? {});
  if (!parsed.success) {
    throw new PedidoServiceError(formatZodError(parsed.error));
  }

  const { estado_pedido, tipo_entrega } = parsed.data;
  return {
    estados: estado_pedido ? [estado_pedido] : ESTADOS_BLOQUEAN_DISPONIBILIDAD,
    tipoEntrega: tipo_entrega,
  };
}

/**
 * Vista diaria de entregas (S4-012): pedidos del tenant programados para una
 * fecha exacta. Por defecto muestra los mismos estados ACTIVOS que S4-007 usa
 * para disponibilidad (`ESTADOS_BLOQUEAN_DISPONIBILIDAD`) y ambos tipos de
 * entrega.
 *
 * `filtros` (S4-014, opcional) permite acotar por `estado_pedido` (incluyendo
 * `entregado`/`cancelado` para visualizarlos) y por `tipo_entrega`; ver
 * `resolverFiltrosEntregas`. La regla de disponibilidad de S4-008 no se toca.
 *
 * `input` se valida con `fechaOperativaSchema` (día calendario estricto
 * "YYYY-MM-DD", medianoche UTC) como defensa en profundidad, aunque la página
 * ya haya saneado la fecha antes de llamar a la action.
 */
export async function listPedidosDelDiaService(
  pasteleriaId: string,
  input: unknown,
  filtros?: unknown,
): Promise<PedidoListItemDTO[]> {
  const parsed = fechaOperativaSchema.safeParse(input);
  if (!parsed.success) {
    throw new PedidoServiceError(formatZodError(parsed.error));
  }

  const { estados, tipoEntrega } = resolverFiltrosEntregas(filtros);

  const pedidos = await findPedidosDelDia({
    pasteleriaId,
    fecha: parsed.data,
    estados,
    tipoEntrega,
  });

  return mapPedidosConResumenFinanciero(pasteleriaId, pedidos);
}

// --- Vista semanal de entregas (S4-013) --------------------------------------

// Día calendario (UTC) de `fecha` como "YYYY-MM-DD". `fecha_entrega` se
// persiste siempre a medianoche UTC (mismo criterio que `fechaOperativaSchema`
// / `rangoDelDiaUTC`), así que leer los componentes UTC reconstruye el día
// exacto sin importar la zona horaria del proceso.
function fechaUTCComoOperativa(fecha: Date): string {
  const year = fecha.getUTCFullYear();
  const month = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const day = String(fecha.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toSemanaItemDTO(pedido: PedidoListPayload): PedidoSemanaItemDTO {
  return {
    id: pedido.id,
    cliente: { id: pedido.cliente.id, nombre: pedido.cliente.nombre },
    fecha_entrega: pedido.fecha_entrega,
    hora_entrega: pedido.hora_entrega,
    estado_pedido: pedido.estado_pedido,
    tipo_entrega: pedido.tipo_entrega,
  };
}

/**
 * Vista semanal de entregas (S4-013): pedidos del tenant de lunes a domingo
 * agrupados por día. Por defecto usa los mismos estados ACTIVOS que la vista
 * diaria de S4-012 (`ESTADOS_BLOQUEAN_DISPONIBILIDAD`) y ambos tipos de entrega.
 *
 * `filtros` (S4-014, opcional) aplica los MISMOS filtros que la vista diaria
 * (`resolverFiltrosEntregas`): `estado_pedido` (incluidos `entregado`/`cancelado`)
 * y `tipo_entrega`. No reinterpreta la regla de disponibilidad de S4-008.
 *
 * `input` es la fecha ANCLA (normalmente "YYYY-MM-DD" desde la URL) validada
 * con `fechaOperativaSchema`, la misma usada por la vista diaria; no necesita
 * ser lunes. A partir de esa fecha (ya un `Date` a medianoche UTC) se calcula
 * el lunes de esa semana con aritmética pura en UTC (`getUTCDay` +
 * `setUTCDate`, mismo criterio que `rangoDelDiaUTC` / `sumarDiasFechaOperativa`
 * — nunca la zona horaria del proceso), y de ahí el domingo (lunes + 6) y el
 * límite exclusivo para la consulta (lunes + 7).
 *
 * Solo hace UNA consulta por rango (`findPedidosPorRango`) para las 7 fechas,
 * nunca 7 consultas independientes. Deliberadamente NO reutiliza
 * `mapPedidosConResumenFinanciero`: la vista semanal es de carga operativa
 * (hora, cliente, estado, tipo de entrega), no financiera, así que evita las
 * dos consultas adicionales de movimientos que sí necesita el listado general.
 */
export async function listPedidosDeLaSemanaService(
  pasteleriaId: string,
  input: unknown,
  filtros?: unknown,
): Promise<SemanaEntregasDTO> {
  const parsed = fechaOperativaSchema.safeParse(input);
  if (!parsed.success) {
    throw new PedidoServiceError(formatZodError(parsed.error));
  }

  const { estados, tipoEntrega } = resolverFiltrosEntregas(filtros);
  const ancla = parsed.data;
  // getUTCDay(): 0 = domingo ... 6 = sábado. La semana operativa inicia en
  // lunes, así que domingo retrocede 6 días y el resto retrocede (día - 1).
  const diaSemana = ancla.getUTCDay();
  const offsetALunes = diaSemana === 0 ? -6 : 1 - diaSemana;

  const lunes = new Date(ancla);
  lunes.setUTCDate(lunes.getUTCDate() + offsetALunes);

  const finExclusivo = new Date(lunes);
  finExclusivo.setUTCDate(finExclusivo.getUTCDate() + 7);

  const pedidos = await findPedidosPorRango({
    pasteleriaId,
    desde: lunes,
    hasta: finExclusivo,
    estados,
    tipoEntrega,
  });

  const pedidosPorDia = new Map<string, PedidoSemanaItemDTO[]>();
  for (const pedido of pedidos) {
    const fecha = fechaUTCComoOperativa(pedido.fecha_entrega);
    const lista = pedidosPorDia.get(fecha) ?? [];
    lista.push(toSemanaItemDTO(pedido));
    pedidosPorDia.set(fecha, lista);
  }

  const dias: DiaSemanaEntregasDTO[] = Array.from({ length: 7 }, (_, i) => {
    const fechaDia = new Date(lunes);
    fechaDia.setUTCDate(fechaDia.getUTCDate() + i);
    const fecha = fechaUTCComoOperativa(fechaDia);
    return { fecha, pedidos: pedidosPorDia.get(fecha) ?? [] };
  });

  return {
    lunes: dias[0].fecha,
    domingo: dias[6].fecha,
    dias,
  };
}

// --- Agenda operativa resumida: próximos pedidos (S4-015) --------------------

/**
 * Horizonte y límite de la agenda resumida de "próximos pedidos" (S4-015),
 * centralizados aquí para no dispersar números mágicos: sin una convención
 * previa más específica en el repositorio, se usa la ventana y el tope que
 * pide la issue.
 */
const PROXIMOS_PEDIDOS_HORIZONTE_DIAS = 7;
const PROXIMOS_PEDIDOS_LIMITE = 10;

/**
 * Agenda operativa resumida (S4-015): próximos pedidos del tenant, listos
 * para escanear sin entrar al calendario. Reutiliza exactamente las piezas de
 * las vistas de entregas en vez de reimplementar reglas:
 *
 *  - Día operativo actual con `hoyFechaOperativaLocal()` (America/Mexico_City,
 *    S4-012), nunca la zona del proceso que ejecuta el código.
 *  - Mismos estados ACTIVOS que bloquean disponibilidad (S4-007/S4-012,
 *    `ESTADOS_BLOQUEAN_DISPONIBILIDAD`); ambos tipos de entrega.
 *  - UNA sola consulta acotada por rango + `take` (`findPedidosPorRango`,
 *    S4-013), nunca una consulta por día: `desde` es la medianoche UTC del día
 *    operativo actual (mismo criterio que `fechaOperativaSchema`/
 *    `fechaUTCComoOperativa`) y `hasta` es `desde` +
 *    `PROXIMOS_PEDIDOS_HORIZONTE_DIAS` días (exclusivo), acotada además a los
 *    `PROXIMOS_PEDIDOS_LIMITE` renglones más próximos por el orden ya aplicado
 *    en el repositorio (fecha, hora, `created_at`, `id`).
 *  - Saldo pendiente vía `mapPedidosConResumenFinanciero` (S4-012): dos
 *    consultas EN BATCH para todo el lote, nunca una por pedido.
 *
 * Los pedidos eliminados (hard delete de S4-005) ya no existen en la tabla,
 * así que quedan excluidos de forma natural, sin filtro adicional.
 */
export async function listPedidosProximosService(
  pasteleriaId: string,
): Promise<PedidoListItemDTO[]> {
  const hoy = hoyFechaOperativaLocal();
  const desde = new Date(`${hoy}T00:00:00.000Z`);
  const hasta = new Date(desde);
  hasta.setUTCDate(hasta.getUTCDate() + PROXIMOS_PEDIDOS_HORIZONTE_DIAS);

  const pedidos = await findPedidosPorRango({
    pasteleriaId,
    desde,
    hasta,
    estados: ESTADOS_BLOQUEAN_DISPONIBILIDAD,
    take: PROXIMOS_PEDIDOS_LIMITE,
  });

  return mapPedidosConResumenFinanciero(pasteleriaId, pedidos);
}

export async function getPedidoByIdService(
  pasteleriaId: string,
  id: string,
): Promise<PedidoDetalleDTO> {
  const parsedId = pedidoIdSchema.safeParse(id);
  if (!parsedId.success) {
    throw new PedidoServiceError("Identificador de pedido inválido.");
  }

  const pedido = await findPedidoDetalle({ pasteleriaId, id: parsedId.data });
  if (!pedido) {
    throw new PedidoServiceError(
      "El pedido no existe o no pertenece a tu pastelería.",
    );
  }

  return toDetalleDTO(pedido);
}

export async function updatePedidoService(
  pasteleriaId: string,
  id: string,
  input: unknown,
): Promise<PedidoDetalleDTO> {
  const parsedId = pedidoIdSchema.safeParse(id);
  if (!parsedId.success) {
    throw new PedidoServiceError("Identificador de pedido inválido.");
  }

  const parsed = updatePedidoSchema.safeParse(input);
  if (!parsed.success) {
    throw new PedidoServiceError(formatZodError(parsed.error));
  }

  const data = parsed.data;

  // Regla S2-009 / S3-019: los pedidos en estado final (entregado o cancelado)
  // no se pueden editar. Este guard protege la Server Action ante llamadas
  // directas, aunque la UI ya oculte el acceso a la edición. Se lee además el
  // tipo/fecha/hora ACTUALES para poder calcular la entrega efectiva (S4-008).
  const actual = await findPedidoEntrega({ pasteleriaId, id: parsedId.data });

  if (!actual) {
    throw new PedidoServiceError(
      "El pedido no existe o no pertenece a tu pastelería.",
    );
  }

  if (
    actual.estado_pedido === EstadoPedido.entregado ||
    actual.estado_pedido === EstadoPedido.cancelado
  ) {
    throw new PedidoServiceError(
      "Este pedido ya está finalizado y no puede editarse.",
    );
  }

  // Si cambia el cliente, el nuevo debe existir, ser del tenant y estar activo.
  if (data.cliente_id !== undefined) {
    await assertClienteAsignable(pasteleriaId, data.cliente_id);
  }

  // Tipo/fecha/hora EFECTIVOS tras el patch parcial (los que no se envían se
  // conservan del pedido actual). La disponibilidad se valida más abajo, dentro
  // de la transacción con lock, solo si el pedido QUEDA a domicilio (S5-004).
  const tipoEfectivo = data.tipo_entrega ?? actual.tipo_entrega;
  const fechaEfectiva = data.fecha_entrega ?? actual.fecha_entrega;
  const horaEfectiva = data.hora_entrega ?? actual.hora_entrega;

  // Copiar solo los campos escalares presentes (undefined = "no tocar"). El
  // estado NO se cambia aquí (eso es exclusivo de changeEstadoPedidoService).
  const scalarData: UpdatePedidoScalarData = {};
  if (data.cliente_id !== undefined) scalarData.cliente_id = data.cliente_id;
  if (data.fecha_entrega !== undefined)
    scalarData.fecha_entrega = data.fecha_entrega;
  if (data.hora_entrega !== undefined)
    scalarData.hora_entrega = data.hora_entrega;
  if (data.tipo_entrega !== undefined)
    scalarData.tipo_entrega = data.tipo_entrega;
  if (data.direccion_entrega !== undefined)
    scalarData.direccion_entrega = data.direccion_entrega;
  if (data.notas_internas !== undefined)
    scalarData.notas_internas = data.notas_internas;

  // El total es SIEMPRE función de los items:
  //  - Con items: se recalcula en backend y se persiste junto al reemplazo.
  //  - Sin items: se conserva el total actual (== suma de los items actuales);
  //    no se acepta un total desde la UI, para no confiar en el frontend.
  let items: PedidoItemPersistData[] | undefined;
  if (data.items !== undefined) {
    const calculo = calcularItemsYTotal(data.items);
    items = calculo.items;
    scalarData.total = calculo.total;

    // Regla S3-020: si el pedido ya tiene pagos aplicados, el nuevo total no
    // puede quedar POR DEBAJO de lo ya pagado (dejaría el pedido sobrepagado).
    // El nuevo total sale del cálculo backend de items; el total pagado se lee
    // de los movimientos aplicados (tipo `pago`, estado `aplicado`) filtrados
    // por tenant. Comparación con Decimal, nunca Float. El saldo NO se persiste:
    // se sigue derivando desde el resumen financiero tras la edición.
    const aplicados = await findMovimientosAplicadosByPedido({
      pasteleriaId,
      pedidoId: parsedId.data,
    });
    const totalPagadoAplicado = sumarPagosAplicados(aplicados);
    const nuevoTotal = new Prisma.Decimal(calculo.total);

    if (nuevoTotal.lessThan(totalPagadoAplicado)) {
      throw new PedidoServiceError(
        `No se puede guardar la edición porque el nuevo total del pedido ($${nuevoTotal.toFixed(2)}) es menor al total pagado registrado ($${totalPagadoAplicado.toFixed(2)}).`,
      );
    }
  }

  const escribir = (tx?: Prisma.TransactionClient) =>
    updatePedidoWithItems({
      pasteleriaId,
      id: parsedId.data,
      data: scalarData,
      items,
      db: tx,
    });

  let pedido: PedidoDetallePayload | null;
  if (tipoEfectivo === TipoEntrega.domicilio) {
    // Domicilio (S4-008 + S5-004): validar la ventana de 30 min y escribir dentro
    // de UNA transacción que primero adquiere el advisory lock por (tenant, día),
    // excluyendo el propio pedido. Cierra la carrera read-then-write al editar
    // hacia una ventana ocupada; el mensaje de conflicto sigue siendo el mismo.
    pedido = await conLockDisponibilidad(pasteleriaId, fechaEfectiva, async (tx) => {
      await assertDisponibilidadEntrega({
        pasteleriaId,
        tipo_entrega: tipoEfectivo,
        fecha_entrega: fechaEfectiva,
        hora_entrega: horaEfectiva,
        excludePedidoId: parsedId.data,
        db: tx,
      });
      return escribir(tx);
    });
  } else {
    // Recolección: no consume disponibilidad de reparto; se escribe sin lock.
    pedido = await escribir();
  }

  if (!pedido) {
    throw new PedidoServiceError(
      "El pedido no existe o no pertenece a tu pastelería.",
    );
  }

  return toDetalleDTO(pedido);
}

export async function changeEstadoPedidoService(
  pasteleriaId: string,
  input: unknown,
): Promise<PedidoDetalleDTO> {
  const parsed = changeEstadoPedidoSchema.safeParse(input);
  if (!parsed.success) {
    throw new PedidoServiceError(formatZodError(parsed.error));
  }

  const { pedido_id, estado_pedido } = parsed.data;

  // TRANSACCIONAL (S4-002): leer estado/total -> validar transición -> validar
  // el anticipo mínimo -> escribir el nuevo estado ocurre de forma atómica y con
  // aislamiento `Serializable`. Antes estas lecturas y la escritura corrían
  // sueltas, así que una anulación de movimiento colada entre la validación del
  // 50% y el update podía dejar el pedido `confirmado` con anticipo insuficiente.
  // Si cualquier validación falla, la transacción se revierte y el estado NO
  // cambia.
  return conErroresDeInfraestructuraControlados(() =>
    runMovimientosFinancierosTransaction(
      async (tx) => {
        // Una sola lectura del pedido: `findPedidoFinanciero` ya trae
        // `estado_pedido` y `total`, así la transacción no hace viajes de más.
        const actual = await findPedidoFinanciero({
          pasteleriaId,
          pedidoId: pedido_id,
          db: tx,
        });
        if (!actual) {
          throw new PedidoServiceError(
            "El pedido no existe o no pertenece a tu pastelería.",
          );
        }

        // Transición validada con la función centralizada de S2-003 (rechaza
        // estados finales y self-transition).
        const transicion = validateEstadoPedidoTransition(
          actual.estado_pedido,
          estado_pedido,
        );
        if (!transicion.ok) {
          throw new PedidoServiceError(transicion.error);
        }

        // Regla S3-018: pasar de `cotizacion` a `confirmado` exige un anticipo
        // mínimo del 50% del total. El total y los movimientos se leen SIEMPRE
        // de la BD dentro de la transacción; nada llega del frontend.
        if (
          actual.estado_pedido === EstadoPedido.cotizacion &&
          estado_pedido === EstadoPedido.confirmado
        ) {
          const movimientosAplicados = await findMovimientosAplicadosByPedido({
            pasteleriaId,
            pedidoId: pedido_id,
            db: tx,
          });

          const anticipo = evaluarAnticipoConfirmacion(
            actual.total,
            movimientosAplicados,
          );

          if (!anticipo.cumple) {
            throw new PedidoServiceError(mensajeAnticipoInsuficiente(anticipo));
          }
        }

        // Anti-bypass S3-019: un pedido con pagos aplicados NO puede cancelarse
        // por este flujo genérico. Debe usarse el flujo de retención/devolución.
        if (estado_pedido === EstadoPedido.cancelado) {
          const aplicados = await findMovimientosAplicadosByPedido({
            pasteleriaId,
            pedidoId: pedido_id,
            db: tx,
          });

          if (calcularResumenCancelacion(aplicados).tienePagosAplicados) {
            throw new PedidoServiceError(
              "Este pedido tiene pagos registrados. Cancélalo desde el flujo de cancelación con retención y devolución para registrar los movimientos financieros.",
            );
          }
        }

        const pedido = await updateEstadoPedido({
          pasteleriaId,
          id: pedido_id,
          estado: estado_pedido,
          db: tx,
        });

        if (!pedido) {
          throw new PedidoServiceError(
            "El pedido no existe o no pertenece a tu pastelería.",
          );
        }

        return toDetalleDTO(pedido);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
}

// --- Cancelación con retención / devolución (S3-019) ------------------------

/**
 * Arma el DTO de resumen de cancelación a partir del cálculo puro
 * (`calcularResumenCancelacion`) y del estado actual del pedido, agregando
 * `puede_cancelar` (según las transiciones válidas) y un `mensaje` en español
 * para la confirmación en UI.
 */
function buildResumenCancelacionDTO(params: {
  pedidoId: string;
  estadoActual: EstadoPedido;
  resumen: ResumenCancelacion;
}): ResumenCancelacionPedidoDTO {
  const { pedidoId, estadoActual, resumen } = params;

  const transicion = validateEstadoPedidoTransition(
    estadoActual,
    EstadoPedido.cancelado,
  );

  let mensaje: string;
  if (!transicion.ok) {
    // Estado final (entregado/cancelado) o transición no permitida.
    mensaje = transicion.error;
  } else if (resumen.tienePagosAplicados) {
    mensaje =
      "Este pedido tiene pagos registrados. Al cancelarlo se registrará una retención y una devolución según las reglas de la pastelería.";
  } else {
    mensaje =
      "Este pedido no tiene pagos registrados. Se cancelará sin retención ni devolución.";
  }

  return {
    pedido_id: pedidoId,
    tiene_pagos_aplicados: resumen.tienePagosAplicados,
    // `Decimal` -> `number` solo como representación de salida (ver types.ts).
    total_recibido: resumen.totalRecibido.toNumber(),
    anticipo_aplicado: resumen.anticipoAplicado.toNumber(),
    retencion: resumen.retencion.toNumber(),
    devolucion: resumen.devolucion.toNumber(),
    puede_cancelar: transicion.ok,
    mensaje,
  };
}

/**
 * Resumen de cancelación de un pedido del tenant: montos de retención/devolución
 * calculados SIEMPRE en backend desde los movimientos aplicados. Es solo lectura
 * (para mostrar la confirmación antes de cancelar); no registra nada.
 */
export async function obtenerResumenCancelacionPedidoService(
  pasteleriaId: string,
  input: unknown,
): Promise<ResumenCancelacionPedidoDTO> {
  const parsed = cancelarPedidoSchema.safeParse(input);
  if (!parsed.success) {
    throw new PedidoServiceError(formatZodError(parsed.error));
  }

  const actual = await findPedidoEstado({
    pasteleriaId,
    id: parsed.data.pedido_id,
  });
  if (!actual) {
    throw new PedidoServiceError(
      "El pedido no existe o no pertenece a tu pastelería.",
    );
  }

  const aplicados = await findMovimientosAplicadosByPedido({
    pasteleriaId,
    pedidoId: parsed.data.pedido_id,
  });

  return buildResumenCancelacionDTO({
    pedidoId: parsed.data.pedido_id,
    estadoActual: actual.estado_pedido,
    resumen: calcularResumenCancelacion(aplicados),
  });
}

/**
 * Cancela un pedido registrando la retención y la devolución que correspondan
 * (S3-019), todo dentro de UNA transacción `Serializable`:
 *
 *  1. Lee el estado del pedido (tenant) dentro de la transacción.
 *  2. Valida que la transición a `cancelado` sea válida desde el estado actual.
 *  3. Lee los pagos aplicados y calcula retención/devolución con Decimal.
 *  4. Registra la retención si es > 0.
 *  5. Registra la devolución si es > 0.
 *  6. Cambia el estado del pedido a `cancelado`.
 *
 * No borra ni edita pagos previos: el historial conserva pago + retención +
 * devolución. Si no hay pagos aplicados, no registra movimientos y solo cancela.
 * El aislamiento `Serializable` evita que un pago concurrente se cuele entre el
 * cálculo y la cancelación (uno de los dos falla y se reintenta).
 */
export async function cancelarPedidoConRetencionDevolucionService(
  pasteleriaId: string,
  input: unknown,
): Promise<PedidoDetalleDTO> {
  const parsed = cancelarPedidoSchema.safeParse(input);
  if (!parsed.success) {
    throw new PedidoServiceError(formatZodError(parsed.error));
  }
  const { pedido_id } = parsed.data;

  return conErroresDeInfraestructuraControlados(() =>
    runMovimientosFinancierosTransaction(
      async (tx) => {
        const actual = await findPedidoEstado({
          pasteleriaId,
          id: pedido_id,
          db: tx,
        });
        if (!actual) {
          throw new PedidoServiceError(
            "El pedido no existe o no pertenece a tu pastelería.",
          );
        }

        const transicion = validateEstadoPedidoTransition(
          actual.estado_pedido,
          EstadoPedido.cancelado,
        );
        if (!transicion.ok) {
          throw new PedidoServiceError(transicion.error);
        }

        const aplicados = await findMovimientosAplicadosByPedido({
          pasteleriaId,
          pedidoId: pedido_id,
          db: tx,
        });
        const resumen = calcularResumenCancelacion(aplicados);

        // Retención: solo si es > 0 (no se crean movimientos de monto 0).
        if (resumen.retencion.greaterThan(0)) {
          await createMovimientoFinanciero({
            pasteleriaId,
            data: {
              pedido_id,
              // El caso de uso fija el tipo; nunca viene de la UI.
              tipo_movimiento: TipoMovimientoPago.retencion,
              metodo_pago: null,
              tipo_pago: null,
              monto: resumen.retencion.toFixed(2),
              referencia: null,
              notas:
                "Retención del 25% del anticipo por cancelación del pedido.",
            },
            db: tx,
          });
        }

        // Devolución: solo si es > 0.
        if (resumen.devolucion.greaterThan(0)) {
          await createMovimientoFinanciero({
            pasteleriaId,
            data: {
              pedido_id,
              tipo_movimiento: TipoMovimientoPago.devolucion,
              metodo_pago: null,
              tipo_pago: null,
              monto: resumen.devolucion.toFixed(2),
              referencia: null,
              notas:
                "Devolución al cliente por cancelación del pedido (total recibido menos retención).",
            },
            db: tx,
          });
        }

        const pedido = await updateEstadoPedido({
          pasteleriaId,
          id: pedido_id,
          estado: EstadoPedido.cancelado,
          db: tx,
        });
        if (!pedido) {
          throw new PedidoServiceError(
            "El pedido no existe o no pertenece a tu pastelería.",
          );
        }

        return toDetalleDTO(pedido);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
}

// --- Eliminación MVP (S4-005) ------------------------------------------------

/**
 * Elimina un pedido del tenant como una unidad completa: pedido, items y
 * movimientos financieros relacionados, sin dejar datos huérfanos y sin
 * afectar al cliente ni a otros pedidos (política S4-004/S4-005).
 *
 * Sin restricción por estado: la política MVP permite eliminar un pedido en
 * cualquier estado del ciclo de vida (incluidos `entregado` y `cancelado`),
 * a diferencia de `updatePedidoService`/`changeEstadoPedidoService`. La
 * decisión de qué confirmación mostrar (simple/fuerte) vive en la UI a partir
 * de los datos ya presentes en `PedidoListItemDTO`; este service solo ejecuta
 * el borrado transaccional una vez que el usuario confirmó.
 */
export async function eliminarPedidoService(
  pasteleriaId: string,
  input: unknown,
): Promise<{ pedido_id: string; cliente_id: string }> {
  const parsed = eliminarPedidoSchema.safeParse(input);
  if (!parsed.success) {
    throw new PedidoServiceError(formatZodError(parsed.error));
  }

  const eliminado = await conErroresDeInfraestructuraControlados(() =>
    deletePedidoConMovimientos({
      pasteleriaId,
      id: parsed.data.pedido_id,
    }),
  );

  if (!eliminado) {
    throw new PedidoServiceError(
      "El pedido no existe o no pertenece a tu pastelería.",
    );
  }

  return { pedido_id: eliminado.id, cliente_id: eliminado.cliente_id };
}
