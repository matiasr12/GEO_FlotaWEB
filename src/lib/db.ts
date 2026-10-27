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

// Descarta el pool actual para que la próxima consulta abra uno nuevo.
function descartarPool(motivo: unknown) {
  console.error("[db] se descarta el pool de conexiones:", motivo);
  const viejo = pool;
  pool = null;
  pending = null;
  viejo?.close().catch(() => {});
}

export async function getPool(): Promise<sql.ConnectionPool> {
  // Cuando Azure SQL Serverless se pausa (1 h sin uso), las conexiones del
  // pool quedan muertas pero el objeto seguía "conectado" en memoria: todo
  // fallaba hasta reiniciar el App Service. Si el pool ya no está sano, se
  // descarta y se abre uno nuevo (lo que además despierta la base).
  if (pool && (!pool.connected || !pool.healthy)) {
    descartarPool("pool desconectado o sin conexiones sanas");
  }
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
    // con la primera consulta tras estar inactiva, a veces más de un
    // minuto) — con 30s el primer intento fallaba siempre.
    connectionTimeout: 90000,
    requestTimeout: 30000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    options: {
      encrypt: true, // obligatorio para Azure SQL
      trustServerCertificate: false,
    },
  })
    .connect()
    .then((p) => {
      // Error de una conexión (ej. la base se pausó y cortó el socket):
      // la próxima llamada a getPool() arma un pool nuevo.
      p.on("error", (err) => {
        if (pool === p) descartarPool(err);
      });
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
