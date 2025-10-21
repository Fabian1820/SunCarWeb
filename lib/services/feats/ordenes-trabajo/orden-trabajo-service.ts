/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from '../../../api-config'
import type {
  OrdenTrabajo,
  CreateOrdenTrabajoRequest,
  UpdateOrdenTrabajoRequest,
  OrdenTrabajoResponse,
} from '../../../api-types'

export class OrdenTrabajoService {
  /**
   * Get all ordenes de trabajo with optional filters
   * Backend endpoint: GET /api/ordenes-trabajo/
   * Query params: brigada_lider_ci, cliente_numero
   */
  static async getOrdenesTrabajo(params: {
    brigada_lider_ci?: string
    cliente_numero?: string
  } = {}): Promise<OrdenTrabajo[]> {
    console.log('🔍 Calling getOrdenesTrabajo endpoint with params:', params)
    const search = new URLSearchParams()
    if (params.brigada_lider_ci) search.append('brigada_lider_ci', params.brigada_lider_ci)
    if (params.cliente_numero) search.append('cliente_numero', params.cliente_numero)
    const endpoint = `/ordenes-trabajo/${search.toString() ? `?${search.toString()}` : ''}`
    const response = await apiRequest<OrdenTrabajoResponse>(endpoint)
    console.log('✅ OrdenTrabajoService.getOrdenesTrabajo response:', response)
    return Array.isArray(response.data) ? response.data : []
  }

  /**
   * Get orden de trabajo by ID
   * Backend endpoint: GET /api/ordenes-trabajo/{orden_id}
   */
  static async getOrdenTrabajoById(ordenId: string): Promise<OrdenTrabajo | null> {
    console.log('🔍 Calling getOrdenTrabajoById with ID:', ordenId)
    const response = await apiRequest<OrdenTrabajoResponse>(`/ordenes-trabajo/${ordenId}`)
    console.log('✅ OrdenTrabajoService.getOrdenTrabajoById response:', response)
    if (!response.data || Array.isArray(response.data)) {
      return null
    }
    return response.data
  }

  /**
   * Create new orden de trabajo
   * Backend endpoint: POST /api/ordenes-trabajo/
   * Required fields: brigada_lider_ci, cliente_numero, tipo_reporte, fecha
   */
  static async createOrdenTrabajo(
    ordenData: CreateOrdenTrabajoRequest
  ): Promise<{ success: boolean; message: string; data?: any }> {
    console.log('📝 Calling createOrdenTrabajo with:', ordenData)
    const response = await apiRequest<{ success: boolean; message: string; data?: any }>('/ordenes-trabajo/', {
      method: 'POST',
      body: JSON.stringify(ordenData),
    })
    console.log('✅ OrdenTrabajoService.createOrdenTrabajo response:', response)
    return response
  }

  /**
   * Update orden de trabajo
   * Backend endpoint: PUT /api/ordenes-trabajo/{orden_id}
   * All fields are optional in UpdateOrdenTrabajoRequest
   */
  static async updateOrdenTrabajo(
    ordenId: string,
    ordenData: UpdateOrdenTrabajoRequest
  ): Promise<{ success: boolean; message: string }> {
    console.log('📝 Calling updateOrdenTrabajo with ID:', ordenId, 'data:', ordenData)
    const response = await apiRequest<{ success: boolean; message: string }>(`/ordenes-trabajo/${ordenId}`, {
      method: 'PUT',
      body: JSON.stringify(ordenData),
    })
    console.log('✅ OrdenTrabajoService.updateOrdenTrabajo response:', response)
    return response
  }

  /**
   * Delete orden de trabajo
   * Backend endpoint: DELETE /api/ordenes-trabajo/{orden_id}
   */
  static async deleteOrdenTrabajo(ordenId: string): Promise<{ success: boolean; message: string }> {
    console.log('🗑️ Calling deleteOrdenTrabajo with ID:', ordenId)
    const response = await apiRequest<{ success: boolean; message: string }>(`/ordenes-trabajo/${ordenId}`, {
      method: 'DELETE',
    })
    console.log('✅ OrdenTrabajoService.deleteOrdenTrabajo response:', response)
    return response
  }

  /**
   * Generate WhatsApp message for orden de trabajo
   * Uses backend tipo_reporte values (inversion, averia, mantenimiento)
   */
  static generateOrdenTrabajoMessage(orden: OrdenTrabajo, clienteNombre?: string): string {
    const url = `https://api.suncarsrl.com/app/crear/${orden.tipo_reporte}/${orden.cliente_numero}`

    const fechaFormateada = new Date(orden.fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Get client name from populated cliente object or use parameter
    const nombreCliente = clienteNombre || (orden.cliente ? `${orden.cliente.nombre} ${orden.cliente.apellido || ''}`.trim() : 'Sin nombre')

    // Get brigada info from populated brigada object
    const nombreBrigada = orden.brigada
      ? `${orden.brigada.lider_nombre} ${orden.brigada.lider_apellido}`.trim()
      : 'Sin asignar'

    return `📋 *ORDEN DE TRABAJO*

🔧 Tipo: ${orden.tipo_reporte.toUpperCase()}
👤 Cliente: ${nombreCliente}
📍 N° Cliente: ${orden.cliente_numero}
👷 Brigada: ${nombreBrigada}
📅 Fecha de ejecución: ${fechaFormateada}
${orden.comentarios ? `\n💬 Comentarios:\n${orden.comentarios}\n` : ''}
🔗 Link de reporte:
${url}

_Generado por SunCar SRL_`
  }
}
