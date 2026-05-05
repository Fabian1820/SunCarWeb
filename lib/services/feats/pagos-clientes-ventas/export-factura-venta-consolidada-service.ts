import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { FacturaVentaResumen } from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";

const EMPRESA = {
  nombre: "Empresa Solar Carros",
  direccion: "Calle 24 #109 e/ 1ra y 3ra, Playa, La Habana, Cuba",
  telefono: "+53 5 282 6474",
  email: "info@suncarsrl.com",
};

const toMoney = (value?: number) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
};

const imageToBase64 = async (src: string): Promise<string | null> => {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const resolveLogo = async (): Promise<string | null> => {
  const candidates = ["/logo Suncar.png", "/logo.png"];
  for (const src of candidates) {
    const v = await imageToBase64(src);
    if (v) return v;
  }
  return null;
};

const extractMateriales = (factura: FacturaVentaResumen) => {
  const solicitudes = Array.isArray(factura.solicitudes_vinculadas)
    ? factura.solicitudes_vinculadas
    : [];
  const rows: string[][] = [];
  for (const s of solicitudes) {
    const mats = Array.isArray(s.materiales) ? s.materiales : [];
    for (const m of mats) {
      if (typeof m === "string") {
        rows.push([m, "—", "—", "—"]);
        continue;
      }
      if (!m || typeof m !== "object") continue;
      const row = m as {
        material_descripcion?: string;
        descripcion?: string;
        nombre?: string;
        cantidad?: number;
        precio?: number;
        subtotal?: number;
      };
      const descripcion = row.material_descripcion || row.descripcion || row.nombre || "Material";
      const cantidad = Number(row.cantidad || 0);
      const precio = Number(row.precio || 0);
      const subtotal = Number(row.subtotal || cantidad * precio || 0);
      rows.push([descripcion, String(cantidad || 0), toMoney(precio), toMoney(subtotal)]);
    }
  }
  return rows;
};

export class ExportFacturaVentaConsolidadaService {
  static async exportarPDF(factura: FacturaVentaResumen): Promise<void> {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const logo = await resolveLogo();

    const margin = 14;
    let y = 14;

    // Fondo general muy claro para un look sobrio
    doc.setFillColor(247, 248, 250);
    doc.rect(0, 0, 210, 297, "F");

    // Tarjeta principal
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(225, 228, 232);
    doc.roundedRect(10, 10, 190, 277, 1.5, 1.5, "FD");

    if (logo) {
      doc.addImage(logo, "PNG", margin, y - 2, 20, 20);
    }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 68, 77);
    doc.setFontSize(14);
    doc.text(EMPRESA.nombre.toUpperCase(), logo ? margin + 24 : margin, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(105, 114, 123);
    doc.setFontSize(9);
    doc.text(EMPRESA.direccion, logo ? margin + 24 : margin, y + 9);
    doc.text(`Tel: ${EMPRESA.telefono} | Email: ${EMPRESA.email}`, logo ? margin + 24 : margin, y + 14);

    y += 24;
    doc.setDrawColor(220, 224, 229);
    doc.line(margin, y, 196, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 68, 77);
    doc.setFontSize(12);
    doc.text("FACTURA DE VENTA", margin, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(78, 86, 94);
    doc.setFontSize(10);
    doc.text(`Número: ${factura.numero_factura || "—"}`, margin, y);
    doc.text(`Fecha: ${factura.fecha || "—"}`, 120, y);
    y += 6;
    doc.text(`Cliente: ${factura.cliente || "—"}`, margin, y);
    doc.text(`Emitida por: ${factura.emitida_por || "—"}`, 120, y);
    y += 6;
    const codigos = Array.isArray(factura.solicitudes_vinculadas)
      ? factura.solicitudes_vinculadas
          .map((s) => s.codigo_solicitud)
          .filter(Boolean)
          .join(", ")
      : "";
    doc.text(
      `Solicitudes: ${codigos || "—"}`,
      margin,
      y,
    );
    y += 8;

    const materiales = extractMateriales(factura);
    if (materiales.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Material", "Cant.", "Precio", "Subtotal"]],
        body: materiales,
        theme: "grid",
        styles: {
          fontSize: 9,
          textColor: [45, 52, 58],
          lineColor: [224, 228, 232],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [244, 246, 248],
          textColor: [88, 97, 106],
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [252, 252, 253] },
      });
      y = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || y) + 6;
    }

    const pagosBody = Array.isArray(factura.pagos)
      ? factura.pagos.map((p) => [
          p.fecha || "—",
          `${toMoney(p.monto)} ${p.moneda || "USD"}`,
          toMoney(p.monto_usd),
        ])
      : [];

    if (pagosBody.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Fecha pago", "Monto", "USD"]],
        body: pagosBody,
        theme: "grid",
        styles: {
          fontSize: 9,
          textColor: [45, 52, 58],
          lineColor: [224, 228, 232],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [244, 246, 248],
          textColor: [88, 97, 106],
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [252, 252, 253] },
      });
      y = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || y) + 6;
    }

    // Bloque de totales sobrio
    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(226, 230, 234);
    doc.roundedRect(120, y - 2, 76, 28, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setTextColor(64, 72, 80);
    doc.setFontSize(10);
    doc.text(`Total a pagar:`, 124, y + 4);
    doc.text(`$${toMoney(factura.total_a_pagar)}`, 192, y + 4, { align: "right" });
    y += 5;
    doc.text(`Descuento:`, 124, y + 4);
    doc.text(`$${toMoney(factura.total_descuento_monto)}`, 192, y + 4, { align: "right" });
    y += 5;
    doc.text(`Total pagado:`, 124, y + 4);
    doc.text(`$${toMoney(factura.total_pagado)}`, 192, y + 4, { align: "right" });
    y += 5;
    doc.setTextColor(80, 40, 40);
    doc.text(`Monto pendiente:`, 124, y + 4);
    doc.text(`$${toMoney(factura.monto_pendiente)}`, 192, y + 4, { align: "right" });

    // Pie de documento
    doc.setTextColor(125, 132, 140);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Gracias por hacer negocios con nosotros.", 105, 279, { align: "center" });
    doc.text(`${EMPRESA.nombre} | ${EMPRESA.telefono} | ${EMPRESA.email}`, 105, 284, { align: "center" });

    const filename = `Factura_${factura.numero_factura || "sin_numero"}.pdf`;
    doc.save(filename);
  }
}
