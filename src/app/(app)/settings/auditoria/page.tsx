import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/rbac";
import { listarAuditoria } from "@/lib/audit";
import { AuditoriaTabla } from "@/components/AuditoriaTabla";

export default async function AuditoriaPage() {
  const user = await obtenerSesion();
  if (!user || !tienePermiso(user.role, "auditoria:ver")) redirect("/dashboard");

  const registros = await listarAuditoria();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Registro de auditoría</h1>
        <p className="text-sm text-muted">
          Evidencia de cumplimiento: solo inserción, no se puede editar ni borrar.
        </p>
      </div>

      <AuditoriaTabla registros={registros} />
    </div>
  );
}
