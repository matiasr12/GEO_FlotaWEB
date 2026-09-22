import { NextResponse } from "next/server";
import { z } from "zod";
import { obtenerSesion } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/rbac";
import { listarEquipos, crearEquipo } from "@/lib/devices";
import { registrarAuditoria } from "@/lib/audit";

export async function GET() {
  const user = await obtenerSesion();
  if (!user || !tienePermiso(user.role, "inventario:ver")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await registrarAuditoria({ user, action: "ver_inventario" });
  return NextResponse.json(await listarEquipos());
}

const inputSchema = z.object({
  hostname: z.string().min(3),
  custodioNombre: z.string().min(2),
  custodioId: z.string().min(1),
  turno: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await obtenerSesion();
  if (!user || !tienePermiso(user.role, "inventario:editar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const equipo = await crearEquipo(parsed.data);
  await registrarAuditoria({ user, action: "crear_equipo", detalle: equipo.hostname });

  return NextResponse.json(equipo, { status: 201 });
}
