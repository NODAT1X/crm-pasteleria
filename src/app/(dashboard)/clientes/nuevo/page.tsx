import Link from "next/link";

import { Button } from "@/components/ui/button";

import { ClienteForm } from "../_components/cliente-form";

export const dynamic = "force-dynamic";

export default function NuevoClientePage() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border bg-background p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Crear cliente</h2>
          <p className="text-sm text-muted-foreground">
            Registra un cliente con los campos mínimos definidos para el MVP.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/clientes">Volver a clientes</Link>
        </Button>
      </div>

      <ClienteForm mode="create" />
    </section>
  );
}