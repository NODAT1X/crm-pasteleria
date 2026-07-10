"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  createPedidoAction,
  updatePedidoAction,
} from "@/modules/pedidos/actions";

type ClienteOption = {
  id: string;
  nombre: string;
  telefono: string | null;
  whatsapp: string | null;
};

type TipoEntrega = "recoleccion" | "domicilio";

type PedidoItemForm = {
  id: string;
  nombre_snapshot: string;
  descripcion: string;
  cantidad: string;
  precio_unitario: string;
};

type PedidoFormInitialData = {
  cliente: ClienteOption;
  fecha_entrega: string;
  hora_entrega: string;
  tipo_entrega: TipoEntrega;
  direccion_entrega: string | null;
  notas_internas: string | null;
  items: {
    nombre_snapshot: string;
    descripcion: string | null;
    cantidad: number;
    precio_unitario: number;
  }[];
};

type NuevoPedidoFormProps = {
  mode?: "create" | "edit";
  clientes?: ClienteOption[];
  pedidoId?: string;
  initialData?: PedidoFormInitialData;
};

/**
 * Errores por campo de cada item.
 * Se usan para mostrar el mensaje debajo del input exacto que debe corregirse.
 */
type ItemFieldErrors = {
  nombre_snapshot?: string;
  cantidad?: string;
  precio_unitario?: string;
};

/**
 * Errores generales del formulario.
 * Cliente, fecha y hora tienen error propio; los items se agrupan por id.
 */
type FieldErrors = {
  clienteId?: string;
  fechaEntrega?: string;
  horaEntrega?: string;
  itemsRequired?: string;
  itemErrors?: Record<string, ItemFieldErrors>;
};

/**
 * Crea un item vacío para nuevo pedido o para agregar items en edición.
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
 * Genera ids temporales solo para renderizar items en el frontend.
 */
function createItemId() {
  return `item-${crypto.randomUUID()}`;
}

/**
 * Convierte valores de input a número sin romper la UI si el campo está vacío.
 */
function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Redondea dinero a 2 decimales para subtotal y total mostrados en pantalla.
 */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Muestra importes como moneda mexicana.
 */
function formatMoney(value: number): string {
  return value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

/**
 * Convierte los items existentes del pedido al formato editable del formulario.
 */
function mapInitialItems(initialData?: PedidoFormInitialData): PedidoItemForm[] {
  if (!initialData?.items.length) {
    return [createEmptyItem("item-1")];
  }

  return initialData.items.map((item, index) => ({
    id: `item-${index + 1}`,
    nombre_snapshot: item.nombre_snapshot,
    descripcion: item.descripcion ?? "",
    cantidad: String(item.cantidad),
    precio_unitario: String(item.precio_unitario),
  }));
}

export function NuevoPedidoForm({
  mode = "create",
  clientes = [],
  pedidoId,
  initialData,
}: NuevoPedidoFormProps) {
  const router = useRouter();
  const isEditMode = mode === "edit";

  const [clienteId, setClienteId] = useState(initialData?.cliente.id ?? "");
  const [clienteSearch, setClienteSearch] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState(
    initialData?.fecha_entrega ?? "",
  );
  const [horaEntrega, setHoraEntrega] = useState(
    initialData?.hora_entrega ?? "",
  );
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>(
    initialData?.tipo_entrega ?? "recoleccion",
  );
  const [direccionEntrega, setDireccionEntrega] = useState(
    initialData?.direccion_entrega ?? "",
  );
  const [notasInternas, setNotasInternas] = useState(
    initialData?.notas_internas ?? "",
  );

  /**
   * Items dinámicos.
   * En modo edición se inicializan con los items existentes del pedido.
   */
  const [items, setItems] = useState<PedidoItemForm[]>(
    mapInitialItems(initialData),
  );

  /**
   * Error de servidor.
   * Se usa cuando el backend rechaza guardar o actualizar.
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
   * Buscador simple de clientes activos para modo creación.
   * En edición no se cambia el cliente porque no está en el alcance.
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
   * Calcula el total como suma de subtotales.
   */
  const total = useMemo(() => {
    return roundMoney(
      itemsCalculados.reduce((sum, item) => sum + item.subtotal, 0),
    );
  }, [itemsCalculados]);

  const cancelHref = isEditMode && pedidoId ? `/pedidos/${pedidoId}` : "/pedidos";

  function clearFieldError(
    field: "clienteId" | "fechaEntrega" | "horaEntrega",
  ) {
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));
  }

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
   * Actualiza un campo de item y limpia su error si el usuario corrige.
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
   * Valida campos obligatorios antes de llamar al backend.
   * En modo edición reutiliza la misma validación de items y total.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setFieldErrors({});
    setSuccessMessage(null);

    const nextFieldErrors: FieldErrors = {};
    const nextItemErrors: Record<string, ItemFieldErrors> = {};

    if (!isEditMode && !clienteId) {
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
        errorsForItem.precio_unitario =
          "El precio unitario no puede ser negativo.";
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

    const payload = {
      fecha_entrega: fechaEntrega,
      hora_entrega: horaEntrega,
      tipo_entrega: tipoEntrega,
      direccion_entrega:
        tipoEntrega === "domicilio" ? direccionEntrega : null,
      notas_internas: notasInternas,
      items: itemsCalculados.map((item) => ({
        producto_id: null,
        nombre_snapshot: item.nombre_snapshot,
        descripcion: item.descripcion,
        cantidad: item.cantidadNumber,
        precio_unitario: item.precioUnitarioNumber,
        subtotal: item.subtotal,
      })),
    };

    setIsSaving(true);

    const result =
      isEditMode && pedidoId
        ? await updatePedidoAction(pedidoId, payload)
        : await createPedidoAction({
            cliente_id: clienteId,
            ...payload,
          });

    setIsSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccessMessage(
      isEditMode
        ? "Pedido actualizado correctamente."
        : "Pedido guardado correctamente.",
    );

    router.push(`/pedidos/${result.data.id}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-lg border bg-background p-6 shadow-sm"
    >
      <div className="space-y-1">
        <h3 className="font-medium">
          {isEditMode ? "Editar pedido" : "Datos base del pedido"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isEditMode
            ? "Actualiza datos básicos e items del pedido."
            : "Captura cliente, entrega e items del pedido personalizado."}
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

      {!isEditMode ? (
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
      ) : (
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium">Cliente asociado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {initialData?.cliente.nombre ?? "Cliente no disponible"}
          </p>

          {initialData?.cliente.id ? (
            <div className="mt-3">
              <Button asChild size="sm" variant="outline">
                <Link href={`/clientes/${initialData.cliente.id}`}>
                  Ver ficha de cliente
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      )}

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
          <Link href={cancelHref}>Cancelar</Link>
        </Button>

        <Button type="submit" disabled={isSaving}>
          {isSaving
            ? isEditMode
              ? "Guardando cambios..."
              : "Guardando..."
            : isEditMode
              ? "Guardar cambios"
              : "Guardar pedido"}
        </Button>
      </div>
    </form>
  );
}
