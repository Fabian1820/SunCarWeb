import { useState, useEffect, useCallback, useMemo } from 'react'
import { LeadService } from '@/lib/api-services'
import type { Lead, LeadCreateData, LeadUpdateData, LeadConversionRequest, Cliente } from '@/lib/api-types'

interface LeadFilters {
  searchTerm: string
  estado: string
  fuente: string
  comercial: string
  fechaDesde: string
  fechaHasta: string
}

interface UseLeadsReturn {
  leads: Lead[]
  filteredLeads: Lead[]
  availableSources: string[]
  filters: LeadFilters
  loading: boolean
  error: string | null
  searchTerm: string
  setSearchTerm: (term: string) => void
  setFilters: (filters: Partial<LeadFilters>) => void
  loadLeads: () => Promise<void>
  createLead: (data: LeadCreateData) => Promise<boolean>
  updateLead: (id: string, data: LeadUpdateData) => Promise<boolean>
  deleteLead: (id: string) => Promise<boolean>
  convertLead: (id: string, data: LeadConversionRequest) => Promise<Cliente>
  generarCodigoCliente: (id: string, equipoPropio?: boolean) => Promise<string>
  uploadLeadComprobante: (
    id: string,
    payload: { file: File; metodo_pago?: string; moneda?: string }
  ) => Promise<{ comprobante_pago_url: string; metodo_pago?: string; moneda?: string }>
  clearError: () => void
}

export function useLeads(): UseLeadsReturn {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFiltersState] = useState<LeadFilters>({
    searchTerm: '',
    estado: '',
    fuente: '',
    comercial: '',
    fechaDesde: '',
    fechaHasta: ''
  })

  // Función para convertir fecha DD/MM/YYYY a Date
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null

    // Si está en formato DD/MM/YYYY
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = dateStr.split('/')
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    }

    // Si está en formato ISO
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? null : date
  }

  const loadLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await LeadService.getLeads()
      console.log('Backend response for leads:', data)
      console.log('Type of data:', typeof data)
      console.log('Is array:', Array.isArray(data))
      setLeads(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los leads')
      console.error('Error loading leads:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Obtener fuentes únicas de los leads existentes
  const availableSources = useMemo(() => {
    const sources = leads
      .map(lead => lead.fuente)
      .filter(fuente => fuente && fuente.trim() !== '')
      .filter((fuente, index, self) => self.indexOf(fuente) === index) // Quitar duplicados
      .sort()

    return sources as string[]
  }, [leads])

  // Filtrar leads basado en todos los filtros
  const filteredLeads = useMemo(() => {
    let filtered = leads

    // Filtro por término de búsqueda
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(lead => {
        return (
          lead.nombre?.toLowerCase().includes(searchLower) ||
          lead.telefono?.toLowerCase().includes(searchLower) ||
          lead.telefono_adicional?.toLowerCase().includes(searchLower) ||
          lead.estado?.toLowerCase().includes(searchLower) ||
          lead.fuente?.toLowerCase().includes(searchLower) ||
          lead.referencia?.toLowerCase().includes(searchLower) ||
          lead.direccion?.toLowerCase().includes(searchLower) ||
          lead.pais_contacto?.toLowerCase().includes(searchLower) ||
          lead.provincia_montaje?.toLowerCase().includes(searchLower) ||
          lead.comercial?.toLowerCase().includes(searchLower) ||
          lead.comentario?.toLowerCase().includes(searchLower) ||
          lead.metodo_pago?.toLowerCase().includes(searchLower) ||
          lead.moneda?.toLowerCase().includes(searchLower)
        )
      })
    }

    // Filtro por estado
    if (filters.estado) {
      filtered = filtered.filter(lead => lead.estado === filters.estado)
    }

    // Filtro por fuente
    if (filters.fuente) {
      filtered = filtered.filter(lead => lead.fuente === filters.fuente)
    }

    // Filtro por comercial
    if (filters.comercial) {
      filtered = filtered.filter(lead => lead.comercial === filters.comercial)
    }

    // Filtro por rango de fechas
    if (filters.fechaDesde || filters.fechaHasta) {
      filtered = filtered.filter(lead => {
        const leadDate = parseDate(lead.fecha_contacto)
        if (!leadDate) return false

        if (filters.fechaDesde) {
          const fechaDesde = parseDate(filters.fechaDesde)
          if (fechaDesde && leadDate < fechaDesde) return false
        }

        if (filters.fechaHasta) {
          const fechaHasta = parseDate(filters.fechaHasta)
          if (fechaHasta && leadDate > fechaHasta) return false
        }

        return true
      })
    }

    return filtered
  }, [leads, searchTerm, filters])

  const setFilters = useCallback((newFilters: Partial<LeadFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }))
  }, [])

  const createLead = useCallback(async (data: LeadCreateData): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      await LeadService.createLead(data)
      await loadLeads() // Recargar la lista
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el lead')
      console.error('Error creating lead:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [loadLeads])

  const updateLead = useCallback(async (id: string, data: LeadUpdateData): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      await LeadService.updateLead(id, data)
      await loadLeads() // Recargar la lista
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el lead')
      console.error('Error updating lead:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [loadLeads])

  const deleteLead = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      await LeadService.deleteLead(id)
      await loadLeads() // Recargar la lista
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el lead')
      console.error('Error deleting lead:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [loadLeads])

  const convertLead = useCallback(async (id: string, data: LeadConversionRequest): Promise<Cliente> => {
    setLoading(true)
    setError(null)
    try {
      const cliente = await LeadService.convertLeadToCliente(id, data)
      await loadLeads()
      return cliente
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al convertir el lead'
      setError(message)
      console.error('Error converting lead:', err)
      throw err instanceof Error ? err : new Error(message)
    } finally {
      setLoading(false)
    }
  }, [loadLeads])

  const generarCodigoCliente = useCallback(async (id: string, equipoPropio?: boolean): Promise<string> => {
    setError(null)
    try {
      const codigo = await LeadService.generarCodigoCliente(id, equipoPropio)
      return codigo
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al generar el código de cliente'
      setError(message)
      console.error('Error generating client code:', err)
      throw err instanceof Error ? err : new Error(message)
    }
  }, [])

  const uploadLeadComprobante = useCallback(
    async (
      id: string,
      payload: { file: File; metodo_pago?: string; moneda?: string }
    ): Promise<{ comprobante_pago_url: string; metodo_pago?: string; moneda?: string }> => {
      setLoading(true)
      setError(null)
      try {
        const result = await LeadService.uploadComprobante(id, payload)
        setLeads((prev) =>
          prev.map((lead) =>
            lead.id === id
              ? {
                  ...lead,
                  comprobante_pago_url: result.comprobante_pago_url,
                  metodo_pago: result.metodo_pago ?? lead.metodo_pago,
                  moneda: result.moneda ?? lead.moneda,
                }
              : lead
          )
        )
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al subir el comprobante'
        setError(message)
        console.error('Error uploading lead comprobante:', err)
        throw err instanceof Error ? err : new Error(message)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Cargar leads solo al montar el componente
  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  return {
    leads,
    filteredLeads,
    availableSources,
    filters,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    setFilters,
    loadLeads,
    createLead,
    updateLead,
    deleteLead,
    convertLead,
    generarCodigoCliente,
    uploadLeadComprobante,
    clearError,
  }
}
