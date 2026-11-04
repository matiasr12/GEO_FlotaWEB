import { NextResponse } from "next/server";
import { respuestaErrorReporte } from "@/lib/error-reporte";
import { obtenerSesion } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/rbac";
import { listarEquipos } from "@/lib/devices";
import { registrarAuditoria } from "@/lib/audit";
import {
  areaAsignada,
  ESTADO_LABEL,
  generarReporteEquiposPdf,
} from "@/lib/reporte-equipos-pdf";
import type { DeviceStatus } from "@/types/device";

// Sin tildes ni mayúsculas, igual que los filtros de la tabla de equipos.
function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// GET /api/reportes/equipos-pdf?hostname=&trabajador=&area=&estado=
// Mismos filtros que la tabla de equipos, para que el PDF muestre lo que
// se está viendo en pantalla.
async function generar(req: Request) {
  const user = await obtenerSesion();
  if (!user || !tienePermiso(user.role, "reportes:ver")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const q = new URL(req.url).searchParams;
  const hostname = q.get("hostname")?.trim() ?? "";
  const trabajador = q.get("trabajador")?.trim() ?? "";
  const area = q.get("area")?.trim() ?? "";
  const estadoParam = q.get("estado") ?? "";
  const estado = estadoParam in ESTADO_LABEL ? (estadoParam as DeviceStatus) : null;

  const h = normalizar(hostname);
  const t = normalizar(trabajador);
  const equipos = (await listarEquipos())
    .filter(
      (d) =>
        (!h || normalizar(d.hostname).includes(h)) &&
        (!t || normalizar(d.custodioNombre).includes(t)) &&
        (!area || areaAsignada(d) === area) &&
        (!estado || d.estado === estado)
    )
    .sort((a, b) => a.hostname.localeCompare(b.hostname, "es"));

  const filtros = [
    estado && `Estado: ${ESTADO_LABEL[estado]}`,
    area && `Área: ${area}`,
    trabajador && `Trabajador: "${trabajador}"`,
    hostname && `Hostname: "${hostname}"`,
  ].filter(Boolean) as string[];

  const generadoEn = new Date();
  const pdf = await generarReporteEquiposPdf({
    equipos,
    filtros,
    generadoPor: `${user.nombre} (${user.email})`,
    generadoEn,
  });

  await registrarAuditoria({
    user,
    action: "exportar_pdf_equipos",
    detalle: `${equipos.length} equipos${filtros.length ? ` · ${filtros.join(" · ")}` : ""}`,
  });

  const fecha = generadoEn.toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte_equipos_${fecha}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: Request) {
  try {
    return await generar(req);
  } catch (err) {
    return respuestaErrorReporte("el PDF de equipos", err);
  }
}
