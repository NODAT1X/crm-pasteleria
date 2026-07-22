import type { DisponibilidadEntregaEstado } from "@/modules/pedidos/use-disponibilidad-entrega";

type DisponibilidadEntregaStatusProps = {
  estado: DisponibilidadEntregaEstado;
  motivo?: string;
  mensajeError?: string;
};

const BASE_CLASSES = "mt-2 rounded-lg border p-3 text-xs";
const INFO_CLASSES = `${BASE_CLASSES} bg-muted/40 text-muted-foreground`;
const OK_CLASSES = `${BASE_CLASSES} border-emerald-200 bg-emerald-50 text-emerald-800`;
const WARN_CLASSES = `${BASE_CLASSES} border-amber-200 bg-amber-50 text-amber-800`;
const CONFLICT_CLASSES = `${BASE_CLASSES} border-destructive/30 bg-destructive/10 text-destructive`;

/**
 * Estado visual de disponibilidad de reparto (S4-011).
 *
 * Solo presenta el resultado de `verificarDisponibilidadEntregaAction`
 * (S4-008): no calcula ni reinterpreta la ventana de 30 minutos aquí. Usa
 * `aria-live`/`role` para que lectores de pantalla anuncien el cambio de
 * estado sin que el usuario tenga que buscarlo.
 */
export function DisponibilidadEntregaStatus({
  estado,
  motivo,
  mensajeError,
}: DisponibilidadEntregaStatusProps) {
  switch (estado) {
    case "recoleccion":
      return (
        <p role="status" aria-live="polite" className={OK_CLASSES}>
          Esta recolección en sucursal puede compartir horario con otros
          pedidos. Puedes guardar normalmente.
        </p>
      );

    case "esperando":
      return (
        <p role="status" aria-live="polite" className={INFO_CLASSES}>
          Selecciona fecha y hora de entrega para consultar la disponibilidad
          de reparto a domicilio.
        </p>
      );

    case "consultando":
      return (
        <p role="status" aria-live="polite" className={INFO_CLASSES}>
          Consultando disponibilidad...
        </p>
      );

    case "disponible":
      return (
        <p role="status" aria-live="polite" className={OK_CLASSES}>
          Horario disponible para entrega a domicilio. Puedes guardar
          normalmente.
        </p>
      );

    case "ocupado":
      return (
        <div role="alert" aria-live="assertive" className={CONFLICT_CLASSES}>
          <p className="font-medium">
            {motivo ??
              "El horario seleccionado no está disponible para entrega a domicilio."}
          </p>
          <p className="mt-1">
            Selecciona otro horario fuera de la ventana de 30 minutos ocupada,
            o cambia el tipo de entrega a recolección en sucursal. No podrás
            guardar mientras este conflicto siga vigente.
          </p>
        </div>
      );

    case "error":
      return (
        <p role="status" aria-live="polite" className={WARN_CLASSES}>
          No se pudo verificar visualmente la disponibilidad
          {mensajeError ? `: ${mensajeError}. ` : ". "}
          El sistema validará el horario al guardar el pedido.
        </p>
      );

    default:
      return null;
  }
}
