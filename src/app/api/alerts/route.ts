import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/rbac";
import { listarAlertas } from "@/lib/alerts";

export async function GET() {
  const user = await obtenerSesion();
  if (!user || !tienePermiso(user.role, "alertas:ver")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const alertas = await listarAlertas();
  return NextResponse.json(alertas);
}
