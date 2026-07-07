import {
  ObrasTerminadasService,
  type ObraTerminada,
  type ObrasTerminadasFiltros,
} from "./obras-terminadas-service";
import { MaterialService } from "@/lib/api-services";
import { exportToExcel, generateFilename } from "@/lib/export-service";

const normCodigo = (value?: string | null): string =>
  String(value || "").trim().toLowerCase();

/**
 * Catálogo código(normalizado) -> nombre del material. El item de la oferta
 * solo guarda `descripcion`, no el nombre; para mostrar el NOMBRE del material
 * (igual que el resto de exports) se enriquece desde el catálogo.
 */
const cargarNombresPorCodigo = async (): Promise<Map<string, string>> => {
  const map = new Map<string, string>();
  try {
    const materiales = await MaterialService.getAllMaterials();
    for (const m of materiales) {
      const codigo = normCodigo((m as { codigo?: string }).codigo);
      if (!codigo) continue;
      const nombre = String(
        (m as { nombre?: string }).nombre || (m as { descripcion?: string }).descripcion || "",
      ).trim();
      if (nombre) map.set(codigo, nombre);
    }
  } catch {
    // Si falla el catálogo, se cae al `descripcion` del item de la oferta.
  }
  return map;
};

const normalizeEstadoKey = (estado: string) =>
  estado
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

const ESTADO_LABELS: Record<string, string> = {
  "equipo instalado con exito": "Equipo instalado con éxito",
  "pendiente de instalacion": "Pendiente de instalación",
  "instalacion en proceso": "Instalación en Proceso",
  "esperando equipo": "Esperando equipo",
  "no interesado": "No interesado",
  "pendiente de presupuesto": "Pendiente de presupuesto",
  "pendiente de visita": "Pendiente de visita",
  "pendiente de visitarnos": "Pendiente de visitarnos",
  proximamente: "Próximamente",
  "revisando ofertas": "Revisando ofertas",
  "sin respuesta": "Sin respuesta",
};

const getEstadoLabel = (raw?: string | null): string => {
  const text = (raw || "").trim();
  if (!text) return "Sin estado";
  return ESTADO_LABELS[normalizeEstadoKey(text)] || text;
};

const fmtDate = (value?: string | null): string => {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value).slice(0, 10) : parsed.toLocaleDateString("es-ES");
};

const round2 = (v?: number | null): number => Math.round(((v ?? 0) + Number.EPSILON) * 100) / 100;

export interface ExportObrasTerminadasResult {
  count: number;
  filename: string;
}

export class ExportObrasTerminadasExcelService {
  /**
   * Exporta las obras terminadas que coincidan con los filtros aplicados en
   * pantalla. Una fila por obra; el código, nombre y cantidad de cada
   * material se apilan dentro de esa misma fila (igual que el export de
   * vales de salida), sin repetir cliente ni el resto de columnas.
   */
  static async exportar(
    filtros: ObrasTerminadasFiltros = {},
  ): Promise<ExportObrasTerminadasResult> {
    const [obras, nombresPorCodigo] = await Promise.all([
      this.fetchTodasLasObras(filtros),
      cargarNombresPorCodigo(),
    ]);

    const rows = obras.map((obra) => {
      const materiales = obra.materiales ?? [];
      return {
        cliente: obra.cliente_nombre || obra.nombre_completo || "Sin cliente",
        numero_oferta: obra.numero_oferta || "",
        comercial: obra.comercial || "",
        estado_cliente: getEstadoLabel(obra.estado_cliente),
        fecha_creacion: fmtDate(obra.fecha_creacion),
        fecha_equipo_instalado: fmtDate(obra.fecha_equipo_instalado),
        precio_final: round2(obra.precio_final),
        total_pagado: round2(obra.total_pagado),
        total_devuelto: round2(obra.total_devuelto),
        monto_pendiente: round2(obra.monto_pendiente),
        facturada: obra.facturada ? "Sí" : "No",
        numero_factura: obra.numero_factura || "",
        material_codigo: materiales.map((m) => m.material_codigo || ""),
        material: materiales.map(
          (m) =>
            nombresPorCodigo.get(normCodigo(m.material_codigo)) ||
            m.descripcion ||
            "",
        ),
        cantidad: materiales.map((m) => m.cantidad ?? 0),
      };
    });

    const filename = generateFilename("obras_terminadas");

    await exportToExcel({
      title: "Suncar SRL - Obras Terminadas",
      subtitle: `Registros: ${obras.length}`,
      filename,
      columns: [
        { header: "Cliente", key: "cliente", width: 28 },
        { header: "N° Oferta", key: "numero_oferta", width: 16 },
        { header: "Comercial", key: "comercial", width: 20 },
        { header: "Estado Cliente", key: "estado_cliente", width: 24 },
        { header: "F. Creación", key: "fecha_creacion", width: 14 },
        { header: "F. Eq. Instalado", key: "fecha_equipo_instalado", width: 16 },
        { header: "Precio Oferta", key: "precio_final", width: 14 },
        { header: "Cobrado", key: "total_pagado", width: 14 },
        { header: "Devuelto", key: "total_devuelto", width: 14 },
        { header: "Pendiente", key: "monto_pendiente", width: 14 },
        { header: "Facturada", key: "facturada", width: 12 },
        { header: "N° Factura", key: "numero_factura", width: 16 },
        { header: "Código", key: "material_codigo", width: 16 },
        { header: "Material", key: "material", width: 36 },
        { header: "Cantidad", key: "cantidad", width: 10 },
      ],
      data: rows,
      stackedColumnKeys: ["material_codigo", "material", "cantidad"],
    });

    return { count: obras.length, filename };
  }

  private static async fetchTodasLasObras(
    filtros: ObrasTerminadasFiltros,
  ): Promise<ObraTerminada[]> {
    const PAGE_SIZE = 500;
    let all: ObraTerminada[] = [];
    let skip = 0;
    let hasMore = true;
    while (hasMore) {
      const resp = await ObrasTerminadasService.getDatos({ ...filtros, limit: PAGE_SIZE, skip });
      all = [...all, ...resp.data];
      skip += PAGE_SIZE;
      hasMore = resp.data.length === PAGE_SIZE;
    }
    return all;
  }
}
