import jsPDF from "jspdf";
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
  clienteTelefono?: string | null;
  clienteTipoPersona?: string | null;
  clienteNit?: string | null;
  clienteCiRepresentante?: string | null;
  importe?: number | null;
  precioFinalUsd?: number | null;
  moneda?: string | null;
  tasaCambioUsdCup?: number | null;
  fechaTasa?: string | null;
}

export class ExportFacturaContabilidadService {
  private static readonly EMPRESA = {
    nombre: "MPM Solar Carro",
    direccion: "Calle 24 #109 e/ 1ra y 3ra, Playa La Habana, Cuba",
    telefono: "+53 63962417",
    nit: "50004469717",
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
    let y = 16;

    const nombreOferta = cleanText(
      context?.ofertaNombreCompleto || factura.id_oferta_confeccion,
    );
    const tipoPersona = (context?.clienteTipoPersona || "").trim().toLowerCase();
    const isJuridica = tipoPersona === "juridica" || tipoPersona === "jurídica";
    const concepto = isJuridica
      ? `Servicio de instalación y montaje de ${nombreOferta}`
      : nombreOferta;
    const moneda = cleanText(context?.moneda || "CUP");
    const importeValue = Number(context?.importe);
    const importe =
      Number.isFinite(importeValue) && importeValue > 0
        ? `${formatImporte(importeValue)} ${moneda}`
        : "-";
    const documentoPrincipal = isJuridica
      ? cleanText(context?.clienteNit || context?.clienteDocumento)
      : cleanText(context?.clienteDocumento);
    const etiquetaDocumento = isJuridica ? "NIT" : "CI";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("FACTURA", anchoPagina / 2, y, { align: "center" });
    y += 6;

    // Esquina izquierda: datos de empresa
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(this.EMPRESA.nombre, margenX, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const direccionEmpresa = doc.splitTextToSize(this.EMPRESA.direccion, 110);
    doc.text(direccionEmpresa, margenX, y);
    y += direccionEmpresa.length * 4 + 1;
    doc.text(`Tel: ${this.EMPRESA.telefono}`, margenX, y);

    // Esquina derecha: datos de factura
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const rightX = 136;
    let yRight = 22;
    doc.text(`Factura No: ${cleanText(factura.numero_factura)}`, rightX, yRight);
    yRight += 4;
    doc.text(`Fecha: ${formatDate(factura.fecha_emision)}`, rightX, yRight);
    yRight += 4;
    doc.text(`NIT Solar Carros: ${this.EMPRESA.nit}`, rightX, yRight);

    y = Math.max(y + 3, yRight + 6);

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
      `${etiquetaDocumento}: ${documentoPrincipal}`,
      margenX,
      y,
    );
    y += 5;
    doc.text(
      `Teléfono: ${cleanText(context?.clienteTelefono)}`,
      margenX,
      y,
    );
    y += 5;
    const clienteDireccion = doc.splitTextToSize(
      `Dirección: ${cleanText(context?.clienteDireccion)}`,
      180,
    );
    doc.text(clienteDireccion, margenX, y);
    y += clienteDireccion.length * 5 + 6;

    // Bloque de concepto e importe (estilo comprobante)
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margenX, y, margenDerecho, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Concepto:", margenX, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    const lineasConcepto = doc.splitTextToSize(concepto, margenDerecho - margenX);
    doc.text(lineasConcepto, margenX, y);
    y += lineasConcepto.length * 4 + 4;

    doc.setDrawColor(200, 200, 200);
    doc.line(margenX, y, margenDerecho, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text("Importe (CUP):", margenX, y);
    doc.text(importe, margenDerecho, y, { align: "right" });
    y += 5;
    doc.setFont("helvetica", "normal");
    y += 14;

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
