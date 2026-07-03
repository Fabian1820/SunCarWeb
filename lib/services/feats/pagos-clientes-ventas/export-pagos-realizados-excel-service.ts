import { PagoVentaService } from "./pago-cliente-venta-service";
import { MaterialService } from "@/lib/api-services";
import type {
  PagoVenta,
  PagoVentaListParams,
} from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";
import { generateFilename } from "@/lib/export-service";
import {
  addBrandedSheet,
  downloadWorkbook,
  newBrandedWorkbook,
  type ExportColumnDef,
} from "@/lib/export-multi-sheet-service";

const METODO_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia_bancaria: "Transferencia",
  stripe: "Stripe",
  zelle: "Zelle",
  financiacion: "Financiación",
};

const fmtDate = (value?: string | null): string => {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value).slice(0, 10) : parsed.toLocaleDateString("es-ES");
};

const round2 = (v?: number | null): number => Math.round(((v ?? 0) + Number.EPSILON) * 100) / 100;

/** Convierte el pendiente (guardado en la moneda del pago) a su equivalente en USD. */
const getPendienteUsd = (p: PagoVenta): number => {
  const pend = Number(p.monto_pendiente_despues_pago);
  if (!Number.isFinite(pend)) return 0;
  const moneda = (p.moneda || "USD").toString();
  if (moneda === "USD") return pend;
  const tasa = Number(p.tasa_cambio);
  if (tasa > 0) return moneda === "EUR" ? pend * tasa : pend / tasa;
  return pend;
};

interface PagoVentaMaterialRaw {
  material_id?: string | null;
  codigo?: string | null;
  descripcion?: string | null;
  cantidad?: number | null;
}

/** `PagoVenta.materiales` está tipado como `string[] | string | null`, pero el
 * endpoint consolidado devuelve objetos `{ codigo, descripcion, cantidad, ... }`. */
const getMaterialesRaw = (p: PagoVenta): PagoVentaMaterialRaw[] => {
  const raw = p.materiales as unknown;
  if (!Array.isArray(raw)) return [];
  return raw.filter((m): m is PagoVentaMaterialRaw => !!m && typeof m === "object");
};

const getSolicitudKey = (p: PagoVenta): string =>
  p.solicitud_venta_id || p.solicitud_codigo || p.id;

interface CatalogoMaterial {
  codigo: string;
  nombre: string;
}

/**
 * Catálogo material_id -> {codigo, nombre}, igual que usa el export de vales
 * de salida, para rellenar código/nombre cuando el material embebido en la
 * solicitud no los trae (campos opcionales en el backend).
 */
const buildCatalogoPorMaterialId = async (): Promise<Map<string, CatalogoMaterial>> => {
  const map = new Map<string, CatalogoMaterial>();
  try {
    const materiales = await MaterialService.getAllMaterials();
    for (const m of materiales) {
      const key = m.material_id || m.id;
      if (!key) continue;
      map.set(key, { codigo: m.codigo || "", nombre: m.nombre || m.descripcion || "" });
    }
  } catch {
    // Si falla el catálogo, se exporta solo con los datos embebidos en la solicitud.
  }
  return map;
};

export interface ExportPagosRealizadosResult {
  pagosCount: number;
  materialesCount: number;
  filename: string;
}

interface MaterialRow {
  cliente: string;
  codigoSolicitud: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
}

const RESUMEN_COLUMNS: ExportColumnDef[] = [
  { header: "Fecha", width: 14 },
  { header: "Código Solicitud", width: 18 },
  { header: "N° Factura", width: 16 },
  { header: "Cliente", width: 28 },
  { header: "Comercial", width: 20 },
  { header: "Método de Pago", width: 18 },
  { header: "Monto", width: 14, currency: true },
  { header: "Moneda", width: 10 },
  { header: "Descuento %", width: 12 },
  { header: "Pendiente (USD)", width: 16, currency: true },
  { header: "A Plazos", width: 10 },
  { header: "Recibido por", width: 20 },
  { header: "Notas", width: 30 },
];

