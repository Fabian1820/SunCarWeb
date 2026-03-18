"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Loader2, Percent, Package, TrendingUp, DollarSign, Plus, Trash2, ShoppingCart, Receipt } from "lucide-react"
import type { FichaCostoCreateData, DesgloseMercanciaItem, DesgloseGastoItem } from "@/lib/types/feats/fichas-costo/ficha-costo-types"

interface CrearFichaFormProps {
  materialId: string
  materialNombre: string
  materialPrecio?: number
  onSubmit: (data: FichaCostoCreateData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const uid = () => Math.random().toString(36).slice(2)

function emptyMercancia(): DesgloseMercanciaItem & { _id: string } {
  return { _id: uid(), nombre: "", cantidad: 1, precio_unitario: 0, subtotal: 0 }
}

function emptyGasto(): DesgloseGastoItem & { _id: string } {
  return { _id: uid(), nombre: "", valor: 0 }
}

const fmt = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function CrearFichaForm({
  materialId,
  materialNombre,
  materialPrecio,
  onSubmit,
  onCancel,
  loading,
}: CrearFichaFormProps) {
  const [mercancia, setMercancia] = useState<(DesgloseMercanciaItem & { _id: string })[]>([emptyMercancia()])
  const [gastos, setGastos] = useState<(DesgloseGastoItem & { _id: string })[]>([emptyGasto()])

  useEffect(() => {
    setMercancia([emptyMercancia()])
    setGastos([emptyGasto()])
  }, [materialId])

  // ── Totales derivados ──
  const totalMercancia = mercancia.reduce((s, m) => s + m.subtotal, 0)
  const totalGastos = gastos.reduce((s, g) => s + g.valor, 0)
  const porcentaje = totalMercancia > 0 ? (totalGastos / totalMercancia) * 100 : 0
  const precioCalculado = totalMercancia > 0 ? totalMercancia * (1 + porcentaje / 100) : 0

  // ── Mercancía handlers ──
  const updateMercancia = (id: string, field: keyof DesgloseMercanciaItem, raw: string) => {
    setMercancia((prev) =>
      prev.map((m) => {
        if (m._id !== id) return m
        const next = { ...m, [field]: field === "nombre" ? raw : parseFloat(raw) || 0 }
        next.subtotal = next.cantidad * next.precio_unitario
        return next
      })
    )
  }

  const addMercancia = () => setMercancia((prev) => [...prev, emptyMercancia()])
  const removeMercancia = (id: string) =>
    setMercancia((prev) => (prev.length > 1 ? prev.filter((m) => m._id !== id) : prev))

  // ── Gastos handlers ──
  const updateGasto = (id: string, field: keyof DesgloseGastoItem, raw: string) => {
    setGastos((prev) =>
      prev.map((g) =>
        g._id !== id ? g : { ...g, [field]: field === "nombre" ? raw : parseFloat(raw) || 0 }
      )
    )
  }

  const addGasto = () => setGastos((prev) => [...prev, emptyGasto()])
  const removeGasto = (id: string) =>
    setGastos((prev) => (prev.length > 1 ? prev.filter((g) => g._id !== id) : prev))

  // ── Submit ──
  const canSubmit =
    totalMercancia > 0 &&
    mercancia.every((m) => m.nombre.trim() && m.cantidad > 0 && m.precio_unitario > 0) &&
    gastos.every((g) => g.nombre.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    await onSubmit({
      material_id: materialId,
      precio_base: totalMercancia,
      porcentaje,
      desglose: {
        mercancia: mercancia.map(({ _id, ...m }) => m),
        gastos: gastos.map(({ _id, ...g }) => g),
        total_mercancia: totalMercancia,
        total_gastos: totalGastos,
      },
    })
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

      {/* ── Mercancía ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5 text-sm font-semibold">
            <ShoppingCart className="h-4 w-4 text-blue-600" />
            Mercancía
          </Label>
          <Button type="button" variant="outline" size="sm" onClick={addMercancia} className="h-7 text-xs gap-1">
            <Plus className="h-3 w-3" /> Añadir fila
          </Button>
        </div>

        <div className="rounded-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_60px_80px_80px_28px] gap-1 bg-gray-50 px-2 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
            <span>Descripción</span>
            <span className="text-center">Cant.</span>
            <span className="text-center">P. Unit.</span>
            <span className="text-center">Subtotal</span>
            <span />
          </div>

          {mercancia.map((m) => (
            <div key={m._id} className="grid grid-cols-[1fr_60px_80px_80px_28px] gap-1 px-2 py-1.5 border-t border-gray-100 items-center">
              <Input
                value={m.nombre}
                onChange={(e) => updateMercancia(m._id, "nombre", e.target.value)}
                placeholder="Ej: Paneles solares"
                className="h-7 text-xs"
                required
              />
              <Input
                type="number"
                min="1"
                value={m.cantidad || ""}
                onChange={(e) => updateMercancia(m._id, "cantidad", e.target.value)}
                className="h-7 text-xs text-center"
                required
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={m.precio_unitario || ""}
                onChange={(e) => updateMercancia(m._id, "precio_unitario", e.target.value)}
                className="h-7 text-xs text-center"
                required
              />
              <span className="text-xs font-semibold text-gray-700 text-center">
                ${fmt(m.subtotal)}
              </span>
              <button
                type="button"
                onClick={() => removeMercancia(m._id)}
                className="text-gray-300 hover:text-red-400 transition-colors flex items-center justify-center"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          <div className="grid grid-cols-[1fr_60px_80px_80px_28px] gap-1 px-2 py-1.5 bg-blue-50 border-t border-blue-100">
            <span className="text-xs font-bold text-blue-700 col-span-3">Total mercancía</span>
            <span className="text-xs font-bold text-blue-700 text-center">${fmt(totalMercancia)}</span>
            <span />
          </div>
        </div>
      </div>

      {/* ── Gastos adicionales ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5 text-sm font-semibold">
            <Receipt className="h-4 w-4 text-amber-500" />
            Gastos adicionales
          </Label>
          <Button type="button" variant="outline" size="sm" onClick={addGasto} className="h-7 text-xs gap-1">
            <Plus className="h-3 w-3" /> Añadir fila
          </Button>
        </div>

        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_28px] gap-1 bg-gray-50 px-2 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
            <span>Concepto</span>
            <span className="text-center">Valor</span>
            <span />
          </div>

          {gastos.map((g) => (
            <div key={g._id} className="grid grid-cols-[1fr_100px_28px] gap-1 px-2 py-1.5 border-t border-gray-100 items-center">
              <Input
                value={g.nombre}
                onChange={(e) => updateGasto(g._id, "nombre", e.target.value)}
                placeholder="Ej: Transporte"
                className="h-7 text-xs"
                required
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={g.valor || ""}
                onChange={(e) => updateGasto(g._id, "valor", e.target.value)}
                className="h-7 text-xs text-center"
              />
              <button
                type="button"
                onClick={() => removeGasto(g._id)}
                className="text-gray-300 hover:text-red-400 transition-colors flex items-center justify-center"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          <div className="grid grid-cols-[1fr_100px_28px] gap-1 px-2 py-1.5 bg-amber-50 border-t border-amber-100">
            <span className="text-xs font-bold text-amber-700">Total gastos</span>
            <span className="text-xs font-bold text-amber-700 text-center">${fmt(totalGastos)}</span>
            <span />
          </div>
        </div>
      </div>

      {/* ── Resumen calculado ── */}
      {totalMercancia > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Resumen</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <DollarSign className="h-4 w-4 text-blue-500 mx-auto mb-0.5" />
              <p className="text-[11px] text-gray-400">Precio base</p>
              <p className="text-sm font-bold text-gray-700">${fmt(totalMercancia)}</p>
            </div>
            <div>
              <Percent className="h-4 w-4 text-amber-500 mx-auto mb-0.5" />
              <p className="text-[11px] text-gray-400">% gastos</p>
              <p className="text-sm font-bold text-amber-600">{porcentaje.toFixed(2)}%</p>
            </div>
            <div className="bg-teal-50 rounded-lg py-1">
              <TrendingUp className="h-4 w-4 text-teal-600 mx-auto mb-0.5" />
              <p className="text-[11px] text-teal-500">Precio calculado</p>
              <p className="text-base font-bold text-teal-700">${fmt(precioCalculado)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading || !canSubmit}
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
