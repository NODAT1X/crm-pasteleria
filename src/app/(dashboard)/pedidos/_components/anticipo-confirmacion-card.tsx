import type { EstadoPedido } from "@/generated/prisma/enums";
import type { AnticipoConfirmacionDTO } from "@/modules/pagos/types";

type AnticipoConfirmacionCardProps = {
  anticipo: AnticipoConfirmacionDTO;
  estadoActual: EstadoPedido;
};

function formatMoney(value: number): string {
  return value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

/**
 * Ayuda visual del anticipo mínimo (50%) requerido para confirmar un pedido
 * (S3-018).
 *
 * Es SOLO presentación: muestra requerido / registrado / faltante ya calculados
 * en backend (`obtenerAnticipoConfirmacionPedidoAction`). No decide nada ni
 * bloquea la confirmación — de eso se encarga `changeEstadoPedidoService`, la
 * única fuente de verdad. Por eso tampoco deshabilita el botón de confirmar:
 * aunque se intente sin anticipo suficiente, el backend rechaza y el error se
 * muestra por el flujo existente de `CambiarEstadoPedido`.
 *
 * Se renderiza solo mientras el pedido está en `cotizacion`, que es cuando esta
 * regla aplica. En cualquier otro estado no aporta y no se muestra.
 */
export function AnticipoConfirmacionCard({
  anticipo,
  estadoActual,
}: AnticipoConfirmacionCardProps) {
  if (estadoActual !== "cotizacion") {
    return null;
  }

  return (
    <div className="mt-4 rounded-lg border bg-muted/30 p-4">
      <p className="text-sm font-medium">Anticipo para confirmar</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Para confirmar este pedido se requiere un anticipo mínimo del 50% del
        total.
      </p>

      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Anticipo requerido (50%)</dt>
          <dd className="font-medium">
            {formatMoney(anticipo.anticipo_requerido)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Anticipo registrado</dt>
          <dd className="font-medium">
            {formatMoney(anticipo.anticipo_registrado)}
          </dd>
        </div>
        {!anticipo.cumple ? (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Faltante</dt>
            <dd className="font-medium text-amber-700">
              {formatMoney(anticipo.faltante)}
            </dd>
          </div>
        ) : null}
      </dl>

      {anticipo.cumple ? (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-700">
            El anticipo cumple el mínimo del 50%. Ya puedes confirmar el pedido.
          </p>
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-700">
            Registra al menos {formatMoney(anticipo.faltante)} de anticipo en el
            panel de pago para poder confirmar el pedido.
          </p>
        </div>
      )}
    </div>
  );
}
