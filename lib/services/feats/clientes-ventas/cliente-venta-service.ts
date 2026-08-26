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
  static async getClientesPage(
    params: {
      nombre?: string;
      numero?: string;
      telefono?: string;
      ci?: string;
      provincia?: string;
      municipio?: string;
      busqueda?: string;
      skip?: number;
      limit?: number;
    } = {},
  ): Promise<{ data: ClienteVenta[]; total: number }> {
    const search = new URLSearchParams();
    if (params.nombre) search.append("nombre", params.nombre);
    if (params.numero) search.append("numero", params.numero);
    if (params.telefono) search.append("telefono", params.telefono);
    if (params.ci) search.append("ci", params.ci);
    if (params.provincia) search.append("provincia", params.provincia);
    if (params.municipio) search.append("municipio", params.municipio);
    if (params.busqueda) search.append("busqueda", params.busqueda);
    if (params.skip != null) search.append("skip", String(params.skip));
    if (params.limit != null) search.append("limit", String(params.limit));

    const endpoint = search.toString()
      ? `${BASE_ENDPOINT}/?${search.toString()}`
      : `${BASE_ENDPOINT}/`;

    const raw = await apiRequest<any>(endpoint);
    const error = extractApiError(raw);
    if (error) throw new Error(error);

    const payload = raw?.data ?? raw;
    const data: ClienteVenta[] = Array.isArray(payload)
      ? payload
      : payload?.clientes || payload?.data || [];
    // `total` viaja fuera de `data`; sin el no hay forma de saber si el backend
    // trunco la pagina. Si el backend no lo manda, asumimos que no hay mas.
    const total = typeof raw?.total === "number" ? raw.total : data.length;
    return { data, total };
  }

  static async getClientes(
    params: {
      nombre?: string;
      numero?: string;
      telefono?: string;
      ci?: string;
      provincia?: string;
      municipio?: string;
      busqueda?: string;
      skip?: number;
      limit?: number;
    } = {},
  ): Promise<ClienteVenta[]> {
    const { data } = await this.getClientesPage(params);
    return data;
  }

  /**
   * Trae la coleccion completa paginando contra el backend. El modulo de
   * gestion filtra en memoria, asi que necesita todos los clientes: pedir una
   * sola pagina "grande" volvia invisibles a los mas antiguos en cuanto la
   * coleccion superaba ese tope.
   */
  static async getAllClientes(pageSize = 500): Promise<ClienteVenta[]> {
    const acumulado: ClienteVenta[] = [];
    let skip = 0;
    let total = Infinity;

    // Cota dura por si el backend devolviera un `total` inconsistente.
    for (let pagina = 0; pagina < 100; pagina += 1) {
      const { data, total: reportado } = await this.getClientesPage({
        skip,
        limit: pageSize,
      });
      acumulado.push(...data);
      total = reportado;
      skip += pageSize;
      if (data.length < pageSize || acumulado.length >= total) break;
    }

    return acumulado;
  }

  static async getClienteById(id: string): Promise<ClienteVenta | null> {
    const raw = await apiRequest<any>(buildDetailEndpoint(id));
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return (raw?.data ?? raw) as ClienteVenta;
  }

  /**
   * Busqueda server-side para los selectores de cliente. El backend compara el
   * termino contra nombre, numero, CI, telefono y ubicacion, sin distinguir
   * tildes ni mayusculas.
   */
  static async buscarClientesPorNombre(
    nombre: string,
    limit = 50,
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
      return this.getClientes({ busqueda: nombre.trim(), limit });
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
    console.log("📤 [patchCliente] id:", id, "body:", JSON.stringify(data));
    const raw = await apiRequest<any>(buildDetailEndpoint(id), {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return (raw?.data ?? raw) as ClienteVenta;
  }

  /**
   * Anula (activo=false) o reactiva (activo=true) sin borrar. Es la via para
   * dar de baja a un cliente que ya tiene ofertas, solicitudes o facturas:
   * eliminarlo dejaria esos documentos apuntando a un cliente inexistente.
   */
  static async setClienteStatus(
    id: string,
    activo: boolean,
  ): Promise<ClienteVenta> {
    const raw = await apiRequest<any>(`${buildDetailEndpoint(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ activo }),
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
