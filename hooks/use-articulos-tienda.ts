import { useState, useEffect, useCallback } from 'react'
import { ArticuloTiendaService } from '@/lib/services/feats/articulos-tienda/articulo-tienda-service'
import type {
  ArticuloTienda,
  ArticuloTiendaCreateData,
  ArticuloTiendaUpdateData,
} from '@/lib/articulos-tienda-types'

interface UseArticulosTiendaReturn {
  articulos: ArticuloTienda[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createArticulo: (data: ArticuloTiendaCreateData) => Promise<ArticuloTienda>
  updateArticulo: (id: string, data: ArticuloTiendaUpdateData) => Promise<ArticuloTienda>
  deleteArticulo: (id: string) => Promise<boolean>
  getArticuloById: (id: string) => Promise<ArticuloTienda>
  categories: string[]
  unidades: string[]
}

export function useArticulosTienda(): UseArticulosTiendaReturn {
  const [articulos, setArticulos] = useState<ArticuloTienda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadArticulos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await ArticuloTiendaService.getAllArticulos()
      setArticulos(data)
    } catch (err: any) {
      console.error('Error loading artículos:', err)
      setError(err.message || 'Error al cargar los artículos')
      setArticulos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadArticulos()
  }, [loadArticulos])

  const createArticulo = useCallback(async (data: ArticuloTiendaCreateData): Promise<ArticuloTienda> => {
    try {
      setError(null)
      const newArticulo = await ArticuloTiendaService.createArticulo(data)
      await loadArticulos() // Recargar la lista
      return newArticulo
    } catch (err: any) {
      console.error('Error creating artículo:', err)
      setError(err.message || 'Error al crear el artículo')
      throw err
    }
  }, [loadArticulos])

  const updateArticulo = useCallback(async (
    id: string,
    data: ArticuloTiendaUpdateData
  ): Promise<ArticuloTienda> => {
    try {
      setError(null)
      const updatedArticulo = await ArticuloTiendaService.updateArticulo(id, data)
      await loadArticulos() // Recargar la lista
      return updatedArticulo
    } catch (err: any) {
      console.error('Error updating artículo:', err)
      setError(err.message || 'Error al actualizar el artículo')
      throw err
    }
  }, [loadArticulos])

  const deleteArticulo = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null)
      const success = await ArticuloTiendaService.deleteArticulo(id)
      if (success) {
        await loadArticulos() // Recargar la lista
      }
      return success
    } catch (err: any) {
      console.error('Error deleting artículo:', err)
      setError(err.message || 'Error al eliminar el artículo')
      throw err
    }
  }, [loadArticulos])

  const getArticuloById = useCallback(async (id: string): Promise<ArticuloTienda> => {
    try {
      setError(null)
      return await ArticuloTiendaService.getArticuloById(id)
    } catch (err: any) {
      console.error('Error getting artículo by ID:', err)
      setError(err.message || 'Error al obtener el artículo')
      throw err
    }
  }, [])

  // Extraer categorías únicas
  const categories = Array.from(new Set(articulos.map(a => a.categoria).filter(Boolean))).sort()

  // Unidades disponibles
  const unidades = ['pieza', 'set']

  return {
    articulos,
    loading,
    error,
    refetch: loadArticulos,
    createArticulo,
    updateArticulo,
    deleteArticulo,
    getArticuloById,
    categories,
    unidades,
  }
}

