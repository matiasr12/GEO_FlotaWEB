import { obtenerSesion } from "@/lib/auth/session";
import { listarEquipos } from "@/lib/daemon-api";
import { registrarAuditoria } from "@/lib/audit";
import { MapViewClient } from "@/components/MapViewClient";

// Planta industrial de Minera Caserones, Región de Atacama.
const CENTRO_FAENA: [number, number] = [-28.169, -69.5336];

export default async function MapPage() {
  const user = await obtenerSesion();
  const devices = await listarEquipos();

  if (user) {
    await registrarAuditoria({ user, action: "ver_mapa" });
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Mapa de faena</h1>
        <p className="text-sm text-muted">
          Última posición estimada de cada equipo dentro del área de la faena.
        </p>
      </div>
      <div className="flex-1">
        <MapViewClient devices={devices} center={CENTRO_FAENA} zoom={13} altura="100%" />
      </div>
    </div>
  );
}
