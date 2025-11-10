// Hook personalizado para gestionar Servicios

import { useState, useEffect, useCallback } from 'react'
import { ServicioService } from '@/lib/services/feats/servicios/servicio-service'
import type {
  Servicio,
  ServicioCreateRequest,
  ServicioUpdateRequest,
  ServicioSimplificado,
} from '@/lib/types/feats/servicios/servicio-types'

interface UseServiciosReturn {
  servicios: Servicio[]
  serviciosSimplificados: ServicioSimplificado[]
  loading: boolean
  error: string | null
  loadServicios: () => Promise<void>
  createServicio: (data: ServicioCreateRequest) => Promise<boolean>
  updateServicio: (id: string, data: ServicioUpdateRequest) => Promise<boolean>
  deleteServicio: (id: string) => Promise<boolean>
  getServicioById: (id: string) => Promise<Servicio | null>
}

export function useServicios(): UseServiciosReturn {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [serviciosSimplificados, setServiciosSimplificados] = useState<
    ServicioSimplificado[]
  >([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadServicios = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [allServicios, simplificados] = await Promise.all([
        ServicioService.getServicios(),
        ServicioService.getServiciosSimplificados(),
      ])
      setServicios(Array.isArray(allServicios) ? allServicios : [])
      setServiciosSimplificados(Array.isArray(simplificados) ? simplificados : [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar servicios'
      setError(errorMessage)
      console.error('Error loading servicios:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createServicio = useCallback(
    async (data: ServicioCreateRequest): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        await ServicioService.createServicio(data)
        await loadServicios() // Recargar lista
        return true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al crear servicio'
        setError(errorMessage)
        console.error('Error creating servicio:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [loadServicios]
  )

  const updateServicio = useCallback(
    async (id: string, data: ServicioUpdateRequest): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        const success = await ServicioService.updateServicio(id, data)
        if (success) {
          await loadServicios() // Recargar lista
        }
        return success
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error al actualizar servicio'
        setError(errorMessage)
        console.error('Error updating servicio:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [loadServicios]
  )

  const deleteServicio = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        const success = await ServicioService.deleteServicio(id)
        if (success) {
          await loadServicios() // Recargar lista
        }
        return success
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al eliminar servicio'
        setError(errorMessage)
        console.error('Error deleting servicio:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [loadServicios]
  )

  const getServicioById = useCallback(async (id: string): Promise<Servicio | null> => {
    setError(null)
    try {
      return await ServicioService.getServicioById(id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al obtener servicio'
      setError(errorMessage)
      console.error('Error getting servicio by id:', err)
      return null
    }
  }, [])

  // Cargar servicios al montar el hook
  useEffect(() => {
    loadServicios()
  }, [loadServicios])

  return {
    servicios,
    serviciosSimplificados,
    loading,
    error,
    loadServicios,
    createServicio,
    updateServicio,
    deleteServicio,
    getServicioById,
  }
}
