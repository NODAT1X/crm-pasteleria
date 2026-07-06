export const dynamic = "force-dynamic";

export default function ClientesPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-lg border bg-background p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Clientes</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Sección base para la futura gestión de clientes del CRM Pastelería.
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          En esta tarea solo se agrega la navegación y la vista inicial. El CRUD
          de clientes se implementará en las tareas correspondientes del Sprint 1.
        </p>
      </div>
    </section>
  );
}