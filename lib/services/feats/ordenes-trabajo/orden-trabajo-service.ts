/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from '../../../api-config'
import type {
  OrdenTrabajo,
  CreateOrdenTrabajoRequest,
  UpdateOrdenTrabajoRequest,
  OrdenTrabajoResponse,
} from '../../../api-types'

export class OrdenTrabajoService {
  static async getOrdenesTrabajo(params: {
    brigada_id?: string
    cliente_numero?: string
    tipo_reporte?: string
    estado?: string
    fecha_inicio?: string
    fecha_fin?: string
  } = {}): Promise<OrdenTrabajo[]> {
    console.log('Calling getOrdenesTrabajo endpoint with params:', params)
    const search = new URLSearchParams()
    if (params.brigada_id) search.append('brigada_id', params.brigada_id)
    if (params.cliente_numero) search.append('cliente_numero', params.cliente_numero)
    if (params.tipo_reporte) search.append('tipo_reporte', params.tipo_reporte)
    if (params.estado) search.append('estado', params.estado)
    if (params.fecha_inicio) search.append('fecha_inicio', params.fecha_inicio)
    if (params.fecha_fin) search.append('fecha_fin', params.fecha_fin)
    const endpoint = `/ordenes-trabajo/${search.toString() ? `?${search.toString()}` : ''}`
    const response = await apiRequest<OrdenTrabajoResponse>(endpoint)
    console.log('OrdenTrabajoService.getOrdenesTrabajo response:', response)
    return Array.isArray(response.data) ? response.data : []
  }

  static async getOrdenTrabajoById(ordenId: string): Promise<OrdenTrabajo | null> {
    console.log('Calling getOrdenTrabajoById with ID:', ordenId)
    const response = await apiRequest<OrdenTrabajoResponse>(`/ordenes-trabajo/${ordenId}`)
    console.log('OrdenTrabajoService.getOrdenTrabajoById response:', response)
    if (!response.data || Array.isArray(response.data)) {
      return null
    }
    return response.data
  }

  static async createOrdenTrabajo(
    ordenData: CreateOrdenTrabajoRequest
  ): Promise<{ success: boolean; message: string; data?: any }> {
    console.log('Calling createOrdenTrabajo with:', ordenData)
    const response = await apiRequest<{ success: boolean; message: string; data?: any }>('/ordenes-trabajo/', {
      method: 'POST',
      body: JSON.stringify(ordenData),
    })
    console.log('OrdenTrabajoService.createOrdenTrabajo response:', response)
    return response
  }

  static async updateOrdenTrabajo(
    ordenId: string,
    ordenData: UpdateOrdenTrabajoRequest
  ): Promise<{ success: boolean; message: string }> {
    console.log('Calling updateOrdenTrabajo with ID:', ordenId, 'data:', ordenData)
    const response = await apiRequest<{ success: boolean; message: string }>(`/ordenes-trabajo/${ordenId}`, {
      method: 'PATCH',
      body: JSON.stringify(ordenData),
    })
    console.log('OrdenTrabajoService.updateOrdenTrabajo response:', response)
    return response
  }

  static async deleteOrdenTrabajo(ordenId: string): Promise<{ success: boolean; message: string }> {
    console.log('Calling deleteOrdenTrabajo with ID:', ordenId)
    const response = await apiRequest<{ success: boolean; message: string }>(`/ordenes-trabajo/${ordenId}`, {
      method: 'DELETE',
    })
    console.log('OrdenTrabajoService.deleteOrdenTrabajo response:', response)
    return response
  }

  static generateOrdenTrabajoMessage(orden: OrdenTrabajo, clienteNombre: string): string {
    const tipoReporteMap = {
      inversión: 'inversion',
      avería: 'averia',
      mantenimiento: 'mantenimiento',
    }

    const tipoReporteUrl = tipoReporteMap[orden.tipo_reporte] || orden.tipo_reporte.toLowerCase()
    const url = `https://api.suncarsrl.com/app/crear/${tipoReporteUrl}/${orden.cliente_numero}`

    const fechaFormateada = new Date(orden.fecha_ejecucion).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    return `📋 *ORDEN DE TRABAJO*

🔧 Tipo: ${orden.tipo_reporte.toUpperCase()}
👤 Cliente: ${clienteNombre}
📍 N° Cliente: ${orden.cliente_numero}
👷 Brigada: ${orden.brigada_nombre || 'Sin asignar'}
📅 Fecha de ejecución: ${fechaFormateada}
${orden.comentarios ? `\n💬 Comentarios:\n${orden.comentarios}\n` : ''}
🔗 Link de reporte:
${url}

_Generado por SunCar SRL_`
  }
}
