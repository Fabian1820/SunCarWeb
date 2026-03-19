/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from "../../../api-config";
import type {
  DevolucionVale,
  DevolucionValeCreateData,
  DevolucionValeResumen,
} from "../../../api-types";

const BASE_ENDPOINT = "/operaciones/devoluciones-vale";

const buildDetailEndpoint = (id: string) =>
  `${BASE_ENDPOINT}/${encodeURIComponent(id)}`;

const buildResumenPorValeEndpoint = (valeId: string) =>
  `${BASE_ENDPOINT}/por-vale/${encodeURIComponent(valeId)}/resumen`;

const extractApiError = (response: any): string | null => {
  if (!response) return null;
  if (response.success === false) {
    return (
      response?.detail ||
      response?.error?.message ||
      response?.message ||
      "La operacion no pudo completarse"
    );
  }
  if (typeof response?.detail === "string" && response.detail.trim()) {
    return response.detail;
  }
  if (response?.error?.message && !response?.id) {
    return response.error.message;
  }
  return null;
};

export class DevolucionValeService {
  /**
   * Crear devolucion de vale (aplica stock inmediatamente)
   * POST /api/operaciones/devoluciones-vale/
   */
  static async createDevolucion(
    data: DevolucionValeCreateData,
  ): Promise<DevolucionVale> {
    const raw = await apiRequest<any>(`${BASE_ENDPOINT}/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return (raw?.data ?? raw) as DevolucionVale;
  }

  /**
   * Obtener resumen por vale para precargar formulario de devolucion
   * GET /api/operaciones/devoluciones-vale/por-vale/{vale_id}/resumen
   */
  static async getResumenPorVale(valeId: string): Promise<DevolucionValeResumen> {
    const raw = await apiRequest<any>(buildResumenPorValeEndpoint(valeId));
    const error = extractApiError(raw);
    if (error) throw new Error(error);

    const payload = raw?.data ?? raw;
    if (payload?.resumen) {
      return payload.resumen as DevolucionValeResumen;
    }
    return payload as DevolucionValeResumen;
  }

  /**
   * Listar devoluciones
   * GET /api/operaciones/devoluciones-vale/?vale_id={id}&skip=0&limit=100
   */
  static async getDevoluciones(
    params: {
      vale_id?: string;
      skip?: number;
      limit?: number;
    } = {},
  ): Promise<DevolucionVale[]> {
    const search = new URLSearchParams();
    if (params.vale_id) search.append("vale_id", params.vale_id);
    if (params.skip != null) search.append("skip", String(params.skip));
    if (params.limit != null) search.append("limit", String(params.limit));

    const endpoint = search.toString()
      ? `${BASE_ENDPOINT}/?${search.toString()}`
      : `${BASE_ENDPOINT}/`;

    const raw = await apiRequest<any>(endpoint);
    const error = extractApiError(raw);
    if (error) throw new Error(error);

    const payload = raw?.data ?? raw;
    if (Array.isArray(payload)) return payload;
    return payload?.devoluciones || payload?.items || payload?.data || [];
  }

  /**
   * Detalle de devolucion
   * GET /api/operaciones/devoluciones-vale/{devolucion_id}
   */
  static async getDevolucionById(id: string): Promise<DevolucionVale | null> {
    const raw = await apiRequest<any>(buildDetailEndpoint(id));
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    const payload = raw?.data ?? raw;
    return payload || null;
  }
}
