// Servicio API para Marcas

import { apiRequest } from '../../../api-config'
import type {
  Marca,
  MarcaCreateRequest,
  MarcaUpdateRequest,
  MarcaSimplificada,
} from '../../../types/feats/marcas/marca-types'

export class MarcaService {
  /**
   * Obtiene todas las marcas
   * @param tipoMaterial - Filtro opcional por tipo de material
   */
  static async getMarcas(tipoMaterial?: string): Promise<Marca[]> {
    const url = tipoMaterial ? `/marcas/?tipo_material=${tipoMaterial}` : '/marcas/'
    const response = await apiRequest<{ success: boolean; data: Marca[] }>(url)
    return response.data || []
  }

  /**
   * Obtiene una marca por ID
   */
  static async getMarcaById(id: string): Promise<Marca | null> {
    const response = await apiRequest<{ success: boolean; data: Marca }>(`/marcas/${id}`)
    return response.success ? response.data : null
  }

  /**
   * Obtiene marcas simplificadas (solo id y nombre) para dropdowns
   * @param tipoMaterial - Filtro opcional por tipo de material
   */
  static async getMarcasSimplificadas(tipoMaterial?: string): Promise<MarcaSimplificada[]> {
    const marcas = await this.getMarcas(tipoMaterial)
    return marcas
      .filter((m) => m.is_active && m.id)
      .map((m) => ({
        id: m.id!,
        nombre: m.nombre,
        tipos_material: m.tipos_material,
      }))
  }

  /**
   * Crea una nueva marca
   */
  static async createMarca(data: MarcaCreateRequest): Promise<string> {
    const response = await apiRequest<{ success: boolean; marca_id: string }>('/marcas/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.marca_id || 'success'
  }

  /**
   * Actualiza una marca existente
   */
  static async updateMarca(id: string, data: MarcaUpdateRequest): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`/marcas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return response.success === true
  }

  /**
   * Elimina una marca
   */
  static async deleteMarca(id: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`/marcas/${id}`, {
      method: 'DELETE',
    })
    return response.success === true
  }
}
