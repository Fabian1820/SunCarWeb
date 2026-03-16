import { useState, useCallback } from 'react'
import { FichaCostoService } from '@/lib/api-services'
import type {
  FichaCosto,
  FichaCostoCreateData,
  ComparacionPrecio,
  AplicarPrecioResponse,
  MaterialFichaResumen,
} from '@/lib/types/feats/fichas-costo/ficha-costo-types'

interface BulkResult {
  total: number
  creadas: number
  errores_count: number
  fichas: any[]
  errores: any[]
}

interface UseFichasCostoReturn {
  fichaActiva: FichaCosto | null
  historial: FichaCosto[]
  comparacion: ComparacionPrecio | null
  resumen: MaterialFichaResumen[]
  loading: boolean
  loadingAction: boolean
  loadingResumen: boolean
  loadingBulk: boolean
  error: string | null
  crearFicha: (data: FichaCostoCreateData) => Promise<FichaCosto | null>
  crearBulk: (materialIds: string[], porcentaje: number) => Promise<BulkResult | null>
  cargarFichaActiva: (materialId: string) => Promise<void>
  cargarHistorial: (materialId: string) => Promise<void>
  compararPrecio: (materialId: string) => Promise<ComparacionPrecio | null>
  aplicarPrecio: (materialId: string) => Promise<AplicarPrecioResponse | null>
  loadResumen: () => Promise<void>
  limpiarEstado: () => void
}

export function useFichasCosto(): UseFichasCostoReturn {
  const [fichaActiva, setFichaActiva] = useState<FichaCosto | null>(null)
  const [historial, setHistorial] = useState<FichaCosto[]>([])
  const [comparacion, setComparacion] = useState<ComparacionPrecio | null>(null)
  const [resumen, setResumen] = useState<MaterialFichaResumen[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState(false)
  const [loadingResumen, setLoadingResumen] = useState(false)
  const [loadingBulk, setLoadingBulk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadResumen = useCallback(async () => {
    setLoadingResumen(true)
    try {
      const data = await FichaCostoService.getResumen()
      setResumen(Array.isArray(data) ? data : [])
    } catch {
      setResumen([])
    } finally {
      setLoadingResumen(false)
    }
  }, [])

  const crearFicha = useCallback(async (data: FichaCostoCreateData): Promise<FichaCosto | null> => {
    try {
      setLoadingAction(true)
      setError(null)
      const ficha = await FichaCostoService.crearFicha(data)
      if (!ficha || typeof (ficha as any).precio_venta_calculado !== 'number') {
        const errMsg = (ficha as any)?.detail || (ficha as any)?.message || 'Error al crear ficha de costo'
        setError(errMsg)
        return null
      }
      setFichaActiva(ficha)
      return ficha
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear ficha de costo'
      setError(msg)
      return null
    } finally {
      setLoadingAction(false)
    }
  }, [])

  const crearBulk = useCallback(async (materialIds: string[], porcentaje: number): Promise<BulkResult | null> => {
    try {
      setLoadingBulk(true)
      setError(null)
      const result = await FichaCostoService.crearFichasBulk(materialIds, porcentaje)
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear fichas en masa'
      setError(msg)
      return null
    } finally {
      setLoadingBulk(false)
    }
  }, [])

  const cargarFichaActiva = useCallback(async (materialId: string) => {
    try {
      setLoading(true)
      setError(null)
      const ficha = await FichaCostoService.obtenerFichaActiva(materialId)
      const esValida = ficha &&
        typeof (ficha as any).costo_unitario === 'number' &&
        typeof (ficha as any).precio_venta_calculado === 'number'
      setFichaActiva(esValida ? ficha : null)
    } catch {
      setFichaActiva(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const cargarHistorial = useCallback(async (materialId: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await FichaCostoService.obtenerHistorial(materialId)
      setHistorial(Array.isArray(data) ? data : [])
    } catch (err) {
      setHistorial([])
      setError(err instanceof Error ? err.message : 'Error al cargar historial')
    } finally {
      setLoading(false)
    }
  }, [])

  const compararPrecio = useCallback(async (materialId: string): Promise<ComparacionPrecio | null> => {
    try {
      setLoadingAction(true)
      setError(null)
      const result = await FichaCostoService.compararPrecio(materialId)
      if (!result || typeof (result as any).precio_calculado_ficha !== 'number') {
        const errMsg = (result as any)?.detail || (result as any)?.message || 'Error al comparar precio'
        setError(errMsg)
        return null
      }
      setComparacion(result)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al comparar precio')
      return null
    } finally {
      setLoadingAction(false)
    }
  }, [])

  const aplicarPrecio = useCallback(async (materialId: string): Promise<AplicarPrecioResponse | null> => {
    try {
      setLoadingAction(true)
      setError(null)
      const result = await FichaCostoService.aplicarPrecio(materialId)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aplicar precio')
      return null
    } finally {
      setLoadingAction(false)
    }
  }, [])

  const limpiarEstado = useCallback(() => {
    setFichaActiva(null)
    setHistorial([])
    setComparacion(null)
    setError(null)
  }, [])

  return {
    fichaActiva,
    historial,
    comparacion,
    resumen,
    loading,
    loadingAction,
    loadingResumen,
    loadingBulk,
    error,
    crearFicha,
    crearBulk,
    cargarFichaActiva,
    cargarHistorial,
    compararPrecio,
    aplicarPrecio,
    loadResumen,
    limpiarEstado,
  }
}
