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

/** Filtros activos en pantalla, para dejarlos escritos en el propio PDF. */
export interface FiltrosCobrosPendientes {
  /** Texto del alcance de estado ("Obras terminadas", "Todos los estados", …). */
  estado: string;
  /** Comercial seleccionado, o null si son todos. */
  comercial?: string | null;
  /**
   * Añade la columna "Estado" al detalle. Solo tiene sentido cuando el informe
   * abarca varios estados: en el informe por defecto todas las filas son
   * "Equipo instalado con éxito" y la columna sería ruido.
   */
  mostrarEstadoCliente?: boolean;
}

/**
 * PDF con las obras que todavía tienen saldo por cobrar. Por defecto son las
 * ya terminadas (cliente en estado "Equipo instalado con éxito"), pero el
 * informe se puede acotar por estado del cliente y por comercial: los filtros
 * aplicados se imprimen en la portada para que el PDF no se lea fuera de
 * contexto. Una fila por oferta, ordenadas de mayor a menor deuda.
 */
export function generarCobrosPendientesPdf(
  filas: ObraTerminada[],
  filtros: FiltrosCobrosPendientes = { estado: "Obras terminadas" },
): void {
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
  doc.text("Cobros pendientes", 14, 25);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Estado del cliente: ${filtros.estado}  ·  Comercial: ${filtros.comercial || "Todos"}`,
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

  // Con varios estados en juego hace falta la columna "Estado"; el ancho sale
  // de la columna "Oferta", la única con holgura de sobra.
  const conEstado = filtros.mostrarEstadoCliente === true;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [
      [
        "#",
        "Cliente",
        "Cód. cliente",
        "Oferta",
        "Cód. oferta",
        ...(conEstado ? ["Estado"] : []),
        "Instalado el",
        "Comercial",
        "Precio final",
        "Pagado",
        "Pendiente",
      ],
    ],
    body: ordenadas.map((f, i) => [
      String(i + 1),
      // Ojo: el nombre del cliente es `cliente_nombre`. `nombre_completo` es el
      // nombre descriptivo largo de la OFERTA, no del cliente.
      f.cliente_nombre || "—",
      f.cliente_numero || "—",
      f.nombre_completo || "—",
      f.numero_oferta || "—",
      ...(conEstado ? [f.estado_cliente || "—"] : []),
      fmtFecha(f.fecha_equipo_instalado),
      f.comercial || "—",
      fmtMoney(Number(f.precio_final ?? 0)),
      fmtMoney(Number(f.total_pagado ?? 0)),
      fmtMoney(Number(f.monto_pendiente ?? 0)),
    ]),
    styles: {
      fontSize: 7,
      textColor: C.ink,
      cellPadding: 1.5,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: { fillColor: C.verdeClaro, textColor: C.ink, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 249] },
    // Anchos fijos: suman los 269 mm utiles de un A4 apaisado con margenes de 14.
    columnStyles: conEstado
      ? {
          0: { cellWidth: 7, halign: "right" },
          1: { cellWidth: 40 },
          2: { cellWidth: 22 },
          3: { cellWidth: 34 },
          4: { cellWidth: 28 },
          5: { cellWidth: 28 },
          6: { cellWidth: 18, halign: "center" },
          7: { cellWidth: 32 },
          8: { cellWidth: 20, halign: "right" },
          9: { cellWidth: 19, halign: "right" },
          10: { cellWidth: 21, halign: "right", fontStyle: "bold", textColor: C.rojo },
        }
      : {
          0: { cellWidth: 7, halign: "right" },
          1: { cellWidth: 40 },
          2: { cellWidth: 22 },
          3: { cellWidth: 62 },
          4: { cellWidth: 28 },
          5: { cellWidth: 18, halign: "center" },
          6: { cellWidth: 32 },
          7: { cellWidth: 20, halign: "right" },
          8: { cellWidth: 19, halign: "right" },
          9: { cellWidth: 21, halign: "right", fontStyle: "bold", textColor: C.rojo },
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
  const sufijo = filtros.comercial
    ? `_${filtros.comercial.replace(/[^\p{L}\p{N}]+/gu, "_")}`
    : "";
  doc.save(`Cobros_pendientes${sufijo}_${hoy}.pdf`);
}
