import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  EvaluacionComercial,
  OfertasDatos,
  WhatsappDatos,
} from "@/lib/types/feats/evaluaciones-comerciales/evaluaciones-comerciales-types";

const C = {
  ink: [15, 43, 34] as [number, number, number],
  verde: [47, 125, 82] as [number, number, number],
  verdeClaro: [238, 245, 240] as [number, number, number],
  gris: [107, 121, 114] as [number, number, number],
  blanco: [255, 255, 255] as [number, number, number],
};

function fmtFecha(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
}

function fmtDuracion(seg?: number | null): string {
  if (seg == null) return "—";
  const min = Math.floor(seg / 60);
  const s = seg % 60;
  if (min < 60) return `${min}m ${s}s`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function nota(n?: number | null): string {
  return n == null ? "—" : `${n}/5`;
}

function tituloSeccion(doc: jsPDF, titulo: string, y: number): number {
  doc.setFontSize(13);
  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "bold");
  doc.text(titulo, 14, y);
  doc.setDrawColor(...C.verde);
  doc.setLineWidth(0.6);
  doc.line(14, y + 2, doc.internal.pageSize.getWidth() - 14, y + 2);
  return y + 8;
}

function tabla(
  doc: jsPDF,
  y: number,
  head: string[],
  body: string[][],
): number {
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [head],
    body,
    styles: { fontSize: 9, textColor: C.ink },
    headStyles: { fillColor: C.verdeClaro, textColor: C.ink, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" } },
    alternateRowStyles: { fillColor: [248, 250, 249] },
  });
  // @ts-expect-error autoTable augments doc at runtime
  return doc.lastAutoTable.finalY + 8;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 20) {
    doc.addPage();
    return 20;
  }
  return y;
}

