import { useState, useEffect, useCallback } from 'react'
import { ContabilidadService, MaterialService } from '@/lib/api-services'
import type {
  MaterialContabilidad,
  TicketContabilidad,
} from '@/lib/types/feats/contabilidad/contabilidad-types'
import {
  convertMaterialContabilidadToFrontend,
  convertTicketToFrontend,
} from '@/lib/types/feats/contabilidad/contabilidad-types'
import type { Material } from '@/lib/api-types'
import type {
  ActualizarMaterialContabilidadRequest,
  CrearMaterialContabilidadRequest,
} from '@/lib/services/feats/contabilidad/contabilidad-service'

export function useContabilidad() {
  const [materiales, setMateriales] = useState<MaterialContabilidad[]>([])
  const [allMateriales, setAllMateriales] = useState<Material[]>([])
  const [tickets, setTickets] = useState<TicketContabilidad[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMateriales = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await ContabilidadService.getMaterialesContabilidad()
      const converted = data.map(convertMaterialContabilidadToFrontend)
      setMateriales(converted)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar materiales'
      setError(message)
      console.error('Error loading materiales contabilidad:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAllMateriales = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await MaterialService.getAllMaterials()
      setAllMateriales(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar todos los materiales'
      setError(message)
      console.error('Error loading all materiales:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTickets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await ContabilidadService.getTickets()
      const converted = data.map(convertTicketToFrontend)
      setTickets(converted)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar tickets'
      setError(message)
      console.error('Error loading tickets:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const registrarEntrada = useCallback(
    async (materialId: string, cantidad: number): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        await ContabilidadService.registrarEntrada(materialId, cantidad)
        await loadMateriales() // Recargar para reflejar cambios
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al registrar entrada'
        setError(message)
        console.error('Error registrando entrada:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [loadMateriales]
  )

  const crearTicket = useCallback(
    async (
      materiales: { material_id: string; cantidad: number }[]
    ): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        await ContabilidadService.crearTicket(materiales)
        await loadMateriales() // Recargar para reflejar cantidades rebajadas
        await loadTickets() // Cargar tickets actualizados
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al crear ticket'
        setError(message)
        console.error('Error creando ticket:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [loadMateriales, loadTickets]
  )

  // Alta de material contable. Ya no pasa por el catálogo del sistema: la
  // operadora escribe el código y el nombre que usa contabilidad, exista o no
  // ese material en el catálogo.
  const crearMaterial = useCallback(
    async (datos: CrearMaterialContabilidadRequest): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        await ContabilidadService.crearMaterial(datos)
        await loadMateriales()
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al dar de alta el material')
        console.error('Error dando de alta material contable:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [loadMateriales]
  )

  const editarMaterial = useCallback(
    async (
      materialId: string,
      datos: ActualizarMaterialContabilidadRequest
    ): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        await ContabilidadService.actualizarMaterial(materialId, datos)
        await loadMateriales()
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al editar el material')
        console.error('Error editando material contable:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [loadMateriales]
  )

  const eliminarMaterial = useCallback(
    async (materialId: string): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        await ContabilidadService.eliminarMaterial(materialId)
        await loadMateriales()
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al dar de baja el material')
        console.error('Error dando de baja material contable:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [loadMateriales]
  )

  useEffect(() => {
    loadMateriales()
  }, [loadMateriales])

  return {
    materiales,
    allMateriales,
    tickets,
    loading,
    error,
    registrarEntrada,
    crearTicket,
    crearMaterial,
    editarMaterial,
    eliminarMaterial,
    loadTickets,
    loadAllMateriales,
    clearError: () => setError(null),
  }
}
