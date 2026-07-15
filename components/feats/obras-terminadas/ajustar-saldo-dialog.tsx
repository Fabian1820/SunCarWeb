"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Loader2 } from "lucide-react"
import type { ObraTerminada } from "@/lib/services/feats/obras-terminadas/obras-terminadas-service"

interface AjustarSaldoDialogProps {
  obra: ObraTerminada | null
  onOpenChange: (open: boolean) => void
  onConfirm: (obra: ObraTerminada, monto: number) => Promise<void>
}

const roundToCents = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

export function AjustarSaldoDialog({ obra, onOpenChange, onConfirm }: AjustarSaldoDialogProps) {
  const [monto, setMonto] = useState("")
  const [loading, setLoading] = useState(false)
  const pendiente = roundToCents(obra?.monto_pendiente ?? 0)

  useEffect(() => {
    if (!obra) return
    const residuo = roundToCents(pendiente - Math.trunc(pendiente))
    setMonto((residuo > 0 ? residuo : pendiente).toFixed(2))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obra?.oferta_id])

  const parsed = Number(monto)
  const esValido = Number.isFinite(parsed) && parsed > 0 && parsed <= pendiente + 0.01

  const handleConfirm = async () => {
    if (!obra || !esValido) return
    setLoading(true)
    try {
      await onConfirm(obra, roundToCents(parsed))
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!obra} onOpenChange={(open) => { if (!open) onOpenChange(false) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar saldo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-gray-600">
            Registra un ajuste de contabilidad para la oferta #{obra?.numero_oferta || obra?.numero_factura || ""}.
            No es un pago real del cliente — quedará etiquetado como &quot;Ajuste de contabilidad&quot; y no se
            puede deshacer desde aquí.
          </p>
          <div>
            <label className="text-sm font-medium" htmlFor="monto-ajuste">
              Monto a ajustar (pendiente: ${pendiente.toFixed(2)})
            </label>
            <Input
              id="monto-ajuste"
              type="number"
              min={0.01}
              max={pendiente}
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              disabled={loading}
            />
          </div>
          {!esValido && monto !== "" && (
            <p className="text-sm text-red-600">
              El monto debe ser mayor a 0 y no exceder ${pendiente.toFixed(2)}.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={!esValido || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajustar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
