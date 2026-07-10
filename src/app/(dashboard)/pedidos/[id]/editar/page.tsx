import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getPedidoByIdAction } from "@/modules/pedidos/actions";

import { NuevoPedidoForm } from "../../_components/nuevo-pedido-form";

export const dynamic = "force-dynamic";

type EditarPedidoPageProps = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * Estados finales que no permiten edición.
 * La UI bloquea la pantalla y el backend también debe rechazar la actualización.
 */
const ESTADOS_NO_EDITABLES = ["entregado", "cancelado"];

/**
 * Convierte Date a yyyy-mm-dd para el input type="date".
 */
function formatDateForInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function EditarPedidoPage({
  params,
}: EditarPedidoPageProps) {
  const { id } = await params;
  const result = await getPedidoByIdAction(id);

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
  const noEsEditable = ESTADOS_NO_EDITABLES.includes(pedido.estado_pedido);

  if (noEsEditable) {
    return (
      <section className="space-y-6">
        <div className="rounded-lg border bg-background p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Pedido no editable</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Este pedido ya está entregado o cancelado, por lo que no admite
            cambios.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/pedidos">Volver al listado</Link>
            </Button>

            <Button asChild>
              <Link href={`/pedidos/${pedido.id}`}>Ver detalle</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border bg-background p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Edición de pedido</p>
          <h2 className="text-lg font-semibold">
            Pedido de {pedido.cliente.nombre}
          </h2>
          <p className="text-sm text-muted-foreground">
            Edita datos básicos e items del pedido mientras no esté entregado ni
            cancelado.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/pedidos">Volver al listado</Link>
          </Button>

          <Button asChild>
            <Link href={`/pedidos/${pedido.id}`}>Ver detalle</Link>
          </Button>
        </div>
      </div>

      <NuevoPedidoForm
        mode="edit"
        pedidoId={pedido.id}
        initialData={{
          cliente: {
            id: pedido.cliente.id,
            nombre: pedido.cliente.nombre,
            telefono: pedido.cliente.telefono,
            whatsapp: pedido.cliente.whatsapp,
          },
          fecha_entrega: formatDateForInput(pedido.fecha_entrega),
          hora_entrega: pedido.hora_entrega,
          tipo_entrega: pedido.tipo_entrega,
          direccion_entrega: pedido.direccion_entrega,
          notas_internas: pedido.notas_internas,
          items: pedido.items.map((item) => ({
            nombre_snapshot: item.nombre_snapshot,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
          })),
        }}
      />
    </section>
  );
}