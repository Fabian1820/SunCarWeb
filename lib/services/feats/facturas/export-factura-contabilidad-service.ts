import jsPDF from "jspdf";
import type { FacturaContabilidad } from "./factura-contabilidad-service";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export class ExportFacturaContabilidadService {
  static generarPDF(factura: FacturaContabilidad): void {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });

    const margenX = 18;
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Factura Emitida", margenX, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Documento de facturacion para contabilidad", margenX, y);

    y += 8;
    doc.setDrawColor(220, 220, 220);
    doc.line(margenX, y, 196, y);
    y += 8;

    const rows: Array<[string, string]> = [
      ["Numero de factura", factura.numero_factura],
      ["Fecha de emision", formatDateTime(factura.fecha_emision)],
      ["Emitida por", factura.emitida_por],
      ["ID Oferta confeccion", factura.id_oferta_confeccion],
      ["Numero de cliente", factura.numero_cliente || "-"],
      ["Fecha de creacion", formatDateTime(factura.fecha_creacion)],
      [
        "Ultima actualizacion",
        factura.fecha_actualizacion
          ? formatDateTime(factura.fecha_actualizacion)
          : "-",
      ],
    ];

    rows.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, margenX, y);
      doc.setFont("helvetica", "normal");
      const wrappedValue = doc.splitTextToSize(value || "-", 120);
      doc.text(wrappedValue, 72, y);
      y += Math.max(6, wrappedValue.length * 5);
    });

    y += 5;
    doc.setDrawColor(220, 220, 220);
    doc.line(margenX, y, 196, y);
    y += 8;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("Generado desde SunCar Web", margenX, y);

    const safeNumero = (factura.numero_factura || "factura")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 50);
    doc.save(`factura_emitida_${safeNumero}.pdf`);
  }
}
