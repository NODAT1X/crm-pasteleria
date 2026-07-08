"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type ClienteOption = {
  id: string;
  nombre: string;
  telefono: string | null;
  whatsapp: string | null;
};

type NuevoPedidoFormProps = {
  clientes: ClienteOption[];
};

type TipoEntrega = "recoleccion" | "domicilio";

export function NuevoPedidoForm({ clientes }: NuevoPedidoFormProps) {
  const [clienteId, setClienteId] = useState("");
  const [clienteSearch, setClienteSearch] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>("recoleccion");
  const [direccionEntrega, setDireccionEntrega] = useState("");
  const [notasInternas, setNotasInternas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clientesFiltrados = useMemo(() => {
    const query = clienteSearch.trim().toLowerCase();

    if (!query) return clientes;

    return clientes.filter((cliente) => {
      const nombre = cliente.nombre.toLowerCase();
      const telefono = cliente.telefono ?? "";
      const whatsapp = cliente.whatsapp ?? "";

      return (
        nombre.includes(query) ||
        telefono.includes(query) ||
        whatsapp.includes(query)
      );
    });
  }, [clienteSearch, clientes]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  setError(null);
  setSuccessMessage(null);

  const errors: string[] = [];

  if (!clienteId) {
    errors.push("Selecciona un cliente activo para iniciar el pedido.");
  }

  if (!fechaEntrega) {
    errors.push("La fecha de entrega es obligatoria.");
  }

  if (!horaEntrega) {
    errors.push("La hora de entrega es obligatoria.");
  }

  if (errors.length > 0) {
    setError(errors.join(" "));
    return;
  }

  setSuccessMessage(
    "Datos base validados. Los productos del pedido se agregarán en la siguiente tarea.",
  );
}

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-lg border bg-background p-6 shadow-sm"
    >
      <div className="space-y-1">
        <h3 className="font-medium">Datos base del pedido</h3>
        <p className="text-sm text-muted-foreground">
          Captura cliente, fecha, hora y datos de entrega. Productos, pagos,
          WhatsApp y calendario quedan fuera de esta tarea.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-lg border bg-muted/50 p-3 text-sm">
          {successMessage}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="clienteSearch" className="text-sm font-medium">
            Buscar cliente activo
          </label>
          <input
            id="clienteSearch"
            type="search"
            value={clienteSearch}
            onChange={(event) => setClienteSearch(event.target.value)}
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
            onChange={(event) => setClienteId(event.target.value)}
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="fechaEntrega" className="text-sm font-medium">
            Fecha de entrega <span className="text-destructive">*</span>
          </label>
          <input
            id="fechaEntrega"
            type="date"
            value={fechaEntrega}
            onChange={(event) => setFechaEntrega(event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="horaEntrega" className="text-sm font-medium">
            Hora de entrega <span className="text-destructive">*</span>
          </label>
          <input
            id="horaEntrega"
            type="time"
            value={horaEntrega}
            onChange={(event) => setHoraEntrega(event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="tipoEntrega" className="text-sm font-medium">
            Tipo de entrega
          </label>
          <select
            id="tipoEntrega"
            value={tipoEntrega}
            onChange={(event) =>
              setTipoEntrega(event.target.value as TipoEntrega)
            }
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="recoleccion">Recolección</option>
            <option value="domicilio">Domicilio</option>
          </select>
        </div>

        {tipoEntrega === "domicilio" ? (
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="direccionEntrega" className="text-sm font-medium">
              Dirección de entrega
            </label>
            <textarea
              id="direccionEntrega"
              value={direccionEntrega}
              onChange={(event) => setDireccionEntrega(event.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Dirección donde se entregará el pedido"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        ) : null}

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="notasInternas" className="text-sm font-medium">
            Notas internas
          </label>
          <textarea
            id="notasInternas"
            value={notasInternas}
            onChange={(event) => setNotasInternas(event.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="Indicaciones internas para el pedido"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <Button asChild type="button" variant="outline">
          <Link href="/clientes">Cancelar</Link>
        </Button>

        <Button type="submit">Validar datos base</Button>
      </div>
    </form>
  );
}