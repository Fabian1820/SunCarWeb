// Hook personalizado para gestionar Marcas

import { useState, useEffect, useCallback } from 'react'
import { MarcaService } from '@/lib/services/feats/marcas/marca-service'
import type {
  Marca,
  MarcaCreateRequest,
  MarcaUpdateRequest,
  MarcaSimplificada,
} from '@/lib/types/feats/marcas/marca-types'

interface UseMarcasReturn {
  marcas: Marca[]
  marcasSimplificadas: MarcaSimplificada[]
  loading: boolean
  error: string | null
  loadMarcas: () => Promise<void>
  createMarca: (data: MarcaCreateRequest) => Promise<boolean>
  updateMarca: (id: string, data: MarcaUpdateRequest) => Promise<boolean>
  deleteMarca: (id: string) => Promise<boolean>
  getMarcaById: (id: string) => Promise<Marca | null>
}

export function useMarcas(): UseMarcasReturn {
  const [marcas, setMarcas] = useState<Marca[]>([])
  const [marcasSimplificadas, setMarcasSimplificadas] = useState<MarcaSimplificada[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMarcas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [allMarcas, simplificadas] = await Promise.all([
        MarcaService.getMarcas(),
        MarcaService.getMarcasSimplificadas(),
      ])
      setMarcas(Array.isArray(allMarcas) ? allMarcas : [])
      setMarcasSimplificadas(Array.isArray(simplificadas) ? simplificadas : [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar marcas'
      setError(errorMessage)
      console.error('Error loading marcas:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createMarca = useCallback(
    async (data: MarcaCreateRequest): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        await MarcaService.createMarca(data)
        await loadMarcas() // Recargar lista
        return true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al crear marca'
        setError(errorMessage)
        console.error('Error creating marca:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [loadMarcas]
  )

  const updateMarca = useCallback(
    async (id: string, data: MarcaUpdateRequest): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        const success = await MarcaService.updateMarca(id, data)
        if (success) {
          await loadMarcas() // Recargar lista
        }
        return success
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al actualizar marca'
        setError(errorMessage)
        console.error('Error updating marca:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [loadMarcas]
  )

  const deleteMarca = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        const success = await MarcaService.deleteMarca(id)
        if (success) {
          await loadMarcas() // Recargar lista
        }
        return success
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al eliminar marca'
        setError(errorMessage)
        console.error('Error deleting marca:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [loadMarcas]
  )

  const getMarcaById = useCallback(async (id: string): Promise<Marca | null> => {
    setError(null)
    try {
      return await MarcaService.getMarcaById(id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al obtener marca'
      setError(errorMessage)
      console.error('Error getting marca by id:', err)
      return null
    }
  }, [])

  // Cargar marcas al montar el hook
  useEffect(() => {
    loadMarcas()
  }, [loadMarcas])

  return {
    marcas,
    marcasSimplificadas,
    loading,
    error,
    loadMarcas,
    createMarca,
    updateMarca,
    deleteMarca,
    getMarcaById,
  }
}
