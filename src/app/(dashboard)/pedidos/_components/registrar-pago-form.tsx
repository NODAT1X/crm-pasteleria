"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { MetodoPago, TipoPago } from "@/generated/prisma/enums";
import { registrarPagoAction } from "@/modules/pagos/actions";
import { METODO_PAGO_OPTIONS, TIPO_PAGO_OPTIONS } from "@/modules/pagos/labels";

type RegistrarPagoFormProps = {
  pedidoId: string;
  saldoPendiente: number;
};

type FieldErrors = {
  tipoPago?: string;
  metodoPago?: string;
  monto?: string;
  referencia?: string;
  notas?: string;
};

const MAX_REFERENCIA = 120;
const MAX_NOTAS = 500;

function formatMoney(value: number): string {
  return value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

/**
 * Validaciones de EXPERIENCIA (no de negocio): evitan un viaje al servidor
 * para errores obvios, pero el backend (`registrarPagoSchema` +
 * `registrarPagoService`) sigue siendo la única defensa real contra montos
 * inválidos o sobrepagos.
 */
function validar(params: {
  tipoPago: TipoPago | "";
  metodoPago: MetodoPago | "";
  monto: string;
  referencia: string;
  notas: string;
  saldoPendiente: number;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (!params.tipoPago) {
    errors.tipoPago = "Selecciona el tipo de pago.";
  }
  if (!params.metodoPago) {
    errors.metodoPago = "Selecciona el método de pago.";
  }

  const montoTrimmed = params.monto.trim();
  if (!montoTrimmed) {
    errors.monto = "El monto es obligatorio.";
  } else {
    const monto = Number(montoTrimmed);
    if (!Number.isFinite(monto)) {
      errors.monto = "El monto debe ser un número válido.";
    } else if (monto <= 0) {
      errors.monto = "El monto debe ser mayor a 0.";
    } else if (monto > params.saldoPendiente) {
      errors.monto = `El monto no puede superar el saldo pendiente (${formatMoney(params.saldoPendiente)}).`;
    }
  }

  if (params.referencia.trim().length > MAX_REFERENCIA) {
    errors.referencia = `La referencia debe tener como máximo ${MAX_REFERENCIA} caracteres.`;
  }
  if (params.notas.trim().length > MAX_NOTAS) {
    errors.notas = `Las notas deben tener como máximo ${MAX_NOTAS} caracteres.`;
  }

  return errors;
}

/**
 * Formulario para registrar un pago (anticipo/abono/liquidación) de un
 * pedido (S3-016).
 *
 * Es una capa de captura y presentación: reutiliza `registrarPagoAction`
 * (Server Action de S3-014) sin duplicar reglas financieras. Toda validación
 * crítica (sobrepago, pertenencia al tenant, monto) sigue viviendo en Zod y en
 * `pagos.service.ts`; las validaciones de aquí solo evitan un viaje al
 * servidor para errores obvios.
 */
export function RegistrarPagoForm({
  pedidoId,
  saldoPendiente,
}: RegistrarPagoFormProps) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [tipoPago, setTipoPago] = useState<TipoPago | "">("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago | "">("");
  const [monto, setMonto] = useState("");
  const [referencia, setReferencia] = useState("");
  const [notas, setNotas] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function resetForm() {
    setTipoPago("");
    setMetodoPago("");
    setMonto("");
    setReferencia("");
    setNotas("");
    setFieldErrors({});
    setFormError(null);
  }

  function handleCancelar() {
    resetForm();
    setAbierto(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Evita doble envío: si ya hay una petición en curso, ignora el submit.
    if (isPending) return;

    setFormError(null);

    const errors = validar({
      tipoPago,
      metodoPago,
      monto,
      referencia,
      notas,
      saldoPendiente,
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsPending(true);

    const result = await registrarPagoAction({
      pedido_id: pedidoId,
      tipo_pago: tipoPago,
      metodo_pago: metodoPago,
      monto,
      referencia,
      notas,
    });

    setIsPending(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    resetForm();
    setAbierto(false);
    // Refresca el Server Component del detalle: resumen, saldo y estado de
    // pago se recalculan en backend y llegan ya actualizados.
    router.refresh();
  }

 if (saldoPendiente <= 0) {
  return (
    <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
      <p className="text-sm text-green-700">
        El pedido está liquidado; no hay pagos pendientes.
      </p>
    </div>
  );
 }

  if (!abierto) {
    return (
      <div className="mt-4">
        <Button
          type="button"
          size="sm"
          onClick={() => setAbierto(true)}
        >
          Registrar pago
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      {formError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {formError}
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="tipoPago" className="text-sm font-medium">
          Tipo de pago <span className="text-destructive">*</span>
        </label>
        <select
          id="tipoPago"
          value={tipoPago}
          onChange={(event) =>
            setTipoPago(event.target.value as TipoPago | "")
          }
          disabled={isPending}
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Selecciona un tipo</option>
          {TIPO_PAGO_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {fieldErrors.tipoPago ? (
          <p className="text-sm text-destructive">{fieldErrors.tipoPago}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="metodoPago" className="text-sm font-medium">
          Método de pago <span className="text-destructive">*</span>
        </label>
        <select
          id="metodoPago"
          value={metodoPago}
          onChange={(event) =>
            setMetodoPago(event.target.value as MetodoPago | "")
          }
          disabled={isPending}
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Selecciona un método</option>
          {METODO_PAGO_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {fieldErrors.metodoPago ? (
          <p className="text-sm text-destructive">{fieldErrors.metodoPago}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="monto" className="text-sm font-medium">
          Monto <span className="text-destructive">*</span>
        </label>
        <input
          id="monto"
          type="number"
          step="0.01"
          min="0.01"
          inputMode="decimal"
          value={monto}
          onChange={(event) => setMonto(event.target.value)}
          disabled={isPending}
          placeholder="0.00"
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <p className="text-xs text-muted-foreground">
          Saldo pendiente: {formatMoney(saldoPendiente)}
        </p>
        {fieldErrors.monto ? (
          <p className="text-sm text-destructive">{fieldErrors.monto}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="referencia" className="text-sm font-medium">
          Referencia
        </label>
        <input
          id="referencia"
          type="text"
          value={referencia}
          onChange={(event) => setReferencia(event.target.value)}
          disabled={isPending}
          maxLength={MAX_REFERENCIA}
          placeholder="Folio o número de transferencia (opcional)"
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {fieldErrors.referencia ? (
          <p className="text-sm text-destructive">{fieldErrors.referencia}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="notasPago" className="text-sm font-medium">
          Nota
        </label>
        <textarea
          id="notasPago"
          value={notas}
          onChange={(event) => setNotas(event.target.value)}
          disabled={isPending}
          maxLength={MAX_NOTAS}
          rows={3}
          placeholder="Comentario adicional del pago (opcional)"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {fieldErrors.notas ? (
          <p className="text-sm text-destructive">{fieldErrors.notas}</p>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar pago"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={handleCancelar}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
