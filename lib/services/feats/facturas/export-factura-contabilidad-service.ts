import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { FacturaContabilidad } from "./factura-contabilidad-service";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

const formatImporte = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const cleanText = (value?: string | null): string => {
  const text = (value || "").toString().trim();
  return text || "-";
};

export interface FacturaContabilidadExportContext {
  ofertaNombreCompleto?: string | null;
  clienteNombre?: string | null;
  clienteDocumento?: string | null;
  clienteDireccion?: string | null;
  importe?: number | null;
  moneda?: string | null;
}

export class ExportFacturaContabilidadService {
  private static readonly EMPRESA = {
    nombre: "Empresa instaladora: MPM SolarCarro S.R.L",
    direccion:
      "Dirección: Zapata # 1453 e/ A y B, Plaza de la Revolución, La Habana",
    nit: "NIT: 50004469717",
  };

  static async generarPDF(
    factura: FacturaContabilidad,
    context?: FacturaContabilidadExportContext,
  ): Promise<void> {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });

    const margenX = 16;
    const anchoPagina = doc.internal.pageSize.getWidth();
    const margenDerecho = anchoPagina - margenX;
    let y = 20;

    const nombreOferta = cleanText(
      context?.ofertaNombreCompleto || factura.id_oferta_confeccion,
    );
    const concepto = `Instalación y montaje de ${nombreOferta}`;
    const moneda = cleanText(context?.moneda || "CUP");
    const importeValue = Number(context?.importe);
    const importe =
      Number.isFinite(importeValue) && importeValue > 0
        ? `${formatImporte(importeValue)} ${moneda}`
        : "-";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(this.EMPRESA.nombre, margenX, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const direccionEmpresa = doc.splitTextToSize(this.EMPRESA.direccion, 110);
    doc.text(direccionEmpresa, margenX, y);

    doc.setFont("helvetica", "bold");
    doc.text(`Factura No: ${cleanText(factura.numero_factura)}`, 135, 20);
    doc.text(`Fecha: ${formatDate(factura.fecha_emision)}`, 135, 25);
    doc.text(this.EMPRESA.nit, 135, 30);
    y += direccionEmpresa.length * 5 + 4;

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(margenX, y, margenDerecho, y);
    y += 7;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Cliente", margenX, y);
    y += 5;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Nombre: ${cleanText(context?.clienteNombre || factura.numero_cliente)}`,
      margenX,
      y,
    );
    y += 5;
    doc.text(
      `NIT/CI: ${cleanText(context?.clienteDocumento || factura.numero_cliente)}`,
      margenX,
      y,
    );
    y += 5;
    const clienteDireccion = doc.splitTextToSize(
      `Dirección: ${cleanText(context?.clienteDireccion)}`,
      180,
    );
    doc.text(clienteDireccion, margenX, y);
    y += clienteDireccion.length * 5 + 4;

    autoTable(doc, {
      startY: y,
      head: [["Concepto", "Importe"]],
      body: [[concepto, importe]],
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 4,
        lineColor: [180, 180, 180],
        lineWidth: 0.2,
        valign: "middle",
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: 0,
        fontStyle: "bold",
        halign: "center",
      },
      bodyStyles: {
        fillColor: [242, 242, 242],
        textColor: 0,
      },
      columnStyles: {
        0: { cellWidth: 135 },
        1: { cellWidth: 45, halign: "center", fontStyle: "bold" },
      },
      margin: { left: margenX, right: margenX },
    });

    const tablaFinalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } })
      .lastAutoTable?.finalY;
    y = (tablaFinalY || y) + 28;

    const lineWidth = 52;
    doc.setDrawColor(120, 120, 120);
    doc.line(margenX + 18, y, margenX + 18 + lineWidth, y);
    doc.line(
      margenDerecho - 18 - lineWidth,
      y,
      margenDerecho - 18,
      y,
    );

    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Firma del Cliente", margenX + 24, y);
    doc.text("Representante de la Empresa", margenDerecho - 70, y);

    const safeNumero = (factura.numero_factura || "factura")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 50);
    doc.save(`factura_emitida_${safeNumero}.pdf`);
  }
}
