import type { FacturaVentaConComercial } from "@/lib/types/feats/reportes-ventas/reportes-ventas-types";
import { exportToExcel, generateFilename } from "@/lib/export-service";

const formatDateDDMMYYYY = (value?: string | null): string => {
  if (!value) return "";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
};

const formatNumber = (value?: number | null): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
};

interface ExportFacturasComercialOptions {
  /** Filtros aplicados (informativos, se incluyen en el subtítulo). */
  fechaDesde?: string;
  fechaHasta?: string;
  comercial?: string;
  searchTerm?: string;
  descuento?: "todos" | "si" | "no";
  mes?: string;
  anio?: string;
}

export class ExportFacturasComercialExcelService {
  /**
   * Exporta a Excel el listado de facturas por comercial ya filtrado por la UI.
   * No requiere paginación: la vista carga todo el set (`limit: 1000` por
   * defecto en el page) y los filtros son client-side, así que se reciben las
   * facturas ya filtradas tal cual se muestran en pantalla.
   */
  static async exportar(
    facturas: FacturaVentaConComercial[],
    options: ExportFacturasComercialOptions = {},
  ): Promise<{ count: number; filename: string }> {
    const rows = facturas.map((f) => ({
      comercial: f.cliente.comercial || "Sin asignar",
      factura: f.numero || "",
      cliente: f.cliente.nombre || "",
      cliente_numero: f.cliente.numero || "",
      provincia: f.cliente.provincia || "",
      municipio: f.cliente.municipio || "",
      telefono: f.cliente.telefono || "",
      solicitudes: f.solicitudes_count,
      items: f.materiales_count,
      bruto: formatNumber(f.precio_bruto),
      descuento: f.tiene_descuento ? formatNumber(f.descuento_monto) : 0,
      total: formatNumber(f.precio_total),
      pagado: formatNumber(f.total_pagado),
      pendiente: formatNumber(f.monto_pendiente),
      fecha: formatDateDDMMYYYY(f.fecha || f.fecha_creacion),
      primer_pago: formatDateDDMMYYYY(f.fecha_primer_pago),
      notas: f.notas || "",
    }));

    const subtitlePartes: string[] = [`Registros: ${rows.length}`];
    if (options.fechaDesde && options.fechaHasta) {
      subtitlePartes.push(
        `Período: ${formatDateDDMMYYYY(options.fechaDesde)} a ${formatDateDDMMYYYY(options.fechaHasta)}`,
      );
    } else if (options.fechaDesde) {
      subtitlePartes.push(`Desde: ${formatDateDDMMYYYY(options.fechaDesde)}`);
    } else if (options.fechaHasta) {
      subtitlePartes.push(`Hasta: ${formatDateDDMMYYYY(options.fechaHasta)}`);
    } else if (options.mes && options.mes !== "todos") {
      subtitlePartes.push(`Mes: ${options.mes}`);
    } else if (options.anio && options.anio !== "todos") {
      subtitlePartes.push(`Año: ${options.anio}`);
    }
    if (options.comercial && options.comercial !== "todos") {
      subtitlePartes.push(`Comercial: ${options.comercial}`);
    }
    if (options.descuento === "si") subtitlePartes.push("Solo con descuento");
    if (options.descuento === "no") subtitlePartes.push("Sin descuento");
    if (options.searchTerm?.trim()) {
      subtitlePartes.push(`Búsqueda: "${options.searchTerm.trim()}"`);
    }

    const filename = generateFilename("facturas_por_comercial");

    await exportToExcel({
      title: "Suncar SRL - Facturas por Comercial",
      subtitle: subtitlePartes.join(" · "),
      filename,
      columns: [
        { header: "Comercial", key: "comercial", width: 22 },
        { header: "Factura", key: "factura", width: 18 },
        { header: "Cliente", key: "cliente", width: 28 },
        { header: "Cliente Nº", key: "cliente_numero", width: 12 },
        { header: "Provincia", key: "provincia", width: 16 },
        { header: "Municipio", key: "municipio", width: 16 },
        { header: "Teléfono", key: "telefono", width: 16 },
        { header: "Solicitudes", key: "solicitudes", width: 12 },
        { header: "Items", key: "items", width: 10 },
        { header: "Bruto (USD)", key: "bruto", width: 14 },
        { header: "Descuento (USD)", key: "descuento", width: 16 },
        { header: "Total (USD)", key: "total", width: 14 },
        { header: "Pagado (USD)", key: "pagado", width: 14 },
        { header: "Pendiente (USD)", key: "pendiente", width: 14 },
        { header: "Fecha", key: "fecha", width: 14 },
        { header: "Primer pago", key: "primer_pago", width: 14 },
        { header: "Notas", key: "notas", width: 28 },
      ],
      data: rows,
    });

    return { count: rows.length, filename };
  }
}
