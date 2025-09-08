import { useState, useEffect, useCallback, useMemo } from 'react'
import { BrigadaService } from '@/lib/api-services'
import type { Brigada, BrigadaRequest, TeamMember } from '@/lib/brigade-types'

interface UseBrigadasReturn {
  brigadas: Brigada[]
  filteredBrigadas: Brigada[]
  loading: boolean
  error: string | null
  searchTerm: string
  setSearchTerm: (term: string) => void
  loadBrigadas: () => Promise<void>
  createBrigada: (data: BrigadaRequest) => Promise<boolean>
  updateBrigada: (id: string, data: BrigadaRequest) => Promise<boolean>
  deleteBrigada: (id: string) => Promise<boolean>
  addTrabajador: (brigadaId: string, trabajador: TeamMember) => Promise<boolean>
  removeTrabajador: (brigadaId: string, trabajadorCi: string) => Promise<boolean>
  clearError: () => void
}

export function useBrigadas(): UseBrigadasReturn {
  const [brigadas, setBrigadas] = useState<Brigada[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const loadBrigadas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await BrigadaService.getAllBrigadas()
      console.log('Backend response for brigadas:', data)
      console.log('Type of data:', typeof data)
      console.log('Is array:', Array.isArray(data))
      setBrigadas(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las brigadas')
      console.error('Error loading brigadas:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Filtrar brigadas localmente basado en searchTerm
  const filteredBrigadas = useMemo(() => {
    if (!searchTerm.trim()) {
      return brigadas
    }
    
    const searchLower = searchTerm.toLowerCase()
    return brigadas.filter(brigada => {
      // Buscar en el nombre del líder
      if (brigada.lider?.nombre?.toLowerCase().includes(searchLower)) {
        return true
      }
      
      // Buscar en el CI del líder
      if (brigada.lider?.CI?.toLowerCase().includes(searchLower)) {
        return true
      }
      
      // Buscar en los nombres de los integrantes
      if (brigada.integrantes?.some((trabajador: any) => 
        trabajador.nombre?.toLowerCase().includes(searchLower) ||
        trabajador.CI?.toLowerCase().includes(searchLower)
      )) {
        return true
      }
      
      return false
    })
  }, [brigadas, searchTerm])

  const createBrigada = useCallback(async (data: BrigadaRequest): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      await BrigadaService.createBrigada(data)
      await loadBrigadas() // Recargar la lista
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la brigada')
      console.error('Error creating brigada:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [loadBrigadas])

  const updateBrigada = useCallback(async (id: string, data: BrigadaRequest): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      await BrigadaService.updateBrigada(id, data)
      await loadBrigadas() // Recargar la lista
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la brigada')
      console.error('Error updating brigada:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [loadBrigadas])

  const deleteBrigada = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      await BrigadaService.deleteBrigada(id)
      await loadBrigadas() // Recargar la lista
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la brigada')
      console.error('Error deleting brigada:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [loadBrigadas])

  const addTrabajador = useCallback(async (brigadaId: string, trabajador: TeamMember): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      await BrigadaService.addTrabajador(brigadaId, trabajador)
      await loadBrigadas() // Recargar la lista
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar el trabajador')
      console.error('Error adding trabajador:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [loadBrigadas])

  const removeTrabajador = useCallback(async (brigadaId: string, trabajadorCi: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      await BrigadaService.removeTrabajador(brigadaId, trabajadorCi)
      await loadBrigadas() // Recargar la lista
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el trabajador')
      console.error('Error removing trabajador:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [loadBrigadas])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Cargar brigadas solo al montar el componente
  useEffect(() => {
    loadBrigadas()
  }, [loadBrigadas])

  return {
    brigadas,
    filteredBrigadas,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    loadBrigadas,
    createBrigada,
    updateBrigada,
    deleteBrigada,
    addTrabajador,
    removeTrabajador,
    clearError,
  }
} 