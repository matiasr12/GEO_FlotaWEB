import "server-only";
import { dbDisponible, getPool, sql } from "@/lib/db";
import { listarEquipos } from "@/lib/daemon-api";
import type { Alert, AccionAlerta, EstadoAlerta } from "@/types/alert";
import type { SessionUser } from "@/types/user";

// El BACKEND abre/cierra alertas en dbo.Alertas con cada lectura (geocerca
// real). Este módulo solo LEE esa tabla, y escribe en dbo.AccionesAlerta
// cuando un supervisor reconoce una alerta o deja un comentario — nunca
// crea ni cierra una fila de Alertas.

function esGuidValido(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function calcularDuracionMinutos(fechaInicio: string, fechaCierre: string | null): number {
  const inicio = new Date(fechaInicio).getTime();
  const fin = fechaCierre ? new Date(fechaCierre).getTime() : Date.now();
  return Math.max(0, Math.round((fin - inicio) / 60_000));
}

function ordenAlertas(a: Alert, b: Alert): number {
  const peso: Record<EstadoAlerta, number> = { abierta: 0, revisada: 1, cerrada: 2 };
  if (peso[a.estado] !== peso[b.estado]) return peso[a.estado] - peso[b.estado];
  return b.fechaInicio.localeCompare(a.fechaInicio);
}

// --- Fallback de desarrollo: sin AZURE_SQL_* (o USE_MOCK_DATA), no hay
// backend llenando dbo.Alertas de verdad. Para no dejar la pantalla vacía,
// se derivan alertas sintéticas de los equipos mock en estado "alerta"
// (mismo comportamiento que esta pantalla tenía antes de dbo.Alertas).

const estadosMemoria = new Map<number, EstadoAlerta>();
const accionesMemoria: AccionAlerta[] = [];
let siguienteAccionIdMemoria = 1;

function alertaIdDesdeEquipoId(equipoId: string): number {
  let hash = 0;
  for (const ch of equipoId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % 1_000_000;
}

async function listarAlertasMemoria(): Promise<Alert[]> {
  const devices = await listarEquipos();
  const alertas = devices
    .filter((d) => d.estado === "alerta")
    .map((d): Alert => {
      const id = alertaIdDesdeEquipoId(d.id);
      const fechaInicio = d.ultimaTelemetria ?? new Date().toISOString();
      const fechaCierre = estadosMemoria.get(id) === "cerrada" ? new Date().toISOString() : null;
      return {
        id,
        equipoId: d.id,
        hostname: d.hostname,
        custodioNombre: d.custodioNombre,
        area: d.areaDetectada ?? d.area ?? null,
        faena: d.faena ?? null,
        estado: estadosMemoria.get(id) ?? "abierta",
        ubicacion: d.ubicacion ? { lat: d.ubicacion.lat, lng: d.ubicacion.lng } : null,
        fechaInicio,
        fechaCierre,
        duracionMinutos: calcularDuracionMinutos(fechaInicio, fechaCierre),
      };
    });

  return alertas.sort(ordenAlertas);
}

// --- Caso real: dbo.Alertas / dbo.AccionesAlerta en Azure SQL.

export async function listarAlertas(): Promise<Alert[]> {
  if (!dbDisponible()) {
    return listarAlertasMemoria();
  }

  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      al.Id, al.EquipoId, al.Estado, al.FechaInicio, al.FechaCierre,
      e.ComputerName, e.CodigoActivo,
      p.Nombre AS PersonalNombre, p.Apellido AS PersonalApellido,
      ar.Nombre AS AreaNombre,
      fa.Nombre AS FaenaNombre,
      dr.Latitud, dr.Longitud
    FROM Alertas al
    JOIN Equipos e ON e.Id = al.EquipoId
    LEFT JOIN Personal p ON p.Id = e.PersonalId
    LEFT JOIN Areas ar ON ar.Id = al.AreaId
    LEFT JOIN Faenas fa ON fa.Id = ar.FaenaId
    LEFT JOIN DeviceRecords dr ON dr.Id = al.DeviceRecordId
    ORDER BY
      CASE al.Estado WHEN 'abierta' THEN 0 WHEN 'revisada' THEN 1 ELSE 2 END,
      al.FechaInicio DESC
  `);

  return result.recordset.map((r) => {
    const nombre = [r.PersonalNombre, r.PersonalApellido].filter(Boolean).join(" ").trim();
    const fechaInicio = new Date(r.FechaInicio).toISOString();
    const fechaCierre = r.FechaCierre ? new Date(r.FechaCierre).toISOString() : null;
    return {
      id: r.Id,
      equipoId: String(r.EquipoId),
      hostname: r.ComputerName || r.CodigoActivo,
      custodioNombre: nombre || "Sin asignar",
      area: r.AreaNombre ?? null,
      faena: r.FaenaNombre ?? null,
      estado: r.Estado as EstadoAlerta,
      ubicacion: r.Latitud != null && r.Longitud != null ? { lat: r.Latitud, lng: r.Longitud } : null,
      fechaInicio,
      fechaCierre,
      duracionMinutos: calcularDuracionMinutos(fechaInicio, fechaCierre),
    };
  });
}

// Reconoce (abierta -> revisada). Devuelve false si la alerta no existe o
// ya no estaba "abierta" (el caller debe usar comentarAlerta en ese caso).
export async function reconocerAlerta(
  alertaId: number,
  user: SessionUser,
  comentario?: string
): Promise<boolean> {
  if (!dbDisponible()) {
    const estadoActual = estadosMemoria.get(alertaId) ?? "abierta";
    if (estadoActual !== "abierta") return false;
    estadosMemoria.set(alertaId, "revisada");
    accionesMemoria.push({
      id: siguienteAccionIdMemoria++,
      alertaId,
      usuarioId: user.id,
      usuarioNombre: user.nombre,
      estadoAnterior: "abierta",
      estadoNuevo: "revisada",
      comentario: comentario ?? null,
      fecha: new Date().toISOString(),
    });
    return true;
  }

  if (!esGuidValido(user.id)) {
    throw new Error(
      "Tu sesión no tiene un Id real de Users (estás con el usuario demo) — no se puede registrar en AccionesAlerta."
    );
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const actual = await new sql.Request(transaction)
      .input("id", sql.Int, alertaId)
      .query("SELECT Estado FROM Alertas WHERE Id = @id");

    const estadoActual = actual.recordset[0]?.Estado as EstadoAlerta | undefined;
    if (!estadoActual || estadoActual !== "abierta") {
      await transaction.rollback();
      return false;
    }

    await new sql.Request(transaction)
      .input("id", sql.Int, alertaId)
      .query("UPDATE Alertas SET Estado = 'revisada' WHERE Id = @id");

    await new sql.Request(transaction)
      .input("alertaId", sql.Int, alertaId)
      .input("usuarioId", sql.UniqueIdentifier, user.id)
      .input("comentario", sql.NVarChar, comentario ?? null).query(`
        INSERT INTO AccionesAlerta (AlertaId, UsuarioId, EstadoAnterior, EstadoNuevo, Comentario)
        VALUES (@alertaId, @usuarioId, 'abierta', 'revisada', @comentario)
      `);

    await transaction.commit();
    return true;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

// Agrega solo un comentario (EstadoNuevo = NULL), sin tocar dbo.Alertas.
// Funciona sobre una alerta en cualquier estado (incluso ya cerrada).
export async function comentarAlerta(
  alertaId: number,
  user: SessionUser,
  comentario: string
): Promise<boolean> {
  if (!dbDisponible()) {
    const estadoActual = estadosMemoria.get(alertaId) ?? "abierta";
    accionesMemoria.push({
      id: siguienteAccionIdMemoria++,
      alertaId,
      usuarioId: user.id,
      usuarioNombre: user.nombre,
      estadoAnterior: estadoActual,
      estadoNuevo: null,
      comentario,
      fecha: new Date().toISOString(),
    });
    return true;
  }

  if (!esGuidValido(user.id)) {
    throw new Error(
      "Tu sesión no tiene un Id real de Users (estás con el usuario demo) — no se puede registrar en AccionesAlerta."
    );
  }

  const pool = await getPool();
  const actual = await pool
    .request()
    .input("id", sql.Int, alertaId)
    .query("SELECT Estado FROM Alertas WHERE Id = @id");

  const estadoActual = actual.recordset[0]?.Estado as EstadoAlerta | undefined;
  if (!estadoActual) return false;

  await pool
    .request()
    .input("alertaId", sql.Int, alertaId)
    .input("usuarioId", sql.UniqueIdentifier, user.id)
    .input("estadoAnterior", sql.NVarChar, estadoActual)
    .input("comentario", sql.NVarChar, comentario).query(`
      INSERT INTO AccionesAlerta (AlertaId, UsuarioId, EstadoAnterior, EstadoNuevo, Comentario)
      VALUES (@alertaId, @usuarioId, @estadoAnterior, NULL, @comentario)
    `);

  return true;
}

export async function listarAcciones(alertaId: number): Promise<AccionAlerta[]> {
  if (!dbDisponible()) {
    return accionesMemoria
      .filter((a) => a.alertaId === alertaId)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("alertaId", sql.Int, alertaId)
    .query(`
      SELECT ac.Id, ac.AlertaId, ac.UsuarioId, ac.EstadoAnterior, ac.EstadoNuevo, ac.Comentario, ac.Fecha,
             u.Nombre AS UsuarioNombre
      FROM AccionesAlerta ac
      LEFT JOIN Users u ON u.Id = ac.UsuarioId
      WHERE ac.AlertaId = @alertaId
      ORDER BY ac.Fecha ASC
    `);

  return result.recordset.map((r) => ({
    id: r.Id,
    alertaId: r.AlertaId,
    usuarioId: r.UsuarioId,
    usuarioNombre: r.UsuarioNombre ?? null,
    estadoAnterior: r.EstadoAnterior as EstadoAlerta,
    estadoNuevo: (r.EstadoNuevo as EstadoAlerta | null) ?? null,
    comentario: r.Comentario ?? null,
    fecha: new Date(r.Fecha).toISOString(),
  }));
}
