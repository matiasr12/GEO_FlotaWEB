import type { AuditLogEntry } from "@/types/audit";

// Filtros del registro de auditoría. Compartido entre la tabla (navegador)
// y el PDF (servidor) para que ambos muestren exactamente lo mismo.

export const ROL_LABEL: Record<string, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  auditor: "Auditor",
};

// Nombre legible de cada acción (los registros guardan el código).
export const ACCION_LABEL: Record<string, string> = {
  login: "Inició sesión",
  logout: "Cerró sesión",
  crear_equipo: "Creó un equipo",
  editar_equipo: "Editó un equipo",
  comentar_equipo: "Comentó un equipo",
  eliminar_equipo: "Eliminó un equipo",
  reconocer_alerta: "Reconoció una alerta",
  comentar_alerta: "Comentó una alerta",
  solicitud_titular_datos: "Registró solicitud de datos",
  estado_solicitud_titular: "Cambió estado de solicitud",
  comentar_solicitud_titular: "Comentó una solicitud",
  avisar_titular: "Avisó al titular por correo",
  exportar_pdf_equipos: "Exportó PDF de equipos",
  exportar_pdf_auditoria: "Exportó PDF de auditoría",
  // Visitas a páginas: ya no se registran, pero quedan en registros
  // antiguos (la tabla es de solo inserción, no se borran).
  ver_dashboard: "Vio el dashboard",
  ver_mapa: "Vio el mapa",
  ver_alertas: "Vio las alertas",
  ver_inventario: "Vio el inventario",
  ver_solicitud_titular: "Vio una solicitud",
};

export function accionTexto(accion: string) {
  return ACCION_LABEL[accion] ?? accion;
}

export function esVisita(accion: string) {
  return accion.startsWith("ver_");
}

export interface FiltroAuditoria {
  usuario?: string;
  rol?: string;
  // Por defecto se ocultan las visitas a páginas de registros antiguos.
  incluirVisitas?: boolean;
  // Rango en ms desde epoch. Lo calcula el navegador desde los inputs de
  // fecha (hora local del usuario) para que el servidor no dependa de su
  // propia zona horaria.
  desdeMs?: number;
  hastaMs?: number; // exclusivo
}

// Sin tildes ni mayúsculas: "matias" encuentra a "Matías".
export function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function filtrarAuditoria(registros: AuditLogEntry[], f: FiltroAuditoria): AuditLogEntry[] {
  const q = normalizar(f.usuario?.trim() ?? "");
  const min = f.desdeMs ?? -Infinity;
  const max = f.hastaMs ?? Infinity;
  return registros.filter((r) => {
    const t = new Date(r.timestamp).getTime();
    return (
      (f.incluirVisitas || !esVisita(r.action)) &&
      (!q || normalizar(r.userEmail).includes(q)) &&
      (!f.rol || r.role === f.rol) &&
      t >= min &&
      t < max
    );
  });
}
