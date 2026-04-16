/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from "../../../api-config";
import type {
  ClienteVenta,
  ClienteVentaCreateData,
  ClienteVentaUpdateData,
} from "../../../api-types";

const BASE_ENDPOINT = "/operaciones/clientes-ventas";
const buildDetailEndpoint = (id: string) =>
  `${BASE_ENDPOINT}/${encodeURIComponent(id)}`;

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

export class ClienteVentaService {
  static async getClientes(
    params: {
      nombre?: string;
      numero?: string;
      telefono?: string;
      ci?: string;
      provincia?: string;
      municipio?: string;
      skip?: number;
      limit?: number;
    } = {},
  ): Promise<ClienteVenta[]> {
    const search = new URLSearchParams();
    if (params.nombre) search.append("nombre", params.nombre);
    if (params.numero) search.append("numero", params.numero);
    if (params.telefono) search.append("telefono", params.telefono);
    if (params.ci) search.append("ci", params.ci);
    if (params.provincia) search.append("provincia", params.provincia);
    if (params.municipio) search.append("municipio", params.municipio);
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
    return payload?.clientes || payload?.data || [];
  }

  static async getClienteById(id: string): Promise<ClienteVenta | null> {
    const raw = await apiRequest<any>(buildDetailEndpoint(id));
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return (raw?.data ?? raw) as ClienteVenta;
  }

  static async buscarClientesPorNombre(
    nombre: string,
    limit = 20,
  ): Promise<ClienteVenta[]> {
    const search = new URLSearchParams();
    if (nombre.trim()) search.append("nombre", nombre.trim());
    if (limit > 0) search.append("limit", String(limit));

    try {
      const raw = await apiRequest<any>(
        `${BASE_ENDPOINT}/buscar?${search.toString()}`,
      );
      const error = extractApiError(raw);
      if (error) throw new Error(error);

      const payload = raw?.data ?? raw;
      if (Array.isArray(payload)) return payload;
      return payload?.clientes || payload?.data || [];
    } catch {
      // Fallback de compatibilidad por si la ruta /buscar no existe en un entorno.
      return this.getClientes({ nombre: nombre.trim(), limit });
    }
  }

  static async createCliente(
    data: ClienteVentaCreateData,
  ): Promise<ClienteVenta> {
    const raw = await apiRequest<any>(`${BASE_ENDPOINT}/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return (raw?.data ?? raw) as ClienteVenta;
  }

  static async putCliente(
    id: string,
    data: ClienteVentaUpdateData,
  ): Promise<ClienteVenta> {
    const raw = await apiRequest<any>(buildDetailEndpoint(id), {
      method: "PUT",
      body: JSON.stringify(data),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return (raw?.data ?? raw) as ClienteVenta;
  }

  static async patchCliente(
    id: string,
    data: ClienteVentaUpdateData,
  ): Promise<ClienteVenta> {
    const raw = await apiRequest<any>(buildDetailEndpoint(id), {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return (raw?.data ?? raw) as ClienteVenta;
  }

  static async deleteCliente(
    id: string,
  ): Promise<{ success?: boolean; message?: string }> {
    const raw = await apiRequest<any>(buildDetailEndpoint(id), {
      method: "DELETE",
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return (raw?.data ?? raw) as { success?: boolean; message?: string };
  }
}
