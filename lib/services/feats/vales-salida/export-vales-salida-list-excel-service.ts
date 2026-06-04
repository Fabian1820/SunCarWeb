import { ValeSalidaService } from "@/lib/api-services";
import type {
  ValeSalidaSummary,
  ValeSalidaSummaryMaterial,
} from "@/lib/api-types";
import {
  exportToExcel,
  generateFilename,
  type ExportColumn,
} from "@/lib/export-service";


const ESTADO_LABEL: Record<string, string> = {
  usado: "Usado",
  anulado: "Anulado",
};

const TIPO_LABEL: Record<string, string> = {
  venta: "Venta",
  material: "Material",
};

const formatDateDDMMYYYY = (value?: string | null): string => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const formatMaterialNombre = (m: ValeSalidaSummaryMaterial): string => {
  const nombre =
    m.material_descripcion || m.material_codigo || m.material_id || "";
  const codigo =
    m.material_codigo && m.material_codigo !== nombre
      ? ` [${m.material_codigo}]`
      : "";
  return `${nombre}${codigo}`.trim();
};

interface ExportValesOptions {
  almacenId?: string;
  searchTerm?: string;
  estadoFilter?: "todos" | "usado" | "anulado";
  tipoFilter?: "todos" | "material" | "venta";
  /** Filtro por nombre del creador de la solicitud asociada (server-side). */
  creadorSolicitudFilter?: string;
  /** Rango de fecha_creacion del vale (YYYY-MM-DD), server-side. */
  fechaDesde?: string;
  fechaHasta?: string;
}

export class ExportValesSalidaListExcelService {
  /**
   * Exporta a Excel los vales de salida que coincidan con los filtros aplicados.
   * Omite la paginación local (trae todo con `limit` alto en una sola llamada).
   *
   * Incluye:
   *  - Columna **"Creador de la solicitud"** desde `solicitud_creador_nombre`.
   *  - Pares de columnas dinámicas **Material N / Cant. N** con cada material
   *    embebido en el vale; `N` va de 1 al máximo de materiales del set.
   */
  static async exportar(
    opts: ExportValesOptions,
  ): Promise<{ count: number; filename: string }> {
    const params: Parameters<typeof ValeSalidaService.getValesSummary>[0] = {
      skip: 0,
      limit: 10000,
    };
    if (opts.almacenId) params.almacen_id = opts.almacenId;
    if (opts.searchTerm?.trim()) params.q = opts.searchTerm.trim();
    if (opts.estadoFilter && opts.estadoFilter !== "todos") {
      params.estado = opts.estadoFilter;
    }
    if (opts.tipoFilter && opts.tipoFilter !== "todos") {
      params.solicitud_tipo = opts.tipoFilter;
    }
    if (opts.creadorSolicitudFilter?.trim()) {
      params.creador_solicitud = opts.creadorSolicitudFilter.trim();
    }
    if (opts.fechaDesde) params.fecha_desde = opts.fechaDesde;
    if (opts.fechaHasta) params.fecha_hasta = opts.fechaHasta;

    const response = await ValeSalidaService.getValesSummary(params);
    const vales: ValeSalidaSummary[] = response.data || [];

    const maxMateriales = vales.reduce(
      (max, v) =>
        Math.max(max, Array.isArray(v.materiales) ? v.materiales.length : 0),
      0,
    );

    const rows = vales.map((vale) => {
      const materiales = vale.materiales || [];
      const base: Record<string, string | number> = {
        codigo_vale: vale.codigo || vale.id.slice(-6).toUpperCase(),
        codigo_solicitud: vale.solicitud_codigo || "",
        estado:
          ESTADO_LABEL[(vale.estado || "").toString().toLowerCase()] ||
          (vale.estado || ""),
        tipo:
          TIPO_LABEL[(vale.solicitud_tipo || "").toString().toLowerCase()] || "",
        cliente: vale.cliente_nombre || "",
        creador_vale: vale.creador_nombre || "",
        creador_solicitud: vale.solicitud_creador_nombre || "",
        recibido_por: vale.recibido_por || "",
        materiales_resumen:
          vale.materiales_resumen ||
          (materiales.length > 0 ? `${materiales.length} materiales` : ""),
        fecha_creacion: formatDateDDMMYYYY(vale.fecha_creacion),
        fecha_recogida: formatDateDDMMYYYY(vale.fecha_recogida),
      };
      for (let i = 0; i < maxMateriales; i++) {
        const m = materiales[i];
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
    if (opts.fechaDesde && opts.fechaHasta) {
      subtitlePartes.push(
        `Período: ${formatDateDDMMYYYY(opts.fechaDesde)} a ${formatDateDDMMYYYY(opts.fechaHasta)}`,
      );
    } else if (opts.fechaDesde) {
      subtitlePartes.push(`Desde: ${formatDateDDMMYYYY(opts.fechaDesde)}`);
    } else if (opts.fechaHasta) {
      subtitlePartes.push(`Hasta: ${formatDateDDMMYYYY(opts.fechaHasta)}`);
    }
    if (opts.estadoFilter && opts.estadoFilter !== "todos") {
      subtitlePartes.push(
        `Estado: ${ESTADO_LABEL[opts.estadoFilter] || opts.estadoFilter}`,
      );
    }
    if (opts.tipoFilter && opts.tipoFilter !== "todos") {
      subtitlePartes.push(`Tipo: ${TIPO_LABEL[opts.tipoFilter] || opts.tipoFilter}`);
    }
    if (opts.searchTerm?.trim()) {
      subtitlePartes.push(`Búsqueda: "${opts.searchTerm.trim()}"`);
    }
    if (opts.creadorSolicitudFilter?.trim()) {
      subtitlePartes.push(
        `Creador solicitud: "${opts.creadorSolicitudFilter.trim()}"`,
      );
    }

    const filename = generateFilename("vales_salida");

    await exportToExcel({
      title: "Suncar SRL - Vales de Salida",
      subtitle: subtitlePartes.join(" · "),
      filename,
      columns: [
        { header: "Código vale", key: "codigo_vale", width: 14 },
        { header: "Código solicitud", key: "codigo_solicitud", width: 16 },
        { header: "Estado", key: "estado", width: 12 },
        { header: "Tipo", key: "tipo", width: 10 },
        { header: "Cliente", key: "cliente", width: 28 },
        { header: "Creador del vale", key: "creador_vale", width: 22 },
        { header: "Creador de la solicitud", key: "creador_solicitud", width: 24 },
        { header: "Recibido por", key: "recibido_por", width: 22 },
        { header: "Materiales", key: "materiales_resumen", width: 14 },
        ...materialColumns,
        { header: "Fecha creación", key: "fecha_creacion", width: 14 },
        { header: "Fecha recogida", key: "fecha_recogida", width: 14 },
      ],
      data: rows,
    });

    return { count: rows.length, filename };
  }
}
