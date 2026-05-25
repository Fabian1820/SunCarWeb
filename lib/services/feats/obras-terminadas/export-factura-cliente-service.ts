import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { FacturaClienteObra, ObraTerminada, PagoObra } from "./obras-terminadas-service";

const EMPRESA = {
  nombre: "SunCar",
  nombreLargo: "Empresa Solar Carros",
  direccion: "Calle 24 #109 e/ 1ra y 3ra, Playa, La Habana",
};

const fmt = (v?: number | null) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
};

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  if (!y || !m || !day) {
    const p = new Date(d);
    if (isNaN(p.getTime())) return d;
    return p.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  }
  const p = new Date(y, m - 1, day);
  return p.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
};

const imageToBase64 = async (src: string): Promise<string | null> => {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((r) => {
      const reader = new FileReader();
      reader.onloadend = () => r(typeof reader.result === "string" ? reader.result : null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
};

const resolveLogo = async () => {
  for (const src of ["/logo Suncar.png", "/logo.png"]) {
    const v = await imageToBase64(src);
    if (v) return v;
  }
  return null;
};

const drawLine = (doc: jsPDF, y: number, ml: number, mr: number) => {
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(ml, y, mr, y);
};

const roundToCents = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

const getMontoAplicadoUsd = (p: PagoObra) =>
  Math.max(0, (p.monto_usd ?? 0) - (p.diferencia ?? 0));

const sortPagos = (pagos: PagoObra[]) =>
  [...pagos].sort((a, b) => {
    const toMs = (s?: string | null) => { const t = new Date(s ?? "").getTime(); return Number.isFinite(t) ? t : 0; };
    const d = toMs(a.fecha) - toMs(b.fecha);
    if (d !== 0) return d;
    return toMs(a.fecha_creacion) - toMs(b.fecha_creacion);
  });

export class ExportFacturaClienteService {
  private static renderFactura(
    doc: jsPDF,
    factura: FacturaClienteObra,
    obra: ObraTerminada,
    logo: string | null,
  ): void {
    const W = 210;
    const ml = 20;
    const mr = W - ml;

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, 297, "F");

    // ── Cabecera ───────────────────────────────────────────────────────────────
    const HEADER_H = 38;
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, W, HEADER_H, "F");

    const LOGO_SIZE = 22;
    const LOGO_Y = (HEADER_H - LOGO_SIZE) / 2;
    if (logo) doc.addImage(logo, "PNG", ml, LOGO_Y, LOGO_SIZE, LOGO_SIZE);
    const nx = logo ? ml + LOGO_SIZE + 6 : ml;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text(EMPRESA.nombre, nx, LOGO_Y + 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(EMPRESA.nombreLargo, nx, LOGO_Y + 15);
    doc.text(EMPRESA.direccion, nx, LOGO_Y + 20.5);

    let y = HEADER_H + 8;

    // ── Número de factura ──────────────────────────────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text("FACTURA CLIENTE", ml, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(17, 24, 39);
    doc.text(factura.numero_oferta || factura.nombre || "—", ml, y);

    y += 9;
    drawLine(doc, y, ml, mr);
    y += 5;

    // ── Detalles del cliente y oferta ──────────────────────────────────────────
    const detalle = (label: string, value: string) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(107, 114, 128);
      doc.text(label, ml, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(17, 24, 39);
      doc.text(value, ml + 30, y);
      y += 5.5;
    };

    detalle("Cliente",         obra.cliente_nombre || "—");
    detalle("CI",              obra.carnet_identidad || "—");
    detalle("Comercial",       obra.comercial || "—");
    detalle("Fecha factura",   fmtDate(factura.fecha_facturacion || obra.fecha_equipo_instalado));
    if (factura.nombre_completo) {
      detalle("Oferta",        factura.nombre_completo);
    }

    y += 2;
    drawLine(doc, y, ml, mr);
    y += 6;

    // ── Materiales ─────────────────────────────────────────────────────────────
    const materiales = factura.materiales ?? [];
    if (materiales.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);
      doc.text("MATERIALES", ml, y);
      y += 3;

      const rows = materiales.map((m) => [
        m.descripcion || m.material_codigo || "—",
        String(m.cantidad ?? 0),
        fmt(m.precio),
        fmt((m.cantidad ?? 0) * (m.precio ?? 0)),
      ]);

      autoTable(doc, {
        startY: y,
        head: [["Descripción", "Cant.", "Precio", "Subtotal"]],
        body: rows,
        margin: { left: ml, right: ml },
        theme: "plain",
        styles: {
          fontSize: 8.5,
          textColor: [17, 24, 39],
          cellPadding: { top: 2.5, bottom: 2.5, left: 1, right: 1 },
          lineColor: [243, 244, 246],
          lineWidth: 0.2,
        },
        headStyles: {
          fontSize: 7.5,
          fontStyle: "bold",
          textColor: [107, 114, 128],
          fillColor: false as unknown as [number, number, number],
          lineColor: [229, 231, 235],
          lineWidth: { bottom: 0.35 } as unknown as number,
        },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
          0: { cellWidth: "auto" },
          1: { cellWidth: 13, halign: "center" },
          2: { cellWidth: 26, halign: "right" },
          3: { cellWidth: 26, halign: "right", fontStyle: "bold" },
        },
      });
      y = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y) + 5;
    }

    // ── Pagos ──────────────────────────────────────────────────────────────────
    const pagos = sortPagos(factura.pagos ?? []);
    if (pagos.length > 0) {
      drawLine(doc, y, ml, mr);
      y += 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);
      doc.text("PAGOS", ml, y);
      y += 5;

      const METODO_LABELS: Record<string, string> = {
        efectivo: "Efectivo",
        transferencia_bancaria: "Transferencia",
        stripe: "Stripe",
      };

      const pagoLine = (label: string, value: string) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(107, 114, 128);
        doc.text(`${label}:`, ml + 4, y);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39);
        doc.text(value, mr - 2, y, { align: "right" });
        y += 5;
      };

      const precioFinal = factura.precio_final ?? obra.precio_final ?? 0;

      pagos.forEach((p, idx) => {
        if (idx > 0) { y += 2; drawLine(doc, y, ml + 4, mr - 4); y += 4; }

        if (pagos.length > 1) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(79, 70, 229);
          doc.text(`Pago ${idx + 1}  ·  ${fmtDate(p.fecha)}`, ml + 4, y);
          y += 5;
        }

        const moneda = p.moneda ?? "USD";
        const monto = Number(p.monto ?? 0);
        pagoLine("Monto Pagado", `${monto.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${moneda}`);

        if (moneda !== "USD" && p.tasa_cambio && Number(p.tasa_cambio) > 0) {
          pagoLine("Tasa de Cambio", Number(p.tasa_cambio).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }));
          pagoLine("Equivalente USD", fmt(monto / Number(p.tasa_cambio)));
        }

        if (p.metodo_pago) pagoLine("Forma de Pago", METODO_LABELS[p.metodo_pago] || p.metodo_pago);
        if (p.recibido_por) pagoLine("Recibido por", p.recibido_por);
        if (p.notas) pagoLine("Notas", p.notas);

        // Pendiente acumulado después de este pago
        const antes = pagos.slice(0, idx).reduce((s, pp) => s + getMontoAplicadoUsd(pp), 0);
        const conEste = antes + getMontoAplicadoUsd(p);
        const pendVal = roundToCents(Math.max(0, precioFinal - conEste));

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(107, 114, 128);
        doc.text("Pendiente tras pago:", ml + 4, y);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(pendVal > 0 ? 185 : 21, pendVal > 0 ? 28 : 128, pendVal > 0 ? 28 : 61);
        doc.text(`${pendVal.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD`, mr - 2, y, { align: "right" });
        y += 5;
      });
      y += 2;
    }

    // ── Totales ────────────────────────────────────────────────────────────────
    y += 2;
    drawLine(doc, y, ml, mr);
    y += 5;

    const totalRow = (label: string, value: string, bold = false, color: [number, number, number] = [17, 24, 39]) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(bold ? 9.5 : 8.5);
      doc.setTextColor(107, 114, 128);
      doc.text(label, ml + 2, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(bold ? 9.5 : 8.5);
      doc.setTextColor(...color);
      doc.text(value, mr, y, { align: "right" });
      y += bold ? 6.5 : 5.5;
    };

    const preciofinal = factura.precio_final ?? obra.precio_final ?? 0;
    const totalMat = factura.total_materiales ?? obra.total_materiales ?? 0;
    const totalPagado = factura.total_pagado ?? obra.total_pagado ?? 0;
    const montoPendiente = factura.monto_pendiente ?? obra.monto_pendiente ?? 0;

    totalRow("Total materiales", fmt(totalMat));
    totalRow("Total a pagar",    fmt(preciofinal));
    totalRow("Total pagado",     fmt(totalPagado), false, [21, 128, 61]);

    y += 1;
    drawLine(doc, y, ml, mr);
    y += 5;

    const pagada = montoPendiente <= 0.01;
    totalRow(
      "Pendiente",
      pagada ? "PAGADA ✓" : fmt(montoPendiente),
      true,
      pagada ? [21, 128, 61] : [185, 28, 28],
    );

    // ── Pie ────────────────────────────────────────────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(209, 213, 219);
    doc.text(`${EMPRESA.nombreLargo}  ·  ${EMPRESA.direccion}`, W / 2, 291, { align: "center" });
  }

  static async exportarPDF(factura: FacturaClienteObra, obra: ObraTerminada): Promise<void> {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const logo = await resolveLogo();
    this.renderFactura(doc, factura, obra, logo);
    const nombre = factura.numero_oferta || factura.nombre || "factura_cliente";
    doc.save(`Factura_Cliente_${nombre}.pdf`);
  }
}
