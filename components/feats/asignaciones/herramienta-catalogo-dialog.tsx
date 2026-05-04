"use client"

import { useState, useEffect } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import type { HerramientaCatalogo, HerramientaCatalogoCreateData, HerramientaCatalogoUpdateData } from "@/lib/types/feats/asignaciones/asignacion-types"

interface HerramientaCatalogoDialogProps {
  open: boolean
  onClose: () => void
  herramienta?: HerramientaCatalogo | null
  onSave: (data: HerramientaCatalogoCreateData | HerramientaCatalogoUpdateData, id?: string) => Promise<boolean>
  loading?: boolean
}

export function HerramientaCatalogoDialog({
  open, onClose, herramienta, onSave, loading,
}: HerramientaCatalogoDialogProps) {
  const isEdit = !!herramienta

  const [nombre, setNombre] = useState("")
  const [codigo, setCodigo] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [precio, setPrecio] = useState("0")

  useEffect(() => {
    if (open) {
      setNombre(herramienta?.nombre ?? "")
      setCodigo(herramienta?.codigo ?? "")
      setDescripcion(herramienta?.descripcion ?? "")
      setPrecio(String(herramienta?.precio ?? 0))
    }
  }, [open, herramienta])

  const handleSave = async () => {
    const p = parseFloat(precio)
    if (isEdit) {
      const data: HerramientaCatalogoUpdateData = {}
      if (nombre.trim()) data.nombre = nombre.trim()
      if (codigo.trim()) data.codigo = codigo.trim()
      if (descripcion.trim()) data.descripcion = descripcion.trim()
      if (!isNaN(p)) data.precio = p
      await onSave(data, herramienta!.producto_id)
    } else {
      const data: HerramientaCatalogoCreateData = {
        nombre: nombre.trim(),
        codigo: codigo.trim(),
        descripcion: descripcion.trim() || undefined,
        precio: isNaN(p) ? 0 : p,
      }
      await onSave(data)
    }
    onClose()
  }

  const canSave = nombre.trim().length > 0 && codigo.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isEdit ? "Editar herramienta" : "Nueva herramienta"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input
              placeholder="Ej: Martillo de carpintero"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Código *</Label>
              <Input
                placeholder="HE-001"
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Precio</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={precio}
                onChange={e => setPrecio(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descripción <span className="text-gray-400 text-xs">(opcional)</span></Label>
            <Input
              placeholder="Descripción breve..."
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={!canSave || loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? "Guardando..." : isEdit ? "Guardar" : "Crear"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
