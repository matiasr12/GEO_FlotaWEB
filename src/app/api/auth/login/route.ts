import { NextResponse } from "next/server";
import { z } from "zod";
import { autenticar } from "@/lib/auth/users";
import { crearSesion } from "@/lib/auth/session";
import { registrarAuditoria } from "@/lib/audit";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { email, password } = parsed.data;
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
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ ok: true, user: usuario });
}
