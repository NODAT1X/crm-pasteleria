import type { z } from "zod";

import type {
  EstadoMovimientoPago,
  MetodoPago,
  TipoMovimientoPago,
  TipoPago,
} from "@/generated/prisma/enums";
import type {
  anularMovimientoFinancieroSchema,
  pedidoFinancieroQuerySchema,
  registrarPagoSchema,
} from "@/validation/pagos";

// Tipos de entrada inferidos desde los schemas de Zod (única fuente de verdad,
// sin duplicar la forma de los datos a mano). Reexportados aquí para que la UI
// futura consuma los tipos del módulo sin depender de `@/validation`.
export type RegistrarPagoInput = z.infer<typeof registrarPagoSchema>;
export type AnularMovimientoFinancieroInput = z.infer<
  typeof anularMovimientoFinancieroSchema
>;
export type PedidoFinancieroQueryInput = z.infer<
  typeof pedidoFinancieroQuerySchema
>;

/**
 * Resultado estándar y serializable de las Server Actions.
 *
 * Mismo patrón discriminado por `ok` que en clientes y pedidos: la UI hace un
 * chequeo simple `if (res.ok) { res.data } else { res.error }`.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Estado de pago DERIVADO de un pedido (S3-014). No se persiste en Pedido: se
 * calcula siempre en backend desde los movimientos aplicados.
 *
 *  - `sin_pago`: total_pagado = 0
 *  - `parcial`:  0 < total_pagado < total_pedido
 *  - `pagado`:   total_pagado >= total_pedido
 */
export type EstadoPagoDerivado = "sin_pago" | "parcial" | "pagado";

/**
 * DTO de un movimiento financiero. El dinero se expone como `number` (derivado
 * del `Decimal` de la BD) para que el resultado de la Server Action sea plano y
 * serializable a través del límite RSC — mismo criterio que los DTOs de
 * pedidos. La fuente de verdad sigue siendo el `Decimal` persistido; todos los
 * cálculos (total pagado, saldo) se hacen en backend con Decimal y este número
 * es solo la representación de salida.
 */
export type MovimientoFinancieroDTO = {
  id: string;
  pedido_id: string;
  tipo_movimiento: TipoMovimientoPago;
  metodo_pago: MetodoPago | null;
  tipo_pago: TipoPago | null;
  monto: number;
  referencia: string | null;
  notas: string | null;
  estado: EstadoMovimientoPago;
  fecha_recepcion: Date;
  created_at: Date;
};

/**
 * Resumen financiero de un pedido, SIEMPRE calculado en backend desde la BD
 * (no se persiste ni se acepta desde frontend).
 *
 * `movimientos_count` = número de movimientos APLICADOS del pedido (los
 * anulados no cuentan, igual que no suman al total pagado).
 */
export type ResumenFinancieroPedido = {
  pedido_id: string;
  total_pedido: number;
  total_pagado: number;
  saldo_pendiente: number;
  estado_pago: EstadoPagoDerivado;
  movimientos_count: number;
};

/**
 * Resultado de las mutaciones (registrar pago / anular movimiento): el
 * movimiento afectado + el resumen financiero recalculado del pedido, para que
 * la UI futura refresque saldo y estado sin una segunda petición.
 */
export type MovimientoConResumenDTO = {
  movimiento: MovimientoFinancieroDTO;
  resumen: ResumenFinancieroPedido;
};
