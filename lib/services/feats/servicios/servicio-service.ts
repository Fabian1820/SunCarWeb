// Servicio API para Servicios

import { apiRequest } from '../../../api-config'
import type {
  Servicio,
  ServicioCreateRequest,
  ServicioUpdateRequest,
  ServicioSimplificado,
} from '../../../types/feats/servicios/servicio-types'

export class ServicioService {
  /**
   * Obtiene todos los servicios
   */
  static async getServicios(): Promise<Servicio[]> {
    const response = await apiRequest<{ success: boolean; data: Servicio[] }>('/servicios/')
    return response.data || []
  }

  /**
   * Obtiene un servicio por ID
   */
  static async getServicioById(id: string): Promise<Servicio | null> {
    const response = await apiRequest<{ success: boolean; data: Servicio }>(
      `/servicios/${id}`
    )
    return response.success ? response.data : null
  }

  /**
   * Obtiene servicios simplificados (solo id y descripción) para selectores
   */
  static async getServiciosSimplificados(): Promise<ServicioSimplificado[]> {
    const servicios = await this.getServicios()
    return servicios
      .filter((s) => s.is_active && s.id)
      .map((s) => ({
        id: s.id!,
        descripcion: s.descripcion,
      }))
  }

  /**
   * Crea un nuevo servicio
   */
  static async createServicio(data: ServicioCreateRequest): Promise<string> {
    const response = await apiRequest<{ success: boolean; servicio_id: string }>(
      '/servicios/',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
    return response.servicio_id || 'success'
  }

  /**
   * Actualiza un servicio existente
   */
  static async updateServicio(id: string, data: ServicioUpdateRequest): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`/servicios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return response.success === true
  }

  /**
   * Elimina un servicio
   */
  static async deleteServicio(id: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`/servicios/${id}`, {
      method: 'DELETE',
    })
    return response.success === true
  }
}
