import { NextResponse } from "next/server";
import { z } from "zod";
import { obtenerSesion } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/rbac";
import {
  agregarNota,
  cambiarEstado,
  esIdSolicitudValido,
  ESTADOS_SOLICITUD,
  listarNotas,
  obtenerSolicitud,
} from "@/lib/data-subject-requests";
import { registrarAuditoria } from "@/lib/audit";
import { citar } from "@/lib/texto-auditoria";
import type { EstadoSolicitud } from "@/lib/data-subject-requests";

// Mismos nombres que muestra el panel (SolicitudDetalleModal).
const ESTADO_NOMBRE: Record<EstadoSolicitud, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  resuelta: "Resuelta",
  rechazada: "Rechazada",
};

type Ctx = { params: Promise<{ id: string }> };

// Detalle de una solicitud + su bitácora.
export async function GET(_req: Request, { params }: Ctx) {
  const user = await obtenerSesion();
  if (!user || !tienePermiso(user.role, "privacidad:gestionar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  if (!esIdSolicitudValido(id)) {
    return NextResponse.json({ error: "Id de solicitud inválido" }, { status: 400 });
  }

  const solicitud = await obtenerSolicitud(id);
  if (!solicitud) {
    return NextResponse.json({ error: "La solicitud no existe" }, { status: 404 });
  }

  return NextResponse.json({ solicitud, notas: await listarNotas(id) });
}

const patchSchema = z
  .object({
    estado: z.enum(ESTADOS_SOLICITUD as [string, ...string[]]).optional(),
    comentario: z.string().trim().max(2000).optional(),
  })
  .refine((b) => b.estado || b.comentario, { message: "Nada que guardar" });

// Cambiar el estado y/o agregar un comentario interno.
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await obtenerSesion();
  if (!user || !tienePermiso(user.role, "privacidad:gestionar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  if (!esIdSolicitudValido(id)) {
    return NextResponse.json({ error: "Id de solicitud inválido" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Escribe un comentario o elige un estado nuevo" }, { status: 400 });
  }

  let solicitud = await obtenerSolicitud(id);
  if (!solicitud) {
    return NextResponse.json({ error: "La solicitud no existe" }, { status: 404 });
  }

  const { estado, comentario } = parsed.data;
  const titular = `${solicitud.solicitanteNombre} (${solicitud.tipoSolicitud})`;
  if (estado && estado !== solicitud.estado) {
    const anterior = solicitud.estado;
    // El comentario, si hay, queda en la misma fila del cambio de estado.
    solicitud = await cambiarEstado(solicitud, estado as typeof solicitud.estado, user, comentario || undefined);
    await registrarAuditoria({
      user,
      action: "estado_solicitud_titular",
      // Sin "→": Helvetica del PDF de auditoría no tiene ese carácter.
      detalle: [titular, `de ${ESTADO_NOMBRE[anterior]} a ${ESTADO_NOMBRE[solicitud.estado]}`, citar(comentario)]
        .filter(Boolean)
        .join(" · "),
    });
  } else if (comentario) {
    await agregarNota(id, user, { tipo: "comentario", comentario });
    await registrarAuditoria({
      user,
      action: "comentar_solicitud_titular",
      detalle: `${titular} · ${citar(comentario)}`,
    });
  }

  return NextResponse.json({ solicitud, notas: await listarNotas(id) });
}
