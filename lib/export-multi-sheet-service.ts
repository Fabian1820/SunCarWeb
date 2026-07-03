/**
 * Helpers compartidos para exportar workbooks de Excel con varias hojas
 * (ej. un listado principal + una hoja aparte con el detalle de materiales),
 * todas con el mismo estilo de marca Suncar: título, subtítulo, encabezado
 * con fondo Emerald Circuit, autofiltro y freeze panes.
 */

import ExcelJS from "exceljs";

const BRAND_COLOR = "FF012928"; // Emerald Circuit (marca Suncar)
const BORDER_COLOR_LIGHT = "FFD1D5DB";
const BORDER_COLOR_DARK = "FF9CA3AF";
const SUBTITLE_COLOR = "FF64748B";

export const CURRENCY_FMT = "$#,##0.00";

export interface ExportColumnDef {
  header: string;
  width: number;
  currency?: boolean;
}

function thinBorder(light: boolean): Partial<ExcelJS.Borders> {
  const color = { argb: light ? BORDER_COLOR_LIGHT : BORDER_COLOR_DARK };
  return {
    top: { style: "thin", color },
    bottom: { style: "thin", color },
    left: { style: "thin", color },
    right: { style: "thin", color },
  };
}

/**
 * Agrega una hoja con título/subtítulo, encabezado de marca, autofiltro y
 * freeze panes a un workbook existente. Devuelve la hoja creada.
 */
export function addBrandedSheet<T>(
  workbook: ExcelJS.Workbook,
  opts: {
    sheetName: string;
    title: string;
    subtitle: string;
    columns: ExportColumnDef[];
    rows: T[];
    toValues: (row: T) => Array<string | number>;
  },
): ExcelJS.Worksheet {
  const { sheetName, title, subtitle, columns, rows, toValues } = opts;
  const sheet = workbook.addWorksheet(sheetName);

  sheet.getColumn(1).width = 3;
  columns.forEach((col, i) => {
    sheet.getColumn(i + 2).width = col.width;
  });

  sheet.getCell("B1").value = title;
  sheet.getCell("B1").font = { bold: true, size: 14 };
  sheet.getCell("B2").value = subtitle;
  sheet.getCell("B2").font = { size: 10, color: { argb: SUBTITLE_COLOR } };

  const headerRowIndex = 4;
  const headerRow = sheet.getRow(headerRowIndex);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 2);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_COLOR } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder(false);
  });
  headerRow.height = 22;

  rows.forEach((row, idx) => {
    const values = toValues(row);
    const dataRow = sheet.getRow(headerRowIndex + 1 + idx);
    values.forEach((value, i) => {
      const cell = dataRow.getCell(i + 2);
      cell.value = value;
      cell.font = { size: 10 };
      cell.border = thinBorder(true);
      cell.alignment = {
        vertical: "middle",
        wrapText: true,
        horizontal: typeof value === "number" ? "right" : "left",
      };
      if (columns[i]?.currency && typeof value === "number") {
        cell.numFmt = CURRENCY_FMT;
      }
    });
  });

  sheet.autoFilter = {
    from: { row: headerRowIndex, column: 2 },
    to: { row: headerRowIndex + rows.length, column: columns.length + 1 },
  };
  sheet.views = [{ state: "frozen", ySplit: headerRowIndex }];

  return sheet;
}

/** Genera el .xlsx del workbook y dispara la descarga en el navegador. */
export async function downloadWorkbook(
  workbook: ExcelJS.Workbook,
  filename: string,
): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
}

export function newBrandedWorkbook(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SunCar Admin";
  workbook.created = new Date();
  return workbook;
}
