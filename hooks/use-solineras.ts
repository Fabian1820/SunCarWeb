"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { SolineraService } from "@/lib/services/feats/solineras/solinera-service"
import type {
  PanelSolinera,
  Solinera,
  Tarifa,
  Turno,
} from "@/lib/types/feats/solineras/solinera-types"

interface OpcionesCarga {
  /** Vuelve a pedir los datos cada tantos ms mientras la pestaña esté visible. */
  intervaloMs?: number
  /** false = no pide nada (p. ej. mientras falta un identificador). */
  activo?: boolean
}

export interface EstadoCarga<T> {
  data: T | undefined
  /** true solo en la primera carga: los refrescos en segundo plano no parpadean. */
  loading: boolean
  /** true mientras se refresca con datos ya en pantalla. */
  refrescando: boolean
  error: string | null
  recargar: () => Promise<void>
  setData: (valor: T | undefined) => void
}

/**
 * Carga un dato del backend y lo mantiene al día. Sirve a todas las pestañas de
 * una solinera.
 *
 * - Descarta respuestas viejas: si cambian las dependencias mientras hay una
 *   petición en vuelo, la respuesta que llega tarde no pisa a la nueva.
 * - Con `intervaloMs`, refresca solo con la pestaña visible y no lanza una
 *   petición nueva si la anterior no ha vuelto (una conexión lenta no acumula cola).
 * - Al volver a la pestaña refresca enseguida: el operador que cambia de ventana
 *   para mirar el móvil no ve datos de hace un minuto.
 */
export function useCarga<T>(
  cargador: () => Promise<T>,
  dependencias: readonly unknown[],
  { intervaloMs, activo = true }: OpcionesCarga = {},
): EstadoCarga<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(activo)
  const [refrescando, setRefrescando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const generacion = useRef(0)
  const enVuelo = useRef(false)
  const cargadorRef = useRef(cargador)
  cargadorRef.current = cargador

  const ejecutar = useCallback(async (primera: boolean) => {
    if (enVuelo.current && !primera) return
    const esta = ++generacion.current
    enVuelo.current = true
    if (primera) setLoading(true)
    else setRefrescando(true)
    try {
      const resultado = await cargadorRef.current()
      if (esta !== generacion.current) return
      setData(resultado)
      setError(null)
    } catch (err) {
      if (esta !== generacion.current) return
      setError(err instanceof Error ? err.message : "No se pudo cargar")
    } finally {
      if (esta === generacion.current) {
        enVuelo.current = false
        setLoading(false)
        setRefrescando(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Carga inicial y recarga completa al cambiar las dependencias.
  useEffect(() => {
    if (!activo) {
      setLoading(false)
      return
    }
    setData(undefined)
    void ejecutar(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, ...dependencias])

  useEffect(() => {
    if (!activo || !intervaloMs) return
    const refrescar = () => {
      if (document.visibilityState === "visible") void ejecutar(false)
    }
    const temporizador = setInterval(refrescar, intervaloMs)
    document.addEventListener("visibilitychange", refrescar)
    return () => {
      clearInterval(temporizador)
      document.removeEventListener("visibilitychange", refrescar)
    }
  }, [activo, intervaloMs, ejecutar])

  const recargar = useCallback(() => ejecutar(false), [ejecutar])

  return { data, loading, refrescando, error, recargar, setData }
}

/** Listado de solineras con su resumen (puestos, vehículos en puesto, turno abierto). */
export function useSolineras() {
  return useCarga<Solinera[]>(() => SolineraService.listar(), [], { intervaloMs: 30_000 })
}

/** Detalle de una solinera: datos, configuración y puestos. */
export function useSolinera(solineraId: string) {
  return useCarga<Solinera>(() => SolineraService.obtener(solineraId), [solineraId])
}

/** El panel en vivo: se refresca solo cada 15 s. */
export function usePanelSolinera(solineraId: string) {
  return useCarga<PanelSolinera>(() => SolineraService.panel(solineraId), [solineraId], {
    intervaloMs: 15_000,
  })
}

export function useTarifas(solineraId: string) {
  return useCarga<Tarifa[]>(() => SolineraService.listarTarifas(solineraId), [solineraId])
}

/** El turno abierto, o null si no hay ninguno. */
export function useTurnoActual(solineraId: string) {
  return useCarga<Turno | null>(() => SolineraService.turnoActual(solineraId), [solineraId])
}

/**
 * Qué puede hacer la persona en Solineras. El backend comprueba lo mismo: esto
 * solo decide qué botones se enseñan.
 *
 * Los permisos aditivos se miran exactos: tener `solineras` no concede
 * `solineras/red` ni los demás.
 */
export function usePermisosSolineras() {
  const { hasExactPermission } = useAuth()
  return useMemo(
    () => ({
      puedeAdministrarRed: hasExactPermission("solineras/red"),
      puedeValidarComprobantes: hasExactPermission("solineras/comprobantes"),
      puedeAnular: hasExactPermission("solineras/anular"),
    }),
    [hasExactPermission],
  )
}
