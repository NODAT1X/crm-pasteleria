import { describe, expect, it } from "vitest";

import {
  resolverClientePreliminar,
  type CoincidenciaCliente,
} from "./cliente-preliminar";

/**
 * Pruebas de la función pura de resolución anti-duplicado (S5-009). Sin base de
 * datos: cubren cada rama de decisión con coincidencias en memoria.
 */

const capturaValida = { nombre: "Ana", whatsapp: "5551234567", telefono: null };

describe("resolverClientePreliminar", () => {
  it("sin coincidencias -> crear preliminar", () => {
    expect(resolverClientePreliminar(capturaValida, [])).toEqual({
      tipo: "crear_preliminar",
    });
  });

  it("una coincidencia activa -> reutilizar cliente existente", () => {
    const coincidencias: CoincidenciaCliente[] = [{ id: "cli_1", activo: true }];
    expect(resolverClientePreliminar(capturaValida, coincidencias)).toEqual({
      tipo: "existente",
      clienteId: "cli_1",
    });
  });

  it("una coincidencia inactiva -> revisión humana (cliente_inactivo)", () => {
    const coincidencias: CoincidenciaCliente[] = [{ id: "cli_1", activo: false }];
    expect(resolverClientePreliminar(capturaValida, coincidencias)).toEqual({
      tipo: "revision_humana",
      motivo: "cliente_inactivo",
    });
  });

  it("más de una coincidencia -> revisión humana (ambiguo)", () => {
    const coincidencias: CoincidenciaCliente[] = [
      { id: "cli_1", activo: true },
      { id: "cli_2", activo: true },
    ];
    expect(resolverClientePreliminar(capturaValida, coincidencias)).toEqual({
      tipo: "revision_humana",
      motivo: "ambiguo",
    });
  });

  it("mezcla activo + inactivo (2 coincidencias) -> revisión humana (ambiguo)", () => {
    const coincidencias: CoincidenciaCliente[] = [
      { id: "cli_1", activo: true },
      { id: "cli_2", activo: false },
    ];
    expect(resolverClientePreliminar(capturaValida, coincidencias).tipo).toBe(
      "revision_humana",
    );
  });

  it("datos insuficientes: sin nombre -> revisión humana (datos_insuficientes)", () => {
    const captura = { nombre: null, whatsapp: "5551234567", telefono: null };
    expect(resolverClientePreliminar(captura, [])).toEqual({
      tipo: "revision_humana",
      motivo: "datos_insuficientes",
    });
  });

  it("datos insuficientes: sin contacto -> revisión humana (datos_insuficientes)", () => {
    const captura = { nombre: "Ana", whatsapp: null, telefono: null };
    expect(resolverClientePreliminar(captura, [])).toEqual({
      tipo: "revision_humana",
      motivo: "datos_insuficientes",
    });
  });
});
