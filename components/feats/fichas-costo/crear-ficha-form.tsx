"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Loader2, Percent, Package, TrendingUp, Info, DollarSign } from "lucide-react"
import type { FichaCostoCreateData } from "@/lib/types/feats/fichas-costo/ficha-costo-types"

interface CrearFichaFormProps {
  materialId: string
  materialNombre: string
  materialPrecio?: number
  onSubmit: (data: FichaCostoCreateData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function CrearFichaForm({
  materialId,
  materialNombre,
  materialPrecio,
  onSubmit,
  onCancel,
  loading,
}: CrearFichaFormProps) {
  const [precioCosto, setPrecioCosto] = useState(materialPrecio != null ? materialPrecio.toFixed(2) : "")
  const [porcentaje, setPorcentaje] = useState("")

  useEffect(() => {
    setPrecioCosto(materialPrecio != null ? materialPrecio.toFixed(2) : "")
    setPorcentaje("")
  }, [materialId, materialPrecio])

  const costoBase = parseFloat(precioCosto) || 0
  const pct = parseFloat(porcentaje) || 0
  const precioCalculado = costoBase > 0 ? costoBase * (1 + pct / 100) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!precioCosto || costoBase <= 0 || !porcentaje || pct < 0) return
    await onSubmit({ material_id: materialId, precio_base: costoBase, porcentaje: pct })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Material info */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 flex items-start gap-2">
        <Package className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-teal-800 truncate">{materialNombre}</p>
          {materialPrecio != null && (
            <p className="text-xs text-teal-600 mt-0.5">
              Precio actual en catálogo: <span className="font-bold">${materialPrecio.toFixed(2)}</span>
            </p>
          )}
        </div>
      </div>

      {/* Costo base */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-sm font-semibold">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          Precio de costo del producto
        </Label>
        <div className="relative">
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="Ej: 1200"
            value={precioCosto}
            onChange={(e) => setPrecioCosto(e.target.value)}
            className="pr-14 text-lg font-semibold"
            required
            autoFocus
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">USD</span>
        </div>
      </div>

      {/* Porcentaje */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-sm font-semibold">
          <Percent className="h-4 w-4 text-amber-500" />
          % de incremento (transporte y extras)
        </Label>
        <div className="relative">
          <Input
            type="number"
            step="0.1"
            min="0"
            placeholder="Ej: 20"
            value={porcentaje}
            onChange={(e) => setPorcentaje(e.target.value)}
            className="pr-10 text-lg font-semibold"
            required
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">%</span>
        </div>
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Info className="h-3 w-3" />
          Este % se aplica al precio de costo. No se desglosa por conceptos.
        </p>
      </div>

      {/* Preview */}
      {precioCalculado !== null && pct > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vista previa</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[11px] text-gray-400">Costo base</p>
              <p className="text-sm font-bold text-gray-700">${costoBase.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">+ {pct}%</p>
              <p className="text-sm font-bold text-amber-600">+${(precioCalculado - costoBase).toFixed(2)}</p>
            </div>
            <div className="bg-teal-50 rounded-lg py-1">
              <p className="text-[11px] text-teal-600 flex items-center justify-center gap-0.5">
                <TrendingUp className="h-3 w-3" />
                Calculado
              </p>
              <p className="text-base font-bold text-teal-700">${precioCalculado.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 text-center">
            * El precio final será el mayor entre este y el de la ficha anterior (si existe)
          </p>
        </div>
      )}

      {/* Acciones */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading || !precioCosto || costoBase <= 0 || !porcentaje || pct < 0}
          className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Guardando...
            </>
          ) : (
            "Guardar Ficha"
          )}
        </Button>
      </div>
    </form>
  )
}
