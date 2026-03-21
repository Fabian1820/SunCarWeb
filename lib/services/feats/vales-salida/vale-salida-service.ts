/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from "../../../api-config";
import type {
  ValeSalida,
  ValeSalidaAnularData,
  ValeSalidaCreateData,
  ValeSolicitudPendiente,
  ValeSalidaSummary,
  ValeSalidaSummaryResponse,
} from "../../../api-types";

const BASE_ENDPOINT = "/operaciones/vales-salida";
const buildDetailEndpoint = (id: string) =>
  `${BASE_ENDPOINT}/${encodeURIComponent(id)}`;
const buildAnularEndpoint = (id: string) => `${buildDetailEndpoint(id)}/anular`;

const extractApiError = (response: any): string | null => {
  if (!response) return null;
  if (response.success === false) {
    return (
      response?.error?.message ||
      response?.message ||
      response?.detail ||
      "La operacion no pudo completarse"
    );
  }
  if (response?.error?.message && !response?.id) {
    return response.error.message;
  }
  return null;
};

export class ValeSalidaService {
  /**
   * List vales de salida summary (optimized for table views)
   * GET /api/operaciones/vales-salida/summary
   */
  static async getValesSummary(
    params: {
      solicitud_tipo?: "material" | "venta";
      solicitud_material_id?: string;
      solicitud_venta_id?: string;
      trabajador_id?: string;
      q?: string; // Búsqueda de texto libre (antes era 'codigo')
      estado?: "usado" | "anulado" | string;
      skip?: number;
      limit?: number;
    } = {},
  ): Promise<{ data: ValeSalidaSummary[]; total: number }> {
    const search = new URLSearchParams();
    if (params.solicitud_tipo) {
      search.append("solicitud_tipo", params.solicitud_tipo);
    }
    if (params.solicitud_material_id) {
      search.append("solicitud_material_id", params.solicitud_material_id);
    }
    if (params.solicitud_venta_id) {
      search.append("solicitud_venta_id", params.solicitud_venta_id);
    }
    if (params.trabajador_id)
      search.append("trabajador_id", params.trabajador_id);
    if (params.q) search.append("q", params.q); // Búsqueda de texto libre
    if (params.estado) search.append("estado", params.estado);
    if (params.skip != null) search.append("skip", String(params.skip));
    if (params.limit != null) search.append("limit", String(params.limit));

    const endpoint = search.toString()
      ? `${BASE_ENDPOINT}/summary?${search.toString()}`
      : `${BASE_ENDPOINT}/summary`;

    const raw = await apiRequest<ValeSalidaSummaryResponse>(endpoint);
    const error = extractApiError(raw);
    if (error) throw new Error(error);

    const payload = raw?.data ?? raw;
    const data = Array.isArray(payload)
      ? payload
      : payload?.data || payload?.vales || [];
    const total = typeof payload === "object" ? payload.total || 0 : 0;

    return { data, total };
  }

  /**
   * List vales de salida with optional filters
   * GET /api/operaciones/vales-salida/
   */
  static async getVales(
    params: {
      solicitud_tipo?: "material" | "venta";
      solicitud_material_id?: string;
      solicitud_venta_id?: string;
      // Legacy fallback
      solicitud_id?: string;
      trabajador_id?: string;
      codigo?: string;
      estado?: "usado" | "anulado" | string;
      skip?: number;
      limit?: number;
    } = {},
  ): Promise<ValeSalida[]> {
    const search = new URLSearchParams();
    if (params.solicitud_tipo) {
      search.append("solicitud_tipo", params.solicitud_tipo);
    }
    const solicitudMaterialId =
      params.solicitud_material_id || params.solicitud_id;
    if (solicitudMaterialId) {
      search.append("solicitud_material_id", solicitudMaterialId);
    }
    if (params.solicitud_venta_id) {
      search.append("solicitud_venta_id", params.solicitud_venta_id);
    }
    if (params.trabajador_id)
      search.append("trabajador_id", params.trabajador_id);
    if (params.codigo) search.append("codigo", params.codigo);
    if (params.estado) search.append("estado", params.estado);
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
    return payload?.vales || payload?.data || [];
  }

