"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { createPedidoAction } from "@/modules/pedidos/actions";

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

type PedidoItemForm = {
  id: string;
  nombre_snapshot: string;
  descripcion: string;
  cantidad: string;
  precio_unitario: string;
};

/**
 * Errores por campo de cada item.
 * Sirve para mostrar el mensaje debajo del campo exacto que está mal.
 */
type ItemFieldErrors = {
  nombre_snapshot?: string;
  cantidad?: string;
  precio_unitario?: string;
};

/**
 * Errores generales del formulario.
 * Cliente, fecha y hora tienen su propio error.
 * Los items tienen errores agrupados por id.
 */
type FieldErrors = {
  clienteId?: string;
  fechaEntrega?: string;
  horaEntrega?: string;
  itemsRequired?: string;
  itemErrors?: Record<string, ItemFieldErrors>;
};

/**
 * Crea un item vacío para el formulario.
 * Se inicia con cantidad 1 para facilitar la captura.
 */
function createEmptyItem(id: string): PedidoItemForm {
  return {
    id,
    nombre_snapshot: "",
    descripcion: "",
    cantidad: "1",
    precio_unitario: "",
  };
}

/**
 * Genera ids temporales para los items en frontend.
 * No se guardan en base de datos; solo sirven para renderizar la lista.
 */
function createItemId() {
  return `item-${crypto.randomUUID()}`;
}

/**
 * Convierte el texto del input a número.
 * Si el valor no es válido, lo tratamos como 0 para calcular sin romper la UI.
 */
function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Redondea montos a 2 decimales.
 * Evita resultados raros por operaciones con decimales en JavaScript.
 */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Muestra montos en formato moneda MXN.
 */
