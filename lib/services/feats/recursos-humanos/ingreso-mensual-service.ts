import { apiRequest } from '../../../api-config'
import type { IngresoMensual, IngresoMensualRequest, SuccessResponse } from '../../../recursos-humanos-types'

export class IngresoMensualService {
  static async getAllIngresos(): Promise<IngresoMensual[]> {
    console.log('Calling getAllIngresos endpoint')
    const response = await apiRequest<IngresoMensual[]>('/ingreso-mensual/')
    console.log('IngresoMensualService.getAllIngresos response:', response)
    return Array.isArray(response) ? response : []
  }

  static async getUltimoIngreso(): Promise<IngresoMensual | null> {
    console.log('Calling getUltimoIngreso endpoint')
    const response = await apiRequest<IngresoMensual | null>('/ingreso-mensual/latest')
    console.log('IngresoMensualService.getUltimoIngreso response:', response)
    return response
  }

  static async getIngresoById(ingresoId: string): Promise<IngresoMensual> {
    console.log('Calling getIngresoById with ID:', ingresoId)
    const response = await apiRequest<IngresoMensual>(`/ingreso-mensual/${ingresoId}`)
    console.log('IngresoMensualService.getIngresoById response:', response)
    return response
  }

  static async createIngreso(data: IngresoMensualRequest): Promise<SuccessResponse> {
    console.log('Calling createIngreso with:', data)
    const response = await apiRequest<SuccessResponse>('/ingreso-mensual/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    console.log('IngresoMensualService.createIngreso response:', response)
    return response
  }

  static async updateIngreso(
    ingresoId: string,
    data: Partial<IngresoMensualRequest>
  ): Promise<SuccessResponse> {
    console.log('Calling updateIngreso with ID:', ingresoId, 'data:', data)
    const response = await apiRequest<SuccessResponse>(`/ingreso-mensual/${ingresoId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    console.log('IngresoMensualService.updateIngreso response:', response)
    return response
  }

  static async deleteIngreso(ingresoId: string): Promise<SuccessResponse> {
    console.log('Calling deleteIngreso with ID:', ingresoId)
    const response = await apiRequest<SuccessResponse>(`/ingreso-mensual/${ingresoId}`, {
      method: 'DELETE',
    })
    console.log('IngresoMensualService.deleteIngreso response:', response)
    return response
  }
}
