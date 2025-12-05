/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from '../../../api-config'
import type {
  ArticuloTienda,
  ArticuloTiendaCreateData,
  ArticuloTiendaUpdateData,
  BackendArticuloTiendaResponse,
} from '../../../articulos-tienda-types'

export class ArticuloTiendaService {
  static async getAllArticulos(): Promise<ArticuloTienda[]> {
    try {
      const response = await apiRequest<BackendArticuloTiendaResponse | ArticuloTienda[]>(
        '/articulos-tienda/'
      )
      
      // Manejar ambos formatos de respuesta
      if (Array.isArray(response)) {
        return response.map(item => this.normalizeArticulo(item))
      }
      
      if (response.data) {
        const data = Array.isArray(response.data) ? response.data : [response.data]
        return data.map(item => this.normalizeArticulo(item))
      }
      
      return []
    } catch (error) {
      console.error('Error al obtener artículos de tienda:', error)
      throw new Error(
        'No se pudieron cargar los artículos de tienda. El endpoint /api/articulos-tienda/ no está disponible en el backend.'
      )
    }
  }

  static async getArticuloById(id: string): Promise<ArticuloTienda> {
    try {
      const response = await apiRequest<BackendArticuloTiendaResponse>(
        `/articulos-tienda/${id}`
      )
      
      const data = response.data as ArticuloTienda
      return this.normalizeArticulo(data)
    } catch (error) {
      console.error('Error al obtener artículo por ID:', error)
      throw new Error(
        `No se pudo cargar el artículo con ID ${id}. El endpoint /api/articulos-tienda/${id} no está disponible en el backend.`
      )
    }
  }

  static async createArticulo(data: ArticuloTiendaCreateData & { foto?: File | null }): Promise<ArticuloTienda> {
    try {
      console.log('[ArticuloTiendaService] Creando artículo:', data)

      // Validar campos requeridos
      if (!data.categoria || !data.modelo || !data.unidad || !data.precio || data.precio <= 0) {
        throw new Error('Todos los campos requeridos deben estar completos y el precio debe ser mayor a 0')
      }

      // Validar unidad
      if (data.unidad !== 'pieza' && data.unidad !== 'set') {
        throw new Error('La unidad debe ser "pieza" o "set"')
      }

      // Usar FormData para multipart/form-data
      const formData = new FormData()

      // ✅ Campos obligatorios
      formData.append('categoria', data.categoria)
      formData.append('modelo', data.modelo)
      formData.append('unidad', data.unidad)
      formData.append('precio', String(data.precio))

      // ✅ descripcion_uso: opcional, enviar solo si existe
      if (data.descripcion_uso) {
        formData.append('descripcion_uso', data.descripcion_uso)
      }

      // ✅ foto: opcional, enviar solo si existe
      if (data.foto) {
        console.log('[ArticuloTiendaService] Agregando foto:', data.foto.name)
        formData.append('foto', data.foto)
      }

      // ✅ especificaciones: JSON string, solo si tiene contenido
      const especificacionesPayload = this.serializeJsonField(data.especificaciones)
      if (especificacionesPayload) {
        formData.append('especificaciones', especificacionesPayload)
        console.log('[ArticuloTiendaService] Especificaciones enviadas:', especificacionesPayload)
      }

      // ✅ precio_por_cantidad: JSON string, solo si tiene contenido
      const precioPorCantidadPayload = this.serializeJsonField(data.precio_por_cantidad)
      if (precioPorCantidadPayload) {
        formData.append('precio_por_cantidad', precioPorCantidadPayload)
        console.log('[ArticuloTiendaService] Precio por cantidad enviado:', precioPorCantidadPayload)
      }

      console.log('[ArticuloTiendaService] Enviando POST request a /articulos-tienda/')
      const response = await apiRequest<BackendArticuloTiendaResponse | ArticuloTienda>('/articulos-tienda/', {
        method: 'POST',
        body: formData,
      })

      if ((response as BackendArticuloTiendaResponse).success === false) {
        throw new Error(
          (response as BackendArticuloTiendaResponse).message ||
          'No se pudo crear el artículo. El backend respondió sin éxito.'
        )
      }

      console.log('[ArticuloTiendaService] Artículo creado, respuesta:', response)
      // Manejar ambos formatos: { data: articulo } o articulo directo
      const articulo = (response as any).data || response
      return this.normalizeArticulo(articulo)
    } catch (error: any) {
      console.error('[ArticuloTiendaService] Error al crear artículo:', error)
      throw new Error(
        error.message || 'No se pudo crear el artículo. El endpoint POST /api/articulos-tienda/ no está disponible en el backend.'
      )
    }
  }

