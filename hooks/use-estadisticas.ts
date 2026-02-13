import { useState, useCallback } from 'react'
import { EstadisticasService } from '@/lib/api-services'
import type {
  EstadisticasCrecimiento,
  EstadisticasParams,
  EstadisticaLineaTiempoItemFrontend,
} from '@/lib/types/feats/estadisticas/estadisticas-types'
import {
  convertEstadisticasToFrontend,
  convertLineaTiempoToFrontend
} from '@/lib/types/feats/estadisticas/estadisticas-types'

export function useEstadisticas() {
  const [estadisticas, setEstadisticas] = useState<EstadisticasCrecimiento[]>([])
  // New state for timeline
  const [timelineData, setTimelineData] = useState<import('@/lib/types/feats/estadisticas/estadisticas-types').EstadisticaLineaTiempoItemFrontend[]>([])
  // State for specific month detail
  const [selectedMonthStat, setSelectedMonthStat] = useState<EstadisticasCrecimiento | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Carga la línea de tiempo usando el nuevo endpoint
   */
  const loadLineaTiempo = useCallback(async (estados?: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await EstadisticasService.getLineaTiempo(estados)
      if (response && response.success && Array.isArray(response.data)) {
        const converted = response.data.map(convertLineaTiempoToFrontend)
        setTimelineData(converted)

        // Mapear a formato antiguo si es necesario para compatibilidad parcial o migracion gradual
        // Por ahora mantenemos timelineData separado y actualizaremos los graficos
      } else {
        setError(response?.message || 'Error al cargar línea de tiempo')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar línea de tiempo'
      setError(errorMessage)
      setTimelineData([])
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Carga estadística de un mes específico (Endpoint Viejo)
   */
  const loadEstadisticaMensual = useCallback(async (año: number, mes: number) => {
    setLoading(true)
    setError(null)
    try {
      const result = await EstadisticasService.getCrecimientoMensual({ año, mes })
      const converted = convertEstadisticasToFrontend(result)
      setSelectedMonthStat(converted)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar estadística mensual'
      setError(errorMessage)
      setSelectedMonthStat(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    timelineData, // Nueva data
    selectedMonthStat, // Data de un mes especifico
    loading,
    error,
    loadLineaTiempo, // Nueva funcion principal
    loadEstadisticaMensual, // Funcion para detalle
    clearError,
  }
}
