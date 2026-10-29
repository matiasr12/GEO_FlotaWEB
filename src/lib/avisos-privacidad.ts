import "server-only";
import { correoConfigurado, enviarCorreo, escaparHtml } from "@/lib/email";
import type {
  DataSubjectRequest,
  EstadoSolicitud,
  TipoSolicitud,
} from "@/lib/data-subject-requests";

// Correos al titular de una solicitud de datos personales.

const TIPO_LABEL: Record<TipoSolicitud, string> = {
  acceso: "acceso a sus datos",
  rectificacion: "rectificación de sus datos",
  cancelacion: "cancelación / eliminación de sus datos",
  oposicion: "oposición al tratamiento de sus datos",
};

export const ESTADO_LABEL: Record<EstadoSolicitud, string> = {
  pendiente: "recibida, en revisión",
  en_proceso: "en proceso",
  resuelta: "resuelta",
  rechazada: "rechazada",
};

// Envía un aviso sin lanzar: devuelve si salió y, si no, el motivo. El
// motivo se muestra en el panel (solo admins ven Privacidad) para saber
// por qué no salió sin tener que abrir el Log stream de Azure.
export async function intentarAviso(
  enviar: () => Promise<void>
): Promise<{ correoEnviado: boolean; correoError?: string }> {
  if (!correoConfigurado()) {
    const correoError =
      "El servicio de correo no está configurado (faltan ACS_CONNECTION_STRING o ACS_SENDER_ADDRESS en el App Service).";
    console.error("[privacidad]", correoError);
    return { correoEnviado: false, correoError };
  }
  try {
    await enviar();
    return { correoEnviado: true };
  } catch (err) {
    console.error("[privacidad] no se pudo enviar el correo al titular:", err);
    return { correoEnviado: false, correoError: err instanceof Error ? err.message : String(err) };
  }
}

const PIE_TEXTO ="Este es un mensaje automático, por favor no respondas a este correo.";
const PIE_HTML = `<p style="color:#64748b;font-size:12px">${PIE_TEXTO}</p>`;

// Al registrar la solicitud.
export async function avisarSolicitudEnRevision(s: DataSubjectRequest) {
  const tipo = TIPO_LABEL[s.tipoSolicitud];
  const fecha = new Date(s.creadoEn).toLocaleDateString("es-CL");

  await enviarCorreo({
    para: s.solicitanteEmail,
    nombre: s.solicitanteNombre,
    asunto: "Tu solicitud de datos personales está en revisión",
    texto:
      `Hola ${s.solicitanteNombre}:\n\n` +
      `Recibimos tu solicitud de ${tipo} (${fecha}) y quedó en revisión. ` +
      `Te contactaremos por este medio cuando tengamos una respuesta.\n\n` +
      `Número de solicitud: ${s.id}\n\n${PIE_TEXTO}`,
    html:
      `<p>Hola ${escaparHtml(s.solicitanteNombre)}:</p>` +
      `<p>Recibimos tu solicitud de <strong>${escaparHtml(tipo)}</strong> (${fecha}) y quedó ` +
      `<strong>en revisión</strong>. Te contactaremos por este medio cuando tengamos una respuesta.</p>` +
      `<p style="color:#64748b;font-size:12px">Número de solicitud: ${s.id}</p>${PIE_HTML}`,
  });
}

// Botón "Avisar al titular" del detalle: estado actual + mensaje opcional
// escrito por el admin.
export async function avisarEstadoSolicitud(s: DataSubjectRequest, mensaje?: string) {
  const tipo = TIPO_LABEL[s.tipoSolicitud];
  const estado = ESTADO_LABEL[s.estado];
  const mensajeLimpio = mensaje?.trim();

  await enviarCorreo({
    para: s.solicitanteEmail,
    nombre: s.solicitanteNombre,
    asunto: `Actualización de tu solicitud de datos personales: ${estado}`,
    texto:
      `Hola ${s.solicitanteNombre}:\n\n` +
      `Tu solicitud de ${tipo} está: ${estado.toUpperCase()}.\n\n` +
      (mensajeLimpio ? `${mensajeLimpio}\n\n` : "") +
      `Número de solicitud: ${s.id}\n\n${PIE_TEXTO}`,
    html:
      `<p>Hola ${escaparHtml(s.solicitanteNombre)}:</p>` +
      `<p>Tu solicitud de <strong>${escaparHtml(tipo)}</strong> está: ` +
      `<strong>${escaparHtml(estado)}</strong>.</p>` +
      (mensajeLimpio
        ? `<p style="white-space:pre-line">${escaparHtml(mensajeLimpio)}</p>`
        : "") +
      `<p style="color:#64748b;font-size:12px">Número de solicitud: ${s.id}</p>${PIE_HTML}`,
  });
}