  /**
   * Get a single vale by ID
   * GET /api/operaciones/vales-salida/{vale_id}
   */
  static async getValeById(id: string): Promise<ValeSalida | null> {
    const raw = await apiRequest<any>(buildDetailEndpoint(id));
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    const payload = raw?.data ?? raw;
    return payload || null;
  }

  /**
   * Create a new vale de salida
   * POST /api/operaciones/vales-salida/
   * trabajador_id is taken from the session token
   */
  static async createVale(data: ValeSalidaCreateData): Promise<ValeSalida> {
    const solicitudMaterialId = data.solicitud_material_id;
    const solicitudVentaId = data.solicitud_venta_id;

    if (
      (solicitudMaterialId && solicitudVentaId) ||
      (!solicitudMaterialId && !solicitudVentaId)
    ) {
      throw new Error(
        "Debe enviar solo uno: solicitud_material_id o solicitud_venta_id",
      );
    }

    const payload = {
      solicitud_material_id: solicitudMaterialId,
      solicitud_venta_id: solicitudVentaId,
      materiales: data.materiales,
    };

    const raw = await apiRequest<any>(`${BASE_ENDPOINT}/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return (raw?.data ?? raw) as ValeSalida;
  }

  /**
   * Get vales de salida by cliente venta ID
   * GET /api/operaciones/vales-salida/por-cliente-venta/{cliente_venta_id}
   */
  static async getValesPorClienteVenta(
    clienteVentaId: string,
    params: {
      estado?: "usado" | "anulado" | string;
      skip?: number;
      limit?: number;
    } = {},
  ): Promise<ValeSalida[]> {
    const search = new URLSearchParams();
    if (params.estado) search.append("estado", params.estado);
    if (params.skip != null) search.append("skip", String(params.skip));
    if (params.limit != null) search.append("limit", String(params.limit));

    const query = search.toString() ? `?${search.toString()}` : "";
    const encodedClienteId = encodeURIComponent(clienteVentaId);
    const endpoint = `${BASE_ENDPOINT}/por-cliente-venta/${encodedClienteId}${query}`;

    const raw = await apiRequest<any>(endpoint);
    const error = extractApiError(raw);
    if (error) throw new Error(error);

    const payload = raw?.data ?? raw;
    if (Array.isArray(payload)) return payload;
    return payload?.vales || payload?.data || [];
  }

  static async getSolicitudesPorAlmacen(
    almacenId: string,
    params: {
      skip?: number;
      limit?: number;
      estado?: "nueva" | "usada" | string;
      incluir_con_vale?: boolean;
    } = {},
  ): Promise<ValeSolicitudPendiente[]> {
    const search = new URLSearchParams();
    if (params.skip != null) search.append("skip", String(params.skip));
    if (params.limit != null) search.append("limit", String(params.limit));
    if (params.estado) search.append("estado", params.estado);
    if (params.incluir_con_vale != null) {
      search.append("incluir_con_vale", String(params.incluir_con_vale));
    }

    const query = search.toString() ? `?${search.toString()}` : "";
    const encodedAlmacenId = encodeURIComponent(almacenId);
    const primaryEndpoint = `${BASE_ENDPOINT}/solicitudes-por-almacen/${encodedAlmacenId}${query}`;
    const aliasEndpoint = `${BASE_ENDPOINT}/solicitudes-materiales-por-almacen/${encodedAlmacenId}${query}`;

    try {
      const raw = await apiRequest<any>(primaryEndpoint);
      const error = extractApiError(raw);
      if (error) throw new Error(error);

      const payload = raw?.data ?? raw;
      if (Array.isArray(payload)) return payload;
      return payload?.solicitudes || payload?.data || [];
    } catch {
      const raw = await apiRequest<any>(aliasEndpoint);
      const error = extractApiError(raw);
      if (error) throw new Error(error);

      const payload = raw?.data ?? raw;
      if (Array.isArray(payload)) return payload;
      return payload?.solicitudes || payload?.data || [];
    }
  }

  /**
   * Anular un vale de salida
   * PATCH /api/operaciones/vales-salida/{vale_id}/anular
   */
  static async anularVale(
    id: string,
    data: ValeSalidaAnularData,
  ): Promise<{ success?: boolean; message?: string }> {
    const raw = await apiRequest<any>(buildAnularEndpoint(id), {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    const payload = raw?.data ?? raw;
    return payload as { success?: boolean; message?: string };
  }
}
