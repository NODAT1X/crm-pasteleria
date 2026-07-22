"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  hoyFechaOperativaLocal,
  sumarDiasFechaOperativa,
} from "@/modules/pedidos/fecha-operativa";

type SelectorFechaEntregasProps = {
  /** Fecha ya saneada por la página ("YYYY-MM-DD"). */
  fecha: string;
};

/**
 * Controles de navegación de fecha de la vista diaria de entregas (S4-012):
 * selector de fecha + atajos día anterior / hoy / día siguiente.
 *
 * La fuente de la fecha es la URL (`?fecha=`): este componente solo la
 * escribe con `router.replace()` y el Server Component de la página vuelve a
 * consultar `listPedidosDelDiaAction` con el nuevo valor. Mismo patrón que
 * `PedidosFiltros`.
 */
export function SelectorFechaEntregas({ fecha }: SelectorFechaEntregasProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function irAFecha(nuevaFecha: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("fecha", nuevaFecha);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => irAFecha(sumarDiasFechaOperativa(fecha, -1))}
          className="h-9 whitespace-nowrap rounded-lg border border-input px-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          Día anterior
        </button>
        <button
          type="button"
          onClick={() => irAFecha(hoyFechaOperativaLocal())}
          className="h-9 whitespace-nowrap rounded-lg border border-input px-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={() => irAFecha(sumarDiasFechaOperativa(fecha, 1))}
          className="h-9 whitespace-nowrap rounded-lg border border-input px-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          Día siguiente
        </button>
      </div>

      <div className="space-y-1">
        <label htmlFor="fecha-entregas" className="text-sm font-medium">
          Fecha
        </label>
        <input
          id="fecha-entregas"
          type="date"
          value={fecha}
          onChange={(event) => irAFecha(event.target.value)}
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-auto"
        />
      </div>
    </div>
  );
}
