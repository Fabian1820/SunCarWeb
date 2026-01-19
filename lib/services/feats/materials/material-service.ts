/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from '../../../api-config'
import type { BackendCatalogoProductos } from '../../../api-types'
import type { 
  Material, 
  CreateCategoryRequest, 
  CreateMaterialRequest, 
  UpdateCategoryRequest,
  AddMaterialToCategoryRequest 
} from '../../../material-types'

export class MaterialService {
  static async getAllMaterials(): Promise<Material[]> {
    const result = await apiRequest<{ data: any[] }>('/productos/')
    return result.data.flatMap((cat: any) =>
      (cat.materiales || []).map((m: any) => ({
        ...m,
        // Usa el ObjectId del producto como identificador base; si el material trae su propio _id, úsalo
        id: m._id || m.id || m.material_id || cat.id,
        material_key: `${m._id || m.id || m.material_id || cat.id}__${m.codigo}`,
        categoria: cat.categoria,
        producto_id: cat.id,
      }))
    )
  }

  static async getCategories(): Promise<{ id: string; categoria: string; nombre?: string }[]> {
    const result = await apiRequest<{ data: { id: string; categoria?: string; nombre?: string }[] }>('/productos/categorias')
    // Normalizar: asegurar que siempre tengamos 'categoria'
    return result.data.map(cat => ({
      id: cat.id,
      categoria: cat.categoria || cat.nombre || '',
      nombre: cat.nombre || cat.categoria
    }))
  }

  static async getMaterialsByCategory(categoria: string): Promise<Material[]> {
    const result = await apiRequest<{ data: Material[] }>(`/productos/categorias/${encodeURIComponent(categoria)}/materiales`)
    return result.data
  }

  static async createCategory(categoria: string): Promise<string> {
    const result = await apiRequest<any>('/productos/categorias', {
      method: 'POST',
      body: JSON.stringify({ categoria }),
    })
    return result.producto_id || result.id || result.data?.id || 'success'
  }

  static async createProduct(categoria: string, materiales: any[] = []): Promise<string> {
    const result = await apiRequest<any>('/productos/', {
      method: 'POST',
      body: JSON.stringify({ categoria, materiales }),
    })
    return result.producto_id || result.id || result.data?.id || 'success'
  }

  static async addMaterialToProduct(
    productoId: string,
    material: { 
      codigo: string
      descripcion: string
      um: string
      precio?: number
      nombre?: string
      marca_id?: string
      foto?: string
      potenciaKW?: number
    }
  ): Promise<boolean> {
    console.log('[MaterialService] Agregando material a producto:', { productoId, material })
    try {
      const result = await apiRequest<{ success?: boolean; message?: string; error?: string }>(
        `/productos/${productoId}/materiales`,
        {
          method: 'POST',
          body: JSON.stringify({ material }),
        }
      )
      console.log('[MaterialService] Respuesta al agregar material:', result)

      if (result === null || result === undefined) {
        console.log('[MaterialService] Respuesta nula, asumiendo adición exitosa')
        return true
      }

      if (typeof result === 'object') {
        if (result.success === true) {
          return true
        }
        if (result.success === undefined && !result.error) {
          console.log('[MaterialService] Sin campo success pero sin errores, asumiendo adición exitosa')
          return true
        }
        if (result.error) {
          throw new Error(result.error)
        }
        if (result.success === false) {
          throw new Error(result.message || 'Error al agregar material')
        }
      }

      return true
    } catch (error: any) {
      console.error('[MaterialService] Error al agregar material:', error)
      throw error
    }
  }

