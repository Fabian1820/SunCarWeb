"use client"

import { useState, useEffect } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import type { MedioBasico, MedioBasicoCreateData, MedioBasicoUpdateData } from "@/lib/types/feats/asignaciones/asignacion-types"

interface MedioBasicoDialogProps {
  open: boolean
  onClose: () => void
  medio?: MedioBasico | null
  onSave: (data: MedioBasicoCreateData | MedioBasicoUpdateData, id?: string) => Promise<boolean>
  loading?: boolean
}

export function MedioBasicoDialog({ open, onClose, medio, onSave, loading }: MedioBasicoDialogProps) {
  const isEdit = !!medio
  const [nombre, setNombre] = useState(medio?.nombre ?? "")
  const [precio, setPrecio] = useState(medio?.precio != null ? String(medio.precio) : "")

  useEffect(() => {
    setNombre(medio?.nombre ?? "")
    setPrecio(medio?.precio != null ? String(medio.precio) : "")
  }, [medio, open])

  const handleSave = async () => {
    const data = {
      nombre: nombre.trim() || undefined,
      precio: precio ? parseFloat(precio) : undefined,
    }
    const ok = await onSave(data, medio?.id)
    if (ok) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar medio básico" : "Crear medio básico"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Nombre *</Label>
            <Input
              placeholder="Ej: Taladro Bosch 500W"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Precio (opcional)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={precio}
              onChange={e => setPrecio(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!nombre.trim() || loading}>
              {loading ? "Guardando..." : isEdit ? "Guardar" : "Crear"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
