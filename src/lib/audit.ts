import "server-only";
import { randomUUID } from "crypto";
import { dbDisponible, getPool, sql } from "@/lib/db";
import type { AuditAction, AuditLogEntry } from "@/types/audit";
import type { SessionUser } from "@/types/user";

// Registro de auditoría de solo-inserción: ver sql/002_audit_log.sql para
// el trigger que impide UPDATE/DELETE a nivel de base de datos. Esta capa
// nunca expone una operación de edición o borrado a propósito.

const memoria: AuditLogEntry[] = [];

export async function registrarAuditoria(params: {
  user: SessionUser;
  action: AuditAction;
  detalle?: string;
  ip?: string;
}) {
  const entry: AuditLogEntry = {
    id: randomUUID(),
    userId: params.user.id,
    userEmail: params.user.email,
    role: params.user.role,
    action: params.action,
    detalle: params.detalle,
    timestamp: new Date().toISOString(),
    ip: params.ip,
  };

  if (!dbDisponible()) {
    // Fallback de desarrollo: aún no se ha corrido la migración en Azure SQL.
    memoria.push(entry);
    console.info("[audit:mem]", entry);
    return entry;
  }

  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.UniqueIdentifier, entry.id)
    .input("userId", sql.NVarChar, entry.userId)
    .input("userEmail", sql.NVarChar, entry.userEmail)
    .input("role", sql.NVarChar, entry.role)
    .input("action", sql.NVarChar, entry.action)
    .input("detalle", sql.NVarChar, entry.detalle ?? null)
    .input("ip", sql.NVarChar, entry.ip ?? null).query(`
      INSERT INTO AuditLog (Id, UserId, UserEmail, Role, Action, Detalle, Ip, Timestamp)
      VALUES (@id, @userId, @userEmail, @role, @action, @detalle, @ip, SYSUTCDATETIME())
    `);

  return entry;
}

export async function listarAuditoria(): Promise<AuditLogEntry[]> {
  if (!dbDisponible()) {
    return [...memoria].reverse();
  }

  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT TOP 500 Id, UserId, UserEmail, Role, Action, Detalle, Ip, Timestamp
    FROM AuditLog
    ORDER BY Timestamp DESC
  `);

  return result.recordset.map((r) => ({
    id: r.Id,
    userId: r.UserId,
    userEmail: r.UserEmail,
    role: r.Role,
    action: r.Action,
    detalle: r.Detalle ?? undefined,
    timestamp: new Date(r.Timestamp).toISOString(),
    ip: r.Ip ?? undefined,
  }));
}
