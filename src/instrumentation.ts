// Se ejecuta una vez al arrancar el servidor (ver docs de Next:
// 02-guides/instrumentation.md).
//
// La base es Azure SQL Serverless: se pausa sola y la primera consulta
// tras despertar tarda cerca de un minuto. Sin esto, ese minuto lo pagaba
// el primer usuario que intentaba hacer login. Acá se despierta la base
// apenas arranca el contenedor, sin bloquear el arranque (no se espera).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { AZURE_SQL_SERVER, AZURE_SQL_DATABASE, AZURE_SQL_USER, AZURE_SQL_PASSWORD } =
    process.env;
  if (!AZURE_SQL_SERVER || !AZURE_SQL_DATABASE || !AZURE_SQL_USER || !AZURE_SQL_PASSWORD) {
    return;
  }

  void (async () => {
    try {
      const { default: sql } = await import("mssql");
      const pool = await new sql.ConnectionPool({
        server: AZURE_SQL_SERVER,
        database: AZURE_SQL_DATABASE,
        user: AZURE_SQL_USER,
        password: AZURE_SQL_PASSWORD,
        connectionTimeout: 90000,
        requestTimeout: 30000,
        options: { encrypt: true, trustServerCertificate: false },
      }).connect();
      await pool.request().query("SELECT 1");
      await pool.close();
      console.log("[warmup] Azure SQL despierta");
    } catch (err) {
      console.error("[warmup] no se pudo despertar Azure SQL:", err);
    }
  })();
}
