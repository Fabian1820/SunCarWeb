import { useState, useEffect, useCallback, useMemo } from 'react'
import { OrdenTrabajoService } from '@/lib/api-services'
import type {
  OrdenTrabajo,
  CreateOrdenTrabajoRequest,
  UpdateOrdenTrabajoRequest,
  CreateOrdenTrabajoResponse,
} from '@/lib/api-types'

interface UseOrdenesTrabajoReturn {
  ordenes: OrdenTrabajo[]
  filteredOrdenes: OrdenTrabajo[]
  loading: boolean
  error: string | null
  searchTerm: string
  setSearchTerm: (term: string) => void
  filterTipoReporte: string
  setFilterTipoReporte: (tipo: string) => void
  filterBrigada: string
  setFilterBrigada: (brigada: string) => void
  loadOrdenes: () => Promise<void>
  createOrden: (data: CreateOrdenTrabajoRequest) => Promise<CreateOrdenTrabajoResponse>
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
  const [filterBrigada, setFilterBrigada] = useState('')

  const loadOrdenes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('📦 Cargando órdenes de trabajo desde el backend...')
      const data = await OrdenTrabajoService.getOrdenesTrabajo()
      console.log('✅ Órdenes de trabajo cargadas:', data)
      setOrdenes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las órdenes de trabajo')
      console.error('❌ Error loading ordenes de trabajo:', err)
      setOrdenes([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Filtrar órdenes localmente basado en searchTerm, tipo de reporte y brigada
  const filteredOrdenes = useMemo(() => {
    let filtered = ordenes

    // Filtrar por búsqueda general
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(orden => {
        const clienteNombre = orden.cliente?.nombre?.toLowerCase() || ''
        const brigadaNombre = orden.brigada?.lider?.nombre?.toLowerCase() || ''

        return (
          clienteNombre.includes(searchLower) ||
          orden.cliente?.numero?.toLowerCase().includes(searchLower) ||
          brigadaNombre.includes(searchLower) ||
          orden.brigada?.lider?.CI?.toLowerCase().includes(searchLower) ||
          orden.comentarios?.toLowerCase().includes(searchLower)
        )
      })
    }

    // Filtrar por tipo de reporte
    if (filterTipoReporte) {
      filtered = filtered.filter(orden => orden.tipo_reporte === filterTipoReporte)
    }

    // Filtrar por brigada (CI del líder)
    if (filterBrigada) {
      filtered = filtered.filter(orden => orden.brigada?.lider?.CI === filterBrigada)
    }

    return filtered
  }, [ordenes, searchTerm, filterTipoReporte, filterBrigada])

  const createOrden = useCallback(async (data: CreateOrdenTrabajoRequest): Promise<CreateOrdenTrabajoResponse> => {
    setLoading(true)
    setError(null)
    try {
      console.log('📝 Creando orden de trabajo:', data)
      const response = await OrdenTrabajoService.createOrdenTrabajo(data)
      console.log('✅ Orden creada:', response)
      await loadOrdenes() // Recargar la lista
      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al crear la orden de trabajo'
      setError(errorMsg)
      console.error('❌ Error creating orden de trabajo:', err)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [loadOrdenes])

  const updateOrden = useCallback(async (id: string, data: UpdateOrdenTrabajoRequest): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      console.log('📝 Actualizando orden de trabajo:', id, data)
      const response = await OrdenTrabajoService.updateOrdenTrabajo(id, data)
      console.log('✅ Orden actualizada:', response)
      if (response?.id) {
        await loadOrdenes() // Recargar la lista
        return true
      }
      throw new Error('Error al actualizar la orden de trabajo')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la orden de trabajo')
      console.error('❌ Error updating orden de trabajo:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [loadOrdenes])

  const deleteOrden = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      console.log('🗑️ Eliminando orden de trabajo:', id)
      const response = await OrdenTrabajoService.deleteOrdenTrabajo(id)
      console.log('✅ Orden eliminada:', response)
      if (response.success !== false) {
        await loadOrdenes() // Recargar la lista
        return true
      }
      throw new Error(response.message || 'Error al eliminar la orden de trabajo')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la orden de trabajo')
      console.error('❌ Error deleting orden de trabajo:', err)
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
    filterBrigada,
    setFilterBrigada,
    loadOrdenes,
    createOrden,
    updateOrden,
    deleteOrden,
    clearError,
  }
}
