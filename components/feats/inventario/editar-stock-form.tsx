"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { Input } from "@/components/shared/molecule/input"
import { AlertCircle, Loader2, Save, X } from "lucide-react"
import type { Almacen, StockItem } from "@/lib/inventario-types"

interface EditarStockFormProps {
  almacen: Almacen
  item: StockItem
  onSubmit: (payload: { cantidad: number; motivo?: string; referencia?: string }) => Promise<void> | void
  onCancel: () => void
}

export function EditarStockForm({ almacen, item, onSubmit, onCancel }: EditarStockFormProps) {
  const [cantidad, setCantidad] = useState(String(item.cantidad))
  const [motivo, setMotivo] = useState("Ajuste manual de stock")
  const [referencia, setReferencia] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const cantidadActual = useMemo(() => Number(item.cantidad || 0), [item.cantidad])

  const validate = () => {
    if (cantidad.trim() === "") {
      setError("La cantidad es requerida")
      return false
    }

    const cantidadNum = Number(cantidad)
    if (!Number.isFinite(cantidadNum) || cantidadNum < 0) {
      setError("La cantidad debe ser un número mayor o igual a cero")
      return false
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
        cantidad: Number(cantidad),
        motivo: motivo.trim() || undefined,
        referencia: referencia.trim() || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo ajustar el stock")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Almacen</Label>
          <div className="rounded-md border px-3 py-2 text-sm text-gray-700 bg-gray-50">{almacen.nombre}</div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Código</Label>
            <div className="rounded-md border px-3 py-2 text-sm text-gray-700 bg-gray-50">{item.material_codigo}</div>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Unidad</Label>
            <div className="rounded-md border px-3 py-2 text-sm text-gray-700 bg-gray-50">{item.um || "-"}</div>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Material</Label>
          <div className="rounded-md border px-3 py-2 text-sm text-gray-700 bg-gray-50">
            {item.material_descripcion || "Sin descripción"}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Stock actual</Label>
            <div className="rounded-md border px-3 py-2 text-sm text-gray-700 bg-gray-50">{cantidadActual}</div>
          </div>
          <div>
            <Label htmlFor="editar-stock-cantidad" className="text-sm font-medium text-gray-700 mb-2 block">
              Nuevo stock *
            </Label>
            <Input
              id="editar-stock-cantidad"
              type="number"
              min="0"
              step="0.01"
              value={cantidad}
              onChange={(event) => setCantidad(event.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="editar-stock-motivo" className="text-sm font-medium text-gray-700 mb-2 block">
            Motivo
          </Label>
          <Input
            id="editar-stock-motivo"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            placeholder="Ajuste por conteo físico"
          />
        </div>

        <div>
          <Label htmlFor="editar-stock-referencia" className="text-sm font-medium text-gray-700 mb-2 block">
            Referencia
          </Label>
          <Input
            id="editar-stock-referencia"
            value={referencia}
            onChange={(event) => setReferencia(event.target.value)}
            placeholder="Documento o ticket"
          />
        </div>
      </div>

      {error ? (
        <div className="flex items-center text-red-600">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Ajustar stock
        </Button>
      </div>
    </form>
  )
}
