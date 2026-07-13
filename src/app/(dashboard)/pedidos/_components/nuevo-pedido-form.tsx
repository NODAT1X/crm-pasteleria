"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  createPedidoAction,
  updatePedidoAction,
} from "@/modules/pedidos/actions";

import { ClienteAsociadoInfo } from "./cliente-asociado-info";
import { ClienteSelectorField } from "./cliente-selector-field";
import { EntregaFields } from "./entrega-fields";
import { PedidoFormActions } from "./pedido-form-actions";
import { PedidoItemsSection } from "./pedido-items-section";

export type ClienteOption = {
  id: string;
  nombre: string;
  telefono: string | null;
  whatsapp: string | null;
};

export type TipoEntrega = "recoleccion" | "domicilio";

export type PedidoItemForm = {
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
export type ItemFieldErrors = {
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
export function formatMoney(value: number): string {
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

  /**
   * Cliente seleccionado (fuente de verdad del cliente del pedido). El
   * `cliente_id` que se envía al backend se deriva de aquí. En edición el
   * cliente no se cambia, pero se conserva para mostrarlo.
   */
  const [selectedCliente, setSelectedCliente] = useState<ClienteOption | null>(
    initialData?.cliente ?? null,
  );

  const clienteId = selectedCliente?.id ?? "";

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
        <ClienteSelectorField
          clientes={clientes}
          value={selectedCliente}
          onChange={(cliente) => {
            setSelectedCliente(cliente);
            if (cliente) {
              clearFieldError("clienteId");
            }
          }}
          error={fieldErrors.clienteId}
        />
      ) : (
        <ClienteAsociadoInfo cliente={initialData?.cliente} />
      )}

      <EntregaFields
        fechaEntrega={fechaEntrega}
        onFechaEntregaChange={(value) => {
          setFechaEntrega(value);
          clearFieldError("fechaEntrega");
        }}
        fechaEntregaError={fieldErrors.fechaEntrega}
        horaEntrega={horaEntrega}
        onHoraEntregaChange={(value) => {
          setHoraEntrega(value);
          clearFieldError("horaEntrega");
        }}
        horaEntregaError={fieldErrors.horaEntrega}
        tipoEntrega={tipoEntrega}
        onTipoEntregaChange={setTipoEntrega}
        direccionEntrega={direccionEntrega}
        onDireccionEntregaChange={setDireccionEntrega}
        notasInternas={notasInternas}
        onNotasInternasChange={setNotasInternas}
      />

      <PedidoItemsSection
        items={itemsCalculados}
        total={total}
        itemsRequiredError={fieldErrors.itemsRequired}
        itemErrors={fieldErrors.itemErrors}
        onAddItem={addItem}
        onRemoveItem={removeItem}
        onUpdateItem={updateItem}
      />

      <PedidoFormActions
        cancelHref={cancelHref}
        isEditMode={isEditMode}
        isSaving={isSaving}
      />
    </form>
  );
}