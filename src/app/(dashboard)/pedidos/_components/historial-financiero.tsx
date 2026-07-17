"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { anularMovimientoFinancieroAction } from "@/modules/pagos/actions";
import {
  getEstadoMovimientoPagoBadgeClass,
  getEstadoMovimientoPagoLabel,
  getMetodoPagoLabel,
  getTipoMovimientoPagoLabel,
  getTipoPagoLabel,
} from "@/modules/pagos/labels";
import type { MovimientoFinancieroDTO } from "@/modules/pagos/types";

type HistorialFinancieroProps = {
  movimientos: MovimientoFinancieroDTO[];
};

const MIN_MOTIVO = 3;

function formatFecha(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function formatMoney(value: number) {
  return value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

function formatValue(value: string | null) {
  return value && value.trim().length > 0 ? value : "—";
}

/**
 * Historial de movimientos financieros del pedido (S3-017): pagos,
 * devoluciones y retenciones, aplicados y anulados.
 *
 * La anulación se confirma inline dentro de la fila del movimiento (sin
 * `window.prompt`/`window.confirm` ni modal): al hacer clic en "Anular" la
 * fila abre un bloque con el motivo, un aviso de irreversibilidad y los
 * botones de confirmar/cancelar. Solo una fila puede estar en modo
 * anulación a la vez.
 */
export function HistorialFinanciero({
  movimientos,
}: HistorialFinancieroProps) {
  const router = useRouter();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleIniciarAnulacion(movimientoId: string) {
    setError(null);
    setConfirmingId(movimientoId);
    setMotivo("");
    setMotivoError(null);
  }

  function handleCancelarAnulacion() {
    setConfirmingId(null);
    setMotivo("");
    setMotivoError(null);
  }

  async function handleConfirmarAnulacion(movimientoId: string) {
    const motivoTrim = motivo.trim();
    if (motivoTrim.length < MIN_MOTIVO) {
      setMotivoError(
        `El motivo de la anulación es obligatorio y debe tener al menos ${MIN_MOTIVO} caracteres.`,
      );
      return;
    }

    setMotivoError(null);
    setPendingId(movimientoId);

    const result = await anularMovimientoFinancieroAction({
      movimiento_id: movimientoId,
      motivo: motivoTrim,
    });

    setPendingId(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setConfirmingId(null);
    setMotivo("");
    setMotivoError(null);

    // Refresca el Server Component para reflejar el movimiento anulado y el
    // resumen financiero recalculado.
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
      <div className="border-b p-4">
        <h3 className="font-medium">Historial financiero</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Pagos, devoluciones y retenciones registrados en este pedido.
        </p>
      </div>

      {error ? (
        <div className="border-b border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {movimientos.length === 0 ? (
        <div className="p-6 text-center">
          <h4 className="text-sm font-medium">
            Este pedido no tiene movimientos financieros registrados.
          </h4>
          <p className="mt-2 text-sm text-muted-foreground">
            Los pagos, devoluciones y retenciones aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Movimiento</th>
                <th className="px-4 py-3 font-medium">Tipo de pago</th>
                <th className="px-4 py-3 font-medium">Método</th>
                <th className="px-4 py-3 text-right font-medium">Monto</th>
                <th className="px-4 py-3 font-medium">Referencia</th>
                <th className="px-4 py-3 font-medium">Notas</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acción</th>
              </tr>
            </thead>

            <tbody>
              {movimientos.map((movimiento) => {
                const esAplicado = movimiento.estado === "aplicado";
                const enProceso = pendingId === movimiento.id;
                const enConfirmacion = confirmingId === movimiento.id;

                return (
                  <Fragment key={movimiento.id}>
                    <tr
                      className={`border-b last:border-b-0 ${
                        esAplicado ? "" : "text-muted-foreground"
                      } ${enConfirmacion ? "border-b-0" : ""}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatFecha(movimiento.fecha_recepcion)}
                      </td>
                      <td className="px-4 py-3">
                        {getTipoMovimientoPagoLabel(movimiento.tipo_movimiento)}
                      </td>
                      <td className="px-4 py-3">
                        {getTipoPagoLabel(movimiento.tipo_pago)}
                      </td>
                      <td className="px-4 py-3">
                        {getMetodoPagoLabel(movimiento.metodo_pago)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {formatMoney(movimiento.monto)}
                      </td>
                      <td className="px-4 py-3">
                        {formatValue(movimiento.referencia)}
                      </td>
                      <td className="px-4 py-3 max-w-[16rem] whitespace-pre-wrap">
                        {formatValue(movimiento.notas)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getEstadoMovimientoPagoBadgeClass(movimiento.estado)}`}
                        >
                          {getEstadoMovimientoPagoLabel(movimiento.estado)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {esAplicado && !enConfirmacion ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={confirmingId !== null || pendingId !== null}
                            onClick={() => handleIniciarAnulacion(movimiento.id)}
                          >
                            Anular
                          </Button>
                        ) : null}
                      </td>
                    </tr>

                    {enConfirmacion ? (
                      <tr className="border-b last:border-b-0">
                        <td colSpan={9} className="px-4 py-3">
                          <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                            <div className="space-y-1.5">
                              <label
                                htmlFor={`motivo-anulacion-${movimiento.id}`}
                                className="text-sm font-medium"
                              >
                                Motivo de la anulación{" "}
                                <span className="text-destructive">*</span>
                              </label>
                              <textarea
                                id={`motivo-anulacion-${movimiento.id}`}
                                value={motivo}
                                onChange={(event) => {
                                  setMotivo(event.target.value);
                                  if (motivoError) setMotivoError(null);
                                }}
                                rows={2}
                                disabled={enProceso}
                                placeholder="Ej. Pago registrado por error o cliente canceló la compra."
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                              />
                              {motivoError ? (
                                <p className="text-sm text-destructive">
                                  {motivoError}
                                </p>
                              ) : null}
                            </div>

                            <p className="text-xs text-muted-foreground">
                              Este movimiento no se eliminará. Permanecerá en
                              el historial con estado &quot;Anulado&quot; para
                              conservar la trazabilidad.
                            </p>

                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={enProceso}
                                onClick={() =>
                                  handleConfirmarAnulacion(movimiento.id)
                                }
                              >
                                {enProceso
                                  ? "Anulando..."
                                  : "Anular movimiento"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={enProceso}
                                onClick={handleCancelarAnulacion}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
