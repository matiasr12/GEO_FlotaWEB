import { NextResponse } from "next/server";
import { z } from "zod";
import { obtenerSesion } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/rbac";
import { comentarAlerta } from "@/lib/alerts";
import { registrarAuditoria } from "@/lib/audit";

const bodySchema = z.object({
  comentario: z.string().min(1).max(1000),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await obtenerSesion();
  if (!user || !tienePermiso(user.role, "alertas:gestionar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const alertaId = Number(id);
  if (!Number.isInteger(alertaId)) {
    return NextResponse.json({ error: "Id de alerta inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "El comentario no puede estar vacío" }, { status: 400 });
  }

  let ok: boolean;
  try {
    ok = await comentarAlerta(alertaId, user, parsed.data.comentario);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo guardar el comentario" },
      { status: 400 }
    );
  }

  if (!ok) {
    return NextResponse.json({ error: "La alerta no existe" }, { status: 404 });
  }

  await registrarAuditoria({ user, action: "comentar_alerta", detalle: id });
  return NextResponse.json({ ok: true });
}
