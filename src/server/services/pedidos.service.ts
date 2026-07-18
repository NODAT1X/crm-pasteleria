import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { Cliente } from "@/generated/prisma/client";
import type { MovimientoFinanciero } from "@/generated/prisma/client";
import { EstadoPedido } from "@/generated/prisma/enums";
import { findClienteById } from "@/server/repositories/clientes.repository";
import {
  findMovimientosAplicadosByPedido,
  findMovimientosAplicadosByPedidoIds,
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
import { derivarEstadoPago, sumarPagosAplicados } from "@/server/services/pagos.service";
import {
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

    // Regla S2-009: los pedidos en estado final no se pueden editar.
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
      "El pedido ya está entregado o cancelado y no admite edición.",
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
