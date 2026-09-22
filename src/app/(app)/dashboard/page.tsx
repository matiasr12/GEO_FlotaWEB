import { obtenerSesion } from "@/lib/auth/session";
import { listarEquipos } from "@/lib/daemon-api";
import { registrarAuditoria } from "@/lib/audit";
import { MapViewClient } from "@/components/MapViewClient";
import { SemaforoCard } from "@/components/SemaforoCard";
import { StatsPanel } from "@/components/StatsPanel";
import { DeviceTable } from "@/components/DeviceTable";

// Planta industrial de Minera Caserones, Región de Atacama.
const CENTRO_FAENA: [number, number] = [-28.169, -69.5336];

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

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="h-[420px]">
          <MapViewClient devices={devices} center={CENTRO_FAENA} altura="100%" />
        </div>
        <div className="flex flex-col gap-6">
          <SemaforoCard hayAlertas={alertas > 0} />
          <StatsPanel total={devices.length} activos={activos} alertas={alertas} />
        </div>
      </div>

      <DeviceTable devices={ordenados} pageSize={4} />
    </div>
  );
}
