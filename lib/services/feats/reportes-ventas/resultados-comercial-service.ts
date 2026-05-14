/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiRequest } from "../../../api-config";
import type {
  OfertaVentaConComercial,
  OfertasConComercialParams,
  OfertasConComercialResponse,
  ClienteVentaConResumen,
} from "../../../types/feats/reportes-ventas/reportes-ventas-types";

const BASE = "/operaciones/ofertas-ventas/con-comercial";
const CLIENTES_BASE = "/operaciones/clientes-ventas";

export class ResultadosVentasService {
  static async getOfertasConComercial(
    params: OfertasConComercialParams = {},
  ): Promise<OfertaVentaConComercial[]> {
    const qs = new URLSearchParams();
    if (params.cliente_venta_id) qs.append("cliente_venta_id", params.cliente_venta_id);
    if (params.almacen_id) qs.append("almacen_id", params.almacen_id);
    if (params.estado) qs.append("estado", params.estado);
    if (params.q) qs.append("q", params.q);
    if (params.skip != null) qs.append("skip", String(params.skip));
    if (params.limit != null) qs.append("limit", String(params.limit));

    const url = qs.toString() ? `${BASE}?${qs}` : BASE;
    const raw = await apiRequest<OfertasConComercialResponse | any>(url);

    if (raw?.success === false) {
      throw new Error(raw?.message || "Error al cargar resultados de ventas");
    }

    const payload = raw?.data ?? raw;
    if (Array.isArray(payload)) return payload as OfertaVentaConComercial[];
    return (payload?.data || []) as OfertaVentaConComercial[];
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
