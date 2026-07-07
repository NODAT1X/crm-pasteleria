"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deactivateClienteAction } from "@/modules/clientes/actions";
import { Button } from "@/components/ui/button";

/**
 * Botón de baja LÓGICA de un cliente (S1-011).
 *
 * - Solo recibe `clienteId` desde la UI: el tenant (`pasteleria_id`) NUNCA se
 *   pasa desde el frontend; la action lo deriva de `requireAdminContext()`.
 * - Pide confirmación explícita con `window.confirm()` porque el proyecto aún no
 *   tiene un Dialog de shadcn instalado (se evita complejidad innecesaria).
 * - Al confirmar llama a `deactivateClienteAction(id)`, que hace `activo=false`
 *   (nunca `delete`). No existe borrado físico en el MVP/Sprint 1.
 * - Tras desactivar redirige al listado y refresca para que el cliente ya no
 *   aparezca (el listado solo muestra `activo=true`).
 */

type DesactivarClienteButtonProps = {
  clienteId: string;
  clienteNombre: string;
};

export function DesactivarClienteButton({
  clienteId,
  clienteNombre,
}: DesactivarClienteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDesactivar() {
    setError(null);

    const confirmado = window.confirm(
      `¿Desactivar a "${clienteNombre}"? Ya no aparecerá en el listado principal, ` +
        "pero su información se conservará. Esta acción no elimina el registro.",
    );

    if (!confirmado) {
      return;
    }

    startTransition(async () => {
      const result = await deactivateClienteAction(clienteId);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      // El cliente pasó a `activo=false`: sale del listado activo. Volvemos al
      // listado y refrescamos para reflejar el nuevo estado desde el servidor.
      router.push("/clientes");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-stretch gap-2 md:items-end">
      <Button
        type="button"
        variant="destructive"
        onClick={handleDesactivar}
        disabled={isPending}
      >
        {isPending ? "Desactivando..." : "Desactivar cliente"}
      </Button>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
