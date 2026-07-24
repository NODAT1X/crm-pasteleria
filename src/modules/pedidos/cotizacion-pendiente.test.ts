import { describe, expect, it } from "vitest";

import { pedidoItemSchema } from "@/validation/pedidos";

import {
  MENSAJE_CONFIRMACION_BLOQUEADA_POR_COTIZAR,
  MENSAJE_CONFIRMACION_BLOQUEADA_TOTAL_NO_COTIZADO,
  MENSAJE_PAGO_BLOQUEADO_POR_COTIZAR,
  MENSAJE_PAGO_BLOQUEADO_TOTAL_NO_COTIZADO,
  NOMBRE_ITEM_POR_COTIZAR,
  PRODUCTO_POR_COTIZAR_ID,
  crearItemPorCotizar,
  esItemPorCotizar,
  evaluarBloqueoConfirmacionPorCotizar,
  evaluarBloqueoPagoPorCotizar,
  itemPorCotizarPermitido,
  pedidoTienePorCotizar,
} from "./cotizacion-pendiente";

/**
 * Pruebas puras de la cotización pendiente con producto genérico "por cotizar"
 * (S5-010). Sin base de datos: cubren la construcción/detección del item
 * centinela, el guard de inyección desde el formulario manual y la decisión de
 * bloqueo de confirmación y de pago (incluido el hueco de total 0).
 */

// Item real de referencia (el que produce el formulario normal).
const itemReal = {
  producto_id: null,
  nombre_snapshot: "Pastel de chocolate",
  descripcion: null,
  cantidad: 2,
  precio_unitario: 150,
  subtotal: 300,
};

describe("crearItemPorCotizar: item genérico canónico", () => {
  it("genera la estructura fija con total derivado 0", () => {
    expect(crearItemPorCotizar()).toEqual({
      producto_id: PRODUCTO_POR_COTIZAR_ID,
      nombre_snapshot: NOMBRE_ITEM_POR_COTIZAR,
      descripcion: null,
      cantidad: 1,
      precio_unitario: 0,
      subtotal: 0,
    });
  });

  it("normaliza la descripción capturada (recorta; vacío -> null)", () => {
    expect(crearItemPorCotizar("  Pastel 3 leches, tema unicornio  ").descripcion).toBe(
      "Pastel 3 leches, tema unicornio",
    );
    expect(crearItemPorCotizar("   ").descripcion).toBeNull();
    expect(crearItemPorCotizar(null).descripcion).toBeNull();
  });

  it("es un PedidoItemInput válido (pasa la coherencia subtotal = cantidad × precio)", () => {
    // Prueba que el item genérico respeta la regla vigente "≥1 item + total
    // derivado" sin cambiar la validación: 1 × 0 === 0.
    const parsed = pedidoItemSchema.safeParse(crearItemPorCotizar("detalle"));
    expect(parsed.success).toBe(true);
  });
});

describe("esItemPorCotizar / pedidoTienePorCotizar: detección del centinela", () => {
  it("detecta solo el item centinela", () => {
    expect(esItemPorCotizar(crearItemPorCotizar())).toBe(true);
    expect(esItemPorCotizar(itemReal)).toBe(false);
    // Un producto_id cualquiera (no el centinela) no es "por cotizar".
    expect(esItemPorCotizar({ producto_id: "prod_123" })).toBe(false);
    expect(esItemPorCotizar({ producto_id: null })).toBe(false);
  });

  it("un pedido con al menos un item genérico está por cotizar", () => {
    expect(pedidoTienePorCotizar([crearItemPorCotizar()])).toBe(true);
    expect(pedidoTienePorCotizar([itemReal, crearItemPorCotizar()])).toBe(true);
  });

  it("un pedido con solo items reales (o vacío) no está por cotizar", () => {
    expect(pedidoTienePorCotizar([itemReal])).toBe(false);
    expect(pedidoTienePorCotizar([])).toBe(false);
  });
});

