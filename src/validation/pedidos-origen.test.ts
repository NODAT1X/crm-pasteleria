import { describe, expect, it } from "vitest";

import { OrigenPedido } from "@/generated/prisma/enums";

import { createPedidoSchema, updatePedidoSchema } from "./pedidos";

/**
 * Pruebas de la base de origen del pedido (S5-008). Lógica pura de validación,
 * sin base de datos: demuestran que el origen NO puede inyectarse desde el
 * payload del formulario (Zod lo descarta), de modo que `whatsapp` queda
 * reservado al flujo autorizado del servidor (parámetro de confianza del
 * servicio), nunca al frontend.
 */

// Payload válido de creación (mismos campos que envía el formulario actual).
const basePedidoInput = {
  cliente_id: "cli_123",
  fecha_entrega: "2026-07-30",
  hora_entrega: "16:00",
  tipo_entrega: "recoleccion",
  items: [
    {
      producto_id: null,
      nombre_snapshot: "Pastel",
      cantidad: 1,
      precio_unitario: 100,
      subtotal: 100,
    },
  ],
};

describe("origen del pedido: el frontend no puede inyectarlo (createPedidoSchema)", () => {
  it("descarta un origen_pedido = 'whatsapp' enviado en el payload", () => {
    const parsed = createPedidoSchema.parse({
      ...basePedidoInput,
      origen_pedido: "whatsapp",
    });
    // Zod (strip): la clave inyectada no sobrevive al parseo, así que nunca
    // llega al `persistData` del servicio.
    expect("origen_pedido" in parsed).toBe(false);
    expect(parsed).not.toHaveProperty("origen_pedido");
  });

  it("tampoco acepta un origen_pedido = 'manual' desde el payload", () => {
    const parsed = createPedidoSchema.parse({
      ...basePedidoInput,
      origen_pedido: "manual",
    });
    expect("origen_pedido" in parsed).toBe(false);
  });
});

describe("origen del pedido: inmutable en edición (updatePedidoSchema)", () => {
  it("descarta origen_pedido enviado al editar", () => {
    const parsed = updatePedidoSchema.parse({
      tipo_entrega: "domicilio",
      origen_pedido: "whatsapp",
    });
    expect("origen_pedido" in parsed).toBe(false);
  });
});

describe("enum OrigenPedido", () => {
  it("tiene exactamente los valores controlados manual y whatsapp", () => {
    expect(OrigenPedido.manual).toBe("manual");
    expect(OrigenPedido.whatsapp).toBe("whatsapp");
    expect(Object.values(OrigenPedido)).toEqual(["manual", "whatsapp"]);
  });
});
