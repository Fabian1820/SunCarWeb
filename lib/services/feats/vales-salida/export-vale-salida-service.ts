import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { MaterialService } from "../../../api-services";
import { imprimirPdf } from "../../../utils/imprimir-pdf";
import { parseFechaUtc } from "../../../utils/fecha-utc";
import type {
  ValeSalida,
  ValeSalidaMaterialItemDetalle,
} from "../../../api-types";

type MaterialPreciosVale = {
  precio?: number;
  precio_instaladora?: number;
  costo?: number;
  nombre?: string;
};

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
  devuelto: "Devuelto",
};
const EMPRESA_NOMBRE = "Empresa Solar Carros";
const AUTORIZADO_POR = "Alexander Calero";

const formatDateTime = (value?: string): string => {
  const date = parseFechaUtc(value);
  if (!date) return "-";
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

/**
 * Nombre del material a mostrar. El backend enriquece `material_nombre` desde el
 * catálogo; se cae al nombre/descripción embebidos si no viniera.
 */
const getMaterialNombre = (material: ValeSalidaMaterialItemDetalle): string => {
  const record = material as unknown as Record<string, unknown>;
  const materialNombre =
    typeof record.material_nombre === "string" ? record.material_nombre : "";
  return (
    materialNombre ||
    material.material?.nombre ||
    material.material?.descripcion ||
    material.material_descripcion ||
    material.descripcion ||
    "Sin nombre"
  );
};

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
  // El isotipo actual de la marca, el mismo que se ve al entrar en la app.
  // "logo Suncar.png" y "logo.png" son los anteriores y quedan de reserva.
  const logoCandidates = [
    "/brand/suncar-v1-iso.png",
    "/logo Suncar.png",
    "/logo.png",
  ];
  for (const logoUrl of logoCandidates) {
    const base64 = await imageToBase64(logoUrl);
    if (base64) return base64;
  }
  return null;
};

/** Mapa código(normalizado MAYÚS) -> precios del material desde el catálogo. */
const loadPreciosByCodigo = async (): Promise<
  Map<string, MaterialPreciosVale>
> => {
  const map = new Map<string, MaterialPreciosVale>();
  try {
    const materiales = await MaterialService.getAllMaterials();
    materiales.forEach((m: any) => {
      const code = normalizeMaterialCode(String(m?.codigo || ""));
      if (!code) return;
      map.set(code, {
        precio: m?.precio,
        precio_instaladora: m?.precio_instaladora,
        costo: m?.costo,
        nombre: m?.nombre || m?.descripcion,
      });
    });
  } catch {
    // Sin catálogo, se exporta sin enriquecer precios.
  }
  return map;
};

const applySectionTitleStyle = (row: ExcelJS.Row): void => {
  row.font = { bold: true, color: { argb: "FF111827" } };
};

const applyMetadataLabelStyle = (cell: ExcelJS.Cell): void => {
  cell.font = { bold: true, color: { argb: "FF1F2937" } };
};

