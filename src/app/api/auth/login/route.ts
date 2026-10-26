import { NextResponse } from "next/server";
import { z } from "zod";
import { autenticar } from "@/lib/auth/users";
import { crearSesion } from "@/lib/auth/session";
import { registrarAuditoria } from "@/lib/audit";
import { verificarTurnstile } from "@/lib/turnstile";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  turnstileToken: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { email, password, turnstileToken } = parsed.data;
  const ip = ipCliente(req);

  const captchaValido = await verificarTurnstile(turnstileToken, ip);
  if (!captchaValido) {
    return NextResponse.json(
      { error: "Verificación de seguridad inválida, intenta de nuevo" },
      { status: 400 }
    );
  }

  const usuario = await autenticar(email, password);

  if (!usuario) {
    return NextResponse.json(
      { error: "Correo o contraseña incorrectos" },
      { status: 401 }
    );
  }

  await crearSesion(usuario);
  await registrarAuditoria({
    user: usuario,
    action: "login",
    ip,
  });

  // Sin datos del usuario en la respuesta: el cliente no los usa y así no
  // quedan a la vista en la pestaña Network de DevTools.
  return NextResponse.json({ ok: true });
}

// El cliente puede mandar su propio X-Forwarded-For con cualquier valor;
// el front-end de Azure App Service le agrega al final la IP real (con
// puerto, "1.2.3.4:5678"). Por eso se toma solo la última entrada.
function ipCliente(req: Request): string | undefined {
  const ultima = req.headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  if (!ultima) return undefined;
  return /^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ultima) ? ultima.replace(/:\d+$/, "") : ultima;
}
