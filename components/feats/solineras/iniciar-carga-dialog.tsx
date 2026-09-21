"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, Printer } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { Input } from "@/components/shared/molecule/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { useToast } from "@/hooks/use-toast"
import { useTarifas } from "@/hooks/use-solineras"
import { SolineraService } from "@/lib/services/feats/solineras/solinera-service"
import {
  describirVehiculo,
  etiquetaVehiculo,
  formatearDuracion,
  formatearHora,
  formatearMonto,
} from "@/lib/utils/solineras"
import { cn } from "@/lib/utils"
import { SelectorClienteVehiculo } from "./selector-cliente-vehiculo"
import { calcularImporte } from "@/lib/utils/solineras-importe"
import { leerNumero, mostrarTicket, prepararVentana, tarifaPara } from "./panel-utils"
import type {
  Carga,
  ClienteSolinera,
  PuestoPanel,
  ReservaSolinera,
  Solinera,
} from "@/lib/types/feats/solineras/solinera-types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  solinera: Solinera
  /** Puestos libres entre los que elegir. */
  puestosLibres: PuestoPanel[]
  /** Puesto ya elegido en la rejilla. */
  puestoInicialId?: string | null
  /** Reserva que se presenta: rellena cliente, vehículo y tiempo. */
  reserva?: ReservaSolinera | null
  onIniciada: (carga: Carga) => void
}

const RAPIDAS = [30, 60, 90, 120, 180, 240]

