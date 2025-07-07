import { apiRequest } from '../api-config'
import type { Brigada, BrigadaRequest, TeamMember } from '../brigade-types'

export class BrigadaService {
  // Obtener todas las brigadas
  static async getBrigadas(search?: string): Promise<Brigada[]> {
    const endpoint = search ? `/brigadas?search=${encodeURIComponent(search)}` : '/brigadas'
    console.log('Calling endpoint:', endpoint)
    const response = await apiRequest<any>(endpoint)
    console.log('BrigadaService response:', response)
    // Extraer el campo 'data' de la respuesta del backend
    return response.data || []
  }

  // Obtener una brigada específica por CI del líder
  static async getBrigada(liderCi: string): Promise<Brigada> {
    const response = await apiRequest<any>(`/brigadas/${liderCi}`)
    return response.data
  }

  // Crear una nueva brigada
  static async createBrigada(brigadaData: BrigadaRequest): Promise<string> {
    return apiRequest<string>('/brigadas', {
      method: 'POST',
      body: JSON.stringify(brigadaData),
    })
  }

  // Actualizar una brigada existente
  static async updateBrigada(brigadaId: string, brigadaData: BrigadaRequest): Promise<boolean> {
    return apiRequest<boolean>(`/brigadas/${brigadaId}`, {
      method: 'PUT',
      body: JSON.stringify(brigadaData),
    })
  }

  // Eliminar una brigada
  static async deleteBrigada(brigadaId: string): Promise<boolean> {
    return apiRequest<boolean>(`/brigadas/${brigadaId}`, {
      method: 'DELETE',
    })
  }

  // Agregar un trabajador a una brigada
  static async addTrabajador(brigadaId: string, trabajador: TeamMember): Promise<boolean> {
    return apiRequest<boolean>(`/brigadas/${brigadaId}/trabajadores`, {
      method: 'POST',
      body: JSON.stringify(trabajador),
    })
  }

  // Eliminar un trabajador de una brigada
  static async removeTrabajador(brigadaId: string, trabajadorCi: string): Promise<boolean> {
    return apiRequest<boolean>(`/brigadas/${brigadaId}/trabajadores/${trabajadorCi}`, {
      method: 'DELETE',
    })
  }

  // Actualizar datos de un trabajador
  static async updateTrabajador(
    brigadaId: string, 
    trabajadorCi: string, 
    trabajador: TeamMember
  ): Promise<boolean> {
    return apiRequest<boolean>(`/brigadas/${brigadaId}/trabajadores/${trabajadorCi}`, {
      method: 'PUT',
      body: JSON.stringify(trabajador),
    })
  }
} 