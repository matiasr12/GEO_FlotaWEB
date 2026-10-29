import "server-only";
import { createHash, createHmac } from "crypto";
import { getEnv } from "@/lib/env";

// Envío de correos con Azure Communication Services Email, llamando a su
// API REST firmada con HMAC (sin instalar @azure/communication-email).
// Referencia: "Sign an HTTP request with HMAC" en la documentación de ACS.

const API_VERSION = "2023-03-31";

export function correoConfigurado(): boolean {
  const env = getEnv();
  return Boolean(env.ACS_CONNECTION_STRING && env.ACS_SENDER_ADDRESS);
}

// "endpoint=https://x.communication.azure.com/;accesskey=..." → partes
function leerConnectionString(cs: string) {
  const partes = Object.fromEntries(
    cs.split(";").filter(Boolean).map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).toLowerCase(), p.slice(i + 1)];
    })
  );
  if (!partes.endpoint || !partes.accesskey) {
    throw new Error("ACS_CONNECTION_STRING no tiene endpoint y accesskey");
  }
  return { endpoint: new URL(partes.endpoint), accessKey: partes.accesskey };
}

export async function enviarCorreo(params: {
  para: string;
  nombre?: string;
  asunto: string;
  texto: string;
  html: string;
}): Promise<void> {
  const env = getEnv();
  if (!env.ACS_CONNECTION_STRING || !env.ACS_SENDER_ADDRESS) {
    throw new Error("Azure Communication Services no está configurado");
  }

  const { endpoint, accessKey } = leerConnectionString(env.ACS_CONNECTION_STRING);
  const rutaYQuery = `/emails:send?api-version=${API_VERSION}`;
  const cuerpo = JSON.stringify({
    senderAddress: env.ACS_SENDER_ADDRESS,
    content: { subject: params.asunto, plainText: params.texto, html: params.html },
    recipients: { to: [{ address: params.para, displayName: params.nombre }] },
  });

  const fecha = new Date().toUTCString();
  const hashCuerpo = createHash("sha256").update(cuerpo).digest("base64");
  const firma = createHmac("sha256", Buffer.from(accessKey, "base64"))
    .update(`POST\n${rutaYQuery}\n${fecha};${endpoint.host};${hashCuerpo}`)
    .digest("base64");

  const res = await fetch(new URL(rutaYQuery, endpoint), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ms-date": fecha,
      "x-ms-content-sha256": hashCuerpo,
      Authorization: `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${firma}`,
    },
    body: cuerpo,
    signal: AbortSignal.timeout(15_000),
  });

  // 202 Accepted: ACS encoló el correo.
  if (res.status !== 202) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`ACS respondió ${res.status}: ${detalle.slice(0, 300)}`);
  }
}

export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
