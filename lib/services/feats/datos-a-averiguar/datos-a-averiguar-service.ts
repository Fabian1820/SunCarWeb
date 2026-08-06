import { apiRequest } from "@/lib/api-config";
import type {
  DatoAAveriguar,
  DatoAAveriguarCreateData,
  DatoAAveriguarUpdateData,
} from "@/lib/types/feats/datos-a-averiguar/datos-a-averiguar-types";

const BASE = "/datos-a-averiguar";

export const DatosAAveriguarService = {
  async listar(): Promise<DatoAAveriguar[]> {
    const response = await apiRequest<{
      success: boolean;
      data: DatoAAveriguar[];
    }>(`${BASE}/`);
    return response.data || [];
  },

  async crear(data: DatoAAveriguarCreateData): Promise<DatoAAveriguar> {
    const response = await apiRequest<{
      success: boolean;
      data: DatoAAveriguar;
    }>(`${BASE}/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async actualizar(
    id: string,
    data: DatoAAveriguarUpdateData,
  ): Promise<DatoAAveriguar> {
    const response = await apiRequest<{
      success: boolean;
      data: DatoAAveriguar;
    }>(`${BASE}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async eliminar(id: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`${BASE}/${id}`, {
      method: "DELETE",
    });
    return response.success === true;
  },
};
