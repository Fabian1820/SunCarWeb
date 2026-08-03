import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  ComercialInstaladora,
  ComercialVentas,
  InformeComparativo,
  InstaladoraGeneral,
  PeriodoInforme,
  VentasResumen,
} from "@/lib/types/feats/informe-direccion/informe-direccion-types";

const C = {
  ink: [15, 43, 34] as [number, number, number],
  verde: [47, 125, 82] as [number, number, number],
  verdeClaro: [238, 245, 240] as [number, number, number],
  gris: [107, 121, 114] as [number, number, number],
  blanco: [255, 255, 255] as [number, number, number],
};

function fmtMoney(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtFecha(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
}

function labelPeriodo(p: PeriodoInforme): string {
  return `${fmtFecha(p.inicio)} — ${fmtFecha(p.fin)}`;
}

function seccion(doc: jsPDF, titulo: string, y: number): number {
  doc.setFontSize(13);
  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "bold");
  doc.text(titulo, 14, y);
  doc.setDrawColor(...C.verde);
  doc.setLineWidth(0.6);
  doc.line(14, y + 2, doc.internal.pageSize.getWidth() - 14, y + 2);
  return y + 8;
}

function tablaMetricas(doc: jsPDF, y: number, filas: [string, string, string][], labelA: string, labelB: string): number {
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Métrica", labelA, labelB]],
    body: filas,
    styles: { fontSize: 9, textColor: C.ink },
    headStyles: { fillColor: C.verdeClaro, textColor: C.ink, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    alternateRowStyles: { fillColor: [248, 250, 249] },
  });
  // @ts-expect-error autoTable augments doc with lastAutoTable at runtime
  return doc.lastAutoTable.finalY + 10;
}

function instaladoraGeneralFilas(a: InstaladoraGeneral, b: InstaladoraGeneral): [string, string, string][] {
  return [
    ["Leads nuevos", String(a.leads_nuevos), String(b.leads_nuevos)],
    ["Clientes nuevos (total)", String(a.clientes_nuevos_total), String(b.clientes_nuevos_total)],
    ["  de los cuales, trabajadores SunCar", String(a.clientes_nuevos_trabajadores), String(b.clientes_nuevos_trabajadores)],
    ["  de los cuales, clientes reales", String(a.clientes_nuevos_reales), String(b.clientes_nuevos_reales)],
    ["% conversión lead -> cliente (reales)", `${a.conversion_pct}%`, `${b.conversion_pct}%`],
    ["Instalaciones completadas", String(a.instalaciones_completadas), String(b.instalaciones_completadas)],
    [
      "Días promedio confirmación -> instalación",
      a.dias_promedio_confirmacion_instalacion?.toString() ?? "—",
      b.dias_promedio_confirmacion_instalacion?.toString() ?? "—",
    ],
    ["Ofertas confirmadas con anticipo pagado", String(a.ofertas_confirmadas_con_anticipo), String(b.ofertas_confirmadas_con_anticipo)],
    ["Averías reportadas (total)", String(a.averias_reportadas), String(b.averias_reportadas)],
    ["  resueltas", String(a.averias_resueltas), String(b.averias_resueltas)],
    ["  pendientes", String(a.averias_pendientes), String(b.averias_pendientes)],
    ["Ofertas creadas", String(a.ofertas_creadas), String(b.ofertas_creadas)],
    ["Ofertas confirmadas", String(a.ofertas_confirmadas), String(b.ofertas_confirmadas)],
    ["Monto vendido (confirmadas)", fmtMoney(a.monto_vendido), fmtMoney(b.monto_vendido)],
    ["Monto cobrado — total del periodo", fmtMoney(a.monto_cobrado_total_mes), fmtMoney(b.monto_cobrado_total_mes)],
    ["Monto cobrado — de lo confirmado en el periodo", fmtMoney(a.monto_cobrado_de_confirmadas), fmtMoney(b.monto_cobrado_de_confirmadas)],
    ["Vales de salida — promedio por día", `${a.vales_salida_promedio_dia} / día`, `${b.vales_salida_promedio_dia} / día`],
  ];
}

