export type AuditAction =
  | "login"
  | "logout"
  | "ver_dashboard"
  | "ver_mapa"
  | "ver_alertas"
  | "ver_inventario"
  | "crear_equipo"
  | "editar_equipo"
  | "eliminar_equipo"
  | "reconocer_alerta"
  | "solicitud_titular_datos";

export interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  role: string;
  action: AuditAction;
  detalle?: string;
  timestamp: string;
  ip?: string;
}
