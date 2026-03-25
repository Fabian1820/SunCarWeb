"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import type { MaterialContabilidad } from "@/lib/types/feats/contabilidad/contabilidad-types"
import { PackageSearch } from "lucide-react"

interface EntradaManualDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materiales: MaterialContabilidad[]
  onSubmit: (materialId: string, cantidad: number) => Promise<void>
  loading?: boolean
}

export function EntradaManualDialog({
  open,
  onOpenChange,
  materiales,
  onSubmit,
  loading = false,
}: EntradaManualDialogProps) {
  const [selectedMaterialId, setSelectedMaterialId] = useState("")
  const [cantidad, setCantidad] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)

    if (!selectedMaterialId) {
      setError("Debe seleccionar un material")
      return
    }

    const cantidadNum = parseFloat(cantidad)
    if (!cantidadNum || cantidadNum <= 0) {
      setError("La cantidad debe ser mayor a 0")
      return
    }

    try {
      await onSubmit(selectedMaterialId, cantidadNum)
      // Limpiar y cerrar
      setSelectedMaterialId("")
      setCantidad("")
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar entrada")
    }
  }

  const selectedMaterial = materiales.find((m) => m.id === selectedMaterialId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-blue-600" />
            Dar Entrada Manual
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="material">Material</Label>
            <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un material" />
              </SelectTrigger>
              <SelectContent>
                {materiales.map((material) => (
                  <SelectItem key={material.id} value={material.id}>
                    {material.codigoContabilidad} - {material.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMaterial && (
            <div className="rounded-md bg-blue-50 p-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-semibold">Cantidad actual:</span>{" "}
                  {selectedMaterial.cantidadContabilidad.toFixed(2)} {selectedMaterial.um}
                </div>
                <div>
                  <span className="font-semibold">Precio:</span>{" "}
                  {selectedMaterial.precioContabilidad.toLocaleString("es-ES")} CUP
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cantidad">Cantidad a Agregar</Label>
            <Input
              id="cantidad"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </div>

          {selectedMaterial && cantidad && parseFloat(cantidad) > 0 && (
            <div className="rounded-md bg-green-50 p-3 text-sm">
              <span className="font-semibold">Nueva cantidad:</span>{" "}
              {(selectedMaterial.cantidadContabilidad + parseFloat(cantidad)).toFixed(2)}{" "}
              {selectedMaterial.um}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Registrando..." : "Registrar Entrada"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
