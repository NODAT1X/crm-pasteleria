import type { z } from "zod";

import type { Cliente } from "@/generated/prisma/client";
import type { EstadoPedido, TipoEntrega } from "@/generated/prisma/enums";
import type { EstadoPagoDerivado } from "@/modules/pagos/types";
import type { ConflictoDisponibilidad } from "@/modules/pedidos/disponibilidad";
import type {
  createPedidoSchema,
  updatePedidoSchema,
  listPedidosSchema,
  changeEstadoPedidoSchema,
  eliminarPedidoSchema,
  verificarDisponibilidadSchema,
} from "@/validation/pedidos";

// Tipos de entrada inferidos desde los schemas de Zod (única fuente de verdad,
// sin duplicar la forma de los datos a mano). Reexportados aquí para que la UI
// futura consuma los tipos del módulo sin depender de `@/validation`.
export type CreatePedidoInput = z.infer<typeof createPedidoSchema>;
export type UpdatePedidoInput = z.infer<typeof updatePedidoSchema>;
export type ListPedidosInput = z.infer<typeof listPedidosSchema>;
export type ChangeEstadoPedidoInput = z.infer<typeof changeEstadoPedidoSchema>;
export type EliminarPedidoInput = z.infer<typeof eliminarPedidoSchema>;
export type VerificarDisponibilidadInput = z.infer<
  typeof verificarDisponibilidadSchema
>;

/**
 * Resultado estándar y serializable de las Server Actions.
 *
 * Mismo patrón discriminado por `ok` que en clientes: la UI hace un chequeo
 * simple `if (res.ok) { res.data } else { res.error }`.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * DTO de un renglón del pedido. El dinero se expone como `number` (derivado del
 * `Decimal` de la BD) para que el resultado de la Server Action sea plano y
 * serializable a través del límite RSC. La fuente de verdad sigue siendo el
 * `Decimal` persistido; este número es solo la representación de salida.
 */
export type PedidoItemDTO = {
  id: string;
  producto_id: string | null;
  nombre_snapshot: string;
  descripcion: string | null;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
};

// Datos mínimos del cliente incluidos en el listado (para futuras vistas).
export type ClienteResumenDTO = {
  id: string;
  nombre: string;
  telefono: string | null;
  whatsapp: string | null;
};

// Campos de un pedido comunes a listado y detalle (dinero como `number`).
type PedidoBaseDTO = {
  id: string;
  cliente_id: string;
  estado_pedido: EstadoPedido;
  fecha_entrega: Date;
  hora_entrega: string;
  tipo_entrega: TipoEntrega;
  direccion_entrega: string | null;
  total: number;
  notas_internas: string | null;
  created_at: Date;
  updated_at: Date;
};

// Elemento del listado: incluye un resumen del cliente, sin items.
// `total_pagado`/`saldo_pendiente`/`estado_pago` se calculan en el service
// reutilizando la misma lógica de `pagos.service.ts` (S3-015): nunca se
// recalculan en la UI.
//
// `tiene_movimientos_financieros`/`cantidad_movimientos_financieros` (S4-005)
// cuentan CUALQUIER movimiento (aplicado o anulado), a diferencia de
// `total_pagado`/`saldo_pendiente` que solo consideran los aplicados. La UI
// los usa para decidir el nivel de confirmación al eliminar un pedido, sin
// necesitar un viaje adicional al servidor.
export type PedidoListItemDTO = PedidoBaseDTO & {
  cliente: ClienteResumenDTO;
  total_pagado: number;
  saldo_pendiente: number;
  estado_pago: EstadoPagoDerivado;
  tiene_movimientos_financieros: boolean;
  cantidad_movimientos_financieros: number;
};

// Detalle completo: cliente completo + items del pedido.
export type PedidoDetalleDTO = PedidoBaseDTO & {
  cliente: Cliente;
  items: PedidoItemDTO[];
};

/**
 * Resultado de la consulta de disponibilidad de una entrega (S4-008). DTO plano
 * y serializable a través del límite RSC.
 *
 *  - `disponible`: `true` si la entrega puede registrarse en ese horario.
 *  - `motivo`: mensaje funcional en español cuando NO está disponible.
 *  - `conflicto`: información mínima del pedido bloqueante (hora de inicio y fin
 *    de su ventana) cuando aplica. Nunca expone datos sensibles del cliente.
 */
export type DisponibilidadEntregaDTO = {
  disponible: boolean;
  motivo?: string;
  conflicto?: ConflictoDisponibilidad;
};

/**
 * Resumen de la cancelación de un pedido (S3-019), SIEMPRE calculado en backend
 * desde los movimientos aplicados (nunca desde el frontend). Los montos salen
 * como `number` (representación de salida); los cálculos internos son Decimal.
 *
 *  - `tiene_pagos_aplicados`: hay pagos aplicados que obligan a registrar
 *    retención/devolución al cancelar.
 *  - `total_recibido`:  suma de pagos aplicados (todos los tipos).
 *  - `anticipo_aplicado`: pagos aplicados con `tipo_pago = anticipo`.
 *  - `retencion`:       25% del anticipo aplicado.
 *  - `devolucion`:      total_recibido - retención.
 *  - `puede_cancelar`:  si la transición a `cancelado` es válida desde el estado
 *    actual del pedido.
 *  - `mensaje`:         texto en español para la confirmación en UI.
 */
export type ResumenCancelacionPedidoDTO = {
  pedido_id: string;
  tiene_pagos_aplicados: boolean;
  total_recibido: number;
  anticipo_aplicado: number;
  retencion: number;
  devolucion: number;
  puede_cancelar: boolean;
  mensaje: string;
};