function formatMoney(value: number): string {
  return value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

export function NuevoPedidoForm({ clientes }: NuevoPedidoFormProps) {
  const [clienteId, setClienteId] = useState("");
  const [clienteSearch, setClienteSearch] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>("recoleccion");
  const [direccionEntrega, setDireccionEntrega] = useState("");
  const [notasInternas, setNotasInternas] = useState("");

  /**
   * Items dinámicos del pedido.
   * Esta parte corresponde a S2-006.
   */
  const [items, setItems] = useState<PedidoItemForm[]>([
    createEmptyItem("item-1"),
  ]);

  /**
   * Error de servidor.
   * Se usa solo cuando el backend rechaza el guardado.
   */
  const [error, setError] = useState<string | null>(null);

  /**
   * Errores por campo.
   * Se muestran debajo de cada input para que el dueño sepa qué corregir.
   */
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Buscador simple de clientes activos.
   * Filtra por nombre, teléfono o WhatsApp.
   */
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

  /**
   * Calcula subtotal por item.
   * subtotal = cantidad * precio_unitario
   */
  const itemsCalculados = useMemo(() => {
    return items.map((item) => {
      const cantidad = toNumber(item.cantidad);
      const precioUnitario = toNumber(item.precio_unitario);
      const subtotal = roundMoney(cantidad * precioUnitario);

      return {
        ...item,
        cantidadNumber: cantidad,
        precioUnitarioNumber: precioUnitario,
        subtotal,
      };
    });
  }, [items]);

  /**
   * Calcula el total del pedido como suma de subtotales.
   */
  const total = useMemo(() => {
    return roundMoney(
      itemsCalculados.reduce((sum, item) => sum + item.subtotal, 0),
    );
  }, [itemsCalculados]);

  /**
   * Limpia el error de un campo general cuando el usuario lo corrige.
   */
  function clearFieldError(
    field: "clienteId" | "fechaEntrega" | "horaEntrega",
  ) {
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));
  }

  /**
   * Limpia el error de un campo específico de un item.
   */
  function clearItemFieldError(itemId: string, field: keyof ItemFieldErrors) {
    setFieldErrors((currentErrors) => {
      const itemErrors = currentErrors.itemErrors?.[itemId];

      if (!itemErrors?.[field]) {
        return currentErrors;
      }

      const nextItemErrors = { ...(currentErrors.itemErrors ?? {}) };
      const nextErrorsForItem = {
        ...itemErrors,
        [field]: undefined,
      };

      const hasErrorsForItem = Object.values(nextErrorsForItem).some(Boolean);

      if (hasErrorsForItem) {
        nextItemErrors[itemId] = nextErrorsForItem;
      } else {
        delete nextItemErrors[itemId];
      }

      return {
        ...currentErrors,
        itemErrors: nextItemErrors,
      };
    });
  }

  /**
   * Actualiza un campo de un item.
   * Si ese campo tenía error, se limpia al editarlo.
   */
  function updateItem(
    itemId: string,
    field: keyof PedidoItemForm,
    value: string,
  ) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item,
      ),
    );

    if (
      field === "nombre_snapshot" ||
      field === "cantidad" ||
      field === "precio_unitario"
    ) {
      clearItemFieldError(itemId, field);
    }
  }

  /**
   * Agrega un nuevo item al pedido antes de guardar.
   */
  function addItem() {
    setItems((currentItems) => [
      ...currentItems,
      createEmptyItem(createItemId()),
    ]);

    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      itemsRequired: undefined,
    }));
  }

  /**
   * Quita un item del pedido antes de guardar.
   */
  function removeItem(itemId: string) {
    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== itemId),
    );

    setFieldErrors((currentErrors) => {
      const nextItemErrors = { ...(currentErrors.itemErrors ?? {}) };
      delete nextItemErrors[itemId];

      return {
        ...currentErrors,
        itemErrors: nextItemErrors,
      };
    });
  }

  /**
   * Valida el formulario completo.
   * Si hay errores, los muestra debajo de cada campo y no guarda nada.
   * Si todo está correcto, llama al backend para crear el pedido.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setFieldErrors({});
    setSuccessMessage(null);

    const nextFieldErrors: FieldErrors = {};
    const nextItemErrors: Record<string, ItemFieldErrors> = {};

    if (!clienteId) {
      nextFieldErrors.clienteId = "Selecciona un cliente activo.";
    }

    if (!fechaEntrega) {
      nextFieldErrors.fechaEntrega = "La fecha de entrega es obligatoria.";
    }

    if (!horaEntrega) {
      nextFieldErrors.horaEntrega = "La hora de entrega es obligatoria.";
    }

    if (items.length === 0) {
      nextFieldErrors.itemsRequired = "Agrega al menos un item al pedido.";
    }

    itemsCalculados.forEach((item) => {
      const errorsForItem: ItemFieldErrors = {};

      if (!item.nombre_snapshot.trim()) {
        errorsForItem.nombre_snapshot = "El nombre del item es obligatorio.";
      }

      if (!item.cantidad || item.cantidadNumber <= 0) {
        errorsForItem.cantidad = "La cantidad debe ser mayor a 0.";
      } else if (!Number.isInteger(item.cantidadNumber)) {
        errorsForItem.cantidad = "La cantidad debe ser un número entero.";
      }

      if (!item.precio_unitario) {
        errorsForItem.precio_unitario = "El precio unitario es obligatorio.";
      } else if (item.precioUnitarioNumber < 0) {
        errorsForItem.precio_unitario = "El precio unitario no puede ser negativo.";
      }

      if (Object.keys(errorsForItem).length > 0) {
        nextItemErrors[item.id] = errorsForItem;
      }
    });

    if (Object.keys(nextItemErrors).length > 0) {
      nextFieldErrors.itemErrors = nextItemErrors;
    }

    const hasErrors =
      Boolean(nextFieldErrors.clienteId) ||
      Boolean(nextFieldErrors.fechaEntrega) ||
      Boolean(nextFieldErrors.horaEntrega) ||
      Boolean(nextFieldErrors.itemsRequired) ||
      Boolean(nextFieldErrors.itemErrors);

    if (hasErrors) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setIsSaving(true);

    const result = await createPedidoAction({
      cliente_id: clienteId,
      fecha_entrega: fechaEntrega,
      hora_entrega: horaEntrega,
      tipo_entrega: tipoEntrega,
      direccion_entrega:
        tipoEntrega === "domicilio" ? direccionEntrega : null,
      notas_internas: notasInternas,
      total,
      items: itemsCalculados.map((item) => ({
        producto_id: null,
        nombre_snapshot: item.nombre_snapshot,
        descripcion: item.descripcion,
        cantidad: item.cantidadNumber,
        precio_unitario: item.precioUnitarioNumber,
        subtotal: item.subtotal,
      })),
    });

    setIsSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccessMessage("Pedido guardado correctamente.");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-lg border bg-background p-6 shadow-sm"
    >
      <div className="space-y-1">
        <h3 className="font-medium">Datos base del pedido</h3>
        <p className="text-sm text-muted-foreground">
          Captura cliente, entrega e items del pedido personalizado.
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
            onChange={(event) => {
              setClienteId(event.target.value);
              clearFieldError("clienteId");
            }}
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

          {fieldErrors.clienteId ? (
            <p className="text-sm text-destructive">
              {fieldErrors.clienteId}
            </p>
          ) : null}

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
            onChange={(event) => {
              setFechaEntrega(event.target.value);
              clearFieldError("fechaEntrega");
            }}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />

          {fieldErrors.fechaEntrega ? (
            <p className="text-sm text-destructive">
              {fieldErrors.fechaEntrega}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="horaEntrega" className="text-sm font-medium">
            Hora de entrega <span className="text-destructive">*</span>
          </label>
          <input
            id="horaEntrega"
            type="time"
            value={horaEntrega}
            onChange={(event) => {
              setHoraEntrega(event.target.value);
              clearFieldError("horaEntrega");
            }}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />

          {fieldErrors.horaEntrega ? (
            <p className="text-sm text-destructive">
              {fieldErrors.horaEntrega}
            </p>
          ) : null}
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

      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-medium">Items del pedido</h3>
            <p className="text-sm text-muted-foreground">
              Agrega uno o más conceptos. El total se calcula desde los
              subtotales.
            </p>
          </div>

          <Button type="button" variant="outline" onClick={addItem}>
            Agregar item
          </Button>
        </div>

        {itemsCalculados.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            Agrega al menos un item para poder guardar el pedido.
          </div>
        ) : null}

        {fieldErrors.itemsRequired ? (
          <p className="text-sm text-destructive">
            {fieldErrors.itemsRequired}
          </p>
        ) : null}

        <div className="space-y-4">
          {itemsCalculados.map((item, index) => (
            <div key={item.id} className="rounded-lg border p-4">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h4 className="text-sm font-medium">Item {index + 1}</h4>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => removeItem(item.id)}
                >
                  Quitar
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label
                    htmlFor={`nombre-${item.id}`}
                    className="text-sm font-medium"
                  >
                    Producto o concepto{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <input
                    id={`nombre-${item.id}`}
                    type="text"
                    value={item.nombre_snapshot}
                    onChange={(event) =>
                      updateItem(
                        item.id,
                        "nombre_snapshot",
                        event.target.value,
                      )
                    }
                    placeholder="Ej. Pastel personalizado"
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />

                  {fieldErrors.itemErrors?.[item.id]?.nombre_snapshot ? (
                    <p className="text-sm text-destructive">
                      {fieldErrors.itemErrors[item.id]?.nombre_snapshot}
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
                      updateItem(item.id, "descripcion", event.target.value)
                    }
                    placeholder="Detalle opcional del item"
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
                      updateItem(item.id, "cantidad", event.target.value)
                    }
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />

                  {fieldErrors.itemErrors?.[item.id]?.cantidad ? (
                    <p className="text-sm text-destructive">
                      {fieldErrors.itemErrors[item.id]?.cantidad}
                    </p>
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
                      updateItem(item.id, "precio_unitario", event.target.value)
                    }
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />

                  {fieldErrors.itemErrors?.[item.id]?.precio_unitario ? (
                    <p className="text-sm text-destructive">
                      {fieldErrors.itemErrors[item.id]?.precio_unitario}
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
          ))}
        </div>

        <div className="flex justify-end border-t pt-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total del pedido</p>
            <p className="text-xl font-semibold">{formatMoney(total)}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <Button asChild type="button" variant="outline">
          <Link href="/clientes">Cancelar</Link>
        </Button>

        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Guardando..." : "Guardar pedido"}
        </Button>
      </div>
    </form>
  );
}