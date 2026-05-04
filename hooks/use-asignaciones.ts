"use client"

import { useState, useEffect, useCallback } from 'react'
import { AsignacionService } from '@/lib/api-services'
import type {
  MedioBasico,
  TrabajadorConAsignaciones,
  AsignacionCreateData,
  AsignacionUpdateData,
  MedioBasicoCreateData,
  MedioBasicoUpdateData,
  HerramientaCatalogo,
  HerramientaAsignarData,
  HerramientaUpdateData,
  HerramientaCatalogoCreateData,
  HerramientaCatalogoUpdateData,
} from '@/lib/types/feats/asignaciones/asignacion-types'

export function useAsignaciones() {
  const [trabajadores, setTrabajadores] = useState<TrabajadorConAsignaciones[]>([])
  const [mediosBasicos, setMediosBasicos] = useState<MedioBasico[]>([])
  const [catalogoHerramientas, setCatalogoHerramientas] = useState<HerramientaCatalogo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [trabData, mediosData, herramientasData] = await Promise.all([
        AsignacionService.getTrabajadoresConAsignaciones(),
        AsignacionService.getMediosBasicos(),
        AsignacionService.getCatalogoHerramientas(),
      ])
      setTrabajadores(trabData)
      setMediosBasicos(mediosData)
      setCatalogoHerramientas(herramientasData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  const reloadTrabajadores = useCallback(async () => {
    try {
      const data = await AsignacionService.getTrabajadoresConAsignaciones()
      setTrabajadores(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al recargar trabajadores')
    }
  }, [])

  const reloadMediosBasicos = useCallback(async () => {
    try {
      const data = await AsignacionService.getMediosBasicos()
      setMediosBasicos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al recargar medios básicos')
    }
  }, [])

  // ── Medios Básicos ────────────────────────────────────────────────────────

  const createMedioBasico = useCallback(async (data: MedioBasicoCreateData): Promise<boolean> => {
    setLoading(true)
    try {
      await AsignacionService.createMedioBasico(data)
      await reloadMediosBasicos()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear medio básico')
      return false
    } finally {
      setLoading(false)
    }
  }, [reloadMediosBasicos])

  const updateMedioBasico = useCallback(async (id: string, data: MedioBasicoUpdateData): Promise<boolean> => {
    setLoading(true)
    try {
      await AsignacionService.updateMedioBasico(id, data)
      await reloadMediosBasicos()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar medio básico')
      return false
    } finally {
      setLoading(false)
    }
  }, [reloadMediosBasicos])

  const deleteMedioBasico = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    try {
      await AsignacionService.deleteMedioBasico(id)
      await reloadMediosBasicos()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar medio básico')
      return false
    } finally {
      setLoading(false)
    }
  }, [reloadMediosBasicos])

  // ── Asignaciones ──────────────────────────────────────────────────────────

  const addAsignacion = useCallback(async (ci: string, data: AsignacionCreateData): Promise<boolean> => {
    setLoading(true)
    try {
      await AsignacionService.addAsignacion(ci, data)
      await reloadTrabajadores()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar asignación')
      return false
    } finally {
      setLoading(false)
    }
  }, [reloadTrabajadores])

  const updateAsignacion = useCallback(async (
    ci: string, asignacionId: string, data: AsignacionUpdateData
  ): Promise<boolean> => {
    setLoading(true)
    try {
      await AsignacionService.updateAsignacion(ci, asignacionId, data)
      await reloadTrabajadores()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar asignación')
      return false
    } finally {
      setLoading(false)
    }
  }, [reloadTrabajadores])

  const removeAsignacion = useCallback(async (ci: string, asignacionId: string): Promise<boolean> => {
    setLoading(true)
    try {
      await AsignacionService.removeAsignacion(ci, asignacionId)
      await reloadTrabajadores()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar asignación')
      return false
    } finally {
      setLoading(false)
    }
  }, [reloadTrabajadores])

  // ── Herramientas ──────────────────────────────────────────────────────────

  const addHerramienta = useCallback(async (ci: string, data: HerramientaAsignarData): Promise<boolean> => {
    setLoading(true)
    try {
      await AsignacionService.addHerramienta(ci, data)
      await reloadTrabajadores()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar herramienta')
      return false
    } finally {
      setLoading(false)
    }
  }, [reloadTrabajadores])

  const updateHerramienta = useCallback(async (
    ci: string, herramientaId: string, data: HerramientaUpdateData
  ): Promise<boolean> => {
    setLoading(true)
    try {
      await AsignacionService.updateHerramienta(ci, herramientaId, data)
      await reloadTrabajadores()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar herramienta')
      return false
    } finally {
      setLoading(false)
    }
  }, [reloadTrabajadores])

  const removeHerramienta = useCallback(async (ci: string, herramientaId: string): Promise<boolean> => {
    setLoading(true)
    try {
      await AsignacionService.removeHerramienta(ci, herramientaId)
      await reloadTrabajadores()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar herramienta')
      return false
    } finally {
      setLoading(false)
    }
  }, [reloadTrabajadores])

  // ── Catálogo de herramientas ──────────────────────────────────────────────

  const reloadCatalogoHerramientas = useCallback(async () => {
    try {
      const data = await AsignacionService.getCatalogoHerramientas()
      setCatalogoHerramientas(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al recargar catálogo')
    }
  }, [])

  const createHerramientaCatalogo = useCallback(async (data: HerramientaCatalogoCreateData): Promise<boolean> => {
    setLoading(true)
    try {
      await AsignacionService.createHerramientaCatalogo(data)
      await reloadCatalogoHerramientas()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear herramienta')
      return false
    } finally {
      setLoading(false)
    }
  }, [reloadCatalogoHerramientas])

  const updateHerramientaCatalogo = useCallback(async (id: string, data: HerramientaCatalogoUpdateData): Promise<boolean> => {
    setLoading(true)
    try {
      await AsignacionService.updateHerramientaCatalogo(id, data)
      await reloadCatalogoHerramientas()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar herramienta')
      return false
    } finally {
      setLoading(false)
    }
  }, [reloadCatalogoHerramientas])

  const deleteHerramientaCatalogo = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    try {
      await AsignacionService.deleteHerramientaCatalogo(id)
      await reloadCatalogoHerramientas()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar herramienta')
      return false
    } finally {
      setLoading(false)
    }
  }, [reloadCatalogoHerramientas])

  useEffect(() => { loadAll() }, [loadAll])

  return {
    trabajadores,
    mediosBasicos,
    catalogoHerramientas,
    loading,
    error,
    clearError: () => setError(null),
    createMedioBasico,
    updateMedioBasico,
    deleteMedioBasico,
    addAsignacion,
    updateAsignacion,
    removeAsignacion,
    addHerramienta,
    updateHerramienta,
    removeHerramienta,
    createHerramientaCatalogo,
    updateHerramientaCatalogo,
    deleteHerramientaCatalogo,
    reload: loadAll,
  }
}
