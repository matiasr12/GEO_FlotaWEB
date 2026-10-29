import { NextResponse } from "next/server";
import { z } from "zod";
import { obtenerSesion } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/rbac";
import {
  crearSolicitud,
  listarSolicitudes,
  type DataSubjectRequest,
  type TipoSolicitud,
} from "@/lib/data-subject-requests";
import { correoConfigurado, enviarCorreo, escaparHtml } from "@/lib/email";
import { registrarAuditoria } from "@/lib/audit";

export async function GET() {
  const user = await obtenerSesion();
  if (!user || !tienePermiso(user.role, "privacidad:gestionar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  return NextResponse.json(await listarSolicitudes());
}

const inputSchema = z.object({
  solicitanteNombre: z.string().min(2),
  solicitanteEmail: z.string().email(),
  tipoSolicitud: z.enum(["acceso", "rectificacion", "cancelacion", "oposicion"]),
  detalle: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await obtenerSesion();
  if (!user || !tienePermiso(user.role, "privacidad:gestionar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const solicitud = await crearSolicitud(parsed.data);
  await registrarAuditoria({
    user,
    action: "solicitud_titular_datos",
    detalle: `${solicitud.tipoSolicitud} · ${solicitud.solicitanteEmail}`,
  });

  // Aviso al titular. Si falla, la solicitud ya quedó registrada: se
  // informa al panel para que el admin avise por otro medio.
  // correoError va al formulario (solo admins ven esta página) para saber
  // por qué no salió sin tener que abrir el Log stream de Azure.
  let correoEnviado = false;
  let correoError: string | undefined;
  if (!correoConfigurado()) {
    correoError = "El servicio de correo no está configurado (faltan ACS_CONNECTION_STRING o ACS_SENDER_ADDRESS en el App Service).";
    console.error("[privacidad]", correoError);
  } else {
    try {
      await avisarSolicitudEnRevision(solicitud);
      correoEnviado = true;
    } catch (err) {
      correoError = err instanceof Error ? err.message : String(err);
      console.error("[privacidad] no se pudo enviar el correo al titular:", err);
    }
  }

  return NextResponse.json({ ...solicitud, correoEnviado, correoError }, { status: 201 });
}

const TIPO_LABEL: Record<TipoSolicitud, string> = {
  acceso: "acceso a sus datos",
  rectificacion: "rectificación de sus datos",
  cancelacion: "cancelación / eliminación de sus datos",
  oposicion: "oposición al tratamiento de sus datos",
};

async function avisarSolicitudEnRevision(s: DataSubjectRequest) {
  const tipo = TIPO_LABEL[s.tipoSolicitud];
  const fecha = new Date(s.creadoEn).toLocaleDateString("es-CL");
  const nombre = escaparHtml(s.solicitanteNombre);

  await enviarCorreo({
    para: s.solicitanteEmail,
    nombre: s.solicitanteNombre,
    asunto: "Tu solicitud de datos personales está en revisión",
    texto:
      `Hola ${s.solicitanteNombre}:\n\n` +
      `Recibimos tu solicitud de ${tipo} (${fecha}) y quedó en revisión. ` +
      `Te contactaremos por este medio cuando tengamos una respuesta.\n\n` +
      `Número de solicitud: ${s.id}\n\n` +
      `Este es un mensaje automático, por favor no respondas a este correo.`,
    html:
      `<p>Hola ${nombre}:</p>` +
      `<p>Recibimos tu solicitud de <strong>${escaparHtml(tipo)}</strong> (${fecha}) y quedó ` +
      `<strong>en revisión</strong>. Te contactaremos por este medio cuando tengamos una respuesta.</p>` +
      `<p style="color:#64748b;font-size:12px">Número de solicitud: ${s.id}<br>` +
      `Este es un mensaje automático, por favor no respondas a este correo.</p>`,
  });
}
