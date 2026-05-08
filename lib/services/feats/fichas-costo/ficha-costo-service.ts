import { apiRequest } from '../../../api-config'
import type {
  FichaCosto,
  FichaCostoCreateData,
  ComparacionPrecio,
  AplicarPrecioResponse,
  EditarPreciosCostoPayload,
  MaterialCatalogoWeb,
  MaterialFichaResumen,
} from '../../../types/feats/fichas-costo/ficha-costo-types'

export class FichaCostoService {
  private static _allMaterialesCache: MaterialCatalogoWeb[] | null = null
  private static _allMaterialesPromise: Promise<MaterialCatalogoWeb[]> | null = null

  private static normalizeMaterial(raw: any): MaterialCatalogoWeb {
    return {
      ...raw,
      material_id: raw.material_id || raw._id || raw.id || '',
      codigo: raw.codigo,
      nombre: raw.nombre || raw.descripcion || raw.material_descripcion || raw.material?.nombre || raw.material?.descripcion || '',
      descripcion: raw.descripcion || raw.material_descripcion || raw.nombre || raw.material?.descripcion || raw.material?.nombre || '',
      categoria: raw.categoria || raw.producto_categoria || raw.catalogo?.categoria || '',
      marca: raw.marca || raw.marca_nombre || '',
      precio: raw.precio ?? raw.material?.precio,
      foto: raw.foto || raw.imagen || raw.imagen_url || raw.foto_url || (Array.isArray(raw.fotos) ? raw.fotos[0] : undefined),
      potenciaKW: raw.potenciaKW,
      numero_serie: typeof raw.numero_serie === 'string' ? raw.numero_serie : null,
    }
  }

  private static extractRows(payload: any): any[] {
    return Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.materiales)
          ? payload.materiales
          : Array.isArray(payload?.data)
            ? payload.data
            : []
  }

  // Lazy-load + cachea el catálogo admin completo para poder filtrar por numero_serie
  // en el cliente (el backend `q` no matchea numero_serie).
  private static async getAllForSerieSearch(): Promise<MaterialCatalogoWeb[]> {
    if (this._allMaterialesCache) return this._allMaterialesCache
    if (this._allMaterialesPromise) return this._allMaterialesPromise

    this._allMaterialesPromise = (async () => {
      try {
        const response = await apiRequest<any>(
          `/productos/admin/materiales?page=1&limit=10000`
        )
        const payload = response?.data ?? response
        const rows = this.extractRows(payload)
        const result = rows.map((raw: any) => this.normalizeMaterial(raw))
        this._allMaterialesCache = result
        return result
      } catch {
        return []
      } finally {
        this._allMaterialesPromise = null
      }
    })()

    return this._allMaterialesPromise
  }

  // Permite invalidar el cache (p.ej. al abrir el diálogo).
  static invalidateMaterialesCache(): void {
    this._allMaterialesCache = null
  }

  // Buscar materiales — combina la búsqueda del backend (`q` por nombre/marca/etc.)
  // con un filtrado client-side por `numero_serie` sobre el catálogo cacheado.
  static async buscarMateriales(query: string, page = 1, limit = 50): Promise<MaterialCatalogoWeb[]> {
    const term = query.trim()
    if (!term) return []

    const backendPromise = apiRequest<any>(
      `/productos/admin/materiales?q=${encodeURIComponent(term)}&page=${page}&limit=${limit}`
    )
      .then((response) => {
        const payload = response?.data ?? response
        return this.extractRows(payload).map((raw: any) => this.normalizeMaterial(raw))
      })
      .catch(() => [] as MaterialCatalogoWeb[])

    const lower = term.toLowerCase()
    const seriePromise = this.getAllForSerieSearch().then((all) =>
      all.filter(
        (m) =>
          typeof m.numero_serie === 'string' &&
          m.numero_serie.toLowerCase().includes(lower)
      )
    )

    const [backendResults, serieResults] = await Promise.all([backendPromise, seriePromise])

    const seen = new Set<string>()
    const merged: MaterialCatalogoWeb[] = []
    for (const m of [...backendResults, ...serieResults]) {
      const key = String(m.material_id || m._id || m.id || m.codigo || '')
      if (!key || seen.has(key)) continue
      seen.add(key)
      merged.push(m)
    }
    return merged
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
              producto_id: cat.id || cat._id || cat.producto_id || '',
              codigo: m.codigo,
              nombre: m.nombre || m.descripcion || '',
              descripcion: m.descripcion || m.nombre || '',
              categoria: cat.categoria || '',
              marca: m.marca || '',
              um: typeof m.um === 'string' ? m.um : '',
              precio: typeof m.precio === 'number' ? m.precio : undefined,
              precio_instaladora: typeof m.precio_instaladora === 'number' ? m.precio_instaladora : undefined,
              porciento_rebajable_venta: typeof m.porciento_rebajable_venta === 'number' ? m.porciento_rebajable_venta : undefined,
              costo: typeof m.costo === 'number' ? m.costo : undefined,
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

  // Edición rápida de precios + costo desde la tabla de fichas de costo.
  // PUT /productos/{producto_id}/materiales/{material_codigo} con exclude_unset:
  // solo se modifican los campos enviados.
  static async editPreciosCosto(
    productoId: string,
    materialCodigo: string | number,
    payload: EditarPreciosCostoPayload
  ): Promise<boolean> {
    if (!productoId) throw new Error('producto_id requerido')
    if (materialCodigo == null || materialCodigo === '') throw new Error('codigo de material requerido')

    const body: Record<string, number> = {}
    if (typeof payload.precio === 'number') body.precio = payload.precio
    if (typeof payload.precio_instaladora === 'number') body.precio_instaladora = payload.precio_instaladora
    if (typeof payload.porciento_rebajable_venta === 'number') body.porciento_rebajable_venta = payload.porciento_rebajable_venta
    if (typeof payload.costo === 'number') body.costo = payload.costo

    if (Object.keys(body).length === 0) return true

    const result = await apiRequest<any>(
      `/productos/${encodeURIComponent(productoId)}/materiales/${encodeURIComponent(String(materialCodigo))}`,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      }
    )

    if (result && typeof result === 'object' && result.success === false) {
      throw new Error(result.message || result.error || 'Error al actualizar material')
    }
    if (result && typeof result === 'object' && result.error) {
      throw new Error(result.error)
    }
    return true
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
