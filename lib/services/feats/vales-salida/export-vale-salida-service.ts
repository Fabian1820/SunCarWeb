import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { InventarioService } from "../inventario/inventario-service";
import type {
  ValeSalida,
  ValeSalidaMaterialItemDetalle,
} from "../../../api-types";

type ValeClienteInfo = {
  nombre: string;
  numero: string;
  telefono: string;
  direccion: string;
};

type ValeHeaderInfo = {
  empresa: string;
  codigoVale: string;
  estado: string;
  tipoSolicitud: string;
  codigoSolicitud: string;
  fechaCreacion: string;
  almacen: string;
  despachadoPor: string;
  recibidoPor: string;
  autorizadoPor: string;
  cantidadMateriales: number;
  movimientosGenerados: number;
};

const ESTADO_LABEL: Record<string, string> = {
  usado: "Usado",
  anulado: "Anulado",
};
const EMPRESA_NOMBRE = "Empresa Solar Carros";
const AUTORIZADO_POR = "Alexander Calero";

const formatDateTime = (value?: string): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const sanitizeFilenamePart = (value: string): string =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60);

const resolveSolicitudTipo = (vale: ValeSalida): "material" | "venta" => {
  if (vale.solicitud_tipo === "venta") return "venta";
  if (vale.solicitud_venta || vale.solicitud_venta_id) return "venta";
  return "material";
};

const getValeCode = (vale: ValeSalida): string =>
  vale.codigo || `VALE-${vale.id.slice(-6).toUpperCase()}`;

const getSolicitudCode = (vale: ValeSalida): string =>
  vale.solicitud_material?.codigo ||
  vale.solicitud_venta?.codigo ||
  vale.solicitud?.codigo ||
  vale.solicitud_material_id?.slice(-6).toUpperCase() ||
  vale.solicitud_venta_id?.slice(-6).toUpperCase() ||
  vale.solicitud_id?.slice(-6).toUpperCase() ||
  "-";

const getAlmacenName = (vale: ValeSalida): string =>
  vale.solicitud_material?.almacen?.nombre ||
  vale.solicitud_venta?.almacen?.nombre ||
  vale.solicitud?.almacen?.nombre ||
  "-";

