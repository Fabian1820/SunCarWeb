"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { SearchableSelect } from "@/components/shared/molecule/searchable-select"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Save, X } from "lucide-react"
import type { MaterialContabilidad } from "@/lib/types/feats/contabilidad/contabilidad-types"

interface AjustarCantidadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materiales: MaterialContabilidad[]
  onSubmit: (materialId: string, cantidadNueva: number, motivo: string) => Promise<void>
  loading: boolean
}

export function AjustarCantidadDialog({
  open,
  onOpenChange,
  materiales,
  onSubmit,
  loading,
}: AjustarCantidadDialogProps) {
  const [materialId, setMaterialId] = useState("")
  const [cantidad, setCantidad] = useState("")
  const [motivo, setMotivo] = useState("")
  const [errores, setErrores] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setMaterialId("")
      setCantidad("")
      setMotivo("")
      setErrores({})
    }
  }, [open])

  const seleccionado = materiales.find((m) => m.id === materialId)
  const nueva = parseFloat(cantidad)
  const baja =
    seleccionado && Number.isFinite(nueva) ? seleccionado.cantidadContabilidad - nueva : 0

  const opciones = materiales.map((m) => ({
    value: m.id,
    label: `[${m.codigoContabilidad}] ${m.nombre || m.descripcion} — hay ${m.cantidadContabilidad}`,
  }))

  const enviar = async () => {
    const nuevos: Record<string, string> = {}
    if (!materialId) nuevos.material = "Seleccione el material"
    if (!Number.isFinite(nueva) || nueva < 0) {
      nuevos.cantidad = "Escriba la cantidad que debe quedar"
    } else if (seleccionado && nueva > seleccionado.cantidadContabilidad) {
      nuevos.cantidad = `Este ajuste es solo a la baja. Hay ${seleccionado.cantidadContabilidad}; para subir use "Dar Entrada Manual".`
    } else if (seleccionado && nueva === seleccionado.cantidadContabilidad) {
      nuevos.cantidad = "La cantidad es la misma que ya había"
    }
    if (motivo.trim().length < 3) {
      nuevos.motivo = "Explique por qué se ajusta: sin motivo no se puede distinguir de un error"
    }
    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) return

    await onSubmit(materialId, nueva, motivo.trim())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Ajustar cantidad</DialogTitle>
          <DialogDescription>
            Baja la existencia contable dejándola en la cantidad que indique. Queda
            registrado quién lo hizo, cuándo y por qué.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>
              Material <span className="text-red-500">*</span>
            </Label>
            <SearchableSelect
              options={opciones}
              value={materialId}
              onValueChange={setMaterialId}
              placeholder="Seleccionar material..."
              searchPlaceholder="Buscar por código o nombre..."
              disabled={loading}
            />
            {errores.material && <p className="text-sm text-red-500 mt-1">{errores.material}</p>}
          </div>

          {seleccionado && (
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 text-sm">
              <div>
                <span className="text-gray-600">Existencia actual:</span>
                <span className="ml-2 font-semibold">{seleccionado.cantidadContabilidad}</span>
              </div>
              <div>
                <span className="text-gray-600">Se dará de baja:</span>
                <span
                  className={`ml-2 font-semibold ${baja > 0 ? "text-red-600" : "text-gray-400"}`}
                >
                  {baja > 0 ? baja : "—"} {seleccionado.um}
                </span>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="cantidad-nueva">
              Cantidad que debe quedar <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cantidad-nueva"
              type="number"
              step="0.01"
              min="0"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="0.00"
              className={errores.cantidad ? "border-red-500" : ""}
              disabled={loading || !materialId}
            />
            {errores.cantidad && <p className="text-sm text-red-500 mt-1">{errores.cantidad}</p>}
          </div>

          <div>
            <Label htmlFor="motivo">
              Motivo <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: conteo físico del 16-sep, rotura en almacén, cuadre con contabilidad..."
              rows={3}
              className={errores.motivo ? "border-red-500" : ""}
              disabled={loading}
            />
            {errores.motivo && <p className="text-sm text-red-500 mt-1">{errores.motivo}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={loading} variant="destructive">
            <Save className="h-4 w-4 mr-2" />
            Ajustar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
