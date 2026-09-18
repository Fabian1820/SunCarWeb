import { apiRequest } from "@/lib/api-config";
import type {
  CategoriaEquipos,
  ClienteHistorial,
  ClientesDeEquipo,
  EquiposProvincia,
  FiltrosClienteHistorial,
  OpcionesFiltroClientes,
  HistorialCliente,
  ProvinciaResumen,
} from "@/lib/types/feats/historial/historial-types";

export const HistorialService = {
  async clientes(
    q: string,
    skip: number,
    limit = 50,
    filtros: FiltrosClienteHistorial = {},
  ): Promise<{ total: number; data: ClienteHistorial[] }> {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
    if (q.trim()) params.set("q", q.trim());
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor) params.set(clave, valor);
    }
    const r = await apiRequest<{ success: boolean; total: number; data: ClienteHistorial[] }>(
      `/historial/clientes?${params.toString()}`,
    );
    return { total: r.total ?? 0, data: r.data ?? [] };
  },

  /** Los estados, provincias y municipios que tienen los clientes. */
  async filtrosClientes(): Promise<OpcionesFiltroClientes> {
    const r = await apiRequest<{ success: boolean; data: OpcionesFiltroClientes }>(`/historial/clientes/filtros`);
    return r.data ?? { estados: [], provincias: [] };
  },

  /** Todo lo que ha pasado con el cliente, del principio a hoy. */
  async cliente(numero: string, vista: "operaciones" | "comercial" = "operaciones"): Promise<HistorialCliente> {
    const r = await apiRequest<{ success: boolean; data: HistorialCliente }>(
      `/historial/clientes/${encodeURIComponent(numero)}?vista=${vista}`,
    );
    return r.data;
  },

  async equipos(): Promise<CategoriaEquipos[]> {
    const r = await apiRequest<{ success: boolean; data: { categorias: CategoriaEquipos[] } }>(`/historial/equipos`);
    return r.data?.categorias ?? [];
  },

  async clientesDeEquipo(materialCodigo: string, provincia?: string): Promise<ClientesDeEquipo> {
    const params = provincia ? `?provincia=${encodeURIComponent(provincia)}` : "";
    const r = await apiRequest<{ success: boolean; data: ClientesDeEquipo }>(
      `/historial/equipos/${encodeURIComponent(materialCodigo)}/clientes${params}`,
    );
    return r.data;
  },

  /** Las provincias con clientes, con cuántos tiene cada una. */
  async provincias(): Promise<ProvinciaResumen[]> {
    const r = await apiRequest<{ success: boolean; data: { provincias: ProvinciaResumen[] } }>(`/historial/provincias`);
    return r.data?.provincias ?? [];
  },

  /** Inversores, baterías y paneles de los clientes de una provincia. */
  async equiposProvincia(provincia: string): Promise<EquiposProvincia> {
    const r = await apiRequest<{ success: boolean; data: EquiposProvincia }>(
      `/historial/provincias/${encodeURIComponent(provincia)}/equipos`,
    );
    return r.data;
  },
};
