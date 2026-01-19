"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { DollarSign } from "lucide-react"

interface EntradaSalidaEfectivoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (tipo: "entrada" | "salida", monto: number, motivo: string) => void
}

export function EntradaSalidaEfectivoDialog({
  open,
  onOpenChange,
  onConfirm,
}: EntradaSalidaEfectivoDialogProps) {
  const [tipo, setTipo] = useState<"entrada" | "salida">("entrada")
  const [monto, setMonto] = useState("")
  const [motivo, setMotivo] = useState("")

  const handleConfirm = () => {
    const montoNum = parseFloat(monto)
    if (isNaN(montoNum) || montoNum <= 0) {
      return
    }
    if (!motivo.trim()) {
      return
    }
    onConfirm(tipo, montoNum, motivo)
    // Limpiar formulario
    setMonto("")
    setMotivo("")
    setTipo("entrada")
  }

  const handleCancel = () => {
    setMonto("")
    setMotivo("")
    setTipo("entrada")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Movimiento de efectivo</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Tabs de Entrada/Salida */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={tipo === "entrada" ? "default" : "outline"}
              className={`flex-1 h-11 ${
                tipo === "entrada"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "hover:bg-slate-50"
              }`}
              onClick={() => setTipo("entrada")}
            >
              Entrada de efectivo
            </Button>
            <Button
              type="button"
              variant={tipo === "salida" ? "default" : "outline"}
              className={`flex-1 h-11 ${
                tipo === "salida"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "hover:bg-slate-50"
              }`}
              onClick={() => setTipo("salida")}
            >
              Salida de efectivo
            </Button>
          </div>

          {/* Monto */}
          <div>
            <Label htmlFor="monto" className="text-base font-normal text-gray-700 mb-3 block">
              Monto
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
              <Input
                id="monto"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="text-3xl font-normal h-16 pl-14 pr-4"
              />
            </div>
          </div>

          {/* Motivo */}
          <div>
            <Label htmlFor="motivo" className="text-base font-normal text-gray-700 mb-3 block">
              Motivo
            </Label>
            <Textarea
              id="motivo"
              placeholder="Describe el motivo del movimiento..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="min-h-[120px] resize-none text-base"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleConfirm}
              disabled={!monto || parseFloat(monto) <= 0 || !motivo.trim()}
              className={`h-12 px-8 text-base ${
                tipo === "entrada"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              Confirmar
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="h-12 px-8 text-base"
            >
              Descartar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
