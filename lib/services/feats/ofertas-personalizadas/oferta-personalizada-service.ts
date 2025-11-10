// Servicio API para Ofertas Personalizadas

import { apiRequest } from '../../../api-config'
import type {
  OfertaPersonalizada,
  OfertaPersonalizadaCreateRequest,
  OfertaPersonalizadaUpdateRequest,
  TotalGastadoResponse,
} from '../../../types/feats/ofertas-personalizadas/oferta-personalizada-types'

export class OfertaPersonalizadaService {
  /**
   * Obtiene todas las ofertas personalizadas
   */
  static async getOfertasPersonalizadas(): Promise<OfertaPersonalizada[]> {
    const response = await apiRequest<{ success: boolean; data: OfertaPersonalizada[] }>(
      '/ofertas-personalizadas/'
    )
    return response.data || []
  }

  /**
   * Obtiene una oferta personalizada por ID
   */
  static async getOfertaPersonalizadaById(id: string): Promise<OfertaPersonalizada | null> {
    const response = await apiRequest<{ success: boolean; data: OfertaPersonalizada }>(
      `/ofertas-personalizadas/${id}`
    )
    return response.success ? response.data : null
  }

  /**
   * Obtiene TODAS las ofertas de un cliente específico (pagadas y no pagadas)
   */
  static async getOfertasByCliente(clienteId: string): Promise<OfertaPersonalizada[]> {
    const response = await apiRequest<{ success: boolean; data: OfertaPersonalizada[] }>(
      `/ofertas-personalizadas/cliente/${clienteId}`
    )
    return response.data || []
  }

  /**
   * Obtiene SOLO las ofertas PAGADAS de un cliente específico
   */
  static async getOfertasPagadasByCliente(
    clienteId: string
  ): Promise<OfertaPersonalizada[]> {
    const response = await apiRequest<{ success: boolean; data: OfertaPersonalizada[] }>(
      `/ofertas-personalizadas/cliente/${clienteId}/pagadas`
    )
    return response.data || []
  }

  /**
   * Calcula el total gastado por un cliente (suma de ofertas pagadas)
   */
  static async getTotalGastadoByCliente(clienteId: string): Promise<number> {
    const response = await apiRequest<TotalGastadoResponse>(
      `/ofertas-personalizadas/cliente/${clienteId}/total-gastado`
    )
    return response.total_gastado || 0
  }

  /**
   * Crea una nueva oferta personalizada
   */
  static async createOfertaPersonalizada(
    data: OfertaPersonalizadaCreateRequest
  ): Promise<string> {
    const response = await apiRequest<{ success: boolean; oferta_id: string }>(
      '/ofertas-personalizadas/',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
    return response.oferta_id || 'success'
  }

  /**
   * Actualiza una oferta personalizada existente
   */
  static async updateOfertaPersonalizada(
    id: string,
    data: OfertaPersonalizadaUpdateRequest
  ): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(
      `/ofertas-personalizadas/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    )
    return response.success === true
  }

  /**
   * Elimina una oferta personalizada
   */
  static async deleteOfertaPersonalizada(id: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(
      `/ofertas-personalizadas/${id}`,
      {
        method: 'DELETE',
      }
    )
    return response.success === true
  }

  /**
   * Marca una oferta como pagada
   */
  static async marcarComoPagada(id: string): Promise<boolean> {
    return this.updateOfertaPersonalizada(id, { pagada: true })
  }

  /**
   * Marca una oferta como no pagada
   */
  static async marcarComoNoPagada(id: string): Promise<boolean> {
    return this.updateOfertaPersonalizada(id, { pagada: false })
  }
}
