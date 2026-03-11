import { apiRequest } from '../../../api-config'
import type {
  FichaCosto,
  FichaCostoCreateData,
  ComparacionPrecio,
  AplicarPrecioResponse,
  MaterialCatalogoWeb,
} from '../../../types/feats/fichas-costo/ficha-costo-types'

export class FichaCostoService {
  // Buscar materiales del catálogo web
  static async buscarMateriales(query: string, page = 1, limit = 50): Promise<MaterialCatalogoWeb[]> {
    const response = await apiRequest<any>(
      `/productos/catalogo-web?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
    )
    // El endpoint puede devolver { data: [...] } o un array directo
    return response.data || response.items || response.productos || response || []
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
