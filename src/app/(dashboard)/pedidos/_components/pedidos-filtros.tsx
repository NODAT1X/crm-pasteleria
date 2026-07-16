"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { getEstadoPedidoLabel } from "@/modules/pedidos/labels";
import { ESTADO_PEDIDO_VALUES } from "@/validation/pedidos";

/**
 * Filtros del listado de pedidos (estado + fecha de entrega).
 *
 * La fuente de estado del listado es la URL (?estado=&fecha=): este
 * componente solo escribe en ella con `router.replace()` y el Server
 * Component de la página vuelve a consultar `listPedidosAction` con los
 * nuevos valores. Mismo patrón que `ClientesSearchInput`.
 */

type PedidosFiltrosProps = {
  /** Valores ya saneados por la página (nunca un valor inválido). */
  initialEstado: string;
  initialFecha: string;
};

const ESTADO_OPTIONS = ESTADO_PEDIDO_VALUES.map((value) => ({
  value,
  label: getEstadoPedidoLabel(value),
}));

export function PedidosFiltros({
  initialEstado,
  initialFecha,
}: PedidosFiltrosProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hayFiltrosActivos = Boolean(initialEstado || initialFecha);

  function updateParam(key: "estado" | "fecha", value: string) {
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
    router.replace(pathname);
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="grid flex-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="estado" className="text-sm font-medium">
            Estado
          </label>
          <select
            id="estado"
            value={initialEstado}
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
          <label htmlFor="fecha" className="text-sm font-medium">
            Fecha de entrega
          </label>
          <input
            id="fecha"
            type="date"
            value={initialFecha}
            onChange={(event) => updateParam("fecha", event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
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
