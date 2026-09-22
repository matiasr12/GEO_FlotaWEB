import "server-only";
import { randomUUID } from "crypto";
import { dbDisponible, getPool, sql } from "@/lib/db";

export type TipoSolicitud = "acceso" | "rectificacion" | "cancelacion" | "oposicion";

export interface DataSubjectRequest {
  id: string;
  solicitanteNombre: string;
  solicitanteEmail: string;
  tipoSolicitud: TipoSolicitud;
  detalle?: string;
  estado: "pendiente" | "en_proceso" | "resuelta" | "rechazada";
  creadoEn: string;
}

const memoria: DataSubjectRequest[] = [];

export async function crearSolicitud(input: {
  solicitanteNombre: string;
  solicitanteEmail: string;
  tipoSolicitud: TipoSolicitud;
  detalle?: string;
}): Promise<DataSubjectRequest> {
  const solicitud: DataSubjectRequest = {
    id: randomUUID(),
    ...input,
    estado: "pendiente",
    creadoEn: new Date().toISOString(),
  };

  if (!dbDisponible()) {
    memoria.unshift(solicitud);
    return solicitud;
  }

  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.UniqueIdentifier, solicitud.id)
    .input("nombre", sql.NVarChar, solicitud.solicitanteNombre)
    .input("email", sql.NVarChar, solicitud.solicitanteEmail)
    .input("tipo", sql.NVarChar, solicitud.tipoSolicitud)
    .input("detalle", sql.NVarChar, solicitud.detalle ?? null).query(`
      INSERT INTO DataSubjectRequests (Id, SolicitanteNombre, SolicitanteEmail, TipoSolicitud, Detalle)
      VALUES (@id, @nombre, @email, @tipo, @detalle)
    `);

  return solicitud;
}

export async function listarSolicitudes(): Promise<DataSubjectRequest[]> {
  if (!dbDisponible()) {
    return memoria;
  }

  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT Id, SolicitanteNombre, SolicitanteEmail, TipoSolicitud, Detalle, Estado, CreadoEn
    FROM DataSubjectRequests
    ORDER BY CreadoEn DESC
  `);

  return result.recordset.map((r) => ({
    id: r.Id,
    solicitanteNombre: r.SolicitanteNombre,
    solicitanteEmail: r.SolicitanteEmail,
    tipoSolicitud: r.TipoSolicitud,
    detalle: r.Detalle ?? undefined,
    estado: r.Estado,
    creadoEn: new Date(r.CreadoEn).toISOString(),
  }));
}
