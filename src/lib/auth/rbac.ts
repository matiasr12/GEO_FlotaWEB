import type { Role } from "@/types/user";

export type Permission =
  | "dashboard:ver"
  | "mapa:ver"
  | "alertas:ver"
  | "alertas:gestionar"
  | "inventario:ver"
  | "inventario:editar"
  | "reportes:ver"
  | "auditoria:ver"
  | "privacidad:gestionar";

const PERMISOS_POR_ROL: Record<Role, Permission[]> = {
  admin: [
    "dashboard:ver",
    "mapa:ver",
    "alertas:ver",
    "alertas:gestionar",
    "inventario:ver",
    "inventario:editar",
    "reportes:ver",
    "auditoria:ver",
    "privacidad:gestionar",
  ],
  supervisor: [
    "dashboard:ver",
    "mapa:ver",
    "alertas:ver",
    "alertas:gestionar",
    "inventario:ver",
    "reportes:ver",
  ],
  auditor: [
    "dashboard:ver",
    "mapa:ver",
    "alertas:ver",
    "inventario:ver",
    "reportes:ver",
    "auditoria:ver",
  ],
};

export function tienePermiso(role: Role, permiso: Permission): boolean {
  return PERMISOS_POR_ROL[role]?.includes(permiso) ?? false;
}

export function permisosDe(role: Role): Permission[] {
  return PERMISOS_POR_ROL[role] ?? [];
}
