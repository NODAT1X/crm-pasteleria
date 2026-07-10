import Link from "next/link";

import type { ClienteOption } from "./nuevo-pedido-form";

type ClienteSelectorFieldProps = {
  clientes: ClienteOption[];
  clientesFiltrados: ClienteOption[];
  clienteSearch: string;
  onClienteSearchChange: (value: string) => void;
  clienteId: string;
  onClienteIdChange: (value: string) => void;
  error?: string;
};

/**
 * Buscador y selector de cliente activo para modo creación.
 * En edición no se cambia el cliente porque no está en el alcance.
 */
export function ClienteSelectorField({
  clientes,
  clientesFiltrados,
  clienteSearch,
  onClienteSearchChange,
  clienteId,
  onClienteIdChange,
  error,
}: ClienteSelectorFieldProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="clienteSearch" className="text-sm font-medium">
          Buscar cliente activo
        </label>
        <input
          id="clienteSearch"
          type="search"
          value={clienteSearch}
          onChange={(event) => onClienteSearchChange(event.target.value)}
          placeholder="Buscar por nombre, teléfono o WhatsApp"
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="clienteId" className="text-sm font-medium">
          Cliente <span className="text-destructive">*</span>
        </label>

        <select
          id="clienteId"
          value={clienteId}
          onChange={(event) => onClienteIdChange(event.target.value)}
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Selecciona un cliente</option>
          {clientesFiltrados.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nombre}
              {cliente.telefono ? ` — ${cliente.telefono}` : ""}
            </option>
          ))}
        </select>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {clientes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay clientes activos disponibles.{" "}
            <Link href="/clientes/nuevo" className="font-medium underline">
              Crear cliente
            </Link>
          </p>
        ) : null}

        {clientes.length > 0 && clientesFiltrados.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No se encontró un cliente con esa búsqueda.{" "}
            <Link href="/clientes/nuevo" className="font-medium underline">
              Crear cliente
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
