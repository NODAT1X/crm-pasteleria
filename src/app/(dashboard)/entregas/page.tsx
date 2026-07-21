import Link from "next/link";

import type { EstadoPedido, TipoEntrega } from "@/generated/prisma/enums";
import {
  getEstadoPagoBadgeClass,
  getEstadoPagoLabel,
} from "@/modules/pagos/labels";
import {
  formatFechaOperativaLarga,
  sanitizeFechaOperativa,
} from "@/modules/pedidos/fecha-operativa";
import { formatHoraEntrega } from "@/modules/pedidos/formatters";
import {
  getEstadoPedidoLabel,
  getTipoEntregaLabel,
} from "@/modules/pedidos/labels";
import { listPedidosDelDiaAction } from "@/modules/pedidos/actions";

import { SelectorFechaEntregas } from "./_components/selector-fecha-entregas";

// Depende de la sesión/BD (misma razón que el resto del grupo `(dashboard)`):
// nunca se prerenderiza.
export const dynamic = "force-dynamic";

type EntregasPageProps = {
  searchParams?: Promise<{ fecha?: string }>;
};

/** Muestra el saldo pendiente del pedido como moneda MXN. */
function formatMoney(value: number) {
  return value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

// Badge del estado del pedido: mismo criterio de color que el detalle
// (`/pedidos/[id]`), definido localmente porque es presentación de pantalla.
const ESTADO_PEDIDO_BADGE_CLASS: Record<EstadoPedido, string> = {
  cotizacion: "bg-slate-100 text-slate-700",
  confirmado: "bg-blue-100 text-blue-700",
  en_preparacion: "bg-amber-100 text-amber-700",
  listo_para_entregar: "bg-purple-100 text-purple-700",
  entregado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
};

// Distingue visualmente domicilio (requiere reparto, ocupa ventana operativa
// según S4-007) de recolección en sucursal (puede compartir horario).
const TIPO_ENTREGA_BADGE_CLASS: Record<TipoEntrega, string> = {
  domicilio: "bg-orange-100 text-orange-700",
  recoleccion: "bg-teal-100 text-teal-700",
};

export default async function EntregasPage({
  searchParams,
}: EntregasPageProps) {
  const params = await searchParams;
  const fecha = sanitizeFechaOperativa(params?.fecha);

  /**
   * Consulta del día en el servidor (S4-012): tenant derivado de
   * `requireAdminContext` dentro de la action, solo estados activos de S4-007
   * y solo pedidos existentes (los eliminados ya no están en la tabla).
   */
  const result = await listPedidosDelDiaAction(fecha);
  const pedidos = result.ok ? result.data : [];

  return (
    <section className="space-y-6">
      <div className="space-y-4 rounded-lg border bg-background p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Entregas del día</h2>
          <p className="text-sm text-muted-foreground">
            Pedidos activos que deben prepararse, tenerse listos o entregarse
            en la fecha seleccionada.
          </p>
        </div>

        <SelectorFechaEntregas fecha={fecha} />

        <p className="text-sm font-medium capitalize">
          {formatFechaOperativaLarga(fecha)}
        </p>
      </div>

      {!result.ok ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {result.error}
        </div>
      ) : null}

      {result.ok && pedidos.length === 0 ? (
        <div className="rounded-lg border bg-background p-6 text-center shadow-sm">
          <h3 className="font-medium">
            No hay pedidos programados para esta fecha.
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Cuando existan pedidos activos con entrega en este día, aparecerán
            aquí ordenados por hora de entrega.
          </p>
        </div>
      ) : null}

      {pedidos.length > 0 ? (
        <ul className="space-y-3">
          {pedidos.map((pedido) => (
            <li key={pedido.id}>
              <Link
                href={`/pedidos/${pedido.id}`}
                className="flex flex-col gap-3 rounded-lg border bg-background p-4 shadow-sm transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                  <span className="text-sm font-semibold tabular-nums">
                    {formatHoraEntrega(pedido.hora_entrega)}
                  </span>
                  <span className="font-medium">{pedido.cliente.nombre}</span>
                  <span
                    className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TIPO_ENTREGA_BADGE_CLASS[pedido.tipo_entrega]}`}
                  >
                    {getTipoEntregaLabel(pedido.tipo_entrega)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      ESTADO_PEDIDO_BADGE_CLASS[pedido.estado_pedido] ??
                      "bg-muted text-muted-foreground"
                    }`}
                  >
                    {getEstadoPedidoLabel(pedido.estado_pedido)}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getEstadoPagoBadgeClass(pedido.estado_pago)}`}
                  >
                    {getEstadoPagoLabel(pedido.estado_pago)}
                  </span>
                  {pedido.saldo_pendiente > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {formatMoney(pedido.saldo_pendiente)} pendiente
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
