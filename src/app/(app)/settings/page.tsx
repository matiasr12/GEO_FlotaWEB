import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/rbac";

const ROLE_LABEL = {
  admin: "Administrador",
  supervisor: "Supervisor de turno",
  auditor: "Encargado de auditoría",
};

export default async function SettingsPage() {
  const user = await obtenerSesion();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Configuración</h1>
        <p className="text-sm text-muted">Datos de tu cuenta y accesos administrativos.</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-sm text-muted">Nombre</p>
        <p className="mb-3 font-medium">{user.nombre}</p>
        <p className="text-sm text-muted">Correo</p>
        <p className="mb-3 font-medium">{user.email}</p>
        <p className="text-sm text-muted">Rol</p>
        <p className="font-medium">{ROLE_LABEL[user.role]}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tienePermiso(user.role, "auditoria:ver") && (
          <Link
            href="/settings/auditoria"
            className="rounded-xl border border-border bg-surface p-5 hover:border-accent"
          >
            <p className="font-medium">Registro de auditoría</p>
            <p className="text-sm text-muted">
              Quién vio o modificó qué y cuándo. No editable ni eliminable.
            </p>
          </Link>
        )}

        {tienePermiso(user.role, "privacidad:gestionar") && (
          <Link
            href="/settings/privacidad"
            className="rounded-xl border border-border bg-surface p-5 hover:border-accent"
          >
            <p className="font-medium">Solicitudes de titulares de datos</p>
            <p className="text-sm text-muted">
              Registro de solicitudes de acceso, rectificación o cancelación.
            </p>
          </Link>
        )}
      </div>
    </div>
  );
}
