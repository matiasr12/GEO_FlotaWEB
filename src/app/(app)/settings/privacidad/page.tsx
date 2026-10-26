import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/rbac";
import { listarEquipos } from "@/lib/devices";
import { listarSolicitudes } from "@/lib/data-subject-requests";
import { DataRequestForm, type PersonaTitular } from "@/components/DataRequestForm";

export default async function PrivacidadPage() {
  const user = await obtenerSesion();
  if (!user || !tienePermiso(user.role, "privacidad:gestionar")) redirect("/dashboard");

  const [solicitudes, equipos] = await Promise.all([
    listarSolicitudes(),
    listarEquipos(),
  ]);

  // Posibles titulares: los trabajadores con computador asignado (son de
  // quienes se guardan datos de ubicación). Un trabajador con varios
  // equipos aparece una sola vez.
  const personas: PersonaTitular[] = [];
  const vistos = new Set<string>();
  for (const e of equipos) {
    if (e.custodioNombre === "Sin asignar" || vistos.has(e.custodioId)) continue;
    vistos.add(e.custodioId);
    personas.push({
      clave: `trabajador-${e.custodioId}`,
      nombre: e.custodioNombre,
      detalle: [e.custodioId, e.areaDetectada ?? e.area ?? e.faena, e.hostname]
        .filter(Boolean)
        .join(" · "),
    });
  }
  personas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Derechos del titular de datos</h1>
        <p className="text-sm text-muted">
          Registro de solicitudes de acceso, rectificación, cancelación u
          oposición sobre datos de ubicación asociados a una persona.
        </p>
      </div>
      <DataRequestForm solicitudesIniciales={solicitudes} personas={personas} />
    </div>
  );
}
