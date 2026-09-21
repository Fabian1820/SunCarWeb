"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CalendarOff, Info } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { Input } from "@/components/shared/molecule/input"
import { Skeleton } from "@/components/shared/molecule/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { CancelarReservaDialog } from "@/components/feats/solineras/cancelar-reserva-dialog"
import { ReservaDialog, type FranjaElegida } from "@/components/feats/solineras/reserva-dialog"
import { useCarga } from "@/hooks/use-solineras"
import { SolineraService } from "@/lib/services/feats/solineras/solinera-service"
import {
  ETIQUETA_ESTADO_RESERVA,
  TIPOS_VEHICULO,
  ZONA_CUBA,
  describirVehiculo,
  etiquetaEstadoSolinera,
  etiquetaVehiculo,
  fechaCuba,
  formatearDuracion,
  formatearHora,
} from "@/lib/utils/solineras"
import { cn } from "@/lib/utils"
import type {
  ConfiguracionSolinera,
  DisponibilidadDia,
  EstadoReserva,
  ReservaSolinera,
  SlotDisponibilidad,
  TipoVehiculo,
} from "@/lib/types/feats/solineras/solinera-types"
import type { TabSolineraProps } from "./tab-props"

const DURACIONES_RAPIDAS = [30, 60, 90, 120, 180]
const MS_DIA = 86_400_000
/** Igual que el backend: una franja que empezó hace menos de 2 min todavía se puede tomar. */
const TOLERANCIA_PASADO_MS = 2 * 60_000

const COLOR_ESTADO_RESERVA: Record<EstadoReserva, string> = {
  confirmada: "bg-emerald-100 text-emerald-800",
  presentada: "bg-sky-100 text-sky-800",
  no_presentada: "bg-amber-100 text-amber-800",
  cancelada: "bg-slate-200 text-slate-700",
}

