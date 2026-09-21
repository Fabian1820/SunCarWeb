"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { useToast } from "@/hooks/use-toast"
import { SolineraService } from "@/lib/services/feats/solineras/solinera-service"
import type { MetodoPago, Moneda, Solinera } from "@/lib/types/feats/solineras/solinera-types"
import { Seccion } from "./config-comun"
import { HorarioEditor } from "./config-horario-editor"
import { CobroCampos, ReglasCampos } from "./config-reglas-cobro"
import {
  aConfiguracion,
  borradorDesde,
  hayErrores,
  ordenarMetodos,
  ordenarMonedas,
  validarConfiguracion,
  type BorradorConfiguracion,
  type ClaveRegla,
  type FilaHorario,
} from "./config-validacion"

interface Props {
  solinera: Solinera
  editable: boolean
  recargarSolinera: () => Promise<void>
}

/**
 * Horario, reglas y cobro: los tres son una sola configuración en el backend
 * (PUT /configuracion con el objeto completo), así que comparten borrador y un
 * único botón de guardar.
 */
export function ConfigOperacionForm({ solinera, editable, recargarSolinera }: Props) {
  const { toast } = useToast()
  const base = useMemo(() => borradorDesde(solinera.configuracion), [solinera.configuracion])
  const claveBase = useMemo(() => JSON.stringify(base), [base])
  const baseRef = useRef(base)
  baseRef.current = base

  const [borrador, setBorrador] = useState<BorradorConfiguracion>(base)
  const [intentado, setIntentado] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Solo se rehace el borrador cuando cambia la configuración guardada (p. ej. tras guardar):
  // recargar la solinera por un cambio en los puestos no debe borrar lo que se está editando.
  useEffect(() => {
    setBorrador(baseRef.current)
    setIntentado(false)
  }, [claveBase])

  const errores = useMemo(() => validarConfiguracion(borrador), [borrador])
  const hayCambios = JSON.stringify(borrador) !== claveBase

  // Los errores de hora y de casillas se ven al momento; los de números, tras el primer intento de guardar.
  const erroresVisibles = { ...errores, reglas: intentado ? errores.reglas : {} }

  const cambiarDia = (dia: number, cambios: Partial<Omit<FilaHorario, "dia_semana">>) =>
    setBorrador((b) => ({
      ...b,
      horario: b.horario.map((f) => (f.dia_semana === dia ? { ...f, ...cambios } : f)),
    }))

  const copiarLunes = () =>
    setBorrador((b) => {
      const lunes = b.horario[0]
      return {
        ...b,
        horario: b.horario.map((f) =>
          f.dia_semana === 1
            ? f
            : { ...f, activo: lunes.activo, apertura: lunes.apertura, cierre: lunes.cierre },
        ),
      }
    })

  const cambiarRegla = (clave: ClaveRegla, valor: string) =>
    setBorrador((b) => ({ ...b, reglas: { ...b.reglas, [clave]: valor } }))

  const cambiarMetodo = (metodo: MetodoPago, marcado: boolean) =>
    setBorrador((b) => ({
      ...b,
      metodos_pago: ordenarMetodos(
        marcado ? [...b.metodos_pago, metodo] : b.metodos_pago.filter((m) => m !== metodo),
      ),
    }))

  const cambiarMoneda = (moneda: Moneda, marcada: boolean) =>
    setBorrador((b) => ({
      ...b,
      monedas_aceptadas: ordenarMonedas(
        marcada ? [...b.monedas_aceptadas, moneda] : b.monedas_aceptadas.filter((m) => m !== moneda),
      ),
    }))

  const guardar = async () => {
    if (guardando) return
    if (hayErrores(errores)) {
      setIntentado(true)
      toast({
        title: "Revisa la configuración",
        description: "Hay valores que no se pueden guardar. Están marcados en rojo.",
        variant: "destructive",
      })
      return
    }
    setGuardando(true)
    try {
      await SolineraService.guardarConfiguracion(solinera.id, aConfiguracion(borrador))
      toast({ title: "Configuración guardada", description: "Horario, reglas y cobro al día." })
      await recargarSolinera()
    } catch (error) {
      toast({
        title: "No se pudo guardar la configuración",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form
      noValidate
      className="divide-y"
      onSubmit={(e) => {
        e.preventDefault()
        void guardar()
      }}
    >
      <Seccion
        id="config-horario"
        titulo="Horario"
        descripcion="Días y horas en que abre la solinera, en hora de Cuba. Fuera de este horario no se ofrecen reservas."
        acciones={
          editable ? (
            <Button type="button" variant="outline" onClick={copiarLunes}>
              Copiar el lunes al resto
            </Button>
          ) : undefined
        }
      >
        <HorarioEditor
          filas={borrador.horario}
          errores={erroresVisibles.horario}
          editable={editable}
          onCambiar={cambiarDia}
        />
      </Seccion>

      <Seccion
        id="config-reglas"
        titulo="Reglas"
        descripcion="Tiempos que aplica el panel a las cargas y a las reservas."
      >
        <ReglasCampos
          valores={borrador.reglas}
          errores={erroresVisibles.reglas}
          editable={editable}
          onCambiar={cambiarRegla}
        />
      </Seccion>

      <Seccion
        id="config-cobro"
        titulo="Cobro"
        descripcion="Lo que el operador puede elegir al registrar un pago."
      >
        <CobroCampos
          metodos={borrador.metodos_pago}
          monedas={borrador.monedas_aceptadas}
          errores={erroresVisibles}
          editable={editable}
          onMetodo={cambiarMetodo}
          onMoneda={cambiarMoneda}
        />
      </Seccion>

      {editable && (
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-card px-4 py-3 sm:px-6">
          <p role="status" className="text-sm text-muted-foreground">
            {hayCambios
              ? "Hay cambios sin guardar en horario, reglas o cobro."
              : "Horario, reglas y cobro están al día."}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setBorrador(base)
                setIntentado(false)
              }}
              disabled={!hayCambios || guardando}
            >
              Descartar
            </Button>
            <Button type="submit" disabled={!hayCambios || guardando}>
              {guardando && <Loader2 className="animate-spin" />}
              Guardar configuración
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}
