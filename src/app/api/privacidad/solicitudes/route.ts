import { NextResponse } from "next/server";
import { z } from "zod";
import { obtenerSesion } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/rbac";
import { crearSolicitud, listarSolicitudes } from "@/lib/data-subject-requests";
import { registrarAuditoria } from "@/lib/audit";

export async function GET() {
  const user = await obtenerSesion();
  if (!user || !tienePermiso(user.role, "privacidad:gestionar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  return NextResponse.json(await listarSolicitudes());
}

const inputSchema = z.object({
  solicitanteNombre: z.string().min(2),
  solicitanteEmail: z.string().email(),
  tipoSolicitud: z.enum(["acceso", "rectificacion", "cancelacion", "oposicion"]),
  detalle: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await obtenerSesion();
  if (!user || !tienePermiso(user.role, "privacidad:gestionar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const solicitud = await crearSolicitud(parsed.data);
  await registrarAuditoria({
    user,
    action: "solicitud_titular_datos",
    detalle: `${solicitud.tipoSolicitud} · ${solicitud.solicitanteEmail}`,
  });

  return NextResponse.json(solicitud, { status: 201 });
}
