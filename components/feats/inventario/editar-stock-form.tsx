"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { Input } from "@/components/shared/molecule/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { AlertCircle, Loader2, Save, X } from "lucide-react"
import type { Almacen, StockItem } from "@/lib/inventario-types"
import {
  POOLS_STOCK,
  POOL_STOCK_LABELS,
  type PoolStockKey,
} from "@/lib/types/feats/inventario/inventario-types"

interface EditarStockFormProps {
  almacen: Almacen
  item: StockItem
  onSubmit: (payload: {
    cantidad: number
    pool: PoolStockKey
    motivo?: string
    referencia?: string
  }) => Promise<void> | void
  onCancel: () => void
}

const poolCantidad = (item: StockItem, pool: PoolStockKey): number =>
  Number((item as any).pools?.[pool]?.cantidad ?? 0)

export function EditarStockForm({ almacen, item, onSubmit, onCancel }: EditarStockFormProps) {
  const [pool, setPool] = useState<PoolStockKey>("indistinto")
  const [cantidad, setCantidad] = useState(String(poolCantidad(item, "indistinto")))
  const [motivo, setMotivo] = useState("Ajuste manual de stock")
  const [referencia, setReferencia] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const poolActual = useMemo(() => poolCantidad(item, pool), [item, pool])

  const handlePoolChange = (value: string) => {
    const next = value as PoolStockKey
    setPool(next)
    // Al cambiar de pool, el "nuevo stock" arranca en el valor actual de ese pool.
    setCantidad(String(poolCantidad(item, next)))
  }

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
        pool,
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

        {/* Distribución actual por pool (contexto para el ajuste). El ajuste solo
            modifica el pool seleccionado; los otros se conservan. */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Distribución actual por pool</Label>
          <div className="grid grid-cols-3 gap-2">
            {POOLS_STOCK.map((p) => (
              <div
                key={p}
                className={`rounded-md border px-2 py-1.5 text-center ${p === pool ? "border-blue-300 bg-blue-50" : "bg-gray-50"}`}
              >
                <div className="text-[11px] text-gray-500">{POOL_STOCK_LABELS[p]}</div>
                <div className="text-sm font-semibold text-gray-800">{poolCantidad(item, p)}</div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Total: {Number(item.cantidad || 0)} {item.um || ""}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Pool a ajustar *</Label>
            <Select value={pool} onValueChange={handlePoolChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el pool" />
              </SelectTrigger>
              <SelectContent>
                {POOLS_STOCK.map((p) => (
                  <SelectItem key={p} value={p}>
                    {POOL_STOCK_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="editar-stock-cantidad" className="text-sm font-medium text-gray-700 mb-2 block">
              Nuevo stock de {POOL_STOCK_LABELS[pool]} *
            </Label>
            <Input
              id="editar-stock-cantidad"
              type="number"
              min="0"
              step="0.01"
              value={cantidad}
              onChange={(event) => setCantidad(event.target.value)}
            />
            <p className="text-[11px] text-gray-400 mt-1">Actual en este pool: {poolActual}</p>
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
