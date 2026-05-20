import { useCallback, useState } from "react"
import { PermisosService } from "@/lib/api-services"
import type { Modulo } from "@/lib/types/feats/permisos/permisos-types"
import {
  MODULOS_CATALOGO,
  esModuloDinamico,
  getNombresCatalogo,
} from "@/lib/modulos-catalogo"

export type ModulosSyncState = {
  bdModulos: Modulo[]
  /** Nombres del catálogo que no existen en BD (faltantes). */
  faltantes: string[]
  /** Módulos en BD que no figuran en el catálogo y no son dinámicos (huérfanos). */
  huerfanos: Modulo[]
  loading: boolean
  syncing: boolean
  /** ISO timestamp del último cargar exitoso. */
  ultimoCarga: string | null
}

export function useModulosSync() {
  const [state, setState] = useState<ModulosSyncState>({
    bdModulos: [],
    faltantes: [],
    huerfanos: [],
    loading: false,
    syncing: false,
    ultimoCarga: null,
  })

  /** Lee BD y computa qué falta crear / qué hay de más. */
  const cargar = useCallback(async (): Promise<{
    faltantes: string[]
    huerfanos: Modulo[]
    bdModulos: Modulo[]
  }> => {
    setState((s) => ({ ...s, loading: true }))
    try {
      const bdModulos = await PermisosService.getAllModulos()
      const nombresEnBd = new Set(bdModulos.map((m) => m.nombre))
      const nombresCatalogo = getNombresCatalogo()

      const faltantes = nombresCatalogo.filter((n) => !nombresEnBd.has(n))
      const nombresCatalogoSet = new Set(nombresCatalogo)
      const huerfanos = bdModulos.filter(
        (m) => !nombresCatalogoSet.has(m.nombre) && !esModuloDinamico(m.nombre),
      )

      setState({
        bdModulos,
        faltantes,
        huerfanos,
        loading: false,
        syncing: false,
        ultimoCarga: new Date().toISOString(),
      })

      return { faltantes, huerfanos, bdModulos }
    } catch (error) {
      console.error("Error cargando módulos BD:", error)
      setState((s) => ({ ...s, loading: false }))
      throw error
    }
  }, [])

  /** Crea en BD todos los módulos del catálogo que falten. */
  const sincronizarFaltantes = useCallback(async (): Promise<number> => {
    setState((s) => ({ ...s, syncing: true }))
    try {
      const { faltantes } = await cargar()
      if (faltantes.length === 0) {
        setState((s) => ({ ...s, syncing: false }))
        return 0
      }

      let creados = 0
      for (const nombre of faltantes) {
        try {
          await PermisosService.createModulo({ nombre })
          creados++
        } catch (error) {
          console.warn(`No se pudo crear módulo '${nombre}':`, error)
        }
      }

      await cargar()
      setState((s) => ({ ...s, syncing: false }))
      return creados
    } catch (error) {
      setState((s) => ({ ...s, syncing: false }))
      throw error
    }
  }, [cargar])

  /** Elimina de BD un módulo huérfano por id. */
  const eliminarHuerfano = useCallback(
    async (moduloId: string): Promise<void> => {
      await PermisosService.deleteModulo(moduloId)
      await cargar()
    },
    [cargar],
  )

  /** Mapa rápido nombre→id útil para asignación de permisos. */
  const nombreToId = useCallback((): Map<string, string> => {
    const map = new Map<string, string>()
    for (const m of state.bdModulos) {
      map.set(m.nombre, m.id)
    }
    return map
  }, [state.bdModulos])

  return {
    ...state,
    cargar,
    sincronizarFaltantes,
    eliminarHuerfano,
    nombreToId,
    catalogo: MODULOS_CATALOGO,
  }
}
