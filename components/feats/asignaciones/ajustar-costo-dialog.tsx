"use client"

import { useEffect, useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import type {
  Asignacion,
  AsignacionInstalacion,
  AjustarCostoData,
  MotivoMovimiento,
} from "@/lib/types/feats/asignaciones/asignacion-types"
import { MOTIVOS_MOVIMIENTO } from "@/lib/types/feats/asignaciones/asignacion-types"

interface AjustarCostoDialogProps {
  open: boolean
  onClose: () => void
  asignacion: Asignacion | AsignacionInstalacion | null
  onSave: (data: AjustarCostoData) => Promise<boolean>
  loading?: boolean
}

export function AjustarCostoDialog({
  open, onClose, asignacion, onSave, loading,
}: AjustarCostoDialogProps) {
  const costoActual = asignacion?.costo ?? 0
  const [nuevoCosto, setNuevoCosto] = useState("")
  const [motivo, setMotivo] = useState<MotivoMovimiento>("ajuste")
  const [nota, setNota] = useState("")

  useEffect(() => {
    if (open && asignacion) {
      setNuevoCosto(String(costoActual ?? 0))
      setMotivo("ajuste")
      setNota("")
    }
  }, [open, asignacion, costoActual])

  if (!asignacion) return null

  const costoNum = parseFloat(nuevoCosto)
  const costoValido = !isNaN(costoNum) && costoNum >= 0
  const costoCambio = costoValido && costoNum !== (costoActual ?? 0)
  const canSave = costoValido && costoCambio && !!motivo

  const handleSave = async () => {
    if (!canSave) return
    const ok = await onSave({ nuevo_costo: costoNum, motivo, nota: nota.trim() || undefined })
    if (ok) onClose()
  }

  const diff = costoCambio ? costoNum - (costoActual ?? 0) : 0
  const cantidad = asignacion.cantidad ?? 1
  const impactoTotal = diff * cantidad

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            Ajustar costo
            <span className="ml-2 text-sm font-normal text-gray-400">— {asignacion.nombre}</span>
          </DialogTitle>
          <p className="text-xs text-gray-500">
            Ajusta el costo unitario de esta asignación sin tocar el catálogo.
            La depreciación se recalcula automáticamente. Queda traza en el historial.
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Costo actual</Label>
              <div className="px-3 py-2 bg-gray-50 border rounded-md text-sm text-gray-700">
                ${(costoActual ?? 0).toFixed(2)}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nuevo costo unitario *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={nuevoCosto}
                onChange={e => setNuevoCosto(e.target.value)}
              />
            </div>
          </div>

          {costoCambio && (
            <div className={`text-xs rounded p-2 ${diff > 0 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
              <p>
                Diferencia unitaria:{" "}
                <span className="font-semibold">{diff >= 0 ? "+" : ""}${diff.toFixed(2)}</span>
              </p>
              <p>
                Impacto en costo total del lote (×{cantidad}):{" "}
                <span className="font-semibold">{impactoTotal >= 0 ? "+" : ""}${impactoTotal.toFixed(2)}</span>
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Motivo *</Label>
            <select
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 bg-white"
              value={motivo}
              onChange={e => setMotivo(e.target.value as MotivoMovimiento)}
            >
              {MOTIVOS_MOVIMIENTO.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Nota (opcional)</Label>
            <Input
              placeholder="Detalle del ajuste, factura de referencia, etc."
              value={nota}
              onChange={e => setNota(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!canSave || loading}>
              {loading ? "Guardando..." : "Ajustar costo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
