import { describe, expect, it } from "vitest";

import { EstadoPedido } from "@/generated/prisma/enums";

import {
  canChangeEstadoPedido,
  getNextEstadosPedido,
  validateEstadoPedidoTransition,
} from "./pedidos";

/**
 * Pruebas mínimas (S5-003) de las transiciones de estado del pedido (S2-003).
 * Lógica pura: mapa de transiciones válidas, sin base de datos.
 *
 * Nota: la exigencia de anticipo mínimo del 50% para pasar de `cotizacion` a
 * `confirmado` es una regla SEPARADA (`evaluarAnticipoConfirmacion`), cubierta en
 * `src/modules/pagos/reglas-financieras.test.ts`. Aquí solo se valida que la
 * transición esté permitida por el mapa de estados.
 */

describe("transiciones válidas del ciclo de vida", () => {
  it("cotizacion -> confirmado", () => {
    expect(canChangeEstadoPedido(EstadoPedido.cotizacion, EstadoPedido.confirmado)).toBe(true);
  });

  it("confirmado -> en_preparacion", () => {
    expect(canChangeEstadoPedido(EstadoPedido.confirmado, EstadoPedido.en_preparacion)).toBe(true);
  });

  it("en_preparacion -> listo_para_entregar", () => {
    expect(
      canChangeEstadoPedido(EstadoPedido.en_preparacion, EstadoPedido.listo_para_entregar),
    ).toBe(true);
  });

  it("listo_para_entregar -> entregado", () => {
    expect(
      canChangeEstadoPedido(EstadoPedido.listo_para_entregar, EstadoPedido.entregado),
    ).toBe(true);
  });

  it("cada estado activo permite cancelar (salvo listo_para_entregar)", () => {
    expect(canChangeEstadoPedido(EstadoPedido.cotizacion, EstadoPedido.cancelado)).toBe(true);
    expect(canChangeEstadoPedido(EstadoPedido.confirmado, EstadoPedido.cancelado)).toBe(true);
    expect(canChangeEstadoPedido(EstadoPedido.en_preparacion, EstadoPedido.cancelado)).toBe(true);
  });
});

describe("estados finales", () => {
  it("entregado es final (sin transiciones)", () => {
    expect(getNextEstadosPedido(EstadoPedido.entregado)).toEqual([]);
    const res = validateEstadoPedidoTransition(EstadoPedido.entregado, EstadoPedido.cancelado);
    expect(res.ok).toBe(false);
  });

  it("cancelado es final (sin transiciones)", () => {
    expect(getNextEstadosPedido(EstadoPedido.cancelado)).toEqual([]);
    const res = validateEstadoPedidoTransition(EstadoPedido.cancelado, EstadoPedido.confirmado);
    expect(res.ok).toBe(false);
  });
});

describe("transiciones inválidas bloqueadas", () => {
  it("no se puede saltar de cotizacion a entregado", () => {
    expect(canChangeEstadoPedido(EstadoPedido.cotizacion, EstadoPedido.entregado)).toBe(false);
    expect(
      validateEstadoPedidoTransition(EstadoPedido.cotizacion, EstadoPedido.entregado).ok,
    ).toBe(false);
  });

  it("no se puede saltar de confirmado a entregado", () => {
    expect(canChangeEstadoPedido(EstadoPedido.confirmado, EstadoPedido.entregado)).toBe(false);
  });

  it("no se permite self-transition", () => {
    const res = validateEstadoPedidoTransition(EstadoPedido.confirmado, EstadoPedido.confirmado);
    expect(res.ok).toBe(false);
  });

  it("listo_para_entregar no puede cancelarse (solo entregar)", () => {
    expect(
      canChangeEstadoPedido(EstadoPedido.listo_para_entregar, EstadoPedido.cancelado),
    ).toBe(false);
  });
});
