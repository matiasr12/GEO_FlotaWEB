import { NextResponse } from "next/server";
import { obtenerSesion, cerrarSesion } from "@/lib/auth/session";
import { registrarAuditoria } from "@/lib/audit";

export async function POST() {
  const usuario = await obtenerSesion();
  if (usuario) {
    await registrarAuditoria({ user: usuario, action: "logout" });
  }
  await cerrarSesion();
  return NextResponse.json({ ok: true });
}