function ventasFilas(a: VentasResumen, b: VentasResumen): [string, string, string][] {
  return [
    ["Solicitudes creadas", String(a.solicitudes_creadas), String(b.solicitudes_creadas)],
    ["  de clientes nuevos (primera compra)", String(a.solicitudes_de_clientes_nuevos), String(b.solicitudes_de_clientes_nuevos)],
    ["  de clientes recurrentes", String(a.solicitudes_de_clientes_recurrentes), String(b.solicitudes_de_clientes_recurrentes)],
    ["Monto vendido", fmtMoney(a.monto_vendido), fmtMoney(b.monto_vendido)],
    ["Descuento otorgado", fmtMoney(a.descuento_otorgado), fmtMoney(b.descuento_otorgado)],
    ["Solicitudes pagadas", String(a.solicitudes_pagadas), String(b.solicitudes_pagadas)],
    ["Solicitudes no pagadas", String(a.solicitudes_no_pagadas), String(b.solicitudes_no_pagadas)],
  ];
}

function tablaComercialInstaladora(doc: jsPDF, y: number, titulo: string, filas: ComercialInstaladora[]): number {
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.ink);
  doc.text(titulo, 14, y);
  y += 4;
  const totalLeads = filas.reduce((s, f) => s + f.leads, 0);
  const totalClientes = filas.reduce((s, f) => s + f.clientes, 0);
  const totalOfCreadas = filas.reduce((s, f) => s + f.ofertas_creadas, 0);
  const totalOfConfirmadas = filas.reduce((s, f) => s + f.ofertas_confirmadas, 0);
  const totalVendido = filas.reduce((s, f) => s + f.monto_vendido, 0);
  const totalCobrado = filas.reduce((s, f) => s + f.monto_cobrado, 0);
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Comercial", "Leads", "Clientes", "%conv", "Of. creadas", "Confirmadas", "Monto vendido", "Monto cobrado"]],
    body: [
      ...filas.map((f) => [
        f.nombre,
        String(f.leads),
        String(f.clientes),
        `${f.conversion_pct}%`,
        String(f.ofertas_creadas),
        String(f.ofertas_confirmadas),
        fmtMoney(f.monto_vendido),
        fmtMoney(f.monto_cobrado),
      ]),
      [
        "Total equipo",
        String(totalLeads),
        String(totalClientes),
        "—",
        String(totalOfCreadas),
        String(totalOfConfirmadas),
        fmtMoney(totalVendido),
        fmtMoney(totalCobrado),
      ],
    ],
    styles: { fontSize: 8, textColor: C.ink },
    headStyles: { fillColor: C.verdeClaro, textColor: C.ink, fontStyle: "bold" },
    columnStyles: {
      1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" },
      4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" },
    },
    didParseCell: (data) => {
      if (data.row.index === filas.length) {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  // @ts-expect-error autoTable augments doc with lastAutoTable at runtime
  return doc.lastAutoTable.finalY + 8;
}

function tablaComercialVentas(doc: jsPDF, y: number, titulo: string, filas: ComercialVentas[]): number {
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.ink);
  doc.text(titulo, 14, y);
  y += 4;
  const totalClientes = filas.reduce((s, f) => s + f.clientes_nuevos, 0);
  const totalSolicitudes = filas.reduce((s, f) => s + f.solicitudes, 0);
  const totalVendido = filas.reduce((s, f) => s + f.monto_vendido, 0);
  const totalPagadas = filas.reduce((s, f) => s + f.pagadas, 0);
  const totalNoPagadas = filas.reduce((s, f) => s + f.no_pagadas, 0);
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Comercial", "Clientes nuevos", "Solicitudes", "Monto vendido", "Pagadas", "No pagadas"]],
    body: [
      ...filas.map((f) => [
        f.nombre,
        String(f.clientes_nuevos),
        String(f.solicitudes),
        fmtMoney(f.monto_vendido),
        String(f.pagadas),
        String(f.no_pagadas),
      ]),
      ["Total equipo", String(totalClientes), String(totalSolicitudes), fmtMoney(totalVendido), String(totalPagadas), String(totalNoPagadas)],
    ],
    styles: { fontSize: 8, textColor: C.ink },
    headStyles: { fillColor: C.verdeClaro, textColor: C.ink, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
    didParseCell: (data) => {
      if (data.row.index === filas.length) {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  // @ts-expect-error autoTable augments doc with lastAutoTable at runtime
  return doc.lastAutoTable.finalY + 8;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 15) {
    doc.addPage();
    return 20;
  }
  return y;
}

export type SeccionInformeDireccionKey =
  | "instaladoraGeneral"
  | "comercialInstaladora"
  | "ventas"
  | "comercialVentas";

export type SeccionesInformeDireccion = Record<SeccionInformeDireccionKey, boolean>;

export const SECCIONES_INFORME_DIRECCION_DEFAULT: SeccionesInformeDireccion = {
  instaladoraGeneral: true,
  comercialInstaladora: true,
  ventas: true,
  comercialVentas: true,
};

export const SECCIONES_INFORME_DIRECCION_LABELS: Record<SeccionInformeDireccionKey, string> = {
  instaladoraGeneral: "Instaladora General",
  comercialInstaladora: "Comercial de Instaladora (individual)",
  ventas: "Ventas (solicitudes de venta)",
  comercialVentas: "Comercial de Ventas (individual)",
};

export function generarInformeDireccionPdf(
  informe: InformeComparativo,
  secciones: SeccionesInformeDireccion = SECCIONES_INFORME_DIRECCION_DEFAULT,
): void {
  const { periodo_a, periodo_b } = informe;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Portada
  doc.setFillColor(...C.ink);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 55, "F");
  doc.setTextColor(...C.blanco);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("SUNCAR · INFORME INTERNO", 14, 18);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Informe Comparativo de Desempeño", 14, 30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Periodo A: ${labelPeriodo(periodo_a)}`, 14, 40);
  doc.text(`Periodo B: ${labelPeriodo(periodo_b)}`, 14, 47);

  let y = 68;
  const labelA = "Periodo A";
  const labelB = "Periodo B";
  let n = 1;

  if (secciones.instaladoraGeneral) {
    y = seccion(doc, `${n++}. Instaladora General`, y);
    y = tablaMetricas(doc, y, instaladoraGeneralFilas(periodo_a.instaladora_general, periodo_b.instaladora_general), labelA, labelB);
  }

  if (secciones.comercialInstaladora) {
    y = ensureSpace(doc, y, 60);
    y = seccion(doc, `${n++}. Comercial de Instaladora (individual)`, y);
    y = tablaComercialInstaladora(doc, y, `Periodo A (${labelPeriodo(periodo_a)})`, periodo_a.comercial_instaladora);
    y = ensureSpace(doc, y, 60);
    y = tablaComercialInstaladora(doc, y, `Periodo B (${labelPeriodo(periodo_b)})`, periodo_b.comercial_instaladora);
  }

  if (secciones.ventas) {
    y = ensureSpace(doc, y, 60);
    y = seccion(doc, `${n++}. Ventas (solicitudes de venta — almacén/tienda)`, y);
    y = tablaMetricas(doc, y, ventasFilas(periodo_a.ventas, periodo_b.ventas), labelA, labelB);
  }

  if (secciones.comercialVentas) {
    y = ensureSpace(doc, y, 60);
    y = seccion(doc, `${n++}. Comercial de Ventas (individual)`, y);
    y = tablaComercialVentas(doc, y, `Periodo A (${labelPeriodo(periodo_a)})`, periodo_a.comercial_ventas);
    y = ensureSpace(doc, y, 60);
    y = tablaComercialVentas(doc, y, `Periodo B (${labelPeriodo(periodo_b)})`, periodo_b.comercial_ventas);
  }

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
  }

  const nombreArchivo = `Informe_SunCar_${periodo_a.inicio.slice(0, 10)}_vs_${periodo_b.inicio.slice(0, 10)}.pdf`;
  doc.save(nombreArchivo);
}
