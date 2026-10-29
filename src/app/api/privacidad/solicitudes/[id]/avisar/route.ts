import { NextResponse } from "next/server";
import { z } from "zod";
import { obtenerSesion } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/rbac";
import {
  agregarNota,
  esIdSolicitudValido,
  listarNotas,
  obtenerSolicitud,
} from "@/lib/data-subject-requests";
import {
  avisarEstadoSolicitud,
  ESTADO_LABEL,
  intentarAviso,
  origenPublico,
} from "@/lib/avisos-privacidad";
import { registrarAuditoria } from "@/lib/audit";

const bodySchema = z.object({
  mensaje: z.string().trim().max(2000).optional(),
});

// Botón "Avisar al titular": le manda por correo el estado actual de su
// solicitud, con un mensaje opcional, y lo deja en la bitácora.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await obtenerSesion();
  if (!user || !tienePermiso(user.role, "privacidad:gestionar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  if (!esIdSolicitudValido(id)) {
    return NextResponse.json({ error: "Id de solicitud inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 });
  }

  const solicitud = await obtenerSolicitud(id);
  if (!solicitud) {
    return NextResponse.json({ error: "La solicitud no existe" }, { status: 404 });
  }

  const mensaje = parsed.data.mensaje || undefined;
  const aviso = await intentarAviso(() =>
    avisarEstadoSolicitud(solicitud, origenPublico(req), mensaje)
  );

  if (aviso.correoEnviado) {
    await agregarNota(id, user, {
      tipo: "aviso",
      comentario:
        `Se avisó a ${solicitud.solicitanteEmail} que su solicitud está ${ESTADO_LABEL[solicitud.estado]}` +
        (mensaje ? `: "${mensaje}"` : "."),
    });
    await registrarAuditoria({ user, action: "avisar_titular", detalle: `${id} · ${solicitud.estado}` });
  }

  return NextResponse.json({ ...aviso, notas: await listarNotas(id) });
}
