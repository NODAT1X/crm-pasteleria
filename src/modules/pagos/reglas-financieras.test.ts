import { describe, expect, it } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import type { MovimientoFinanciero } from "@/generated/prisma/client";
import {
  EstadoMovimientoPago,
  MetodoPago,
  TipoMovimientoPago,
  TipoPago,
} from "@/generated/prisma/enums";
import {
  ANTICIPO_MINIMO_FRACCION,
  RETENCION_CANCELACION_FRACCION,
  calcularResumenCancelacion,
  derivarEstadoPago,
  evaluarAnticipoConfirmacion,
  sumarPagosAplicados,
} from "@/server/services/pagos.service";

import {
  calcularSaldoPendiente,
  validarMontoPago,
} from "./reglas-financieras";

/**
 * Pruebas mínimas (S5-003) de las reglas de dinero (S3-014..S3-019). Todo es
 * aritmética pura con `Prisma.Decimal`; no se toca la base de datos (ninguna
 * función ejecuta consultas).
 */

const dec = (v: string | number) => new Prisma.Decimal(v);

// Fábrica simple de un movimiento financiero para fixtures (sin BD).
function mov(overrides: Partial<MovimientoFinanciero> = {}): MovimientoFinanciero {
  const base: MovimientoFinanciero = {
    id: "m1",
    pasteleria_id: "past1",
    pedido_id: "ped1",
    tipo_movimiento: TipoMovimientoPago.pago,
    metodo_pago: MetodoPago.efectivo,
    tipo_pago: TipoPago.anticipo,
    monto: dec(0),
    referencia: null,
    notas: null,
    estado: EstadoMovimientoPago.aplicado,
    fecha_recepcion: new Date("2026-01-01T00:00:00.000Z"),
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-01T00:00:00.000Z"),
  };
  return { ...base, ...overrides };
}

// Pago aplicado de `monto` (por defecto anticipo).
function pago(monto: string | number, tipo_pago: TipoPago = TipoPago.anticipo) {
  return mov({ monto: dec(monto), tipo_movimiento: TipoMovimientoPago.pago, tipo_pago });
}

describe("total pagado (sumarPagosAplicados)", () => {
  it("suma solo pagos aplicados; ignora anulados y no-pago", () => {
    const movimientos = [
      pago(100),
      mov({ monto: dec(50), estado: EstadoMovimientoPago.anulado }), // anulado: no suma
      mov({ monto: dec(30), tipo_movimiento: TipoMovimientoPago.devolucion }), // no-pago: no suma
    ];
    expect(sumarPagosAplicados(movimientos).toNumber()).toBe(100);
  });

  it("sin movimientos, total pagado es 0", () => {
    expect(sumarPagosAplicados([]).toNumber()).toBe(0);
  });
});

describe("saldo pendiente (calcularSaldoPendiente)", () => {
  it("saldo pendiente = total - pagado", () => {
    expect(calcularSaldoPendiente(dec(1000), dec(400)).toNumber()).toBe(600);
  });

  it("saldo pendiente nunca es negativo (clamp a 0)", () => {
    expect(calcularSaldoPendiente(dec(1000), dec(1200)).toNumber()).toBe(0);
  });

  it("pagado igual al total deja saldo 0", () => {
    expect(calcularSaldoPendiente(dec(1000), dec(1000)).toNumber()).toBe(0);
  });
});

describe("anti-sobrepago (validarMontoPago)", () => {
  it("rechaza un pago mayor al saldo pendiente", () => {
    const res = validarMontoPago(dec(700), dec(600));
    expect(res).toEqual({ ok: false, motivo: "sobrepago" });
  });

  it("permite un pago igual al saldo pendiente", () => {
    expect(validarMontoPago(dec(600), dec(600))).toEqual({ ok: true });
  });

  it("permite un pago menor al saldo pendiente", () => {
    expect(validarMontoPago(dec(100), dec(600))).toEqual({ ok: true });
  });

  it("rechaza pagar un pedido ya saldado (saldo 0)", () => {
    expect(validarMontoPago(dec(1), dec(0))).toEqual({ ok: false, motivo: "pedido_pagado" });
  });
});

describe("anticipo mínimo del 50% (evaluarAnticipoConfirmacion)", () => {
  it("la fracción de anticipo es 50%", () => {
    expect(ANTICIPO_MINIMO_FRACCION.toNumber()).toBe(0.5);
  });

  it("anticipo requerido = 50% del total", () => {
    const evalua = evaluarAnticipoConfirmacion(dec(1000), []);
    expect(evalua.anticipoRequerido.toNumber()).toBe(500);
  });

  it("total pagado menor al 50% no permite confirmar", () => {
    const evalua = evaluarAnticipoConfirmacion(dec(1000), [pago(400)]);
    expect(evalua.cumple).toBe(false);
    expect(evalua.faltante.toNumber()).toBe(100);
  });

  it("total pagado igual al 50% permite confirmar", () => {
    const evalua = evaluarAnticipoConfirmacion(dec(1000), [pago(500)]);
    expect(evalua.cumple).toBe(true);
    expect(evalua.faltante.toNumber()).toBe(0);
  });

  it("total pagado mayor al 50% permite confirmar", () => {
    const evalua = evaluarAnticipoConfirmacion(dec(1000), [pago(600)]);
    expect(evalua.cumple).toBe(true);
  });
});

describe("estado de pago derivado (derivarEstadoPago)", () => {
  it("sin pago cuando el total pagado es 0", () => {
    expect(derivarEstadoPago(dec(1000), dec(0))).toBe("sin_pago");
  });

  it("parcial cuando 0 < pagado < total", () => {
    expect(derivarEstadoPago(dec(1000), dec(400))).toBe("parcial");
  });

  it("pagado cuando pagado >= total", () => {
    expect(derivarEstadoPago(dec(1000), dec(1000))).toBe("pagado");
  });
});

describe("cancelación financiera (calcularResumenCancelacion)", () => {
  it("la fracción de retención es 25%", () => {
    expect(RETENCION_CANCELACION_FRACCION.toNumber()).toBe(0.25);
  });

  it("cancelación sin pago no requiere devolución ni retención", () => {
    const resumen = calcularResumenCancelacion([]);
    expect(resumen.tienePagosAplicados).toBe(false);
    expect(resumen.totalRecibido.toNumber()).toBe(0);
    expect(resumen.retencion.toNumber()).toBe(0);
    expect(resumen.devolucion.toNumber()).toBe(0);
  });

  it("cancelación con anticipo retiene 25% y devuelve el resto", () => {
    const resumen = calcularResumenCancelacion([pago(400, TipoPago.anticipo)]);
    expect(resumen.tienePagosAplicados).toBe(true);
    expect(resumen.totalRecibido.toNumber()).toBe(400);
    expect(resumen.anticipoAplicado.toNumber()).toBe(400);
    expect(resumen.retencion.toNumber()).toBe(100); // 400 * 25%
    expect(resumen.devolucion.toNumber()).toBe(300); // 400 - 100
  });
});
