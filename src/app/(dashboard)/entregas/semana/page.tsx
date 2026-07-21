import Link from "next/link";

import type { EstadoPedido, TipoEntrega } from "@/generated/prisma/enums";
import {
  formatFechaOperativaCorta,
  formatNombreDiaSemana,
  formatRangoSemanaLarga,
  hoyFechaOperativaLocal,
  sanitizeFechaOperativa,
} from "@/modules/pedidos/fecha-operativa";
import { formatHoraEntrega } from "@/modules/pedidos/formatters";
import {
  getEstadoPedidoLabel,
  getTipoEntregaLabel,
} from "@/modules/pedidos/labels";
import { listPedidosDeLaSemanaAction } from "@/modules/pedidos/actions";
import type { PedidoSemanaItemDTO } from "@/modules/pedidos/types";

import { SelectorSemanaEntregas } from "../_components/selector-semana-entregas";
import { SelectorVistaEntregas } from "../_components/selector-vista-entregas";

// Depende de la sesión/BD (misma razón que el resto del grupo `(dashboard)`):
// nunca se prerenderiza.
export const dynamic = "force-dynamic";

type EntregasSemanaPageProps = {
  searchParams?: Promise<{ fecha?: string }>;
};

// Mismo criterio de color que la vista diaria (S4-012) y que el detalle
// (`/pedidos/[id]`); definido localmente porque es presentación de pantalla.
const ESTADO_PEDIDO_BADGE_CLASS: Record<EstadoPedido, string> = {
  cotizacion: "bg-slate-100 text-slate-700",
  confirmado: "bg-blue-100 text-blue-700",
  en_preparacion: "bg-amber-100 text-amber-700",
  listo_para_entregar: "bg-purple-100 text-purple-700",
  entregado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
};

const TIPO_ENTREGA_BADGE_CLASS: Record<TipoEntrega, string> = {
  domicilio: "bg-orange-100 text-orange-700",
  recoleccion: "bg-teal-100 text-teal-700",
};

function PedidoSemanaCard({ pedido }: { pedido: PedidoSemanaItemDTO }) {
  return (
    <li>
      <Link
        href={`/pedidos/${pedido.id}`}
        className="flex flex-col gap-2 rounded-lg border bg-background p-3 text-sm shadow-sm transition-colors hover:bg-muted/40"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="whitespace-nowrap font-semibold tabular-nums">
            {formatHoraEntrega(pedido.hora_entrega)}
          </span>
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TIPO_ENTREGA_BADGE_CLASS[pedido.tipo_entrega]}`}
          >
            {getTipoEntregaLabel(pedido.tipo_entrega)}
          </span>
        </div>
        <span className="break-words font-medium">{pedido.cliente.nombre}</span>
        <span
          className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
            ESTADO_PEDIDO_BADGE_CLASS[pedido.estado_pedido] ??
            "bg-muted text-muted-foreground"
          }`}
        >
          {getEstadoPedidoLabel(pedido.estado_pedido)}
        </span>
      </Link>
    </li>
  );
}

export default async function EntregasSemanaPage({
  searchParams,
}: EntregasSemanaPageProps) {
  const params = await searchParams;
  const fecha = sanitizeFechaOperativa(params?.fecha);
  const hoy = hoyFechaOperativaLocal();

  /**
   * Consulta de la semana en el servidor (S4-013): tenant derivado de
   * `requireAdminContext` dentro de la action, solo estados activos de S4-007
   * (los mismos que la vista diaria) y una sola consulta por rango para los 7
   * días.
   */
  const result = await listPedidosDeLaSemanaAction(fecha);

  return (
    <section className="space-y-6">
      <div className="space-y-4 rounded-lg border bg-background p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Entregas de la semana</h2>
          <p className="text-sm text-muted-foreground">
            Carga de pedidos activos por día, de lunes a domingo, para
            comparar rápidamente qué días tienen más entregas.
          </p>
        </div>

        <SelectorVistaEntregas vista="semana" fecha={fecha} />

        <SelectorSemanaEntregas fecha={fecha} />

        {result.ok ? (
          <p className="text-sm font-medium">
            {formatRangoSemanaLarga(result.data.lunes, result.data.domingo)}
          </p>
        ) : null}
      </div>

      {!result.ok ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {result.error}
        </div>
      ) : null}

      {result.ok ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-3">
          {result.data.dias.map((dia) => {
            const esHoy = dia.fecha === hoy;
            return (
              <div
                key={dia.fecha}
                className={`flex flex-col gap-3 rounded-lg border bg-background p-4 shadow-sm ${
                  esHoy ? "border-primary ring-1 ring-primary" : ""
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold">
                      {formatNombreDiaSemana(dia.fecha)}
                    </h3>
                    {esHoy ? (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Hoy
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatFechaOperativaCorta(dia.fecha)}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">
                    {dia.pedidos.length === 1
                      ? "1 pedido"
                      : `${dia.pedidos.length} pedidos`}
                  </p>
                </div>

                {dia.pedidos.length === 0 ? (
                  <p className="rounded-md border border-dashed bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
                    Sin entregas
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {dia.pedidos.map((pedido) => (
                      <PedidoSemanaCard key={pedido.id} pedido={pedido} />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