  static async deleteMaterialByCodigo(materialCodigo: string): Promise<boolean> {
    console.log('[MaterialService] Intentando eliminar material por código:', { materialCodigo })
    try {
      const result = await apiRequest<{ success?: boolean; message?: string; detail?: string; error?: string }>(
        `/productos/materiales/${materialCodigo}`,
        {
          method: 'DELETE',
        }
      )
      console.log('[MaterialService] Respuesta al eliminar material:', result)

      if (typeof result === 'object' && result !== null) {
        if (result.success === true) {
          console.log('[MaterialService] Material eliminado exitosamente')
          return true
        }

        if (result.error || result.success === false) {
          const errorMsg = result.error || result.message || 'Error al eliminar material'
          console.error('[MaterialService] Error del backend:', errorMsg)
          throw new Error(errorMsg)
        }

        if (!result.success && !result.error && result.message) {
          console.log('[MaterialService] Respuesta ambigua, asumiendo éxito')
          return true
        }
      }

      console.log('[MaterialService] Respuesta vacía, asumiendo eliminación exitosa')
      return true
    } catch (error: any) {
      console.error('[MaterialService] Error al eliminar material:', error)
      throw error
    }
  }

  static async editMaterialInProduct(
    productoId: string,
    materialCodigo: string,
    data: { 
      codigo: string | number
      descripcion: string
      um: string
      precio?: number
      nombre?: string
      marca_id?: string
      foto?: string
      potenciaKW?: number
    }
  ): Promise<boolean> {
    console.log('[MaterialService] Editando material:', { productoId, materialCodigo, data })
    try {
      const result = await apiRequest<{ success?: boolean; message?: string; error?: string }>(
        `/productos/${productoId}/materiales/${materialCodigo}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        }
      )
      console.log('[MaterialService] Respuesta al editar material:', result)

      if (result === null || result === undefined) {
        console.log('[MaterialService] Respuesta nula, asumiendo edición exitosa')
        return true
      }

      if (typeof result === 'object') {
        if (result.success === true) {
          return true
        }
        if (result.success === undefined && !result.error) {
          console.log('[MaterialService] Sin campo success pero sin errores, asumiendo edición exitosa')
          return true
        }
        if (result.error) {
          throw new Error(result.error)
        }
        if (result.success === false) {
          throw new Error(result.message || 'Error al editar material')
        }
      }

      return true
    } catch (error: any) {
      console.error('[MaterialService] Error al editar material:', error)
      throw error
    }
  }

  static async getAllCatalogs(): Promise<BackendCatalogoProductos[]> {
    const result = await apiRequest<{ data: BackendCatalogoProductos[] }>('/productos/')
    return result.data
  }

  // New methods for category management with photos
  static async createCategoryWithPhoto(data: CreateCategoryRequest): Promise<string> {
    const formData = new FormData()
    formData.append('categoria', data.categoria)
    formData.append('esVendible', String(data.esVendible ?? true))
    
    if (data.foto) {
      formData.append('foto', data.foto)
    }
    
    if (data.materiales && data.materiales.length > 0) {
      formData.append('materiales', JSON.stringify(data.materiales))
    }

    const result = await apiRequest<any>('/productos/', {
      method: 'POST',
      body: formData,
      headers: {} // Let the browser set Content-Type for FormData
    })
    return result.producto_id || result.id || result.data?.id || 'success'
  }

  static async updateCategoryWithPhoto(productoId: string, data: UpdateCategoryRequest): Promise<boolean> {
    const formData = new FormData()
    
    if (data.categoria) {
      formData.append('categoria', data.categoria)
    }
    
    if (data.esVendible !== undefined) {
      formData.append('esVendible', String(data.esVendible))
    }
    
    if (data.foto) {
      formData.append('foto', data.foto)
    }

    const result = await apiRequest<{ success?: boolean; message?: string; error?: string }>(
      `/productos/${productoId}`,
      {
        method: 'PUT',
        body: formData,
        headers: {} // Let the browser set Content-Type for FormData
      }
    )

    if (result?.success === false || result?.error) {
      throw new Error(result.error || result.message || 'Error al actualizar categoría')
    }

    return true
  }

  static async addMaterialToCategoryWithPhoto(
    productoId: string, 
    data: AddMaterialToCategoryRequest
  ): Promise<boolean> {
    const result = await apiRequest<{ success?: boolean; message?: string; error?: string }>(
      `/productos/${productoId}/materiales`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )

    if (result?.success === false || result?.error) {
      throw new Error(result.error || result.message || 'Error al agregar material')
    }

    return true
  }
}
