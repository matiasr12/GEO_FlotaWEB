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
    // La base es Azure SQL Serverless (se pausa sola y tarda en "despertar"
    // con la primera consulta tras estar inactiva) — el timeout por
    // defecto de 15s no alcanza para ese arranque en frío.
    connectionTimeout: 30000,
    requestTimeout: 30000,
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
    })
    .catch((err) => {
      // Sin esto, un primer intento fallido (ej. DB recién despertando)
      // deja `pending` apuntando a una promesa ya rechazada para siempre,
      // y todo login posterior fallaría sin volver a intentar.
      pending = null;
      throw err;
    });

  return pending;
}

export { sql };
