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
    const payload = response?.data ?? response
    const rows: any[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.materiales)
          ? payload.materiales
          : []

    return rows.map((raw: any): MaterialCatalogoWeb => ({
      ...raw,
      material_id: raw.material_id || raw._id || raw.id || '',
      codigo: raw.codigo,
      // El mismo orden que usa MaterialService.normalizeSearchMaterial
      nombre: raw.nombre || raw.descripcion || raw.material_descripcion || raw.material?.nombre || raw.material?.descripcion || '',
      descripcion: raw.descripcion || raw.material_descripcion || raw.nombre || raw.material?.descripcion || raw.material?.nombre || '',
      categoria: raw.categoria || raw.producto_categoria || raw.catalogo?.categoria || '',
      marca: raw.marca || raw.marca_nombre || '',
      precio: raw.precio ?? raw.material?.precio,
      foto: raw.foto || raw.imagen || raw.imagen_url || raw.foto_url || (Array.isArray(raw.fotos) ? raw.fotos[0] : undefined),
      potenciaKW: raw.potenciaKW,
    }))
  }

  // Crear nueva ficha de costo
  static async crearFicha(data: FichaCostoCreateData): Promise<FichaCosto> {
    const response = await apiRequest<any>('/fichas-costo-materiales/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    // El backend devuelve { success: true, message: "...", data: { ficha } }
    return response.data || response
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

  // Obtener TODOS los materiales del catálogo (con o sin ficha)
  static async getTodosMaterialesConFichas(): Promise<MaterialFichaResumen[]> {
    try {
      // Obtener todos los materiales del catálogo
      const materialesResponse = await apiRequest<{ data: any[] }>('/productos/')
      const todosMateriales = materialesResponse.data.flatMap((cat: any) =>
        (cat.materiales || [])
          .filter((m: any) => {
            // Solo incluir materiales con _id válido (ObjectId de MongoDB = 24 caracteres)
            const materialId = m._id || m.id || m.material_id
            const esValido = materialId && String(materialId).length === 24
            if (!esValido) {
              console.warn('[FichaCostoService] Material sin ObjectId válido, omitiendo:', {
                codigo: m.codigo,
                nombre: m.nombre || m.descripcion,
                _id: m._id,
                id: m.id,
                material_id: m.material_id
              })
            }
            return esValido
          })
          .map((m: any) => {
            const materialId = m._id || m.id || m.material_id
            return {
              material_id: materialId,
              codigo: m.codigo,
              nombre: m.nombre || m.descripcion || '',
              descripcion: m.descripcion || m.nombre || '',
              categoria: cat.categoria || '',
              marca: m.marca || '',
              precio: m.precio,
              foto: m.foto || m.imagen || (Array.isArray(m.fotos) ? m.fotos[0] : undefined),
              potenciaKW: m.potenciaKW,
            }
          })
      )

      // Obtener el resumen de fichas (solo materiales con ficha)
      const fichasResponse = await apiRequest<any>('/fichas-costo-materiales/resumen')
      const fichasData = fichasResponse.data || fichasResponse || []
      
      // Crear un mapa de fichas por material_id
      const fichasMap = new Map<string, any>()
      fichasData.forEach((ficha: any) => {
        fichasMap.set(ficha.material_id, ficha.ficha_activa)
      })

      // Combinar: todos los materiales + sus fichas (si existen)
      return todosMateriales.map((material: any) => ({
        ...material,
        ficha_activa: fichasMap.get(material.material_id) || null,
      }))
    } catch (error) {
      console.error('[FichaCostoService] Error al obtener todos los materiales con fichas:', error)
      throw error
    }
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
