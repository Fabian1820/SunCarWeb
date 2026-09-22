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
import { useToast } from "@/hooks/use-toast"
import { SolineraService } from "@/lib/services/feats/solineras/solinera-service"
import { formatearHora } from "@/lib/utils/solineras"
import type { ReservaSolinera } from "@/lib/types/feats/solineras/solinera-types"

const MOTIVO_MIN = 3
const MOTIVO_MAX = 200

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  solineraId: string
  reserva: ReservaSolinera | null
  onCancelada: () => void
}

/** Cancela una reserva confirmada; el motivo es obligatorio y queda en la bitácora. */
export function CancelarReservaDialog({ open, onOpenChange, solineraId, reserva, onCancelada }: Props) {
  const { toast } = useToast()
  const [motivo, setMotivo] = useState("")
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (open) setMotivo("")
  }, [open, reserva?.id])

  const motivoLimpio = motivo.trim()
  const motivoValido = motivoLimpio.length >= MOTIVO_MIN
  const mostrarError = motivo.length > 0 && !motivoValido

  const cancelar = async () => {
    if (!reserva || !motivoValido) return
    setGuardando(true)
    try {
      await SolineraService.cancelarReserva(solineraId, reserva.id, motivoLimpio)
      toast({ title: "Reserva cancelada", description: `${reserva.codigo} · ${reserva.cliente.nombre}` })
      onCancelada()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "No se pudo cancelar la reserva",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(valor) => !guardando && onOpenChange(valor)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar reserva</DialogTitle>
          <DialogDescription>
            {reserva
              ? `${reserva.cliente.nombre} · ${formatearHora(reserva.inicio)} a ${formatearHora(reserva.fin)} · ${reserva.codigo}`
              : "Se libera el cupo que tenía reservado."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1.5">
          <Label htmlFor="cancelar-reserva-motivo">Motivo de la cancelación</Label>
          <Textarea
            id="cancelar-reserva-motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={MOTIVO_MAX}
            rows={3}
            placeholder="El cliente avisó que no puede venir"
            aria-invalid={mostrarError}
            autoFocus
          />
          <div className="flex items-start justify-between gap-3 text-xs">
            <p className={mostrarError ? "text-destructive" : "text-muted-foreground"}>
              {mostrarError ? `Escribe al menos ${MOTIVO_MIN} caracteres.` : "Queda registrado con la reserva."}
            </p>
            <p className="shrink-0 tabular-nums text-muted-foreground">
              {motivo.length}/{MOTIVO_MAX}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
            Mantener reserva
          </Button>
          <Button variant="destructive" onClick={cancelar} disabled={!motivoValido || guardando}>
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancelar reserva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
