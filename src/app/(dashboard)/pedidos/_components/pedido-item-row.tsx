import { Button } from "@/components/ui/button";

import type {
  ItemFieldErrors,
  PedidoItemForm,
} from "./nuevo-pedido-form";
import { formatMoney } from "./nuevo-pedido-form";

type PedidoItemRowProps = {
  item: PedidoItemForm & { subtotal: number };
  index: number;
  errors?: ItemFieldErrors;
  onFieldChange: (field: keyof PedidoItemForm, value: string) => void;
  onRemove: () => void;
};

/**
 * Un renglón editable de item del pedido: nombre, descripción, cantidad,
 * precio unitario y el subtotal calculado (solo lectura).
 */
export function PedidoItemRow({
  item,
  index,
  errors,
  onFieldChange,
  onRemove,
}: PedidoItemRowProps) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h4 className="text-sm font-medium">Producto {index + 1}</h4>

        <Button type="button" variant="outline" onClick={onRemove}>
          Quitar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label
            htmlFor={`nombre-${item.id}`}
            className="text-sm font-medium"
          >
            Producto o concepto <span className="text-destructive">*</span>
          </label>
          <input
            id={`nombre-${item.id}`}
            type="text"
            value={item.nombre_snapshot}
            onChange={(event) =>
              onFieldChange("nombre_snapshot", event.target.value)
            }
            placeholder="Ej. Pastel personalizado"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />

          {errors?.nombre_snapshot ? (
            <p className="text-sm text-destructive">
              {errors.nombre_snapshot}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 md:col-span-2">
          <label
            htmlFor={`descripcion-${item.id}`}
            className="text-sm font-medium"
          >
            Descripción
          </label>
          <textarea
            id={`descripcion-${item.id}`}
            value={item.descripcion}
            onChange={(event) =>
              onFieldChange("descripcion", event.target.value)
            }
            placeholder="Detalle opcional del producto"
            rows={2}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`cantidad-${item.id}`}
            className="text-sm font-medium"
          >
            Cantidad <span className="text-destructive">*</span>
          </label>
          <input
            id={`cantidad-${item.id}`}
            type="number"
            min="1"
            step="1"
            value={item.cantidad}
            onChange={(event) =>
              onFieldChange("cantidad", event.target.value)
            }
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />

          {errors?.cantidad ? (
            <p className="text-sm text-destructive">{errors.cantidad}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`precio-${item.id}`}
            className="text-sm font-medium"
          >
            Precio unitario <span className="text-destructive">*</span>
          </label>
          <input
            id={`precio-${item.id}`}
            type="number"
            min="0"
            step="0.01"
            value={item.precio_unitario}
            onChange={(event) =>
              onFieldChange("precio_unitario", event.target.value)
            }
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />

          {errors?.precio_unitario ? (
            <p className="text-sm text-destructive">
              {errors.precio_unitario}
            </p>
          ) : null}
        </div>

        <div className="space-y-1 md:col-span-2">
          <p className="text-sm font-medium">Subtotal</p>
          <p className="text-sm text-muted-foreground">
            {formatMoney(item.subtotal)}
          </p>
        </div>
      </div>
    </div>
  );
}
