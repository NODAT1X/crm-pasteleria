import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { Cliente } from "@/generated/prisma/client";
import type { MovimientoFinanciero } from "@/generated/prisma/client";
import { EstadoPedido, TipoMovimientoPago } from "@/generated/prisma/enums";
import { findClienteById } from "@/server/repositories/clientes.repository";
import {
  createMovimientoFinanciero,
  findMovimientosAplicadosByPedido,
  findMovimientosAplicadosByPedidoIds,
  runMovimientosFinancierosTransaction,
} from "@/server/repositories/movimientos-financieros.repository";
import {
  createPedidoWithItems,
  findPedidoDetalle,
  findPedidoEstado,
  listPedidos,
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
  sumarPagosAplicados,
  type ResumenCancelacion,
} from "@/server/services/pagos.service";
import {
  cancelarPedidoSchema,
  changeEstadoPedidoSchema,
  createPedidoSchema,
  listPedidosSchema,
  pedidoIdSchema,
  updatePedidoSchema,
  validateEstadoPedidoTransition,
  type PedidoItemInput,
} from "@/validation/pedidos";

import type {
  PedidoDetalleDTO,
  PedidoItemDTO,
  PedidoListItemDTO,
  ResumenCancelacionPedidoDTO,
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
    created_at: pedido.created_at,
    updated_at: pedido.updated_at,
    cliente: {
      id: pedido.cliente.id,
      nombre: pedido.cliente.nombre,
      telefono: pedido.cliente.telefono,
      whatsapp: pedido.cliente.whatsapp,
    },
    total_pagado: totalPagado.toNumber(),
    saldo_pendiente: saldoPendiente.toNumber(),
    estado_pago: derivarEstadoPago(pedido.total, totalPagado),
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
    created_at: pedido.created_at,
    updated_at: pedido.updated_at,
    cliente: pedido.cliente,
    items: pedido.items.map(toItemDTO),
  };
}

// --- Casos de uso -----------------------------------------------------------

export async function createPedidoService(
  pasteleriaId: string,
  input: unknown,
): Promise<PedidoDetalleDTO> {
  const parsed = createPedidoSchema.safeParse(input);
  if (!parsed.success) {
    throw new PedidoServiceError(formatZodError(parsed.error));
  }

  // Regla: el cliente debe existir, ser del tenant y estar activo.
  await assertClienteAsignable(pasteleriaId, parsed.data.cliente_id);

  // El backend calcula subtotales y total; el schema no acepta total del input.
  const { items, total } = calcularItemsYTotal(parsed.data.items);

  const pedido = await createPedidoWithItems({
    pasteleriaId,
    data: {
      cliente_id: parsed.data.cliente_id,
      fecha_entrega: parsed.data.fecha_entrega,
      hora_entrega: parsed.data.hora_entrega,
      tipo_entrega: parsed.data.tipo_entrega,
      direccion_entrega: parsed.data.direccion_entrega,
      notas_internas: parsed.data.notas_internas,
      total,
      items,
    },
  });

  return toDetalleDTO(pedido);
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

  // Resumen financiero del listado en UNA sola consulta batch adicional
  // (evita N+1: sin importar cuántos pedidos haya, siempre son 2 queries).
  const movimientos = await findMovimientosAplicadosByPedidoIds({
    pasteleriaId,
    pedidoIds: pedidos.map((pedido) => pedido.id),
  });

  const movimientosPorPedido = new Map<string, MovimientoFinanciero[]>();
  for (const movimiento of movimientos) {
    const lista = movimientosPorPedido.get(movimiento.pedido_id) ?? [];
    lista.push(movimiento);
    movimientosPorPedido.set(movimiento.pedido_id, lista);
  }

  return pedidos.map((pedido) =>
    toListItemDTO(pedido, movimientosPorPedido.get(pedido.id) ?? []),
  );
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
  // directas, aunque la UI ya oculte el acceso a la edición.
  const actual = await findPedidoEstado({ pasteleriaId, id: parsedId.data });

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
  }

  const pedido = await updatePedidoWithItems({
    pasteleriaId,
    id: parsedId.data,
    data: scalarData,
    items,
  });

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

  // Estado actual desde la BD (filtrado por tenant).
  const actual = await findPedidoEstado({ pasteleriaId, id: pedido_id });
  if (!actual) {
    throw new PedidoServiceError(
      "El pedido no existe o no pertenece a tu pastelería.",
    );
  }

  // Transición validada con la función centralizada de S2-003 (rechaza estados
  // finales y self-transition).
  const transicion = validateEstadoPedidoTransition(
    actual.estado_pedido,
    estado_pedido,
  );
  if (!transicion.ok) {
    throw new PedidoServiceError(transicion.error);
  }

  // Anti-bypass S3-019: un pedido con pagos aplicados NO puede cancelarse por
  // este flujo genérico (no registraría la retención/devolución). Debe usarse
  // `cancelarPedidoConRetencionDevolucionService`. Sin pagos, la cancelación
  // simple sigue permitida por aquí.
  if (estado_pedido === EstadoPedido.cancelado) {
    const aplicados = await findMovimientosAplicadosByPedido({
      pasteleriaId,
      pedidoId: pedido_id,
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
  });

  if (!pedido) {
    throw new PedidoServiceError(
      "El pedido no existe o no pertenece a tu pastelería.",
    );
  }

  return toDetalleDTO(pedido);
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

  return runMovimientosFinancierosTransaction(
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
            notas: "Retención del 25% del anticipo por cancelación del pedido.",
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
  );
}
