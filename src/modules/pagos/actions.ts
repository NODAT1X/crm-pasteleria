"use server";

import { revalidatePath } from "next/cache";

import { requireAdminContext } from "@/server/auth/authorization";
import {
  PagoServiceError,
  anularMovimientoFinancieroService,
  listarMovimientosFinancierosService,
  obtenerAnticipoConfirmacionPedidoService,
  obtenerResumenFinancieroPedidoService,
  registrarPagoService,
} from "@/server/services/pagos.service";

import type {
  ActionResult,
  AnticipoConfirmacionDTO,
  MovimientoConResumenDTO,
  MovimientoFinancieroDTO,
  ResumenFinancieroPedido,
} from "./types";

/**
 * Server Actions de pagos y movimientos financieros (S3-014): la ÚNICA
 * superficie que la UI futura debe consumir. Cada acción deriva `pasteleriaId`
 * desde `requireAdminContext()`. Nunca se recibe `pasteleriaId` como argumento
 * ni desde input del cliente (los schemas estrictos además lo rechazan como
 * campo extra).
 *
 * `requireAdminContext()` se ejecuta FUERA del try/catch: puede disparar
 * `redirect()` (que funciona lanzando internamente) y no debe quedar atrapado
 * por el catch genérico que traduce errores de negocio.
 */

const PEDIDOS_PATH = "/pedidos";
const DASHBOARD_PATH = "/dashboard";

function toErrorMessage(error: unknown): string {
  if (error instanceof PagoServiceError) {
    return error.message;
  }

  // Nunca se expone el stack ni el error crudo al usuario final.
  console.error("[pagos] Error inesperado:", error);
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

// Revalida las rutas donde el saldo/estado de pago será visible (aún sin UI).
function revalidatePagoPaths(pedidoId?: string): void {
  revalidatePath(PEDIDOS_PATH);
  revalidatePath(DASHBOARD_PATH);

  if (pedidoId) {
    revalidatePath(`${PEDIDOS_PATH}/${pedidoId}`);
  }
}

/** Registra un pago de un pedido del tenant (transaccional, sin sobrepagos). */
export async function registrarPagoAction(
  input: unknown,
): Promise<ActionResult<MovimientoConResumenDTO>> {
  const { pasteleriaId } = await requireAdminContext();

  try {
    const resultado = await registrarPagoService(pasteleriaId, input);
    revalidatePagoPaths(resultado.resumen.pedido_id);
    return { ok: true, data: resultado };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

/** Lista los movimientos financieros de un pedido del tenant. */
export async function listarMovimientosFinancierosAction(
  input: unknown,
): Promise<ActionResult<MovimientoFinancieroDTO[]>> {
  const { pasteleriaId } = await requireAdminContext();

  try {
    const movimientos = await listarMovimientosFinancierosService(
      pasteleriaId,
      input,
    );
    return { ok: true, data: movimientos };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

/** Resumen financiero (total, pagado, saldo, estado derivado) de un pedido. */
export async function obtenerResumenFinancieroPedidoAction(
  input: unknown,
): Promise<ActionResult<ResumenFinancieroPedido>> {
  const { pasteleriaId } = await requireAdminContext();

  try {
    const resumen = await obtenerResumenFinancieroPedidoService(
      pasteleriaId,
      input,
    );
    return { ok: true, data: resumen };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

/**
 * Anticipo mínimo para confirmar un pedido del tenant (requerido/registrado/
 * faltante). Solo lectura para la ayuda visual del detalle (S3-018).
 */
export async function obtenerAnticipoConfirmacionPedidoAction(
  input: unknown,
): Promise<ActionResult<AnticipoConfirmacionDTO>> {
  const { pasteleriaId } = await requireAdminContext();

  try {
    const anticipo = await obtenerAnticipoConfirmacionPedidoService(
      pasteleriaId,
      input,
    );
    return { ok: true, data: anticipo };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

/** Anula un movimiento financiero (transaccional; recalcula el resumen). */
export async function anularMovimientoFinancieroAction(
  input: unknown,
): Promise<ActionResult<MovimientoConResumenDTO>> {
  const { pasteleriaId } = await requireAdminContext();

  try {
    const resultado = await anularMovimientoFinancieroService(
      pasteleriaId,
      input,
    );
    revalidatePagoPaths(resultado.resumen.pedido_id);
    return { ok: true, data: resultado };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