export class ExportValeSalidaService {
  /**
   * Arma el PDF del vale y devuelve el documento junto con el nombre de
   * archivo. Separado de la descarga para que imprimir y descargar salgan del
   * mismo documento (mismo patrón que ReciboService).
   */
  private static async construirPDF(
    vale: ValeSalida,
  ): Promise<{ doc: jsPDF; filename: string }> {
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

    // Este vale se imprime a diario como constancia de entrega: prima meter el
    // mayor número de materiales por hoja sobre la estética del documento.
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;
    const logo = await loadLogoBase64();

    // El contenido arranca a 18mm del borde: más arriba cae en la zona no
    // imprimible de la impresora y la cabecera se pierde en el papel, aunque
    // en pantalla el PDF se vea completo.
    doc.setTextColor(0, 0, 0);
    if (logo) {
      doc.addImage(logo, "PNG", margin, 18, 13, 13);
    }
    const textX = logo ? margin + 15 : margin;
    const textWidth = pageWidth - margin - textX;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Vale de entrega de almacén", textX, 22);
    doc.setFontSize(10);
    doc.text(header.codigoVale, pageWidth - margin, 22, { align: "right" });

    let y = 26.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.text(
      [
        header.empresa,
        `Almacén: ${header.almacen}`,
        `Fecha: ${header.fechaCreacion}`,
        `Solicitud: ${header.codigoSolicitud}`,
        `Materiales: ${header.cantidadMateriales}`,
      ].join("  ·  "),
      textX,
      y,
    );
    y += 3.6;

    const clienteLines = doc
      .splitTextToSize(
        [
          `Cliente: ${cliente.nombre}`,
          `No.: ${cliente.numero}`,
          `Tel.: ${cliente.telefono}`,
          `Dir.: ${cliente.direccion}`,
        ].join("  ·  "),
        textWidth,
      )
      .slice(0, 2);
    doc.text(clienteLines, textX, y);
    y += clienteLines.length * 3.4;

    if (vale.estado === "anulado") {
      y += 1.2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      const anuladoTexto = doc.splitTextToSize(
        `VALE ANULADO · Motivo: ${vale.motivo_anulacion || "No especificado"}`,
        textWidth - 3,
      )[0];
      doc.setLineWidth(0.3);
      doc.rect(textX - 1.2, y - 3.1, doc.getTextWidth(anuladoTexto) + 2.4, 4.4);
      doc.text(anuladoTexto, textX, y);
      y += 4.4;
    }

    y = Math.max(y, 32) + 1.5;

    // Columnas que no aportan nada en este vale se omiten: así el ancho libre
    // se lo reparten código y material y se evita que una fila parta en dos.
    const mostrarSeries = materiales.some((material) => {
      const serie = (material.numero_serie || "").trim();
      return serie.length > 0 && serie !== "-";
    });
    const precios = materiales.map((material) => getMaterialPrice(material));
    const mostrarPrecio = precios.some((precio) => precio > 0);

    const codigos = materiales.map((material) => getMaterialCode(material));
    const nombres = materiales.map((material) => getMaterialNombre(material));
    const ums = materiales.map((material) => getMaterialUm(material));
    const cantidades = materiales.map((material) =>
      String(material.cantidad ?? 0),
    );
    const seriesTexto = materiales.map(
      (material) => material.numero_serie || "-",
    );
    const preciosTexto = precios.map((precio) => formatMoney(precio));

    const cellPadX = 1.4;
    const padTotal = cellPadX * 2 + 0.8;

    const measure = (value: string, size: number): number => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(size);
      return doc.getTextWidth(value);
    };
    const maxWidth = (values: string[], size: number): number =>
      values.reduce((acc, value) => Math.max(acc, measure(value, size)), 0);

    type TableLayout = {
      size: number;
      codigoW: number;
      materialW: number;
      umW: number;
      cantW: number;
      seriesW: number;
      precioW: number;
      overflow: number;
    };

    const buildLayout = (size: number): TableLayout => {
      const codigoW = Math.min(
        Math.max(maxWidth([...codigos, "Código"], size) + padTotal, 15),
        46,
      );
      const umW = Math.max(maxWidth([...ums, "U/M"], size) + padTotal, 8);
      const cantW = Math.max(
        maxWidth([...cantidades, "Cant."], size) + padTotal,
        10,
      );
      const seriesW = mostrarSeries
        ? Math.min(
            Math.max(
              maxWidth([...seriesTexto, "N° Serie"], size) + padTotal,
              14,
            ),
            34,
          )
        : 0;
      const precioW = mostrarPrecio
        ? Math.max(maxWidth([...preciosTexto, "Precio"], size) + padTotal, 12)
        : 0;
      const materialW =
        contentWidth - codigoW - umW - cantW - seriesW - precioW;

      const overflow = materiales.reduce((acc, _material, index) => {
        const codigoCabe =
          measure(codigos[index], size) <= codigoW - padTotal + 0.4;
        const nombreCabe =
          measure(nombres[index], size) <= materialW - padTotal + 0.4;
        return acc + (codigoCabe && nombreCabe ? 0 : 1);
      }, 0);

      return {
        size,
        codigoW,
        materialW,
        umW,
        cantW,
        seriesW,
        precioW,
        overflow,
      };
    };

    const headRow = ["Código", "Material", "U/M", "Cant."];
    if (mostrarSeries) headRow.push("N° Serie");
    if (mostrarPrecio) headRow.push("Precio");

    const body =
      materiales.length > 0
        ? materiales.map((material, index) => {
            const fila = [
              codigos[index],
              nombres[index],
              ums[index],
              cantidades[index],
            ];
            if (mostrarSeries) fila.push(seriesTexto[index]);
            if (mostrarPrecio) fila.push(preciosTexto[index]);
            return fila;
          })
        : [
            headRow.map((_column, index) =>
              index === 1 ? "Sin materiales" : "-",
            ),
          ];

