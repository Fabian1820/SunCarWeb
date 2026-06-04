import { SolicitudVentaService } from "@/lib/api-services";
import type {
  SolicitudVentaListParams,
  SolicitudVentaSummary,
} from "@/lib/api-types";
import {
  exportToExcel,
  generateFilename,
  type ExportColumn,
} from "@/lib/export-service";

const ESTADO_LABEL: Record<string, string> = {
  nueva: "Nueva",
  usada: "Usada",
  anulada: "Anulada",
};

const formatDateDDMMYYYY = (value?: string): string => {
  if (!value) return "";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
};

const formatNumber = (value?: number | null): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
};

const buildMaterialesResumen = (s: SolicitudVentaSummary): string => {
  if (Array.isArray(s.materiales) && s.materiales.length > 0) {
    return `${s.materiales.length} materiales`;
  }
  if (s.materiales_resumen) return s.materiales_resumen;
  return "";
};

const formatMaterialNombre = (
  m: NonNullable<SolicitudVentaSummary["materiales"]>[number],
): string => {
  const nombre =
    m.material_descripcion ||
    m.material_nombre ||
    m.nombre ||
    m.material_codigo ||
    m.material_id ||
    "";
  const codigo =
    m.material_codigo && m.material_codigo !== nombre
      ? ` [${m.material_codigo}]`
      : "";
  return `${nombre}${codigo}`.trim();
};

interface ExportSolicitudesOptions {
  filters: SolicitudVentaListParams;
  searchTerm?: string;
}

export class ExportSolicitudesVentasExcelService {
  /**
   * Exporta a Excel todas las solicitudes de venta que coincidan con los filtros
   * actuales. Omite la paginación local (skip/limit de la UI) y trae el set
   * completo en una sola llamada a `/summary` con un `limit` alto.
   *
   * Los materiales se exportan como pares de columnas dinámicas
   * `Material N` / `Cantidad N`, con `N` desde 1 hasta el máximo de materiales
   * que tenga cualquier solicitud del set.
   */
  static async exportar({
    filters,
    searchTerm,
  }: ExportSolicitudesOptions): Promise<{ count: number; filename: string }> {
    const params: SolicitudVentaListParams = {
      ...filters,
      skip: 0,
      limit: 10000,
    };
    if (searchTerm?.trim()) {
      params.q = searchTerm.trim();
    }

    const response = await SolicitudVentaService.getSolicitudesSummary(params);
    const solicitudes: SolicitudVentaSummary[] = response.data || [];

    const maxMateriales = solicitudes.reduce(
      (max, s) =>
        Math.max(max, Array.isArray(s.materiales) ? s.materiales.length : 0),
      0,
    );

    const rows = solicitudes.map((s) => {
      const base: Record<string, string | number> = {
        codigo: s.codigo || s.id.slice(-6).toUpperCase(),
        estado:
          ESTADO_LABEL[(s.estado || "").toString().toLowerCase()] ||
          (s.estado || ""),
        cliente: s.cliente_venta_nombre || "",
        comercial: s.comercial || "",
        almacen: s.almacen_nombre || "",
        creador: s.creador_nombre || "",
        materiales: buildMaterialesResumen(s),
        precio_total: formatNumber(s.precio_total),
        total_pagado: formatNumber(s.total_pagado),
        monto_pendiente: formatNumber(s.monto_pendiente),
        pagada_totalmente: s.pagada_totalmente ? "Sí" : "No",
        fecha_creacion: formatDateDDMMYYYY(s.fecha_creacion),
      };
      const lista = Array.isArray(s.materiales) ? s.materiales : [];
      for (let i = 0; i < maxMateriales; i++) {
        const m = lista[i];
        base[`material_${i + 1}`] = m ? formatMaterialNombre(m) : "";
        base[`cantidad_${i + 1}`] = m ? Number(m.cantidad) || 0 : "";
      }
      return base;
    });

    const materialColumns: ExportColumn[] = [];
    for (let i = 0; i < maxMateriales; i++) {
      materialColumns.push({
        header: `Material ${i + 1}`,
        key: `material_${i + 1}`,
        width: 30,
      });
      materialColumns.push({
        header: `Cant. ${i + 1}`,
        key: `cantidad_${i + 1}`,
        width: 10,
      });
    }

    const subtitlePartes: string[] = [`Registros: ${rows.length}`];
    if (filters.fecha_desde && filters.fecha_hasta) {
      subtitlePartes.push(
        `Período: ${formatDateDDMMYYYY(filters.fecha_desde)} a ${formatDateDDMMYYYY(filters.fecha_hasta)}`,
      );
    } else if (filters.fecha_desde) {
      subtitlePartes.push(`Desde: ${formatDateDDMMYYYY(filters.fecha_desde)}`);
    } else if (filters.fecha_hasta) {
      subtitlePartes.push(`Hasta: ${formatDateDDMMYYYY(filters.fecha_hasta)}`);
    }
    if (filters.estado) {
      subtitlePartes.push(
        `Estado: ${ESTADO_LABEL[filters.estado.toLowerCase()] || filters.estado}`,
      );
    }
    if (filters.comercial) subtitlePartes.push(`Comercial: ${filters.comercial}`);
    if (searchTerm?.trim()) subtitlePartes.push(`Búsqueda: "${searchTerm.trim()}"`);

    const filename = generateFilename("solicitudes_ventas");

    await exportToExcel({
      title: "Suncar SRL - Solicitudes de Venta",
      subtitle: subtitlePartes.join(" · "),
      filename,
      columns: [
        { header: "Código", key: "codigo", width: 16 },
        { header: "Estado", key: "estado", width: 12 },
        { header: "Cliente", key: "cliente", width: 28 },
        { header: "Comercial", key: "comercial", width: 22 },
        { header: "Almacén", key: "almacen", width: 22 },
        { header: "Creador", key: "creador", width: 22 },
        { header: "Materiales", key: "materiales", width: 14 },
        ...materialColumns,
        { header: "Precio Total (USD)", key: "precio_total", width: 18 },
        { header: "Total Pagado (USD)", key: "total_pagado", width: 18 },
        { header: "Pendiente (USD)", key: "monto_pendiente", width: 16 },
        { header: "Pagada", key: "pagada_totalmente", width: 10 },
        { header: "Fecha", key: "fecha_creacion", width: 14 },
      ],
      data: rows,
    });

    return { count: rows.length, filename };
  }
}
