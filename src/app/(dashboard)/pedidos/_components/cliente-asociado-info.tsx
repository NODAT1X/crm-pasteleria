import Link from "next/link";

import { Button } from "@/components/ui/button";

import type { ClienteOption } from "./nuevo-pedido-form";

type ClienteAsociadoInfoProps = {
  cliente?: ClienteOption;
};

/**
 * Card de solo lectura con el cliente ya asignado, usada en modo edición.
 */
export function ClienteAsociadoInfo({ cliente }: ClienteAsociadoInfoProps) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="text-sm font-medium">Cliente asociado</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {cliente?.nombre ?? "Cliente no disponible"}
      </p>

      {cliente?.id ? (
        <div className="mt-3">
          <Button asChild size="sm" variant="outline">
            <Link href={`/clientes/${cliente.id}`}>Ver ficha de cliente</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
