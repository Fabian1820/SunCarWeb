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
   * Obtiene la línea de tiempo de estadísticas (resumen mensual de potencia y conversión)
   * @param estados - Estados de ofertas a incluir (opcional)
   */
  static async getLineaTiempo(
    estados?: string
  ): Promise<import('../../../types/feats/estadisticas/estadisticas-types').EstadisticaLineaTiempoResponse> {
    const estadosParam = estados || 'confirmada_por_cliente,reservada'
    const response = await apiRequest<import('../../../types/feats/estadisticas/estadisticas-types').EstadisticaLineaTiempoResponse>(
      `/ofertas/confeccion/resumen-mensual-potencia?estados=${estadosParam}`
    )
    return response
  }
}
