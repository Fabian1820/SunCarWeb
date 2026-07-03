import {
  ObrasTerminadasService,
  type ObraTerminada,
  type ObrasTerminadasFiltros,
} from "./obras-terminadas-service";
import { generateFilename } from "@/lib/export-service";
import {
  addBrandedSheet,
  downloadWorkbook,
  newBrandedWorkbook,
  type ExportColumnDef,
} from "@/lib/export-multi-sheet-service";

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
  obrasCount: number;
  materialesCount: number;
  filename: string;
}

interface MaterialRow {
  cliente: string;
  numeroOferta: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
}

const RESUMEN_COLUMNS: ExportColumnDef[] = [
  { header: "Cliente", width: 30 },
  { header: "N° Oferta", width: 16 },
  { header: "Comercial", width: 20 },
  { header: "Estado Cliente", width: 26 },
  { header: "F. Creación", width: 14 },
  { header: "F. Eq. Instalado", width: 16 },
  { header: "Precio Oferta", width: 16, currency: true },
  { header: "Total Materiales", width: 16, currency: true },
  { header: "Cobrado", width: 14, currency: true },
  { header: "Devuelto", width: 14, currency: true },
  { header: "Pendiente", width: 14, currency: true },
  { header: "Facturada", width: 12 },
  { header: "N° Factura", width: 16 },
];

const MATERIALES_COLUMNS: ExportColumnDef[] = [
  { header: "Cliente", width: 30 },
  { header: "N° Oferta", width: 16 },
  { header: "Código", width: 18 },
  { header: "Material", width: 44 },
  { header: "Cantidad", width: 12 },
];

export class ExportObrasTerminadasExcelService {
  /**
   * Exporta las obras terminadas que coinciden con los filtros aplicados en pantalla
   * a un Excel con dos hojas: el listado de obras y, aparte, el detalle de los
   * materiales instalados en cada una (código, nombre y cantidad).
   */
  static async exportar(
    filtros: ObrasTerminadasFiltros = {},
  ): Promise<ExportObrasTerminadasResult> {
    const obras = await this.fetchTodasLasObras(filtros);

    const workbook = newBrandedWorkbook();
    const fechaGenerado = new Date().toLocaleString("es-ES");

    addBrandedSheet(workbook, {
      sheetName: "Obras Terminadas",
      title: "SunCar SRL — Obras Terminadas",
      subtitle: `Generado: ${fechaGenerado} · Registros: ${obras.length}`,
      columns: RESUMEN_COLUMNS,
      rows: obras,
      toValues: (obra) => [
        obra.cliente_nombre || obra.nombre_completo || "Sin cliente",
        obra.numero_oferta || "",
        obra.comercial || "",
        getEstadoLabel(obra.estado_cliente),
        fmtDate(obra.fecha_creacion),
        fmtDate(obra.fecha_equipo_instalado),
        round2(obra.precio_final),
        round2(obra.total_materiales),
        round2(obra.total_pagado),
        round2(obra.total_devuelto),
        round2(obra.monto_pendiente),
        obra.facturada ? "Sí" : "No",
        obra.numero_factura || "",
      ],
    });

    const materialRows = this.buildMaterialRows(obras);
    addBrandedSheet(workbook, {
      sheetName: "Materiales Instalados",
      title: "SunCar SRL — Materiales Instalados por Cliente",
      subtitle: "Detalle independiente de los materiales asignados a cada obra terminada",
      columns: MATERIALES_COLUMNS,
      rows: materialRows,
      toValues: (m) => [m.cliente, m.numeroOferta, m.codigo, m.descripcion, m.cantidad],
    });

    const filename = generateFilename("obras_terminadas");
    await downloadWorkbook(workbook, filename);

    return { obrasCount: obras.length, materialesCount: materialRows.length, filename };
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

  private static buildMaterialRows(obras: ObraTerminada[]): MaterialRow[] {
    const rows: MaterialRow[] = [];
    obras.forEach((obra) => {
      const cliente = obra.cliente_nombre || obra.nombre_completo || "Sin cliente";
      (obra.materiales ?? []).forEach((m) => {
        rows.push({
          cliente,
          numeroOferta: obra.numero_oferta || "",
          codigo: m.material_codigo || "",
          descripcion: m.descripcion || "",
          cantidad: m.cantidad ?? 0,
        });
      });
    });
    return rows;
  }
}
