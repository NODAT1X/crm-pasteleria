"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { requireAdminContext } from "@/server/auth/authorization";
import {
  PagoServiceError,
  anularMovimientoFinancieroService,
  listarMovimientosFinancierosService,
  mensajeErrorDeInfraestructura,
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

  // Red de seguridad para errores de infraestructura que no hayan sido
  // convertidos por el service: un fallo de pool/conexión de Prisma (P2028,
  // P2024, P1001...) se traduce aquí a un mensaje funcional en vez de caer en
  // el genérico "error inesperado" (S4-002).
  const mensajeInfraestructura = mensajeErrorDeInfraestructura(error);
  if (mensajeInfraestructura) {
    return mensajeInfraestructura;
  }

  // Nunca se expone el stack ni el error crudo al usuario final.
  console.error("[pagos] Error inesperado:", error);
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

/**
 * Resuelve el contexto admin traduciendo un fallo de INFRAESTRUCTURA a
 * `ActionResult`, en vez de dejar que la excepción escape hasta el Server
 * Component (S4-003).
 *
 * `requireAdminContext()` consulta la BD dos veces (sesión de Better Auth +
 * usuario del tenant), así que es tan sensible a una caída de pool/conexión
 * como el propio service. Al llamarse FUERA del try/catch —a propósito, para no
 * atrapar el `redirect()` de Next, que funciona lanzando— `toErrorMessage`
 * nunca llegaba a ver estos errores y el detalle del pedido moría con el error
 * crudo de Prisma en pantalla (mismo patrón que BUG-S3-022-002 en el listado).
 *
 * `unstable_rethrow` re-lanza primero las señales internas de Next (redirect,
 * notFound, bailouts de renderizado dinámico), así el flujo de autenticación
 * queda intacto. Un error que NO sea de infraestructura también se re-lanza:
 * es un fallo real y debe llegar al error boundary.
 */
async function resolverContextoAdmin(): Promise<
  { ok: true; pasteleriaId: string } | { ok: false; error: string }
> {
  try {
    const { pasteleriaId } = await requireAdminContext();
    return { ok: true, pasteleriaId };
  } catch (error) {
    unstable_rethrow(error);

    const mensaje = mensajeErrorDeInfraestructura(error);
    if (!mensaje) {
      throw error;
    }

    console.error("[pagos] Fallo de infraestructura en contexto admin:", error);
    return { ok: false, error: mensaje };
  }
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
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    const resultado = await registrarPagoService(contexto.pasteleriaId, input);
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
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    const movimientos = await listarMovimientosFinancierosService(
      contexto.pasteleriaId,
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
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    const resumen = await obtenerResumenFinancieroPedidoService(
      contexto.pasteleriaId,
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
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    const anticipo = await obtenerAnticipoConfirmacionPedidoService(
      contexto.pasteleriaId,
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
  const contexto = await resolverContextoAdmin();
  if (!contexto.ok) {
    return { ok: false, error: contexto.error };
  }

  try {
    const resultado = await anularMovimientoFinancieroService(
      contexto.pasteleriaId,
      input,
    );
    revalidatePagoPaths(resultado.resumen.pedido_id);
    return { ok: true, data: resultado };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
