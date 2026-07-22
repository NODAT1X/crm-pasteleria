import Link from "next/link";

import type { EstadoPedido, TipoEntrega } from "@/generated/prisma/enums";
import { formatHoraEntrega } from "@/modules/pedidos/formatters";
import {
  getEstadoPedidoLabel,
  getTipoEntregaLabel,
} from "@/modules/pedidos/labels";
import type { PedidoListItemDTO } from "@/modules/pedidos/types";

/**
 * Agenda operativa resumida de "próximos pedidos" (S4-015): solo presentación,
 * sin acciones de edición/cancelación/pago. Los datos (ventana, límite,
 * estados activos, saldo) ya vienen resueltos por `listPedidosProximosAction`.
 */

// Mismo criterio de color que las vistas de entregas (S4-012/S4-013) y el
// detalle (`/pedidos/[id]`); definido localmente porque es presentación de
// pantalla (mismo patrón que esas páginas).
const ESTADO_PEDIDO_BADGE_CLASS: Record<EstadoPedido, string> = {
  cotizacion: "bg-slate-100 text-slate-700",
  confirmado: "bg-blue-100 text-blue-700",
  en_preparacion: "bg-amber-100 text-amber-700",
  listo_para_entregar: "bg-purple-100 text-purple-700",
  entregado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
};

// Distingue domicilio de recolección por color Y texto (`getTipoEntregaLabel`
// ya está siempre presente en el badge), nunca solo por color.
const TIPO_ENTREGA_BADGE_CLASS: Record<TipoEntrega, string> = {
  domicilio: "bg-orange-100 text-orange-700",
  recoleccion: "bg-teal-100 text-teal-700",
};

function formatMoney(value: number): string {
  return value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

// Clave de agrupación por día calendario ("YYYY-MM-DD"), leyendo los
// componentes UTC de `fecha_entrega` (persistida siempre a medianoche UTC,
// mismo criterio que el resto del módulo de pedidos).
function fechaComoClave(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Encabezado legible del grupo de día ("Martes, 21 de julio"), interpretado
// en UTC: mismo criterio que el resto del módulo al formatear `fecha_entrega`
// (día calendario puro, nunca la zona del proceso).
function formatEncabezadoDia(date: Date): string {
  const texto = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

type ProximosPedidosProps = {
  pedidos: PedidoListItemDTO[];
};

type GrupoDia = {
  clave: string;
  fecha: Date;
  pedidos: PedidoListItemDTO[];
};

/**
 * Agrupa los pedidos (ya ordenados por fecha/hora por el backend) por día
 * calendario, conservando el orden de llegada: solo particiona la lista plana
 * ya ordenada, nunca la reordena.
 */
function agruparPorDia(pedidos: PedidoListItemDTO[]): GrupoDia[] {
  const grupos: GrupoDia[] = [];
  const indicePorClave = new Map<string, number>();

  for (const pedido of pedidos) {
    const clave = fechaComoClave(pedido.fecha_entrega);
    const indice = indicePorClave.get(clave);

    if (indice === undefined) {
      indicePorClave.set(clave, grupos.length);
      grupos.push({ clave, fecha: pedido.fecha_entrega, pedidos: [pedido] });
    } else {
      grupos[indice].pedidos.push(pedido);
    }
  }

  return grupos;
}

export function ProximosPedidos({ pedidos }: ProximosPedidosProps) {
  const grupos = agruparPorDia(pedidos);

  return (
    <div className="space-y-4 rounded-lg border bg-background p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Próximos pedidos</h2>
          <p className="text-sm text-muted-foreground">
            Qué se entrega o recoge pronto, para revisar la carga operativa sin
            entrar al calendario.
          </p>
        </div>

        <Link
          href="/entregas"
          className="text-sm font-medium text-primary hover:underline"
        >
          Ver calendario de entregas
        </Link>
      </div>

      {grupos.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          No hay pedidos próximos por ahora. En cuanto se programen entregas o
          recolecciones para los próximos días, aparecerán aquí.
        </div>
      ) : (
        <div className="space-y-5">
          {grupos.map((grupo) => (
            <div key={grupo.clave} className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {formatEncabezadoDia(grupo.fecha)}
              </h3>

              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {grupo.pedidos.map((pedido) => (
                  <li key={pedido.id}>
                    <Link
                      href={`/pedidos/${pedido.id}`}
                      aria-label={`Abrir detalle del pedido de ${pedido.cliente.nombre}`}
                      className="flex h-full flex-col gap-2 rounded-lg border bg-background p-4 text-sm shadow-sm transition-colors hover:bg-muted/40"
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

                      <span className="break-words font-medium">
                        {pedido.cliente.nombre}
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                            ESTADO_PEDIDO_BADGE_CLASS[pedido.estado_pedido] ??
                            "bg-muted text-muted-foreground"
                          }`}
                        >
                          {getEstadoPedidoLabel(pedido.estado_pedido)}
                        </span>

                        {pedido.saldo_pendiente > 0 ? (
                          <span className="text-xs text-muted-foreground">
                            {formatMoney(pedido.saldo_pendiente)} pendiente
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs font-medium text-primary">
                        Abrir detalle
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
