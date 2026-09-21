"use client"

import { useMemo, useState, type FormEvent } from "react"
import { AlertCircle, AlertTriangle, Loader2, Plus, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { Input } from "@/components/shared/molecule/input"
import { Textarea } from "@/components/shared/molecule/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { useToast } from "@/hooks/use-toast"
import { usePanelSolinera } from "@/hooks/use-solineras"
import { SolineraService } from "@/lib/services/feats/solineras/solinera-service"
import {
  describirVehiculo,
  formatearDuracion,
  formatearHora,
} from "@/lib/utils/solineras"
import { cn } from "@/lib/utils"
import { CargaDialog } from "./carga-dialog"
import { IniciarCargaDialog } from "./iniciar-carga-dialog"
import { PuestoCard } from "./puesto-card"
import type { TabSolineraProps } from "./tab-props"
import type { PuestoPanel, ReservaSolinera } from "@/lib/types/feats/solineras/solinera-types"

/**
 * Lo que el operador tiene abierto todo el día: cada puesto con su estado, quién
 * carga y cuánto lleva, las reservas que vienen y lo que pide atención. Se
 * refresca solo cada 15 s.
 */
export function PanelEnVivo({ solinera }: TabSolineraProps) {
  const { toast } = useToast()
  const { data: panel, loading, refrescando, error, recargar } = usePanelSolinera(solinera.id)

  const [iniciar, setIniciar] = useState<{ puestoId: string | null; reserva: ReservaSolinera | null } | null>(null)
  const [cargaAbierta, setCargaAbierta] = useState<{ id: string; accion: "terminar" | null } | null>(null)
  const [falla, setFalla] = useState<PuestoPanel | null>(null)
  const [codigo, setCodigo] = useState("")
  const [buscando, setBuscando] = useState(false)

  const puestosLibres = useMemo(() => (panel?.puestos ?? []).filter((p) => p.estado === "libre"), [panel])

  const operativa = solinera.estado === "operativa"
  // El turno es opcional: solo la solinera tiene que estar operativa.
  const puedeIniciar = operativa

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground" role="status">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando el panel…
      </div>
    )
  }

  if (error && !panel) {
    return (
      <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1">
          <p className="font-medium">No se pudo cargar el panel</p>
          <p className="text-red-700">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void recargar()}>
          Reintentar
        </Button>
      </div>
    )
  }
  if (!panel) return null

  const buscarTicket = async (e: FormEvent) => {
    e.preventDefault()
    const texto = codigo.trim()
    if (!texto) return
    setBuscando(true)
    try {
      const carga = await SolineraService.cargaPorCodigo(solinera.id, texto)
      setCargaAbierta({ id: carga.id, accion: null })
      setCodigo("")
    } catch (err) {
      toast({
        title: "No se encontró el ticket",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      })
    } finally {
      setBuscando(false)
    }
  }

  const restablecer = async (puesto: PuestoPanel) => {
    try {
      await SolineraService.cambiarEstadoPuesto(solinera.id, puesto.id, "operativo")
      toast({ title: `${puesto.codigo} vuelve a estar operativo` })
      await recargar()
    } catch (err) {
      toast({
        title: "No se pudo cambiar el estado",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      })
    }
  }

  const { resumen } = panel
  const ventanaLlegada = solinera.configuracion?.presentacion_anticipada_min ?? 30
  const ahora = new Date(panel.ahora).getTime()

  return (
    <div className="grid gap-5">
      {!operativa && (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          La solinera está «{solinera.estado === "en_obra" ? "en obra" : solinera.estado}»: no admite cargas ni reservas.
          Se cambia en Configuración.
        </p>
      )}

      {/* Barra de trabajo: contadores, buscador de ticket y nueva carga */}
      <section aria-label="Resumen" className="flex flex-col gap-4 rounded-xl border bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
          <Contador titulo="Libres" valor={resumen.libres} tono="text-emerald-800" />
          <Contador titulo="Cargando" valor={resumen.cargando} tono="text-lime-800" />
          <Contador titulo="Terminaron" valor={resumen.terminadas} tono={resumen.terminadas > 0 ? "text-amber-800" : undefined} />
          <Contador titulo="Fuera de servicio" valor={resumen.fuera_servicio} tono={resumen.fuera_servicio > 0 ? "text-red-800" : undefined} />
          <Contador titulo="Reservas próximas" valor={resumen.reservas_proximas} />
        </dl>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <form onSubmit={buscarTicket} className="flex gap-2" role="search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Código del ticket"
                aria-label="Código del ticket"
                className="h-10 w-full pl-9 font-mono text-sm sm:w-56"
                autoComplete="off"
              />
            </div>
            <Button type="submit" variant="outline" className="h-10" disabled={buscando || !codigo.trim()}>
              {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
            </Button>
          </form>
          <Button
            className="h-10"
            onClick={() => setIniciar({ puestoId: null, reserva: null })}
            disabled={!puedeIniciar}
            title={puedeIniciar ? undefined : "La solinera no está operativa"}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva carga
          </Button>
        </div>
      </section>

      {panel.alertas.length > 0 && (
        <section aria-label="Requiere atención">
          <h2 className="mb-2 text-sm font-semibold">Requiere atención</h2>
          <ul className="divide-y overflow-hidden rounded-xl border bg-white">
            {panel.alertas.map((a, i) => (
              <li key={`${a.tipo}-${a.puesto_id}-${i}`} className="flex items-center gap-3 px-4 py-3 text-sm">
                <AlertTriangle
                  className={cn("h-4 w-4 shrink-0", a.gravedad === "critica" ? "text-red-600" : "text-amber-600")}
                  aria-label={a.gravedad === "critica" ? "Crítica" : "Aviso"}
                />
                <span className="flex-1">{a.mensaje}</span>
                {a.carga_id && (
                  <Button variant="outline" size="sm" onClick={() => setCargaAbierta({ id: a.carga_id as string, accion: null })}>
                    Abrir
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <section aria-label="Puestos">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Puestos</h2>
            <button
              type="button"
              onClick={() => void recargar()}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Actualizar el panel"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refrescando && "animate-spin")} />
              Actualizado a las {formatearHora(panel.ahora)}
            </button>
          </div>
          {panel.puestos.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Esta solinera todavía no tiene puestos. Créalos en Configuración.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {panel.puestos.map((puesto) => (
                <li key={puesto.id}>
                  <PuestoCard
                    puesto={puesto}
                    puedeIniciar={puedeIniciar}
                    tiempoMaximoMin={panel.configuracion.tiempo_maximo_min}
                    onIniciar={(p) => setIniciar({ puestoId: p.id, reserva: null })}
                    onAbrirCarga={(id, accion) => setCargaAbierta({ id, accion: accion ?? null })}
                    onReportarFalla={setFalla}
                    onRestablecer={restablecer}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Reservas próximas" className="rounded-xl border bg-white">
          <h2 className="border-b px-4 py-3 text-sm font-semibold">Reservas de las próximas 24 h</h2>
          {panel.reservas.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No hay reservas confirmadas.</p>
          ) : (
            <ul className="divide-y">
              {panel.reservas.map((r) => {
                const puedePresentarse =
                  operativa && ahora >= new Date(r.inicio).getTime() - ventanaLlegada * 60_000
                return (
                  <li key={r.id} className="grid gap-1 px-4 py-3 text-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold tabular-nums">
                        {formatearHora(r.inicio)}–{formatearHora(r.fin)}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatearDuracion(r.duracion_min)}</span>
                    </div>
                    <p className="truncate font-medium">{r.cliente.nombre}</p>
                    <p className="truncate text-muted-foreground">{describirVehiculo(r.vehiculo)}</p>
                    {r.esperando && (
                      <p className="text-xs font-medium text-amber-800">
                        Ya es su hora · espera hasta las {formatearHora(r.vence_en)}
                      </p>
                    )}
                    <div className="mt-1">
                      {puedePresentarse ? (
                        <Button size="sm" className="h-9" onClick={() => setIniciar({ puestoId: null, reserva: r })}>
                          Llegó: iniciar carga
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Puede llegar desde {ventanaLlegada} min antes de su hora
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <IniciarCargaDialog
        open={iniciar !== null}
        onOpenChange={(o) => !o && setIniciar(null)}
        solinera={solinera}
        puestosLibres={puestosLibres}
        puestoInicialId={iniciar?.puestoId}
        reserva={iniciar?.reserva}
        onIniciada={() => void recargar()}
      />

      {solinera.configuracion && (
        <CargaDialog
          solineraId={solinera.id}
          cargaId={cargaAbierta?.id ?? null}
          accionInicial={cargaAbierta?.accion ?? null}
          configuracion={solinera.configuracion}
          onOpenChange={(o) => !o && setCargaAbierta(null)}
          onCambio={() => void recargar()}
        />
      )}

      <ReportarFallaDialog
        puesto={falla}
        solineraId={solinera.id}
        onOpenChange={(o) => !o && setFalla(null)}
        onHecho={() => void recargar()}
      />
    </div>
  )
}

function Contador({ titulo, valor, tono }: { titulo: string; valor: number; tono?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{titulo}</dt>
      <dd className={cn("text-2xl font-semibold tabular-nums", tono)}>{valor}</dd>
    </div>
  )
}

function ReportarFallaDialog({
  puesto,
  solineraId,
  onOpenChange,
  onHecho,
}: {
  puesto: PuestoPanel | null
  solineraId: string
  onOpenChange: (open: boolean) => void
  onHecho: () => void
}) {
  const { toast } = useToast()
  const [estado, setEstado] = useState<"falla" | "fuera_servicio">("falla")
  const [motivo, setMotivo] = useState("")
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    if (!puesto) return
    setGuardando(true)
    try {
      await SolineraService.cambiarEstadoPuesto(solineraId, puesto.id, estado, motivo.trim())
      toast({ title: `${puesto.codigo} marcado ${estado === "falla" ? "en falla" : "fuera de servicio"}` })
      setMotivo("")
      onHecho()
      onOpenChange(false)
    } catch (err) {
      toast({
        title: "No se pudo marcar el puesto",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={puesto !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Puesto {puesto?.codigo}</DialogTitle>
          <DialogDescription>
            Mientras esté así no se le podrá poner ninguna carga ni cuenta para las reservas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Estado del puesto">
            {(
              [
                ["falla", "En falla"],
                ["fuera_servicio", "Fuera de servicio"],
              ] as const
            ).map(([valor, etiqueta]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={estado === valor}
                onClick={() => setEstado(valor)}
                className={cn(
                  "h-11 rounded-lg border px-3 text-sm font-medium transition-colors",
                  estado === valor ? "border-primary bg-primary/5 text-primary" : "hover:border-primary/50",
                )}
              >
                {etiqueta}
              </button>
            ))}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sol-falla-motivo">¿Qué pasó?</Label>
            <Textarea
              id="sol-falla-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="Toma quemada, cable dañado, sin corriente…"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={guardando || motivo.trim().length < 3}>
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Marcar puesto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
