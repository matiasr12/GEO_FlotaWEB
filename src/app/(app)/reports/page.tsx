import { obtenerSesion } from "@/lib/auth/session";
import { listarEquipos } from "@/lib/devices";
import { registrarAuditoria } from "@/lib/audit";

export default async function ReportsPage() {
  const user = await obtenerSesion();
  const devices = await listarEquipos();

  if (user) {
    await registrarAuditoria({ user, action: "ver_inventario", detalle: "reportes" });
  }

  const normal = devices.filter((d) => d.estado === "normal").length;
  const alerta = devices.filter((d) => d.estado === "alerta").length;
  const sinSenal = devices.filter((d) => d.estado === "sin_senal").length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Reportes</h1>
        <p className="text-sm text-muted">
          Resumen de cumplimiento por estado de equipo. La exportación a
          PDF/Excel queda pendiente para una siguiente iteración.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ResumenCard label="Equipos normales" valor={normal} color="text-success" />
        <ResumenCard label="Equipos en alerta" valor={alerta} color="text-danger" />
        <ResumenCard label="Sin señal reciente" valor={sinSenal} color="text-muted" />
      </div>
    </div>
  );
}

function ResumenCard({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${color}`}>{valor}</p>
    </div>
  );
}
