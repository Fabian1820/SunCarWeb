"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { SelectorClienteVehiculo } from "@/components/feats/solineras/selector-cliente-vehiculo"
import { useToast } from "@/hooks/use-toast"
import { SolineraService } from "@/lib/services/feats/solineras/solinera-service"
import { etiquetaVehiculo, formatearDuracion } from "@/lib/utils/solineras"
import type {
  ClienteSolinera,
  SlotDisponibilidad,
  TipoVehiculo,
} from "@/lib/types/feats/solineras/solinera-types"

const NOTA_MAX = 200

/** La franja que se va a reservar, con el contexto con el que se consultó. */
export interface FranjaElegida {
  slot: SlotDisponibilidad
  /** El día ya en texto legible: "lunes, 21 de septiembre". */
  fechaTexto: string
  duracionMin: number
  tipoVehiculo: TipoVehiculo
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  solineraId: string
  franja: FranjaElegida | null
  /** Minutos que se espera al cliente antes de liberar el cupo. */
  graciaMin: number
  onCreada: () => void
  /** La reserva falló (p. ej. otro operador tomó el último cupo): conviene refrescar la rejilla. */
  onError: () => void
}

/** Confirma una reserva sobre una franja: elige cliente y vehículo, y una nota opcional. */
export function ReservaDialog({ open, onOpenChange, solineraId, franja, graciaMin, onCreada, onError }: Props) {
  const { toast } = useToast()
  const [cliente, setCliente] = useState<ClienteSolinera | null>(null)
  const [vehiculoId, setVehiculoId] = useState<string | null>(null)
  const [nota, setNota] = useState("")
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!open) return
    setCliente(null)
    setVehiculoId(null)
    setNota("")
  }, [open, franja?.slot.inicio])

  const vehiculo = cliente?.vehiculos.find((v) => v.id === vehiculoId) ?? null
  const tipoCoincide = !franja || vehiculo?.tipo === franja.tipoVehiculo
  const puedeConfirmar = !!franja && !!cliente && !cliente.bloqueado && !!vehiculo && tipoCoincide && !guardando

  const confirmar = async () => {
    if (!franja || !cliente || !vehiculo || !puedeConfirmar) return
    setGuardando(true)
    try {
      await SolineraService.crearReserva(solineraId, {
        cliente_id: cliente.id,
        vehiculo_id: vehiculo.id,
        inicio: franja.slot.inicio,
        duracion_min: franja.duracionMin,
        nota: nota.trim() || null,
      })
      toast({
        title: "Reserva confirmada",
        description: `${cliente.nombre} · ${franja.slot.hora_inicio} a ${franja.slot.hora_fin}`,
      })
      onCreada()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "No se pudo reservar",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
      onError()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(valor) => !guardando && onOpenChange(valor)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{franja ? `Reservar ${franja.slot.hora_inicio}` : "Reservar"}</DialogTitle>
          <DialogDescription>
            Si el cliente no llega en {graciaMin} min desde su hora, la reserva pasa a «no se presentó» y se libera
            el cupo.
          </DialogDescription>
        </DialogHeader>

        {franja && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border bg-muted/40 p-3 text-sm">
            <dt className="text-muted-foreground">Fecha</dt>
            <dd className="font-medium">{franja.fechaTexto}</dd>
            <dt className="text-muted-foreground">Horario</dt>
            <dd className="font-medium tabular-nums">
              {franja.slot.hora_inicio} a {franja.slot.hora_fin}
            </dd>
            <dt className="text-muted-foreground">Duración</dt>
            <dd className="font-medium tabular-nums">{formatearDuracion(franja.duracionMin)}</dd>
            <dt className="text-muted-foreground">Vehículo</dt>
            <dd className="font-medium">{etiquetaVehiculo(franja.tipoVehiculo)}</dd>
          </dl>
        )}

        {franja && (
          <SelectorClienteVehiculo
            solineraId={solineraId}
            cliente={cliente}
            vehiculoId={vehiculoId}
            onChange={(c, v) => {
              setCliente(c)
              setVehiculoId(v)
            }}
            tiposPermitidos={[franja.tipoVehiculo]}
            autoFocus
          />
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="reserva-nota">Nota (opcional)</Label>
          <Textarea
            id="reserva-nota"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={NOTA_MAX}
            rows={2}
            className="min-h-[60px]"
            placeholder="Llega con la batería descargada"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={!puedeConfirmar}>
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar reserva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