  static async updateArticulo(id: string, data: ArticuloTiendaUpdateData & { foto?: File | null }): Promise<ArticuloTienda> {
    try {
      console.log('[ArticuloTiendaService] Actualizando artículo:', id, data)

      // Validar precio si se proporciona
      if (data.precio !== undefined && data.precio <= 0) {
        throw new Error('El precio debe ser mayor a 0')
      }

      // Validar unidad si se proporciona
      if (data.unidad && data.unidad !== 'pieza' && data.unidad !== 'set') {
        throw new Error('La unidad debe ser "pieza" o "set"')
      }

      // Usar FormData para multipart/form-data
      const formData = new FormData()

      // ✅ Campos simples: Solo agregar si están definidos
      if (data.categoria !== undefined) {
        formData.append('categoria', data.categoria)
      }
      if (data.modelo !== undefined) {
        formData.append('modelo', data.modelo)
      }
      if (data.unidad !== undefined) {
        formData.append('unidad', data.unidad)
      }
      if (data.precio !== undefined) {
        formData.append('precio', String(data.precio))
      }

      // ✅ descripcion_uso: Enviar string vacío para eliminar, o el valor para actualizar
      if (data.descripcion_uso !== undefined) {
        formData.append('descripcion_uso', data.descripcion_uso || '')
      }

      // ✅ foto: Solo agregar si hay un archivo nuevo
      if (data.foto) {
        formData.append('foto', data.foto)
      }

      // ✅ especificaciones: JSON string, o string vacío para eliminar
      const especificacionesPayload = this.serializeJsonField(data.especificaciones, true)
      if (especificacionesPayload !== undefined) {
        formData.append('especificaciones', especificacionesPayload)
        console.log('[ArticuloTiendaService] Especificaciones payload:', especificacionesPayload || '[empty string]')
      }

      // ✅ precio_por_cantidad: JSON string, o string vacío para eliminar
      const precioPorCantidadPayload = this.serializeJsonField(data.precio_por_cantidad, true)
      if (precioPorCantidadPayload !== undefined) {
        formData.append('precio_por_cantidad', precioPorCantidadPayload)
        console.log('[ArticuloTiendaService] Precio por cantidad payload:', precioPorCantidadPayload || '[empty string]')
      }

      console.log('[ArticuloTiendaService] Enviando PUT request a:', `/articulos-tienda/${id}`)
      const response = await apiRequest<BackendArticuloTiendaResponse | ArticuloTienda>(`/articulos-tienda/${id}`, {
        method: 'PUT',
        body: formData,
      })

      if ((response as BackendArticuloTiendaResponse).success === false) {
        throw new Error(
          (response as BackendArticuloTiendaResponse).message ||
          `No se pudo actualizar el artículo con ID ${id}. El backend respondió sin cambios.`
        )
      }

      console.log('[ArticuloTiendaService] Respuesta recibida:', response)
      // Manejar ambos formatos: { data: articulo } o articulo directo
      const articulo = (response as any).data || response
      return this.normalizeArticulo(articulo)
    } catch (error: any) {
      console.error('[ArticuloTiendaService] Error al actualizar artículo:', error)
      throw new Error(
        error.message || `No se pudo actualizar el artículo con ID ${id}. El endpoint PUT /api/articulos-tienda/${id} no está disponible en el backend.`
      )
    }
  }

  static async deleteArticulo(id: string): Promise<boolean> {
    try {
      const response = await apiRequest<{ success?: boolean; message?: string }>(
        `/articulos-tienda/${id}`,
        {
          method: 'DELETE',
        }
      )
      
      return response.success !== false
    } catch (error) {
      console.error('Error al eliminar artículo:', error)
      throw new Error(
        `No se pudo eliminar el artículo con ID ${id}. El endpoint DELETE /api/articulos-tienda/${id} no está disponible en el backend.`
      )
    }
  }

  // Helper para normalizar el artículo (asegurar que tenga id)
  private static normalizeArticulo(articulo: any): ArticuloTienda {
    const parsedPrecioPorCantidad = this.parseJsonField(articulo.precio_por_cantidad, 'precio_por_cantidad')
    const parsedEspecificaciones = this.parseJsonField(articulo.especificaciones, 'especificaciones')

    return {
      ...articulo,
      id: articulo.id || articulo.articulo_id || articulo._id || '',
      articulo_id: articulo.articulo_id || articulo.id || articulo._id || '',
      precio_por_cantidad: parsedPrecioPorCantidad
        ?? (typeof articulo.precio_por_cantidad === 'object' && !Array.isArray(articulo.precio_por_cantidad)
          ? articulo.precio_por_cantidad
          : undefined),
      especificaciones: parsedEspecificaciones
        ?? (typeof articulo.especificaciones === 'object' && !Array.isArray(articulo.especificaciones)
          ? articulo.especificaciones
          : undefined),
    }
  }

  // Evita doble-stringify y permite enviar string vacío en modo edición
  private static serializeJsonField(value: any, allowEmptyString = false): string | undefined {
    if (value === undefined) return undefined
    if (value === null) return allowEmptyString ? '' : undefined

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed && !allowEmptyString) return undefined
      return trimmed
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      const hasKeys = Object.keys(value).length > 0
      if (!hasKeys) return allowEmptyString ? '' : undefined
      return JSON.stringify(value)
    }

    return undefined
  }

  private static parseJsonField(value: any, fieldName: string) {
    if (value === null || value === undefined || value === '') return undefined
    if (typeof value === 'object' && !Array.isArray(value)) return value

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
      } catch (error) {
        console.warn(`[ArticuloTiendaService] No se pudo parsear ${fieldName}:`, value, error)
      }
    }

    return undefined
  }
}

