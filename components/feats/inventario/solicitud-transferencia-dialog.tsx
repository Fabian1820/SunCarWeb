"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { MaterialCombobox } from "@/components/feats/inventario/material-combobox"
import {
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  ArrowRightLeft,
} from "lucide-react"
import type { Almacen, StockItem } from "@/lib/inventario-types"
import type { Material } from "@/lib/material-types"
import { InventarioService } from "@/lib/api-services"

interface ItemRow {
  material_id: string
  material_codigo: string
  cantidad: number
  ubicacion_en_almacen: string
}

interface SolicitudTransferenciaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  almacenes: Almacen[]
  materiales: Material[]
  stock: StockItem[]
  currentAlmacenId?: string
  onSuccess: () => void
}

export function SolicitudTransferenciaDialog({
  open,
  onOpenChange,
  almacenes,
  materiales,
  stock,
  currentAlmacenId,
  onSuccess,
}: SolicitudTransferenciaDialogProps) {
  const [origenId, setOrigenId] = useState(currentAlmacenId || "")
  const [destinoId, setDestinoId] = useState("")
  const [items, setItems] = useState<ItemRow[]>([])
  const [motivo, setMotivo] = useState("")
  const [referencia, setReferencia] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Stock del almacén origen indexado por material_id
  const stockPorMaterial = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of stock) {
      if (item.almacen_id === origenId) {
        const key = item.material_id || item.material_codigo
        map.set(key, (map.get(key) || 0) + item.cantidad)
      }
    }
    return map
  }, [stock, origenId])

  // Map material codigo → material object for quick lookup
  const materialPorCodigo = useMemo(() => {
    const map = new Map<string, Material>()
    for (const m of materiales) map.set(String(m.codigo), m)
    return map
  }, [materiales])

  const materialPorId = useMemo(() => {
    const map = new Map<string, Material>()
    for (const m of materiales) {
      if (m.id) map.set(m.id, m)
    }
    return map
  }, [materiales])

  const getStockDisponible = (materialId: string, materialCodigo: string) => {
    return stockPorMaterial.get(materialId) || stockPorMaterial.get(materialCodigo) || 0
  }

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { material_id: "", material_codigo: "", cantidad: 1, ubicacion_en_almacen: "" },
    ])
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof ItemRow, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        if (field === "material_codigo") {
          const mat = materialPorCodigo.get(String(value))
          return {
            ...item,
            material_codigo: String(value),
            material_id: mat?.id || "",
          }
        }
        return { ...item, [field]: value }
      }),
    )
  }

  const validate = (): boolean => {
    if (!origenId) {
      setError("Selecciona el almacén de origen")
      return false
    }
    if (!destinoId) {
      setError("Selecciona el almacén de destino")
      return false
    }
    if (origenId === destinoId) {
      setError("El almacén de origen y destino deben ser diferentes")
      return false
    }
    if (items.length === 0) {
      setError("Agrega al menos un material")
      return false
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.material_id && !item.material_codigo) {
        setError(`Material ${i + 1}: selecciona un material`)
        return false
      }
      if (!item.cantidad || item.cantidad <= 0) {
        setError(`Material ${i + 1}: la cantidad debe ser mayor a 0`)
        return false
      }
      const disponible = getStockDisponible(item.material_id, item.material_codigo)
      if (item.cantidad > disponible) {
        const mat = materialPorId.get(item.material_id) || materialPorCodigo.get(item.material_codigo)
        setError(
          `"${mat?.descripcion || item.material_codigo}": solo hay ${disponible} disponibles en el almacén origen`,
        )
        return false
      }
    }
    setError(null)
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setIsSubmitting(true)
    setError(null)
    try {
      await InventarioService.createSolicitudTransferencia({
        almacen_origen_id: origenId,
        almacen_destino_id: destinoId,
        items: items.map((item) => ({
          material_id: item.material_id || item.material_codigo,
          cantidad: item.cantidad,
          ubicacion_en_almacen: item.ubicacion_en_almacen || undefined,
        })),
        motivo: motivo || undefined,
        referencia: referencia || undefined,
      })
      // Reset form
      setItems([])
      setMotivo("")
      setReferencia("")
      setDestinoId("")
      setError(null)
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al crear la solicitud",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetAndClose = (value: boolean) => {
    if (!value) {
      setError(null)
    }
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Solicitar Traspaso de Materiales
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Almacén Origen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Almacén Origen *
              </Label>
              <Select value={origenId} onValueChange={setOrigenId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar origen" />
                </SelectTrigger>
                <SelectContent>
                  {almacenes.map((a) => (
                    <SelectItem key={a.id} value={a.id || ""}>
                      {a.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                Almacén Destino *
              </Label>
              <Select value={destinoId} onValueChange={setDestinoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar destino" />
                </SelectTrigger>
                <SelectContent>
                  {almacenes
                    .filter((a) => a.id !== origenId)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id || ""}>
                        {a.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Materiales *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>

            {items.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4 border rounded-md border-dashed">
                No hay materiales agregados. Presiona &quot;Agregar&quot; para
                añadir materiales al traspaso.
              </p>
            )}

            <div className="space-y-3">
              {items.map((item, index) => {
                const disponible = getStockDisponible(item.material_id, item.material_codigo)
                const excede = item.cantidad > disponible

                return (
                  <div
                    key={index}
                    className="border rounded-md p-3 space-y-2 bg-gray-50"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <Label className="text-xs text-gray-500 mb-1 block">
                          Material
                        </Label>
                        <MaterialCombobox
                          materials={materiales}
                          value={item.material_codigo}
                          onValueChange={(val) =>
                            updateItem(index, "material_codigo", val)
                          }
                          placeholder="Buscar material..."
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-5 text-red-500 hover:text-red-700"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">
                          Cantidad *
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          max={disponible}
                          value={item.cantidad}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "cantidad",
                              Number(e.target.value),
                            )
                          }
                          className={excede ? "border-red-400" : ""}
                        />
                        <p
                          className={`text-xs mt-1 ${excede ? "text-red-500 font-medium" : "text-gray-400"}`}
                        >
                          Disponible: {disponible}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">
                          Ubicación (opcional)
                        </Label>
                        <Input
                          value={item.ubicacion_en_almacen}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "ubicacion_en_almacen",
                              e.target.value,
                            )
                          }
                          placeholder="Ej: Estante A"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Motivo y Referencia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Motivo</Label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo del traspaso..."
                rows={2}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Referencia
              </Label>
              <Input
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Documento, guía, etc."
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => resetAndClose(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRightLeft className="h-4 w-4 mr-2" />
              )}
              Solicitar Traspaso
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
