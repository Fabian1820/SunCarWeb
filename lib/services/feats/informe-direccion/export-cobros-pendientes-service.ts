import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ObraTerminada } from "@/lib/services/feats/obras-terminadas/obras-terminadas-service";

const C = {
  ink: [15, 43, 34] as [number, number, number],
  verde: [47, 125, 82] as [number, number, number],
  verdeClaro: [238, 245, 240] as [number, number, number],
  gris: [107, 121, 114] as [number, number, number],
  rojo: [153, 40, 40] as [number, number, number],
  blanco: [255, 255, 255] as [number, number, number],
};

function fmtMoney(n: number): string {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtFecha(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? String(iso)
    : d.toLocaleDateString("es-ES", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export interface ResumenCobrosPendientes {
  /** Clientes distintos con al menos una obra terminada y saldo pendiente. */
  clientes: number;
  /** Obras (ofertas) terminadas con saldo pendiente. */
  obras: number;
  /** Suma de todos los saldos pendientes. */
  totalPendiente: number;
  /** Suma de lo ya cobrado en esas mismas obras. */
  totalCobrado: number;
}

export function resumirCobrosPendientes(filas: ObraTerminada[]): ResumenCobrosPendientes {
  const clientes = new Set<string>();
  let totalPendiente = 0;
  let totalCobrado = 0;

  for (const f of filas) {
    const numero = (f.cliente_numero || "").trim();
    if (numero) clientes.add(numero);
    totalPendiente += Number(f.monto_pendiente ?? 0);
    totalCobrado += Number(f.total_pagado ?? 0);
  }

  return { clientes: clientes.size, obras: filas.length, totalPendiente, totalCobrado };
}

/**
 * PDF con las obras ya terminadas (cliente en estado "Equipo instalado con
 * éxito") que todavía tienen saldo por cobrar. Una fila por oferta, ordenadas
 * de mayor a menor deuda.
 */
export function generarCobrosPendientesPdf(filas: ObraTerminada[]): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const resumen = resumirCobrosPendientes(filas);

  const ordenadas = [...filas].sort(
    (a, b) => Number(b.monto_pendiente ?? 0) - Number(a.monto_pendiente ?? 0),
  );

  // Portada
  doc.setFillColor(...C.ink);
  doc.rect(0, 0, anchoPagina, 40, "F");
  doc.setTextColor(...C.blanco);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("SUNCAR · INFORME INTERNO", 14, 14);
  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.text("Cobros pendientes de obras terminadas", 14, 25);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Clientes con la instalación ya terminada que todavía tienen saldo por cobrar.",
    14,
    33,
  );

  // Resumen
  let y = 52;
  doc.setTextColor(...C.ink);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen", 14, y);
  doc.setDrawColor(...C.verde);
  doc.setLineWidth(0.6);
  doc.line(14, y + 2, anchoPagina - 14, y + 2);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Clientes que deben", "Obras con saldo", "Total ya cobrado", "Total pendiente"]],
    body: [
      [
        String(resumen.clientes),
        String(resumen.obras),
        fmtMoney(resumen.totalCobrado),
        fmtMoney(resumen.totalPendiente),
      ],
    ],
    styles: { fontSize: 11, textColor: C.ink, halign: "center", cellPadding: 3 },
    headStyles: { fillColor: C.verdeClaro, textColor: C.ink, fontStyle: "bold", halign: "center" },
    columnStyles: { 3: { textColor: C.rojo, fontStyle: "bold" } },
  });
  // @ts-expect-error autoTable augments doc with lastAutoTable at runtime
  y = doc.lastAutoTable.finalY + 12;

  // Detalle
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.ink);
  doc.text("Detalle por obra", 14, y);
  doc.setDrawColor(...C.verde);
  doc.line(14, y + 2, anchoPagina - 14, y + 2);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [
      [
        "#",
        "Cliente",
        "Código",
        "Oferta",
        "Instalado el",
        "Comercial",
        "Precio final",
        "Pagado",
        "Pendiente",
      ],
    ],
    body: ordenadas.map((f, i) => [
      String(i + 1),
      f.nombre_completo || f.cliente_nombre || "—",
      f.cliente_numero || "—",
      f.numero_oferta || "—",
      fmtFecha(f.fecha_equipo_instalado),
      f.comercial || "—",
      fmtMoney(Number(f.precio_final ?? 0)),
      fmtMoney(Number(f.total_pagado ?? 0)),
      fmtMoney(Number(f.monto_pendiente ?? 0)),
    ]),
    styles: { fontSize: 8, textColor: C.ink, cellPadding: 1.8 },
    headStyles: { fillColor: C.verdeClaro, textColor: C.ink, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 249] },
    columnStyles: {
      0: { cellWidth: 10, halign: "right" },
      2: { cellWidth: 24 },
      3: { cellWidth: 30 },
      4: { cellWidth: 22, halign: "center" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right", fontStyle: "bold", textColor: C.rojo },
    },
  });

  // Pie con numeración
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...C.gris);
    doc.text(
      `SunCar · Informe generado el ${new Date().toLocaleDateString("es-ES")}`,
      14,
      doc.internal.pageSize.getHeight() - 8,
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      anchoPagina - 14,
      doc.internal.pageSize.getHeight() - 8,
      { align: "right" },
    );
  }

  const hoy = new Date().toISOString().slice(0, 10);
  doc.save(`Cobros_pendientes_obras_terminadas_${hoy}.pdf`);
}
