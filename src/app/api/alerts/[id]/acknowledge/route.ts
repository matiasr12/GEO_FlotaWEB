import { NextResponse } from "next/server";
import { z } from "zod";
import { obtenerSesion } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/rbac";
import { reconocerAlerta } from "@/lib/alerts";
import { registrarAuditoria } from "@/lib/audit";

const bodySchema = z.object({
  comentario: z.string().max(1000).optional(),
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

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  let ok: boolean;
  try {
    ok = await reconocerAlerta(alertaId, user, parsed.data.comentario);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo reconocer la alerta" },
      { status: 400 }
    );
  }

  if (!ok) {
    return NextResponse.json(
      { error: "La alerta no existe o ya no está abierta" },
      { status: 409 }
    );
  }

  await registrarAuditoria({ user, action: "reconocer_alerta", detalle: id });
  return NextResponse.json({ ok: true });
}
