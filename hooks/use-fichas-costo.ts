import { useState, useCallback } from 'react'
import { FichaCostoService } from '@/lib/api-services'
import type { MaterialFichaResumen } from '@/lib/types/feats/fichas-costo/ficha-costo-types'

interface UseFichasCostoReturn {
  resumen: MaterialFichaResumen[]
  loadingResumen: boolean
  error: string | null
  loadResumen: () => Promise<void>
}

/**
 * Modelo simplificado de Fichas de Costo: la ficha es la vista contable del
 * material (costo, precio, % rebajable, márgenes). No hay entidad versionada;
 * los datos se leen del catálogo de materiales y se editan in situ.
 */
export function useFichasCosto(): UseFichasCostoReturn {
  const [resumen, setResumen] = useState<MaterialFichaResumen[]>([])
  const [loadingResumen, setLoadingResumen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadResumen = useCallback(async () => {
    setLoadingResumen(true)
    setError(null)
    try {
      const data = await FichaCostoService.getTodosMaterialesConFichas()
      setResumen(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setResumen([])
      setError(err?.message || 'Error al cargar materiales')
    } finally {
      setLoadingResumen(false)
    }
  }, [])

  return { resumen, loadingResumen, error, loadResumen }
}
