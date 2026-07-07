import Link from "next/link";

import { Button } from "@/components/ui/button";
import { listClientesAction } from "@/modules/clientes/actions";

export const dynamic = "force-dynamic";

type ClientesPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export default async function ClientesPage({ searchParams }: ClientesPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";

  const result = await listClientesAction({
    search: query,
    take: 20,
    skip: 0,
  });

  const clientes = result.ok ? result.data : [];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border bg-background p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Clientes</h2>
          <p className="text-sm text-muted-foreground">
            Consulta clientes activos y busca rápidamente por nombre o teléfono.
          </p>
        </div>

        <Button asChild>
          <Link href="/clientes/nuevo">Nuevo cliente</Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-background p-6 shadow-sm">
        <form className="flex flex-col gap-3 md:flex-row" action="/clientes">
          <div className="flex-1">
            <label
              htmlFor="q"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Buscar cliente
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Buscar por nombre o teléfono"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <div className="flex items-end gap-2">
            <Button type="submit">Buscar</Button>

            {query ? (
              <Button asChild variant="outline">
                <Link href="/clientes">Limpiar</Link>
              </Button>
            ) : null}
          </div>
        </form>
      </div>

      {result.ok ? null : (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {result.error}
        </div>
      )}

      <div className="rounded-lg border bg-background shadow-sm">
        <div className="border-b p-4">
          <h3 className="font-medium">Listado de clientes activos</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Solo se muestran clientes activos por defecto.
          </p>
        </div>

        {clientes.length === 0 ? (
          <div className="p-6 text-center">
            <h4 className="text-sm font-medium">
              {query ? "No se encontraron clientes" : "Aún no hay clientes"}
            </h4>
            <p className="mt-2 text-sm text-muted-foreground">
              {query
                ? "Intenta buscar con otro nombre o teléfono."
                : "Cuando registres clientes activos, aparecerán en este listado."}
            </p>

            <div className="mt-4">
              <Button asChild>
                <Link href="/clientes/nuevo">Crear cliente</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Teléfono</th>
                  <th className="px-4 py-3 font-medium">WhatsApp</th>
                  <th className="px-4 py-3 font-medium">Correo</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {clientes.map((cliente) => (
                  <tr key={cliente.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{cliente.nombre}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {cliente.telefono ?? "Sin teléfono"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {cliente.whatsapp ?? "Sin WhatsApp"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {cliente.email ?? "Sin correo"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/clientes/${cliente.id}`}>Ver ficha</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}