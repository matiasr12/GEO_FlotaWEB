import "server-only";
import { getEnv } from "@/lib/env";
import type { Device } from "@/types/device";
import { getMockDevices } from "@/lib/mock-data";

/**
 * Cliente server-side hacia la API del backend (Azure). El token
 * compartido del daemon vive solo acá: nunca debe llegar al navegador.
 *
 * Mientras el backend no exponga un endpoint estable de "listar equipos
 * con última posición" (hoy solo recibe lecturas del daemon), o mientras
 * esté detenido, se usa un dataset simulado para poder construir y probar
 * el panel. USE_MOCK_DATA=false intentará la llamada real.
 */

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
    return await fetchDaemonAPI<Device[]>("/api/devices");
  } catch (err) {
    console.error(
      "[daemon-api] fallo la llamada real, usando datos simulados:",
      err
    );
    return getMockDevices();
  }
}
