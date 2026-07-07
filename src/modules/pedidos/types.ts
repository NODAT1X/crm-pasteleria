import type { z } from "zod";

import type { Cliente } from "@/generated/prisma/client";
import type { EstadoPedido, TipoEntrega } from "@/generated/prisma/enums";
import type {
  createPedidoSchema,
  updatePedidoSchema,
  listPedidosSchema,
  changeEstadoPedidoSchema,
} from "@/validation/pedidos";

// Tipos de entrada inferidos desde los schemas de Zod (única fuente de verdad,
// sin duplicar la forma de los datos a mano). Reexportados aquí para que la UI
// futura consuma los tipos del módulo sin depender de `@/validation`.
export type CreatePedidoInput = z.infer<typeof createPedidoSchema>;
export type UpdatePedidoInput = z.infer<typeof updatePedidoSchema>;
export type ListPedidosInput = z.infer<typeof listPedidosSchema>;
export type ChangeEstadoPedidoInput = z.infer<typeof changeEstadoPedidoSchema>;

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
export type PedidoListItemDTO = PedidoBaseDTO & {
  cliente: ClienteResumenDTO;
};

// Detalle completo: cliente completo + items del pedido.
export type PedidoDetalleDTO = PedidoBaseDTO & {
  cliente: Cliente;
  items: PedidoItemDTO[];
};
