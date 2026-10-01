import "server-only";
import { dbDisponible, getPool, sql } from "@/lib/db";
import type { SessionUser } from "@/types/user";

// Fallback de desarrollo: aún no se ha corrido sql/004_device_comments.sql en Azure SQL.
const memoria = new Map<string, string>();

export async function obtenerComentarios(): Promise<Record<string, string>> {
  if (!dbDisponible()) {
    return Object.fromEntries(memoria);
  }

  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT EquipoId, Comentario FROM DeviceComments
  `);

  return Object.fromEntries(result.recordset.map((r) => [r.EquipoId, r.Comentario]));
}

export async function guardarComentario(
  equipoId: string,
  comentario: string,
  user: SessionUser
): Promise<void> {
  if (!dbDisponible()) {
    if (comentario) memoria.set(equipoId, comentario);
    else memoria.delete(equipoId);
    return;
  }

  const pool = await getPool();
  await pool
    .request()
    .input("equipoId", sql.NVarChar, equipoId)
    .input("comentario", sql.NVarChar, comentario)
    .input("updatedBy", sql.NVarChar, user.email).query(`
      MERGE DeviceComments AS target
      USING (SELECT @equipoId AS EquipoId) AS source
      ON target.EquipoId = source.EquipoId
      WHEN MATCHED THEN
        UPDATE SET Comentario = @comentario, UpdatedBy = @updatedBy, UpdatedAt = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (EquipoId, Comentario, UpdatedBy, UpdatedAt)
        VALUES (@equipoId, @comentario, @updatedBy, SYSUTCDATETIME());
    `);
}
