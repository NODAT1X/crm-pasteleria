import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getClienteByIdAction } from "@/modules/clientes/actions";
import { listPedidosAction } from "@/modules/pedidos/actions";
import { formatHoraEntrega } from "@/modules/pedidos/formatters";
import { getEstadoPedidoLabel } from "@/modules/pedidos/labels";

import { DesactivarClienteButton } from "../_components/desactivar-cliente-button";

export const dynamic = "force-dynamic";

// Cuántos pedidos se muestran en el historial de la ficha (sin paginación).
const HISTORIAL_TAKE = 50;

type ClienteDetallePageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatValue(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "No registrado";
}

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

export default async function ClienteDetallePage({
  params,
}: ClienteDetallePageProps) {
  const { id } = await params;
  const result = await getClienteByIdAction(id);

  if (!result.ok) {
    return (
      <section className="space-y-6">
        <div className="rounded-lg border bg-background p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Cliente no disponible</h2>

          <p className="mt-2 text-sm text-muted-foreground">{result.error}</p>

          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/clientes">Volver al listado</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const cliente = result.data;

  /**
   * Historial real del cliente. El filtro por `cliente_id` y el aislamiento por
   * pastelería los aplica el backend: la action deriva el tenant del contexto
   * admin y nunca lo acepta desde la UI.
   *
   * Si esta consulta falla, solo se degrada la sección de historial; la ficha
   * del cliente se sigue mostrando.
   */
  const pedidosResult = await listPedidosAction({
    cliente_id: cliente.id,
    take: HISTORIAL_TAKE,
  });

  // Se respeta el orden que ya devuelve la action (entrega más próxima primero).
  const pedidos = pedidosResult.ok ? pedidosResult.data : [];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border bg-background p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Ficha de cliente</p>
          <h2 className="text-lg font-semibold">{cliente.nombre}</h2>
          <p className="text-sm text-muted-foreground">
            Información general del cliente e historial de sus pedidos.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/clientes">Volver al listado</Link>
          </Button>

          <Button asChild>
            <Link href={`/clientes/${cliente.id}/editar`}>Editar cliente</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border bg-background p-6 shadow-sm">
          <h3 className="font-medium">Datos generales</h3>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm font-medium">Nombre</p>
              <p className="text-sm text-muted-foreground">{cliente.nombre}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Teléfono</p>
              <p className="text-sm text-muted-foreground">
                {formatValue(cliente.telefono)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">WhatsApp</p>
              <p className="text-sm text-muted-foreground">
                {formatValue(cliente.whatsapp)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Correo electrónico</p>
              <p className="text-sm text-muted-foreground">
                {formatValue(cliente.email)}
              </p>
            </div>

            <div className="space-y-1 md:col-span-2">
              <p className="text-sm font-medium">Dirección</p>
              <p className="text-sm text-muted-foreground">
                {formatValue(cliente.direccion)}
              </p>
            </div>

            <div className="space-y-1 md:col-span-2">
              <p className="text-sm font-medium">Notas</p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {formatValue(cliente.notas)}
              </p>
            </div>
          </div>
        </div>

        <aside className="rounded-lg border bg-background p-6 shadow-sm">
          <h3 className="font-medium">Estado</h3>

          <div className="mt-4 rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">
              {cliente.activo ? "Cliente activo" : "Cliente desactivado"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Estado actual del registro dentro del CRM.
            </p>
          </div>

          {cliente.activo ? (
            <div className="mt-4 space-y-3 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Al desactivar, el cliente dejará de aparecer en el listado
                principal. No se elimina el registro: su información se conserva.
              </p>

              <DesactivarClienteButton
                clienteId={cliente.id}
                clienteNombre={cliente.nombre}
              />
            </div>
          ) : null}
        </aside>
      </div>

      <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
        <div className="border-b p-4">
          <h3 className="font-medium">Historial de pedidos</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Pedidos registrados para este cliente, ordenados por fecha de entrega.
          </p>
        </div>

        {/* Falla solo el historial: la ficha del cliente permanece visible. */}
        {!pedidosResult.ok ? (
          <div className="p-6">
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              No fue posible cargar el historial de pedidos.{" "}
              {pedidosResult.error}
            </div>
          </div>
        ) : null}

        {pedidosResult.ok && pedidos.length === 0 ? (
          <div className="p-6 text-center">
            <h4 className="text-sm font-medium">
              Este cliente aún no tiene pedidos registrados.
            </h4>
            <p className="mt-2 text-sm text-muted-foreground">
              Cuando se registre un pedido para este cliente, aparecerá en esta
              sección.
            </p>
          </div>
        ) : null}

        {pedidos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left">
                <tr>
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
                      {formatDate(pedido.fecha_entrega)}
                    </td>

                    <td className="px-4 py-3">
                      {formatHoraEntrega(pedido.hora_entrega)}
                    </td>

                    <td className="px-4 py-3">
                      {getEstadoPedidoLabel(pedido.estado_pedido)}
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
        ) : null}
      </div>
    </section>
  );
}