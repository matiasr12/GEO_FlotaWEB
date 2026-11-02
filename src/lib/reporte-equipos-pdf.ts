import "server-only";
import { readFileSync } from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import type { Device, DeviceStatus } from "@/types/device";

// Reporte PDF de equipos (HU-26): título, filtros aplicados, resumen por
// estado, tabla con área, estado y última ubicación, y sello de tiempo de
// generación. Helvetica (fuente estándar del PDF) ya cubre tildes y ñ.

const ZONA = "America/Santiago";

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

const AZUL = "#1e40af";
const TEXTO = "#0f172a";
const GRIS = "#64748b";
const BORDE = "#cbd5e1";

export function areaTexto(d: Device) {
  return d.areaDetectada ?? d.area ?? d.faena ?? "—";
}

function fechaHora(fecha: Date | string, conSegundos = false) {
  return new Date(fecha).toLocaleString("es-CL", {
    timeZone: ZONA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(conSegundos ? { second: "2-digit" } : {}),
  });
}

// Columnas de la tabla (A4 horizontal: 842 x 595 pt, márgenes de 36).
const COLUMNAS: { titulo: string; ancho: number; valor: (d: Device) => string }[] = [
  { titulo: "Hostname", ancho: 120, valor: (d) => d.hostname },
  { titulo: "Trabajador", ancho: 150, valor: (d) => d.custodioNombre },
  { titulo: "Área", ancho: 150, valor: areaTexto },
  { titulo: "Estado", ancho: 80, valor: (d) => ESTADO_LABEL[d.estado] },
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

export async function generarReporteEquiposPdf(params: {
  equipos: Device[];
  filtros: string[]; // descripción legible de los filtros aplicados
  generadoPor: string;
  generadoEn?: Date;
}): Promise<Buffer> {
  const generadoEn = params.generadoEn ?? new Date();
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margins: { top: 36, bottom: 48, left: 36, right: 36 },
    bufferPages: true, // para numerar "Página X de Y" al final
    info: {
      Title: "Reporte de equipos — GeoFlota",
      Author: "GeoFlota",
      Subject: "Equipos con su área, estado y última ubicación",
      CreationDate: generadoEn,
    },
  });

  const partes: Buffer[] = [];
  doc.on("data", (c: Buffer) => partes.push(c));
  const terminado = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);
  });

  const izq = doc.page.margins.left;
  const anchoUtil = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // --- Encabezado ---
  try {
    const logo = readFileSync(path.join(process.cwd(), "public", "logo-web-claro.png"));
    doc.image(logo, doc.page.width - doc.page.margins.right - 110, 24, { width: 110 });
  } catch {
    // Sin logo el reporte sigue siendo válido.
  }

  doc.fillColor(AZUL).font("Helvetica-Bold").fontSize(20).text("Reporte de equipos", izq, 40);
  doc
    .fillColor(GRIS)
    .font("Helvetica")
    .fontSize(10)
    .text("GeoFlota · Seguimiento de ubicación de equipos en terreno", izq, doc.y + 2);

  doc.moveDown(0.8);
  doc
    .fillColor(TEXTO)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("Generado: ", { continued: true })
    .font("Helvetica")
    .text(`${fechaHora(generadoEn, true)} (hora de Chile) por ${params.generadoPor}`);
  doc
    .font("Helvetica-Bold")
    .text("Filtros: ", { continued: true })
    .font("Helvetica")
    .text(params.filtros.length ? params.filtros.join(" · ") : "ninguno (todos los equipos)");

  // --- Resumen por estado ---
  doc.moveDown(0.8);
  const conteo = (Object.keys(ESTADO_LABEL) as DeviceStatus[]).map((e) => ({
    estado: e,
    n: params.equipos.filter((d) => d.estado === e).length,
  }));
  const anchoCaja = (anchoUtil - 4 * 8) / 5;
  const yCajas = doc.y;
  [{ etiqueta: "Total", n: params.equipos.length, color: AZUL }]
    .concat(conteo.map((c) => ({ etiqueta: ESTADO_LABEL[c.estado], n: c.n, color: ESTADO_COLOR[c.estado] })))
    .forEach((c, i) => {
      const x = izq + i * (anchoCaja + 8);
      doc.roundedRect(x, yCajas, anchoCaja, 42, 6).strokeColor(BORDE).lineWidth(0.8).stroke();
      doc.fillColor(GRIS).font("Helvetica").fontSize(8).text(c.etiqueta.toUpperCase(), x + 10, yCajas + 8);
      doc.fillColor(c.color).font("Helvetica-Bold").fontSize(16).text(String(c.n), x + 10, yCajas + 19);
    });
  doc.y = yCajas + 56;

  // --- Tabla ---
  const altoFila = 20;
  const limiteY = () => doc.page.height - doc.page.margins.bottom - altoFila;

  const dibujarCabecera = () => {
    const y = doc.y;
    doc.rect(izq, y, anchoUtil, altoFila).fill(AZUL);
    let x = izq;
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
    for (const c of COLUMNAS) {
      doc.text(c.titulo, x + 6, y + 6, { width: c.ancho - 12, lineBreak: false, ellipsis: true });
      x += c.ancho;
    }
    doc.y = y + altoFila;
  };

  dibujarCabecera();
  if (params.equipos.length === 0) {
    doc
      .fillColor(GRIS)
      .font("Helvetica")
      .fontSize(10)
      .text("Ningún equipo coincide con los filtros.", izq, doc.y + 10, { width: anchoUtil, align: "center" });
  }

  params.equipos.forEach((d, i) => {
    if (doc.y > limiteY()) {
      doc.addPage();
      doc.y = doc.page.margins.top;
      dibujarCabecera(); // la cabecera se repite en cada página
    }
    const y = doc.y;
    if (i % 2 === 1) doc.rect(izq, y, anchoUtil, altoFila).fill("#f1f5f9");
    let x = izq;
    COLUMNAS.forEach((c, j) => {
      const esEstado = j === 3;
      doc
        .fillColor(esEstado ? ESTADO_COLOR[d.estado] : TEXTO)
        .font(esEstado || j === 0 ? "Helvetica-Bold" : "Helvetica")
        .fontSize(9)
        .text(c.valor(d), x + 6, y + 6, { width: c.ancho - 12, lineBreak: false, ellipsis: true });
      x += c.ancho;
    });
    doc
      .moveTo(izq, y + altoFila)
      .lineTo(izq + anchoUtil, y + altoFila)
      .strokeColor(BORDE)
      .lineWidth(0.5)
      .stroke();
    doc.y = y + altoFila;
  });

  // --- Pie con número de página y sello de tiempo en todas las páginas ---
  const rango = doc.bufferedPageRange();
  for (let p = 0; p < rango.count; p++) {
    doc.switchToPage(rango.start + p);
    // El pie va dentro del margen inferior: sin bajar el margen, pdfkit
    // agregaría una página en blanco por cada pie.
    doc.page.margins.bottom = 0;
    const yPie = doc.page.height - 30;
    doc
      .fillColor(GRIS)
      .font("Helvetica")
      .fontSize(8)
      .text(`GeoFlota · Generado el ${fechaHora(generadoEn, true)}`, izq, yPie, {
        width: anchoUtil / 2,
        lineBreak: false,
      })
      .text(`Página ${p + 1} de ${rango.count}`, izq + anchoUtil / 2, yPie, {
        width: anchoUtil / 2,
        align: "right",
        lineBreak: false,
      });
  }

  doc.end();
  return terminado;
}
