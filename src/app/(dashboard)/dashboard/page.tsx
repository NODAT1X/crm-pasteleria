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
          Desde aquí el administrador puede navegar hacia Clientes, Pedidos y
          Entregas.
        </p>
      </div>
    </section>
  );
}