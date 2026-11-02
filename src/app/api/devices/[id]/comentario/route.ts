import { NextResponse } from "next/server";
import { z } from "zod";
import { obtenerSesion } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/rbac";
import { describirEquipo, guardarComentario } from "@/lib/device-comments";
import { citar } from "@/lib/texto-auditoria";
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
  const comentario = parsed.data.comentario.trim();
  await guardarComentario(id, comentario);
  await registrarAuditoria({
    user,
    action: "comentar_equipo",
    detalle: `${await describirEquipo(id)} · ${comentario ? citar(comentario) : "borró el comentario"}`,
  });

  return NextResponse.json({ ok: true });
}
