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
 * Muestra SOLO las transiciones válidas desde el estado actual, derivadas de la
 * regla centralizada `getNextEstadosPedido` (S2-003). El backend sigue siendo la
 * fuente final de autorización.
 *
 * Cancelación (S3-019): al pulsar "Cancelar" se consulta el resumen de
 * cancelación en backend. Si el pedido tiene pagos aplicados, se muestra un
 * bloque de confirmación inline con la retención (25%) y la devolución sugerida
 * antes de confirmar, y la cancelación se ejecuta por el flujo transaccional
 * `cancelarPedidoConRetencionDevolucionAction`. Si no tiene pagos, se cancela
 * con una confirmación simple por el flujo genérico. Los montos NUNCA se
 * calculan ni se envían desde aquí: solo se muestran los que devuelve el backend.
 */
export function CambiarEstadoPedido({
  pedidoId,
  estadoActual,
}: CambiarEstadoPedidoProps) {
  const router = useRouter();
  const [pendingEstado, setPendingEstado] = useState<EstadoPedido | null>(null);
  const [cancelResumen, setCancelResumen] =
    useState<ResumenCancelacionPedidoDTO | null>(null);
  const [cancelPending, setCancelPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextEstados = getNextEstadosPedido(estadoActual);
  const isPending = pendingEstado !== null;
  const bloqueado = isPending || cancelPending || cancelResumen !== null;

  // Estado final: no hay transiciones disponibles.
  if (nextEstados.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este pedido está en un estado final y ya no admite cambios de estado.
      </p>
    );
  }

  async function ejecutarCambioSimple(destino: EstadoPedido) {
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

    // Refresca el Server Component para reflejar el nuevo estado en el detalle.
    router.refresh();
  }

  async function handleChange(destino: EstadoPedido) {
    setError(null);

    if (destino === "cancelado") {
      // Consultar el resumen de cancelación (retención/devolución) en backend
      // ANTES de decidir el flujo. Nunca se calculan montos aquí.
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

      // Con pagos aplicados: confirmación inline mostrando el resumen.
      if (resumen.data.tiene_pagos_aplicados) {
        setCancelResumen(resumen.data);
        return;
      }

      // Sin pagos: confirmación simple por el flujo genérico.
      const confirmado = window.confirm(
        "¿Seguro que deseas cancelar este pedido? Quedará como cancelado de forma permanente y no podrás cambiar su estado después.",
      );
      if (!confirmado) return;

      await ejecutarCambioSimple("cancelado");
      return;
    }

    await ejecutarCambioSimple(destino);
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
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {nextEstados.map((destino) => {
          const esCancelar = destino === "cancelado";
          const enProceso = pendingEstado === destino;

          return (
            <Button
              key={destino}
              type="button"
              variant={esCancelar ? "destructive" : "default"}
              disabled={bloqueado}
              onClick={() => handleChange(destino)}
            >
              {enProceso
                ? "Procesando..."
                : getAccionCambioEstadoPedidoLabel(destino)}
            </Button>
          );
        })}
      </div>

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
              onClick={handleConfirmarCancelacion}
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