const getCreadoPorName = (vale: ValeSalida): string =>
  vale.trabajador?.nombre || vale.creado_por_ci || "-";

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const getRecibidoPorName = (vale: ValeSalida): string => {
  const root = vale as unknown as Record<string, unknown>;
  const solicitudMaterial = vale.solicitud_material as unknown as
    | Record<string, unknown>
    | null
    | undefined;
  const solicitudVenta = vale.solicitud_venta as unknown as
    | Record<string, unknown>
    | null
    | undefined;
  const solicitudLegacy = vale.solicitud as unknown as
    | Record<string, unknown>
    | null
    | undefined;

  const explicitValue =
    toNonEmptyString(root.recogio_por) ||
    toNonEmptyString(root.recogido_por) ||
    toNonEmptyString(root.recibido_por) ||
    toNonEmptyString(solicitudMaterial?.recogio_por) ||
    toNonEmptyString(solicitudMaterial?.recogido_por) ||
    toNonEmptyString(solicitudMaterial?.recibido_por) ||
    toNonEmptyString(solicitudVenta?.recogio_por) ||
    toNonEmptyString(solicitudVenta?.recogido_por) ||
    toNonEmptyString(solicitudVenta?.recibido_por) ||
    toNonEmptyString(solicitudLegacy?.recogio_por) ||
    toNonEmptyString(solicitudLegacy?.recogido_por) ||
    toNonEmptyString(solicitudLegacy?.recibido_por);

  if (explicitValue) return explicitValue;

  return (
    vale.solicitud_material?.trabajador?.nombre ||
    vale.solicitud_venta?.trabajador?.nombre ||
    vale.solicitud?.trabajador?.nombre ||
    "Brigada no definida"
  );
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const getClienteInfo = (vale: ValeSalida): ValeClienteInfo => {
  const cliente =
    vale.solicitud_venta?.cliente_venta ||
    vale.solicitud_venta?.cliente ||
    vale.solicitud_material?.cliente_venta ||
    vale.solicitud_material?.cliente ||
    vale.solicitud?.cliente_venta ||
    vale.solicitud?.cliente ||
    null;

  return {
    nombre: cliente?.nombre || "Sin cliente asociado",
    numero: cliente?.numero || "-",
    telefono: cliente?.telefono || "-",
    direccion: cliente?.direccion || "-",
  };
};

const getMaterialCode = (material: ValeSalidaMaterialItemDetalle): string =>
  material.material?.codigo ||
  material.material_codigo ||
  material.codigo ||
  material.material_id ||
  "-";

const normalizeMaterialCode = (value: string): string =>
  value.trim().toUpperCase();

const getMaterialDescription = (
  material: ValeSalidaMaterialItemDetalle,
): string =>
  material.material?.descripcion ||
  material.material?.nombre ||
  material.material_descripcion ||
  material.descripcion ||
  "Sin descripción";

const getMaterialUm = (material: ValeSalidaMaterialItemDetalle): string =>
  material.um || material.material?.um || "U";

const getMaterialPrice = (material: ValeSalidaMaterialItemDetalle): number => {
  const record = material as unknown as Record<string, unknown>;
  const nestedMaterial = material.material as unknown as
    | Record<string, unknown>
    | undefined;

  return (
    toNumberOrNull(nestedMaterial?.precio) ??
    toNumberOrNull(record.precio_unitario) ??
    toNumberOrNull(record.precio) ??
    0
  );
};

const getMaterialExistencia = (
  material: ValeSalidaMaterialItemDetalle,
  stockByCode?: Map<string, number>,
): number | null => {
  const record = material as unknown as Record<string, unknown>;
  const nestedMaterial = material.material as unknown as
    | Record<string, unknown>
    | undefined;

  const inlineExistencia =
    toNumberOrNull(record.saldo_existencia) ??
    toNumberOrNull(record.stock_restante) ??
    toNumberOrNull(record.stock_disponible) ??
    toNumberOrNull(record.stock_actual) ??
    toNumberOrNull(record.existencia_actual) ??
    toNumberOrNull(record.existencia_disponible) ??
    toNumberOrNull(record.cantidad_existencia) ??
    toNumberOrNull(record.cantidad_disponible) ??
    toNumberOrNull(record.existencia) ??
    toNumberOrNull(record.saldo) ??
    toNumberOrNull(record.stock) ??
    toNumberOrNull(nestedMaterial?.saldo_existencia) ??
    toNumberOrNull(nestedMaterial?.stock_restante) ??
    toNumberOrNull(nestedMaterial?.stock_disponible) ??
    toNumberOrNull(nestedMaterial?.stock_actual) ??
    toNumberOrNull(nestedMaterial?.existencia_actual) ??
    toNumberOrNull(nestedMaterial?.existencia_disponible) ??
    toNumberOrNull(nestedMaterial?.cantidad_existencia) ??
    toNumberOrNull(nestedMaterial?.cantidad_disponible) ??
    toNumberOrNull(nestedMaterial?.existencia) ??
    toNumberOrNull(nestedMaterial?.saldo) ??
    toNumberOrNull(nestedMaterial?.stock) ??
    null;

  if (inlineExistencia !== null) return inlineExistencia;
  if (!stockByCode) return null;

  const materialCode = normalizeMaterialCode(getMaterialCode(material));
  if (!materialCode || materialCode === "-") return null;
  const stock = stockByCode.get(materialCode);
  return typeof stock === "number" && Number.isFinite(stock) ? stock : null;
};

const formatMoney = (value: number): string =>
  new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const getValeHeaderInfo = (vale: ValeSalida): ValeHeaderInfo => {
  const tipo = resolveSolicitudTipo(vale);
  return {
    empresa: EMPRESA_NOMBRE,
    codigoVale: getValeCode(vale),
    estado: ESTADO_LABEL[vale.estado || ""] || "Usado",
    tipoSolicitud:
      tipo === "venta" ? "Solicitud de venta" : "Solicitud de material",
    codigoSolicitud: getSolicitudCode(vale),
    fechaCreacion: formatDateTime(vale.fecha_creacion),
    almacen: getAlmacenName(vale),
    despachadoPor: getCreadoPorName(vale),
    recibidoPor: getRecibidoPorName(vale),
    autorizadoPor: AUTORIZADO_POR,
    cantidadMateriales: vale.materiales?.length || 0,
    movimientosGenerados: vale.movimientos_ids?.length || 0,
  };
};

const downloadExcelBuffer = async (
  buffer: ExcelJS.Buffer,
  filename: string,
): Promise<void> => {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};

const imageToBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const loadLogoBase64 = async (): Promise<string | null> => {
  const logoCandidates = ["/logo Suncar.png", "/logo.png"];
  for (const logoUrl of logoCandidates) {
    const base64 = await imageToBase64(logoUrl);
    if (base64) return base64;
  }
  return null;
};

const getValeAlmacenId = (vale: ValeSalida): string | null =>
  vale.solicitud_material?.almacen?.id ||
  vale.solicitud_venta?.almacen?.id ||
  vale.solicitud?.almacen?.id ||
  null;

const loadStockByCode = async (
  vale: ValeSalida,
): Promise<Map<string, number>> => {
  const stockByCode = new Map<string, number>();
  const almacenId = getValeAlmacenId(vale);
  if (!almacenId) return stockByCode;

  try {
    const { data: stockRows } = await InventarioService.getStock({
      almacen_id: almacenId,
      limit: 200,
    });
    stockRows.forEach((row) => {
      const code = normalizeMaterialCode(String(row.material_codigo || ""));
      if (!code) return;
      const cantidad = toNumberOrNull(row.cantidad);
      if (cantidad === null) return;
      stockByCode.set(code, cantidad);
    });
  } catch (error) {
  }

  return stockByCode;
};

const applySectionTitleStyle = (row: ExcelJS.Row): void => {
  row.font = { bold: true, color: { argb: "FF111827" } };
};

const applyMetadataLabelStyle = (cell: ExcelJS.Cell): void => {
  cell.font = { bold: true, color: { argb: "FF1F2937" } };
};

export class ExportValeSalidaService {
  static async exportarPDF(vale: ValeSalida): Promise<void> {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const header = getValeHeaderInfo(vale);
    const cliente = getClienteInfo(vale);
    const materiales = vale.materiales || [];
    const stockByCode = await loadStockByCode(vale);

    const marginLeft = 14;
    const marginRight = 14;
    const contentWidth = pageWidth - marginLeft - marginRight;
    const logo = await loadLogoBase64();

    let y = 11;
    if (logo) {
      doc.addImage(logo, "PNG", marginLeft, 8, 22, 22);
    }

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(header.empresa, logo ? marginLeft + 26 : marginLeft, y + 2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.2);
    doc.text(
      `Almacén: ${header.almacen}`,
      logo ? marginLeft + 26 : marginLeft,
      y + 8,
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.text("Vale de entrega de almacén", pageWidth - marginRight, y + 2, {
      align: "right",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.7);
    doc.text(
      `Solicitud: ${header.codigoSolicitud}`,
      pageWidth - marginRight,
      y + 7,
      {
        align: "right",
      },
    );
    doc.text(`Código: ${header.codigoVale}`, pageWidth - marginRight, y + 12, {
      align: "right",
    });
    doc.text(
      `Fecha: ${header.fechaCreacion}`,
      pageWidth - marginRight,
      y + 17,
      {
        align: "right",
      },
    );

    y += 26;
    doc.setLineWidth(0.2);
    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 5;

    const columnGap = 8;
    const columnWidth = (contentWidth - columnGap) / 2;
    const leftColumnX = marginLeft;
    const rightColumnX = marginLeft + columnWidth + columnGap;
    const labelOffset = 24;

    const drawColumnTitle = (title: string, x: number, yPos: number): void => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.8);
      doc.text(title, x, yPos);
    };

    const drawField = (
      x: number,
      yPos: number,
      label: string,
      value: string,
      availableWidth: number,
    ): number => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(label, x, yPos);

      doc.setFont("helvetica", "normal");
      const textWidth = Math.max(10, availableWidth - labelOffset);
      const lines = doc.splitTextToSize(value || "-", textWidth);
      doc.text(lines, x + labelOffset, yPos);
      return Math.max(1, lines.length) * 4;
    };

    const columnsTopY = y;

    let leftY = columnsTopY;
    drawColumnTitle("Responsables", leftColumnX, leftY);
    leftY += 6;
    leftY += drawField(
      leftColumnX,
      leftY,
      "Despachado:",
      header.despachadoPor || "-",
      columnWidth,
    );
    leftY += 1;
    leftY += drawField(
      leftColumnX,
      leftY,
      "Recibido:",
      header.recibidoPor || "-",
      columnWidth,
    );
    leftY += 1;
    leftY += drawField(
      leftColumnX,
      leftY,
      "Autorizado:",
      header.autorizadoPor || "-",
      columnWidth,
    );

    let rightY = columnsTopY;
    drawColumnTitle("Datos del cliente", rightColumnX, rightY);
    rightY += 6;
    rightY += drawField(
      rightColumnX,
      rightY,
      "Nombre:",
      cliente.nombre || "-",
      columnWidth,
    );
    rightY += 1;
    rightY += drawField(
      rightColumnX,
      rightY,
      "No. cliente:",
      cliente.numero || "-",
      columnWidth,
    );
    rightY += 1;
    rightY += drawField(
      rightColumnX,
      rightY,
      "Teléfono:",
      cliente.telefono || "-",
      columnWidth,
    );
    rightY += 1;
    rightY += drawField(
      rightColumnX,
      rightY,
      "Dirección:",
      cliente.direccion || "-",
      columnWidth,
    );

    y = Math.max(leftY, rightY) + 3;

    doc.setLineWidth(0.2);
    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.2);
    doc.text("Materiales entregados", marginLeft, y);

    autoTable(doc, {
      startY: y + 2,
      margin: { left: marginLeft, right: marginRight },
      head: [
        ["Código", "Descripción", "U/M", "Cantidad", "N° Series", "Precio"],
      ],
      body:
        materiales.length > 0
          ? materiales.map((material) => {
              return [
                getMaterialCode(material),
                getMaterialDescription(material),
                getMaterialUm(material),
                String(material.cantidad || 0),
                material.numero_serie || "-",
                formatMoney(getMaterialPrice(material)),
              ];
            })
          : [["-", "Sin materiales", "-", "0", "-", "0.00"]],
      theme: "grid",
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        textColor: [0, 0, 0],
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 75 },
        2: { cellWidth: 12, halign: "center" },
        3: { cellWidth: 18, halign: "right" },
        4: { cellWidth: 28, halign: "center" },
        5: { cellWidth: 24, halign: "right" },
      },
    });

    let footerY =
      ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable
        ?.finalY || y + 30) + 7;

    if (footerY + 28 > pageHeight - marginRight) {
      doc.addPage();
      footerY = 22;
    }

    if (vale.estado === "anulado") {
      doc.rect(
        marginLeft,
        footerY - 5,
        pageWidth - marginLeft - marginRight,
        12,
      );
      doc.setFont("helvetica", "bold");
      doc.text("Vale anulado", marginLeft + 3, footerY - 1);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Motivo: ${vale.motivo_anulacion || "No especificado"}`,
        marginLeft + 3,
        footerY + 3,
      );
      footerY += 15;
    }

    const signatureLineY = footerY + 15;
    const blockWidth = 55;
    const gap = 6.5;
    const firstX = marginLeft;
    const secondX = firstX + blockWidth + gap;
    const thirdX = secondX + blockWidth + gap;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Despachado por:", firstX, signatureLineY - 7);
    doc.line(firstX, signatureLineY, firstX + blockWidth, signatureLineY);
    doc.setFont("helvetica", "normal");
    doc.text(header.despachadoPor, firstX, signatureLineY + 4);

    doc.setFont("helvetica", "bold");
    doc.text("Recibido por:", secondX, signatureLineY - 7);
    doc.line(secondX, signatureLineY, secondX + blockWidth, signatureLineY);
    doc.setFont("helvetica", "normal");
    doc.text(header.recibidoPor, secondX, signatureLineY + 4);

    doc.setFont("helvetica", "bold");
    doc.text("Autorizado por:", thirdX, signatureLineY - 7);
    doc.line(thirdX, signatureLineY, thirdX + blockWidth, signatureLineY);
    doc.setFont("helvetica", "normal");
    doc.text(header.autorizadoPor, thirdX, signatureLineY + 4);

    const fechaArchivo = new Date().toISOString().slice(0, 10);
    const filename = `Vale_Entrega_${sanitizeFilenamePart(header.codigoVale)}_${fechaArchivo}.pdf`;
    doc.save(filename);
  }
  static async exportarExcel(vale: ValeSalida): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Vale de Salida");

    const header = getValeHeaderInfo(vale);
    const cliente = getClienteInfo(vale);
    const materiales = vale.materiales || [];
    const logo = await loadLogoBase64();
    const stockByCode = await loadStockByCode(vale);

    worksheet.columns = [
      { key: "a", width: 20 },
      { key: "b", width: 35 },
      { key: "c", width: 22 },
      { key: "d", width: 30 },
      { key: "e", width: 12 },
      { key: "f", width: 12 },
      { key: "g", width: 26 },
      { key: "h", width: 18 },
    ];

    worksheet.mergeCells("A1:H1");
    worksheet.getCell("A1").value = "SUNCAR SRL - VALE DE ENTREGA DE ALMACÉN";
    worksheet.getCell("A1").font = {
      bold: true,
      size: 14,
      color: { argb: "FF111827" },
    };
    worksheet.getCell("A1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getRow(1).height = 24;

    if (logo) {
      const imageId = workbook.addImage({
        base64: logo,
        extension: logo.includes("image/jpeg") ? "jpeg" : "png",
      });
      worksheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 60, height: 24 },
      });
    }

    worksheet.mergeCells("A2:H2");
    worksheet.getCell("A2").value =
      "Documento de control de salidas de almacén - generado automáticamente";
    worksheet.getCell("A2").font = { size: 10, color: { argb: "FF4B5563" } };
    worksheet.getCell("A2").alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getRow(2).height = 18;

    worksheet.mergeCells("A4:H4");
    worksheet.getCell("A4").value = "Datos del Vale";
    applySectionTitleStyle(worksheet.getRow(4));

    worksheet.getCell("A5").value = "Empresa";
    worksheet.getCell("B5").value = header.empresa;
    worksheet.getCell("C5").value = "Almacén";
    worksheet.getCell("D5").value = header.almacen;

    worksheet.getCell("A6").value = "Código";
    worksheet.getCell("B6").value = header.codigoVale;
    worksheet.getCell("C6").value = "Fecha";
    worksheet.getCell("D6").value = header.fechaCreacion;

    worksheet.getCell("A7").value = "Tipo de solicitud";
    worksheet.getCell("B7").value = header.tipoSolicitud;
    worksheet.getCell("C7").value = "Solicitud";
    worksheet.getCell("D7").value = header.codigoSolicitud;

    worksheet.getCell("A8").value = "Despachado por";
    worksheet.getCell("B8").value = header.despachadoPor;
    worksheet.getCell("C8").value = "Recibido por";
    worksheet.getCell("D8").value = header.recibidoPor;

    worksheet.getCell("A9").value = "Autorizado por";
    worksheet.getCell("B9").value = header.autorizadoPor;
    worksheet.getCell("C9").value = "Estado";
    worksheet.getCell("D9").value = header.estado;
    worksheet.getCell("E9").value = "Movimientos";
    worksheet.getCell("F9").value = header.movimientosGenerados;

    ["A5", "C5", "A6", "C6", "A7", "C7", "A8", "C8", "A9", "C9", "E9"].forEach(
      (ref) => applyMetadataLabelStyle(worksheet.getCell(ref)),
    );

    worksheet.mergeCells("A11:H11");
    worksheet.getCell("A11").value = "Datos del Cliente";
    applySectionTitleStyle(worksheet.getRow(11));

    worksheet.getCell("A12").value = "Nombre";
    worksheet.getCell("B12").value = cliente.nombre;
    worksheet.getCell("C12").value = "Número";
    worksheet.getCell("D12").value = cliente.numero;

    worksheet.getCell("A13").value = "Teléfono";
    worksheet.getCell("B13").value = cliente.telefono;
    worksheet.getCell("C13").value = "Dirección";
    worksheet.getCell("D13").value = cliente.direccion;

    ["A12", "C12", "A13", "C13"].forEach((ref) =>
      applyMetadataLabelStyle(worksheet.getCell(ref)),
    );

    const tableStartRow = 15;
    worksheet.mergeCells(`A${tableStartRow}:H${tableStartRow}`);
    worksheet.getCell(`A${tableStartRow}`).value = "Detalle de Materiales";
    applySectionTitleStyle(worksheet.getRow(tableStartRow));

    const headerRow = tableStartRow + 1;
    const tableHeaders = [
      { cell: `A${headerRow}`, label: "Código" },
      { cell: `B${headerRow}`, label: "Descripción" },
      { cell: `E${headerRow}`, label: "UM" },
      { cell: `F${headerRow}`, label: "Cantidad" },
      { cell: `G${headerRow}`, label: "N° Series" },
      { cell: `H${headerRow}`, label: "Precio" },
    ];

    tableHeaders.forEach(({ cell, label }) => {
      const target = worksheet.getCell(cell);
      target.value = label;
      target.font = { bold: true, color: { argb: "FF111827" } };
      target.alignment = { horizontal: "center", vertical: "middle" };
      target.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };
    });

    const mergeDescriptionCell = (row: number): void => {
      worksheet.mergeCells(`B${row}:D${row}`);
    };

    let currentRow = headerRow + 1;
    materiales.forEach((material) => {
      mergeDescriptionCell(currentRow);

      worksheet.getCell(`A${currentRow}`).value = getMaterialCode(material);
      worksheet.getCell(`B${currentRow}`).value =
        getMaterialDescription(material);
      worksheet.getCell(`E${currentRow}`).value = getMaterialUm(material);
      worksheet.getCell(`F${currentRow}`).value = Number(
        material.cantidad || 0,
      );
      worksheet.getCell(`G${currentRow}`).value = material.numero_serie || "-";
      worksheet.getCell(`H${currentRow}`).value = getMaterialPrice(material);

      ["A", "B", "E", "F", "G", "H"].forEach((col) => {
        const cell = worksheet.getCell(`${col}${currentRow}`);
        cell.alignment = {
          vertical: "middle",
          horizontal:
            col === "E" || col === "G"
              ? "center"
              : col === "F" || col === "H"
                ? "right"
                : "left",
          wrapText: col === "B",
        };
        if (col === "H" && typeof cell.value === "number") {
          cell.numFmt = "#,##0.00";
        }
        cell.border = {
          top: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "thin", color: { argb: "FF000000" } },
          left: { style: "thin", color: { argb: "FF000000" } },
          right: { style: "thin", color: { argb: "FF000000" } },
        };
      });
      currentRow += 1;
    });

    const summaryRow = currentRow + 1;

    worksheet.mergeCells(`A${summaryRow}:G${summaryRow}`);
    worksheet.getCell(`A${summaryRow}`).value = "Total de materiales";
    worksheet.getCell(`A${summaryRow}`).font = { bold: true };
    worksheet.getCell(`H${summaryRow}`).value = header.cantidadMateriales;
    worksheet.getCell(`H${summaryRow}`).font = { bold: true };
    worksheet.getCell(`H${summaryRow}`).alignment = { horizontal: "right" };

    if (vale.estado === "anulado") {
      const anuladoRow = summaryRow + 2;
      worksheet.mergeCells(`A${anuladoRow}:H${anuladoRow}`);
      worksheet.getCell(`A${anuladoRow}`).value =
        `VALE ANULADO - Motivo: ${vale.motivo_anulacion || "No especificado"}`;
      worksheet.getCell(`A${anuladoRow}`).font = {
        bold: true,
        color: { argb: "FF111827" },
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const fechaArchivo = new Date().toISOString().slice(0, 10);
    const filename = `Vale_Entrega_${sanitizeFilenamePart(header.codigoVale)}_${fechaArchivo}`;
    await downloadExcelBuffer(buffer, filename);
  }
}
