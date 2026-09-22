import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/rbac";
import { listarAuditoria } from "@/lib/audit";

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

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="px-5 py-3 font-medium">Fecha</th>
              <th className="px-5 py-3 font-medium">Usuario</th>
              <th className="px-5 py-3 font-medium">Rol</th>
              <th className="px-5 py-3 font-medium">Acción</th>
              <th className="px-5 py-3 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 text-muted">
                  {new Date(r.timestamp).toLocaleString("es-CL")}
                </td>
                <td className="px-5 py-3">{r.userEmail}</td>
                <td className="px-5 py-3 text-muted">{r.role}</td>
                <td className="px-5 py-3">{r.action}</td>
                <td className="px-5 py-3 text-muted">{r.detalle ?? "—"}</td>
              </tr>
            ))}
            {registros.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-muted">
                  Aún no hay registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
