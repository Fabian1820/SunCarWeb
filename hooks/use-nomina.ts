import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { NominaService } from "@/lib/services/feats/nomina/nomina-service"
import type {
  CambiosLinea,
  HojaNomina,
  PeriodoNominaResumen,
  TipoPlantilla,
} from "@/lib/types/feats/nomina/nomina-types"

/**
 * Nómina de un mes. Cada edición manda un PATCH y el backend devuelve la hoja
 * recalculada. Las ediciones van en cola: si dos celdas se guardan seguidas, la
 * respuesta de la primera no puede pisar a la de la segunda.
 */
export function useNomina(anio: number, mes: number) {
  const [hoja, setHoja] = useState<HojaNomina | null>(null)
  const [periodos, setPeriodos] = useState<PeriodoNominaResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const cola = useRef<Promise<unknown>>(Promise.resolve())
  // Descarta respuestas de un mes que ya no es el que se está viendo.
  const mesActual = useRef(`${anio}-${mes}`)
  mesActual.current = `${anio}-${mes}`

  const cargar = useCallback(async () => {
    const clave = `${anio}-${mes}`
    setLoading(true)
    setError(null)
    try {
      const lista = await NominaService.listarPeriodos()
      if (mesActual.current !== clave) return
      setPeriodos(lista)
      const existe = lista.some((p) => p.anio === anio && p.mes === mes)
      setHoja(existe ? await NominaService.obtener(anio, mes) : null)
    } catch (err: any) {
      if (mesActual.current === clave) setError(err.message || "No se pudo cargar la nómina")
    } finally {
      if (mesActual.current === clave) setLoading(false)
    }
  }, [anio, mes])

  useEffect(() => {
    setHoja(null)
    cargar()
  }, [cargar])

  const ejecutar = useCallback(
    (accion: () => Promise<HojaNomina>, mensajeOk?: string) => {
      const clave = `${anio}-${mes}`
      setGuardando((n) => n + 1)
      const tarea = cola.current.then(async () => {
        try {
          const nueva = await accion()
          if (mesActual.current === clave) setHoja(nueva)
          if (mensajeOk) toast.success(mensajeOk)
          return true
        } catch (err: any) {
          toast.error(err.message || "No se pudo guardar")
          // Recupera lo que hay en el servidor para no dejar la pantalla mentirosa.
          try {
            const actual = await NominaService.obtener(anio, mes)
            if (mesActual.current === clave) setHoja(actual)
          } catch {
            /* se queda con lo que había */
          }
          return false
        } finally {
          setGuardando((n) => n - 1)
        }
      })
      cola.current = tarea
      return tarea as Promise<boolean>
    },
    [anio, mes],
  )

  const abrir = useCallback(async () => {
    const ok = await ejecutar(() => NominaService.abrir(anio, mes))
    if (ok) setPeriodos(await NominaService.listarPeriodos())
    return ok
  }, [anio, mes, ejecutar])

  const editarLinea = useCallback(
    (ci: string, cambios: CambiosLinea) =>
      ejecutar(() => NominaService.editarLinea(anio, mes, ci, cambios)),
    [anio, mes, ejecutar],
  )

  const crearReparto = useCallback(
    (etiqueta: string, montoUsd = 0) =>
      ejecutar(() => NominaService.crearReparto(anio, mes, etiqueta, montoUsd)),
    [anio, mes, ejecutar],
  )

  const crearPlantilla = useCallback(
    (tipo: TipoPlantilla) => ejecutar(() => NominaService.crearPlantilla(anio, mes, tipo)),
    [anio, mes, ejecutar],
  )

  const editarReparto = useCallback(
    (repartoId: string, cambios: { etiqueta?: string; monto_usd?: number }) =>
      ejecutar(() => NominaService.editarReparto(anio, mes, repartoId, cambios)),
    [anio, mes, ejecutar],
  )

  const borrarReparto = useCallback(
    (repartoId: string) => ejecutar(() => NominaService.borrarReparto(anio, mes, repartoId)),
    [anio, mes, ejecutar],
  )

  const agregarMiembros = useCallback(
    (repartoId: string, cis: string[]) =>
      ejecutar(() => NominaService.agregarMiembros(anio, mes, repartoId, cis)),
    [anio, mes, ejecutar],
  )

  const editarMiembro = useCallback(
    (repartoId: string, ci: string, porcentaje: number) =>
      ejecutar(() => NominaService.editarMiembro(anio, mes, repartoId, ci, porcentaje)),
    [anio, mes, ejecutar],
  )

  const quitarMiembro = useCallback(
    (repartoId: string, ci: string) =>
      ejecutar(() => NominaService.quitarMiembro(anio, mes, repartoId, ci)),
    [anio, mes, ejecutar],
  )

  const cerrar = useCallback(
    () => ejecutar(() => NominaService.cerrar(anio, mes), "Mes cerrado"),
    [anio, mes, ejecutar],
  )

  const reabrir = useCallback(
    () => ejecutar(() => NominaService.reabrir(anio, mes), "Mes reabierto"),
    [anio, mes, ejecutar],
  )

  return {
    hoja,
    periodos,
    loading,
    guardando: guardando > 0,
    error,
    recargar: cargar,
    abrir,
    editarLinea,
    crearReparto,
    crearPlantilla,
    editarReparto,
    borrarReparto,
    agregarMiembros,
    editarMiembro,
    quitarMiembro,
    cerrar,
    reabrir,
  }
}