export function generarEvaluacionPdf(
  evaluacion: EvaluacionComercial,
  whatsapp: WhatsappDatos | null,
  ofertas: OfertasDatos | null,
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(...C.ink);
  doc.rect(0, 0, pageW, 55, "F");
  doc.setTextColor(...C.blanco);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("SUNCAR · EVALUACIÓN DE COMERCIAL", 14, 18);
  doc.setFontSize(19);
  doc.setFont("helvetica", "bold");
  doc.text(evaluacion.comercial_nombre || evaluacion.comercial_ci, 14, 30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Periodo: ${fmtFecha(evaluacion.periodo_inicio)} — ${fmtFecha(evaluacion.periodo_fin)}`,
    14,
    40,
  );
  if (evaluacion.firmada) {
    doc.text(
      `Firmada por ${evaluacion.firmada_por_nombre ?? "—"} el ${fmtFecha(evaluacion.firmada_en)}`,
      14,
      47,
    );
  } else {
    doc.setTextColor(255, 220, 100);
    doc.text("BORRADOR — no firmada", 14, 47);
  }

  let y = 68;

  // ────────── WhatsApp ──────────
  y = tituloSeccion(doc, "1. WhatsApp (Chatwoot)", y);
  if (!whatsapp?.disponible || !whatsapp.datos) {
    doc.setFontSize(10);
    doc.setTextColor(...C.gris);
    doc.text(
      `Sin datos: ${whatsapp?.razon ?? "no disponible"}`,
      14,
      y,
    );
    y += 10;
  } else {
    const d = whatsapp.datos;
    const r = d.resumen_conversaciones;
    y = tabla(doc, y, ["Métrica", "Valor"], [
      ["Agente en Chatwoot", d.agente.nombre],
      ["Conversaciones abiertas", String(r?.conversaciones_abiertas ?? "—")],
      ["Conversaciones sin atender", String(r?.conversaciones_sin_atender ?? "—")],
      ["Conversaciones resueltas", String(r?.resueltas ?? "—")],
      ["Tiempo prom. primera respuesta", fmtDuracion(r?.tiempo_primera_respuesta_seg)],
      ["Tiempo prom. resolución", fmtDuracion(r?.tiempo_resolucion_seg)],
      ["CSAT — respuestas recibidas", String(d.csat_resumen?.total_respuestas ?? "—")],
      ["CSAT — % satisfacción", d.csat_resumen?.csat_pct != null ? `${d.csat_resumen.csat_pct}%` : "—"],
      ["CSAT — rating promedio", d.csat_resumen?.promedio_rating != null ? `${d.csat_resumen.promedio_rating}` : "—"],
    ]);

    if (d.csat_respuestas.length > 0) {
      y = ensureSpace(doc, y, 40);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.ink);
      doc.text("Feedback recibido de clientes (CSAT)", 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        head: [["Fecha", "Cliente", "Rating", "Comentario"]],
        body: d.csat_respuestas.map((r) => [
          fmtFecha(r.fecha ?? undefined),
          r.contact_nombre ?? "—",
          r.rating != null ? String(r.rating) : "—",
          r.feedback ?? "—",
        ]),
        styles: { fontSize: 8, textColor: C.ink },
        headStyles: {
          fillColor: C.verdeClaro,
          textColor: C.ink,
          fontStyle: "bold",
        },
        columnStyles: { 2: { halign: "right" } },
      });
      // @ts-expect-error autoTable augments doc at runtime
      y = doc.lastAutoTable.finalY + 10;
    }
  }

  // ────────── Ofertas ──────────
  y = ensureSpace(doc, y, 60);
  y = tituloSeccion(doc, "2. Ofertas", y);
  if (!ofertas || ofertas.razon) {
    doc.setFontSize(10);
    doc.setTextColor(...C.gris);
    doc.text(`Sin datos: ${ofertas?.razon ?? "no disponible"}`, 14, y);
    y += 10;
  } else {
    y = tabla(doc, y, ["Métrica", "Valor"], [
      ["Leads captados", String(ofertas.leads_captados ?? "—")],
      ["Clientes captados", String(ofertas.clientes_captados ?? "—")],
      ["% conversión lead → cliente", ofertas.conversion_pct != null ? `${ofertas.conversion_pct}%` : "—"],
    ]);

    if (ofertas.ofertas) {
      y = ensureSpace(doc, y, 40);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.ink);
      doc.text("Ofertas de confección creadas en el periodo", 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        head: [[
          "Concepto",
          "Cant.",
          "Monto total",
          "Margen agregado",
          "Descuento",
          "Compensación",
        ]],
        body: [
          ["Ofertas creadas", String(ofertas.ofertas.creadas.cantidad),
            fmtMoney(ofertas.ofertas.creadas.monto_total),
            fmtMoney(ofertas.ofertas.creadas.margen_agregado),
            fmtMoney(ofertas.ofertas.creadas.descuento),
            fmtMoney(ofertas.ofertas.creadas.compensacion)],
          ["De esas, confirmadas", String(ofertas.ofertas.confirmadas.cantidad),
            fmtMoney(ofertas.ofertas.confirmadas.monto_total),
            fmtMoney(ofertas.ofertas.confirmadas.margen_agregado),
            fmtMoney(ofertas.ofertas.confirmadas.descuento),
            fmtMoney(ofertas.ofertas.confirmadas.compensacion)],
          ["De esas, con al menos un pago", String(ofertas.ofertas.confirmadas_con_pago.cantidad),
            fmtMoney(ofertas.ofertas.confirmadas_con_pago.monto_total),
            fmtMoney(ofertas.ofertas.confirmadas_con_pago.margen_agregado),
            fmtMoney(ofertas.ofertas.confirmadas_con_pago.descuento),
            fmtMoney(ofertas.ofertas.confirmadas_con_pago.compensacion)],
        ],
        styles: { fontSize: 8, textColor: C.ink },
        headStyles: { fillColor: C.verdeClaro, textColor: C.ink, fontStyle: "bold" },
        columnStyles: {
          1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" },
          4: { halign: "right" }, 5: { halign: "right" },
        },
      });
      // @ts-expect-error autoTable augments doc at runtime
      y = doc.lastAutoTable.finalY + 6;
    }

    if (ofertas.obras_terminadas) {
      y = ensureSpace(doc, y, 30);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.ink);
      doc.text("Obras terminadas en el periodo", 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        head: [[
          "Concepto",
          "Cant.",
          "Monto total",
          "Margen agregado",
          "Descuento",
          "Compensación",
        ]],
        body: [[
          "Obras terminadas",
          String(ofertas.obras_terminadas.cantidad),
          fmtMoney(ofertas.obras_terminadas.monto_total),
          fmtMoney(ofertas.obras_terminadas.margen_agregado),
          fmtMoney(ofertas.obras_terminadas.descuento),
          fmtMoney(ofertas.obras_terminadas.compensacion),
        ]],
        styles: { fontSize: 8, textColor: C.ink },
        headStyles: { fillColor: C.verdeClaro, textColor: C.ink, fontStyle: "bold" },
        columnStyles: {
          1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" },
          4: { halign: "right" }, 5: { halign: "right" },
        },
      });
      // @ts-expect-error autoTable augments doc at runtime
      y = doc.lastAutoTable.finalY + 8;
    }
  }

  // ────────── Actitud ──────────
  y = ensureSpace(doc, y, 60);
  y = tituloSeccion(doc, "3. Actitud y disposición", y);
  const a = evaluacion.actitud;
  y = tabla(doc, y, ["Criterio", "Puntuación"], [
    ["Trato al cliente", nota(a.trato_al_cliente)],
    ["Trato a los compañeros", nota(a.trato_a_companeros)],
    ["Disposición para hacer tareas", nota(a.disposicion_para_tareas)],
    ["Colaboración", nota(a.colaboracion)],
  ]);
  if (a.observaciones && a.observaciones.trim()) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.ink);
    doc.text("Observaciones:", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(a.observaciones, pageW - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 4;
  }

  // ────────── Documentación ──────────
  y = ensureSpace(doc, y, 60);
  y = tituloSeccion(doc, "4. Documentación", y);
  const dc = evaluacion.documentacion;
  y = tabla(doc, y, ["Criterio", "Puntuación"], [
    ["Manejo de contratos", nota(dc.manejo_de_contratos)],
    ["Calidad de información en el sistema", nota(dc.calidad_informacion_sistema)],
    ["Cumplimiento de procedimientos", nota(dc.cumplimiento_de_procedimientos)],
  ]);
  if (dc.observaciones && dc.observaciones.trim()) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.ink);
    doc.text("Observaciones:", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(dc.observaciones, pageW - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 4;
  }

  // ────────── Firmas ──────────
  y = ensureSpace(doc, y, 60);
  y = tituloSeccion(doc, "Firmas", y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.ink);

  const col1X = 14;
  const col2X = pageW / 2 + 4;
  const lineaY = y + 20;

  doc.line(col1X, lineaY, col1X + 80, lineaY);
  doc.text("Firma del comercial", col1X, lineaY + 5);
  doc.text(evaluacion.comercial_nombre ?? "—", col1X, lineaY + 11);

  doc.line(col2X, lineaY, col2X + 80, lineaY);
  doc.text("Firma del evaluador", col2X, lineaY + 5);
  doc.text(
    evaluacion.firmada
      ? `${evaluacion.firmada_por_nombre ?? "—"}  ·  ${fmtFecha(evaluacion.firmada_en)}`
      : "—",
    col2X,
    lineaY + 11,
  );

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...C.gris);
    doc.text(
      `SunCar · Evaluación de ${evaluacion.comercial_nombre ?? evaluacion.comercial_ci}`,
      14,
      doc.internal.pageSize.getHeight() - 8,
    );
  }

  const nombreArchivo = `Evaluacion_${(evaluacion.comercial_nombre ?? evaluacion.comercial_ci).replace(/\s+/g, "_")}_${evaluacion.periodo_inicio.slice(0, 10)}.pdf`;
  doc.save(nombreArchivo);
}
