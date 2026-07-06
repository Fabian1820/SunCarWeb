import { ValeSalidaService, MaterialService } from "@/lib/api-services";
import type {
  ValeSalidaSummary,
  ValeSalidaSummaryMaterial,
} from "@/lib/api-types";
import { exportToExcel, generateFilename } from "@/lib/export-service";

interface MaterialInfo {
  precio?: number;
  precio_instaladora?: number;
  costo?: number;
  nombre?: string;
  descripcion?: string;
}

const normCodigo = (value?: string | null): string =>
  String(value || "").trim().toLowerCase();

const fmtPrecio = (value?: number): string =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "-";

/** Mapa código(normalizado) -> datos del material del catálogo actual (precios + nombre/descripción). */
const cargarMaterialesPorCodigo = async (): Promise<Map<string, MaterialInfo>> => {
  const map = new Map<string, MaterialInfo>();
  try {
    const materiales = await MaterialService.getAllMaterials();
    for (const m of materiales) {
      const codigo = normCodigo((m as any).codigo);
      if (!codigo) continue;
      map.set(codigo, {
        precio: (m as any).precio,
        precio_instaladora: (m as any).precio_instaladora,
        costo: (m as any).costo,
        nombre: (m as any).nombre,
        descripcion: (m as any).descripcion,
      });
    }
  } catch {
    // Si falla el catálogo, se exporta sin datos enriquecidos.
  }
  return map;
};

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

const formatMaterialCodigo = (m: ValeSalidaSummaryMaterial): string =>
  m.material_codigo || m.material_id || "";

const formatMaterialNombre = (
  m: ValeSalidaSummaryMaterial,
  info: MaterialInfo,
): string =>
  (
    info.nombre ||
    info.descripcion ||
    m.material_descripcion ||
    m.material_codigo ||
    m.material_id ||
    ""
  ).trim();

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
   * Una fila lógica por vale: `Material` y `Cantidad` se apilan en celdas
   * verticales; el resto de columnas se fusionan para cubrir esa altura.
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

    const materialesPorCodigo = await cargarMaterialesPorCodigo();
    const infoDe = (m: ValeSalidaSummaryMaterial): MaterialInfo =>
      materialesPorCodigo.get(normCodigo(m.material_codigo)) || {};

    const rows: Array<Record<string, string | number | string[] | number[]>> =
      [];
    for (const vale of vales) {
      const materiales = vale.materiales || [];
      rows.push({
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
        material_codigo: materiales.map((m) => formatMaterialCodigo(m)),
        material: materiales.map((m) => formatMaterialNombre(m, infoDe(m))),
        cantidad: materiales.map((m) => Number(m.cantidad) || 0),
        precio_venta: materiales.map((m) => fmtPrecio(infoDe(m).precio)),
        precio_instaladora: materiales.map((m) => fmtPrecio(infoDe(m).precio_instaladora)),
        costo: materiales.map((m) => fmtPrecio(infoDe(m).costo)),
        fecha_creacion: formatDateDDMMYYYY(vale.fecha_creacion),
        fecha_recogida: formatDateDDMMYYYY(vale.fecha_recogida),
      });
    }

    const subtitlePartes: string[] = [`Registros: ${vales.length}`];
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
        { header: "Código", key: "material_codigo", width: 16 },
        { header: "Material", key: "material", width: 36 },
        { header: "Cantidad", key: "cantidad", width: 10 },
        { header: "Precio venta", key: "precio_venta", width: 12 },
        { header: "Precio instaladora", key: "precio_instaladora", width: 14 },
        { header: "Costo", key: "costo", width: 12 },
        { header: "Fecha creación", key: "fecha_creacion", width: 14 },
        { header: "Fecha recogida", key: "fecha_recogida", width: 14 },
      ],
      data: rows,
      stackedColumnKeys: ["material_codigo", "material", "cantidad", "precio_venta", "precio_instaladora", "costo"],
    });

    return { count: vales.length, filename };
  }
}
