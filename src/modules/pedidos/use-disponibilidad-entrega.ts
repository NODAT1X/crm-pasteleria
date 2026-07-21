"use client";

import { useEffect, useState } from "react";

import type { TipoEntrega } from "@/generated/prisma/enums";
import { verificarDisponibilidadEntregaAction } from "@/modules/pedidos/actions";

/**
 * Estado visual de disponibilidad de entrega (S4-011).
 *
 * Este módulo NO calcula ni reinterpreta la ventana operativa de 30 minutos:
 * solo refleja el resultado de `verificarDisponibilidadEntregaAction`
 * (S4-008), que sigue siendo la única fuente de verdad. El backend vuelve a
 * validar al guardar (`createPedidoAction` / `updatePedidoAction`); esta
 * consulta es únicamente informativa para el formulario.
 */
export type DisponibilidadEntregaEstado =
  | "recoleccion"
  | "esperando"
  | "consultando"
  | "disponible"
  | "ocupado"
  | "error";

export type DisponibilidadEntregaResultado = {
  estado: DisponibilidadEntregaEstado;
  motivo?: string;
  mensajeError?: string;
  /** `true` mientras no se conozca el resultado o exista un conflicto vigente. */
  bloqueaEnvio: boolean;
};

type UseDisponibilidadEntregaParams = {
  tipoEntrega: TipoEntrega;
  fechaEntrega: string;
  horaEntrega: string;
  /** Solo en edición: excluye el propio pedido para evitar autoconflicto. */
  pedidoId?: string;
};

// Debounce breve: evita una consulta por cada tecleo mientras el usuario aún
// está escribiendo/ajustando fecha u hora.
const DEBOUNCE_MS = 400;

type QueryOutcome =
  | { status: "success"; disponible: boolean; motivo?: string }
  | { status: "error"; mensajeError: string };

// Identifica de forma única la combinación fecha + hora + tipo + pedido que
// generó una respuesta, para poder descartar respuestas obsoletas comparando
// contra la selección vigente (sin depender de orden de llegada de red).
function buildQueryKey(
  fechaEntrega: string,
  horaEntrega: string,
  tipoEntrega: TipoEntrega,
  pedidoId?: string,
): string {
  return `${fechaEntrega}|${horaEntrega}|${tipoEntrega}|${pedidoId ?? ""}`;
}

const ESTADO_ESPERANDO: DisponibilidadEntregaResultado = {
  estado: "esperando",
  bloqueaEnvio: false,
};

const ESTADO_RECOLECCION: DisponibilidadEntregaResultado = {
  estado: "recoleccion",
  bloqueaEnvio: false,
};

const ESTADO_CONSULTANDO: DisponibilidadEntregaResultado = {
  estado: "consultando",
  bloqueaEnvio: true,
};

/**
 * Consulta automáticamente la disponibilidad de una entrega a domicilio
 * cuando hay fecha, hora y tipo de entrega capturados. Para recolección no
 * llama al backend: nunca bloquea disponibilidad, así que el resultado es
 * inmediato y puro (sin red).
 *
 * Controla respuestas asíncronas obsoletas comparando la clave de la
 * respuesta contra la clave de la selección vigente: si el usuario cambia
 * fecha, hora o tipo antes de que responda una consulta anterior, esa
 * respuesta se descarta y no sobrescribe el estado actual.
 */
export function useDisponibilidadEntrega({
  tipoEntrega,
  fechaEntrega,
  horaEntrega,
  pedidoId,
}: UseDisponibilidadEntregaParams): DisponibilidadEntregaResultado {
  const [outcome, setOutcome] = useState<{
    key: string;
    result: QueryOutcome;
  } | null>(null);

  const esDomicilioConFechaYHora =
    tipoEntrega === "domicilio" && Boolean(fechaEntrega) && Boolean(horaEntrega);

  const currentKey = esDomicilioConFechaYHora
    ? buildQueryKey(fechaEntrega, horaEntrega, tipoEntrega, pedidoId)
    : null;

  useEffect(() => {
    if (!esDomicilioConFechaYHora) {
      return;
    }

    const key = buildQueryKey(fechaEntrega, horaEntrega, tipoEntrega, pedidoId);

    const timeoutId = setTimeout(() => {
      void verificarDisponibilidadEntregaAction({
        fecha_entrega: fechaEntrega,
        hora_entrega: horaEntrega,
        tipo_entrega: tipoEntrega,
        pedido_id: pedidoId,
      }).then((result) => {
        setOutcome({
          key,
          result: result.ok
            ? {
                status: "success",
                disponible: result.data.disponible,
                motivo: result.data.motivo,
              }
            : { status: "error", mensajeError: result.error },
        });
      });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [esDomicilioConFechaYHora, fechaEntrega, horaEntrega, tipoEntrega, pedidoId]);

  if (!esDomicilioConFechaYHora) {
    return tipoEntrega === "domicilio" ? ESTADO_ESPERANDO : ESTADO_RECOLECCION;
  }

  // Respuesta obsoleta o aún no llegó: la selección vigente todavía no tiene
  // un resultado propio, así que se muestra "consultando" en vez de arrastrar
  // el resultado de una combinación fecha/hora/tipo anterior.
  if (!outcome || outcome.key !== currentKey) {
    return ESTADO_CONSULTANDO;
  }

  if (outcome.result.status === "error") {
    return {
      estado: "error",
      mensajeError: outcome.result.mensajeError,
      bloqueaEnvio: false,
    };
  }

  if (outcome.result.disponible) {
    return { estado: "disponible", bloqueaEnvio: false };
  }

  return {
    estado: "ocupado",
    motivo: outcome.result.motivo,
    bloqueaEnvio: true,
  };
}
