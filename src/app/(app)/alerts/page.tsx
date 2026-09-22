import { obtenerSesion } from "@/lib/auth/session";
import { listarAlertas } from "@/lib/alerts";
import { registrarAuditoria } from "@/lib/audit";
import { tienePermiso } from "@/lib/auth/rbac";
import { AlertsList } from "@/components/AlertsList";

export default async function AlertsPage() {
  const user = await obtenerSesion();
  const alertas = await listarAlertas();

  if (user) {
    await registrarAuditoria({ user, action: "ver_alertas" });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Alertas</h1>
        <p className="text-sm text-muted">
          Equipos que salieron del área permitida, con su responsable asignado.
        </p>
      </div>
      <AlertsList
        alertasIniciales={alertas}
        puedeGestionar={user ? tienePermiso(user.role, "alertas:gestionar") : false}
      />
    </div>
  );
}