    const columnStylesDe = (
      tabla: TableLayout,
    ): Record<
      number,
      { cellWidth: number; halign?: "left" | "center" | "right" }
    > => {
      const estilos: Record<
        number,
        { cellWidth: number; halign?: "left" | "center" | "right" }
      > = {
        0: { cellWidth: tabla.codigoW },
        1: { cellWidth: tabla.materialW },
        2: { cellWidth: tabla.umW, halign: "center" },
        3: { cellWidth: tabla.cantW, halign: "right" },
      };
      let columnIndex = 4;
      if (mostrarSeries) {
        estilos[columnIndex] = {
          cellWidth: tabla.seriesW,
          halign: "center",
        };
        columnIndex += 1;
      }
      if (mostrarPrecio) {
        estilos[columnIndex] = {
          cellWidth: tabla.precioW,
          halign: "right",
        };
      }
      return estilos;
    };

    // Reserva fija para las firmas: evita que se vayan solas a una hoja extra.
    const firmasReserva = 23;

    const opcionesTabla = (tabla: TableLayout) => ({
      startY: y,
      margin: {
        left: margin,
        right: margin,
        top: 18,
        bottom: firmasReserva,
      },
      head: [headRow],
      body,
      theme: "grid" as const,
      headStyles: {
        fillColor: [255, 255, 255] as [number, number, number],
        textColor: [0, 0, 0] as [number, number, number],
        fontStyle: "bold" as const,
        lineColor: [0, 0, 0] as [number, number, number],
        lineWidth: 0.15,
        cellPadding: { top: 0.9, bottom: 0.9, left: cellPadX, right: cellPadX },
      },
      styles: {
        font: "helvetica",
        fontSize: tabla.size,
        cellPadding: { top: 0.8, bottom: 0.8, left: cellPadX, right: cellPadX },
        lineColor: [0, 0, 0] as [number, number, number],
        lineWidth: 0.15,
        textColor: [0, 0, 0] as [number, number, number],
        overflow: "linebreak" as const,
        valign: "middle" as const,
      },
      columnStyles: columnStylesDe(tabla),
    });

