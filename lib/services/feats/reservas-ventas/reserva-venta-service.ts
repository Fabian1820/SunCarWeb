/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from "../../../api-config";
import type {
  Reserva,
  ReservaConsumirData,
  ReservaCreateData,
  ReservaListParams,
  ReservaUpdateData,
} from "../../../types/feats/reservas-ventas/reserva-venta-types";

const BASE_ENDPOINT = "/reservas";

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
  if (response?.error?.message && !response?.id) {
    return response.error.message;
  }
  return null;
};

export class ReservaVentaService {
  static async getReservas(
    params: ReservaListParams = {},
  ): Promise<{ data: Reserva[]; total: number }> {
    const search = new URLSearchParams();
    if (params.estado) search.append("estado", params.estado);
    if (params.origen) search.append("origen", params.origen);
    if (params.almacen_id) search.append("almacen_id", params.almacen_id);
    if (params.cliente_id) search.append("cliente_id", params.cliente_id);
    if (params.oferta_id) search.append("oferta_id", params.oferta_id);
    if (params.skip != null) search.append("skip", String(params.skip));
    if (params.limit != null) search.append("limit", String(params.limit));

    const qs = search.toString();
    const endpoint = qs ? `${BASE_ENDPOINT}/?${qs}` : `${BASE_ENDPOINT}/`;
    const raw = await apiRequest<any>(endpoint);
    const error = extractApiError(raw);
    if (error) throw new Error(error);

    const data: Reserva[] = Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw)
        ? raw
        : [];
    const total: number = raw?.total ?? data.length;
    return { data, total };
  }

  static async getReservaById(id: string): Promise<Reserva> {
    const raw = await apiRequest<any>(
      `${BASE_ENDPOINT}/${encodeURIComponent(id)}`,
    );
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return (raw?.data ?? raw) as Reserva;
  }

  static async createReserva(data: ReservaCreateData): Promise<Reserva> {
    const raw = await apiRequest<any>(`${BASE_ENDPOINT}/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return (raw?.data ?? raw) as Reserva;
  }

  static async updateReserva(
    id: string,
    data: ReservaUpdateData,
  ): Promise<Reserva> {
    const raw = await apiRequest<any>(
      `${BASE_ENDPOINT}/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return (raw?.data ?? raw) as Reserva;
  }

  static async consumirReserva(
    id: string,
    data: ReservaConsumirData,
  ): Promise<Reserva> {
    const raw = await apiRequest<any>(
      `${BASE_ENDPOINT}/${encodeURIComponent(id)}/consumir`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return (raw?.data ?? raw) as Reserva;
  }

  static async cancelarReserva(id: string): Promise<Reserva> {
    const raw = await apiRequest<any>(
      `${BASE_ENDPOINT}/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return (raw?.data ?? raw) as Reserva;
  }

  static async expirarVencidas(): Promise<{ expiradas: number }> {
    const raw = await apiRequest<any>(`${BASE_ENDPOINT}/expirar-vencidas`, {
      method: "POST",
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return { expiradas: raw?.expiradas ?? 0 };
  }

  static async getReservasPorMaterial(
    almacen_id: string,
    material_id: string,
  ): Promise<{ data: Reserva[]; total: number }> {
    const search = new URLSearchParams({ almacen_id, material_id });
    const raw = await apiRequest<any>(`${BASE_ENDPOINT}/por-material?${search.toString()}`);
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    const data: Reserva[] = Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw)
        ? raw
        : [];
    const total: number = raw?.total ?? data.length;
    return { data, total };
  }
}
