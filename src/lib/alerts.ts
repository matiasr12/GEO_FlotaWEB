import "server-only";
import { listarEquipos } from "@/lib/daemon-api";
import type { Alert } from "@/types/alert";

// Las alertas se derivan de los equipos reales (GET /api/equipos ya trae
// el booleano `alerta` calculado por el backend) — no hay un endpoint de
// alertas separado. El "reconocimiento" vive solo en memoria del proceso;
// no persiste entre reinicios del servidor (ver README, pendiente moverlo
// a una tabla real si hace falta conservarlo).

const reconocidas = new Set<string>();

export async function listarAlertas(): Promise<Alert[]> {
  const equipos = await listarEquipos();

  return equipos
    .filter((d) => d.estado === "alerta")
    .map((d) => ({
      id: `alert-${d.id}`,
      deviceId: d.id,
      hostname: d.hostname,
      custodioNombre: d.custodioNombre,
      ultimaUbicacion: d.ubicacion,
      area: d.area,
      areaDetectada: d.areaDetectada,
      detectadaEn: d.ultimaTelemetria ?? new Date().toISOString(),
      reconocida: reconocidas.has(`alert-${d.id}`),
    }));
}

export async function reconocerAlerta(id: string): Promise<void> {
  reconocidas.add(id);
}
