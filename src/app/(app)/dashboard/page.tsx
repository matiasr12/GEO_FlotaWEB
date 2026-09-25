import { obtenerSesion } from "@/lib/auth/session";
import { listarEquipos } from "@/lib/daemon-api";
import { registrarAuditoria } from "@/lib/audit";
import { MapViewClient } from "@/components/MapViewClient";
import { SemaforoCard } from "@/components/SemaforoCard";
import { StatsPanel } from "@/components/StatsPanel";
import { DeviceTable } from "@/components/DeviceTable";
import { DashboardCharts } from "@/components/DashboardCharts";

export default async function DashboardPage() {
  const user = await obtenerSesion();
  const devices = await listarEquipos();

  if (user) {
    await registrarAuditoria({ user, action: "ver_dashboard" });
  }

  const activos = devices.filter((d) => d.estado !== "sin_senal").length;
  const alertas = devices.filter((d) => d.estado === "alerta").length;
  const ordenados = [...devices].sort((a, b) =>
    a.estado === "alerta" ? -1 : b.estado === "alerta" ? 1 : 0
  );

  const conUbicacion = devices.filter((d) => d.ubicacion).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="relative h-[420px]">
          <MapViewClient devices={devices} altura="100%" />
          {conUbicacion === 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit rounded-lg bg-surface/90 px-3 py-1.5 text-xs text-muted shadow">
              La API todavía no entrega coordenadas por equipo — el mapa
              queda vacío hasta que el backend las resuelva.
            </div>
          )}
        </div>
        <div className="flex flex-col gap-6">
          <SemaforoCard hayAlertas={alertas > 0} />
          <StatsPanel total={devices.length} activos={activos} alertas={alertas} />
        </div>
      </div>

      <DeviceTable devices={ordenados} pageSize={4} />

      <DashboardCharts devices={devices} />
    </div>
  );
}
