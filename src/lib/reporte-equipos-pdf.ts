import "server-only";
import { fechaHora, generarPdfTabla, type ColumnaPdf } from "@/lib/pdf-tabla";
import type { Device, DeviceStatus } from "@/types/device";

// Reporte PDF de equipos (HU-26): título, filtros aplicados, resumen por
// estado, tabla con área, estado y última ubicación, y sello de tiempo de
// generación. La maquetación está en lib/pdf-tabla.ts.

export const ESTADO_LABEL: Record<DeviceStatus, string> = {
  normal: "Normal",
  alerta: "Alerta",
  sin_senal: "Sin señal",
  fuera_de_turno: "Fuera de turno",
};

const ESTADO_COLOR: Record<DeviceStatus, string> = {
  normal: "#16a34a",
  alerta: "#ca8a04",
  sin_senal: "#dc2626",
  fuera_de_turno: "#64748b",
};

// Área asignada al equipo: la que usa el filtro del reporte.
export function areaAsignada(d: Device) {
  return d.area ?? d.faena ?? "—";
}

// Lo que se muestra (igual que la tabla): el área asignada y, si el PC está
// detectado en otra, dónde está. Ej.: "E 165 (en CIO)".
export function areaTexto(d: Device) {
  const asignada = areaAsignada(d);
  return d.areaDetectada && d.areaDetectada !== d.area
    ? `${asignada} (en ${d.areaDetectada})`
    : asignada;
}

const COLUMNAS: ColumnaPdf<Device>[] = [
  { titulo: "Hostname", ancho: 120, valor: (d) => d.hostname, negrita: true },
  { titulo: "Trabajador", ancho: 150, valor: (d) => d.custodioNombre },
  { titulo: "Área", ancho: 150, valor: areaTexto },
  {
    titulo: "Estado",
    ancho: 80,
    valor: (d) => ESTADO_LABEL[d.estado],
    negrita: true,
    color: (d) => ESTADO_COLOR[d.estado],
  },
  {
    titulo: "Última ubicación",
    ancho: 130,
    valor: (d) =>
      d.ubicacion ? `${d.ubicacion.lat.toFixed(5)}, ${d.ubicacion.lng.toFixed(5)}` : "Sin ubicación",
  },
  {
    titulo: "Fecha de la ubicación",
    ancho: 140,
    valor: (d) => (d.ubicacion?.capturedAt ? fechaHora(d.ubicacion.capturedAt) : "—"),
  },
];

export function generarReporteEquiposPdf(params: {
  equipos: Device[];
  filtros: string[];
  generadoPor: string;
  generadoEn?: Date;
}): Promise<Buffer> {
  const estados = Object.keys(ESTADO_LABEL) as DeviceStatus[];
  return generarPdfTabla({
    titulo: "Reporte de equipos",
    subtitulo: "GeoFlota · Seguimiento de ubicación de equipos en terreno",
    generadoPor: params.generadoPor,
    generadoEn: params.generadoEn ?? new Date(),
    filtros: params.filtros,
    textoSinFiltros: "ninguno (todos los equipos)",
    resumen: [
      { etiqueta: "Total", valor: params.equipos.length, color: "#1e40af" },
      ...estados.map((e) => ({
        etiqueta: ESTADO_LABEL[e],
        valor: params.equipos.filter((d) => d.estado === e).length,
        color: ESTADO_COLOR[e],
      })),
    ],
    columnas: COLUMNAS,
    filas: params.equipos,
    textoVacio: "Ningún equipo coincide con los filtros.",
  });
}
