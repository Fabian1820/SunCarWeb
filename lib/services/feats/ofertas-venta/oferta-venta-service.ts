/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiRequest } from "../../../api-config";
import type {
  OfertaVenta,
  OfertaVentaCreateData,
  OfertaVentaUpdateData,
  OfertaVentaListParams,
} from "../../../types/feats/ofertas-venta/oferta-venta-types";

const BASE = "/operaciones/ofertas-ventas";

const extractApiError = (response: any): string | null => {
  if (!response) return null;
  if (response.success === false) {
    return (
      response?.error?.message ||
      response?.message ||
      response?.detail ||
      "La operación no pudo completarse"
    );
  }
  return null;
};

export class OfertaVentaService {
  static async getOfertas(params: OfertaVentaListParams = {}): Promise<OfertaVenta[]> {
    const qs = new URLSearchParams();
    if (params.cliente_venta_id) qs.append("cliente_venta_id", params.cliente_venta_id);
    if (params.estado) qs.append("estado", params.estado);
    if (params.skip != null) qs.append("skip", String(params.skip));
    if (params.limit != null) qs.append("limit", String(params.limit));

    const url = qs.toString() ? `${BASE}/?${qs}` : `${BASE}/`;
    const raw = await apiRequest<any>(url);
    const err = extractApiError(raw);
    if (err) throw new Error(err);

    const payload = raw?.data ?? raw;
    if (Array.isArray(payload)) return payload;
    return payload?.ofertas || payload?.data || [];
  }

  static async getOfertasByCliente(clienteVentaId: string): Promise<OfertaVenta[]> {
    return this.getOfertas({ cliente_venta_id: clienteVentaId, limit: 100 });
  }

  static async getOfertaById(id: string): Promise<OfertaVenta | null> {
    const raw = await apiRequest<any>(`${BASE}/${encodeURIComponent(id)}`);
    const err = extractApiError(raw);
    if (err) throw new Error(err);
    return (raw?.data ?? raw) as OfertaVenta;
  }

  static async createOferta(data: OfertaVentaCreateData): Promise<OfertaVenta> {
    const raw = await apiRequest<any>(`${BASE}/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    const err = extractApiError(raw);
    if (err) throw new Error(err);
    return (raw?.data ?? raw) as OfertaVenta;
  }

  static async updateOferta(id: string, data: OfertaVentaUpdateData): Promise<OfertaVenta> {
    const raw = await apiRequest<any>(`${BASE}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    const err = extractApiError(raw);
    if (err) throw new Error(err);
    return (raw?.data ?? raw) as OfertaVenta;
  }

  static async deleteOferta(id: string): Promise<void> {
    const raw = await apiRequest<any>(`${BASE}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const err = extractApiError(raw);
    if (err) throw new Error(err);
  }
}
