import "server-only";
import { getEnv } from "@/lib/env";
import type { Device, EquipoApiDTO } from "@/types/device";
import { getMockDevices } from "@/lib/mock-data";

/**
 * Cliente server-side hacia la API del backend (Azure). El token
 * compartido del daemon vive solo acá: nunca debe llegar al navegador.
 *
 * Si USE_MOCK_DATA=true, o si la llamada real falla (backend caído,
 * token inválido, etc.), se cae a un dataset simulado para que el panel
 * siga siendo utilizable/demostrable.
 */

const SIN_SENAL_MINUTOS = 30;

// GET /api/equipos no entrega latitud/longitud por equipo (solo `area` y
// `areaDetectada`, nombres, no coordenadas). Hasta que el backend resuelva
// coordenadas por equipo (por ejemplo cruzando areaDetectada con
// BssidsArea.Latitud/Longitud), el mapa no puede ubicar marcadores reales
// — se deja `ubicacion: null` a propósito, no es un bug.
function mapEquipoToDevice(e: EquipoApiDTO): Device {
  const nombre = [e.personalNombre, e.personalApellido].filter(Boolean).join(" ").trim();
  const minutosDesdeUltimaLectura =
    (Date.now() - new Date(e.receivedAt).getTime()) / 60_000;

  const estado =
    minutosDesdeUltimaLectura > SIN_SENAL_MINUTOS
      ? "sin_senal"
      : e.alerta
        ? "alerta"
        : "normal";

  return {
    id: String(e.equipoId),
    hostname: e.computerName || e.codigoActivo,
    custodioNombre: nombre || "Sin asignar",
    custodioId: e.rut ?? String(e.equipoId),
    ubicacion: null,
    estado,
    dentroDeArea: !e.alerta,
    faena: e.faena,
    area: e.area,
    areaDetectada: e.areaDetectada,
    connectionType: e.connectionType,
    ip: e.ip,
    ultimaTelemetria: e.receivedAt,
  };
}

async function fetchDaemonAPI<T>(path: string, init?: RequestInit): Promise<T> {
  const env = getEnv();
  const res = await fetch(`${env.DAEMON_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.DAEMON_API_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Error ${res.status} consultando la API del backend en ${path}`
    );
  }

  return res.json() as Promise<T>;
}

export async function listarEquipos(): Promise<Device[]> {
  if (getEnv().USE_MOCK_DATA) {
    return getMockDevices();
  }

  try {
    const { equipos } = await fetchDaemonAPI<{ equipos: EquipoApiDTO[] }>(
      "/api/equipos"
    );
    return equipos.map(mapEquipoToDevice);
  } catch (err) {
    console.error(
      "[daemon-api] fallo la llamada real, usando datos simulados:",
      err
    );
    return getMockDevices();
  }
}
