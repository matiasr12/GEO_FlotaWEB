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
  // Tolera comillas, espacios y saltos de línea que quedan al pegar el
  // valor en las Variables de entorno del App Service.
  let limpio = cs.trim().replace(/^["']|["']$/g, "").trim();
  // Si quedó algo pegado adelante (ej. "ACS_CONNECTION_STRING=endpoint=..."),
  // se descarta todo lo anterior a "endpoint=".
  const desde = limpio.toLowerCase().indexOf("endpoint=");
  if (desde > 0) limpio = limpio.slice(desde);
  const partes = Object.fromEntries(
    limpio
      .split(";")
      .map((p) => p.trim())
      .filter((p) => p.includes("="))
      .map((p) => {
        const i = p.indexOf("=");
        return [p.slice(0, i).trim().toLowerCase(), p.slice(i + 1).trim()];
      })
  );
  if (!partes.endpoint || !partes.accesskey) {
    // Sin mostrar la clave: solo qué parte falta, para saber qué se copió mal.
    const faltan = [!partes.endpoint && "endpoint=", !partes.accesskey && "accesskey="]
      .filter(Boolean)
      .join(" y ");
    throw new Error(
      `ACS_CONNECTION_STRING no tiene ${faltan}. Copia la "Connection string" (no la "Key") ` +
        `de geoflota-correo → Keys; debe empezar con endpoint=https://`
    );
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
