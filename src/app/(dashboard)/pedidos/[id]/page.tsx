import Link from "next/link";

import { Button } from "@/components/ui/button";
import { obtenerResumenFinancieroPedidoAction } from "@/modules/pagos/actions";
import {
  getEstadoPagoBadgeClass,
  getEstadoPagoLabel,
} from "@/modules/pagos/labels";
import { getPedidoByIdAction } from "@/modules/pedidos/actions";
import { formatHoraEntrega } from "@/modules/pedidos/formatters";
import {
  getEstadoPedidoLabel,
  getTipoEntregaLabel,
} from "@/modules/pedidos/labels";

import { CambiarEstadoPedido } from "../_components/cambiar-estado-pedido";
import { RegistrarPagoForm } from "../_components/registrar-pago-form";

export const dynamic = "force-dynamic";

type PedidoDetallePageProps = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * Formatea fecha de entrega en formato mexicano.
 */
function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Formatea importes del pedido como moneda MXN.
 */
function formatMoney(value: number) {
  return value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

/**
 * Evita mostrar campos vacíos como texto roto.
 */
function formatValue(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "No registrado";
}

export default async function PedidoDetallePage({
  params,
}: PedidoDetallePageProps) {
  const { id } = await params;
  const [result, resumenResult] = await Promise.all([
    getPedidoByIdAction(id),
    obtenerResumenFinancieroPedidoAction({ pedido_id: id }),
  ]);

  /**
   * Estado controlado para pedido inexistente o fuera del tenant actual.
   */
  if (!result.ok) {
    return (
      <section className="space-y-6">
        <div className="rounded-lg border bg-background p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Pedido no disponible</h2>
          <p className="mt-2 text-sm text-muted-foreground">{result.error}</p>

          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/pedidos">Volver al listado</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const pedido = result.data;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border bg-background p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Ficha de pedido</p>
          <h2 className="text-lg font-semibold">
            Pedido de {pedido.cliente.nombre}
          </h2>
          <p className="text-sm text-muted-foreground">
            Información general, cliente asociado, artículos, estado y total del
            pedido.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/pedidos">Volver al listado</Link>
          </Button>

          <Button asChild variant="outline">
            <Link href={`/pedidos/${pedido.id}/editar`}>Editar pedido</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr_1fr]">
        <div className="rounded-lg border bg-background p-6 shadow-sm">
          <h3 className="font-medium">Cliente asociado</h3>

          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">{pedido.cliente.nombre}</p>
            <p className="text-sm text-muted-foreground">
              {formatValue(pedido.cliente.telefono ?? pedido.cliente.whatsapp)}
            </p>

            <Button asChild size="sm" variant="outline">
              <Link href={`/clientes/${pedido.cliente.id}`}>
                Ver ficha de cliente
              </Link>
            </Button>
          </div>
        </div>

        <aside className="rounded-lg border bg-background p-6 shadow-sm">
          <h3 className="font-medium">Estado del pedido</h3>

          <div className="mt-4 rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">
              {getEstadoPedidoLabel(pedido.estado_pedido)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Estado operativo actual del pedido.
            </p>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Cambiar estado</p>
            <CambiarEstadoPedido
              pedidoId={pedido.id}
              estadoActual={pedido.estado_pedido}
            />
          </div>
        </aside>

        <aside className="rounded-lg border bg-background p-6 shadow-sm">
          <h3 className="font-medium">Resumen de pago</h3>

          {resumenResult.ok ? (
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  Total del pedido
                </p>
                <p className="text-sm font-medium">
                  {formatMoney(resumenResult.data.total_pedido)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total pagado</p>
                <p className="text-sm font-medium">
                  {formatMoney(resumenResult.data.total_pagado)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Saldo pendiente
                </p>
                <p className="text-sm font-medium">
                  {formatMoney(resumenResult.data.saldo_pendiente)}
                </p>
              </div>
              <div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getEstadoPagoBadgeClass(resumenResult.data.estado_pago)}`}
                >
                  {getEstadoPagoLabel(resumenResult.data.estado_pago)}
                </span>
              </div>

              <RegistrarPagoForm
                pedidoId={pedido.id}
                saldoPendiente={resumenResult.data.saldo_pendiente}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              {resumenResult.error}
            </p>
          )}
        </aside>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-background p-6 shadow-sm">
          <h3 className="font-medium">Entrega</h3>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm font-medium">Fecha de entrega</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(pedido.fecha_entrega)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Hora de entrega</p>
              <p className="text-sm text-muted-foreground">
                {formatHoraEntrega(pedido.hora_entrega)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Tipo de entrega</p>
              <p className="text-sm text-muted-foreground">
                {getTipoEntregaLabel(pedido.tipo_entrega)}
              </p>
            </div>

            {pedido.tipo_entrega === "domicilio" ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">Dirección de entrega</p>
                <p className="text-sm text-muted-foreground">
                  {formatValue(pedido.direccion_entrega)}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border bg-background p-6 shadow-sm">
          <h3 className="font-medium">Notas internas</h3>

          <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
            {formatValue(pedido.notas_internas)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
        <div className="border-b p-4">
          <h3 className="font-medium">Productos del pedido</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Conceptos, cantidades, precios y subtotales guardados en
            el pedido.
          </p>
        </div>

        {pedido.items.length === 0 ? (
          <div className="p-6 text-center">
            <h4 className="text-sm font-medium">
              Este pedido no tiene productos registrados.
            </h4>
            <p className="mt-2 text-sm text-muted-foreground">
              No se encontraron productos asociados al pedido.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Concepto</th>
                  <th className="px-4 py-3 font-medium">Descripción</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Cantidad
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    Precio unitario
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    Subtotal
                  </th>
                </tr>
              </thead>

              <tbody>
                {pedido.items.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">
                      {item.nombre_snapshot}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatValue(item.descripcion)}
                    </td>
                    <td className="px-4 py-3 text-right">{item.cantidad}</td>
                    <td className="px-4 py-3 text-right">
                      {formatMoney(item.precio_unitario)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatMoney(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end border-t p-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total del pedido</p>
            <p className="text-xl font-semibold">{formatMoney(pedido.total)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}