// Hook personalizado para gestionar Ofertas Personalizadas

import { useState, useEffect, useCallback, useMemo } from 'react'
import { OfertaPersonalizadaService } from '@/lib/services/feats/ofertas-personalizadas/oferta-personalizada-service'
import type {
  OfertaPersonalizada,
  OfertaPersonalizadaCreateRequest,
  OfertaPersonalizadaUpdateRequest,
} from '@/lib/types/feats/ofertas-personalizadas/oferta-personalizada-types'

interface OfertaFilters {
  clienteId?: string
  leadId?: string
  pagada?: boolean | 'all'
  precioMin?: number
  precioMax?: number
}

interface UseOfertasPersonalizadasReturn {
  ofertas: OfertaPersonalizada[]
  filteredOfertas: OfertaPersonalizada[]
  loading: boolean
  error: string | null
  filters: OfertaFilters
  searchTerm: string
  setSearchTerm: (term: string) => void
  setFilters: (filters: OfertaFilters) => void
  loadOfertas: () => Promise<void>
  createOferta: (data: OfertaPersonalizadaCreateRequest) => Promise<boolean>
  updateOferta: (id: string, data: OfertaPersonalizadaUpdateRequest) => Promise<boolean>
  deleteOferta: (id: string) => Promise<boolean>
  getOfertaById: (id: string) => Promise<OfertaPersonalizada | null>
  marcarComoPagada: (id: string) => Promise<boolean>
  marcarComoNoPagada: (id: string) => Promise<boolean>
  getOfertasByCliente: (clienteId: string) => Promise<OfertaPersonalizada[]>
  getTotalGastadoCliente: (clienteId: string) => Promise<number>
}

export function useOfertasPersonalizadas(): UseOfertasPersonalizadasReturn {
  const [ofertas, setOfertas] = useState<OfertaPersonalizada[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<OfertaFilters>({
    pagada: 'all',
  })

  const loadOfertas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await OfertaPersonalizadaService.getOfertasPersonalizadas()
      setOfertas(Array.isArray(data) ? data : [])
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al cargar ofertas personalizadas'
      setError(errorMessage)
      console.error('Error loading ofertas personalizadas:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createOferta = useCallback(
    async (data: OfertaPersonalizadaCreateRequest): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        await OfertaPersonalizadaService.createOfertaPersonalizada(data)
        await loadOfertas() // Recargar lista
        return true
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error al crear oferta personalizada'
        setError(errorMessage)
        console.error('Error creating oferta personalizada:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [loadOfertas]
  )

  const updateOferta = useCallback(
    async (id: string, data: OfertaPersonalizadaUpdateRequest): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        const success = await OfertaPersonalizadaService.updateOfertaPersonalizada(id, data)
        if (success) {
          await loadOfertas() // Recargar lista
        }
        return success
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error al actualizar oferta personalizada'
        setError(errorMessage)
        console.error('Error updating oferta personalizada:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [loadOfertas]
  )

  const deleteOferta = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        const success = await OfertaPersonalizadaService.deleteOfertaPersonalizada(id)
        if (success) {
          await loadOfertas() // Recargar lista
        }
        return success
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error al eliminar oferta personalizada'
        setError(errorMessage)
        console.error('Error deleting oferta personalizada:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [loadOfertas]
  )

  const getOfertaById = useCallback(
    async (id: string): Promise<OfertaPersonalizada | null> => {
      setError(null)
      try {
        return await OfertaPersonalizadaService.getOfertaPersonalizadaById(id)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error al obtener oferta personalizada'
        setError(errorMessage)
        console.error('Error getting oferta personalizada by id:', err)
        return null
      }
    },
    []
  )

  const marcarComoPagada = useCallback(
    async (id: string): Promise<boolean> => {
      return updateOferta(id, { pagada: true })
    },
    [updateOferta]
  )

  const marcarComoNoPagada = useCallback(
    async (id: string): Promise<boolean> => {
      return updateOferta(id, { pagada: false })
    },
    [updateOferta]
  )

  const getOfertasByCliente = useCallback(
    async (clienteId: string): Promise<OfertaPersonalizada[]> => {
      setError(null)
      try {
        return await OfertaPersonalizadaService.getOfertasByCliente(clienteId)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error al obtener ofertas del cliente'
        setError(errorMessage)
        console.error('Error getting ofertas by cliente:', err)
        return []
      }
    },
    []
  )

  const getTotalGastadoCliente = useCallback(
    async (clienteId: string): Promise<number> => {
      setError(null)
      try {
        return await OfertaPersonalizadaService.getTotalGastadoByCliente(clienteId)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error al calcular total gastado'
        setError(errorMessage)
        console.error('Error getting total gastado:', err)
        return 0
      }
    },
    []
  )

  // Filtrado de ofertas
  const filteredOfertas = useMemo(() => {
    let filtered = [...ofertas]

    // Filtro por término de búsqueda (busca en ID de cliente)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (oferta) =>
          oferta.cliente_id?.toLowerCase().includes(term) ||
          oferta.lead_id?.toLowerCase().includes(term)
      )
    }

    // Filtro por cliente
    if (filters.clienteId) {
      filtered = filtered.filter((oferta) => oferta.cliente_id === filters.clienteId)
    }

    // Filtro por lead
    if (filters.leadId) {
      filtered = filtered.filter((oferta) => oferta.lead_id === filters.leadId)
    }

    // Filtro por estado de pago
    if (filters.pagada !== 'all' && filters.pagada !== undefined) {
      filtered = filtered.filter((oferta) => oferta.pagada === filters.pagada)
    }

    // Filtro por precio mínimo
    if (filters.precioMin !== undefined && filters.precioMin > 0) {
      filtered = filtered.filter(
        (oferta) => oferta.precio !== undefined && oferta.precio >= filters.precioMin!
      )
    }

    // Filtro por precio máximo
    if (filters.precioMax !== undefined && filters.precioMax > 0) {
      filtered = filtered.filter(
        (oferta) => oferta.precio !== undefined && oferta.precio <= filters.precioMax!
      )
    }

    return filtered
  }, [ofertas, searchTerm, filters])

  // Cargar ofertas al montar el hook
  useEffect(() => {
    loadOfertas()
  }, [loadOfertas])

  return {
    ofertas,
    filteredOfertas,
    loading,
    error,
    filters,
    searchTerm,
    setSearchTerm,
    setFilters,
    loadOfertas,
    createOferta,
    updateOferta,
    deleteOferta,
    getOfertaById,
    marcarComoPagada,
    marcarComoNoPagada,
    getOfertasByCliente,
    getTotalGastadoCliente,
  }
}
