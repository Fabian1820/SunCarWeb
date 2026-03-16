import { apiRequest } from '../../../api-config'
import type {
  FichaCosto,
  FichaCostoCreateData,
  ComparacionPrecio,
  AplicarPrecioResponse,
  MaterialCatalogoWeb,
  MaterialFichaResumen,
} from '../../../types/feats/fichas-costo/ficha-costo-types'

export class FichaCostoService {
  // Buscar materiales
  static async buscarMateriales(query: string, page = 1, limit = 50): Promise<MaterialCatalogoWeb[]> {
    const response = await apiRequest<any>(
      `/productos/materiales?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
    )
    return response.data || response.items || response.materiales || response || []
  }

  // Crear nueva ficha de costo
  static async crearFicha(data: FichaCostoCreateData): Promise<FichaCosto> {
    const response = await apiRequest<FichaCosto>('/fichas-costo-materiales/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response
  }

  // Obtener ficha activa de un material
  static async obtenerFichaActiva(materialId: string): Promise<FichaCosto> {
    const response = await apiRequest<FichaCosto>(
      `/fichas-costo-materiales/material/${materialId}/activa`
    )
    return response
  }

  // Obtener historial de fichas de un material
  static async obtenerHistorial(materialId: string): Promise<FichaCosto[]> {
    const response = await apiRequest<any>(
      `/fichas-costo-materiales/material/${materialId}/historial`
    )
    return response.data || response.fichas || response || []
  }

  // Comparar precio calculado con precio actual del material
  static async compararPrecio(materialId: string): Promise<ComparacionPrecio> {
    const response = await apiRequest<ComparacionPrecio>(
      `/fichas-costo-materiales/material/${materialId}/comparar-precio`
    )
    return response
  }

  // Listado global: todos los materiales con su ficha activa resumida
  // Endpoint asumido: GET /fichas-costo-materiales/resumen
  static async getResumen(): Promise<MaterialFichaResumen[]> {
    const response = await apiRequest<any>('/fichas-costo-materiales/resumen')
    return response.data || response || []
  }

  // Crear fichas de costo para múltiples materiales con el mismo porcentaje
  static async crearFichasBulk(
    material_ids: string[],
    porcentaje: number
  ): Promise<{ total: number; creadas: number; errores_count: number; fichas: any[]; errores: any[] }> {
    const response = await apiRequest<any>('/fichas-costo-materiales/bulk', {
      method: 'POST',
      body: JSON.stringify({ material_ids, porcentaje }),
    })
    return response.data || response
  }

  // Aplicar precio calculado al material
  static async aplicarPrecio(materialId: string): Promise<AplicarPrecioResponse> {
    const response = await apiRequest<AplicarPrecioResponse>(
      `/fichas-costo-materiales/material/${materialId}/aplicar-precio`,
      {
        method: 'POST',
        body: JSON.stringify({ confirmar: true }),
      }
    )
    return response
  }
}
