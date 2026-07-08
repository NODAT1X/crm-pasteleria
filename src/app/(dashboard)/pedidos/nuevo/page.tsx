import Link from "next/link";

import { Button } from "@/components/ui/button";
import { listClientesAction } from "@/modules/clientes/actions";

import { NuevoPedidoForm } from "../_components/nuevo-pedido-form";

export const dynamic = "force-dynamic";

export default async function NuevoPedidoPage() {
  const result = await listClientesAction({
    take: 50,
    skip: 0,
  });

  const clientes = result.ok
    ? result.data.map((cliente) => ({
        id: cliente.id,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        whatsapp: cliente.whatsapp,
      }))
    : [];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border bg-background p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Nuevo pedido</h2>
          <p className="text-sm text-muted-foreground">
            Inicia un pedido seleccionando un cliente activo existente.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/clientes">Volver a clientes</Link>
          </Button>

          <Button asChild>
            <Link href="/clientes/nuevo">Crear cliente</Link>
          </Button>
        </div>
      </div>

      {!result.ok ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {result.error}
        </div>
      ) : null}

      <NuevoPedidoForm clientes={clientes} />
    </section>
  );
}