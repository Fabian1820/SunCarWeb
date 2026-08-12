import { apiRequest } from "@/lib/api-config";
import type {
  NumeroPrueba,
  NumeroPruebaCreateData,
  NumeroPruebaUpdateData,
} from "@/lib/types/feats/numeros-prueba/numeros-prueba-types";

const BASE = "/numeros-prueba";

export const NumerosPruebaService = {
  async listar(): Promise<NumeroPrueba[]> {
    const response = await apiRequest<{
      success: boolean;
      data: NumeroPrueba[];
    }>(`${BASE}/`);
    return response.data || [];
  },

  async crear(data: NumeroPruebaCreateData): Promise<NumeroPrueba> {
    const response = await apiRequest<{
      success: boolean;
      data: NumeroPrueba;
    }>(`${BASE}/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async actualizar(
    id: string,
    data: NumeroPruebaUpdateData,
  ): Promise<NumeroPrueba> {
    const response = await apiRequest<{
      success: boolean;
      data: NumeroPrueba;
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
