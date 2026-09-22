import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/rbac";
import { reconocerAlerta } from "@/lib/alerts";
import { registrarAuditoria } from "@/lib/audit";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await obtenerSesion();
  if (!user || !tienePermiso(user.role, "alertas:gestionar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  await reconocerAlerta(id);
  await registrarAuditoria({ user, action: "reconocer_alerta", detalle: id });

  return NextResponse.json({ ok: true });
}
