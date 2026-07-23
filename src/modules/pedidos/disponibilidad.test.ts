import { describe, expect, it } from "vitest";

import { EstadoPedido, TipoEntrega } from "@/generated/prisma/enums";

import {
  ESTADOS_BLOQUEAN_DISPONIBILIDAD,
  VENTANA_ENTREGA_DOMICILIO_MIN,
  detectarConflictoDomicilio,
  esEstadoBloqueanteDisponibilidad,
  horaNuevaEnVentanaBloqueo,
  mensajeConflictoDisponibilidad,
  pedidoBloqueaDisponibilidad,
  type BloqueoDomicilio,
} from "./disponibilidad";

/**
 * Pruebas mínimas (S5-003) de la regla de disponibilidad de entregas a domicilio
 * (S4-008). Todo es lógica pura: ventana de 30 min direccional y su mensaje.
 */

const A_16_00: BloqueoDomicilio[] = [{ pedido_id: "A", hora_entrega: "16:00" }];

describe("ventana de domicilio de 30 minutos", () => {
  it("la ventana es de 30 minutos", () => {
    expect(VENTANA_ENTREGA_DOMICILIO_MIN).toBe(30);
  });

  it("domicilio 16:00 bloquea 16:00 (borde inferior incluido)", () => {
    expect(detectarConflictoDomicilio("16:00", A_16_00)).not.toBeNull();
  });

  it("domicilio 16:00 bloquea 16:15 (dentro de la ventana)", () => {
    const conflicto = detectarConflictoDomicilio("16:15", A_16_00);
    expect(conflicto).not.toBeNull();
    expect(conflicto?.pedido_id).toBe("A");
    expect(conflicto?.fin_ventana).toBe("16:30");
  });

  it("domicilio 16:00 permite 16:30 (borde superior excluido)", () => {
    expect(detectarConflictoDomicilio("16:30", A_16_00)).toBeNull();
  });

  it("la regla es direccional, no simétrica: existente 16:15 no bloquea 16:00", () => {
    const bloqueos: BloqueoDomicilio[] = [{ pedido_id: "L", hora_entrega: "16:15" }];
    expect(detectarConflictoDomicilio("16:00", bloqueos)).toBeNull();
  });

  it("horaNuevaEnVentanaBloqueo aplica [inicio, inicio+30)", () => {
    // inicio de bloqueo 16:00 = 960 min.
    expect(horaNuevaEnVentanaBloqueo(960, 960)).toBe(true); // 16:00
    expect(horaNuevaEnVentanaBloqueo(975, 960)).toBe(true); // 16:15
    expect(horaNuevaEnVentanaBloqueo(989, 960)).toBe(true); // 16:29
    expect(horaNuevaEnVentanaBloqueo(990, 960)).toBe(false); // 16:30 (excluido)
    expect(horaNuevaEnVentanaBloqueo(945, 960)).toBe(false); // 15:45 (anterior)
  });

  it("sin bloqueantes cercanos, el horario está libre", () => {
    expect(detectarConflictoDomicilio("14:00", A_16_00)).toBeNull();
  });
});

describe("mensaje de conflicto de disponibilidad", () => {
  it("incluye la hora del bloqueante y el fin de la ventana", () => {
    const conflicto = detectarConflictoDomicilio("16:15", A_16_00);
    expect(mensajeConflictoDisponibilidad(conflicto)).toBe(
      "El horario seleccionado no está disponible. Ya existe una entrega a domicilio a las 4:00 p.m.; la ventana ocupada termina a las 4:30 p.m.",
    );
  });

  it("sin conflicto usa el mensaje genérico con la ventana de 30 minutos", () => {
    expect(mensajeConflictoDisponibilidad(null)).toContain("30 minutos");
  });
});

describe("estados que bloquean disponibilidad", () => {
  it("son exactamente los cuatro estados activos", () => {
    expect(ESTADOS_BLOQUEAN_DISPONIBILIDAD).toEqual([
      EstadoPedido.cotizacion,
      EstadoPedido.confirmado,
      EstadoPedido.en_preparacion,
      EstadoPedido.listo_para_entregar,
    ]);
  });

  it("cancelado y entregado NO bloquean disponibilidad", () => {
    expect(ESTADOS_BLOQUEAN_DISPONIBILIDAD).not.toContain(EstadoPedido.cancelado);
    expect(ESTADOS_BLOQUEAN_DISPONIBILIDAD).not.toContain(EstadoPedido.entregado);
  });

  // Nota: la exclusión de pedidos eliminados (hard delete S4-005) se aplica en el
  // filtro del repositorio (ya no existen en la tabla), no en lógica pura.
});

describe("regla de bloqueo por tipo de entrega y estado (pedidoBloqueaDisponibilidad)", () => {
  it("domicilio + cotizacion bloquea", () => {
    expect(pedidoBloqueaDisponibilidad(TipoEntrega.domicilio, EstadoPedido.cotizacion)).toBe(true);
  });

  it("recoleccion + cotizacion NO bloquea", () => {
    expect(pedidoBloqueaDisponibilidad(TipoEntrega.recoleccion, EstadoPedido.cotizacion)).toBe(
      false,
    );
  });

  it("recoleccion + confirmado NO bloquea", () => {
    expect(pedidoBloqueaDisponibilidad(TipoEntrega.recoleccion, EstadoPedido.confirmado)).toBe(
      false,
    );
  });

  it("recoleccion NO bloquea en ningún estado activo", () => {
    for (const estado of ESTADOS_BLOQUEAN_DISPONIBILIDAD) {
      expect(pedidoBloqueaDisponibilidad(TipoEntrega.recoleccion, estado)).toBe(false);
    }
  });

  it("domicilio + cancelado NO bloquea", () => {
    expect(pedidoBloqueaDisponibilidad(TipoEntrega.domicilio, EstadoPedido.cancelado)).toBe(false);
  });

  it("domicilio + entregado NO bloquea", () => {
    expect(pedidoBloqueaDisponibilidad(TipoEntrega.domicilio, EstadoPedido.entregado)).toBe(false);
  });

  it("esEstadoBloqueanteDisponibilidad distingue activos de finales", () => {
    expect(esEstadoBloqueanteDisponibilidad(EstadoPedido.confirmado)).toBe(true);
    expect(esEstadoBloqueanteDisponibilidad(EstadoPedido.cancelado)).toBe(false);
    expect(esEstadoBloqueanteDisponibilidad(EstadoPedido.entregado)).toBe(false);
  });
});
