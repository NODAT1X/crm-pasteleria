import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getClienteByIdAction } from "@/modules/clientes/actions";

import { ClienteForm } from "../../_components/cliente-form";

export const dynamic = "force-dynamic";

type EditarClientePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditarClientePage({
  params,
}: EditarClientePageProps) {
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
              <Link href="/clientes">Volver a clientes</Link>
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
          <h2 className="text-lg font-semibold">Editar cliente</h2>
          <p className="text-sm text-muted-foreground">
            Actualiza los datos básicos de {cliente.nombre}.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/clientes">Volver a clientes</Link>
        </Button>
      </div>

      <ClienteForm
        mode="edit"
        clienteId={cliente.id}
        initialValues={{
          nombre: cliente.nombre,
          telefono: cliente.telefono ?? "",
          whatsapp: cliente.whatsapp ?? "",
          email: cliente.email ?? "",
          direccion: cliente.direccion ?? "",
          notas: cliente.notas ?? "",
        }}
      />
    </section>
  );
}