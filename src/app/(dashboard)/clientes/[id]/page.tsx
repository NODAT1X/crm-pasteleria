import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getClienteByIdAction } from "@/modules/clientes/actions";

import { DesactivarClienteButton } from "../_components/desactivar-cliente-button";

export const dynamic = "force-dynamic";

type ClienteDetallePageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatValue(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "No registrado";
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

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border bg-background p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Ficha de cliente</p>
          <h2 className="text-lg font-semibold">{cliente.nombre}</h2>
          <p className="text-sm text-muted-foreground">
            Información general del cliente y sección de historial preparada.
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

      <div className="rounded-lg border bg-background shadow-sm">
        <div className="border-b p-4">
          <h3 className="font-medium">Historial de pedidos</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Sección preparada para conectarse con pedidos en Sprint 2.
          </p>
        </div>

        <div className="p-6 text-center">
          <h4 className="text-sm font-medium">
            Este cliente aún no tiene pedidos registrados.
          </h4>
          <p className="mt-2 text-sm text-muted-foreground">
            Cuando el módulo de pedidos esté disponible, el historial aparecerá
            en esta sección.
          </p>
        </div>
      </div>
    </section>
  );
}