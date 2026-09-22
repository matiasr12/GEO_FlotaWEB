import { NextResponse } from "next/server";
import { z } from "zod";
import { obtenerSesion } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/rbac";
import { editarEquipo } from "@/lib/devices";
import { registrarAuditoria } from "@/lib/audit";

const inputSchema = z.object({
  hostname: z.string().min(3).optional(),
  custodioNombre: z.string().min(2).optional(),
  custodioId: z.string().min(1).optional(),
  turno: z.string().optional(),
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
  const equipo = await editarEquipo(id, parsed.data);
  if (!equipo) {
    return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
  }

  await registrarAuditoria({ user, action: "editar_equipo", detalle: equipo.hostname });
  return NextResponse.json(equipo);
}
