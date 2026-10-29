import "server-only";
import { dbDisponible, getPool } from "@/lib/db";

export interface ContactoPersonal {
  correo: string | null;
  telefono: string | null;
}

// "12.345.678-k" → "12345678-K": así el RUT del backend y el de la tabla
// coinciden aunque vengan escritos distinto.
export function normalizarRut(rut: string): string {
  return rut.replace(/[.\s]/g, "").toUpperCase();
}

// Correo y teléfono de cada trabajador (dbo.Personal), indexados por RUT
// normalizado. Si la DB no responde, el panel sigue funcionando sin estos
// datos en vez de caerse.
export async function obtenerContactos(): Promise<Map<string, ContactoPersonal>> {
  const contactos = new Map<string, ContactoPersonal>();
  if (!dbDisponible()) return contactos;

  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT Rut, Correo, Telefono
      FROM Personal
      WHERE Rut IS NOT NULL
    `);
    for (const r of result.recordset) {
      contactos.set(normalizarRut(r.Rut), {
        correo: r.Correo ?? null,
        telefono: r.Telefono ?? null,
      });
    }
  } catch (err) {
    console.error("[personal] no se pudieron leer los contactos:", err);
  }
  return contactos;
}
