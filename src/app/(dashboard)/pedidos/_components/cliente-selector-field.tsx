import type { ClienteOption } from "./nuevo-pedido-form";

import { ClienteActivoSelector } from "./cliente-activo-selector";

type ClienteSelectorFieldProps = {
  clientes: ClienteOption[];
  value: ClienteOption | null;
  onChange: (cliente: ClienteOption | null) => void;
  error?: string;
};

/**
 * Campo de cliente para creación de pedido.
 *
 * Mantiene la separación introducida en S3-003, pero delega la experiencia de
 * búsqueda/selección al `ClienteActivoSelector` de S3-004.
 */
export function ClienteSelectorField({
  clientes,
  value,
  onChange,
  error,
}: ClienteSelectorFieldProps) {
  return (
    <ClienteActivoSelector
      clientesIniciales={clientes}
      value={value}
      onChange={onChange}
      error={error}
    />
  );
}