/**
 * Service for Trabajos Pendientes API operations
 *
 * Handles all CRUD operations for pending work assignments (trabajos pendientes)
 * Uses centralized apiRequest function for authenticated requests
 */

import { apiRequest } from '../../../api-config'
import type {
  TrabajoPendiente,
  TrabajoPendienteCreateData,
  TrabajoPendienteResponse
} from '../../../types/feats/trabajos-pendientes/trabajo-pendiente-types'

export class TrabajoPendienteService {
  /**
   * Get all trabajos pendientes with optional is_active filter
   * @param is_active - Optional boolean to filter by active status
   * @returns Array of TrabajoPendiente
   */
  static async getTrabajos(is_active?: boolean): Promise<TrabajoPendiente[]> {
    const query = is_active !== undefined ? `?is_active=${is_active}` : ''
    const response = await apiRequest<TrabajoPendienteResponse>(
      `/trabajos-pendientes/${query}`
    )
    return Array.isArray(response.data) ? response.data : []
  }

  /**
   * Get all trabajos pendientes for a specific client by CI
   * @param ci - Client's CI (cédula de identidad)
   * @returns Array of TrabajoPendiente
   */
  static async getTrabajosByCI(ci: string): Promise<TrabajoPendiente[]> {
    const response = await apiRequest<TrabajoPendienteResponse>(
      `/trabajos-pendientes/ci/${ci}`
    )
    return Array.isArray(response.data) ? response.data : []
  }

  /**
   * Get a specific trabajo pendiente by ID
   * @param id - Trabajo ID
   * @returns TrabajoPendiente or null
   */
  static async getTrabajo(id: string): Promise<TrabajoPendiente | null> {
    const response = await apiRequest<TrabajoPendienteResponse>(
      `/trabajos-pendientes/${id}`
    )
    return response.data as TrabajoPendiente | null
  }

  /**
   * Create a new trabajo pendiente
   * @param data - Trabajo pendiente creation data
   * @returns API response with created trabajo
   */
  static async crearTrabajo(
    data: TrabajoPendienteCreateData
  ): Promise<TrabajoPendienteResponse> {
    return apiRequest<TrabajoPendienteResponse>('/trabajos-pendientes/', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  /**
   * Update an existing trabajo pendiente (partial update)
   * @param id - Trabajo ID
   * @param data - Partial trabajo pendiente data
   * @returns API response
   */
  static async actualizarTrabajo(
    id: string,
    data: Partial<TrabajoPendienteCreateData>
  ): Promise<TrabajoPendienteResponse> {
    return apiRequest<TrabajoPendienteResponse>(`/trabajos-pendientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  /**
   * Delete a trabajo pendiente
   * @param id - Trabajo ID
   * @returns API response
   */
  static async eliminarTrabajo(id: string): Promise<TrabajoPendienteResponse> {
    return apiRequest<TrabajoPendienteResponse>(`/trabajos-pendientes/${id}`, {
      method: 'DELETE'
    })
  }

  /**
   * Increment the visits counter for a trabajo pendiente
   * @param id - Trabajo ID
   * @returns API response
   */
  static async incrementarVisitas(
    id: string
  ): Promise<TrabajoPendienteResponse> {
    return apiRequest<TrabajoPendienteResponse>(
      `/trabajos-pendientes/${id}/increment-visits`,
      {
        method: 'PATCH'
      }
    )
  }

  /**
   * Update the active status of a trabajo pendiente
   * @param id - Trabajo ID
   * @param is_active - New active status
   * @returns API response
   */
  static async cambiarEstadoActivo(
    id: string,
    is_active: boolean
  ): Promise<TrabajoPendienteResponse> {
    return apiRequest<TrabajoPendienteResponse>(
      `/trabajos-pendientes/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ is_active })
      }
    )
  }
}
