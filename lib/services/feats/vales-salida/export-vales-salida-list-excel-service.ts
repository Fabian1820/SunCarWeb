import { ValeSalidaService } from "@/lib/api-services";
import type { ValeSalidaSummary } from "@/lib/api-types";
import { exportToExcel, generateFilename } from "@/lib/export-service";

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

interface ExportValesOptions {
  almacenId?: string;
  searchTerm?: string;
  estadoFilter?: "todos" | "usado" | "anulado";
  tipoFilter?: "todos" | "material" | "venta";
  /** Filtro por nombre del creador de la solicitud asociada (server-side). */
  creadorSolicitudFilter?: string;
}

export class ExportValesSalidaListExcelService {
  /**
   * Exporta a Excel los vales de salida que coincidan con los filtros aplicados.
   * Omite la paginación local (trae todo con `limit` alto en una sola llamada).
   *
   * Incluye una columna con el **creador de la solicitud asociada** (no visible
   * en la tabla de la UI), tomada directamente del campo
   * `solicitud_creador_nombre` que devuelve el endpoint `/summary`.
   *
   * Si se especifica `creadorSolicitudFilter`, el filtrado se hace server-side
   * vía el parámetro `creador_solicitud` (regex case-insensitive sobre el nombre
   * del trabajador que creó la solicitud).
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

    const response = await ValeSalidaService.getValesSummary(params);
    const vales: ValeSalidaSummary[] = response.data || [];

    const rows = vales.map((vale) => ({
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
      materiales: vale.materiales_resumen || "",
      fecha_creacion: formatDateDDMMYYYY(vale.fecha_creacion),
      fecha_recogida: formatDateDDMMYYYY(vale.fecha_recogida),
    }));

    const subtitlePartes: string[] = [`Registros: ${rows.length}`];
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
        { header: "Materiales", key: "materiales", width: 14 },
        { header: "Fecha creación", key: "fecha_creacion", width: 14 },
        { header: "Fecha recogida", key: "fecha_recogida", width: 14 },
      ],
      data: rows,
    });

    return { count: rows.length, filename };
  }
}
