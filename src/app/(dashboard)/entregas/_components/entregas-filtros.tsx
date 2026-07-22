"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  getEstadoPedidoLabel,
  TIPO_ENTREGA_OPTIONS,
} from "@/modules/pedidos/labels";
import { ESTADO_PEDIDO_VALUES } from "@/validation/pedidos";

/**
 * Filtros del calendario operativo (S4-014): estado del pedido y tipo de entrega.
 * Compartido por la vista diaria (`/entregas`) y la semanal (`/entregas/semana`).
 *
 * La fuente de verdad es la URL (`?estado=&tipo=`): este componente solo la
 * escribe con `router.replace()` y el Server Component de la página vuelve a
 * consultar la action con los nuevos valores. Mismo patrón que
 * `SelectorFechaEntregas` y `PedidosFiltros`.
 *
 * Conserva SIEMPRE el resto de parámetros (en especial `?fecha=`) al clonar los
 * `searchParams` actuales: cambiar un filtro no cambia el día ni la semana, y
 * "Limpiar filtros" solo elimina `estado`/`tipo` (la fecha/semana se mantiene).
 * El backend sigue siendo la fuente de verdad y el aislamiento por tenant.
 */

type EntregasFiltrosProps = {
  /** Valores ya saneados por la página (nunca un valor inválido). */
  estado: string;
  tipo: string;
};

const ESTADO_OPTIONS = ESTADO_PEDIDO_VALUES.map((value) => ({
  value,
  label: getEstadoPedidoLabel(value),
}));

export function EntregasFiltros({ estado, tipo }: EntregasFiltrosProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hayFiltrosActivos = Boolean(estado || tipo);

  function updateParam(key: "estado" | "tipo", value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  }

  function handleLimpiar() {
    // Solo se limpian los filtros; la fecha/semana (`?fecha=`) se conserva.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("estado");
    params.delete("tipo");

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="grid flex-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="entregas-estado" className="text-sm font-medium">
            Estado
          </label>
          <select
            id="entregas-estado"
            value={estado}
            onChange={(event) => updateParam("estado", event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Todos los estados</option>
            {ESTADO_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="entregas-tipo" className="text-sm font-medium">
            Tipo de entrega
          </label>
          <select
            id="entregas-tipo"
            value={tipo}
            onChange={(event) => updateParam("tipo", event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Todos los tipos</option>
            {TIPO_ENTREGA_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hayFiltrosActivos ? (
        <button
          type="button"
          onClick={handleLimpiar}
          className="h-9 whitespace-nowrap rounded-lg border border-input px-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          Limpiar filtros
        </button>
      ) : null}
    </div>
  );
}
