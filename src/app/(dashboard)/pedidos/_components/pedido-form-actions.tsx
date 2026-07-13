import Link from "next/link";

import { Button } from "@/components/ui/button";

type PedidoFormActionsProps = {
  cancelHref: string;
  isEditMode: boolean;
  isSaving: boolean;
};

/**
 * Botones de acción del formulario: cancelar (vuelve al listado o al
 * detalle) y guardar (envía el formulario que lo contiene).
 */
export function PedidoFormActions({
  cancelHref,
  isEditMode,
  isSaving,
}: PedidoFormActionsProps) {
  return (
    <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
      <Button asChild type="button" variant="outline">
        <Link href={cancelHref}>Cancelar</Link>
      </Button>

      <Button type="submit" disabled={isSaving}>
        {isSaving
          ? isEditMode
            ? "Guardando cambios..."
            : "Guardando..."
          : isEditMode
            ? "Guardar cambios"
            : "Guardar pedido"}
      </Button>
    </div>
  );
}
