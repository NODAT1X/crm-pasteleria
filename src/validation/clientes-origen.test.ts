import { describe, expect, it } from "vitest";

import { OrigenCliente } from "@/generated/prisma/enums";

import {
  capturarClientePreliminarSchema,
  createClienteSchema,
  updateClienteSchema,
} from "./clientes";

/**
 * Pruebas de la base de cliente preliminar / origen (S5-009). Validación pura,
 * sin base de datos: demuestran que el origen y la revisión NO pueden inyectarse
 * desde el formulario (Zod los descarta) y que la captura preliminar exige
 * nombre + al menos un contacto.
 */

describe("origen/revisión no inyectables desde el formulario (Zod strip)", () => {
  it("createClienteSchema descarta origen_cliente y revision_pendiente", () => {
    const parsed = createClienteSchema.parse({
      nombre: "Ana",
      origen_cliente: "whatsapp",
      revision_pendiente: true,
    });
    expect("origen_cliente" in parsed).toBe(false);
    expect("revision_pendiente" in parsed).toBe(false);
  });

  it("updateClienteSchema descarta origen_cliente y revision_pendiente", () => {
    const parsed = updateClienteSchema.parse({
      nombre: "Ana",
      origen_cliente: "whatsapp",
      revision_pendiente: true,
    });
    expect("origen_cliente" in parsed).toBe(false);
    expect("revision_pendiente" in parsed).toBe(false);
  });
});

describe("captura preliminar: exige nombre + al menos un contacto", () => {
  it("acepta nombre + whatsapp", () => {
    const res = capturarClientePreliminarSchema.safeParse({
      nombre: "Ana",
      whatsapp: "5551234567",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.whatsapp).toBe("5551234567");
      expect(res.data.telefono).toBeNull();
    }
  });

  it("acepta nombre + telefono", () => {
    const res = capturarClientePreliminarSchema.safeParse({
      nombre: "Ana",
      telefono: "5551234567",
    });
    expect(res.success).toBe(true);
  });

  it("rechaza cuando no hay contacto (ni whatsapp ni telefono)", () => {
    const res = capturarClientePreliminarSchema.safeParse({ nombre: "Ana" });
    expect(res.success).toBe(false);
  });

  it("rechaza cuando falta el nombre", () => {
    const res = capturarClientePreliminarSchema.safeParse({
      whatsapp: "5551234567",
    });
    expect(res.success).toBe(false);
  });

  it("descarta origen_cliente/revision_pendiente inyectados en el payload", () => {
    const parsed = capturarClientePreliminarSchema.parse({
      nombre: "Ana",
      whatsapp: "5551234567",
      origen_cliente: "whatsapp",
      revision_pendiente: true,
    });
    expect("origen_cliente" in parsed).toBe(false);
    expect("revision_pendiente" in parsed).toBe(false);
  });
});

describe("enum OrigenCliente", () => {
  it("tiene exactamente los valores controlados manual y whatsapp", () => {
    expect(OrigenCliente.manual).toBe("manual");
    expect(OrigenCliente.whatsapp).toBe("whatsapp");
    expect(Object.values(OrigenCliente)).toEqual(["manual", "whatsapp"]);
  });
});
