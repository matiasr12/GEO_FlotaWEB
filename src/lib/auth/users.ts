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
//
// Nunca en producción: si en Azure faltara alguna variable AZURE_SQL_*,
// antes se caía en silencio a estos usuarios y admin123 entraba como
// admin. Se generan perezosamente para no pagar el bcrypt al arrancar.
const usuariosDevPermitidos = process.env.NODE_ENV !== "production";
let usuariosDevCache: StoredUser[] | null = null;

function usuariosDev(): StoredUser[] {
  if (!usuariosDevCache) {
    usuariosDevCache = [
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
  }
  return usuariosDevCache;
}

export async function autenticar(
  email: string,
  password: string
): Promise<SessionUser | null> {
  let usuario: StoredUser | null | undefined;
  if (dbDisponible()) {
    usuario = await buscarUsuarioEnDB(email);
  } else if (usuariosDevPermitidos) {
    usuario = usuariosDev().find((u) => u.email.toLowerCase() === email.toLowerCase());
  } else {
    console.error("[auth] Azure SQL no está configurado en producción: login deshabilitado.");
    return null;
  }

  if (!usuario) return null;

  const valido = await bcrypt.compare(password, usuario.passwordHash);
  if (!valido) return null;

  const { passwordHash: _passwordHash, ...sessionUser } = usuario;
  void _passwordHash;
  return sessionUser;
}

// Estado actual del usuario de una sesión. El JWT guarda el rol del
// momento del login; sin esto un usuario desactivado (Activo = 0) o al
// que se le bajó el rol seguía entrando con sus permisos viejos mientras
// la sesión deslizante se fuera renovando. Caché corta para no ir a la
// DB en cada request: un cambio tarda como mucho CACHE_MS en aplicarse.
const CACHE_MS = 60_000;
const cacheUsuarios = new Map<string, { user: SessionUser | null; hasta: number }>();

export async function obtenerUsuarioVigente(
  sesion: SessionUser
): Promise<SessionUser | null> {
  if (!dbDisponible()) {
    return usuariosDevPermitidos ? sesion : null;
  }

  const enCache = cacheUsuarios.get(sesion.id);
  if (enCache && enCache.hasta > Date.now()) return enCache.user;

  const pool = await getPool();
  const result = await pool
    .request()
    .input("id", sql.NVarChar, sesion.id).query(`
      SELECT Id, Email, Nombre, Role, Turno
      FROM Users
      WHERE Id = @id AND Activo = 1
    `);

  const row = result.recordset[0];
  const user: SessionUser | null = row
    ? {
        id: row.Id,
        email: row.Email,
        nombre: row.Nombre,
        role: row.Role as Role,
        turno: row.Turno ?? undefined,
      }
    : null;

  cacheUsuarios.set(sesion.id, { user, hasta: Date.now() + CACHE_MS });
  return user;
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
