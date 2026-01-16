import { apiRequest } from '../../../api-config'
import type { AveriaCreateData, AveriaUpdateData, AveriaResponse } from '../../../types/feats/averias/averia-types'

export class AveriaService {
  /**
   * Agregar una avería a un cliente
   */
  static async agregarAveria(numeroCliente: string, data: AveriaCreateData): Promise<AveriaResponse> {
    return apiRequest<AveriaResponse>(`/clientes/${encodeURIComponent(numeroCliente)}/averias/`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Actualizar una avería de un cliente
   */
  static async actualizarAveria(
    numeroCliente: string,
    averiaId: string,
    data: AveriaUpdateData
  ): Promise<AveriaResponse> {
    return apiRequest<AveriaResponse>(
      `/clientes/${encodeURIComponent(numeroCliente)}/averias/${encodeURIComponent(averiaId)}/`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    )
  }

  /**
   * Eliminar una avería de un cliente
   */
  static async eliminarAveria(numeroCliente: string, averiaId: string): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>(
      `/clientes/${encodeURIComponent(numeroCliente)}/averias/${encodeURIComponent(averiaId)}/`,
      {
        method: 'DELETE',
      }
    )
  }
}
