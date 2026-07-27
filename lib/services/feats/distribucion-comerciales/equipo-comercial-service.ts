import { apiRequest } from "@/lib/api-config";
import type {
  ComercialDistribucion,
  EquipoComercial,
  JefesGenerales,
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

  async createEquipo(
    nombre: string,
    integrantes: string[],
    jefeCi?: string | null,
  ): Promise<string> {
    const response = await apiRequest<{
      success: boolean;
      message: string;
      data: { id: string };
    }>(`${BASE}/`, {
      method: "POST",
      body: JSON.stringify({ nombre, integrantes, jefe_ci: jefeCi || null }),
    });
    return response.data.id;
  },

  async updateEquipo(
    id: string,
    nombre: string,
    integrantes: string[],
    jefeCi?: string | null,
  ): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`${BASE}/${id}`, {
      method: "PUT",
      body: JSON.stringify({ nombre, integrantes, jefe_ci: jefeCi || null }),
    });
    return response.success === true;
  },

  async deleteEquipo(id: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`${BASE}/${id}`, {
      method: "DELETE",
    });
    return response.success === true;
  },

  async getJefesGenerales(): Promise<JefesGenerales> {
    const response = await apiRequest<{
      success: boolean;
      data: JefesGenerales;
    }>(`${BASE}/jefes/generales`);
    return (
      response.data || { jefe_comercial_general: null, jefe_instaladora: null }
    );
  },

  async setJefeGeneral(
    rol: "comercial_general" | "instaladora",
    ci: string | null,
  ): Promise<JefesGenerales> {
    const response = await apiRequest<{
      success: boolean;
      data: JefesGenerales;
    }>(`${BASE}/jefes/generales/${rol}`, {
      method: "PUT",
      body: JSON.stringify({ ci }),
    });
    return (
      response.data || { jefe_comercial_general: null, jefe_instaladora: null }
    );
  },
};
