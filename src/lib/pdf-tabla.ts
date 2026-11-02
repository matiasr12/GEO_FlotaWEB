import "server-only";
import { readFileSync } from "fs";
import path from "path";
import PDFDocument from "pdfkit";

// Plantilla común de los reportes PDF del panel (equipos, auditoría):
// encabezado con logo, sello de tiempo de generación, filtros, resumen
// opcional, tabla paginada con cabecera repetida y pie "Página X de Y".
// Helvetica (fuente estándar del PDF) ya cubre tildes y ñ.

const ZONA = "America/Santiago";
const AZUL = "#1e40af";
const TEXTO = "#0f172a";
const GRIS = "#64748b";
const BORDE = "#cbd5e1";

export function fechaHora(fecha: Date | string, conSegundos = false) {
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

export interface ColumnaPdf<T> {
  titulo: string;
  ancho: number; // pt; la suma debe dar 770 (A4 horizontal menos márgenes)
  valor: (fila: T) => string;
  negrita?: boolean;
  color?: (fila: T) => string;
}

export async function generarPdfTabla<T>(p: {
  titulo: string;
  subtitulo: string;
  generadoPor: string;
  generadoEn: Date;
  filtros: string[];
  textoSinFiltros: string;
  resumen?: { etiqueta: string; valor: number; color: string }[];
  columnas: ColumnaPdf<T>[];
  filas: T[];
  textoVacio: string;
}): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margins: { top: 36, bottom: 48, left: 36, right: 36 },
    bufferPages: true, // para numerar "Página X de Y" al final
    info: { Title: `${p.titulo} — GeoFlota`, Author: "GeoFlota", CreationDate: p.generadoEn },
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

  doc.fillColor(AZUL).font("Helvetica-Bold").fontSize(20).text(p.titulo, izq, 40);
  doc.fillColor(GRIS).font("Helvetica").fontSize(10).text(p.subtitulo, izq, doc.y + 2);

  doc.moveDown(0.8);
  doc
    .fillColor(TEXTO)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("Generado: ", { continued: true })
    .font("Helvetica")
    .text(`${fechaHora(p.generadoEn, true)} (hora de Chile) por ${p.generadoPor}`);
  doc
    .font("Helvetica-Bold")
    .text("Filtros: ", { continued: true })
    .font("Helvetica")
    .text(p.filtros.length ? p.filtros.join(" · ") : p.textoSinFiltros);

  // --- Resumen ---
  if (p.resumen?.length) {
    doc.moveDown(0.8);
    const n = p.resumen.length;
    const anchoCaja = (anchoUtil - (n - 1) * 8) / n;
    const yCajas = doc.y;
    p.resumen.forEach((c, i) => {
      const x = izq + i * (anchoCaja + 8);
      doc.roundedRect(x, yCajas, anchoCaja, 42, 6).strokeColor(BORDE).lineWidth(0.8).stroke();
      doc.fillColor(GRIS).font("Helvetica").fontSize(8).text(c.etiqueta.toUpperCase(), x + 10, yCajas + 8);
      doc.fillColor(c.color).font("Helvetica-Bold").fontSize(16).text(String(c.valor), x + 10, yCajas + 19);
    });
    doc.y = yCajas + 56;
  } else {
    doc.moveDown(1);
  }

  // --- Tabla ---
  const altoFila = 20;
  const limiteY = () => doc.page.height - doc.page.margins.bottom - altoFila;

  const dibujarCabecera = () => {
    const y = doc.y;
    doc.rect(izq, y, anchoUtil, altoFila).fill(AZUL);
    let x = izq;
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
    for (const c of p.columnas) {
      doc.text(c.titulo, x + 6, y + 6, { width: c.ancho - 12, lineBreak: false, ellipsis: true });
      x += c.ancho;
    }
    doc.y = y + altoFila;
  };

  dibujarCabecera();
  if (p.filas.length === 0) {
    doc
      .fillColor(GRIS)
      .font("Helvetica")
      .fontSize(10)
      .text(p.textoVacio, izq, doc.y + 10, { width: anchoUtil, align: "center" });
  }

  p.filas.forEach((fila, i) => {
    if (doc.y > limiteY()) {
      doc.addPage();
      doc.y = doc.page.margins.top;
      dibujarCabecera(); // la cabecera se repite en cada página
    }
    const y = doc.y;
    if (i % 2 === 1) doc.rect(izq, y, anchoUtil, altoFila).fill("#f1f5f9");
    let x = izq;
    for (const c of p.columnas) {
      doc
        .fillColor(c.color?.(fila) ?? TEXTO)
        .font(c.negrita ? "Helvetica-Bold" : "Helvetica")
        .fontSize(9)
        .text(c.valor(fila), x + 6, y + 6, { width: c.ancho - 12, lineBreak: false, ellipsis: true });
      x += c.ancho;
    }
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
  for (let i = 0; i < rango.count; i++) {
    doc.switchToPage(rango.start + i);
    // El pie va dentro del margen inferior: sin bajar el margen, pdfkit
    // agregaría una página en blanco por cada pie.
    doc.page.margins.bottom = 0;
    const yPie = doc.page.height - 30;
    doc
      .fillColor(GRIS)
      .font("Helvetica")
      .fontSize(8)
      .text(`GeoFlota · Generado el ${fechaHora(p.generadoEn, true)}`, izq, yPie, {
        width: anchoUtil / 2,
        lineBreak: false,
      })
      .text(`Página ${i + 1} de ${rango.count}`, izq + anchoUtil / 2, yPie, {
        width: anchoUtil / 2,
        align: "right",
        lineBreak: false,
      });
  }

  doc.end();
  return terminado;
}
