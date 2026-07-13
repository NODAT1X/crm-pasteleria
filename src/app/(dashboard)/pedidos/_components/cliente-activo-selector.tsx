"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { listClientesAction } from "@/modules/clientes/actions";

/**
 * Forma mínima de un cliente activo para seleccionar en un pedido. Es la única
 * información que necesita el pedido: se guarda `id` y se muestran nombre y
 * contacto. Se exporta para que el formulario reutilice el mismo tipo.
 */
export type ClienteOption = {
  id: string;
  nombre: string;
  telefono: string | null;
  whatsapp: string | null;
};

type ClienteActivoSelectorProps = {
  /**
   * Clientes activos precargados en el servidor. Se muestran como sugerencias
   * antes de escribir, evitando un viaje al backend para la primera interacción.
   */
  clientesIniciales: ClienteOption[];
  /**
   * Cliente seleccionado. La fuente de verdad la mantiene el formulario, que
   * deriva de aquí el `cliente_id` a enviar; este componente es controlado.
   */
  value: ClienteOption | null;
  /** Notifica selección (cliente) o limpieza (`null`). */
  onChange: (cliente: ClienteOption | null) => void;
  /** Mensaje de error de validación del formulario para este campo. */
  error?: string;
};

// Debounce razonable para no golpear el backend en cada tecla.
const SEARCH_DEBOUNCE_MS = 300;
// Cuántos resultados pedir por búsqueda (tope real lo impone el backend).
const SEARCH_TAKE = 20;

function toClienteOption(cliente: ClienteOption): ClienteOption {
  return {
    id: cliente.id,
    nombre: cliente.nombre,
    telefono: cliente.telefono,
    whatsapp: cliente.whatsapp,
  };
}

/** Contacto legible: prioriza teléfono y cae en WhatsApp. */
function contactoLegible(cliente: ClienteOption): string {
  return cliente.telefono ?? cliente.whatsapp ?? "Sin teléfono registrado";
}

/**
 * Selector de cliente activo con búsqueda en tiempo real.
 *
 * Un solo control: se busca por nombre o teléfono (contra la Server Action
 * `listClientesAction`, que solo devuelve clientes activos del tenant actual),
 * se elige un resultado y el cliente queda visible como seleccionado. El tenant
 * lo deriva el backend; la UI nunca envía `pasteleria_id`.
 *
 * Pensado para extraerse a futuro como buscador reutilizable: no conoce nada del
 * pedido, solo emite el cliente elegido por `onChange`.
 */
export function ClienteActivoSelector({
  clientesIniciales,
  value,
  onChange,
  error,
}: ClienteActivoSelectorProps) {
  const [query, setQuery] = useState("");
  // Texto "asentado" tras la pausa del debounce (dispara la búsqueda real).
  const [debouncedQuery, setDebouncedQuery] = useState("");
  // Coincidencias del backend y a qué texto corresponden (para saber si el
  // resultado mostrado ya está al día con lo que el usuario escribió).
  const [matches, setMatches] = useState<ClienteOption[]>([]);
  const [matchesQuery, setMatchesQuery] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const trimmedQuery = query.trim();

  /**
   * Debounce: el texto se "asienta" tras la pausa en lugar de consultar en cada
   * tecla. El `setState` ocurre dentro del timeout, no en el cuerpo del efecto,
   * para no disparar renders en cascada.
   */
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(trimmedQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [trimmedQuery]);

  /**
   * Búsqueda en el backend cuando cambia el texto asentado. Solo corre con
   * texto; sin él la lista se deriva de las sugerencias iniciales. `cancelled`
   * descarta la respuesta de una búsqueda ya superada por otra más reciente
   * (evita resultados fuera de orden).
   */
  useEffect(() => {
    if (debouncedQuery === "") {
      return;
    }

    let cancelled = false;

    listClientesAction({ search: debouncedQuery, take: SEARCH_TAKE }).then(
      (result) => {
        if (cancelled) return;

        if (result.ok) {
          setMatches(result.data.map(toClienteOption));
          setSearchError(null);
        } else {
          setMatches([]);
          setSearchError(result.error);
        }

        setMatchesQuery(debouncedQuery);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Sin texto: sugerencias iniciales del servidor. Con texto: coincidencias.
  const results = trimmedQuery === "" ? clientesIniciales : matches;
  // "Buscando..." mientras el resultado mostrado no corresponda al texto actual
  // (cubre tanto la pausa del debounce como la petición en curso).
  const isSearching = trimmedQuery !== "" && matchesQuery !== trimmedQuery;

  function handleSelect(cliente: ClienteOption) {
    onChange(cliente);
    setQuery("");
    setIsOpen(false);
    setSearchError(null);
  }

  function handleClear() {
    onChange(null);
    setQuery("");
    setIsOpen(true);
  }

  // Vista: cliente ya seleccionado (el buscador se reemplaza por su ficha).
  if (value) {
    return (
      <div className="space-y-2">
        <span className="text-sm font-medium">
          Cliente <span className="text-destructive">*</span>
        </span>

        <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Cliente seleccionado</p>
            <p className="text-sm font-medium">{value.nombre}</p>
            <p className="text-sm text-muted-foreground">
              {contactoLegible(value)}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
          >
            Cambiar cliente
          </Button>
        </div>
      </div>
    );
  }

  // Vista: buscador activo (sin cliente seleccionado).
  return (
    <div className="space-y-2">
      <label htmlFor="clienteBuscador" className="text-sm font-medium">
        Cliente <span className="text-destructive">*</span>
      </label>

      <div className="relative">
        <input
          id="clienteBuscador"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          placeholder="Buscar por nombre o teléfono"
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />

        {isOpen ? (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border bg-background shadow-md">
            {isSearching && trimmedQuery !== "" ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Buscando clientes...
              </p>
            ) : searchError && trimmedQuery !== "" ? (
              <p className="px-3 py-2 text-sm text-destructive">
                {searchError}
              </p>
            ) : results.length > 0 ? (
              <ul className="max-h-60 overflow-y-auto">
                {results.map((cliente) => (
                  <li key={cliente.id}>
                    <button
                      type="button"
                      // `preventDefault` en mousedown evita que el blur del input
                      // cierre el panel antes de registrar el click en la opción.
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelect(cliente)}
                      className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="font-medium">{cliente.nombre}</span>
                      <span className="text-xs text-muted-foreground">
                        {contactoLegible(cliente)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                {trimmedQuery === ""
                  ? "No hay clientes activos disponibles."
                  : "No se encontraron clientes activos."}
              </p>
            )}
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <p className="text-sm text-muted-foreground">
        ¿No encuentras al cliente?{" "}
        <Link href="/clientes/nuevo" className="font-medium underline">
          Crear cliente
        </Link>
      </p>
    </div>
  );
}
