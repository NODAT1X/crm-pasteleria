import { describe, expect, it } from "vitest";

import { lockKeyDisponibilidad } from "./lock-disponibilidad";

/**
 * Pruebas del helper puro de clave del advisory lock de disponibilidad (S5-004).
 * No prueban el lock real de PostgreSQL (eso requiere una BD y se documenta en
 * `docs/qa-s5-004-concurrencia-disponibilidad.md`), solo la derivación
 * determinista de la clave a partir de tenant + fecha operativa.
 */

const INT32_MIN = -(2 ** 31);
const INT32_MAX = 2 ** 31 - 1;

describe("lockKeyDisponibilidad", () => {
  it("es determinista para el mismo tenant y la misma fecha", () => {
    const a = lockKeyDisponibilidad("past_1", "2026-07-23");
    const b = lockKeyDisponibilidad("past_1", "2026-07-23");
    expect(a).toEqual(b);
  });

  it("distinto tenant cambia key1 y conserva key2 (misma fecha)", () => {
    const a = lockKeyDisponibilidad("past_1", "2026-07-23");
    const b = lockKeyDisponibilidad("past_2", "2026-07-23");
    expect(a.key1).not.toBe(b.key1);
    expect(a.key2).toBe(b.key2);
  });

  it("distinta fecha cambia key2 y conserva key1 (mismo tenant)", () => {
    const a = lockKeyDisponibilidad("past_1", "2026-07-23");
    const b = lockKeyDisponibilidad("past_1", "2026-07-24");
    expect(a.key1).toBe(b.key1);
    expect(a.key2).not.toBe(b.key2);
  });

  it("el par (key1, key2) difiere para combinaciones tenant+fecha distintas", () => {
    const a = lockKeyDisponibilidad("past_1", "2026-07-23");
    const b = lockKeyDisponibilidad("past_2", "2026-07-24");
    expect(a).not.toEqual(b);
  });

  it("las claves son enteros dentro del rango int4 de PostgreSQL", () => {
    for (const [tenant, fecha] of [
      ["past_1", "2026-07-23"],
      ["otro-tenant-cuid", "2026-12-31"],
      ["x", "2000-01-01"],
    ] as const) {
      const { key1, key2 } = lockKeyDisponibilidad(tenant, fecha);
      for (const key of [key1, key2]) {
        expect(Number.isInteger(key)).toBe(true);
        expect(key).toBeGreaterThanOrEqual(INT32_MIN);
        expect(key).toBeLessThanOrEqual(INT32_MAX);
      }
    }
  });
});
