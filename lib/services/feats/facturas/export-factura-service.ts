import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import type {
  Factura,
  ItemVale,
} from "@/lib/types/feats/facturas/factura-types";

type FacturaExportRow = {
  item: number;
  descripcion: string;
  um: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  valeSalidaCodigo: string;
  valeSalidaId: string;
};

export interface FacturaExportClienteData {
  numero?: string | null;
  nombre?: string | null;
  carnet_identidad?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  provincia_montaje?: string | null;
  municipio?: string | null;
}

export interface FacturaExportMeta {
  titular: "cliente" | "brigada";
  cliente?: FacturaExportClienteData | null;
  responsable_nombre?: string | null;
  responsable_ci?: string | null;
}

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const formatMoney = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

const formatDate = (value?: string): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-ES");
};

const sanitizeFilename = (value: string): string =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60);

const fallbackValeCode = (id: string): string => {
  const safe = id.trim();
  if (!safe) return "-";
  return `VS-${safe.slice(-6).toUpperCase()}`;
};

const cleanText = (value?: string | null): string => {
  const text = (value || "").toString().trim();
  return text || "-";
};

const imageToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return "";
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || "");
      reader.onerror = () =>
        reject(new Error("No se pudo convertir la imagen a base64"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
};

const resolveLogoBase64 = async (): Promise<string> => {
  const logoCandidates = ["/logo Suncar.png", "/logo.png"];
  for (const logoUrl of logoCandidates) {
    const base64 = await imageToBase64(logoUrl);
    if (base64) return base64;
  }
  return "";
};

const buildRows = (
  factura: Factura,
  valeSalidaCodeMap?: Map<string, string>,
): FacturaExportRow[] => {
  const rows: FacturaExportRow[] = [];
  let itemIndex = 1;

  const vales = [...(factura.vales || [])].sort((a, b) => {
    const dateA = a.fecha ? new Date(a.fecha).getTime() : 0;
    const dateB = b.fecha ? new Date(b.fecha).getTime() : 0;
    return dateA - dateB;
  });

  vales.forEach((vale) => {
    const valeSalidaId = (vale.id_vale_salida || "").toString().trim();
    const valeSalidaCodigo = valeSalidaId
      ? valeSalidaCodeMap?.get(valeSalidaId) || fallbackValeCode(valeSalidaId)
      : "Manual";

    (vale.items || []).forEach((item: ItemVale) => {
      const cantidad = toNumber(item.cantidad);
      const precioUnitario = toNumber(item.precio);
      const um = ((item as ItemVale & { um?: string }).um || "U").toString();

      rows.push({
        item: itemIndex++,
        descripcion: cleanText(item.descripcion),
        um: cleanText(um),
        cantidad,
        precioUnitario,
        total: cantidad * precioUnitario,
        valeSalidaCodigo,
        valeSalidaId: valeSalidaId || "-",
      });
    });
  });

  return rows;
};

const getFacturaTotal = (
  factura: Factura,
  rows: FacturaExportRow[],
): number => {
  const totalFactura = toNumber(factura.total);
  if (totalFactura > 0) return totalFactura;
  return rows.reduce((sum, row) => sum + row.total, 0);
};

const getContactTitle = (meta?: FacturaExportMeta): string =>
  meta?.titular === "brigada" ? "Brigada" : "Cliente";

const getContactLines = (
  factura: Factura,
  meta?: FacturaExportMeta,
): Array<{ label: string; value: string }> => {
  if (meta?.titular === "brigada") {
    return [
      {
        label: "Responsable",
        value: cleanText(
          meta.responsable_nombre ||
            factura.nombre_responsable ||
            factura.nombre_cliente,
        ),
      },
      {
        label: "CI Responsable",
        value: cleanText(meta.responsable_ci || factura.trabajador_ci || null),
      },
      {
        label: "Tipo",
        value: "Brigada",
      },
    ];
  }

  const cliente = meta?.cliente || {};
  const provinciaMunicipio = [cliente.provincia_montaje, cliente.municipio]
    .map((value) => cleanText(value))
    .filter((value) => value !== "-")
    .join(" / ");

  return [
    {
      label: "Nombre",
      value: cleanText(cliente.nombre || factura.nombre_cliente),
    },
    {
      label: "Codigo",
      value: cleanText(cliente.numero || factura.cliente_id),
    },
    {
      label: "CI",
      value: cleanText(cliente.carnet_identidad),
    },
    {
      label: "Telefono",
      value: cleanText(cliente.telefono),
    },
    {
      label: "Direccion",
      value: cleanText(cliente.direccion),
    },
    {
      label: "Provincia/Municipio",
      value: cleanText(provinciaMunicipio || null),
    },
  ];
};

const getAnulacionLines = (
  factura: Factura,
): Array<{ label: string; value: string }> => {
  const isAnulada = factura.anulada === true;
  return [
    {
      label: "Estado",
      value: isAnulada ? "Anulada" : "Activa",
    },
    {
      label: "Motivo anulacion",
      value: isAnulada ? cleanText(factura.motivo_anulacion) : "-",
    },
    {
      label: "Responsable anulacion",
      value: isAnulada
        ? cleanText(
            factura.nombre_responsable || factura.responsable_nombre || null,
          )
        : "-",
    },
  ];
};

const drawDetailLine = (
  doc: jsPDF,
  label: string,
  value: string,
  startX: number,
  startY: number,
): number => {
  const valueX = startX + 30;
  doc.setFont("helvetica", "bold");
  doc.text(`${label}:`, startX, startY);
  doc.setFont("helvetica", "normal");
  const wrapped = doc.splitTextToSize(cleanText(value), 160);
  doc.text(wrapped, valueX, startY);
  return Math.max(5, wrapped.length * 4.3);
};

export class ExportFacturaService {
  static async exportarFacturaPDF(
    factura: Factura,
    valeSalidaCodeMap?: Map<string, string>,
    meta?: FacturaExportMeta,
  ): Promise<void> {
    const rows = buildRows(factura, valeSalidaCodeMap);
    const total = getFacturaTotal(factura, rows);
    const filename = `factura_${sanitizeFilename(factura.numero_factura || "sin_numero")}.pdf`;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 12;
    let y = 12;

    const logo = await resolveLogoBase64();
    if (logo) {
      doc.addImage(logo, "PNG", marginX, y - 4, 26, 26);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("SUNCAR SRL", pageWidth / 2, y + 2, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      "Direccion: Calle 24/1era y 3ra #109, Miramar Playa",
      pageWidth / 2,
      y + 8,
      { align: "center" },
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(
      `FACTURA N ${factura.numero_factura || "-"}`,
      pageWidth - marginX,
      y + 2,
      { align: "right" },
    );

    doc.setFontSize(11);
    doc.text(
      `FECHA: ${formatDate(factura.fecha_creacion)}`,
      pageWidth - marginX,
      y + 8,
      { align: "right" },
    );

    y += 24;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(getContactTitle(meta), marginX, y);
    y += 6;

    const contactLines = getContactLines(factura, meta);
    contactLines.forEach((line) => {
      y += drawDetailLine(doc, line.label, line.value, marginX, y);
    });

    y += 2;
    const anulacionLines = getAnulacionLines(factura);
    anulacionLines.forEach((line) => {
      y += drawDetailLine(doc, line.label, line.value, marginX, y);
    });

    y += 4;

    autoTable(doc, {
      startY: y,
      head: [
        [
          "ITEM",
          "DESCRIPCION",
          "U/M",
          "CANTIDAD",
          "PRECIO UNIT",
          "TOTAL",
          "VALE SALIDA",
        ],
      ],
      body: rows.map((row) => [
        row.item,
        row.descripcion,
        row.um,
        row.cantidad.toFixed(2),
        formatMoney(row.precioUnitario),
        formatMoney(row.total),
        row.valeSalidaCodigo,
      ]),
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 1.8,
        valign: "middle",
      },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: 30,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 11 },
        1: { cellWidth: 63 },
        2: { halign: "center", cellWidth: 12 },
        3: { halign: "right", cellWidth: 22 },
        4: { halign: "right", cellWidth: 27 },
        5: { halign: "right", cellWidth: 24 },
        6: { halign: "center", cellWidth: 25 },
      },
      margin: { left: marginX, right: marginX },
    });

    const tableBottom = (doc as jsPDF & { lastAutoTable?: { finalY: number } })
      .lastAutoTable?.finalY;
    y = (tableBottom || y) + 8;

    const valesSalidaUnicos = Array.from(
      new Set(
        rows
          .map((row) => row.valeSalidaCodigo)
          .filter((codigo) => codigo && codigo !== "Manual"),
      ),
    );

    if (valesSalidaUnicos.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Vales de salida asociados:", marginX, y);
      doc.setFont("helvetica", "normal");
      const valesTxt = doc.splitTextToSize(valesSalidaUnicos.join(", "), 165);
      doc.text(valesTxt, marginX + 40, y);
      y += valesTxt.length * 4 + 2;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`TOTAL FACTURA: ${formatMoney(total)}`, pageWidth - marginX, y, {
      align: "right",
    });

    doc.save(filename);
  }

  static async exportarFacturaExcel(
    factura: Factura,
    valeSalidaCodeMap?: Map<string, string>,
    meta?: FacturaExportMeta,
  ): Promise<void> {
    const rows = buildRows(factura, valeSalidaCodeMap);
    const total = getFacturaTotal(factura, rows);
    const safeNumber = sanitizeFilename(factura.numero_factura || "sin_numero");
    const filename = `factura_${safeNumber}.xlsx`;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Factura");

    worksheet.columns = [
      { key: "item", width: 8 },
      { key: "descripcion", width: 46 },
      { key: "um", width: 9 },
      { key: "cantidad", width: 14 },
      { key: "precioUnitario", width: 16 },
      { key: "total", width: 16 },
      { key: "valeSalidaCodigo", width: 22 },
      { key: "valeSalidaId", width: 28 },
    ];

    worksheet.mergeCells("A1:H1");
    worksheet.getCell("A1").value = "SUNCAR SRL - FACTURA";
    worksheet.getCell("A1").font = { bold: true, size: 14 };

    worksheet.mergeCells("A2:H2");
    worksheet.getCell("A2").value = `Numero: ${factura.numero_factura || "-"}`;

    worksheet.mergeCells("A3:H3");
    worksheet.getCell("A3").value =
      `Fecha: ${formatDate(factura.fecha_creacion)}`;

    const titleRow = 4;
    worksheet.mergeCells(`A${titleRow}:H${titleRow}`);
    const titleCell = worksheet.getCell(`A${titleRow}`);
    titleCell.value = getContactTitle(meta);
    titleCell.font = { bold: true, size: 12 };

    let currentInfoRow = titleRow + 1;
    const contactLines = getContactLines(factura, meta);
    contactLines.forEach((line) => {
      worksheet.mergeCells(`A${currentInfoRow}:H${currentInfoRow}`);
      worksheet.getCell(`A${currentInfoRow}`).value =
        `${line.label}: ${line.value}`;
      currentInfoRow += 1;
    });

    currentInfoRow += 1;
    const anulacionLines = getAnulacionLines(factura);
    anulacionLines.forEach((line) => {
      worksheet.mergeCells(`A${currentInfoRow}:H${currentInfoRow}`);
      worksheet.getCell(`A${currentInfoRow}`).value =
        `${line.label}: ${line.value}`;
      currentInfoRow += 1;
    });

    const headerRowNumber = currentInfoRow + 1;
    const headerRow = worksheet.getRow(headerRowNumber);
    const headers = [
      "ITEM",
      "DESCRIPCION",
      "U/M",
      "CANTIDAD",
      "PRECIO UNITARIO",
      "TOTAL",
      "VALE SALIDA",
      "ID_VALE_SALIDA",
    ];
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF374151" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    let currentRow = headerRowNumber + 1;
    rows.forEach((row) => {
      worksheet.getCell(`A${currentRow}`).value = row.item;
      worksheet.getCell(`B${currentRow}`).value = row.descripcion;
      worksheet.getCell(`C${currentRow}`).value = row.um;
      worksheet.getCell(`D${currentRow}`).value = row.cantidad;
      worksheet.getCell(`E${currentRow}`).value = row.precioUnitario;
      worksheet.getCell(`F${currentRow}`).value = row.total;
      worksheet.getCell(`G${currentRow}`).value = row.valeSalidaCodigo;
      worksheet.getCell(`H${currentRow}`).value = row.valeSalidaId;

      ["A", "B", "C", "D", "E", "F", "G", "H"].forEach((col) => {
        const cell = worksheet.getCell(`${col}${currentRow}`);
        cell.border = {
          top: { style: "thin", color: { argb: "FFD1D5DB" } },
          bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
          left: { style: "thin", color: { argb: "FFD1D5DB" } },
          right: { style: "thin", color: { argb: "FFD1D5DB" } },
        };
      });

      worksheet.getCell(`D${currentRow}`).numFmt = "#,##0.00";
      worksheet.getCell(`E${currentRow}`).numFmt = "$#,##0.00";
      worksheet.getCell(`F${currentRow}`).numFmt = "$#,##0.00";
      currentRow += 1;
    });

    worksheet.mergeCells(`A${currentRow + 1}:H${currentRow + 1}`);
    const totalCell = worksheet.getCell(`A${currentRow + 1}`);
    totalCell.value = `TOTAL FACTURA: ${formatMoney(total)}`;
    totalCell.font = { bold: true, size: 12 };
    totalCell.alignment = { horizontal: "right" };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
