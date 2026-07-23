import { Prisma } from "@/generated/prisma/client";

/**
 * Reglas financieras PURAS del módulo de pagos (S5-003).
 *
 * Este módulo NO habla con Prisma ni con la sesión: solo contiene aritmética de
 * dinero con `Prisma.Decimal` (nunca Float), para poder probarla sin base de
 * datos. Extrae dos reglas que hasta ahora vivían embebidas en
 * `pagos.service.ts` (saldo pendiente con clamp a 0 y anti‑sobrepago) SIN
 * cambiar su comportamiento; el servicio las reutiliza para no duplicar la regla.
 *
 * El resto de reglas de dinero (total pagado, estado de pago, anticipo mínimo
 * del 50%, retención/devolución) siguen viviendo como funciones puras en
 * `@/server/services/pagos.service` y también son testeables sin DB.
 */

const CERO = new Prisma.Decimal(0);

/**
 * Saldo pendiente = total del pedido − total pagado, con **clamp a 0**: el saldo
 * nunca es negativo. El flujo normal impide sobrepagos (ver `validarMontoPago`),
 * así que el clamp es una defensa ante datos anómalos históricos.
 */
export function calcularSaldoPendiente(
  totalPedido: Prisma.Decimal,
  totalPagado: Prisma.Decimal,
): Prisma.Decimal {
  const saldo = totalPedido.minus(totalPagado);
  return saldo.isNegative() ? CERO : saldo;
}

/**
 * Resultado de validar un intento de pago contra el saldo pendiente:
 *  - `pedido_pagado`: el pedido ya no admite más pagos (saldo <= 0).
 *  - `sobrepago`: el monto excede el saldo pendiente.
 */
export type ValidacionMontoPago =
  | { ok: true }
  | { ok: false; motivo: "pedido_pagado" | "sobrepago" };

/**
 * Regla anti‑sobrepago (S3‑014): un pago solo es válido si hay saldo pendiente
 * (> 0) y el monto no lo excede. El saldo es la cota superior del pago. No
 * decide mensajes ni lanza: solo evalúa la regla; el servicio traduce el motivo
 * al texto en español correspondiente.
 */
export function validarMontoPago(
  monto: Prisma.Decimal,
  saldoPendiente: Prisma.Decimal,
): ValidacionMontoPago {
  if (saldoPendiente.lessThanOrEqualTo(0)) {
    return { ok: false, motivo: "pedido_pagado" };
  }
  if (monto.greaterThan(saldoPendiente)) {
    return { ok: false, motivo: "sobrepago" };
  }
  return { ok: true };
}
