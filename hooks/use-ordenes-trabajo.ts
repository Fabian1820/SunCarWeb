import { useState, useEffect, useCallback, useMemo } from 'react'
import { OrdenTrabajoService } from '@/lib/api-services'
import { LocalOrdenesTrabajoService } from '@/lib/local-storage-ordenes'
import type { OrdenTrabajo, CreateOrdenTrabajoRequest, UpdateOrdenTrabajoRequest } from '@/lib/api-types'

interface UseOrdenesTrabajoReturn {
  ordenes: OrdenTrabajo[]
  filteredOrdenes: OrdenTrabajo[]
  loading: boolean
  error: string | null
  searchTerm: string
  setSearchTerm: (term: string) => void
  filterTipoReporte: string
  setFilterTipoReporte: (tipo: string) => void
  filterEstado: string
  setFilterEstado: (estado: string) => void
  loadOrdenes: () => Promise<void>
  createOrden: (data: CreateOrdenTrabajoRequest) => Promise<{ success: boolean; data?: any; message?: string }>
  updateOrden: (id: string, data: UpdateOrdenTrabajoRequest) => Promise<boolean>
  deleteOrden: (id: string) => Promise<boolean>
  clearError: () => void
}

export function useOrdenesTrabajo(): UseOrdenesTrabajoReturn {
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipoReporte, setFilterTipoReporte] = useState('')
  const [filterEstado, setFilterEstado] = useState('')

  const loadOrdenes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // TEMPORAL: Usar localStorage mientras el backend no está implementado
      const data = LocalOrdenesTrabajoService.getAll()
      console.log('📦 Órdenes de trabajo desde localStorage:', data)
      setOrdenes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las órdenes de trabajo')
      console.error('Error loading ordenes de trabajo:', err)
      setOrdenes([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Filtrar órdenes localmente basado en searchTerm, tipo de reporte y estado
  const filteredOrdenes = useMemo(() => {
    let filtered = ordenes

    // Filtrar por búsqueda general
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(orden => {
        return (
          orden.cliente_nombre?.toLowerCase().includes(searchLower) ||
          orden.cliente_numero?.toLowerCase().includes(searchLower) ||
          orden.brigada_nombre?.toLowerCase().includes(searchLower) ||
          orden.comentarios?.toLowerCase().includes(searchLower)
        )
      })
    }

    // Filtrar por tipo de reporte
    if (filterTipoReporte) {
      filtered = filtered.filter(orden => orden.tipo_reporte === filterTipoReporte)
    }

    // Filtrar por estado
    if (filterEstado) {
      filtered = filtered.filter(orden => orden.estado === filterEstado)
    }

    return filtered
  }, [ordenes, searchTerm, filterTipoReporte, filterEstado])

  const createOrden = useCallback(async (data: CreateOrdenTrabajoRequest, brigadaNombre?: string, clienteNombre?: string): Promise<{ success: boolean; data?: any; message?: string }> => {
    setLoading(true)
    setError(null)
    try {
      // TEMPORAL: Usar localStorage mientras el backend no está implementado
      const nuevaOrden = LocalOrdenesTrabajoService.create(data, brigadaNombre, clienteNombre)
      await loadOrdenes() // Recargar la lista
      return { success: true, data: nuevaOrden, message: 'Orden de trabajo creada correctamente' }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al crear la orden de trabajo'
      setError(errorMsg)
      console.error('Error creating orden de trabajo:', err)
      return { success: false, message: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [loadOrdenes])

  const updateOrden = useCallback(async (id: string, data: UpdateOrdenTrabajoRequest): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      // TEMPORAL: Usar localStorage mientras el backend no está implementado
      const success = LocalOrdenesTrabajoService.update(id, data)
      if (success) {
        await loadOrdenes() // Recargar la lista
        return true
      }
      throw new Error('No se encontró la orden de trabajo')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la orden de trabajo')
      console.error('Error updating orden de trabajo:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [loadOrdenes])

  const deleteOrden = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      // TEMPORAL: Usar localStorage mientras el backend no está implementado
      const success = LocalOrdenesTrabajoService.delete(id)
      if (success) {
        await loadOrdenes() // Recargar la lista
        return true
      }
      throw new Error('No se encontró la orden de trabajo')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la orden de trabajo')
      console.error('Error deleting orden de trabajo:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [loadOrdenes])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Cargar órdenes solo al montar el componente
  useEffect(() => {
    loadOrdenes()
  }, [loadOrdenes])

  return {
    ordenes,
    filteredOrdenes,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filterTipoReporte,
    setFilterTipoReporte,
    filterEstado,
    setFilterEstado,
    loadOrdenes,
    createOrden,
    updateOrden,
    deleteOrden,
    clearError,
  }
}
