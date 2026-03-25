"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import type { MaterialContabilidad } from "@/lib/types/feats/contabilidad/contabilidad-types"
import { ClipboardList, Plus, Search, Trash2 } from "lucide-react"

interface MaterialRow {
  material_id: string
  cantidad: number
  codigoContabilidad: string
  descripcion: string
  um: string
  stockDisponible: number
}

interface CrearTicketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materiales: MaterialContabilidad[]
  onSubmit: (materiales: { material_id: string; cantidad: number }[]) => Promise<void>
  loading?: boolean
}

export function CrearTicketDialog({
  open,
  onOpenChange,
  materiales,
  onSubmit,
  loading = false,
}: CrearTicketDialogProps) {
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([])
  const [materialSearch, setMaterialSearch] = useState("")
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filtrar materiales disponibles (no agregados aún)
  const filteredMateriales = useMemo(() => {
    const searchLower = materialSearch.toLowerCase()
    return materiales
      .filter((m) => !materialRows.some((row) => row.material_id === m.id))
      .filter(
        (m) =>
          m.codigoContabilidad.toLowerCase().includes(searchLower) ||
          m.descripcion.toLowerCase().includes(searchLower)
      )
      .slice(0, 20)
  }, [materialSearch, materiales, materialRows])

  const handleAddMaterial = (material: MaterialContabilidad) => {
    setMaterialRows((prev) => [
      ...prev,
      {
        material_id: material.id,
        cantidad: 1,
        codigoContabilidad: material.codigoContabilidad,
        descripcion: material.descripcion,
        um: material.um,
        stockDisponible: material.cantidadContabilidad,
      },
    ])
    setMaterialSearch("")
    setShowMaterialDropdown(false)
  }

  const handleRemoveMaterial = (index: number) => {
    setMaterialRows((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCantidadChange = (index: number, value: string) => {
    const cantidad = parseFloat(value) || 0
    setMaterialRows((prev) =>
      prev.map((item, i) => (i === index ? { ...item, cantidad } : item))
    )
  }

  const validMaterials = useMemo(
    () => materialRows.filter((m) => m.cantidad > 0 && m.cantidad <= m.stockDisponible),
    [materialRows]
  )

  const canSubmit = useMemo(() => {
    return validMaterials.length > 0 && !loading
  }, [validMaterials, loading])

  const handleSubmit = async () => {
    setError(null)

    if (!canSubmit) {
      setError("Debe agregar al menos un material con cantidad válida")
      return
    }

    // Validar que ninguna cantidad exceda el stock
    const invalidMaterials = materialRows.filter((m) => m.cantidad > m.stockDisponible)
    if (invalidMaterials.length > 0) {
      setError(
        `Stock insuficiente para: ${invalidMaterials.map((m) => m.codigoContabilidad).join(", ")}`
      )
      return
    }

    try {
      await onSubmit(
        validMaterials.map((m) => ({
          material_id: m.material_id,
          cantidad: m.cantidad,
        }))
      )
      // Limpiar y cerrar
      setMaterialRows([])
      setMaterialSearch("")
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear ticket")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            Crear Ticket de Salida
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Buscador de materiales */}
          <div className="space-y-2">
            <Label>Buscar Material</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por código o descripción..."
                value={materialSearch}
                onChange={(e) => {
                  setMaterialSearch(e.target.value)
                  setShowMaterialDropdown(e.target.value.length > 0)
                }}
                onFocus={() => setShowMaterialDropdown(materialSearch.length > 0)}
                className="pl-10"
              />

              {/* Dropdown de resultados */}
              {showMaterialDropdown && filteredMateriales.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg max-h-60 overflow-auto">
                  {filteredMateriales.map((material) => (
                    <button
                      key={material.id}
                      type="button"
                      onClick={() => handleAddMaterial(material)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{material.codigoContabilidad}</div>
                        <div className="text-sm text-gray-600">{material.descripcion}</div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Stock: {material.cantidadContabilidad.toFixed(2)} {material.um}
                      </div>
                      <Plus className="h-4 w-4 ml-2 text-blue-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tabla de materiales seleccionados */}
          {materialRows.length > 0 && (
            <div className="border rounded-md">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Código</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Descripción</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">U/M</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Stock</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Cantidad</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {materialRows.map((material, index) => {
                    const exceedsStock = material.cantidad > material.stockDisponible
                    return (
                      <tr
                        key={material.material_id}
                        className={exceedsStock ? "bg-red-50" : ""}
                      >
                        <td className="px-4 py-2 text-sm font-medium">
                          {material.codigoContabilidad}
                        </td>
                        <td className="px-4 py-2 text-sm">{material.descripcion}</td>
                        <td className="px-4 py-2 text-sm text-center">{material.um}</td>
                        <td className="px-4 py-2 text-sm text-center">
                          {material.stockDisponible.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max={material.stockDisponible}
                            value={material.cantidad}
                            onChange={(e) => handleCantidadChange(index, e.target.value)}
                            className={`w-24 ${exceedsStock ? "border-red-500" : ""}`}
                          />
                          {exceedsStock && (
                            <div className="text-xs text-red-600 mt-1">
                              Excede stock disponible
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMaterial(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {materialRows.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay materiales seleccionados. Use el buscador para agregar materiales.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {loading ? "Creando..." : "Crear Ticket"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
