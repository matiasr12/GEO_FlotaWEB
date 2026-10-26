import "server-only";
import { getEnv } from "@/lib/env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Verifica el token del widget de Cloudflare Turnstile contra su API.
// El secreto nunca sale del servidor — el cliente solo conoce la site key
// (pública, NEXT_PUBLIC_TURNSTILE_SITE_KEY).
export async function verificarTurnstile(token: string, ip?: string): Promise<boolean> {
  if (!token) return false;

  const body = new URLSearchParams({
    secret: getEnv().TURNSTILE_SECRET_KEY,
    response: token,
  });
  if (ip) body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body });
    if (!res.ok) return false;
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[turnstile] fallo al verificar el token:", err);
    return false;
  }
}
