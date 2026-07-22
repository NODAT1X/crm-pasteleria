import Link from "next/link";

type SelectorVistaEntregasProps = {
  /** Vista activa: resalta la pestaña correspondiente. */
  vista: "dia" | "semana";
  /** Fecha ancla ya saneada, para conservarla al cambiar de vista. */
  fecha: string;
  /** Filtros del calendario (S4-014) ya saneados, para conservarlos al cambiar de vista. */
  estado?: string;
  tipo?: string;
};

const TAB_BASE_CLASS =
  "inline-flex h-8 min-w-20 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors";
const TAB_ACTIVE_CLASS = "bg-background text-foreground shadow-sm";
const TAB_INACTIVE_CLASS =
  "text-muted-foreground hover:text-foreground";

// Construye el href conservando `fecha` y los filtros activos (S4-014), para que
// cambiar de vista no pierda ni el día/semana ni el estado/tipo seleccionados.
function buildHref(base: string, fecha: string, estado?: string, tipo?: string) {
  const params = new URLSearchParams();
  params.set("fecha", fecha);
  if (estado) params.set("estado", estado);
  if (tipo) params.set("tipo", tipo);
  return `${base}?${params.toString()}`;
}

/**
 * Cambio de vista entre "Día" (S4-012, `/entregas`) y "Semana" (S4-013,
 * `/entregas/semana`), compartido por ambas páginas. Conserva la fecha ancla
 * (`?fecha=`) y los filtros de calendario (`?estado=&tipo=`, S4-014) al cambiar
 * de vista, para que la selección sea la misma a ambos lados del cambio.
 *
 * Server Component (sin estado ni handlers): son enlaces normales, no
 * necesita ejecutarse en el cliente.
 */
export function SelectorVistaEntregas({
  vista,
  fecha,
  estado,
  tipo,
}: SelectorVistaEntregasProps) {
  return (
    <div
      role="group"
      aria-label="Cambiar entre vista de día y vista de semana"
      className="inline-flex w-fit items-center gap-1 rounded-lg border border-input bg-muted/40 p-1"
    >
      <Link
        href={buildHref("/entregas", fecha, estado, tipo)}
        aria-current={vista === "dia" ? "page" : undefined}
        className={`${TAB_BASE_CLASS} ${vista === "dia" ? TAB_ACTIVE_CLASS : TAB_INACTIVE_CLASS}`}
      >
        Día
      </Link>
      <Link
        href={buildHref("/entregas/semana", fecha, estado, tipo)}
        aria-current={vista === "semana" ? "page" : undefined}
        className={`${TAB_BASE_CLASS} ${vista === "semana" ? TAB_ACTIVE_CLASS : TAB_INACTIVE_CLASS}`}
      >
        Semana
      </Link>
    </div>
  );
}
