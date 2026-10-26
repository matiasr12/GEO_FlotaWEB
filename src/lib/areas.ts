import "server-only";
import { dbDisponible, getPool } from "@/lib/db";

// Todas las áreas registradas en dbo.Areas (la misma tabla que usa el
// backend para la geocerca), tengan o no equipos vinculados ahora. Sirve
// para que el filtro de área no muestre solo las que aparecen en la
// lista de equipos.
export async function listarAreas(): Promise<string[]> {
  if (!dbDisponible()) return [];

  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT DISTINCT Nombre
      FROM Areas
      WHERE Nombre IS NOT NULL
      ORDER BY Nombre
    `);
    return result.recordset.map((r) => r.Nombre as string);
  } catch (err) {
    console.error("[areas] no se pudieron listar las áreas:", err);
    return [];
  }
}
