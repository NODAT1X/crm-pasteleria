import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  getEstadoPagoBadgeClass,
  getEstadoPagoLabel,
} from "@/modules/pagos/labels";
import { listPedidosAction } from "@/modules/pedidos/actions";
import { formatHoraEntrega } from "@/modules/pedidos/formatters";
import {
  getEstadoPedidoLabel,
  getTipoEntregaLabel,
} from "@/modules/pedidos/labels";
import { ESTADO_PEDIDO_VALUES } from "@/validation/pedidos";

import { PedidoAccionesListado } from "./_components/pedido-acciones-listado";
import { PedidosFiltros } from "./_components/pedidos-filtros";

export const dynamic = "force-dynamic";

// Formato que produce <input type="date"> ("yyyy-mm-dd").
const FECHA_FILTRO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type PedidosPageProps = {
  searchParams?: Promise<{
    estado?: string;
    fecha?: string;
  }>;
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

// Devuelve el estado solo si es uno de los valores válidos; cualquier otro
// valor ("" o algo manipulado en la URL) se ignora en vez de propagar un error.
function sanitizeEstadoParam(value: string | undefined): string {
  if (!value) return "";
  return (ESTADO_PEDIDO_VALUES as readonly string[]).includes(value)
    ? value
    : "";
}

// Devuelve la fecha solo si respeta "yyyy-mm-dd"; cualquier otro formato se
// ignora en vez de propagar un error.
function sanitizeFechaParam(value: string | undefined): string {
  return value && FECHA_FILTRO_REGEX.test(value) ? value : "";
}

export default async function PedidosPage({ searchParams }: PedidosPageProps) {
  const params = await searchParams;

  const estadoParam = sanitizeEstadoParam(params?.estado);
  const fechaParam = sanitizeFechaParam(params?.fecha);
  const hayFiltrosActivos = Boolean(estadoParam || fechaParam);

  /**
   * Carga pedidos del tenant actual.
   * El aislamiento por pastelería ya lo aplica el backend/action.
   */
  const result = await listPedidosAction({
    estado_pedido: estadoParam || undefined,
    fecha_entrega_desde: fechaParam
      ? new Date(`${fechaParam}T00:00:00.000Z`)
      : undefined,
    fecha_entrega_hasta: fechaParam
      ? new Date(`${fechaParam}T00:00:00.000Z`)
      : undefined,
    take: 50,
    skip: 0,
  });

  const pedidos = result.ok ? result.data : [];

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

      <div className="rounded-lg border bg-background p-6 shadow-sm">
        <PedidosFiltros initialEstado={estadoParam} initialFecha={fechaParam} />
      </div>

      {!result.ok ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {result.error}
        </div>
      ) : null}

      {result.ok && pedidos.length === 0 ? (
        <div className="rounded-lg border bg-background p-6 text-center shadow-sm">
          <h3 className="font-medium">
            {hayFiltrosActivos
              ? "No se encontraron pedidos con estos filtros."
              : "Aún no hay pedidos registrados."}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {hayFiltrosActivos
              ? "Ajusta o limpia los filtros para ver más resultados."
              : "Cuando se creen pedidos, aparecerán en este listado con cliente, fecha, hora, estado, estado de pago y total."}
          </p>

          <div className="mt-4">
            {hayFiltrosActivos ? (
              <Button asChild variant="outline">
                <Link href="/pedidos">Limpiar filtros</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/pedidos/nuevo">Crear nuevo pedido</Link>
              </Button>
            )}
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
                  <th className="px-4 py-3 font-medium">Estado de pago</th>
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

                    <td className="px-4 py-3">
                      {formatHoraEntrega(pedido.hora_entrega)}
                      {/* Tipo de entrega (S4-009): diferencia reparto (domicilio,
                          sujeto a disponibilidad) de recolección en sucursal. */}
                      <div className="text-xs text-muted-foreground">
                        {getTipoEntregaLabel(pedido.tipo_entrega)}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {getEstadoPedidoLabel(pedido.estado_pedido)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getEstadoPagoBadgeClass(pedido.estado_pago)}`}
                      >
                        {getEstadoPagoLabel(pedido.estado_pago)}
                      </span>
                      {pedido.saldo_pendiente > 0 ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatMoney(pedido.saldo_pendiente)} pendiente
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatMoney(pedido.total)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <PedidoAccionesListado
                        pedidoId={pedido.id}
                        estadoPedido={pedido.estado_pedido}
                        tieneMovimientosFinancieros={
                          pedido.tiene_movimientos_financieros
                        }
                      />
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
