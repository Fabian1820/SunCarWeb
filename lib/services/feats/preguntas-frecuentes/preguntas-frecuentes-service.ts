import { apiRequest } from "@/lib/api-config";
import type {
  PreguntaFrecuente,
  PreguntaFrecuenteCreateData,
  PreguntaFrecuenteUpdateData,
} from "@/lib/types/feats/preguntas-frecuentes/preguntas-frecuentes-types";

const BASE = "/preguntas-frecuentes";

export const PreguntasFrecuentesService = {
  async listar(): Promise<PreguntaFrecuente[]> {
    const response = await apiRequest<{
      success: boolean;
      data: PreguntaFrecuente[];
    }>(`${BASE}/`);
    return response.data || [];
  },

  async crear(data: PreguntaFrecuenteCreateData): Promise<PreguntaFrecuente> {
    const response = await apiRequest<{
      success: boolean;
      data: PreguntaFrecuente;
    }>(`${BASE}/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async actualizar(
    id: string,
    data: PreguntaFrecuenteUpdateData,
  ): Promise<PreguntaFrecuente> {
    const response = await apiRequest<{
      success: boolean;
      data: PreguntaFrecuente;
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
