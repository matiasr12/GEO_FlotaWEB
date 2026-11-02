import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/rbac";
import { listarAuditoria, registrarAuditoria } from "@/lib/audit";
import { filtrarAuditoria, ROL_LABEL } from "@/lib/filtro-auditoria";
import { fechaHora, generarPdfTabla } from "@/lib/pdf-tabla";
import type { AuditLogEntry } from "@/types/audit";

function numero(valor: string | null): number | undefined {
  const n = Number(valor);
  return valor && Number.isFinite(n) ? n : undefined;
}

// GET /api/reportes/auditoria-pdf?usuario=&rol=&desdeMs=&hastaMs=
// Mismos filtros que la tabla de Auditoría.
export async function GET(req: Request) {
  const user = await obtenerSesion();
  if (!user || !tienePermiso(user.role, "auditoria:ver")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const q = new URL(req.url).searchParams;
  const usuario = q.get("usuario")?.trim() || undefined;
  const rol = q.get("rol")?.trim() || undefined;
  const desdeMs = numero(q.get("desdeMs"));
  const hastaMs = numero(q.get("hastaMs"));

  const registros = filtrarAuditoria(await listarAuditoria(), { usuario, rol, desdeMs, hastaMs });

  const filtros = [
    usuario && `Usuario: "${usuario}"`,
    rol && `Rol: ${ROL_LABEL[rol] ?? rol}`,
    desdeMs !== undefined && `Desde: ${fechaHora(new Date(desdeMs))}`,
    // hastaMs es exclusivo (inicio del día siguiente): se muestra el último ms incluido.
    hastaMs !== undefined && `Hasta: ${fechaHora(new Date(hastaMs - 1))}`,
  ].filter(Boolean) as string[];

  const generadoEn = new Date();
  const pdf = await generarPdfTabla<AuditLogEntry>({
    titulo: "Registro de auditoría",
    subtitulo: "GeoFlota · Evidencia de cumplimiento (solo inserción, no editable)",
    generadoPor: `${user.nombre} (${user.email})`,
    generadoEn,
    filtros,
    textoSinFiltros: "ninguno (últimos 500 registros)",
    resumen: [
      { etiqueta: "Registros", valor: registros.length, color: "#1e40af" },
      { etiqueta: "Usuarios distintos", valor: new Set(registros.map((r) => r.userEmail)).size, color: "#0f766e" },
    ],
    columnas: [
      { titulo: "Fecha", ancho: 130, valor: (r) => fechaHora(r.timestamp, true) },
      { titulo: "Usuario", ancho: 170, valor: (r) => r.userEmail, negrita: true },
      { titulo: "Rol", ancho: 90, valor: (r) => ROL_LABEL[r.role] ?? r.role },
      { titulo: "Acción", ancho: 150, valor: (r) => r.action },
      { titulo: "Detalle", ancho: 140, valor: (r) => r.detalle ?? "—" },
      { titulo: "IP", ancho: 90, valor: (r) => r.ip ?? "—" },
    ],
    filas: registros,
    textoVacio: "Ningún registro coincide con los filtros.",
  });

  await registrarAuditoria({
    user,
    action: "exportar_pdf_auditoria",
    detalle: `${registros.length} registros${filtros.length ? ` · ${filtros.join(" · ")}` : ""}`,
  });

  const fecha = generadoEn.toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="auditoria_${fecha}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
