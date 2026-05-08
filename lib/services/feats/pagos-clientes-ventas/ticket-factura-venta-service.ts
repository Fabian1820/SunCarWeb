import jsPDF from "jspdf";
import type { FacturaVentaResumen } from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";

// Mismo formato que el resto de tickets del sistema (recibo-service.ts)
const PAGE_W    = 72;
const MARGIN    = 2.6;
const NUDGE     = -0.5;
const LEFT_X    = MARGIN + NUDGE;
const RIGHT_X   = PAGE_W - MARGIN + NUDGE;
const CENTER_X  = (LEFT_X + RIGHT_X) / 2;
const TXT_W     = RIGHT_X - LEFT_X;

const fmt = (v?: number) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
};

const fmtDate = (d?: string) => {
  if (!d) return "—";
  const p = new Date(d + "T12:00:00");
  if (isNaN(p.getTime())) return d;
  return `${p.getDate()}/${p.getMonth() + 1}/${p.getFullYear()}`;
};

const dashes = (doc: jsPDF, y: number) => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text("- - - - - - - - - - - - - - - - - - - - - - - - - -", CENTER_X, y, { align: "center" });
};

export class TicketFacturaVentaService {
  static exportarTicket(factura: FacturaVentaResumen): void {
    // Altura fija A4 igual que el dashboard — la térmica corta al final del contenido
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [PAGE_W, 297],
    });

    doc.setTextColor(0, 0, 0);
    let y = 10;

    // ── Encabezado ──────────────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.text("Almacén de Ventas", CENTER_X, y, { align: "center" });
    y += 7;

    dashes(doc, y); y += 4;

    // ── Info factura ─────────────────────────────────────────────────────────────
    const infoRow = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.2);
      doc.text(label, LEFT_X, y);
      doc.setFont("helvetica", "normal");
      const val = doc.splitTextToSize(value, TXT_W - 16);
      doc.text(val, LEFT_X + 16, y);
      y += val.length * 4;
    };

    infoRow("Factura:", factura.numero_factura || "—");
    infoRow("Fecha:",   fmtDate(factura.fecha));
    if (factura.cliente) infoRow("Cliente:", factura.cliente);

    const solicitudes = factura.solicitudes_vinculadas ?? [];
    const codigos = solicitudes.map((s) => s.codigo_solicitud).filter(Boolean).join(", ");
    if (codigos) infoRow("Solicitud:", codigos);

    y += 1;
    dashes(doc, y); y += 4;

    // ── Materiales ──────────────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("PRODUCTOS", CENTER_X, y, { align: "center" });
    y += 5;

    const allMats = solicitudes.flatMap((s) =>
      Array.isArray(s.materiales) ? s.materiales : [],
    );

    for (const m of allMats) {
      if (typeof m === "string") {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        const ls = doc.splitTextToSize(m, TXT_W);
        doc.text(ls, LEFT_X, y);
        y += ls.length * 4;
        continue;
      }
      const r = m as {
        material_descripcion?: string;
        descripcion?: string;
        nombre?: string;
        cantidad?: number;
        precio?: number;
        subtotal?: number;
        precio_con_descuento?: number;
        descuento_porcentaje?: number;
        descuento_monto?: number;
      };
      const desc    = r.material_descripcion || r.descripcion || r.nombre || "Material";
      const cant    = Number(r.cantidad ?? 1);
      const precio  = Number(r.precio ?? 0);
      const descPct = Number(r.descuento_porcentaje ?? 0);
      const sub =
        r.precio_con_descuento != null
          ? Number(r.precio_con_descuento) * cant
          : r.subtotal != null
          ? Number(r.subtotal)
          : descPct > 0
          ? precio * (1 - descPct / 100) * cant
          : precio * cant;
      const descMonto = Number(
        r.descuento_monto ?? (descPct > 0 ? precio * (descPct / 100) * cant : 0),
      );

      // Línea 1: cant  descripción
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      const descLine  = `${cant}  ${desc}`;
      const descLines = doc.splitTextToSize(descLine, TXT_W);
      doc.text(descLines, LEFT_X, y);
      y += descLines.length * 4;

      // Línea 2: precio alineado derecha
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(fmt(sub), RIGHT_X, y, { align: "right" });
      y += 4.5;

      // Descuento por material si aplica
      if (descPct > 0 || descMonto > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(140, 50, 0);
        const descLabel =
          descPct > 0 && descMonto > 0
            ? `  Desc. ${descPct.toFixed(1)}% (-${fmt(descMonto)})`
            : descPct > 0
            ? `  Desc. ${descPct.toFixed(1)}%`
            : `  Desc. -${fmt(descMonto)}`;
        const dl = doc.splitTextToSize(descLabel, TXT_W);
        doc.text(dl, LEFT_X, y);
        doc.setTextColor(0, 0, 0);
        y += dl.length * 3.8;
      }

      y += 2;
    }

    dashes(doc, y); y += 5;

    // ── Totales ─────────────────────────────────────────────────────────────────
    const totalLine = (
      label: string,
      value: string,
      big = false,
      color?: [number, number, number],
    ) => {
      if (color) doc.setTextColor(...color);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(big ? 12 : 9);
      doc.text(label, LEFT_X, y);
      doc.text(value, RIGHT_X, y, { align: "right" });
      if (color) doc.setTextColor(0, 0, 0);
      y += big ? 7 : 4.5;
    };

    totalLine("Subtotal:", fmt(factura.total_precio_materiales));
    if (Number(factura.total_descuento_monto) > 0)
      totalLine("Descuento:", fmt(factura.total_descuento_monto), false, [150, 40, 0]);
    totalLine("TOTAL:", fmt(factura.total_a_pagar), true);
    if (Number(factura.total_pagado) > 0)
      totalLine("Pagado:", fmt(factura.total_pagado), true);

    y += 1;
    dashes(doc, y); y += 6;

    // ── Pie ─────────────────────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("GRACIAS POR SU VISITA", CENTER_X, y, { align: "center" });
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("THANKS FOR YOUR VISIT", CENTER_X, y, { align: "center" });

    doc.save(`Ticket_${factura.numero_factura || "sin_numero"}.pdf`);
  }
}
