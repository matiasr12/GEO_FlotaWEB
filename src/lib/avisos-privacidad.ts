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

// Colores del badge de estado (mismos tonos que el panel).
const ESTADO_COLOR: Record<EstadoSolicitud, { fondo: string; texto: string; etiqueta: string }> = {
  pendiente: { fondo: "#fef3c7", texto: "#92400e", etiqueta: "En revisión" },
  en_proceso: { fondo: "#dbeafe", texto: "#1e40af", etiqueta: "En proceso" },
  resuelta: { fondo: "#dcfce7", texto: "#166534", etiqueta: "Resuelta" },
  rechazada: { fondo: "#fee2e2", texto: "#991b1b", etiqueta: "Rechazada" },
};

// URL pública del panel (para el logo del correo). Detrás de Azure el
// request llega por HTTP interno: se usan los headers del front-end.
export function origenPublico(req: Request): string {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0] ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

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

const PIE_TEXTO =
  "Este es un mensaje automático, por favor no respondas a este correo. " +
  "Recibes este correo porque se registró una solicitud sobre tus datos personales " +
  "(Ley N° 21.719 de protección de datos personales).";

// Plantilla HTML del correo. Tablas y estilos en línea a propósito: es lo
// único que Gmail y Outlook muestran de forma consistente.
function plantilla(p: {
  baseUrl: string;
  titulo: string;
  nombre: string;
  intro: string; // HTML ya escapado
  s: DataSubjectRequest;
  mensaje?: string; // texto plano del admin, se escapa acá
}): string {
  const estado = ESTADO_COLOR[p.s.estado];
  const fecha = new Date(p.s.creadoEn).toLocaleDateString("es-CL");
  const fila = (etiqueta: string, valor: string) => `
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;width:40%">${etiqueta}</td>
              <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:600">${valor}</td>
            </tr>`;

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escaparHtml(p.titulo)}</title></head>
<body style="margin:0;padding:0;background:#eef3f9;font-family:Segoe UI,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f9;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dbe5f1">
        <!-- Encabezado -->
        <tr>
          <td style="background:#0b1220;padding:20px 28px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td><img src="${p.baseUrl}/logo-web.png" alt="Caserones" height="44" style="display:block;height:44px;border:0"></td>
                <td align="right" style="color:#8ea0c0;font-size:12px">Geo<span style="color:#3b82f6;font-weight:700">Flota</span> · Privacidad</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="height:4px;background:#3b82f6;font-size:0;line-height:0">&nbsp;</td></tr>

        <!-- Cuerpo -->
        <tr>
          <td style="padding:28px">
            <h1 style="margin:0 0 6px;font-size:20px;color:#0f172a">${escaparHtml(p.titulo)}</h1>
            <p style="margin:0 0 20px;font-size:14px;color:#334155">Hola <strong>${escaparHtml(p.nombre)}</strong>,</p>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#334155">${p.intro}</p>

            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
              <tr><td style="background:${estado.fondo};color:${estado.texto};font-size:13px;font-weight:700;padding:6px 14px;border-radius:999px">● ${estado.etiqueta}</td></tr>
            </table>

            ${
              p.mensaje
                ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
              <tr><td style="background:#f1f5f9;border-left:4px solid #3b82f6;border-radius:6px;padding:14px 16px;font-size:14px;line-height:1.6;color:#0f172a;white-space:pre-line">${escaparHtml(p.mensaje)}</td></tr>
            </table>`
                : ""
            }

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${fila("Tipo de solicitud", escaparHtml(TIPO_LABEL[p.s.tipoSolicitud]))}
              ${fila("Fecha de registro", fecha)}
              ${fila("Número de solicitud", `<span style="font-family:Consolas,monospace;font-weight:400">${p.s.id}</span>`)}
            </table>
          </td>
        </tr>

        <!-- Pie -->
        <tr>
          <td style="background:#f8fafc;padding:18px 28px;border-top:1px solid #e2e8f0;font-size:11px;line-height:1.5;color:#64748b">
            ${PIE_TEXTO}<br>Caserones — SCM Minera Lumina Copper Chile
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Al registrar la solicitud.
export async function avisarSolicitudEnRevision(s: DataSubjectRequest, baseUrl: string) {
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
    html: plantilla({
      baseUrl,
      titulo: "Recibimos tu solicitud",
      nombre: s.solicitanteNombre,
      intro:
        `Registramos tu solicitud de <strong>${escaparHtml(tipo)}</strong> y ya está en revisión. ` +
        `Te contactaremos por este medio cuando tengamos una respuesta.`,
      s,
    }),
  });
}

// Botón "Avisar al titular" del detalle: estado actual + mensaje opcional
// escrito por el admin.
export async function avisarEstadoSolicitud(s: DataSubjectRequest, baseUrl: string, mensaje?: string) {
  const tipo = TIPO_LABEL[s.tipoSolicitud];
  const estado = ESTADO_LABEL[s.estado];
  const mensajeLimpio = mensaje?.trim() || undefined;

  await enviarCorreo({
    para: s.solicitanteEmail,
    nombre: s.solicitanteNombre,
    asunto: `Actualización de tu solicitud de datos personales: ${estado}`,
    texto:
      `Hola ${s.solicitanteNombre}:\n\n` +
      `Tu solicitud de ${tipo} está: ${estado.toUpperCase()}.\n\n` +
      (mensajeLimpio ? `${mensajeLimpio}\n\n` : "") +
      `Número de solicitud: ${s.id}\n\n${PIE_TEXTO}`,
    html: plantilla({
      baseUrl,
      titulo: "Actualización de tu solicitud",
      nombre: s.solicitanteNombre,
      intro: `Hay novedades sobre tu solicitud de <strong>${escaparHtml(tipo)}</strong>. Este es su estado actual:`,
      s,
      mensaje: mensajeLimpio,
    }),
  });
}