describe("itemPorCotizarPermitido: guard de inyección desde el formulario manual", () => {
  it("rechaza el centinela sin la opción de confianza (formulario manual)", () => {
    expect(
      itemPorCotizarPermitido({
        items: [crearItemPorCotizar()],
        permitirItemPorCotizar: false,
      }),
    ).toBe(false);
  });

  it("permite el centinela solo con la opción de confianza (flujo autorizado)", () => {
    expect(
      itemPorCotizarPermitido({
        items: [crearItemPorCotizar()],
        permitirItemPorCotizar: true,
      }),
    ).toBe(true);
  });

  it("items reales siempre son admisibles (con o sin opción)", () => {
    expect(
      itemPorCotizarPermitido({ items: [itemReal], permitirItemPorCotizar: false }),
    ).toBe(true);
    expect(
      itemPorCotizarPermitido({ items: [itemReal], permitirItemPorCotizar: true }),
    ).toBe(true);
  });
});

describe("bloqueo de confirmación (S5-010)", () => {
  it("bloquea si el pedido tiene un item por cotizar", () => {
    expect(
      evaluarBloqueoConfirmacionPorCotizar({
        tieneItemPorCotizar: true,
        totalNoCotizado: false,
      }),
    ).toEqual({
      bloqueado: true,
      motivo: MENSAJE_CONFIRMACION_BLOQUEADA_POR_COTIZAR,
    });
  });

  it("bloquea si el total no está cotizado (0 o menor), cerrando el hueco del 50% de 0", () => {
    expect(
      evaluarBloqueoConfirmacionPorCotizar({
        tieneItemPorCotizar: false,
        totalNoCotizado: true,
      }),
    ).toEqual({
      bloqueado: true,
      motivo: MENSAJE_CONFIRMACION_BLOQUEADA_TOTAL_NO_COTIZADO,
    });
  });

  it("no bloquea cuando hay items reales con total cotizado", () => {
    expect(
      evaluarBloqueoConfirmacionPorCotizar({
        tieneItemPorCotizar: false,
        totalNoCotizado: false,
      }),
    ).toEqual({ bloqueado: false });
  });
});

describe("bloqueo de pago (S5-010)", () => {
  it("bloquea si el pedido tiene un item por cotizar", () => {
    expect(
      evaluarBloqueoPagoPorCotizar({
        tieneItemPorCotizar: true,
        totalNoCotizado: false,
      }),
    ).toEqual({ bloqueado: true, motivo: MENSAJE_PAGO_BLOQUEADO_POR_COTIZAR });
  });

  it("bloquea si el total no está cotizado (0 o menor)", () => {
    expect(
      evaluarBloqueoPagoPorCotizar({
        tieneItemPorCotizar: false,
        totalNoCotizado: true,
      }),
    ).toEqual({
      bloqueado: true,
      motivo: MENSAJE_PAGO_BLOQUEADO_TOTAL_NO_COTIZADO,
    });
  });

  it("no bloquea cuando hay items reales con total cotizado", () => {
    expect(
      evaluarBloqueoPagoPorCotizar({
        tieneItemPorCotizar: false,
        totalNoCotizado: false,
      }),
    ).toEqual({ bloqueado: false });
  });
});

describe("reemplazo/ajuste permitido: el dueño sustituye el genérico por items reales", () => {
  it("desbloquea confirmación y pago tras reemplazar el item genérico", () => {
    // Estado inicial: cotización con item genérico -> bloqueada.
    const itemsIniciales = [crearItemPorCotizar("Pastel personalizado")];
    expect(pedidoTienePorCotizar(itemsIniciales)).toBe(true);

    // El dueño reemplaza el genérico por items reales con precio.
    const itemsAjustados = [itemReal];
    expect(pedidoTienePorCotizar(itemsAjustados)).toBe(false);

    // Ya no hay centinela: el formulario admite el reemplazo...
    expect(
      itemPorCotizarPermitido({
        items: itemsAjustados,
        permitirItemPorCotizar: false,
      }),
    ).toBe(true);

    // ...y con total cotizado (> 0) ni confirmación ni pago quedan bloqueados.
    expect(
      evaluarBloqueoConfirmacionPorCotizar({
        tieneItemPorCotizar: false,
        totalNoCotizado: false,
      }).bloqueado,
    ).toBe(false);
    expect(
      evaluarBloqueoPagoPorCotizar({
        tieneItemPorCotizar: false,
        totalNoCotizado: false,
      }).bloqueado,
    ).toBe(false);
  });
});
