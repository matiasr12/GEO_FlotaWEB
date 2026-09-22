import "server-only";
import { getMockAlerts } from "@/lib/mock-data";
import type { Alert } from "@/types/alert";

// TODO: cuando el backend exponga un endpoint real de alertas (equipos
// fuera del área autorizada), reemplazar por una llamada a daemon-api.ts
// igual que listarEquipos(). Por ahora las alertas se derivan del set de
// equipos simulado y el "reconocimiento" vive en memoria del proceso.

const reconocidas = new Set<string>();

export async function listarAlertas(): Promise<Alert[]> {
  return getMockAlerts().map((a) => ({
    ...a,
    reconocida: reconocidas.has(a.id),
  }));
}

export async function reconocerAlerta(id: string): Promise<void> {
  reconocidas.add(id);
}
