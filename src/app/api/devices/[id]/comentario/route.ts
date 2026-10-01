import { NextResponse } from "next/server";
import { z } from "zod";
import { obtenerSesion } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/rbac";
import { guardarComentario } from "@/lib/device-comments";
import { registrarAuditoria } from "@/lib/audit";

const inputSchema = z.object({
  comentario: z.string().max(500),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await obtenerSesion();
  if (!user || !tienePermiso(user.role, "inventario:editar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { id } = await params;
  await guardarComentario(id, parsed.data.comentario.trim(), user);
  await registrarAuditoria({ user, action: "comentar_equipo", detalle: id });

  return NextResponse.json({ ok: true });
}
