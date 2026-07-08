import { PagoVentaService } from "./pago-cliente-venta-service";
import type {
  PagoVenta,
  PagoVentaListParams,
} from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";
import { exportToExcel, generateFilename } from "@/lib/export-service";

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
  /** Nombre del material resuelto por el backend desde el catálogo. */
  nombre?: string | null;
  cantidad?: number | null;
}

/** `PagoVenta.materiales` está tipado como `string[] | string | null`, pero el
 * endpoint consolidado devuelve objetos `{ codigo, descripcion, nombre, cantidad, ... }`. */
const getMaterialesRaw = (p: PagoVenta): PagoVentaMaterialRaw[] => {
  const raw = p.materiales as unknown;
  if (!Array.isArray(raw)) return [];
  return raw.filter((m): m is PagoVentaMaterialRaw => !!m && typeof m === "object");
};

export interface ExportPagosRealizadosResult {
  count: number;
  filename: string;
}

export class ExportPagosRealizadosExcelService {
  /**
   * Exporta los pagos realizados (pestaña "Pagos Realizados" de Solicitudes de
   * Venta) que coincidan con los filtros aplicados. Una fila por pago; el
   * código, nombre y cantidad de cada material de la solicitud se apilan
   * dentro de esa misma fila (igual que el export de vales de salida).
   */
  static async exportar(
    filtros: PagoVentaListParams = {},
  ): Promise<ExportPagosRealizadosResult> {
    const pagos = await this.fetchTodosLosPagos(filtros);

    const rows = pagos.map((p) => {
      const materiales = getMaterialesRaw(p);

      return {
        fecha: fmtDate(p.fecha),
        solicitud_codigo: p.solicitud_codigo || "",
        factura_numero: p.factura_numero || "",
        cliente: p.cliente_nombre || "",
        comercial: p.comercial || "",
        metodo_pago: METODO_LABELS[p.metodo_pago || ""] || p.metodo_pago || "",
        monto: round2(p.monto),
        moneda: p.moneda || "USD",
        descuento: p.descuento_porcentaje || 0,
        pendiente_usd: round2(getPendienteUsd(p)),
        a_plazos: p.es_a_plazos ? "Sí" : "No",
        recibido_por: p.recibido_por || "",
        notas: p.notas || "",
        material_codigo: materiales.map((m) => m.codigo || ""),
        material: materiales.map((m) => m.nombre || m.descripcion || ""),
        cantidad: materiales.map((m) => m.cantidad ?? 0),
      };
    });

    const filename = generateFilename("pagos_realizados");

    await exportToExcel({
      title: "Suncar SRL - Pagos Realizados",
      subtitle: `Registros: ${pagos.length}`,
      filename,
      columns: [
        { header: "Fecha", key: "fecha", width: 12 },
        { header: "Código Solicitud", key: "solicitud_codigo", width: 16 },
        { header: "N° Factura", key: "factura_numero", width: 14 },
        { header: "Cliente", key: "cliente", width: 26 },
        { header: "Comercial", key: "comercial", width: 18 },
        { header: "Método de Pago", key: "metodo_pago", width: 16 },
        { header: "Monto", key: "monto", width: 12 },
        { header: "Moneda", key: "moneda", width: 8 },
        { header: "Descuento %", key: "descuento", width: 12 },
        { header: "Pendiente (USD)", key: "pendiente_usd", width: 14 },
        { header: "A Plazos", key: "a_plazos", width: 10 },
        { header: "Recibido por", key: "recibido_por", width: 18 },
        { header: "Notas", key: "notas", width: 24 },
        { header: "Código", key: "material_codigo", width: 16 },
        { header: "Material", key: "material", width: 36 },
        { header: "Cantidad", key: "cantidad", width: 10 },
      ],
      data: rows,
      stackedColumnKeys: ["material_codigo", "material", "cantidad"],
    });

    return { count: pagos.length, filename };
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
}
