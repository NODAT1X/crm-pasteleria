"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Error boundary del área interna (S4-003).
 *
 * Última red de seguridad: si una página del grupo (dashboard) lanza en render
 * —por ejemplo una caída de conexión/pool que ninguna action alcanzó a
 * traducir— el usuario ve un mensaje funcional con opción de reintentar, en vez
 * del overlay técnico de Next con el error crudo de Prisma (BUG-S3-022-002).
 *
 * El detalle técnico NO se muestra: se manda a consola del servidor/cliente
 * para diagnóstico. Las Server Actions siguen devolviendo `ActionResult` con su
 * propio mensaje; este boundary solo cubre lo que escapa a ese camino.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] Error no controlado en render:", error);
  }, [error]);

  return (
    <section className="space-y-6">
      <div className="rounded-lg border bg-background p-6 shadow-sm">
        <h2 className="text-lg font-semibold">No se pudo cargar esta sección</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Hubo un problema al consultar la información. Puede tratarse de una
          interrupción momentánea de la conexión con la base de datos.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={reset}>
            Reintentar
          </Button>
        </div>
      </div>
    </section>
  );
}
