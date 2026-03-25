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

  const editarDatosContabilidad = useCallback(
    async (
      materialCodigo: string,
      productoId: string,
      data: {
        codigo_contabilidad: string
        cantidad_contabilidad: number
        precio_contabilidad: number
      }
    ): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        // Obtener el material completo para preservar todos sus datos
        const material = allMateriales.find((m) => m.codigo === materialCodigo)
        if (!material) {
          throw new Error('Material no encontrado')
        }

        // Preparar datos completos del material con los nuevos datos de contabilidad
        const updateData = {
          codigo: material.codigo,
          descripcion: material.descripcion,
          um: material.um,
          precio: material.precio,
          comentario: material.comentario,
          nombre: material.nombre,
          marca_id: material.marca_id,
          foto: material.foto,
          potenciaKW: material.potenciaKW,
          habilitar_venta_web: material.habilitar_venta_web,
          precio_por_cantidad: material.precio_por_cantidad,
          especificaciones: material.especificaciones,
          ficha_tecnica_url: material.ficha_tecnica_url,
          numero_serie: material.numero_serie,
          stockaje_minimo: material.stockaje_minimo,
          codigo_contabilidad: data.codigo_contabilidad,
          cantidad_contabilidad: data.cantidad_contabilidad,
          precio_contabilidad: data.precio_contabilidad,
        }

        await MaterialService.editMaterialInProduct(
          productoId,
          materialCodigo,
          updateData
        )
        
        // Recargar ambas listas
        await loadMateriales()
        await loadAllMateriales()
        return true
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error al editar datos de contabilidad'
        setError(message)
        console.error('Error editando datos de contabilidad:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [allMateriales, loadMateriales, loadAllMateriales]
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
    editarDatosContabilidad,
    loadTickets,
    loadAllMateriales,
    clearError: () => setError(null),
  }
}
