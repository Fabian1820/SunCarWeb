/**
 * Custom hook for managing Trabajos Pendientes
 *
 * Provides CRUD operations, state management, and client name lookup
 * for pending work assignments (trabajos pendientes)
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { TrabajoPendienteService } from '@/lib/api-services'
import { ClienteService } from '@/lib/api-services'
import { LeadService } from '@/lib/api-services'
import type {
  TrabajoPendiente,
  TrabajoPendienteCreateData
} from '@/lib/types/feats/trabajos-pendientes/trabajo-pendiente-types'
import type { Cliente } from '@/lib/types/feats/customer/cliente-types'
import type { Lead } from '@/lib/types/feats/leads/lead-types'

export function useTrabajoPendientes() {
  const [trabajos, setTrabajos] = useState<TrabajoPendiente[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Create a map of CI -> Cliente nombre for efficient lookup
  const clienteMap = useMemo(() => {
    const map = new Map<string, string>()
    clientes.forEach((cliente) => {
      if (cliente.carnet_identidad) {
        map.set(cliente.carnet_identidad, cliente.nombre)
      }
      // Also map by numero in case CI is not available
      if (cliente.numero) {
        map.set(cliente.numero, cliente.nombre)
      }
    })
    return map
  }, [clientes])

  // Create a map of lead_id -> Lead nombre for efficient lookup
  const leadMap = useMemo(() => {
    const map = new Map<string, string>()
    leads.forEach((lead) => {
      if (lead.id) {
        map.set(lead.id, lead.nombre)
      }
    })
    return map
  }, [leads])

  /**
   * Load all clientes for CI -> Nombre lookup
   */
  const loadClientes = useCallback(async () => {
    try {
      const clientesData = await ClienteService.getClientes({})
      setClientes(Array.isArray(clientesData) ? clientesData : [])
    } catch (err) {
      console.error('Error loading clientes:', err)
      // Don't set error state, as this is a secondary operation
    }
  }, [])

  /**
   * Load all leads for lead_id -> Nombre lookup
   */
  const loadLeads = useCallback(async () => {
    try {
      const leadsData = await LeadService.getLeads({})
      setLeads(Array.isArray(leadsData) ? leadsData : [])
    } catch (err) {
      console.error('Error loading leads:', err)
      // Don't set error state, as this is a secondary operation
    }
  }, [])

  /**
   * Load all trabajos pendientes and enrich with client/lead names
   */
  const loadTrabajos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await TrabajoPendienteService.getTrabajos()
      const trabajosArray = Array.isArray(data) ? data : []

      // Enrich each trabajo with client or lead name
      const enrichedTrabajos = trabajosArray.map((trabajo) => {
        let nombre: string | undefined
        let tipoReferencia: 'cliente' | 'lead' | undefined

        if (trabajo.CI) {
          nombre = clienteMap.get(trabajo.CI)
          tipoReferencia = 'cliente'
        } else if (trabajo.lead_id) {
          nombre = leadMap.get(trabajo.lead_id)
          tipoReferencia = 'lead'
        }

        return {
          ...trabajo,
          Nombre: nombre,
          tipo_referencia: tipoReferencia
        }
      })

      setTrabajos(enrichedTrabajos)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al cargar trabajos pendientes'
      setError(errorMessage)
      setTrabajos([])
    } finally {
      setLoading(false)
    }
  }, [clienteMap, leadMap])

  /**
   * Filter trabajos by search term (searches CI, Nombre, Estado)
   */
  const filteredTrabajos = useMemo(() => {
    if (!searchTerm.trim()) return trabajos

    const lowerSearch = searchTerm.toLowerCase()
    return trabajos.filter((trabajo) => {
      const ci = trabajo.CI?.toLowerCase() || ''
      const nombre = trabajo.Nombre?.toLowerCase() || ''
      const estado = trabajo.estado?.toLowerCase() || ''
      const stoppedBy = trabajo.stopped_by?.toLowerCase() || ''

      return (
        ci.includes(lowerSearch) ||
        nombre.includes(lowerSearch) ||
        estado.includes(lowerSearch) ||
        stoppedBy.includes(lowerSearch)
      )
    })
  }, [trabajos, searchTerm])

  /**
   * Create a new trabajo pendiente
   */
  const createTrabajo = async (
    data: TrabajoPendienteCreateData,
    archivos?: File[]
  ): Promise<{ success: boolean; message: string; trabajoId?: string }> => {
    try {
      const response = await TrabajoPendienteService.crearTrabajo(data)
      if (response.success) {
        // If archivos are provided and we have a trabajo_id, upload them
        if (archivos && archivos.length > 0 && response.trabajo_id) {
          try {
            await TrabajoPendienteService.uploadArchivos(response.trabajo_id, archivos)
          } catch (uploadErr) {
            console.error('Error uploading archivos:', uploadErr)
            // Don't fail the whole operation if file upload fails
          }
        }
        
        await loadTrabajos()
        return { 
          success: true, 
          message: response.message || 'Trabajo creado exitosamente',
          trabajoId: response.trabajo_id
        }
      }
      return { success: false, message: response.message || 'Error al crear trabajo' }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al crear trabajo pendiente'
      return { success: false, message: errorMessage }
    }
  }

  /**
   * Update an existing trabajo pendiente
   */
  const updateTrabajo = async (
    id: string,
    data: Partial<TrabajoPendienteCreateData>
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await TrabajoPendienteService.actualizarTrabajo(id, data)
      if (response.success) {
        await loadTrabajos()
        return { success: true, message: response.message || 'Trabajo actualizado exitosamente' }
      }
      return { success: false, message: response.message || 'Error al actualizar trabajo' }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al actualizar trabajo pendiente'
      return { success: false, message: errorMessage }
    }
  }

  /**
   * Delete a trabajo pendiente
   */
  const deleteTrabajo = async (
    id: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await TrabajoPendienteService.eliminarTrabajo(id)
      if (response.success) {
        await loadTrabajos()
        return { success: true, message: response.message || 'Trabajo eliminado exitosamente' }
      }
      return { success: false, message: response.message || 'Error al eliminar trabajo' }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al eliminar trabajo pendiente'
      return { success: false, message: errorMessage }
    }
  }

  /**
   * Increment the visits counter for a trabajo
   */
  const incrementVisits = async (
    id: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await TrabajoPendienteService.incrementarVisitas(id)
      if (response.success) {
        await loadTrabajos()
        return { success: true, message: response.message || 'Visitas incrementadas' }
      }
      return { success: false, message: response.message || 'Error al incrementar visitas' }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al incrementar visitas'
      return { success: false, message: errorMessage }
    }
  }

  /**
   * Toggle the active status of a trabajo
   */
  const toggleActiveStatus = async (
    id: string,
    is_active: boolean
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await TrabajoPendienteService.cambiarEstadoActivo(id, is_active)
      if (response.success) {
        await loadTrabajos()
        return { success: true, message: response.message || 'Estado actualizado' }
      }
      return { success: false, message: response.message || 'Error al actualizar estado' }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al actualizar estado'
      return { success: false, message: errorMessage }
    }
  }

  /**
   * Get clientes with "Pendiente de Instalación" status
   */
  const getClientesPendientesInstalacion = useCallback((): Cliente[] => {
    return clientes.filter(
      (cliente) =>
        cliente.estado?.toLowerCase() === 'pendiente de instalación' ||
        cliente.estado?.toLowerCase() === 'pendiente de instalacion'
    )
  }, [clientes])

  /**
   * Get leads with "Pendiente de Instalación" status
   */
  const getLeadsPendientesInstalacion = useCallback((): Lead[] => {
    return leads.filter(
      (lead) =>
        lead.estado?.toLowerCase() === 'pendiente de instalación' ||
        lead.estado?.toLowerCase() === 'pendiente de instalacion'
    )
  }, [leads])

  // Load clientes and leads first, then trabajos
  useEffect(() => {
    loadClientes()
    loadLeads()
  }, [loadClientes, loadLeads])

  // Load trabajos when clienteMap and leadMap are ready
  useEffect(() => {
    if ((clientes.length > 0 || leads.length > 0) || !loading) {
      loadTrabajos()
    }
  }, [clientes.length, leads.length]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    trabajos,
    filteredTrabajos,
    clientes,
    leads,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    loadTrabajos,
    createTrabajo,
    updateTrabajo,
    deleteTrabajo,
    incrementVisits,
    toggleActiveStatus,
    getClientesPendientesInstalacion,
    getLeadsPendientesInstalacion,
    clearError: () => setError(null)
  }
}
