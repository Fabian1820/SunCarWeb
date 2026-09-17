import { apiRequest } from "@/lib/api-config";
import type {
  CategoriaEquipos,
  ClaveUeb,
  ClienteHistorial,
  ClientesDeEquipo,
  EquiposUeb,
  FiltrosClienteHistorial,
  OpcionesFiltroClientes,
  HistorialCliente,
  UebResumen,
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

  async clientesDeEquipo(materialCodigo: string, ueb?: ClaveUeb): Promise<ClientesDeEquipo> {
    const params = ueb ? `?ueb=${encodeURIComponent(ueb)}` : "";
    const r = await apiRequest<{ success: boolean; data: ClientesDeEquipo }>(
      `/historial/equipos/${encodeURIComponent(materialCodigo)}/clientes${params}`,
    );
    return r.data;
  },

  /** Instaladora Habana, UEB Las Tunas y UEB Santa Clara, con cuántos clientes tiene cada una. */
  async ueb(): Promise<UebResumen[]> {
    const r = await apiRequest<{ success: boolean; data: { ueb: UebResumen[] } }>(`/historial/ueb`);
    return r.data?.ueb ?? [];
  },

  /** Los modelos de inversor de los clientes de una UEB. */
  async equiposUeb(ueb: ClaveUeb): Promise<EquiposUeb> {
    const r = await apiRequest<{ success: boolean; data: EquiposUeb }>(`/historial/ueb/${encodeURIComponent(ueb)}/equipos`);
    return r.data;
  },
};
