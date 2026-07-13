"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Buscador en tiempo real del listado de clientes.
 *
 * La fuente de estado del listado es la URL (`?q=`): este input solo escribe en
 * ella con debounce y `router.replace()`, y el Server Component de la página
 * vuelve a consultar `listClientesAction` con el nuevo `q`. Así no se duplica la
 * tabla ni la lógica de datos en el cliente, y la búsqueda queda enlazable y
 * compartible por URL.
 */

const DEBOUNCE_MS = 300;
const SEARCH_PARAM = "q";

type ClientesSearchInputProps = {
  /** Valor inicial tomado de `searchParams.q` en el servidor. */
  initialQuery: string;
};

export function ClientesSearchInput({
  initialQuery,
}: ClientesSearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);

  /**
   * Escribe el texto en la URL tras la pausa del debounce. Se compara contra el
   * `q` actual para no navegar cuando no hay un cambio real (evita reemplazos
   * redundantes, p. ej. al re-ejecutarse el efecto tras actualizar la URL).
   */
  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      const current = params.get(SEARCH_PARAM) ?? "";

      if (trimmed === current) return;

      if (trimmed) {
        params.set(SEARCH_PARAM, trimmed);
      } else {
        params.delete(SEARCH_PARAM);
      }

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    }, DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [value, pathname, router, searchParams]);

  // Limpia de inmediato (sin esperar el debounce) y devuelve el listado completo.
  function handleClear() {
    setValue("");

    const params = new URLSearchParams(searchParams.toString());
    params.delete(SEARCH_PARAM);

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  }

  return (
    <div className="flex-1">
      <label
        htmlFor="q"
        className="mb-2 block text-sm font-medium text-foreground"
      >
        Buscar cliente
      </label>

      <div className="relative">
        <input
          id="q"
          name="q"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Buscar por nombre o teléfono"
          className="h-9 w-full rounded-lg border border-input bg-background px-3 pr-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />

        {value ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <span aria-hidden="true" className="text-base leading-none">
              ×
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
