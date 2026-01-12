"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Save, Plus, Trash2, AlertCircle, Loader2 } from "lucide-react"
import type { Material } from "@/lib/material-types"
import type { VentaCreateData, VentaItem } from "@/lib/inventario-types"
import { MaterialCombobox } from "@/components/feats/inventario/material-combobox"

interface VentaFormProps {
  tiendaId: string
  materiales: Material[]
  onSubmit: (data: VentaCreateData) => Promise<void> | void
}

interface VentaItemForm extends VentaItem {
  id: string
}

export function VentaForm({ tiendaId, materiales, onSubmit }: VentaFormProps) {
  const createItemId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID()
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  const [items, setItems] = useState<VentaItemForm[]>([
    { id: createItemId(), material_codigo: "", cantidad: 1 },
  ])
  const [referencia, setReferencia] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const materialesDisponibles = useMemo(() => materiales, [materiales])

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { id: createItemId(), material_codigo: "", cantidad: 1 },
    ])
  }

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleUpdateItem = (id: string, updates: Partial<VentaItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
  }

  const validate = () => {
    if (items.length === 0) {
      setError("Agrega al menos un material a la venta")
      return false
    }

    for (const item of items) {
      if (!item.material_codigo) {
        setError("Selecciona un material para cada item")
        return false
      }
      if (!item.cantidad || item.cantidad <= 0) {
        setError("La cantidad debe ser mayor a cero")
        return false
      }
    }

    setError(null)
    return true
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        tienda_id: tiendaId,
        referencia: referencia || undefined,
        items: items.map((item) => ({
          material_codigo: item.material_codigo,
          cantidad: item.cantidad,
        })),
      })
      setItems([{ id: createItemId(), material_codigo: "", cantidad: 1 }])
      setReferencia("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la venta")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="venta-referencia" className="text-sm font-medium text-gray-700 mb-2 block">
            Referencia (opcional)
          </Label>
          <Input
            id="venta-referencia"
            value={referencia}
            onChange={(event) => setReferencia(event.target.value)}
            placeholder="Factura, boleta, etc."
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-700">Items de venta</Label>
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
              <Plus className="h-4 w-4" />
              Agregar item
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-3 items-center">
                <MaterialCombobox
                  materials={materialesDisponibles}
                  value={item.material_codigo}
                  onValueChange={(value) => handleUpdateItem(item.id, { material_codigo: value })}
                  placeholder="Seleccionar material"
                />
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={item.cantidad}
                  onChange={(event) =>
                    handleUpdateItem(item.id, { cantidad: Number(event.target.value) })
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex items-center text-red-600">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Registrar venta
        </Button>
      </div>
    </form>
  )
}
