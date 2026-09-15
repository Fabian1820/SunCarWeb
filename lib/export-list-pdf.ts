import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ExportCellValue, ExportOptions } from "@/lib/export-service";

const C = {
  ink: [1, 41, 40] as [number, number, number],
  verdeClaro: [238, 245, 240] as [number, number, number],
  gris: [107, 121, 114] as [number, number, number],
  blanco: [255, 255, 255] as [number, number, number],
};

async function cargarLogo(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("No se pudo leer el logo"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Los arrays (valores apilados en Excel) van uno por línea dentro de la celda. */
function celda(value: ExportCellValue | undefined): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join("\n");
  return String(value);
}

/**
 * PDF de un listado genérico: cabecera con título y subtítulo, y una tabla con
 * las columnas recibidas. `exportToPDF` no sirve para esto: es la plantilla de
 * ofertas e ignora `columns`.
 */
export async function exportListToPDF(options: ExportOptions): Promise<void> {
  const { title, subtitle, filename, columns, data, logoUrl } = options;

  const doc = new jsPDF({
    orientation: columns.length > 6 ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();
  const altoCabecera = 26;

  doc.setFillColor(...C.ink);
  doc.rect(0, 0, anchoPagina, altoCabecera, "F");

  const logo = logoUrl ? await cargarLogo(logoUrl) : null;
  if (logo) {
    try {
      doc.addImage(logo, "PNG", anchoPagina - 14 - 18, 4, 18, 18);
    } catch {
      // Sin logo el PDF sigue siendo válido.
    }
  }

  doc.setTextColor(...C.blanco);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 14, 12);
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(subtitle, anchoPagina - 14 - 40), 14, 19);
  }

  // Reparte el ancho útil según el `width` de cada columna (el de Excel).
  const anchoUtil = anchoPagina - 28;
  const pesoTotal = columns.reduce((total, col) => total + (col.width || 15), 0);
  const columnStyles = Object.fromEntries(
    columns.map((col, i) => [i, { cellWidth: ((col.width || 15) / pesoTotal) * anchoUtil }]),
  );

  autoTable(doc, {
    startY: altoCabecera + 6,
    margin: { left: 14, right: 14, bottom: 14 },
    head: [columns.map((col) => col.header)],
    body: data.map((row) => columns.map((col) => celda(row[col.key]))),
    styles: { fontSize: 8.5, textColor: C.ink, cellPadding: 2, valign: "top" },
    headStyles: { fillColor: C.verdeClaro, textColor: C.ink, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 252, 251] },
    columnStyles,
  });

  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.gris);
    doc.text(`Página ${i} de ${paginas}`, anchoPagina - 14, altoPagina - 6, { align: "right" });
  }

  doc.save(`${filename}.pdf`);
}
