/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiRequest } from "../../../api-config";
import type {
  FacturaVentaConComercial,
  FacturasConComercialParams,
  FacturasConComercialResponse,
  ClienteVentaConResumen,
} from "../../../types/feats/reportes-ventas/reportes-ventas-types";

const FACTURAS_BASE = "/operaciones/facturas-ventas/con-comercial";
const CLIENTES_BASE = "/operaciones/clientes-ventas";

export class ResultadosVentasService {
  static async getFacturasConComercial(
    params: FacturasConComercialParams = {},
  ): Promise<FacturaVentaConComercial[]> {
    const qs = new URLSearchParams();
    if (params.cliente_venta_id) qs.append("cliente_venta_id", params.cliente_venta_id);
    if (params.comercial) qs.append("comercial", params.comercial);
    if (params.fecha_desde) qs.append("fecha_desde", params.fecha_desde);
    if (params.fecha_hasta) qs.append("fecha_hasta", params.fecha_hasta);
    if (params.skip != null) qs.append("skip", String(params.skip));
    if (params.limit != null) qs.append("limit", String(params.limit));

    const url = qs.toString() ? `${FACTURAS_BASE}?${qs}` : FACTURAS_BASE;
    const raw = await apiRequest<FacturasConComercialResponse | any>(url);

    if (raw?.success === false) {
      throw new Error(raw?.message || "Error al cargar facturas con comercial");
    }

    const payload = raw?.data ?? raw;
    if (Array.isArray(payload)) return payload as FacturaVentaConComercial[];
    return (payload?.data || []) as FacturaVentaConComercial[];
  }

  static async getClientesConResumen(
    params: { skip?: number; limit?: number } = {},
  ): Promise<ClienteVentaConResumen[]> {
    const qs = new URLSearchParams();
    qs.append("con_resumen", "true");
    if (params.skip != null) qs.append("skip", String(params.skip));
    if (params.limit != null) qs.append("limit", String(params.limit));

    const raw = await apiRequest<any>(`${CLIENTES_BASE}/?${qs.toString()}`);

    if (raw?.success === false) {
      throw new Error(raw?.message || "Error al cargar clientes con resumen");
    }

    const payload = raw?.data ?? raw;
    if (Array.isArray(payload)) return payload as ClienteVentaConResumen[];
    return (payload?.clientes || payload?.data || []) as ClienteVentaConResumen[];
  }
}
