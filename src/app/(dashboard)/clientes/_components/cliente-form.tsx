"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  createClienteAction,
  updateClienteAction,
} from "@/modules/clientes/actions";
import { Button } from "@/components/ui/button";

type ClienteFormValues = {
  nombre: string;
  telefono: string;
  whatsapp: string;
  email: string;
  direccion: string;
  notas: string;
};

type ClienteFormProps = {
  mode: "create" | "edit";
  clienteId?: string;
  initialValues?: Partial<ClienteFormValues>;
};

const emptyValues: ClienteFormValues = {
  nombre: "",
  telefono: "",
  whatsapp: "",
  email: "",
  direccion: "",
  notas: "",
};

export function ClienteForm({
  mode,
  clienteId,
  initialValues,
}: ClienteFormProps) {
  const router = useRouter();

  const [values, setValues] = useState<ClienteFormValues>({
    ...emptyValues,
    ...initialValues,
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateField(field: keyof ClienteFormValues, value: string) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setSuccessMessage(null);

    if (!values.nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    setLoading(true);

    const payload = {
      nombre: values.nombre,
      telefono: values.telefono,
      whatsapp: values.whatsapp,
      email: values.email,
      direccion: values.direccion,
      notas: values.notas,
    };

    const result =
      mode === "create"
        ? await createClienteAction(payload)
        : await updateClienteAction(clienteId ?? "", payload);

    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccessMessage(
      mode === "create"
        ? "Cliente creado correctamente."
        : "Cliente actualizado correctamente.",
    );

    router.push("/clientes");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-lg border bg-background p-6 shadow-sm"
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">
          {mode === "create" ? "Nuevo cliente" : "Editar cliente"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Captura los datos básicos del cliente para el CRM Pastelería.
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="nombre" className="text-sm font-medium">
            Nombre <span className="text-destructive">*</span>
          </label>
          <input
            id="nombre"
            name="nombre"
            value={values.nombre}
            onChange={(event) => updateField("nombre", event.target.value)}
            maxLength={120}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder="Nombre del cliente"
          />
          <p className="text-xs text-muted-foreground">
            Campo obligatorio.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="telefono" className="text-sm font-medium">
            Teléfono
          </label>
          <input
            id="telefono"
            name="telefono"
            value={values.telefono}
            onChange={(event) => updateField("telefono", event.target.value)}
            maxLength={30}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder="Ej. 2381234567"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="whatsapp" className="text-sm font-medium">
            WhatsApp
          </label>
          <input
            id="whatsapp"
            name="whatsapp"
            value={values.whatsapp}
            onChange={(event) => updateField("whatsapp", event.target.value)}
            maxLength={30}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder="Ej. 2381234567"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="email" className="text-sm font-medium">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={values.email}
            onChange={(event) => updateField("email", event.target.value)}
            maxLength={160}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder="cliente@correo.com"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="direccion" className="text-sm font-medium">
            Dirección
          </label>
          <textarea
            id="direccion"
            name="direccion"
            value={values.direccion}
            onChange={(event) => updateField("direccion", event.target.value)}
            maxLength={300}
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder="Dirección del cliente"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="notas" className="text-sm font-medium">
            Notas
          </label>
          <textarea
            id="notas"
            name="notas"
            value={values.notas}
            onChange={(event) => updateField("notas", event.target.value)}
            maxLength={1000}
            rows={4}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder="Preferencias, referencias o comentarios internos"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/clientes")}
          disabled={loading}
        >
          Cancelar
        </Button>

        <Button type="submit" disabled={loading}>
          {loading
            ? "Guardando..."
            : mode === "create"
              ? "Crear cliente"
              : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}