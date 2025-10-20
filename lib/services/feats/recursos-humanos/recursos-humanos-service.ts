import { apiRequest } from '../../../api-config'
import type {
  RecursosHumanosResponse,
  ActualizarTrabajadorRRHHRequest,
  SuccessResponse,
  CargosResumenResponse,
} from '../../../recursos-humanos-types'

export class RecursosHumanosService {
  static async getRecursosHumanos(): Promise<RecursosHumanosResponse> {
    console.log('Calling getRecursosHumanos endpoint')
    const response = await apiRequest<RecursosHumanosResponse>('/recursos-humanos/')
    console.log('RecursosHumanosService.getRecursosHumanos response:', response)
    return response
  }

  static async actualizarTrabajadorRRHH(
    ci: string,
    data: ActualizarTrabajadorRRHHRequest
  ): Promise<SuccessResponse> {
    console.log('Calling actualizarTrabajadorRRHH with CI:', ci, 'data:', data)
    const response = await apiRequest<SuccessResponse>(`/trabajadores/${ci}/rrhh`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    console.log('RecursosHumanosService.actualizarTrabajadorRRHH response:', response)
    return response
  }

  static async getCargosResumen(): Promise<CargosResumenResponse> {
    console.log('Calling getCargosResumen endpoint')
    const response = await apiRequest<CargosResumenResponse>('/recursos-humanos/estadisticas-por-cargo')
    console.log('RecursosHumanosService.getCargosResumen response:', response)
    return response
  }
}
