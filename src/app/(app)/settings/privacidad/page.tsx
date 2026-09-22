import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/rbac";
import { listarSolicitudes } from "@/lib/data-subject-requests";
import { DataRequestForm } from "@/components/DataRequestForm";

export default async function PrivacidadPage() {
  const user = await obtenerSesion();
  if (!user || !tienePermiso(user.role, "privacidad:gestionar")) redirect("/dashboard");

  const solicitudes = await listarSolicitudes();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Derechos del titular de datos</h1>
        <p className="text-sm text-muted">
          Registro de solicitudes de acceso, rectificación, cancelación u
          oposición sobre datos de ubicación asociados a una persona.
        </p>
      </div>
      <DataRequestForm solicitudesIniciales={solicitudes} />
    </div>
  );
}
