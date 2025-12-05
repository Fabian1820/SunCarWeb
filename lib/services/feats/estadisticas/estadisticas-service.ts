import { apiRequest } from '../../../api-config'
import type {
  EstadisticasCrecimientoBackend,
  EstadisticasParams,
} from '../../../types/feats/estadisticas/estadisticas-types'

export class EstadisticasService {
  /**
   * Obtiene estadísticas de crecimiento mensual
   * @param params - Año y mes para consultar
   */
  static async getCrecimientoMensual(
    params: EstadisticasParams
  ): Promise<EstadisticasCrecimientoBackend> {
    const response = await apiRequest<{ data: EstadisticasCrecimientoBackend }>(
      `/clientes/estadisticas/crecimiento-mensual?año=${params.año}&mes=${params.mes}`
    )
    return response.data
  }

  /**
   * Obtiene la línea de tiempo de estadísticas
   * @param periodoMeses - Cantidad de meses para el periodo
   */
  static async getLineaTiempo(
    periodoMeses: number
  ): Promise<import('../../../types/feats/estadisticas/estadisticas-types').EstadisticaLineaTiempoResponse> {
    const response = await apiRequest<import('../../../types/feats/estadisticas/estadisticas-types').EstadisticaLineaTiempoResponse>(
      `/clientes/estadisticas/linea-tiempo?periodo_meses=${periodoMeses}`
    )
    return response
  }
}
