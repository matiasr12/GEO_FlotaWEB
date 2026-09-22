import "server-only";
import bcrypt from "bcryptjs";
import { dbDisponible, getPool, sql } from "@/lib/db";
import type { Role, SessionUser } from "@/types/user";

interface StoredUser extends SessionUser {
  passwordHash: string;
}

// Usuarios de desarrollo: solo se usan si AZURE_SQL_* no está configurado
// (es decir, antes de correr sql/001_create_users.sql en Azure SQL).
// Ver README > "Primer arranque" para las credenciales de prueba.
const usuariosDev: StoredUser[] = [
  {
    id: "dev-admin",
    email: "admin@geoflota.cl",
    nombre: "Administrador Demo",
    role: "admin",
    passwordHash: bcrypt.hashSync("admin123", 10),
  },
  {
    id: "dev-supervisor",
    email: "supervisor@geoflota.cl",
    nombre: "Supervisor de Turno Demo",
    role: "supervisor",
    turno: "Día",
    passwordHash: bcrypt.hashSync("supervisor123", 10),
  },
  {
    id: "dev-auditor",
    email: "auditor@geoflota.cl",
    nombre: "Auditor Demo",
    role: "auditor",
    passwordHash: bcrypt.hashSync("auditor123", 10),
  },
];

export async function autenticar(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const usuario = dbDisponible()
    ? await buscarUsuarioEnDB(email)
    : usuariosDev.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!usuario) return null;

  const valido = await bcrypt.compare(password, usuario.passwordHash);
  if (!valido) return null;

  const { passwordHash: _passwordHash, ...sessionUser } = usuario;
  void _passwordHash;
  return sessionUser;
}

async function buscarUsuarioEnDB(email: string): Promise<StoredUser | null> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("email", sql.NVarChar, email).query(`
      SELECT Id, Email, Nombre, Role, Turno, PasswordHash
      FROM Users
      WHERE Email = @email AND Activo = 1
    `);

  const row = result.recordset[0];
  if (!row) return null;

  return {
    id: row.Id,
    email: row.Email,
    nombre: row.Nombre,
    role: row.Role as Role,
    turno: row.Turno ?? undefined,
    passwordHash: row.PasswordHash,
  };
}
