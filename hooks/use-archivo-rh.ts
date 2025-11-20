import { useState, useCallback } from 'react'
import { ArchivoRHService } from '@/lib/services/feats/recursos-humanos/archivo-rh-service'
import type {
  ArchivoNominaRH,
  ArchivoNominaSimplificado,
  CrearArchivoNominaRequest,
} from '@/lib/types/feats/recursos-humanos/archivo-rh-types'

/**
 * Hook para manejar el archivo histórico de nóminas de RRHH
 */
export function useArchivoRH() {
  const [nominas, setNominas] = useState<ArchivoNominaSimplificado[]>([])
  const [ultimaNomina, setUltimaNomina] = useState<ArchivoNominaRH | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Cargar todas las nóminas archivadas (simplificado - solo datos para listado)
   */
  const loadNominas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await ArchivoRHService.getAllNominas()
      setNominas(data)
      return { success: true, data }
    } catch (err: any) {
      console.error('Error al cargar nóminas:', err)
      setError(err.message || 'Error al cargar las nóminas')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Cargar la última nómina guardada
   */
  const loadUltimaNomina = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await ArchivoRHService.getUltimaNomina()
      setUltimaNomina(data)
      return { success: true, data }
    } catch (err: any) {
      console.error('Error al cargar última nómina:', err)
      setError(err.message || 'Error al cargar la última nómina')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])


  /**
   * Obtener nóminas de un año específico (simplificado)
   */
  const loadNominasPorAnio = useCallback(async (anio: number) => {
    setLoading(true)
    setError(null)
    try {
      const allData = await ArchivoRHService.getAllNominas()
      const filtered = allData.filter(n => n.anio === anio)
      setNominas(filtered)
      return { success: true, data: filtered }
    } catch (err: any) {
      console.error(`Error al cargar nóminas del año ${anio}:`, err)
      setError(err.message || `Error al cargar las nóminas del año ${anio}`)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Obtener nómina específica por mes y año (con todos los detalles)
   */
  const loadNominaPorPeriodo = useCallback(async (mes: number, anio: number) => {
    setLoading(true)
    setError(null)
    try {
      const data = await ArchivoRHService.getNominaPorPeriodo(mes, anio)
      if (!data) {
        return { success: false, error: `No existe nómina para el período ${mes}/${anio}` }
      }
      return { success: true, data }
    } catch (err: any) {
      console.error(`Error al cargar nómina de ${mes}/${anio}:`, err)
      setError(err.message || `Error al cargar la nómina de ${mes}/${anio}`)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Guardar nueva nómina
   */
  const guardarNomina = useCallback(async (
    data: CrearArchivoNominaRequest
  ): Promise<{ success: boolean; message: string; id?: string }> => {
    setLoading(true)
    setError(null)
    try {
      const response = await ArchivoRHService.crearNomina(data)

      // Recargar lista de nóminas
      await loadNominas()

      return {
        success: true,
        message: response.message,
        id: response.id,
      }
    } catch (err: any) {
      console.error('Error al guardar nómina:', err)

      // Mensajes de error específicos
      let errorMsg = err.message || 'Error al guardar la nómina'

      if (err.message?.includes('409') || err.message?.includes('ya existe')) {
        errorMsg = `Ya existe una nómina registrada para ${data.mes}/${data.anio}`
      } else if (err.message?.includes('400') || err.message?.includes('validación')) {
        errorMsg = 'Datos inválidos. Verifica que todos los campos sean correctos.'
      }

      setError(errorMsg)
      return { success: false, message: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [loadNominas])

  return {
    nominas,
    ultimaNomina,
    loading,
    error,
    loadNominas,
    loadUltimaNomina,
    loadNominasPorAnio,
    loadNominaPorPeriodo,
    guardarNomina,
  }
}
