import { apiRequest } from '../../../api-config'
import type { Lead, LeadResponse, LeadCreateData, LeadUpdateData } from '../../../api-types'

export class LeadService {
  static async getLeads(params: {
    nombre?: string
    telefono?: string
    estado?: string
    fuente?: string
  } = {}): Promise<Lead[]> {
    console.log('Calling getLeads endpoint with params:', params)
    const search = new URLSearchParams()
    if (params.nombre) search.append('nombre', params.nombre)
    if (params.telefono) search.append('telefono', params.telefono)
    if (params.estado) search.append('estado', params.estado)
    if (params.fuente) search.append('fuente', params.fuente)
    const endpoint = `/leads/${search.toString() ? `?${search.toString()}` : ''}`
    const response = await apiRequest<LeadResponse>(endpoint)
    console.log('LeadService.getLeads response:', response)
    return Array.isArray(response.data) ? response.data : []
  }

  static async getLeadById(leadId: string): Promise<Lead> {
    console.log('Calling getLeadById with ID:', leadId)
    const response = await apiRequest<LeadResponse>(`/leads/${leadId}`)
    console.log('LeadService.getLeadById response:', response)
    if (!response.data || Array.isArray(response.data)) {
      throw new Error('Lead no encontrado')
    }
    return response.data
  }

  static async createLead(leadData: LeadCreateData): Promise<string> {
    console.log('Calling createLead with:', leadData)
    const response = await apiRequest<{ success: boolean; message: string; data: { id: string } }>('/leads/', {
      method: 'POST',
      body: JSON.stringify(leadData),
    })
    console.log('LeadService.createLead response:', response)
    return response.data?.id || 'success'
  }

  static async updateLead(leadId: string, leadData: LeadUpdateData): Promise<Lead> {
    console.log('Calling updateLead with ID:', leadId, 'data:', leadData)
    const response = await apiRequest<LeadResponse>(`/leads/${leadId}`, {
      method: 'PATCH',
      body: JSON.stringify(leadData),
    })
    console.log('LeadService.updateLead response:', response)
    if (!response.data || Array.isArray(response.data)) {
      throw new Error('Error al actualizar lead')
    }
    return response.data
  }

  static async deleteLead(leadId: string): Promise<boolean> {
    console.log('Calling deleteLead with ID:', leadId)
    const response = await apiRequest<{ success: boolean; message: string }>(`/leads/${leadId}`, {
      method: 'DELETE',
    })
    console.log('LeadService.deleteLead response:', response)
    return response.success === true
  }

  static async getLeadsByTelefono(telefono: string): Promise<Lead[]> {
    console.log('Calling getLeadsByTelefono with telefono:', telefono)
    const response = await apiRequest<LeadResponse>(`/leads/telefono/${encodeURIComponent(telefono)}`)
    console.log('LeadService.getLeadsByTelefono response:', response)
    return Array.isArray(response.data) ? response.data : []
  }

  static async checkLeadExists(leadId: string): Promise<boolean> {
    console.log('Calling checkLeadExists with ID:', leadId)
    const response = await apiRequest<{ success: boolean; message: string; exists: boolean }>(
      `/leads/${leadId}/existe`
    )
    console.log('LeadService.checkLeadExists response:', response)
    return response.exists === true
  }
}
