import Link from "next/link";

import { Button } from "@/components/ui/button";
import { listPedidosAction } from "@/modules/pedidos/actions";
import type { PedidoListItemDTO } from "@/modules/pedidos/types";

export const dynamic = "force-dynamic";

/**
 * Etiquetas visibles para el dueño.
 * Evita mostrar valores técnicos como "en_preparacion" directamente en UI.
 */
const ESTADO_PEDIDO_LABEL: Record<string, string> = {
  cotizacion: "Cotización",
  confirmado: "Confirmado",
  en_preparacion: "En preparación",
  listo_para_entregar: "Listo para entregar",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

/**
 * Formatea la fecha de entrega en formato mexicano.
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
 * Muestra el total del pedido como moneda MXN.
 */
function formatMoney(value: number) {
  return value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

/**
 * Orden operativo del listado.
 * Primero por fecha_entrega y después por hora_entrega.
 */
function sortPedidosByDelivery(a: PedidoListItemDTO, b: PedidoListItemDTO) {
  const dateDiff = a.fecha_entrega.getTime() - b.fecha_entrega.getTime();

  if (dateDiff !== 0) {
    return dateDiff;
  }

  return a.hora_entrega.localeCompare(b.hora_entrega);
}

export default async function PedidosPage() {
  /**
   * Carga pedidos del tenant actual.
   * El aislamiento por pastelería ya lo aplica el backend/action.
   */
  const result = await listPedidosAction({
    take: 50,
    skip: 0,
  });

  const pedidos = result.ok ? [...result.data].sort(sortPedidosByDelivery) : [];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border bg-background p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Pedidos</h2>
          <p className="text-sm text-muted-foreground">
            Consulta operativa básica de pedidos registrados.
          </p>
        </div>

        <Button asChild>
          <Link href="/pedidos/nuevo">Nuevo pedido</Link>
        </Button>
      </div>

      {!result.ok ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {result.error}
        </div>
      ) : null}

      {result.ok && pedidos.length === 0 ? (
        <div className="rounded-lg border bg-background p-6 text-center shadow-sm">
          <h3 className="font-medium">Aún no hay pedidos registrados.</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Cuando se creen pedidos, aparecerán en este listado con cliente,
            fecha, hora, estado y total.
          </p>

          <div className="mt-4">
            <Button asChild>
              <Link href="/pedidos/nuevo">Crear nuevo pedido</Link>
            </Button>
          </div>
        </div>
      ) : null}

      {pedidos.length > 0 ? (
        <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
          <div className="border-b p-4">
            <h3 className="font-medium">Listado de pedidos</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Ordenado por fecha y hora de entrega.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Hora</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Acción</th>
                </tr>
              </thead>

              <tbody>
                {pedidos.map((pedido) => (
                  <tr key={pedido.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{pedido.cliente.nombre}</div>
                      <div className="text-xs text-muted-foreground">
                        {pedido.cliente.telefono ??
                          pedido.cliente.whatsapp ??
                          "Sin contacto"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {formatDate(pedido.fecha_entrega)}
                    </td>

                    <td className="px-4 py-3">{pedido.hora_entrega}</td>

                    <td className="px-4 py-3">
                      {ESTADO_PEDIDO_LABEL[pedido.estado_pedido] ??
                        pedido.estado_pedido}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatMoney(pedido.total)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/pedidos/${pedido.id}`}>Ver detalle</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}