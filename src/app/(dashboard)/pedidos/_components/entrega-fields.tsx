import {
  TIPO_ENTREGA_OPTIONS,
  getTipoEntregaAyudaDisponibilidad,
} from "@/modules/pedidos/labels";
import type { DisponibilidadEntregaEstado } from "@/modules/pedidos/use-disponibilidad-entrega";

import { DisponibilidadEntregaStatus } from "./disponibilidad-entrega-status";
import type { TipoEntrega } from "./nuevo-pedido-form";

type EntregaFieldsProps = {
  fechaEntrega: string;
  onFechaEntregaChange: (value: string) => void;
  fechaEntregaError?: string;
  horaEntrega: string;
  onHoraEntregaChange: (value: string) => void;
  horaEntregaError?: string;
  tipoEntrega: TipoEntrega;
  onTipoEntregaChange: (value: TipoEntrega) => void;
  direccionEntrega: string;
  onDireccionEntregaChange: (value: string) => void;
  notasInternas: string;
  onNotasInternasChange: (value: string) => void;
  disponibilidadEstado: DisponibilidadEntregaEstado;
  disponibilidadMotivo?: string;
  disponibilidadMensajeError?: string;
};

/**
 * Campos de entrega y notas internas: fecha, hora, tipo de entrega,
 * dirección (solo si es a domicilio) y notas internas.
 */
export function EntregaFields({
  fechaEntrega,
  onFechaEntregaChange,
  fechaEntregaError,
  horaEntrega,
  onHoraEntregaChange,
  horaEntregaError,
  tipoEntrega,
  onTipoEntregaChange,
  direccionEntrega,
  onDireccionEntregaChange,
  notasInternas,
  onNotasInternasChange,
  disponibilidadEstado,
  disponibilidadMotivo,
  disponibilidadMensajeError,
}: EntregaFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <label htmlFor="fechaEntrega" className="text-sm font-medium">
          Fecha de entrega <span className="text-destructive">*</span>
        </label>
        <input
          id="fechaEntrega"
          type="date"
          value={fechaEntrega}
          onChange={(event) => onFechaEntregaChange(event.target.value)}
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />

        {fechaEntregaError ? (
          <p className="text-sm text-destructive">{fechaEntregaError}</p>
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
          onChange={(event) => onHoraEntregaChange(event.target.value)}
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />

        {horaEntregaError ? (
          <p className="text-sm text-destructive">{horaEntregaError}</p>
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
            onTipoEntregaChange(event.target.value as TipoEntrega)
          }
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {TIPO_ENTREGA_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/*
         * Ayuda diferenciada de disponibilidad (S4-009): deja claro que solo el
         * domicilio ocupa ventana de reparto; la recolección puede compartir
         * horario. No valida nada en el cliente: la regla la aplica el backend
         * (S4-008) al guardar y su error se muestra arriba del formulario.
         */}
        <p
          className={
            tipoEntrega === "domicilio"
              ? "rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
              : "rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground"
          }
        >
          {getTipoEntregaAyudaDisponibilidad(tipoEntrega)}
        </p>

        {/*
         * Resultado visual de disponibilidad (S4-011): refleja la consulta a
         * `verificarDisponibilidadEntregaAction` (S4-008) sin reinterpretar la
         * ventana de 30 minutos en el cliente. El backend sigue validando de
         * forma definitiva al guardar.
         */}
        <DisponibilidadEntregaStatus
          estado={disponibilidadEstado}
          motivo={disponibilidadMotivo}
          mensajeError={disponibilidadMensajeError}
        />
      </div>

      {tipoEntrega === "domicilio" ? (
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="direccionEntrega" className="text-sm font-medium">
            Dirección de entrega
          </label>
          <textarea
            id="direccionEntrega"
            value={direccionEntrega}
            onChange={(event) => onDireccionEntregaChange(event.target.value)}
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
          onChange={(event) => onNotasInternasChange(event.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="Indicaciones internas para el pedido"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
    </div>
  );
}
