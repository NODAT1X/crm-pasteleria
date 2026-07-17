"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { EstadoPedido } from "@/generated/prisma/enums";
import { changeEstadoPedidoAction } from "@/modules/pedidos/actions";
import { getAccionCambioEstadoPedidoLabel } from "@/modules/pedidos/labels";
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
 * Muestra SOLO las transiciones válidas desde el estado actual, derivadas de la
 * regla centralizada `getNextEstadosPedido` (S2-003). El backend
 * (`changeEstadoPedidoAction`) sigue siendo la fuente final de autorización: si
 * llegara a intentarse una transición inválida, la rechaza.
 *
 * Entregar con saldo pendiente (S3-021): el backend YA permite pasar a
 * "entregado" con saldo pendiente (no hay regla financiera que lo bloquee). La
 * advertencia de aquí es solo UX: confirma inline (mismo patrón sin
 * `window.confirm`/modal que `HistorialFinanciero`, S3-017) que el usuario
 * entiende que el saldo seguirá pendiente tras la entrega.
 */
export function CambiarEstadoPedido({
  pedidoId,
  estadoActual,
  saldoPendiente,
}: CambiarEstadoPedidoProps) {
  const router = useRouter();
  const [pendingEstado, setPendingEstado] = useState<EstadoPedido | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmandoEntrega, setConfirmandoEntrega] = useState(false);

  const nextEstados = getNextEstadosPedido(estadoActual);
  const isPending = pendingEstado !== null;

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

    // Refresca el Server Component para reflejar el nuevo estado en el detalle
    // (y en el listado al volver, ya revalidado por la action).
    router.refresh();
  }

  function handleChange(destino: EstadoPedido) {
    setError(null);

    // Cancelar es irreversible: pedir confirmación explícita antes de la action.
    if (destino === "cancelado") {
      const confirmado = window.confirm(
        "¿Seguro que deseas cancelar este pedido? Quedará como cancelado de forma permanente y no podrás cambiar su estado después.",
      );
      if (!confirmado) return;
      void ejecutarCambio(destino);
      return;
    }

    // Entregar con saldo pendiente: pedir confirmación explícita inline antes
    // de la action (sin bloquear la entrega si el usuario confirma).
    if (destino === "entregado" && saldoPendiente > 0) {
      setConfirmandoEntrega(true);
      return;
    }

    void ejecutarCambio(destino);
  }

  function handleCancelarConfirmacionEntrega() {
    setConfirmandoEntrega(false);
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
              onClick={() => ejecutarCambio("entregado")}
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
                onClick={() => handleChange(destino)}
              >
                {enProceso
                  ? "Procesando..."
                  : getAccionCambioEstadoPedidoLabel(destino)}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
