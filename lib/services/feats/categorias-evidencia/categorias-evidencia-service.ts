import { apiRequest } from "@/lib/api-config";
import type { CategoriaEvidencia } from "@/lib/types/feats/categorias-evidencia/categorias-evidencia-types";

const BASE = "/categorias-evidencia";

export const CategoriasEvidenciaService = {
  async listar(): Promise<CategoriaEvidencia[]> {
    const response = await apiRequest<{ success: boolean; data: CategoriaEvidencia[] }>(`${BASE}/`);
    return response.data || [];
  },

  async crear(categoria: CategoriaEvidencia): Promise<CategoriaEvidencia> {
    const response = await apiRequest<{ success: boolean; data: CategoriaEvidencia }>(`${BASE}/`, {
      method: "POST",
      body: JSON.stringify(categoria),
    });
    return response.data;
  },

  async editar(id: string, categoria: CategoriaEvidencia): Promise<CategoriaEvidencia> {
    const response = await apiRequest<{ success: boolean; data: CategoriaEvidencia }>(`${BASE}/${id}`, {
      method: "PUT",
      body: JSON.stringify(categoria),
    });
    return response.data;
  },

  async eliminar(id: string): Promise<void> {
    await apiRequest(`${BASE}/${id}`, { method: "DELETE" });
  },
};