    /** Hojas que ocuparía la tabla con ese layout, dibujándola en un PDF aparte. */
    const hojasQueOcupa = (tabla: TableLayout): number => {
      const prueba = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter",
      });
      autoTable(prueba, opcionesTabla(tabla));
      return prueba.getNumberOfPages();
    };

    // Gana el layout que gaste menos hojas; a igualdad, el que menos filas
    // parta en dos, y a igualdad de eso, la letra más grande.
    const layout = [8, 7.5, 7, 6.6]
      .map(buildLayout)
      .map((tabla) => ({ tabla, hojas: hojasQueOcupa(tabla) }))
      .reduce((mejor, actual) => {
        if (actual.hojas !== mejor.hojas) {
          return actual.hojas < mejor.hojas ? actual : mejor;
        }
        return actual.tabla.overflow < mejor.tabla.overflow ? actual : mejor;
      }).tabla;

    autoTable(doc, opcionesTabla(layout));

    let signatureY =
      ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable
        ?.finalY || y) + 9;

    if (signatureY + 6 > pageHeight - 12) {
      doc.addPage();
      signatureY = 30;
    }

    // Dos firmas (despacha y recibe) repartidas a lo ancho de la hoja.
    const blockGap = 20;
    const blockWidth = (contentWidth - blockGap) / 2;
    const firmas: Array<[string, string]> = [
      ["Despachado por", header.despachadoPor || "-"],
      ["Recibido por", header.recibidoPor || "-"],
    ];

    firmas.forEach(([label, nombre], index) => {
      const x = margin + index * (blockWidth + blockGap);
      doc.setLineWidth(0.2);
      doc.line(x, signatureY, x + blockWidth, signatureY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      const labelText = `${label}: `;
      doc.text(labelText, x, signatureY + 3.4);
      const labelWidth = doc.getTextWidth(labelText);

      doc.setFont("helvetica", "normal");
      const nombreTexto = doc.splitTextToSize(
        nombre,
        Math.max(12, blockWidth - labelWidth),
      )[0];
      doc.text(nombreTexto, x + labelWidth, signatureY + 3.4);
    });

    // El folio va arriba (la 1 ya lleva el código en la cabecera): abajo cae
    // en el borde que la impresora recorta.
    const totalPages = doc.getNumberOfPages();
    if (totalPages > 1) {
      for (let page = 2; page <= totalPages; page += 1) {
        doc.setPage(page);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(90, 90, 90);
        doc.text(
          `${header.codigoVale} · Pág. ${page}/${totalPages}`,
          pageWidth - margin,
          15,
          { align: "right" },
        );
      }
      doc.setTextColor(0, 0, 0);
    }

    const fechaArchivo = new Date().toISOString().slice(0, 10);
    const filename = `Vale_Entrega_${sanitizeFilenamePart(header.codigoVale)}_${fechaArchivo}.pdf`;
    return { doc, filename };
  }

  /** Descarga el vale en PDF (queda en Descargas). */
  static async exportarPDF(vale: ValeSalida): Promise<void> {
    const { doc, filename } = await this.construirPDF(vale);
    doc.save(filename);
  }

  /** Manda el vale directo a la impresora, sin pasar por Descargas. */
  static async imprimirPDF(vale: ValeSalida): Promise<void> {
    const { doc } = await this.construirPDF(vale);
    imprimirPdf(doc.output("blob"));
  }

  static async exportarExcel(vale: ValeSalida): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Vale de Salida");

    const header = getValeHeaderInfo(vale);
    const cliente = getClienteInfo(vale);
    const materiales = vale.materiales || [];
    const logo = await loadLogoBase64();
    const preciosByCodigo = await loadPreciosByCodigo();

    worksheet.columns = [
      { key: "a", width: 20 },
      { key: "b", width: 35 },
      { key: "c", width: 22 },
      { key: "d", width: 30 },
      { key: "e", width: 12 },
      { key: "f", width: 12 },
      { key: "g", width: 14 },
      { key: "h", width: 16 },
      { key: "i", width: 14 },
      { key: "j", width: 26 },
    ];

    worksheet.mergeCells("A1:J1");
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

    worksheet.mergeCells("A2:J2");
    worksheet.getCell("A2").value =
      "Documento de control de salidas de almacén - generado automáticamente";
    worksheet.getCell("A2").font = { size: 10, color: { argb: "FF4B5563" } };
    worksheet.getCell("A2").alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getRow(2).height = 18;

    worksheet.mergeCells("A4:J4");
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

    worksheet.mergeCells("A11:J11");
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
    worksheet.mergeCells(`A${tableStartRow}:J${tableStartRow}`);
    worksheet.getCell(`A${tableStartRow}`).value = "Detalle de Materiales";
    applySectionTitleStyle(worksheet.getRow(tableStartRow));

    const headerRow = tableStartRow + 1;
    const tableHeaders = [
      { cell: `A${headerRow}`, label: "Código" },
      { cell: `B${headerRow}`, label: "Material" },
      { cell: `E${headerRow}`, label: "UM" },
      { cell: `F${headerRow}`, label: "Cantidad" },
      { cell: `G${headerRow}`, label: "Precio venta" },
      { cell: `H${headerRow}`, label: "Precio instaladora" },
      { cell: `I${headerRow}`, label: "Costo" },
      { cell: `J${headerRow}`, label: "N° Series" },
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

      const precios =
        preciosByCodigo.get(normalizeMaterialCode(getMaterialCode(material))) ||
        {};
      const precioVenta =
        typeof precios.precio === "number"
          ? precios.precio
          : getMaterialPrice(material);

      worksheet.getCell(`A${currentRow}`).value = getMaterialCode(material);
      worksheet.getCell(`B${currentRow}`).value = getMaterialNombre(material);
      worksheet.getCell(`E${currentRow}`).value = getMaterialUm(material);
      worksheet.getCell(`F${currentRow}`).value = Number(
        material.cantidad || 0,
      );
      worksheet.getCell(`G${currentRow}`).value = precioVenta;
      worksheet.getCell(`H${currentRow}`).value =
        typeof precios.precio_instaladora === "number"
          ? precios.precio_instaladora
          : "-";
      worksheet.getCell(`I${currentRow}`).value =
        typeof precios.costo === "number" ? precios.costo : "-";
      worksheet.getCell(`J${currentRow}`).value = material.numero_serie || "-";

      ["A", "B", "E", "F", "G", "H", "I", "J"].forEach((col) => {
        const cell = worksheet.getCell(`${col}${currentRow}`);
        cell.alignment = {
          vertical: "middle",
          horizontal:
            col === "E" || col === "J"
              ? "center"
              : col === "F" || col === "G" || col === "H" || col === "I"
                ? "right"
                : "left",
          wrapText: col === "B",
        };
        if (
          (col === "G" || col === "H" || col === "I") &&
          typeof cell.value === "number"
        ) {
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

    worksheet.mergeCells(`A${summaryRow}:I${summaryRow}`);
    worksheet.getCell(`A${summaryRow}`).value = "Total de materiales";
    worksheet.getCell(`A${summaryRow}`).font = { bold: true };
    worksheet.getCell(`J${summaryRow}`).value = header.cantidadMateriales;
    worksheet.getCell(`J${summaryRow}`).font = { bold: true };
    worksheet.getCell(`J${summaryRow}`).alignment = { horizontal: "right" };

    if (vale.estado === "anulado") {
      const anuladoRow = summaryRow + 2;
      worksheet.mergeCells(`A${anuladoRow}:J${anuladoRow}`);
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