const MATERIALES_COLUMNS: ExportColumnDef[] = [
  { header: "Cliente", width: 28 },
  { header: "Código Solicitud", width: 18 },
  { header: "Código", width: 18 },
  { header: "Material", width: 44 },
  { header: "Cantidad", width: 12 },
];

export class ExportPagosRealizadosExcelService {
  /**
   * Exporta los pagos realizados (pestaña "Pagos Realizados" de Solicitudes de
   * Venta) que coincidan con los filtros aplicados, a un Excel con dos hojas:
   * el listado de pagos y, aparte, el detalle de los materiales vendidos en
   * cada solicitud (código, nombre y cantidad) — sin repetir materiales entre
   * pagos de una misma solicitud (ej. pagos a plazos).
   */
  static async exportar(
    filtros: PagoVentaListParams = {},
  ): Promise<ExportPagosRealizadosResult> {
    const [pagos, catalogo] = await Promise.all([
      this.fetchTodosLosPagos(filtros),
      buildCatalogoPorMaterialId(),
    ]);

    const workbook = newBrandedWorkbook();
    const fechaGenerado = new Date().toLocaleString("es-ES");

    addBrandedSheet(workbook, {
      sheetName: "Pagos Realizados",
      title: "SunCar SRL — Pagos Realizados",
      subtitle: `Generado: ${fechaGenerado} · Registros: ${pagos.length}`,
      columns: RESUMEN_COLUMNS,
      rows: pagos,
      toValues: (p) => [
        fmtDate(p.fecha),
        p.solicitud_codigo || "",
        p.factura_numero || "",
        p.cliente_nombre || "",
        p.comercial || "",
        METODO_LABELS[p.metodo_pago || ""] || p.metodo_pago || "",
        round2(p.monto),
        p.moneda || "USD",
        p.descuento_porcentaje || 0,
        round2(getPendienteUsd(p)),
        p.es_a_plazos ? "Sí" : "No",
        p.recibido_por || "",
        p.notas || "",
      ],
    });

    const materialRows = this.buildMaterialRows(pagos, catalogo);
    addBrandedSheet(workbook, {
      sheetName: "Materiales Vendidos",
      title: "SunCar SRL — Materiales Vendidos por Cliente",
      subtitle: "Detalle independiente de los materiales de cada solicitud (sin repetir por pagos a plazos)",
      columns: MATERIALES_COLUMNS,
      rows: materialRows,
      toValues: (m) => [m.cliente, m.codigoSolicitud, m.codigo, m.descripcion, m.cantidad],
    });

    const filename = generateFilename("pagos_realizados");
    await downloadWorkbook(workbook, filename);

    return { pagosCount: pagos.length, materialesCount: materialRows.length, filename };
  }

  private static async fetchTodosLosPagos(
    filtros: PagoVentaListParams,
  ): Promise<PagoVenta[]> {
    // El backend limita `limit` a 100 como máximo por página.
    const PAGE_SIZE = 100;
    let all: PagoVenta[] = [];
    let skip = 0;
    let hasMore = true;
    while (hasMore) {
      const resp = await PagoVentaService.getTodosPagos({ ...filtros, limit: PAGE_SIZE, skip });
      all = [...all, ...resp.data];
      skip += PAGE_SIZE;
      hasMore = resp.data.length === PAGE_SIZE;
    }
    return all;
  }

  private static buildMaterialRows(
    pagos: PagoVenta[],
    catalogo: Map<string, CatalogoMaterial>,
  ): MaterialRow[] {
    const vistos = new Set<string>();
    const rows: MaterialRow[] = [];
    pagos.forEach((p) => {
      const key = getSolicitudKey(p);
      if (vistos.has(key)) return;
      vistos.add(key);

      const materiales = getMaterialesRaw(p);
      if (!materiales.length) return;
      const cliente = p.cliente_nombre || "Sin cliente";
      materiales.forEach((m) => {
        const catInfo = m.material_id ? catalogo.get(m.material_id) : undefined;
        rows.push({
          cliente,
          codigoSolicitud: p.solicitud_codigo || "",
          codigo: m.codigo || catInfo?.codigo || "",
          descripcion: m.descripcion || catInfo?.nombre || "",
          cantidad: m.cantidad ?? 0,
        });
      });
    });
    return rows;
  }
}
