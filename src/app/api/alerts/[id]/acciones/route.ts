import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/rbac";
import { listarAcciones } from "@/lib/alerts";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await obtenerSesion();
  if (!user || !tienePermiso(user.role, "alertas:ver")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const alertaId = Number(id);
  if (!Number.isInteger(alertaId)) {
    return NextResponse.json({ error: "Id de alerta inválido" }, { status: 400 });
  }

  const acciones = await listarAcciones(alertaId);
  return NextResponse.json(acciones);
}
