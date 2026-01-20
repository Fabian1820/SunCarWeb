/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from '../../../api-config'
import type {
  OrdenTrabajo,
  CreateOrdenTrabajoRequest,
  UpdateOrdenTrabajoRequest,
  CreateOrdenTrabajoResponse,
  ListOrdenesTrabajoResponse,
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
    const response = await apiRequest<ListOrdenesTrabajoResponse>(endpoint)
    console.log('✅ OrdenTrabajoService.getOrdenesTrabajo response:', response)
    return Array.isArray(response.ordenes) ? response.ordenes : []
  }

  /**
   * Get orden de trabajo by ID
   * Backend endpoint: GET /api/ordenes-trabajo/{orden_id}
   */
  static async getOrdenTrabajoById(ordenId: string): Promise<OrdenTrabajo | null> {
    console.log('🔍 Calling getOrdenTrabajoById with ID:', ordenId)
    const response = await apiRequest<OrdenTrabajo>(`/ordenes-trabajo/${ordenId}`)
    console.log('✅ OrdenTrabajoService.getOrdenTrabajoById response:', response)
    return response || null
  }

  /**
   * Create one or more órdenes de trabajo
   * Backend endpoint: POST /api/ordenes-trabajo/
   * Required fields per orden: brigada_lider_ci, cliente_numero, tipo_reporte, fecha
   */
  static async createOrdenTrabajo(ordenData: CreateOrdenTrabajoRequest): Promise<CreateOrdenTrabajoResponse> {
    console.log('📝 Calling createOrdenTrabajo with:', ordenData)
    const response = await apiRequest<CreateOrdenTrabajoResponse>('/ordenes-trabajo/', {
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
  ): Promise<OrdenTrabajo> {
    console.log('📝 Calling updateOrdenTrabajo with ID:', ordenId, 'data:', ordenData)
    const response = await apiRequest<OrdenTrabajo>(`/ordenes-trabajo/${ordenId}`, {
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
  static async deleteOrdenTrabajo(ordenId: string): Promise<{ success?: boolean; message?: string }> {
    console.log('🗑️ Calling deleteOrdenTrabajo with ID:', ordenId)
    const response = await apiRequest<{ success?: boolean; message?: string }>(`/ordenes-trabajo/${ordenId}`, {
      method: 'DELETE',
    })
    console.log('✅ OrdenTrabajoService.deleteOrdenTrabajo response:', response)
    return response
  }

  /**
   * Generate WhatsApp message for a single orden de trabajo
   * Uses backend tipo_reporte values (inversion, averia, mantenimiento)
   */
  static generateOrdenTrabajoMessage(orden: OrdenTrabajo): string {
    const url = `https://api.suncarsrl.com/app/crear/${orden.tipo_reporte}/${orden.cliente.numero}`

    const fechaFormateada = new Date(orden.fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const nombreCliente = orden.cliente ? `${orden.cliente.nombre}`.trim() : 'Sin nombre'

    const nombreBrigada = orden.brigada?.lider
      ? `${orden.brigada.lider.nombre}`.trim()
      : 'Sin asignar'

    // Información adicional del cliente si existe
    let infoCliente = `👤 Cliente: ${nombreCliente}\n`
    infoCliente += `📍 N° Cliente: ${orden.cliente.numero}\n`
    
    // Agregar datos del cliente directo si existen
    if (orden.cliente_nombre) {
      infoCliente += `\n👥 *Datos del Cliente:*\n`
      infoCliente += `   Nombre: ${orden.cliente_nombre}\n`
      if (orden.cliente_ci) {
        infoCliente += `   CI: ${orden.cliente_ci}\n`
      }
      if (orden.cliente_telefono) {
        infoCliente += `   Teléfono: ${orden.cliente_telefono}\n`
      }
    }

    return `📋 *ORDEN DE TRABAJO*

🔧 Tipo: ${orden.tipo_reporte.toUpperCase()}
${infoCliente}👷 Brigada: ${nombreBrigada}
📅 Fecha de ejecución: ${fechaFormateada}
${orden.comentarios ? `\n💬 Comentarios:\n${orden.comentarios}\n` : ''}${
      orden.comentario_transporte ? `\n🚌 Transporte:\n${orden.comentario_transporte}\n` : ''
    }🔗 Link de reporte:
${url}

_Generado por SunCar SRL_`
  }

  /**
   * Generate WhatsApp message for multiple órdenes de trabajo
   * Combines all órdenes into a single message
   */
  static generateMultipleOrdenesTrabajoMessage(ordenes: OrdenTrabajo[]): string {
    if (ordenes.length === 0) {
      return ''
    }

    if (ordenes.length === 1) {
      return this.generateOrdenTrabajoMessage(ordenes[0])
    }

    // Ordenar por fecha de ejecución
    const ordenesOrdenadas = [...ordenes].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    )

    let message = `📋 *LISTA DE ÓRDENES DE TRABAJO*\n\n`
    message += `Total: ${ordenesOrdenadas.length} orden${ordenesOrdenadas.length > 1 ? 'es' : ''}\n\n`
    message += `${'='.repeat(40)}\n\n`

    ordenesOrdenadas.forEach((orden, index) => {
      const url = `https://api.suncarsrl.com/app/crear/${orden.tipo_reporte}/${orden.cliente.numero}`
      const fechaFormateada = new Date(orden.fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      const nombreCliente = orden.cliente ? `${orden.cliente.nombre}`.trim() : 'Sin nombre'
      const nombreBrigada = orden.brigada?.lider
        ? `${orden.brigada.lider.nombre}`.trim()
        : 'Sin asignar'

      message += `📋 *ORDEN ${index + 1}*\n\n`
      message += `🔧 Tipo: ${orden.tipo_reporte.toUpperCase()}\n`
      message += `👤 Cliente: ${nombreCliente}\n`
      message += `📍 N° Cliente: ${orden.cliente.numero}\n`
      message += `👷 Brigada: ${nombreBrigada}\n`
      message += `📅 Fecha de ejecución: ${fechaFormateada}\n`

      if (orden.comentarios) {
        message += `\n💬 Comentarios:\n${orden.comentarios}\n`
      }

      if (orden.comentario_transporte) {
        message += `\n🚌 Transporte:\n${orden.comentario_transporte}\n`
      }

      message += `\n🔗 Link de reporte:\n${url}\n`

      if (index < ordenesOrdenadas.length - 1) {
        message += `\n${'-'.repeat(40)}\n\n`
      }
    })

    message += `\n${'='.repeat(40)}\n\n`
    message += `_Generado por SunCar SRL_`

    return message
  }
}
