import { apiRequest } from "@/lib/api-config";
import type {
  ActualizacionSistema,
  ActualizacionSistemaCreateData,
} from "@/lib/types/feats/actualizaciones-sistema/actualizaciones-sistema-types";

const BASE = "/actualizaciones-sistema";

export const ActualizacionesSistemaService = {
  /** dias=2 trae "hoy y ayer" (por defecto). */
  async listarRecientes(dias = 2): Promise<ActualizacionSistema[]> {
    const response = await apiRequest<{
      success: boolean;
      data: ActualizacionSistema[];
    }>(`${BASE}/?dias=${dias}`);
    return response.data || [];
  },

  async crear(
    data: ActualizacionSistemaCreateData,
  ): Promise<ActualizacionSistema> {
    const response = await apiRequest<{
      success: boolean;
      data: ActualizacionSistema;
    }>(`${BASE}/`, { method: "POST", body: JSON.stringify(data) });
    return response.data;
  },

  async eliminar(id: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`${BASE}/${id}`, {
      method: "DELETE",
    });
    return response.success === true;
  },
};
