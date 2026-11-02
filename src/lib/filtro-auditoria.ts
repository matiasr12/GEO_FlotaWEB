import type { AuditLogEntry } from "@/types/audit";

// Filtros del registro de auditoría. Compartido entre la tabla (navegador)
// y el PDF (servidor) para que ambos muestren exactamente lo mismo.

export const ROL_LABEL: Record<string, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  auditor: "Auditor",
};

export interface FiltroAuditoria {
  usuario?: string;
  rol?: string;
  // Rango en ms desde epoch. Lo calcula el navegador desde los inputs de
  // fecha (hora local del usuario) para que el servidor no dependa de su
  // propia zona horaria.
  desdeMs?: number;
  hastaMs?: number; // exclusivo
}

// Sin tildes ni mayúsculas: "matias" encuentra a "Matías".
export function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function filtrarAuditoria(registros: AuditLogEntry[], f: FiltroAuditoria): AuditLogEntry[] {
  const q = normalizar(f.usuario?.trim() ?? "");
  const min = f.desdeMs ?? -Infinity;
  const max = f.hastaMs ?? Infinity;
  return registros.filter((r) => {
    const t = new Date(r.timestamp).getTime();
    return (!q || normalizar(r.userEmail).includes(q)) && (!f.rol || r.role === f.rol) && t >= min && t < max;
  });
}
