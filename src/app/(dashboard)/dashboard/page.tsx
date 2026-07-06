export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-lg border bg-background p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Inicio</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Bienvenido al área interna del CRM Pastelería.
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          Desde aquí el administrador podrá navegar hacia Clientes y futuras
          secciones del Sprint 1.
        </p>
      </div>
    </section>
  );
}