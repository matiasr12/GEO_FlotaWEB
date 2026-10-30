import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth/session";

// Botón "Seguir conectado" del aviso de sesión (AvisoSesion.tsx). No hace
// falta renovar acá: el proxy ya renueva la sesión (y la cookie con la
// hora de vencimiento) en cada request autenticado. Solo confirma que la
// sesión sigue válida.
export async function POST() {
  const user = await obtenerSesion();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
