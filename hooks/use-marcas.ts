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

// Cache en sessionStorage (TTL 10 min): las marcas cambian poco y hoy
// useMarcas() dispara 2 llamadas de red cada vez que se monta en cualquiera
// de sus ~9 consumidores (leads-table, clients-table, material-form, etc.).
const MARCAS_CACHE_KEY = 'marcas_cache_v1'
const MARCAS_CACHE_TTL_MS = 10 * 60 * 1000

function readMarcasCache(): { marcas: Marca[]; marcasSimplificadas: MarcaSimplificada[] } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(MARCAS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      ts: number
      marcas: Marca[]
      marcasSimplificadas: MarcaSimplificada[]
    }
    if (
      parsed?.ts &&
      Date.now() - parsed.ts < MARCAS_CACHE_TTL_MS &&
      Array.isArray(parsed.marcas) &&
      Array.isArray(parsed.marcasSimplificadas)
    ) {
      return { marcas: parsed.marcas, marcasSimplificadas: parsed.marcasSimplificadas }
    }
  } catch {
    // ignore cache errors
  }
  return null
}

function writeMarcasCache(marcas: Marca[], marcasSimplificadas: MarcaSimplificada[]) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(
      MARCAS_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), marcas, marcasSimplificadas })
    )
  } catch {
    // ignore quota errors
  }
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
      const allMarcas = await MarcaService.getMarcas()
      const simplificadas = await MarcaService.getMarcasSimplificadas()
      const marcasList = Array.isArray(allMarcas) ? allMarcas : []
      const simplificadasList = Array.isArray(simplificadas) ? simplificadas : []
      setMarcas(marcasList)
      setMarcasSimplificadas(simplificadasList)
      writeMarcasCache(marcasList, simplificadasList)
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

  // Cargar marcas al montar el hook, usando el cache de sessionStorage si
  // sigue vigente en vez de repetir la llamada de red.
  useEffect(() => {
    const cached = readMarcasCache()
    if (cached) {
      setMarcas(cached.marcas)
      setMarcasSimplificadas(cached.marcasSimplificadas)
      return
    }
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
