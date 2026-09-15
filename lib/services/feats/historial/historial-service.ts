import { apiRequest } from "@/lib/api-config";
import type {
  CategoriaEquipos,
  ClienteHistorial,
  ClientesDeEquipo,
  HistorialCliente,
} from "@/lib/types/feats/historial/historial-types";

export const HistorialService = {
  async clientes(q: string, skip: number, limit = 50): Promise<{ total: number; data: ClienteHistorial[] }> {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
    if (q.trim()) params.set("q", q.trim());
    const r = await apiRequest<{ success: boolean; total: number; data: ClienteHistorial[] }>(
      `/historial/clientes?${params.toString()}`,
    );
    return { total: r.total ?? 0, data: r.data ?? [] };
  },

  /** Todo lo que ha pasado con el cliente, del principio a hoy. */
  async cliente(numero: string): Promise<HistorialCliente> {
    const r = await apiRequest<{ success: boolean; data: HistorialCliente }>(
      `/historial/clientes/${encodeURIComponent(numero)}`,
    );
    return r.data;
  },

  async equipos(): Promise<CategoriaEquipos[]> {
    const r = await apiRequest<{ success: boolean; data: { categorias: CategoriaEquipos[] } }>(`/historial/equipos`);
    return r.data?.categorias ?? [];
  },

  async clientesDeEquipo(materialCodigo: string): Promise<ClientesDeEquipo> {
    const r = await apiRequest<{ success: boolean; data: ClientesDeEquipo }>(
      `/historial/equipos/${encodeURIComponent(materialCodigo)}/clientes`,
    );
    return r.data;
  },
};
