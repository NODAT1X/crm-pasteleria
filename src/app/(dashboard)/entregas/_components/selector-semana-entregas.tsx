"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  hoyFechaOperativaLocal,
  sumarDiasFechaOperativa,
} from "@/modules/pedidos/fecha-operativa";

type SelectorSemanaEntregasProps = {
  /** Fecha ancla ya saneada por la página ("YYYY-MM-DD"). No necesita ser lunes. */
  fecha: string;
};

/**
 * Controles de navegación de semana de la vista semanal de entregas (S4-013):
 * semana anterior / actual / siguiente.
 *
 * Igual que `SelectorFechaEntregas` (S4-012), la fuente de la fecha es la URL
 * (`?fecha=`): este componente solo la escribe con `router.replace()` y el
 * Server Component de la página vuelve a consultar
 * `listPedidosDeLaSemanaAction` con el nuevo ancla.
 *
 * Semana anterior/siguiente se calculan con ±7 días de aritmética de
 * calendario pura (`sumarDiasFechaOperativa`, UTC), así que el desplazamiento
 * es siempre exacto sin importar en qué día de la semana esté el ancla actual
 * ni si la semana cruza de mes o de año.
 */
export function SelectorSemanaEntregas({ fecha }: SelectorSemanaEntregasProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function irAFecha(nuevaFecha: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("fecha", nuevaFecha);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => irAFecha(sumarDiasFechaOperativa(fecha, -7))}
        className="h-9 whitespace-nowrap rounded-lg border border-input px-3 text-sm font-medium transition-colors hover:bg-muted"
      >
        Semana anterior
      </button>
      <button
        type="button"
        onClick={() => irAFecha(hoyFechaOperativaLocal())}
        className="h-9 whitespace-nowrap rounded-lg border border-input px-3 text-sm font-medium transition-colors hover:bg-muted"
      >
        Semana actual
      </button>
      <button
        type="button"
        onClick={() => irAFecha(sumarDiasFechaOperativa(fecha, 7))}
        className="h-9 whitespace-nowrap rounded-lg border border-input px-3 text-sm font-medium transition-colors hover:bg-muted"
      >
        Semana siguiente
      </button>
    </div>
  );
}
