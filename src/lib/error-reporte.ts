import "server-only";
import { NextResponse } from "next/server";

// Si un reporte PDF falla, se responde con el motivo (texto plano) en vez
// de la página genérica "HTTP ERROR 500" de Azure, para poder diagnosticar
// sin abrir el Log stream. Solo llegan acá usuarios ya autorizados.
export function respuestaErrorReporte(nombre: string, err: unknown) {
  console.error(`[reportes] fallo al generar ${nombre}:`, err);
  const motivo = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return new NextResponse(`No se pudo generar ${nombre}.\n\nMotivo: ${motivo}\n`, {
    status: 500,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
