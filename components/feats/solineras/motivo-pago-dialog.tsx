"use client"

import { useEffect, useState, type FormEvent } from "react"
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
import { formatearMonto } from "@/lib/utils/solineras"
import type { PagoSolinera } from "@/lib/types/feats/solineras/solinera-types"

export type ModoMotivoPago = "rechazar" | "cancelar"

interface Props {
  solineraId: string
  modo: ModoMotivoPago
  /** null = cerrado. */
  pago: PagoSolinera | null
  onOpenChange: (abierto: boolean) => void
  /** Se llama tras rechazar o cancelar con éxito, para que la lista se recargue. */
  onHecho: () => void
}

const MOTIVO_MIN = 3
const MOTIVO_MAX = 200

export function MotivoPagoDialog({ solineraId, modo, pago, onOpenChange, onHecho }: Props) {
  const { toast } = useToast()
  const [motivo, setMotivo] = useState("")
  const [tocado, setTocado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  // Se conserva el último pago para que el texto no desaparezca durante la animación de cierre.
  const [mostrado, setMostrado] = useState<PagoSolinera | null>(pago)
  const [modoMostrado, setModoMostrado] = useState<ModoMotivoPago>(modo)

  useEffect(() => {
    if (!pago) return
    setMostrado(pago)
    setModoMostrado(modo)
    setMotivo("")
    setTocado(false)
  }, [pago, modo])

  const rechazando = modoMostrado === "rechazar"
  const texto = motivo.trim()
  const invalido = texto.length < MOTIVO_MIN
  const carga = mostrado?.carga_codigo ?? ""
  const monto = mostrado ? formatearMonto(mostrado.monto, mostrado.moneda) : ""

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!mostrado || enviando) return
    setTocado(true)
    if (invalido) return
    setEnviando(true)
    try {
      if (rechazando) {
        await SolineraService.rechazarComprobante(solineraId, mostrado.id, texto)
        toast({
          title: "Comprobante rechazado",
          description: `La carga ${carga} vuelve a tener saldo pendiente.`,
        })
      } else {
        await SolineraService.cancelarPago(solineraId, mostrado.id, texto)
        toast({ title: "Pago cancelado", description: `${monto} · carga ${carga}` })
      }
      onHecho()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: rechazando ? "No se pudo rechazar el comprobante" : "No se pudo cancelar el pago",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog
      open={pago !== null}
      onOpenChange={(abierto) => {
        if (!enviando) onOpenChange(abierto)
      }}
    >
      <DialogContent className="max-w-md">
        <form onSubmit={enviar} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{rechazando ? "Rechazar comprobante" : "Cancelar pago"}</DialogTitle>
            <DialogDescription>
              {rechazando
                ? `El pago de ${monto} de la carga ${carga} deja de contar como cobrado: la carga volverá a quedar con saldo pendiente. El motivo queda registrado junto al comprobante.`
                : `El pago de ${monto} de la carga ${carga} deja de contar como cobrado y la carga vuelve a tener saldo pendiente. Solo se puede cancelar mientras el turno del pago siga abierto.`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor="motivo-pago">
              {rechazando ? "Motivo del rechazo" : "Motivo de la cancelación"}
            </Label>
            <Textarea
              id="motivo-pago"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              onBlur={() => setTocado(true)}
              maxLength={MOTIVO_MAX}
              rows={3}
              autoFocus
              placeholder={
                rechazando
                  ? "Ej.: el monto de la transferencia no coincide"
                  : "Ej.: el cliente pagó dos veces por error"
              }
              aria-invalid={tocado && invalido}
              aria-describedby="motivo-pago-ayuda"
            />
            <div className="flex items-start justify-between gap-3 text-xs">
              <p
                id="motivo-pago-ayuda"
                role={tocado && invalido ? "alert" : undefined}
                className={tocado && invalido ? "text-destructive" : "text-muted-foreground"}
              >
                {tocado && invalido
                  ? `Escribe al menos ${MOTIVO_MIN} caracteres.`
                  : "Obligatorio. Lo verá quien revise los pagos."}
              </p>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {motivo.length}/{MOTIVO_MAX}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={enviando}
            >
              Volver
            </Button>
            <Button type="submit" variant="destructive" disabled={enviando}>
              {enviando && <Loader2 className="animate-spin" />}
              {rechazando ? "Rechazar comprobante" : "Cancelar pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
