"use client"

import { useState, useEffect, useCallback } from 'react'
import { AsignacionService } from '@/lib/api-services'
import type {
  MedioBasico,
  MedioBasicoCreateData,
  MedioBasicoUpdateData,
  TrabajadorConAsignaciones,
  AsignacionCreateData,
  AsignacionUpdateData,
  TipoInstalacion,
  Instalacion,
  InstalacionConAsignaciones,
  AsignacionInstalacionCreateData,
  AsignacionInstalacionUpdateData,
  MaterialCatalogo,
  HerramientaCatalogo,
  HerramientaAsignarData,
  HerramientaUpdateData,
  HerramientaCatalogoCreateData,
  HerramientaCatalogoUpdateData,
} from '@/lib/types/feats/asignaciones/asignacion-types'

export function useAsignaciones() {
  const [trabajadores, setTrabajadores] = useState<TrabajadorConAsignaciones[]>([])
  const [mediosBasicos, setMediosBasicos] = useState<MedioBasico[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [trabData, mediosData] = await Promise.all([
        AsignacionService.getTrabajadoresConAsignaciones(),
        AsignacionService.getMediosBasicos(),
      ])
      setTrabajadores(trabData)
      setMediosBasicos(mediosData)
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

  // ── Asignaciones trabajadores ─────────────────────────────────────────────

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

  // ── Herramientas (legacy) ─────────────────────────────────────────────────

  const [catalogoHerramientas, setCatalogoHerramientas] = useState<HerramientaCatalogo[]>([])

  const reloadCatalogoHerramientas = useCallback(async () => {
    try {
      const data = await AsignacionService.getCatalogoHerramientas()
      setCatalogoHerramientas(data)
    } catch {
      // silently ignore legacy endpoint errors
    }
  }, [])

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

  const createHerramientaCatalogo = useCallback(async (data: HerramientaCatalogoCreateData): Promise<boolean> => {
    setLoading(true)
    try {
      await AsignacionService.createHerramientaCatalogo(data)
      await reloadCatalogoHerramientas()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear material')
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
      setError(err instanceof Error ? err.message : 'Error al actualizar material')
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
      setError(err instanceof Error ? err.message : 'Error al eliminar material')
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

// ── Hook para asignaciones de instalaciones ───────────────────────────────────

export function useInstalacionAsignaciones(tipo: TipoInstalacion | null) {
  const [instalaciones, setInstalaciones] = useState<InstalacionConAsignaciones[]>([])
  const [entidades, setEntidades] = useState<Instalacion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadEntidades = useCallback(async (t: TipoInstalacion) => {
    try {
      let data: Instalacion[] = []
      if (t === 'almacen') data = await AsignacionService.getAlmacenes()
      else if (t === 'tienda') data = await AsignacionService.getTiendas()
      else if (t === 'sede') data = await AsignacionService.getSedes()
      setEntidades(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar entidades')
    }
  }, [])

  const loadInstalaciones = useCallback(async (t: TipoInstalacion) => {
    setLoading(true)
    setError(null)
    try {
      const data = await AsignacionService.getAsignacionesInstalaciones(t)
      setInstalaciones(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar asignaciones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!tipo) {
      setInstalaciones([])
      setEntidades([])
      return
    }
    loadEntidades(tipo)
    loadInstalaciones(tipo)
  }, [tipo, loadEntidades, loadInstalaciones])

  const addAsignacion = useCallback(async (
    id: string, data: AsignacionInstalacionCreateData
  ): Promise<boolean> => {
    if (!tipo) return false
    setLoading(true)
    try {
      await AsignacionService.addAsignacionInstalacion(tipo, id, data)
      await loadInstalaciones(tipo)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar asignación')
      return false
    } finally {
      setLoading(false)
    }
  }, [tipo, loadInstalaciones])

  const updateAsignacion = useCallback(async (
    id: string, asignacionId: string, data: AsignacionInstalacionUpdateData
  ): Promise<boolean> => {
    if (!tipo) return false
    setLoading(true)
    try {
      await AsignacionService.updateAsignacionInstalacion(tipo, id, asignacionId, data)
      await loadInstalaciones(tipo)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar asignación')
      return false
    } finally {
      setLoading(false)
    }
  }, [tipo, loadInstalaciones])

  const removeAsignacion = useCallback(async (
    id: string, asignacionId: string
  ): Promise<boolean> => {
    if (!tipo) return false
    setLoading(true)
    try {
      await AsignacionService.removeAsignacionInstalacion(tipo, id, asignacionId)
      await loadInstalaciones(tipo)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar asignación')
      return false
    } finally {
      setLoading(false)
    }
  }, [tipo, loadInstalaciones])

  return {
    instalaciones,
    entidades,
    loading,
    error,
    clearError: () => setError(null),
    addAsignacion,
    updateAsignacion,
    removeAsignacion,
    reload: () => tipo && loadInstalaciones(tipo),
  }
}

// ── Hook para asignaciones de TODAS las instalaciones (las 3 secciones) ──────

export interface InstalacionesAgrupadas {
  almacen: InstalacionConAsignaciones[]
  tienda: InstalacionConAsignaciones[]
  sede: InstalacionConAsignaciones[]
}

export function useAllInstalacionesAsignaciones() {
  const [data, setData] = useState<InstalacionesAgrupadas>({ almacen: [], tienda: [], sede: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [almacenes, tiendas, sedes] = await Promise.all([
        AsignacionService.getAsignacionesInstalaciones('almacen'),
        AsignacionService.getAsignacionesInstalaciones('tienda'),
        AsignacionService.getAsignacionesInstalaciones('sede'),
      ])
      setData({ almacen: almacenes, tienda: tiendas, sede: sedes })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar instalaciones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  const addAsignacion = useCallback(async (
    tipo: TipoInstalacion, id: string, data: AsignacionInstalacionCreateData
  ): Promise<boolean> => {
    try {
      await AsignacionService.addAsignacionInstalacion(tipo, id, data)
      await reload()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar asignación')
      return false
    }
  }, [reload])

  const updateAsignacion = useCallback(async (
    tipo: TipoInstalacion, id: string, asignacionId: string, data: AsignacionInstalacionUpdateData
  ): Promise<boolean> => {
    try {
      await AsignacionService.updateAsignacionInstalacion(tipo, id, asignacionId, data)
      await reload()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar asignación')
      return false
    }
  }, [reload])

  const removeAsignacion = useCallback(async (
    tipo: TipoInstalacion, id: string, asignacionId: string
  ): Promise<boolean> => {
    try {
      await AsignacionService.removeAsignacionInstalacion(tipo, id, asignacionId)
      await reload()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar asignación')
      return false
    }
  }, [reload])

  return {
    data,
    loading,
    error,
    clearError: () => setError(null),
    reload,
    addAsignacion,
    updateAsignacion,
    removeAsignacion,
  }
}

// ── Hook para búsqueda de materiales ─────────────────────────────────────────

export function useMaterialesCatalogo() {
  const [materiales, setMateriales] = useState<MaterialCatalogo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buscar = useCallback(async (q: string, categoria?: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await AsignacionService.getMaterialesCatalogo(q || undefined, categoria || undefined)
      setMateriales(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar materiales')
    } finally {
      setLoading(false)
    }
  }, [])

  return { materiales, loading, error, buscar }
}
