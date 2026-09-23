"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Loader2 } from "lucide-react"
import {
  FacturacionPendienteService,
  type OfertaPorFacturar,
} from "@/lib/services/feats/facturacion-pendiente/facturacion-pendiente-service"

interface NoFacturarDialogProps {
  oferta: OfertaPorFacturar | null
  onOpenChange: (open: boolean) => void
  onHecho: () => void
}

export function NoFacturarDialog({ oferta, onOpenChange, onHecho }: NoFacturarDialogProps) {
  const [motivo, setMotivo] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cerrar = (open: boolean) => {
    if (enviando) return
    setMotivo("")
    setError(null)
    onOpenChange(open)
  }

  const confirmar = async () => {
    if (!oferta || !motivo.trim()) return
    setEnviando(true)
    setError(null)
    try {
      await FacturacionPendienteService.noFacturar(oferta.oferta_id, motivo.trim())
      setMotivo("")
      onHecho()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={!!oferta} onOpenChange={cerrar}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>No facturar {oferta?.numero_oferta}</DialogTitle>
          <DialogDescription>
            La oferta sale de la lista sin facturarse. Úsalo para ofertas duplicadas o sustituidas por otra. Se
            puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="motivo-no-facturar">Motivo</Label>
          <Textarea
            id="motivo-no-facturar"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej.: duplicada de otra oferta, o sustituida por una nueva que sí se facturó"
            rows={3}
            maxLength={500}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => cerrar(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={enviando || !motivo.trim()}>
            {enviando && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            No facturar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