export function IniciarCargaDialog({
  open,
  onOpenChange,
  solinera,
  puestosLibres,
  puestoInicialId,
  reserva,
  onIniciada,
}: Props) {
  const { toast } = useToast()
  const configuracion = solinera.configuracion
  const { data: tarifas } = useTarifas(solinera.id)

  const [puestoId, setPuestoId] = useState<string>("")
  const [cliente, setCliente] = useState<ClienteSolinera | null>(null)
  const [vehiculoId, setVehiculoId] = useState<string | null>(null)
  const [minutos, setMinutos] = useState<string>("60")
  const [nota, setNota] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [creada, setCreada] = useState<Carga | null>(null)
  const [imprimiendo, setImprimiendo] = useState(false)

  const puesto = puestosLibres.find((p) => p.id === puestoId)
  const vehiculo = cliente?.vehiculos.find((v) => v.id === vehiculoId) ?? null
  const minutosNumero = leerNumero(minutos)

  // Al abrir todo vuelve a empezar; si viene de una reserva, se rellena con lo suyo.
  useEffect(() => {
    if (!open) return
    setCreada(null)
    setNota("")
    setPuestoId(puestoInicialId ?? "")
    setCliente(null)
    setVehiculoId(null)
    setMinutos(String(reserva?.duracion_min ?? 60))
    if (reserva) {
      let vigente = true
      SolineraService.obtenerCliente(solinera.id, reserva.cliente_id)
        .then((c) => {
          if (!vigente) return
          setCliente(c)
          setVehiculoId(reserva.vehiculo_id)
        })
        .catch((error) =>
          toast({
            title: "No se pudo cargar al cliente de la reserva",
            description: error instanceof Error ? error.message : undefined,
            variant: "destructive",
          }),
        )
      return () => {
        vigente = false
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, puestoInicialId, reserva?.id])

  // Si el único puesto libre es uno, se elige solo.
  useEffect(() => {
    if (open && !puestoId && puestosLibres.length === 1) setPuestoId(puestosLibres[0].id)
  }, [open, puestoId, puestosLibres])

  const tarifa = useMemo(
    () => (vehiculo && tarifas ? tarifaPara(tarifas, vehiculo.tipo) : undefined),
    [vehiculo, tarifas],
  )
  const sinTarifa = Boolean(vehiculo && tarifas && !tarifa)

  const minimo = configuracion?.duracion_minima_min ?? 5
  const maximo = configuracion?.tiempo_maximo_min ?? 1440
  const tiempoValido = Number.isInteger(minutosNumero) && minutosNumero >= minimo && minutosNumero <= maximo
  const estimado = tarifa && tiempoValido ? calcularImporte(tarifa, minutosNumero) : null
  const salida = tiempoValido ? new Date(Date.now() + minutosNumero * 60_000).toISOString() : null

  const puedeIniciar =
    Boolean(puestoId && cliente && vehiculoId) &&
    !cliente?.bloqueado &&
    tiempoValido &&
    !sinTarifa &&
    Boolean(tarifas) &&
    !guardando

  const iniciar = async () => {
    if (!cliente || !vehiculoId || !puestoId) return
    // La ventana del ticket se abre ya, dentro del clic: si se pidiera después
    // de esperar al servidor, el navegador la bloquearía.
    const ventana = prepararVentana()
    setGuardando(true)
    try {
      const carga = await SolineraService.iniciarCarga(solinera.id, {
        cliente_id: cliente.id,
        vehiculo_id: vehiculoId,
        puesto_id: puestoId,
        duracion_prevista_min: minutosNumero,
        reserva_id: reserva?.id ?? null,
        nota: nota.trim() || null,
      })
      setCreada(carga)
      onIniciada(carga)
      mostrarTicket(solinera.id, carga.id, ventana).catch(() => {
        toast({
          title: "La carga se inició, pero no se pudo abrir el ticket",
          description: "Usa el botón «Imprimir ticket».",
          variant: "destructive",
        })
      })
    } catch (error) {
      ventana?.close()
      toast({
        title: "No se pudo iniciar la carga",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  const reimprimir = async () => {
    if (!creada) return
    const ventana = prepararVentana()
    setImprimiendo(true)
    try {
      await mostrarTicket(solinera.id, creada.id, ventana)
    } catch (error) {
      toast({
        title: "No se pudo generar el ticket",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      })
    } finally {
      setImprimiendo(false)
    }
  }

  // --- Carga creada: confirmación con el ticket ---------------------------------
  if (creada) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Carga iniciada
            </DialogTitle>
            <DialogDescription>Entrega el ticket al cliente: con él recoge su vehículo.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/40 p-4 text-center">
            <p className="font-mono text-lg font-semibold tracking-wide">{creada.codigo}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Puesto {creada.puesto_codigo} · {formatearDuracion(creada.duracion_prevista_min)} · sale hacia las{" "}
              {formatearHora(creada.fin_previsto)}
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button onClick={reimprimir} disabled={imprimiendo}>
              {imprimiendo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
              Imprimir ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // --- Formulario -------------------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{reserva ? `Iniciar carga · reserva ${reserva.codigo}` : "Nueva carga"}</DialogTitle>
          <DialogDescription>
            El cliente dice cuánto tiempo quiere cargar; al terminar se cobra el tiempo real, por hora.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid gap-1.5">
            <Label>Puesto</Label>
            {puestosLibres.length === 0 ? (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                No hay ningún puesto libre ahora mismo.
              </p>
            ) : (
              <Select value={puestoId} onValueChange={setPuestoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige un puesto libre" />
                </SelectTrigger>
                <SelectContent>
                  {puestosLibres.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.codigo}
                      {p.tipos_vehiculo.length > 0
                        ? ` · ${p.tipos_vehiculo.map(etiquetaVehiculo).join(", ")}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <SelectorClienteVehiculo
            solineraId={solinera.id}
            cliente={cliente}
            vehiculoId={vehiculoId}
            onChange={(c, v) => {
              setCliente(c)
              setVehiculoId(v)
            }}
            tiposPermitidos={puesto?.tipos_vehiculo.length ? puesto.tipos_vehiculo : undefined}
            autoFocus={!reserva}
          />

          <div className="grid gap-2">
            <Label htmlFor="sol-carga-min">Tiempo que quiere cargar</Label>
            <div className="flex flex-wrap gap-2">
              {RAPIDAS.filter((m) => m >= minimo && m <= maximo).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={minutosNumero === m}
                  onClick={() => setMinutos(String(m))}
                  className={cn(
                    "h-10 rounded-lg border px-3 text-sm font-medium transition-colors",
                    minutosNumero === m ? "border-primary bg-primary/5 text-primary" : "hover:border-primary/50",
                  )}
                >
                  {formatearDuracion(m)}
                </button>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  id="sol-carga-min"
                  inputMode="numeric"
                  value={minutos}
                  onChange={(e) => setMinutos(e.target.value)}
                  className="h-10 w-20 tabular-nums"
                  aria-invalid={!tiempoValido}
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
            </div>
            {!tiempoValido ? (
              <p className="text-xs text-destructive">
                Entre {formatearDuracion(minimo)} y {formatearDuracion(maximo)}.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Saldría hacia las <strong className="text-foreground">{formatearHora(salida)}</strong>
                {estimado && tarifa ? (
                  <>
                    {" "}
                    · si usa todo el tiempo, unos{" "}
                    <strong className="tabular-nums text-foreground">
                      {formatearMonto(estimado.importe, tarifa.moneda)}
                    </strong>
                  </>
                ) : null}
              </p>
            )}
          </div>

          {vehiculo && tarifa && (
            <p className="text-sm text-muted-foreground">
              Tarifa: {formatearMonto(tarifa.precio_hora, tarifa.moneda)} por hora, en fracciones de{" "}
              {tarifa.fraccion_min} min (mínimo {tarifa.minimo_min} min).
            </p>
          )}
          {sinTarifa && vehiculo && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              No hay una tarifa activa para {describirVehiculo(vehiculo)}. Crea una en la pestaña Tarifas antes de
              cargarlo.
            </p>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="sol-carga-nota">Nota (opcional)</Label>
            <Input
              id="sol-carga-nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Cargador propio, batería hinchada, etc."
              maxLength={200}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={iniciar} disabled={!puedeIniciar}>
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Iniciar y sacar ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
