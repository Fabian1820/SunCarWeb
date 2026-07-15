import { apiRequest } from "@/lib/api-config";
import type {
  ComercialDistribucion,
  EquipoComercial,
} from "@/lib/types/feats/distribucion-comerciales/distribucion-types";

const BASE = "/equipos-comerciales";

export const EquipoComercialService = {
  async getComerciales(): Promise<ComercialDistribucion[]> {
    const response = await apiRequest<{
      success: boolean;
      data: ComercialDistribucion[];
    }>(`${BASE}/comerciales`);
    return response.data || [];
  },

  async getEquipos(): Promise<EquipoComercial[]> {
    const response = await apiRequest<{
      success: boolean;
      data: EquipoComercial[];
    }>(`${BASE}/`);
    return response.data || [];
  },

  async getEquipo(id: string): Promise<EquipoComercial | null> {
    const response = await apiRequest<{
      success: boolean;
      data: EquipoComercial;
    }>(`${BASE}/${id}`);
    return response.data ?? null;
  },

  async createEquipo(nombre: string, integrantes: string[]): Promise<string> {
    const response = await apiRequest<{
      success: boolean;
      message: string;
      data: { id: string };
    }>(`${BASE}/`, {
      method: "POST",
      body: JSON.stringify({ nombre, integrantes }),
    });
    return response.data.id;
  },

  async updateEquipo(
    id: string,
    nombre: string,
    integrantes: string[],
  ): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`${BASE}/${id}`, {
      method: "PUT",
      body: JSON.stringify({ nombre, integrantes }),
    });
    return response.success === true;
  },

  async deleteEquipo(id: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`${BASE}/${id}`, {
      method: "DELETE",
    });
    return response.success === true;
  },
};
