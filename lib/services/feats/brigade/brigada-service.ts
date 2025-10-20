/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from '../../../api-config'
import type { Brigada as ApiBrigada } from '../../../api-types'

export class BrigadaService {
  static async getAllBrigadas(): Promise<ApiBrigada[]> {
    console.log('Calling getAllBrigadas endpoint')
    const response = await apiRequest<{ data: ApiBrigada[] }>('/brigadas/')
    console.log('BrigadaService.getAllBrigadas response:', response)
    console.log('Type of response:', typeof response, 'Is array:', Array.isArray(response))
    const data = response.data || []
    console.log('Extracted data:', data)
    return data
  }

  static async createBrigada(brigadaData: any): Promise<string> {
    console.log('Calling createBrigada with:', brigadaData)
    const response = await apiRequest<{ brigada_id?: string; id?: string }>('/brigadas/', {
      method: 'POST',
      body: JSON.stringify(brigadaData),
    })
    console.log('createBrigada response:', response)
    return response.brigada_id || response.id || 'success'
  }

  static async buscarBrigadas(nombre: string): Promise<ApiBrigada[]> {
    return apiRequest<ApiBrigada[]>(`/brigadas/buscar?nombre=${encodeURIComponent(nombre)}`)
  }

  static async eliminarBrigada(brigadaId: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`/brigadas/${brigadaId}`, {
      method: 'DELETE',
    })
    return response.success === true
  }

  static async eliminarTrabajadorDeBrigada(brigadaId: string, trabajadorCi: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`/brigadas/${brigadaId}/trabajadores/${trabajadorCi}`, {
      method: 'DELETE',
    })
    return response.success === true
  }
}
