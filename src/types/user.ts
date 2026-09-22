export type Role = "admin" | "supervisor" | "auditor";

export interface SessionUser {
  id: string;
  email: string;
  nombre: string;
  role: Role;
  turno?: string;
}
