"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { DollarSign, Percent, Package, Loader2, Pencil } from "lucide-react"
import { FichaCostoService } from "@/lib/api-services"
import { useToast } from "@/hooks/use-toast"
import type { MaterialFichaResumen } from "@/lib/types/feats/fichas-costo/ficha-costo-types"

interface EditarPreciosDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: MaterialFichaResumen | null
  onSaved?: () => void | Promise<void>
}

const toInputValue = (n?: number): string =>
  typeof n === "number" && !Number.isNaN(n) ? String(n) : ""

export function EditarPreciosDialog({ open, onOpenChange, material, onSaved }: EditarPreciosDialogProps) {
  const { toast } = useToast()
  const [precio, setPrecio] = useState<string>("")
  const [precioInstaladora, setPrecioInstaladora] = useState<string>("")
  const [porcRebajable, setPorcRebajable] = useState<string>("")
  const [costo, setCosto] = useState<string>("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && material) {
      setPrecio(toInputValue(material.precio))
      setPrecioInstaladora(toInputValue(material.precio_instaladora))
      setPorcRebajable(toInputValue(material.porciento_rebajable_venta))
      setCosto(toInputValue(material.costo))
    }
  }, [open, material])

  const parseNum = (v: string): number | undefined => {
    const trimmed = v.trim()
    if (trimmed === "") return undefined
    const n = Number(trimmed)
    return Number.isFinite(n) ? n : undefined
  }

  const handleSave = async () => {
    if (!material) return
    if (!material.producto_id) {
      toast({
        title: "Error",
        description: "No se pudo determinar el producto del material.",
        variant: "destructive",
      })
      return
    }
    if (material.codigo == null) {
      toast({
        title: "Error",
        description: "El material no tiene código.",
        variant: "destructive",
      })
      return
    }

    const payload: Record<string, number | undefined> = {
      precio: parseNum(precio),
      precio_instaladora: parseNum(precioInstaladora),
      porciento_rebajable_venta: parseNum(porcRebajable),
      costo: parseNum(costo),
    }

    // Solo enviar campos modificados respecto al material original
    const cleaned: Record<string, number> = {}
    if (payload.precio !== undefined && payload.precio !== material.precio) cleaned.precio = payload.precio
    if (payload.precio_instaladora !== undefined && payload.precio_instaladora !== material.precio_instaladora)
      cleaned.precio_instaladora = payload.precio_instaladora
    if (payload.porciento_rebajable_venta !== undefined && payload.porciento_rebajable_venta !== material.porciento_rebajable_venta)
      cleaned.porciento_rebajable_venta = payload.porciento_rebajable_venta
    if (payload.costo !== undefined && payload.costo !== material.costo) cleaned.costo = payload.costo

    if (Object.keys(cleaned).length === 0) {
      toast({ title: "Sin cambios", description: "No hay valores modificados." })
      return
    }

    try {
      setSaving(true)
      await FichaCostoService.editPreciosCosto(material.producto_id, material.codigo, cleaned)
      toast({ title: "Material actualizado", description: "Cambios guardados correctamente." })
      onOpenChange(false)
      if (onSaved) await onSaved()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "No se pudo actualizar el material.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (!material) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-blue-600" />
            Editar precios y costo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Encabezado visual con foto + nombre + código */}
          <div className="flex items-center gap-3 p-3 rounded-md border border-gray-200 bg-gray-50/60">
            {material.foto ? (
              <div className="w-12 h-12 rounded-md overflow-hidden bg-white border border-gray-200 flex-shrink-0">
                <img
                  src={material.foto}
                  alt={material.nombre || material.descripcion || "Material"}
                  className="w-full h-full object-contain p-0.5"
                  onError={(e) => {
                    const t = e.currentTarget as HTMLImageElement
                    t.style.display = "none"
                  }}
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-md bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Package className="h-5 w-5 text-amber-700" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 text-sm truncate">
                {material.nombre || material.descripcion || "Material"}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <Badge variant="outline" className="bg-white text-gray-700 border-gray-300 text-[11px] font-mono">
                  {material.codigo ?? "-"}
                </Badge>
                {material.categoria && (
                  <Badge className="bg-blue-50 text-blue-700 text-[11px]">{material.categoria}</Badge>
                )}
                {material.marca && (
                  <span className="text-[11px] text-gray-500 truncate">{material.marca}</span>
                )}
              </div>
            </div>
          </div>

          {/* Formulario */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ep-costo" className="text-xs text-gray-700">Costo</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  id="ep-costo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={costo}
                  onChange={(e) => setCosto(e.target.value)}
                  className="pl-7 h-9 text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="ep-precio" className="text-xs text-gray-700">Precio venta</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  id="ep-precio"
                  type="number"
                  step="0.01"
                  min="0"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  className="pl-7 h-9 text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="ep-precio-instaladora" className="text-xs text-gray-700">Precio instaladora</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  id="ep-precio-instaladora"
                  type="number"
                  step="0.01"
                  min="0"
                  value={precioInstaladora}
                  onChange={(e) => setPrecioInstaladora(e.target.value)}
                  className="pl-7 h-9 text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="ep-porc-rebajable" className="text-xs text-gray-700">% Rebajable venta</Label>
              <div className="relative mt-1">
                <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  id="ep-porc-rebajable"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={porcRebajable}
                  onChange={(e) => setPorcRebajable(e.target.value)}
                  className="pl-7 h-9 text-sm"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
