import { Button } from "@/components/ui/button";

import type { ItemFieldErrors, PedidoItemForm } from "./nuevo-pedido-form";
import { formatMoney } from "./nuevo-pedido-form";
import { PedidoItemRow } from "./pedido-item-row";

type PedidoItemsSectionProps = {
  items: (PedidoItemForm & { subtotal: number })[];
  total: number;
  itemsRequiredError?: string;
  itemErrors?: Record<string, ItemFieldErrors>;
  onAddItem: () => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateItem: (
    itemId: string,
    field: keyof PedidoItemForm,
    value: string,
  ) => void;
};

/**
 * Sección de items del pedido: encabezado con botón de agregar, estados
 * vacíos, la lista de renglones editables y el total calculado desde ellos.
 */
export function PedidoItemsSection({
  items,
  total,
  itemsRequiredError,
  itemErrors,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
}: PedidoItemsSectionProps) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-medium">Items del pedido</h3>
          <p className="text-sm text-muted-foreground">
            Agrega uno o más conceptos. El total se calcula desde los
            subtotales.
          </p>
        </div>

        <Button type="button" variant="outline" onClick={onAddItem}>
          Agregar item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          Agrega al menos un item para poder guardar el pedido.
        </div>
      ) : null}

      {itemsRequiredError ? (
        <p className="text-sm text-destructive">{itemsRequiredError}</p>
      ) : null}

      <div className="space-y-4">
        {items.map((item, index) => (
          <PedidoItemRow
            key={item.id}
            item={item}
            index={index}
            errors={itemErrors?.[item.id]}
            onFieldChange={(field, value) =>
              onUpdateItem(item.id, field, value)
            }
            onRemove={() => onRemoveItem(item.id)}
          />
        ))}
      </div>

      <div className="flex justify-end border-t pt-4">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total del pedido</p>
          <p className="text-xl font-semibold">{formatMoney(total)}</p>
        </div>
      </div>
    </div>
  );
}
