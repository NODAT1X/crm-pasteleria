"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { EstadoPedido } from "@/generated/prisma/enums";
import { eliminarPedidoAction } from "@/modules/pedidos/actions";

type PedidoAccionesListadoProps = {
  pedidoId: string;
  estadoPedido: EstadoPedido;
  tieneMovimientosFinancieros: boolean;
};

type ConfirmacionNivel = "simple" | "fuerte";

// Tiempo mínimo que el mensaje de éxito permanece visible antes de refrescar
// el listado (evita que la fila se desmonte antes de que el usuario lo lea).
const EXITO_DELAY_MS = 800;

/**
 * Decide el nivel de confirmación y el mensaje a mostrar antes de eliminar,
 * siguiendo la prioridad acordada para S4-005:
 *
 *  1. Si existen movimientos financieros (aplicados o anulados) -> SIEMPRE
 *     confirmación fuerte por movimientos financieros, sin importar el estado.
 *  2. Si no hay movimientos y el pedido está `entregado` -> confirmación
 *     fuerte por pedido entregado.
 *  3. Si no hay movimientos y el pedido está `cancelado` -> confirmación
 *     simple para pedido cancelado.
 *  4. Cualquier otro estado sin movimientos -> confirmación simple estándar.
 *
 * Los datos (`tieneMovimientosFinancieros`, `estadoPedido`) ya vienen en
 * `PedidoListItemDTO`: no hace falta ningún viaje adicional al servidor para
 * decidir qué confirmación mostrar.
 */
function resolverConfirmacion(params: {
  estadoPedido: EstadoPedido;
  tieneMovimientosFinancieros: boolean;
}): { nivel: ConfirmacionNivel; mensaje: string } {
  const { estadoPedido, tieneMovimientosFinancieros } = params;

  if (tieneMovimientosFinancieros) {
    return {
      nivel: "fuerte",
      mensaje:
        "Este pedido tiene pagos o movimientos financieros registrados. Si lo eliminas, también se eliminará el historial financiero asociado a este pedido. Usa esta acción solo si se trata de un pedido de prueba, duplicado o capturado por error. ¿Deseas eliminarlo definitivamente?",
    };
  }

  if (estadoPedido === "entregado") {
    return {
      nivel: "fuerte",
      mensaje:
        "Este pedido ya fue entregado. Eliminarlo quitará el registro del sistema. Usa esta acción solo si fue un pedido de prueba o si el administrador decidió retirarlo del CRM. ¿Deseas continuar?",
    };
  }

  if (estadoPedido === "cancelado") {
    return {
      nivel: "simple",
      mensaje:
        "Este pedido está cancelado. Eliminarlo quitará el registro del sistema y liberará cualquier referencia operativa visible. ¿Deseas continuar?",
    };
  }

  return {
    nivel: "simple",
    mensaje:
      "¿Seguro que deseas eliminar este pedido? El pedido no tiene pagos ni movimientos financieros registrados. Esta acción eliminará el pedido del sistema.",
  };
}

/**
 * Acciones del listado de pedidos: "Ver detalle" + "Eliminar" (S4-005).
 *
 * La eliminación nunca ocurre desde el detalle, solo desde el listado. La
 * confirmación es SIEMPRE inline (nunca `window.confirm`/`window.prompt`),
 * reutilizando el mismo patrón visual que `CambiarEstadoPedido` (S3-017/
 * S3-021): un bloque ámbar para advertencias simples y un bloque destructivo
 * para confirmaciones fuertes.
 *
 * Un único estado `pending` deshabilita AMBAS acciones (incluido "Ver
 * detalle") mientras la eliminación está en curso, para evitar navegar fuera
 * de una operación transaccional a medias.
 */
export function PedidoAccionesListado({
  pedidoId,
  estadoPedido,
  tieneMovimientosFinancieros,
}: PedidoAccionesListadoProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { nivel, mensaje } = resolverConfirmacion({
    estadoPedido,
    tieneMovimientosFinancieros,
  });

  function handleIniciarEliminacion() {
    setError(null);
    setConfirming(true);
  }

  function handleCancelar() {
    setConfirming(false);
    setError(null);
  }

  async function handleConfirmarEliminacion() {
    setPending(true);
    setError(null);

    try {
      const result = await eliminarPedidoAction({ pedido_id: pedidoId });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      // Se oculta la confirmación y se muestra el éxito ANTES de refrescar,
      // para que el mensaje alcance a mostrarse aunque el refresh sea rápido.
      setConfirming(false);
      setSuccess(true);

      await new Promise((resolve) => setTimeout(resolve, EXITO_DELAY_MS));
      // Refresca el Server Component del listado: el pedido eliminado
      // desaparece de la lista (ya revalidada en backend por la action).
      router.refresh();
    } catch {
      // Error de transporte/infraestructura no controlado por la action
      // (p. ej. la petición nunca llegó a completarse).
      setError("No se pudo eliminar el pedido. Inténtalo nuevamente.");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-2 text-right text-sm text-green-700">
        Pedido eliminado correctamente.
      </div>
    );
  }

  if (confirming) {
    const boxClass =
      nivel === "fuerte"
        ? "border-destructive/20 bg-destructive/5"
        : "border-amber-200 bg-amber-50";
    const textClass = nivel === "fuerte" ? "text-foreground" : "text-amber-800";

    return (
      <div className={`space-y-3 rounded-lg border p-3 text-left ${boxClass}`}>
        <p className="text-sm font-semibold">Eliminar pedido</p>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <p className={`text-sm ${textClass}`}>{mensaje}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={handleCancelar}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => void handleConfirmarEliminacion()}
          >
            {pending
              ? "Eliminando..."
              : nivel === "fuerte"
                ? "Eliminar definitivamente"
                : "Eliminar"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href={`/pedidos/${pedidoId}`}>Ver detalle</Link>
      </Button>

      <Button
        type="button"
        size="sm"
        variant="destructive"
        onClick={handleIniciarEliminacion}
      >
        Eliminar
      </Button>
    </div>
  );
}