/** "lunes, 21 de septiembre" a partir de "2026-09-21". Se ancla al mediodía UTC para que la zona no cambie el día. */
function fechaLarga(fecha: string): string {
  return new Intl.DateTimeFormat("es-CU", {
    timeZone: ZONA_CUBA,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${fecha}T12:00:00Z`))
}

/** Minutos enteros escritos por la persona; null si está vacío o no es un entero. */
function leerMinutos(texto: string): number | null {
  const limpio = texto.trim()
  return /^\d+$/.test(limpio) ? Number(limpio) : null
}

/** Devuelve el valor tras `ms` sin cambios: evita pedir una disponibilidad por cada tecla. */
function useRetrasado<T>(valor: T, ms: number): T {
  const [retrasado, setRetrasado] = useState(valor)
  useEffect(() => {
    const temporizador = setTimeout(() => setRetrasado(valor), ms)
    return () => clearTimeout(temporizador)
  }, [valor, ms])
  return retrasado
}

type MotivoNoDisponible = "Ya pasó" | "Completo" | "Fuera de plazo" | "No opera"

function motivoNoDisponible(
  slot: SlotDisponibilidad,
  ahora: number,
  anticipacionMaxDias: number,
  operativa: boolean,
): MotivoNoDisponible | null {
  const inicio = Date.parse(slot.inicio)
  if (inicio < ahora - TOLERANCIA_PASADO_MS) return "Ya pasó"
  if (inicio > ahora + anticipacionMaxDias * MS_DIA) return "Fuera de plazo"
  if (!slot.disponible) return "Completo"
  if (!operativa) return "No opera"
  return null
}

export function ReservasTab({ solinera }: TabSolineraProps) {
  if (!solinera.configuracion) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Esta solinera todavía no tiene configuración (horario y tiempos de carga), así que no se pueden tomar
        reservas. Se define en la pestaña Configuración.
      </div>
    )
  }
  return (
    <ReservasContenido
      solineraId={solinera.id}
      operativa={solinera.estado === "operativa"}
      estadoTexto={etiquetaEstadoSolinera(solinera.estado).toLowerCase()}
      configuracion={solinera.configuracion}
    />
  )
}

interface ContenidoProps {
  solineraId: string
  operativa: boolean
  estadoTexto: string
  configuracion: ConfiguracionSolinera
}

function ReservasContenido({ solineraId, operativa, estadoTexto, configuracion }: ContenidoProps) {
  const minimo = configuracion.duracion_minima_min
  const maximo = configuracion.tiempo_maximo_min
  const rapidas = DURACIONES_RAPIDAS.filter((d) => d >= minimo && d <= maximo)

  const hoy = fechaCuba()
  const fechaMaxima = fechaCuba(configuracion.reserva_anticipacion_max_dias)

  const [fecha, setFecha] = useState(hoy)
  const [tipo, setTipo] = useState<TipoVehiculo>("moto")
  const [rapida, setRapida] = useState<number | null>(() => (rapidas.includes(60) ? 60 : (rapidas[0] ?? null)))
  const [otraTexto, setOtraTexto] = useState(() => (rapidas.length === 0 ? String(minimo) : ""))
  const [franja, setFranja] = useState<FranjaElegida | null>(null)
  const [reservaACancelar, setReservaACancelar] = useState<ReservaSolinera | null>(null)

  // --- Validación de los controles: solo se pide disponibilidad con valores válidos ---
  const duracion = rapida ?? leerMinutos(otraTexto)
  const errorFecha = !fecha
    ? "Elige una fecha."
    : fecha < hoy
      ? "Esa fecha ya pasó."
      : fecha > fechaMaxima
        ? `Solo se reserva con hasta ${configuracion.reserva_anticipacion_max_dias} días de anticipación.`
        : null
  const errorDuracion =
    rapida !== null
      ? null
      : otraTexto.trim() === ""
        ? "Elige o escribe una duración."
        : duracion === null
          ? "Escribe los minutos en número entero."
          : duracion < minimo
            ? `El tiempo mínimo de una carga es ${formatearDuracion(minimo)}.`
            : duracion > maximo
              ? `El tiempo máximo de una carga es ${formatearDuracion(maximo)}.`
              : null

  const duracionValida = errorDuracion === null ? duracion : null
  const duracionConsulta = useRetrasado(duracionValida, rapida !== null ? 0 : 450)
  const consultaActiva = errorFecha === null && duracionConsulta !== null

  const disponibilidad = useCarga(
    () => SolineraService.disponibilidad(solineraId, fecha, duracionConsulta ?? minimo, tipo),
    [solineraId, fecha, duracionConsulta, tipo],
    { intervaloMs: 60_000, activo: consultaActiva },
  )
  const reservas = useCarga(
    () => SolineraService.listarReservas(solineraId, { fecha }),
    [solineraId, fecha],
    { intervaloMs: 30_000, activo: errorFecha === null },
  )

  const refrescarTodo = () => {
    void disponibilidad.recargar()
    void reservas.recargar()
  }

  const dia = disponibilidad.data
  const reservasDelDia: ReservaSolinera[] = [...(reservas.data ?? [])].sort(
    (a, b) => Date.parse(a.inicio) - Date.parse(b.inicio),
  )

  return (
    <div className="grid gap-4">
      {!operativa && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          La solinera está {estadoTexto}: no admite reservas nuevas. Las que ya existen se pueden consultar y
          cancelar.
        </p>
      )}

      {/* --- Disponibilidad ------------------------------------------------- */}
      <section aria-labelledby="reservas-disponibilidad" className="grid gap-4 rounded-lg border bg-card p-4 sm:p-5">
        <h2 id="reservas-disponibilidad" className="text-base font-semibold">
          Horas disponibles
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[12rem_16rem_1fr]">
          <div className="grid content-start gap-1.5">
            <Label htmlFor="reserva-fecha">Fecha</Label>
            <Input
              id="reserva-fecha"
              type="date"
              value={fecha}
              min={hoy}
              max={fechaMaxima}
              onChange={(e) => setFecha(e.target.value)}
              className="h-11 tabular-nums"
              aria-invalid={errorFecha !== null}
              aria-describedby={errorFecha ? "reserva-fecha-error" : undefined}
            />
            {errorFecha && (
              <p id="reserva-fecha-error" className="text-xs text-destructive">
                {errorFecha}
              </p>
            )}
          </div>

          <div className="grid content-start gap-1.5">
            <Label htmlFor="reserva-tipo">Tipo de vehículo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoVehiculo)}>
              <SelectTrigger id="reserva-tipo" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_VEHICULO.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid content-start gap-1.5 sm:col-span-2 lg:col-span-1">
            <Label id="reserva-duracion-etiqueta">Duración de la carga</Label>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-labelledby="reserva-duracion-etiqueta">
              {rapidas.map((d) => {
                const activa = rapida === d
                return (
                  <Button
                    key={d}
                    type="button"
                    variant={activa ? "default" : "outline"}
                    className="h-11 min-w-[4.5rem] px-3 tabular-nums"
                    aria-pressed={activa}
                    onClick={() => {
                      setRapida(d)
                      setOtraTexto("")
                    }}
                  >
                    {formatearDuracion(d)}
                  </Button>
                )
              })}
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={minimo}
                  max={maximo}
                  step={1}
                  value={otraTexto}
                  onChange={(e) => {
                    setRapida(null)
                    setOtraTexto(e.target.value)
                  }}
                  placeholder="Otra"
                  aria-label="Otra duración, en minutos"
                  aria-invalid={errorDuracion !== null}
                  aria-describedby={errorDuracion ? "reserva-duracion-error" : undefined}
                  className={cn("h-11 w-24 tabular-nums", rapida === null && "border-primary")}
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
            </div>
            {errorDuracion && (
              <p id="reserva-duracion-error" className="text-xs text-destructive">
                {errorDuracion}
              </p>
            )}
          </div>
        </div>

        <ZonaFranjas
          consultaActiva={consultaActiva}
          errorControles={errorFecha ?? errorDuracion}
          loading={disponibilidad.loading}
          error={disponibilidad.error}
          reintentar={() => void disponibilidad.recargar()}
          dia={dia}
          operativa={operativa}
          anticipacionMaxDias={configuracion.reserva_anticipacion_max_dias}
          onElegir={(slot, consultado) =>
            setFranja({
              slot,
              fechaTexto: fechaLarga(consultado.fecha),
              duracionMin: consultado.duracion_min,
              tipoVehiculo: consultado.tipo_vehiculo,
            })
          }
        />
      </section>

      {/* --- Reservas del día ---------------------------------------------- */}
      <section aria-labelledby="reservas-dia" className="rounded-lg border bg-card p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="reservas-dia" className="text-base font-semibold">
            Reservas {errorFecha ? "del día" : `del ${fechaLarga(fecha)}`}
          </h2>
          {reservas.data && reservas.data.length > 0 && (
            <span className="text-sm tabular-nums text-muted-foreground">{reservas.data.length}</span>
          )}
        </div>

        <div className="mt-2">
          {errorFecha ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Elige una fecha válida para ver sus reservas.</p>
          ) : reservas.loading ? (
            <div className="grid gap-3 py-2" aria-busy="true">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : reservas.error && !reservas.data ? (
            <BloqueError mensaje={reservas.error} onReintentar={() => void reservas.recargar()} />
          ) : reservasDelDia.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No hay reservas para este día</p>
          ) : (
            <ul className="divide-y">
              {reservasDelDia.map((r) => (
                <FilaReserva key={r.id} reserva={r} onCancelar={() => setReservaACancelar(r)} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <ReservaDialog
        open={franja !== null}
        onOpenChange={(abierto) => !abierto && setFranja(null)}
        solineraId={solineraId}
        franja={franja}
        graciaMin={configuracion.gracia_reserva_min}
        onCreada={refrescarTodo}
        onError={() => void disponibilidad.recargar()}
      />
      <CancelarReservaDialog
        open={reservaACancelar !== null}
        onOpenChange={(abierto) => !abierto && setReservaACancelar(null)}
        solineraId={solineraId}
        reserva={reservaACancelar}
        onCancelada={refrescarTodo}
      />
    </div>
  )
}

// --- Rejilla de franjas -------------------------------------------------------

interface ZonaFranjasProps {
  consultaActiva: boolean
  errorControles: string | null
  loading: boolean
  error: string | null
  reintentar: () => void
  dia: DisponibilidadDia | undefined
  operativa: boolean
  anticipacionMaxDias: number
  /** Se entrega también la consulta que originó la rejilla, no lo que hay ahora en los controles. */
  onElegir: (slot: SlotDisponibilidad, consultado: DisponibilidadDia) => void
}

function ZonaFranjas({
  consultaActiva,
  errorControles,
  loading,
  error,
  reintentar,
  dia,
  operativa,
  anticipacionMaxDias,
  onElegir,
}: ZonaFranjasProps) {
  if (errorControles) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        Corrige los datos de arriba para ver las horas libres.
      </p>
    )
  }
  // Sin consulta activa todavía = se está esperando a que la persona termine de escribir la duración.
  if (loading || !consultaActiva) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" aria-busy="true">
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="h-[4.5rem]" />
        ))}
      </div>
    )
  }
  if (error && !dia) return <BloqueError mensaje={error} onReintentar={reintentar} />
  if (!dia) return null

  if (!dia.laborable) {
    return (
      <p className="flex items-start gap-2 rounded-lg border bg-muted/40 p-4 text-sm">
        <CalendarOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <span>
          La solinera no abre el {fechaLarga(dia.fecha)}. Elige otra fecha.
        </span>
      </p>
    )
  }

  if (dia.slots.length === 0) {
    return (
      <p className="flex items-start gap-2 rounded-lg border bg-muted/40 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <span>
          Una carga de {formatearDuracion(dia.duracion_min)} no cabe en el horario de ese día ({dia.apertura} a{" "}
          {dia.cierre}). Prueba con una duración menor.
        </span>
      </p>
    )
  }

  const ahora = Date.now()
  const sinPuestos = dia.puestos_elegibles === 0
  const hayLibres = dia.slots.some((s) => motivoNoDisponible(s, ahora, anticipacionMaxDias, operativa) === null)

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        Abre de <span className="tabular-nums">{dia.apertura}</span> a{" "}
        <span className="tabular-nums">{dia.cierre}</span>
        {typeof dia.puestos_elegibles === "number" && (
          <>
            {" · "}
            {sinPuestos
              ? `ningún puesto admite ${etiquetaVehiculo(dia.tipo_vehiculo).toLowerCase()}`
              : `${dia.puestos_elegibles} ${dia.puestos_elegibles === 1 ? "puesto admite" : "puestos admiten"} ${etiquetaVehiculo(dia.tipo_vehiculo).toLowerCase()}`}
          </>
        )}
        {" · cargas de "}
        {formatearDuracion(dia.duracion_min)}
      </p>

      {!hayLibres && (
        <p className="text-sm text-amber-800">
          {sinPuestos
            ? "Ningún puesto de esta solinera admite ese tipo de vehículo."
            : "No queda ninguna franja libre con esta duración. Prueba otra fecha o una duración menor."}
        </p>
      )}

      <div
        role="group"
        aria-label="Franjas horarias"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
      >
        {dia.slots.map((slot) => {
          const motivo = motivoNoDisponible(slot, ahora, anticipacionMaxDias, operativa)
          const libre = motivo === null
          return (
            <button
              key={slot.inicio}
              type="button"
              disabled={!libre}
              onClick={() => onElegir(slot, dia)}
              aria-label={
                libre
                  ? `Reservar ${slot.hora_inicio} hasta ${slot.hora_fin}, ${slot.libres} ${slot.libres === 1 ? "puesto libre" : "puestos libres"}`
                  : `${slot.hora_inicio}, no disponible: ${motivo.toLowerCase()}`
              }
              className={cn(
                "flex min-h-[4.5rem] flex-col items-start justify-center rounded-lg border px-3 py-2 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                libre
                  ? "border-primary/30 bg-background hover:border-primary hover:bg-primary/5 active:bg-primary/10"
                  : "cursor-not-allowed border-transparent bg-muted text-muted-foreground",
              )}
            >
              <span className={cn("text-lg font-semibold leading-tight tabular-nums", !libre && "font-medium")}>
                {slot.hora_inicio}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">hasta {slot.hora_fin}</span>
              {libre ? (
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    slot.libres === 1 ? "font-medium text-amber-700" : "text-muted-foreground",
                  )}
                >
                  {slot.libres} {slot.libres === 1 ? "libre" : "libres"}
                </span>
              ) : (
                <span className="text-xs font-medium">{motivo}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// --- Lista de reservas ---------------------------------------------------------

function FilaReserva({ reserva, onCancelar }: { reserva: ReservaSolinera; onCancelar: () => void }) {
  const contacto = [reserva.cliente.telefono, describirVehiculo(reserva.vehiculo)].filter(Boolean).join(" · ")
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-4">
      <div className="shrink-0 sm:w-32">
        <p className="text-base font-semibold tabular-nums">
          {formatearHora(reserva.inicio)} – {formatearHora(reserva.fin)}
        </p>
        <p className="text-xs tabular-nums text-muted-foreground">{formatearDuracion(reserva.duracion_min)}</p>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{reserva.cliente.nombre}</p>
        <p className="text-sm text-muted-foreground">{contacto}</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono">{reserva.codigo}</span>
          {reserva.nota ? ` · ${reserva.nota}` : ""}
        </p>
        {reserva.estado === "cancelada" && reserva.motivo_cancelacion && (
          <p className="text-xs text-muted-foreground">Motivo: {reserva.motivo_cancelacion}</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
            COLOR_ESTADO_RESERVA[reserva.estado],
          )}
        >
          {ETIQUETA_ESTADO_RESERVA[reserva.estado]}
        </span>
        {reserva.estado === "confirmada" && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancelar}
            aria-label={`Cancelar la reserva ${reserva.codigo} de ${reserva.cliente.nombre}`}
          >
            Cancelar
          </Button>
        )}
      </div>
    </li>
  )
}

function BloqueError({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
      <p className="flex items-center gap-2 text-sm text-red-800">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {mensaje}
      </p>
      <Button type="button" variant="outline" onClick={onReintentar}>
        Reintentar
      </Button>
    </div>
  )
}
