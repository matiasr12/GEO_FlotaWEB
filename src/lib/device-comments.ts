import "server-only";
import { dbDisponible, getPool, sql } from "@/lib/db";

// Fallback de desarrollo: se usa si AZURE_SQL_* no está configurado, o
// mientras no se corra sql/004_equipos_comentarios.sql en Azure SQL.
const memoria = new Map<string, string>();

export async function obtenerComentarios(): Promise<Record<string, string>> {
  if (!dbDisponible()) {
    return Object.fromEntries(memoria);
  }

  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT Id, Comentarios FROM Equipos WHERE Comentarios IS NOT NULL
  `);

  return Object.fromEntries(
    result.recordset.map((r) => [String(r.Id), r.Comentarios as string])
  );
}

export async function guardarComentario(equipoId: string, comentario: string): Promise<void> {
  if (!dbDisponible()) {
    if (comentario) memoria.set(equipoId, comentario);
    else memoria.delete(equipoId);
    return;
  }

  const id = Number(equipoId);
  if (!Number.isInteger(id)) {
    throw new Error(`equipoId inválido: ${equipoId}`);
  }

  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.Int, id)
    .input("comentario", sql.NVarChar, comentario || null).query(`
      UPDATE Equipos SET Comentarios = @comentario WHERE Id = @id
    `);
}
