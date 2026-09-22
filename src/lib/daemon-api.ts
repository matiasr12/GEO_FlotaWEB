import "server-only";
import { getEnv } from "@/lib/env";
import type { Device, EquipoApiDTO } from "@/types/device";
import { getMockDevices } from "@/lib/mock-data";

/**
 * Cliente server-side hacia la API del backend (Azure). El token
 * compartido del daemon vive solo acá: nunca debe llegar al navegador.
 *
 * Los datos simulados SOLO se usan cuando USE_MOCK_DATA=true a propósito
 * (desarrollo local sin backend a mano). Si la llamada real falla, el
 * panel muestra "0 equipos" en vez de disfrazar el error con data falsa
 * — así un problema de conexión/autenticación con el backend real nunca
 * se confunde con equipos de verdad.
 */

const SIN_SENAL_MINUTOS = 30;

// GET /api/equipos ahora resuelve latitud/longitud cruzando el BSSID
// visto por el equipo contra BssidsArea (mismo backend, misma fila que
// ya usaba para areaDetectada). Si el equipo no tiene ningún BSSID
// conocido, el backend manda null y acá se deja sin ubicación en vez de
// inventar coordenadas.
function mapEquipoToDevice(e: EquipoApiDTO): Device {
  const nombre = [e.personalNombre, e.personalApellido].filter(Boolean).join(" ").trim();
  const ultimaLectura = e.receivedAt ? new Date(e.receivedAt).getTime() : NaN;
  const minutosDesdeUltimaLectura = (Date.now() - ultimaLectura) / 60_000;

  // Sin receivedAt (nunca reportó) o con una fecha inválida cuenta como
  // sin señal, no como "normal" (Number.isNaN(minutos) antes se colaba
  // como false en la comparación y lo dejaba pasar por normal/alerta).
  const estado =
    Number.isNaN(minutosDesdeUltimaLectura) || minutosDesdeUltimaLectura > SIN_SENAL_MINUTOS
      ? "sin_senal"
      : e.alerta
        ? "alerta"
        : "normal";

  const ubicacion =
    e.latitud != null && e.longitud != null
      ? {
          lat: e.latitud,
          lng: e.longitud,
          capturedAt: e.receivedAt ?? e.recordTimestamp,
          precisionMetros: e.precisionMetros,
        }
      : null;

  return {
    id: String(e.equipoId),
    hostname: e.computerName || e.codigoActivo,
    custodioNombre: nombre || "Sin asignar",
    custodioId: e.rut ?? String(e.equipoId),
    ubicacion,
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
    console.error("[daemon-api] fallo la llamada a /api/equipos:", err);
    return [];
  }
}
