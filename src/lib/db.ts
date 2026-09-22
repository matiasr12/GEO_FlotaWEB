import "server-only";
import sql from "mssql";
import { getEnv } from "@/lib/env";

let pool: sql.ConnectionPool | null = null;
let pending: Promise<sql.ConnectionPool> | null = null;

export function dbDisponible() {
  const env = getEnv();
  return Boolean(
    env.AZURE_SQL_SERVER &&
      env.AZURE_SQL_DATABASE &&
      env.AZURE_SQL_USER &&
      env.AZURE_SQL_PASSWORD
  );
}

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool) return pool;
  if (pending) return pending;

  if (!dbDisponible()) {
    throw new Error(
      "Azure SQL no está configurado (faltan AZURE_SQL_* en el entorno)."
    );
  }

  const env = getEnv();
  pending = new sql.ConnectionPool({
    server: env.AZURE_SQL_SERVER!,
    database: env.AZURE_SQL_DATABASE!,
    user: env.AZURE_SQL_USER!,
    password: env.AZURE_SQL_PASSWORD!,
    options: {
      encrypt: true, // obligatorio para Azure SQL
      trustServerCertificate: false,
    },
  })
    .connect()
    .then((p) => {
      pool = p;
      pending = null;
      return p;
    });

  return pending;
}

export { sql };
