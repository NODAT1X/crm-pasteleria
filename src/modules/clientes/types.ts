import type { z } from "zod";

import type {
  createClienteSchema,
  updateClienteSchema,
  listClientesSchema,
} from "@/validation/clientes";

// Tipos inferidos desde los schemas de Zod: única fuente de verdad, sin
// duplicar la forma de los datos a mano.
export type CreateClienteInput = z.infer<typeof createClienteSchema>;
export type UpdateClienteInput = z.infer<typeof updateClienteSchema>;
export type ListClientesInput = z.infer<typeof listClientesSchema>;

/**
 * Resultado estándar y serializable de las Server Actions.
 *
 * Patrón discriminado por `ok` para que la UI futura pueda hacer un chequeo
 * simple: `if (res.ok) { res.data } else { res.error }`.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
