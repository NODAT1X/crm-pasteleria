"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { EstadoPedido } from "@/generated/prisma/enums";
import {
  cancelarPedidoConRetencionDevolucionAction,
  changeEstadoPedidoAction,
  obtenerResumenCancelacionPedidoAction,
} from "@/modules/pedidos/actions";
import { getAccionCambioEstadoPedidoLabel } from "@/modules/pedidos/labels";
import type { ResumenCancelacionPedidoDTO } from "@/modules/pedidos/types";
import { getNextEstadosPedido } from "@/validation/pedidos";

type CambiarEstadoPedidoProps = {
  pedidoId: string;
  estadoActual: EstadoPedido;
  saldoPendiente: number;
};

function formatMoney(value: number): string {
  return value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

/**
 * Acciones de cambio de estado del pedido.
 *
 * Muestra solo las transiciones válidas desde el estado actual, derivadas de la
 * regla centralizada `getNextEstadosPedido` (S2-003). El backend sigue siendo la
 * fuente final de autorización.
 *
 * Entregar con saldo pendiente (S3-021): el backend ya permite pasar a
 * "entregado" con saldo pendiente; aquí se muestra una advertencia inline para
 * confirmar explícitamente el cambio antes de enviarlo.
 *
 * Cancelación (S3-019): al pulsar "Cancelar" se consulta el resumen de
 * cancelación en backend. Si el pedido tiene pagos aplicados, se muestra un
 * bloque de confirmación inline con la retención (25%) y la devolución sugerida
 * antes de confirmar, y la cancelación se ejecuta por el flujo transaccional
 * `cancelarPedidoConRetencionDevolucionAction`. Si no tiene pagos, se cancela
 * con una confirmación simple por el flujo genérico. Los montos nunca se
 * calculan ni se envían desde aquí: solo se muestran los que devuelve el backend.
 */
export function CambiarEstadoPedido({
  pedidoId,
  estadoActual,
  saldoPendiente,
}: CambiarEstadoPedidoProps) {
  const router = useRouter();
  const [pendingEstado, setPendingEstado] = useState<EstadoPedido | null>(null);
  const [cancelResumen, setCancelResumen] =
    useState<ResumenCancelacionPedidoDTO | null>(null);
  const [cancelPending, setCancelPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmandoEntrega, setConfirmandoEntrega] = useState(false);

  const nextEstados = getNextEstadosPedido(estadoActual);
  const isPending = pendingEstado !== null || cancelPending;

  // Estado final: no hay transiciones disponibles.
  if (nextEstados.length === 0) {
    const mensajeEstadoFinal =
      estadoActual === "entregado"
        ? "Este pedido ya fue entregado y no admite más cambios de estado."
        : "Este pedido fue cancelado y no admite más cambios de estado.";

    return (
      <div className="space-y-1">
        <p className="text-sm font-medium">Estado final</p>
        <p className="text-sm text-muted-foreground">{mensajeEstadoFinal}</p>
      </div>
    );
  }

  async function ejecutarCambio(destino: EstadoPedido) {
    setPendingEstado(destino);

    const result = await changeEstadoPedidoAction({
      pedido_id: pedidoId,
      estado_pedido: destino,
    });

    setPendingEstado(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setConfirmandoEntrega(false);
    setCancelResumen(null);

    // Refresca el Server Component para reflejar el nuevo estado en el detalle
    // (y en el listado al volver, ya revalidado por la action).
    router.refresh();
  }

  function handleCancelarConfirmacionEntrega() {
    setConfirmandoEntrega(false);
  }

  async function handleChange(destino: EstadoPedido) {
    setError(null);

    // Cancelar es irreversible: pedir confirmación explícita antes de la action.
    if (destino === "cancelado") {
      setPendingEstado("cancelado");
      const resumen = await obtenerResumenCancelacionPedidoAction({
        pedido_id: pedidoId,
      });
      setPendingEstado(null);

      if (!resumen.ok) {
        setError(resumen.error);
        return;
      }

      if (!resumen.data.puede_cancelar) {
        setError(resumen.data.mensaje);
        return;
      }

      if (resumen.data.tiene_pagos_aplicados) {
        setCancelResumen(resumen.data);
        return;
      }

      const confirmado = window.confirm(
        "¿Seguro que deseas cancelar este pedido? Quedará como cancelado de forma permanente y no podrás cambiar su estado después.",
      );
      if (!confirmado) return;

      await ejecutarCambio(destino);
      return;
    }

    // Entregar con saldo pendiente: pedir confirmación explícita inline antes
    // de la action. Si el usuario confirma, se entrega aunque quede saldo.
    if (destino === "entregado" && saldoPendiente > 0) {
      setConfirmandoEntrega(true);
      return;
    }

    await ejecutarCambio(destino);
  }

  async function handleConfirmarCancelacion() {
    setError(null);
    setCancelPending(true);

    const result = await cancelarPedidoConRetencionDevolucionAction({
      pedido_id: pedidoId,
    });

    setCancelPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setCancelResumen(null);
    // Refresca el detalle: nuevo estado, resumen de pago e historial (con la
    // retención y la devolución recién registradas).
    router.refresh();
  }

  function handleCerrarCancelacion() {
    setCancelResumen(null);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Cambiar estado</p>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {confirmandoEntrega ? (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">
            Este pedido aún tiene un saldo pendiente de{" "}
            {formatMoney(saldoPendiente)}. Puedes entregarlo, pero el saldo
            seguirá registrado.
          </p>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={() => void ejecutarCambio("entregado")}
            >
              {isPending ? "Procesando..." : "Entregar de todas formas"}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={handleCancelarConfirmacionEntrega}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {nextEstados.map((destino) => {
            const esCancelar = destino === "cancelado";
            const enProceso = pendingEstado === destino;

            return (
              <Button
                key={destino}
                type="button"
                variant={esCancelar ? "destructive" : "default"}
                disabled={isPending}
                onClick={() => void handleChange(destino)}
              >
                {enProceso
                  ? "Procesando..."
                  : getAccionCambioEstadoPedidoLabel(destino)}
              </Button>
            );
          })}
        </div>
      )}

      {cancelResumen ? (
        <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-sm font-medium">Cancelar pedido con pagos</p>
          <p className="text-xs text-muted-foreground">{cancelResumen.mensaje}</p>

          <dl className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Total recibido</dt>
              <dd className="font-medium">
                {formatMoney(cancelResumen.total_recibido)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Anticipo aplicado</dt>
              <dd className="font-medium">
                {formatMoney(cancelResumen.anticipo_aplicado)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Retención (25%)</dt>
              <dd className="font-medium">
                {formatMoney(cancelResumen.retencion)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-t pt-1.5">
              <dt className="text-muted-foreground">Devolución sugerida</dt>
              <dd className="font-semibold">
                {formatMoney(cancelResumen.devolucion)}
              </dd>
            </div>
          </dl>

          <p className="text-xs text-muted-foreground">
            Al confirmar se registrarán estos movimientos en el historial y el
            pedido quedará cancelado de forma permanente.
          </p>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={cancelPending}
              onClick={() => void handleConfirmarCancelacion()}
            >
              {cancelPending ? "Cancelando..." : "Confirmar cancelación"}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={cancelPending}
              onClick={handleCerrarCancelacion}
            >
              Volver / No cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
