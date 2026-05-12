import jsPDF from "jspdf";
import type { FacturaVentaResumen } from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";

// Formato 58 mm térmico — área imprimible real medida ≈ 50 mm.
// El PDF se hace de 48 mm para que el driver Epson 9-Pin no tenga que
// escalar (lo que apelmazaría el texto). Márgenes mínimos, todo en negro
// y tipografía generosa para que se vea limpio a baja resolución.
const PAGE_W   = 48;
const MARGIN   = 1.5;
const LEFT_X   = MARGIN;
const RIGHT_X  = PAGE_W - MARGIN;
const CENTER_X = (LEFT_X + RIGHT_X) / 2;
const TXT_W    = RIGHT_X - LEFT_X;

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

const sep = (doc: jsPDF, y: number) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  const dash = "-";
  const count = Math.max(12, Math.floor(TXT_W / doc.getTextWidth(dash)));
  doc.text(dash.repeat(count), CENTER_X, y, { align: "center" });
};

export class TicketFacturaVentaService {
  static exportarTicket(factura: FacturaVentaResumen): void {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [PAGE_W, 297],
    });

    doc.setTextColor(0, 0, 0);
    let y = 8;

    // ── Encabezado ──────────────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("ALMACEN DE VENTAS", CENTER_X, y, { align: "center" });
    y += 6;

    sep(doc, y); y += 4.5;

    // ── Info factura (label arriba, valor debajo si es largo) ───────────────────
    const infoInline = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(label, LEFT_X, y);
      const labelW = doc.getTextWidth(label) + 1.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(value, LEFT_X + labelW, y);
      y += 4.5;
    };

    const infoStack = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(label, LEFT_X, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const val = doc.splitTextToSize(value, TXT_W);
      doc.text(val, LEFT_X, y);
      y += val.length * 4.2;
    };

    infoInline("Factura:", factura.numero_factura || "—");
    infoInline("Fecha:",   fmtDate(factura.fecha));
    if (factura.cliente) infoStack("Cliente:", factura.cliente);

    const solicitudes = factura.solicitudes_vinculadas ?? [];
    const codigos = solicitudes.map((s) => s.codigo_solicitud).filter(Boolean).join(", ");
    if (codigos) infoStack("Solicitud:", codigos);

    y += 2;
    sep(doc, y); y += 5;

    // ── Materiales ──────────────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("PRODUCTOS", CENTER_X, y, { align: "center" });
    y += 5.5;

    const allMats = solicitudes.flatMap((s) =>
      Array.isArray(s.materiales) ? s.materiales : [],
    );

    for (const m of allMats) {
      if (typeof m === "string") {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        const ls = doc.splitTextToSize(m, TXT_W);
        doc.text(ls, LEFT_X, y);
        y += ls.length * 4.2 + 1.5;
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

      // Línea descripción (bold, con buen espacio entre líneas)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      const descLine  = `${cant} x ${desc}`;
      const descLines = doc.splitTextToSize(descLine, TXT_W);
      doc.text(descLines, LEFT_X, y);
      y += descLines.length * 4.2;

      // Subtotal alineado a la derecha — más grande para destacar
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text(fmt(sub), RIGHT_X, y, { align: "right" });
      y += 5;

      // Descuento por material (solo si aplica)
      if (descPct > 0 || descMonto > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const descLabel =
          descPct > 0 && descMonto > 0
            ? `Desc ${descPct.toFixed(1)}% (-${fmt(descMonto)})`
            : descPct > 0
            ? `Desc ${descPct.toFixed(1)}%`
            : `Desc -${fmt(descMonto)}`;
        const dl = doc.splitTextToSize(descLabel, TXT_W);
        doc.text(dl, LEFT_X, y);
        y += dl.length * 3.8;
      }

      y += 2.5;
    }

    sep(doc, y); y += 5.5;

    // ── Totales ─────────────────────────────────────────────────────────────────
    const totalLine = (label: string, value: string, big = false) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(big ? 13 : 9.5);
      doc.text(label, LEFT_X, y);
      doc.text(value, RIGHT_X, y, { align: "right" });
      y += big ? 7 : 5;
    };

    totalLine("Subtotal:", fmt(factura.total_precio_materiales));
    if (Number(factura.total_descuento_monto) > 0)
      totalLine("Descuento:", `-${fmt(factura.total_descuento_monto)}`);
    totalLine("TOTAL:", fmt(factura.total_a_pagar), true);
    if (Number(factura.total_pagado) > 0)
      totalLine("Pagado:", fmt(factura.total_pagado));

    y += 2;
    sep(doc, y); y += 6;

    // ── Pie ─────────────────────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("GRACIAS POR SU VISITA", CENTER_X, y, { align: "center" });
    y += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("THANKS FOR YOUR VISIT", CENTER_X, y, { align: "center" });

    doc.save(`Ticket_${factura.numero_factura || "sin_numero"}.pdf`);
  }
}
