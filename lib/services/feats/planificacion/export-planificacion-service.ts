import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ETIQUETA_TIPO } from "@/lib/types/feats/planificacion/planificacion-types";
import type { Asignado, Planificacion, TrabajoPlanificado } from "@/lib/types/feats/planificacion/planificacion-types";

const VERDE: [number, number, number] = [6, 78, 59];
const GRIS: [number, number, number] = [107, 114, 128];

const ETIQUETA_ESTADO_TRABAJO: Record<TrabajoPlanificado["estado"], string> = {
  planificado: "Planificado",
  cumplido: "Cumplido",
  no_realizado: "No realizado",
};

function nombreDe(a: Asignado): string {
  return a.tipo === "brigada" ? `Brigada de ${a.nombre}` : a.nombre;
}

function construirDoc(plan: Planificacion, tituloFecha: string): jsPDF {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setTextColor(...VERDE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Planificación", 12, 16);

  doc.setFontSize(11);
  doc.text(tituloFecha, 12, 23);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRIS);
  doc.setFontSize(9);
  const n = plan.trabajos.length;
  const equipos = new Set(plan.trabajos.map((t) => `${t.asignado.tipo}:${t.asignado.id}`)).size;
  doc.text(`${n} trabajo${n === 1 ? "" : "s"} · ${equipos} equipo${equipos === 1 ? "" : "s"}`, 12, 29);

  const estadoTexto = plan.confirmada_en
    ? `Confirmada por ${plan.confirmada_por_nombre || "—"} el ${new Date(plan.confirmada_en).toLocaleString("es")}`
    : "Sin confirmar";
  doc.text(estadoTexto, 12, 34);

  const filas = [...plan.trabajos]
    .sort((a, b) => nombreDe(a.asignado).localeCompare(nombreDe(b.asignado)))
    .map((t) => [
      nombreDe(t.asignado),
      ETIQUETA_TIPO[t.tipo],
      t.nombre,
      t.telefono || "",
      t.direccion,
      t.oferta_nombre || t.oferta_numero || "",
      t.nota || "",
      ETIQUETA_ESTADO_TRABAJO[t.estado],
    ]);

  autoTable(doc, {
    startY: 39,
    head: [["Equipo", "Tipo", "Cliente", "Teléfono", "Dirección", "Oferta", "Nota", "Estado"]],
    body: filas,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2, textColor: [40, 40, 40] },
    headStyles: { fillColor: VERDE, textColor: [255, 255, 255], fontSize: 8 },
    margin: { left: 12, right: 12 },
  });

  return doc;
}

export const ExportPlanificacionService = {
  /** Descarga el plan del día como PDF. */
  descargar(plan: Planificacion, tituloFecha: string): void {
    const doc = construirDoc(plan, tituloFecha);
    doc.save(`planificacion_${plan.fecha}.pdf`);
  },

  /** Abre el plan en una pestaña nueva y dispara el diálogo de impresión. */
  imprimir(plan: Planificacion, tituloFecha: string): void {
    const doc = construirDoc(plan, tituloFecha);
    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(pdfUrl, "_blank");
    if (printWindow) {
      // El "load" de la pestaña es del documento que envuelve el visor de PDF,
      // no de que el visor ya haya pintado el contenido: imprimir en ese
      // instante saca páginas en blanco. Un pequeño margen le da tiempo.
      printWindow.onload = () => {
        setTimeout(() => printWindow.print(), 700);
      };
    }
  },
};
