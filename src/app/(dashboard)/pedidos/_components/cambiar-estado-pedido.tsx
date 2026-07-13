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
};

/**
 * Acciones de cambio de estado del pedido.
 *
 * Muestra SOLO las transiciones válidas desde el estado actual, derivadas de la
 * regla centralizada `getNextEstadosPedido` (S2-003). El backend
 * (`changeEstadoPedidoAction`) sigue siendo la fuente final de autorización: si
 * llegara a intentarse una transición inválida, la rechaza.
 */
export function CambiarEstadoPedido({
  pedidoId,
  estadoActual,
}: CambiarEstadoPedidoProps) {
  const router = useRouter();
  const [pendingEstado, setPendingEstado] = useState<EstadoPedido | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nextEstados = getNextEstadosPedido(estadoActual);
  const isPending = pendingEstado !== null;

  // Estado final: no hay transiciones disponibles.
  if (nextEstados.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este pedido está en un estado final y ya no admite cambios de estado.
      </p>
    );
  }

  async function handleChange(destino: EstadoPedido) {
    setError(null);

    // Cancelar es irreversible: pedir confirmación explícita antes de la action.
    if (destino === "cancelado") {
      const confirmado = window.confirm(
        "¿Seguro que deseas cancelar este pedido? Quedará como cancelado de forma permanente y no podrás cambiar su estado después.",
      );
      if (!confirmado) return;
    }

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

    // Refresca el Server Component para reflejar el nuevo estado en el detalle
    // (y en el listado al volver, ya revalidado por la action).
    router.refresh();
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
    </div>
  );
}
