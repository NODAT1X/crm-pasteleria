import Link from "next/link";

type SelectorVistaEntregasProps = {
  /** Vista activa: resalta la pestaña correspondiente. */
  vista: "dia" | "semana";
  /** Fecha ancla ya saneada, para conservarla al cambiar de vista. */
  fecha: string;
};

const TAB_BASE_CLASS =
  "inline-flex h-8 min-w-20 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors";
const TAB_ACTIVE_CLASS = "bg-background text-foreground shadow-sm";
const TAB_INACTIVE_CLASS =
  "text-muted-foreground hover:text-foreground";

/**
 * Cambio de vista entre "Día" (S4-012, `/entregas`) y "Semana" (S4-013,
 * `/entregas/semana`), compartido por ambas páginas. Conserva la fecha ancla
 * como parámetro de URL (`?fecha=`) al cambiar de vista, para que la fecha
 * seleccionada sea la misma a ambos lados del cambio.
 *
 * Server Component (sin estado ni handlers): son enlaces normales, no
 * necesita ejecutarse en el cliente.
 */
export function SelectorVistaEntregas({
  vista,
  fecha,
}: SelectorVistaEntregasProps) {
  return (
    <div
      role="group"
      aria-label="Cambiar entre vista de día y vista de semana"
      className="inline-flex w-fit items-center gap-1 rounded-lg border border-input bg-muted/40 p-1"
    >
      <Link
        href={`/entregas?fecha=${fecha}`}
        aria-current={vista === "dia" ? "page" : undefined}
        className={`${TAB_BASE_CLASS} ${vista === "dia" ? TAB_ACTIVE_CLASS : TAB_INACTIVE_CLASS}`}
      >
        Día
      </Link>
      <Link
        href={`/entregas/semana?fecha=${fecha}`}
        aria-current={vista === "semana" ? "page" : undefined}
        className={`${TAB_BASE_CLASS} ${vista === "semana" ? TAB_ACTIVE_CLASS : TAB_INACTIVE_CLASS}`}
      >
        Semana
      </Link>
    </div>
  );
}
