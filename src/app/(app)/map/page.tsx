import { obtenerSesion } from "@/lib/auth/session";
import { listarEquipos } from "@/lib/daemon-api";
import { registrarAuditoria } from "@/lib/audit";
import { MapViewClient } from "@/components/MapViewClient";

export default async function MapPage() {
  const user = await obtenerSesion();
  const devices = await listarEquipos();

  if (user) {
    await registrarAuditoria({ user, action: "ver_mapa" });
  }

  const conUbicacion = devices.filter((d) => d.ubicacion).length;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Mapa de faena</h1>
        <p className="text-sm text-muted">
          Última posición estimada de cada equipo dentro del área de la faena.
        </p>
      </div>
      <div className="relative flex-1">
        <MapViewClient devices={devices} zoom={13} altura="100%" />
        {conUbicacion === 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 mx-auto w-fit rounded-lg bg-surface/90 px-3 py-1.5 text-xs text-muted shadow">
            La API todavía no entrega coordenadas por equipo — el mapa queda
            vacío hasta que el backend las resuelva.
          </div>
        )}
      </div>
    </div>
  );
}
