import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  ItemPresupuesto,
  PresupuestoLogistica,
  SedePresupuesto,
} from "@/lib/types/feats/presupuesto-logistica/presupuesto-logistica-types";
import {
  ESTADO_PRESUPUESTO_LABEL,
  nombreMes,
} from "@/lib/types/feats/presupuesto-logistica/presupuesto-logistica-types";

const VERDE: [number, number, number] = [16, 122, 87];
const GRIS_TEXTO: [number, number, number] = [80, 80, 80];
const GRIS_LINEA: [number, number, number] = [210, 210, 210];

const imageToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return "";
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || "");
      reader.onerror = () => reject(new Error("No se pudo leer el logo"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
};

const resolveLogoBase64 = async (): Promise<string> => {
  const candidatos = ["/brand/suncar-v1-iso.png", "/logo Suncar.png", "/logo.png"];
  for (const url of candidatos) {
    const base64 = await imageToBase64(url);
    if (base64) return base64;
  }
  return "";
};

const fmt = (valor: number, decimales = 2): string =>
  valor.toLocaleString("es-ES", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });

const fmtImporte = (item: ItemPresupuesto): string =>
  item.importe === null || item.moneda === null
    ? ""
    : `${fmt(item.importe)} ${item.moneda}`;

const fechaLarga = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const fechaHora = (fecha: Date): string =>
  `${fecha.toLocaleDateString("es-ES")} ${fecha.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

/**
 * Marca de agua diagonal con el estado del documento.
 *
 * No es decoración: un borrador circulando sin marca es la vía habitual de que
 * un presupuesto sin aprobar se acabe gastando. Solo el aprobado sale limpio.
 */
const pintarMarcaDeAgua = (doc: jsPDF, estado: PresupuestoLogistica["estado"]) => {
  if (estado === "aprobada") return;

  const texto: Record<string, string> = {
    borrador: "BORRADOR",
    enviada: "PENDIENTE DE APROBACIÓN",
    devuelta: "DEVUELTO PARA AJUSTE",
    anulada: "ANULADO",
  };
  const etiqueta = texto[estado];
  if (!etiqueta) return;

  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();

  for (let pagina = 1; pagina <= total; pagina += 1) {
    doc.setPage(pagina);
    doc.saveGraphicsState();
    // @ts-expect-error GState existe en runtime pero no está en los tipos de jsPDF
    doc.setGState(new doc.GState({ opacity: 0.12 }));
    doc.setTextColor(200, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(etiqueta.length > 12 ? 34 : 54);
    doc.text(etiqueta, ancho / 2, alto / 2, {
      align: "center",
      angle: 32,
      baseline: "middle",
    });
    doc.restoreGraphicsState();
  }
};

const pintarCabecera = (
  doc: jsPDF,
  presupuesto: PresupuestoLogistica,
  logo: string,
): number => {
  const ancho = doc.internal.pageSize.getWidth();
  const altoCabecera = 30;

  doc.setFillColor(...VERDE);
  doc.rect(0, 0, ancho, altoCabecera, "F");

  if (logo) {
    const lado = 22;
    try {
      doc.addImage(logo, "PNG", ancho - lado - 8, (altoCabecera - lado) / 2, lado, lado);
    } catch {
      // Un logo ilegible no debe impedir que salga el documento.
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(presupuesto.titulo, 10, 13, { maxWidth: ancho - 50 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const periodo = `${nombreMes(presupuesto.mes)} ${presupuesto.anio}`;
  const tipo =
    presupuesto.tipo === "extraordinario" ? " · Extraordinario" : "";
  doc.text(`${periodo}${tipo}  ·  ${presupuesto.numero}`, 10, altoCabecera - 8);

  return altoCabecera + 8;
};

const pintarDatosCabecera = (
  doc: jsPDF,
  presupuesto: PresupuestoLogistica,
  y: number,
): number => {
  doc.setTextColor(...GRIS_TEXTO);
  doc.setFontSize(9);

  doc.setFont("helvetica", "bold");
  doc.text("Confeccionado:", 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(presupuesto.confeccionado_por_nombre || "—", 40, y);

  if (presupuesto.confeccionado_por_cargo) {
    doc.setFontSize(8);
    doc.text(presupuesto.confeccionado_por_cargo, 40, y + 4.5);
    doc.setFontSize(9);
  }

  const ancho = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.text("Estado:", ancho - 70, y);
  doc.setFont("helvetica", "normal");
  doc.text(ESTADO_PRESUPUESTO_LABEL[presupuesto.estado], ancho - 52, y);

  doc.setFont("helvetica", "bold");
  doc.text("Tasa aplicada:", ancho - 70, y + 5);
  doc.setFont("helvetica", "normal");
  doc.text(`${fmt(presupuesto.tasa_cup_por_usd, 2)} CUP = 1 USD`, ancho - 52, y + 5);

  return y + 14;
};

const pintarBloqueSede = (
  doc: jsPDF,
  sede: SedePresupuesto,
  yInicial: number,
): number => {
  const usaActividad = sede.items.some((i) => i.actividad);
  const usaCantidadUm = sede.items.some((i) => i.cantidad_um);

  const head: string[] = ["No."];
  if (usaActividad) head.push("Actividad");
  head.push(usaActividad ? "Materiales/PPA" : "Materiales");
  head.push(usaActividad ? "Área" : "Local");
  if (usaCantidadUm) head.push("U/M");
  head.push("Importe");

  const body = sede.items.map((item) => {
    const fila: string[] = [String(item.numero)];
    if (usaActividad) fila.push(item.actividad || "");
    fila.push(item.material);
    fila.push(item.local || "");
    if (usaCantidadUm) fila.push(item.cantidad_um || "");
    fila.push(fmtImporte(item));
    return fila;
  });

  doc.setTextColor(...VERDE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(sede.sede_nombre, 10, yInicial);

  autoTable(doc, {
    startY: yInicial + 2,
    head: [head],
    body,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 1.8, textColor: [40, 40, 40] },
    headStyles: { fillColor: VERDE, textColor: [255, 255, 255], fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      [head.length - 1]: { halign: "right", cellWidth: 32 },
    },
    margin: { left: 10, right: 10 },
  });

  return (
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? yInicial
  ) + 7;
};

/**
 * Tabla de totales. Con <=6 bloques se pinta como en el Word: una columna por
 * sede y una fila por moneda. A partir de ahí no cabe ni en horizontal, así que
 * se transpone (sedes en filas) sin perder ninguna cifra.
 */
const pintarTotales = (doc: jsPDF, presupuesto: PresupuestoLogistica, y: number) => {
  const { totales } = presupuesto;
  const tasa = totales.tasa_cup_por_usd;

  doc.setTextColor(...VERDE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Presupuesto Total", 10, y);

  if (totales.layout_tabla === "ancha") {
    const head = [
      "Importe",
      ...totales.por_sede.map((s) => s.sede_nombre),
      "Total",
      "Total USD",
    ];
    const filaUsd = [
      "USD",
      ...totales.por_sede.map((s) => fmt(s.total_usd)),
      fmt(totales.total_usd),
      fmt(totales.total_usd),
    ];
    const filaCup = [
      "CUP",
      ...totales.por_sede.map((s) => fmt(s.total_cup)),
      fmt(totales.total_cup),
      fmt(totales.total_cup_en_usd),
    ];
    const filaTotal = [
      "TOTAL GENERAL",
      ...totales.por_sede.map(() => ""),
      "",
      `${fmt(totales.total_general_usd)} USD`,
    ];

    autoTable(doc, {
      startY: y + 2,
      head: [head],
      body: [filaUsd, filaCup, filaTotal],
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 1.8, halign: "right" },
      headStyles: { fillColor: VERDE, textColor: [255, 255, 255], halign: "center" },
      columnStyles: { 0: { halign: "left", fontStyle: "bold" } },
      didParseCell: (data) => {
        if (data.section === "body" && data.row.index === 2) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [236, 247, 242];
        }
      },
      margin: { left: 10, right: 10 },
    });
  } else {
    const body = totales.por_sede.map((s) => [
      s.sede_nombre,
      fmt(s.total_cup),
      fmt(s.total_usd),
      fmt(s.total_en_usd),
    ]);
    body.push([
      "TOTAL GENERAL",
      fmt(totales.total_cup),
      fmt(totales.total_usd),
      fmt(totales.total_general_usd),
    ]);

    autoTable(doc, {
      startY: y + 2,
      head: [["Bloque", "Importe CUP", "Importe USD", "Total en USD"]],
      body,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2, halign: "right" },
      headStyles: { fillColor: VERDE, textColor: [255, 255, 255], halign: "center" },
      columnStyles: { 0: { halign: "left", cellWidth: 70 } },
      didParseCell: (data) => {
        if (data.section === "body" && data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [236, 247, 242];
        }
      },
      margin: { left: 10, right: 10 },
    });
  }

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRIS_TEXTO);
  doc.text(
    `El total general convierte el importe en CUP a razón de ${fmt(tasa, 2)} CUP por 1 USD.`,
    10,
    finalY + 4,
  );

  return finalY + 10;
};

const pintarFirmas = (doc: jsPDF, presupuesto: PresupuestoLogistica, y: number) => {
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const yFirmas = Math.min(Math.max(y + 10, alto - 45), alto - 35);

  const columna = (x: number, ancho: number, titulo: string, nombre: string, cargo: string, fecha: string) => {
    doc.setDrawColor(...GRIS_LINEA);
    doc.line(x, yFirmas, x + ancho, yFirmas);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GRIS_TEXTO);
    doc.text(titulo, x, yFirmas + 4);
    doc.setFont("helvetica", "normal");
    doc.text(nombre || "—", x, yFirmas + 8.5);
    if (cargo) doc.text(cargo, x, yFirmas + 12.5);
    if (fecha) {
      doc.setFontSize(7);
      doc.text(fecha, x, yFirmas + 16.5);
    }
  };

  const anchoCol = (ancho - 30) / 2;
  columna(
    10,
    anchoCol,
    "Confeccionado por",
    presupuesto.confeccionado_por_nombre || "",
    presupuesto.confeccionado_por_cargo || "",
    fechaLarga(presupuesto.fecha_creacion),
  );
  columna(
    ancho - 10 - anchoCol,
    anchoCol,
    presupuesto.estado === "aprobada" ? "Aprobado por" : "Pendiente de aprobación",
    presupuesto.aprobado_por_nombre || "",
    presupuesto.aprobado_por_cargo || "",
    fechaLarga(presupuesto.aprobado_en),
  );
};

const pintarPie = (doc: jsPDF, usuario: string) => {
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  const sello = `Documento exportado el ${fechaHora(new Date())} por ${usuario || "usuario no identificado"}`;

  for (let pagina = 1; pagina <= total; pagina += 1) {
    doc.setPage(pagina);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRIS_TEXTO);
    doc.text(sello, 10, alto - 6);
    doc.text(`Página ${pagina} de ${total}`, ancho - 10, alto - 6, { align: "right" });
  }
};

export async function exportarPresupuestoPDF(
  presupuesto: PresupuestoLogistica,
  usuarioQueExporta: string,
): Promise<void> {
  // Horizontal siempre: los bloques del documento real llevan hasta 6 columnas
  // y la tabla de totales ancha no cabe en vertical.
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const logo = await resolveLogoBase64();

  let y = pintarCabecera(doc, presupuesto, logo);
  y = pintarDatosCabecera(doc, presupuesto, y);

  const sedesOrdenadas = [...presupuesto.sedes].sort((a, b) => a.orden - b.orden);
  const alto = doc.internal.pageSize.getHeight();

  for (const sede of sedesOrdenadas) {
    if (y > alto - 55) {
      doc.addPage();
      y = 15;
    }
    y = pintarBloqueSede(doc, sede, y);
  }

  if (y > alto - 75) {
    doc.addPage();
    y = 15;
  }
  y = pintarTotales(doc, presupuesto, y);

  pintarFirmas(doc, presupuesto, y);
  pintarMarcaDeAgua(doc, presupuesto.estado);
  pintarPie(doc, usuarioQueExporta);

  const periodo = `${String(presupuesto.mes).padStart(2, "0")}-${presupuesto.anio}`;
  doc.save(`Presupuesto Logistica ${periodo} ${presupuesto.numero}.pdf`);
}
