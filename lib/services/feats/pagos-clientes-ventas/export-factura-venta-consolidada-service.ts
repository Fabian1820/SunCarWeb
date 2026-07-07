import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { MaterialService } from "@/lib/api-services";
import type { FacturaVentaResumen } from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";

const EMPRESA = {
  nombre: "SunCar",
  nombreLargo: "Empresa Solar Carros",
  direccion: "Calle 24 #109 e/ 1ra y 3ra, Playa, La Habana",
};

const fmt = (v?: number) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
};

const fmtDate = (d?: string) => {
  if (!d) return "—";
  // Parsear solo la parte YYYY-MM-DD como fecha local para evitar el desfase de un día
  // que ocurre cuando JS interpreta "2026-05-12" como UTC en zonas con offset negativo.
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

const line = (doc: jsPDF, y: number, ml: number, mr: number) => {
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(ml, y, mr, y);
};

type MatRow = [string, string, string, string, string] | [string, string, string, string];

const normCodigo = (v?: string | null): string =>
  String(v || "").trim().toLowerCase();

/**
 * Catálogo de nombres del material indexado por código y por material_id. El
 * resumen de la factura solo trae `descripcion` (no el nombre), así que el
 * NOMBRE real se resuelve desde el catálogo.
 */
const cargarNombresPorCodigo = async (): Promise<Map<string, string>> => {
  const map = new Map<string, string>();
  try {
    const materiales = await MaterialService.getAllMaterials();
    for (const m of materiales) {
      const nombre = String(
        (m as { nombre?: string }).nombre ||
          (m as { descripcion?: string }).descripcion ||
          "",
      ).trim();
      if (!nombre) continue;
      const codigo = normCodigo((m as { codigo?: string }).codigo);
      if (codigo) map.set(`cod:${codigo}`, nombre);
      const id =
        (m as { material_id?: string }).material_id ||
        (m as { id?: string }).id;
      if (id) map.set(`id:${id}`, nombre);
    }
  } catch {
    // Sin catálogo, se cae a la descripción embebida.
  }
  return map;
};

const extractMateriales = (
  factura: FacturaVentaResumen,
  nombresPorCodigo?: Map<string, string>,
): { rows: MatRow[]; hasDiscount: boolean } => {
  const rows: MatRow[] = [];
  let hasDiscount = false;

  for (const s of factura.solicitudes_vinculadas ?? []) {
    for (const m of Array.isArray(s.materiales) ? s.materiales : []) {
      if (typeof m === "string") {
        rows.push([m, "—", "—", "—", "—"]);
        continue;
      }
      if (!m || typeof m !== "object") continue;
      const r = m as {
        material_codigo?: string;
        codigo?: string;
        material_id?: string;
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
      const codigo = r.material_codigo || r.codigo || "";
      const nombreCatalogo =
        (codigo && nombresPorCodigo?.get(`cod:${normCodigo(codigo)}`)) ||
        (r.material_id && nombresPorCodigo?.get(`id:${r.material_id}`)) ||
        "";
      const cant = Number(r.cantidad ?? 0);
      const precio = Number(r.precio ?? 0);
      const descPct = Number(r.descuento_porcentaje ?? 0);
      // Usar precio_con_descuento * cant si viene del backend, luego subtotal, luego calcular
      const sub =
        r.precio_con_descuento != null
          ? Number(r.precio_con_descuento) * cant
          : r.subtotal != null
          ? Number(r.subtotal)
          : descPct > 0
          ? precio * (1 - descPct / 100) * cant
          : precio * cant;
      const descLabel = descPct > 0 ? `${descPct.toFixed(1)}%` : "";
      if (descPct > 0) hasDiscount = true;
      rows.push([
        nombreCatalogo || r.material_descripcion || r.descripcion || r.nombre || "Material",
        String(cant),
        fmt(precio),
        descLabel,
        fmt(sub),
      ]);
    }
  }
  return { rows, hasDiscount };
};

export class ExportFacturaVentaConsolidadaService {
  // Renderiza una factura en la página actual del documento.
  private static renderFactura(
    doc: jsPDF,
    factura: FacturaVentaResumen,
    logo: string | null,
    nombresPorCodigo?: Map<string, string>,
  ): void {
    const W = 210;
    const ml = 20;
    const mr = W - ml;

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, 297, "F");

    // ── Cabecera sin fondo (ahorro de tóner) ──────────────────────────────────
    const HEADER_H = 38;

    // Logo
    const LOGO_SIZE = 22;
    const LOGO_Y = (HEADER_H - LOGO_SIZE) / 2;
    if (logo) doc.addImage(logo, "PNG", ml, LOGO_Y, LOGO_SIZE, LOGO_SIZE);
    const nx = logo ? ml + LOGO_SIZE + 6 : ml;

    // Nombre empresa grande
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(30, 41, 59);
    doc.text(EMPRESA.nombre, nx, LOGO_Y + 9);

    // Nombre largo y dirección
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text(EMPRESA.nombreLargo, nx, LOGO_Y + 15);
    doc.text(EMPRESA.direccion, nx, LOGO_Y + 20.5);

    let y = HEADER_H + 8;

    // ── FACTURA / NÚMERO ───────────────────────────────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text("FACTURA", ml, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(17, 24, 39);
    doc.text(factura.numero_factura || "—", ml, y);

    y += 9;
    line(doc, y, ml, mr);
    y += 5;

    // ── Detalles ───────────────────────────────────────────────────────────────
    const detalle = (label: string, value: string) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(107, 114, 128);
      doc.text(label, ml, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(17, 24, 39);
      doc.text(value, ml + 26, y);
      y += 5.5;
    };

    detalle("Cliente",     factura.cliente || "—");
    detalle("Fecha",       fmtDate(factura.fecha));
    detalle("Emitida por", factura.emitida_por_nombre || factura.emitida_por || "—");

    const codigos = (factura.solicitudes_vinculadas ?? [])
      .map((s) => s.codigo_solicitud).filter(Boolean).join("  ·  ");
    if (codigos) detalle("Solicitudes", codigos);

    y += 2;
    line(doc, y, ml, mr);
    y += 6;

    // ── Materiales ─────────────────────────────────────────────────────────────
    const { rows: materiales, hasDiscount } = extractMateriales(factura, nombresPorCodigo);
    if (materiales.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);
      doc.text("MATERIALES", ml, y);
      y += 3;

      if (hasDiscount) {
        autoTable(doc, {
          startY: y,
          head: [["Material", "Cant.", "Precio", "Desc.", "Subtotal"]],
          body: materiales as string[][],
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
            1: { cellWidth: 12, halign: "center" },
            2: { cellWidth: 24, halign: "right" },
            3: { cellWidth: 16, halign: "right", textColor: [194, 65, 12] },
            4: { cellWidth: 24, halign: "right", fontStyle: "bold" },
          },
        });
      } else {
        // Sin columna de descuento
        const rowsSimple = materiales.map(r => [r[0], r[1], r[2], r[4] ?? ""]);
        autoTable(doc, {
          startY: y,
          head: [["Material", "Cant.", "Precio", "Subtotal"]],
          body: rowsSimple,
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
      }
      y = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y) + 5;
    }

    // ── Pagos ──────────────────────────────────────────────────────────────────
    const pagos = Array.isArray(factura.pagos) ? factura.pagos : [];
    if (pagos.length > 0) {
      line(doc, y, ml, mr);
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
        financiacion: "Financiación",
      };

      const pagoDetail = (label: string, value: string, indent = 0) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(107, 114, 128);
        doc.text(`${label}:`, ml + 4 + indent, y);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39);
        doc.text(value, mr - 2, y, { align: "right" });
        y += 5;
      };

      pagos.forEach((p, idx) => {
        if (idx > 0) { y += 2; line(doc, y, ml + 4, mr - 4); y += 4; }

        if (pagos.length > 1) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(79, 70, 229);
          doc.text(`Pago ${idx + 1}  ·  ${fmtDate(p.fecha)}`, ml + 4, y);
          y += 5;
        }

        const moneda = p.moneda || "USD";
        const monto = Number(p.monto || 0);

        pagoDetail("Monto Pagado", `${monto.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${moneda}`);

        if (moneda !== "USD" && p.tasa_cambio && Number(p.tasa_cambio) > 0) {
          const tasa = Number(p.tasa_cambio);
          pagoDetail("Tasa de Cambio", tasa.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }));
          const equivUsd = monto / tasa;
          pagoDetail("Equivalente USD", fmt(equivUsd));
        }

        // Desglose de billetes
        const desglose = p.desglose_billetes;
        if (desglose && typeof desglose === "object") {
          const entries = Object.entries(desglose).filter(([, cant]) => Number(cant) > 0);
          if (entries.length > 0) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(107, 114, 128);
            doc.text("Desglose de Billetes:", ml + 4, y);
            y += 5;
            let totalBilletes = 0;
            for (const [denominacion, cantidad] of entries) {
              const subtotal = Number(denominacion) * Number(cantidad);
              totalBilletes += subtotal;
              doc.setFont("helvetica", "normal");
              doc.setFontSize(8);
              doc.setTextColor(55, 65, 81);
              doc.text(`${cantidad} x ${denominacion} ${moneda}`, ml + 10, y);
              doc.setFont("helvetica", "bold");
              doc.text(subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 }), mr - 2, y, { align: "right" });
              y += 4.5;
            }
            const cambio = totalBilletes - monto;
            if (cambio > 0) {
              pagoDetail("Cambio original", `${cambio.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${moneda}`);
            }
          }
        }

        if (p.metodo_pago) {
          pagoDetail("Forma de Pago", METODO_LABELS[p.metodo_pago] || p.metodo_pago);
        }
        if (p.recibido_por) {
          pagoDetail("Recibido por", p.recibido_por);
        }
        if (p.notas) {
          pagoDetail("Notas", p.notas);
        }

        // Cambio dado al cliente
        const pr = p as typeof p & { cambio?: number; cambio_real_monto?: number; cambio_real_moneda?: string; cambio_real_tasa?: number };
        const hayCambioReal = pr.cambio_real_monto != null && Number(pr.cambio_real_monto) > 0;
        const hayCambioOriginal = pr.cambio != null && Number(pr.cambio) > 0;

        if (hayCambioOriginal && !hayCambioReal) {
          // Solo cambio calculado (sin cambio real diferente)
          pagoDetail("Cambio original", `${Number(pr.cambio).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${moneda}`);
        } else if (hayCambioReal) {
          const crMonto = Number(pr.cambio_real_monto);
          const crMoneda = pr.cambio_real_moneda || moneda;
          const crTasa = Number(pr.cambio_real_tasa || 0);
          // Cambio dado: monto + moneda
          pagoDetail("Cambio dado", `${crMonto.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${crMoneda}`);
          // Tasa del cambio: expresada como "no-USD por 1 USD"
          if (crMoneda !== moneda && crTasa > 0) {
            const nonUsd = crMoneda === "USD" ? moneda : crMoneda;
            pagoDetail("Tasa del cambio", `1 USD = ${crTasa.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ${nonUsd}`);
          }
        }

        if (p.monto_pendiente_despues_pago != null && Number.isFinite(Number(p.monto_pendiente_despues_pago))) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(107, 114, 128);
          doc.text("Monto Pendiente:", ml + 4, y);
          doc.setFont("helvetica", "bold");
          const pendVal = Number(p.monto_pendiente_despues_pago);
          doc.setTextColor(pendVal > 0 ? 185 : 21, pendVal > 0 ? 28 : 128, pendVal > 0 ? 28 : 61);
          doc.text(`${pendVal.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD`, mr - 2, y, { align: "right" });
          y += 5;
        }
      });
      y += 2;
    }

    // ── Totales ────────────────────────────────────────────────────────────────
    y += 2;
    line(doc, y, ml, mr);
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

    totalRow("Subtotal",      fmt(factura.total_precio_materiales));
    if (Number(factura.total_descuento_monto) > 0)
      totalRow("Descuento",   fmt(factura.total_descuento_monto), false, [194, 65, 12]);
    totalRow("Total a pagar", fmt(factura.total_a_pagar));
    totalRow("Total pagado",  fmt(factura.total_pagado), false, [21, 128, 61]);

    y += 1;
    line(doc, y, ml, mr);
    y += 5;

    const pendiente = Number(factura.monto_pendiente);
    const pagada = Number.isFinite(pendiente) && pendiente <= 0;
    totalRow(
      "Pendiente",
      pagada ? "PAGADA ✓" : fmt(factura.monto_pendiente),
      true,
      pagada ? [21, 128, 61] : [185, 28, 28],
    );

    // ── Pie ────────────────────────────────────────────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(209, 213, 219);
    doc.text(`${EMPRESA.nombreLargo}  ·  ${EMPRESA.direccion}`, W / 2, 291, { align: "center" });
  }

  static async exportarPDF(factura: FacturaVentaResumen): Promise<void> {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const [logo, nombresPorCodigo] = await Promise.all([
      resolveLogo(),
      cargarNombresPorCodigo(),
    ]);
    this.renderFactura(doc, factura, logo, nombresPorCodigo);
    doc.save(`Factura_${factura.numero_factura || "sin_numero"}.pdf`);
  }

  // Exporta múltiples facturas en un solo PDF, una por página.
  static async exportarMultiplesPDF(
    facturas: FacturaVentaResumen[],
    nombreArchivo?: string,
  ): Promise<void> {
    if (facturas.length === 0) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const [logo, nombresPorCodigo] = await Promise.all([
      resolveLogo(),
      cargarNombresPorCodigo(),
    ]);
    facturas.forEach((factura, idx) => {
      if (idx > 0) doc.addPage();
      this.renderFactura(doc, factura, logo, nombresPorCodigo);
    });
    const fecha = new Date().toISOString().slice(0, 10);
    doc.save(nombreArchivo ?? `Facturas_${fecha}.pdf`);
  }
}
