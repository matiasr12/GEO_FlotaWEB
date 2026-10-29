import "server-only";
import { randomUUID } from "crypto";
import { dbDisponible, getPool, sql } from "@/lib/db";
import type { SessionUser } from "@/types/user";

export type TipoSolicitud = "acceso" | "rectificacion" | "cancelacion" | "oposicion";
export type EstadoSolicitud = "pendiente" | "en_proceso" | "resuelta" | "rechazada";

export const ESTADOS_SOLICITUD: EstadoSolicitud[] = ["pendiente", "en_proceso", "resuelta", "rechazada"];

export interface DataSubjectRequest {
  id: string;
  solicitanteNombre: string;
  solicitanteEmail: string;
  tipoSolicitud: TipoSolicitud;
  detalle?: string;
  estado: EstadoSolicitud;
  creadoEn: string;
  resueltoEn?: string;
}

// Una fila de la bitácora (sql/005_solicitudes_bitacora.sql).
export interface NotaSolicitud {
  id: string;
  userNombre: string;
  tipo: "comentario" | "estado" | "aviso";
  comentario?: string;
  estadoAnterior?: EstadoSolicitud;
  estadoNuevo?: EstadoSolicitud;
  creadoEn: string;
}

const memoria: DataSubjectRequest[] = [];
const notasMemoria = new Map<string, NotaSolicitud[]>();

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// UniqueIdentifier de mssql lanza con un id mal formado: se descarta antes.
export function esIdSolicitudValido(id: string): boolean {
  return GUID.test(id);
}

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

  return result.recordset.map(filaASolicitud);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function filaASolicitud(r: any): DataSubjectRequest {
  return {
    id: r.Id,
    solicitanteNombre: r.SolicitanteNombre,
    solicitanteEmail: r.SolicitanteEmail,
    tipoSolicitud: r.TipoSolicitud,
    detalle: r.Detalle ?? undefined,
    estado: r.Estado,
    creadoEn: new Date(r.CreadoEn).toISOString(),
    resueltoEn: r.ResueltoEn ? new Date(r.ResueltoEn).toISOString() : undefined,
  };
}

export async function obtenerSolicitud(id: string): Promise<DataSubjectRequest | null> {
  if (!dbDisponible()) {
    return memoria.find((s) => s.id === id) ?? null;
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("id", sql.UniqueIdentifier, id).query(`
      SELECT Id, SolicitanteNombre, SolicitanteEmail, TipoSolicitud, Detalle, Estado, CreadoEn, ResueltoEn
      FROM DataSubjectRequests
      WHERE Id = @id
    `);
  const fila = result.recordset[0];
  return fila ? filaASolicitud(fila) : null;
}

export async function listarNotas(solicitudId: string): Promise<NotaSolicitud[]> {
  if (!dbDisponible()) {
    return notasMemoria.get(solicitudId) ?? [];
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("id", sql.UniqueIdentifier, solicitudId).query(`
      SELECT Id, UserNombre, Tipo, Comentario, EstadoAnterior, EstadoNuevo, CreadoEn
      FROM DataSubjectRequestNotes
      WHERE SolicitudId = @id
      ORDER BY CreadoEn ASC
    `);

  return result.recordset.map((r) => ({
    id: r.Id,
    userNombre: r.UserNombre,
    tipo: r.Tipo,
    comentario: r.Comentario ?? undefined,
    estadoAnterior: r.EstadoAnterior ?? undefined,
    estadoNuevo: r.EstadoNuevo ?? undefined,
    creadoEn: new Date(r.CreadoEn).toISOString(),
  }));
}

export async function agregarNota(
  solicitudId: string,
  user: SessionUser,
  nota: Omit<NotaSolicitud, "id" | "userNombre" | "creadoEn">
): Promise<NotaSolicitud> {
  const nueva: NotaSolicitud = {
    id: randomUUID(),
    userNombre: user.nombre,
    creadoEn: new Date().toISOString(),
    ...nota,
  };

  if (!dbDisponible()) {
    notasMemoria.set(solicitudId, [...(notasMemoria.get(solicitudId) ?? []), nueva]);
    return nueva;
  }

  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.UniqueIdentifier, nueva.id)
    .input("solicitudId", sql.UniqueIdentifier, solicitudId)
    .input("userId", sql.NVarChar, user.id)
    .input("userNombre", sql.NVarChar, user.nombre)
    .input("tipo", sql.NVarChar, nueva.tipo)
    .input("comentario", sql.NVarChar, nueva.comentario ?? null)
    .input("anterior", sql.NVarChar, nueva.estadoAnterior ?? null)
    .input("nuevo", sql.NVarChar, nueva.estadoNuevo ?? null).query(`
      INSERT INTO DataSubjectRequestNotes
        (Id, SolicitudId, UserId, UserNombre, Tipo, Comentario, EstadoAnterior, EstadoNuevo)
      VALUES (@id, @solicitudId, @userId, @userNombre, @tipo, @comentario, @anterior, @nuevo)
    `);
  return nueva;
}

// Cambia el estado y deja el cambio en la bitácora. Al pasar a resuelta o
// rechazada se guarda quién y cuándo la cerró (ResueltoEn/ResueltoPor).
export async function cambiarEstado(
  solicitud: DataSubjectRequest,
  estado: EstadoSolicitud,
  user: SessionUser,
  comentario?: string
): Promise<DataSubjectRequest> {
  const cerrada = estado === "resuelta" || estado === "rechazada";
  const actualizada: DataSubjectRequest = {
    ...solicitud,
    estado,
    resueltoEn: cerrada ? new Date().toISOString() : undefined,
  };

  if (!dbDisponible()) {
    const i = memoria.findIndex((s) => s.id === solicitud.id);
    if (i >= 0) memoria[i] = actualizada;
  } else {
    const pool = await getPool();
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, solicitud.id)
      .input("estado", sql.NVarChar, estado)
      .input("cerrada", sql.Bit, cerrada)
      .input("por", sql.NVarChar, cerrada ? user.email : null).query(`
        UPDATE DataSubjectRequests
        SET Estado = @estado,
            ResueltoEn = CASE WHEN @cerrada = 1 THEN SYSUTCDATETIME() ELSE NULL END,
            ResueltoPor = @por
        WHERE Id = @id
      `);
  }

  await agregarNota(solicitud.id, user, {
    tipo: "estado",
    estadoAnterior: solicitud.estado,
    estadoNuevo: estado,
    comentario,
  });
  return actualizada;
}
