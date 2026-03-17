"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Input } from "@/components/shared/molecule/input"
import { Badge } from "@/components/shared/atom/badge"
import {
  Calculator,
  Package,
  Plus,
  Trash2,
  Search,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Percent,
  X,
  ShoppingCart,
  Receipt,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/shared/molecule/tooltip"
import type { MaterialFichaResumen } from "@/lib/types/feats/fichas-costo/ficha-costo-types"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductoItem {
  id: string
  material: MaterialFichaResumen
  precio: number
  cantidad: number
}

interface CostoItem {
  id: string
  nombre: string
  valor: number
}

interface CalcPorcentajeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materiales: MaterialFichaResumen[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2)

const getMaterialName = (m: MaterialFichaResumen): string =>
  m.descripcion || m.nombre || (m.codigo ? String(m.codigo) : "") || "—"

const fmt = (n: number) =>
  n.toLocaleString("es-CU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ─── Local search panel ────────────────────────────────────────────────────────

function MaterialSearchPanel({
  materiales,
  onAdd,
}: {
  materiales: MaterialFichaResumen[]
  onAdd: (m: MaterialFichaResumen) => void
}) {
  const [query, setQuery] = useState("")

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return materiales
      .filter((m) => {
        const name = getMaterialName(m).toLowerCase()
        const cat = (m.categoria || "").toLowerCase()
        const marca = (m.marca || "").toLowerCase()
        const cod = String(m.codigo || "").toLowerCase()
        return name.includes(q) || cat.includes(q) || marca.includes(q) || cod.includes(q)
      })
      .slice(0, 40)
  }, [query, materiales])

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, categoría, código..."
          className="pl-9 h-8 text-sm"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {query.trim().length >= 2 && (
        <div className="border rounded-md bg-white max-h-48 overflow-y-auto shadow-sm">
          {results.length === 0 ? (
            <p className="text-center py-6 text-xs text-gray-400">Sin resultados</p>
          ) : (
            <div className="divide-y">
              {results.map((m) => {
                const name = getMaterialName(m)
                return (
                  <button
                    key={m.material_id}
                    onClick={() => { onAdd(m); setQuery("") }}
                    className="w-full text-left px-3 py-2 hover:bg-teal-50 transition-colors flex items-center gap-2.5"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                      {m.foto
                        ? <img src={m.foto} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
                        : <Package className="h-3.5 w-3.5 text-gray-300" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-900 truncate">{name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {m.marca && <span className="text-[10px] text-blue-600">{m.marca}</span>}
                        {m.categoria && <span className="text-[10px] text-gray-400">{m.categoria}</span>}
                      </div>
                    </div>
                    {m.precio != null && (
                      <span className="text-xs font-semibold text-teal-700 flex-shrink-0">${fmt(m.precio)}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function CalcPorcentajeDialog({ open, onOpenChange, materiales }: CalcPorcentajeDialogProps) {
  const [modoMercancia, setModoMercancia] = useState<"productos" | "total">("productos")
  const [productos, setProductos] = useState<ProductoItem[]>([])
  const [totalManual, setTotalManual] = useState("")
  const [costos, setCostos] = useState<CostoItem[]>([{ id: uid(), nombre: "", valor: 0 }])
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    if (!open) {
      setModoMercancia("productos")
      setProductos([])
      setTotalManual("")
      setCostos([{ id: uid(), nombre: "", valor: 0 }])
      setShowSearch(false)
    }
  }, [open])

  // ── Mercancía ──
  const totalMercancia =
    modoMercancia === "total"
      ? parseFloat(totalManual) || 0
      : productos.reduce((s, p) => s + p.precio * p.cantidad, 0)

  const addProducto = useCallback((m: MaterialFichaResumen) => {
    setProductos((prev) => {
      const existing = prev.find((p) => p.material.material_id === m.material_id)
      if (existing) {
        return prev.map((p) => p.id === existing.id ? { ...p, cantidad: p.cantidad + 1 } : p)
      }
      return [...prev, { id: uid(), material: m, precio: m.precio ?? 0, cantidad: 1 }]
    })
    setShowSearch(false)
  }, [])

  const removeProducto = (id: string) => setProductos((p) => p.filter((x) => x.id !== id))

  const updateProducto = (id: string, field: "precio" | "cantidad", val: number) =>
    setProductos((p) => p.map((x) => (x.id === id ? { ...x, [field]: Math.max(field === "cantidad" ? 1 : 0, val) } : x)))

  // ── Costos ──
  const totalCostos = costos.reduce((s, c) => s + (c.valor || 0), 0)

  const addCosto = () => setCostos((c) => [...c, { id: uid(), nombre: "", valor: 0 }])
  const removeCosto = (id: string) => setCostos((c) => c.filter((x) => x.id !== id))
  const updateCosto = (id: string, field: "nombre" | "valor", val: string | number) =>
    setCostos((c) => c.map((x) => (x.id === id ? { ...x, [field]: val } : x)))

  // ── Result ──
  const porcentaje = totalMercancia > 0 ? (totalCostos / totalMercancia) * 100 : 0
  const precioFinal = totalMercancia + totalCostos

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="bg-teal-100 p-1.5 rounded-md">
              <Calculator className="h-4 w-4 text-teal-700" />
            </div>
            Calculadora de porcentaje de costos
          </DialogTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            Calcula qué porcentaje representan tus costos sobre el valor total de la mercancía
          </p>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* ── Panel izquierdo: Mercancía ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-teal-600" />
                  <h3 className="font-semibold text-gray-800 text-sm">Mercancía</h3>
                </div>
                <button
                  onClick={() => setModoMercancia(m => m === "productos" ? "total" : "productos")}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-teal-700 transition-colors border border-gray-200 rounded-full px-2.5 py-1 hover:border-teal-300 bg-white"
                >
                  {modoMercancia === "productos"
                    ? <><ToggleLeft className="h-3.5 w-3.5" /> Por productos</>
                    : <><ToggleRight className="h-3.5 w-3.5 text-teal-600" /> Total directo</>
                  }
                </button>
              </div>

              {modoMercancia === "total" ? (
                <div className="border border-gray-200 rounded-lg p-4 space-y-2 bg-gray-50">
                  <label className="text-xs font-medium text-gray-600">Valor total de la mercancía ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={totalManual}
                      onChange={(e) => setTotalManual(e.target.value)}
                      placeholder="0.00"
                      className="pl-9 text-lg font-semibold"
                    />
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <div className="px-3 py-2 border-b border-gray-200 bg-white">
                    <button
                      onClick={() => setShowSearch((s) => !s)}
                      className="flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-800 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Agregar producto
                    </button>
                  </div>

                  {showSearch && (
                    <div className="p-3 border-b border-gray-200 bg-white">
                      <MaterialSearchPanel materiales={materiales} onAdd={addProducto} />
                    </div>
                  )}

                  {productos.length === 0 ? (
                    <div className="text-center py-10">
                      <Package className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">Agrega productos para calcular el total</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                      {productos.map((p) => {
                        const name = getMaterialName(p.material)
                        const subtotal = p.precio * p.cantidad
                        return (
                          <div key={p.id} className="px-3 py-2.5 flex items-center gap-2 bg-white hover:bg-gray-50">
                            <div className="flex-shrink-0 w-8 h-8 rounded bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                              {p.material.foto
                                ? <img src={p.material.foto} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
                                : <Package className="h-3.5 w-3.5 text-gray-300" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-xs font-medium text-gray-800 truncate cursor-default">{name}</p>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs text-xs">{name}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {p.material.marca && <p className="text-[10px] text-gray-400">{p.material.marca}</p>}
                            </div>
                            {/* Qty */}
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => updateProducto(p.id, "cantidad", p.cantidad - 1)}
                                disabled={p.cantidad <= 1}
                                className="w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 text-xs font-bold flex-shrink-0"
                              >−</button>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={p.cantidad}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value)
                                  if (!isNaN(v) && v >= 1) updateProducto(p.id, "cantidad", v)
                                }}
                                className="w-14 text-center text-xs font-semibold text-gray-800 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-400 py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                onClick={() => updateProducto(p.id, "cantidad", p.cantidad + 1)}
                                className="w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 text-xs font-bold flex-shrink-0"
                              >+</button>
                            </div>
                            {/* Price */}
                            <div className="w-20">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={p.precio === 0 ? "" : p.precio}
                                  onChange={(e) => updateProducto(p.id, "precio", parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="w-full pl-5 pr-1 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white"
                                />
                              </div>
                            </div>
                            {/* Subtotal */}
                            <div className="w-16 text-right">
                              <span className="text-xs font-semibold text-teal-700">${fmt(subtotal)}</span>
                            </div>
                            <button
                              onClick={() => removeProducto(p.id)}
                              className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {productos.length > 0 && (
                    <div className="px-3 py-2 border-t border-gray-200 bg-teal-50 flex items-center justify-between">
                      <span className="text-xs text-teal-700 font-medium">{productos.length} producto(s)</span>
                      <span className="text-sm font-bold text-teal-800">${fmt(totalMercancia)}</span>
                    </div>
                  )}
                </div>
              )}

              {(modoMercancia === "total" || productos.length > 0) && (
                <div className="flex items-center justify-between rounded-lg bg-teal-50 border border-teal-200 px-4 py-2.5">
                  <span className="text-sm text-teal-700 font-medium">Total mercancía</span>
                  <span className="text-lg font-bold text-teal-900">${fmt(totalMercancia)}</span>
                </div>
              )}
            </div>

            {/* ── Panel derecho: Costos ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-orange-500" />
                  <h3 className="font-semibold text-gray-800 text-sm">Costos adicionales</h3>
                </div>
                <Badge className="bg-orange-50 text-orange-700 text-xs">{costos.filter(c => c.nombre || c.valor).length} ítem(s)</Badge>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Concepto</span>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide text-right w-24">Valor ($)</span>
                  <span className="w-5" />
                </div>

                <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto bg-white">
                  {costos.map((c, i) => (
                    <div key={c.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center px-3 py-2 hover:bg-gray-50">
                      <input
                        type="text"
                        value={c.nombre}
                        onChange={(e) => updateCosto(c.id, "nombre", e.target.value)}
                        placeholder={`Costo ${i + 1} (ej: flete, seguro...)`}
                        className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-400 placeholder:text-gray-300"
                      />
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={c.valor === 0 ? "" : c.valor}
                          onChange={(e) => updateCosto(c.id, "valor", parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full pl-5 pr-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-orange-400"
                        />
                      </div>
                      <button
                        onClick={() => removeCosto(c.id)}
                        disabled={costos.length === 1}
                        className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
                  <button
                    onClick={addCosto}
                    className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar costo
                  </button>
                </div>
              </div>

              {costos.some(c => c.valor > 0) && totalMercancia > 0 && (
                <div className="space-y-1">
                  {costos.filter(c => c.valor > 0).map((c) => {
                    const pct = (c.valor / totalMercancia) * 100
                    return (
                      <div key={c.id} className="flex items-center justify-between px-3 py-1.5 rounded bg-orange-50 text-xs">
                        <span className="text-gray-700 truncate max-w-[55%]">{c.nombre || "Sin nombre"}</span>
                        <div className="flex items-center gap-3 text-right">
                          <span className="text-gray-600">${fmt(c.valor)}</span>
                          <span className="text-orange-600 font-semibold w-12">{pct.toFixed(2)}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg bg-orange-50 border border-orange-200 px-4 py-2.5">
                <span className="text-sm text-orange-700 font-medium">Total costos</span>
                <span className="text-lg font-bold text-orange-900">${fmt(totalCostos)}</span>
              </div>
            </div>
          </div>

          {/* ── Result panel ── */}
          <div className="mx-5 mb-5">
            <div className={`rounded-xl border-2 p-5 transition-colors ${
              porcentaje > 0
                ? "border-teal-300 bg-gradient-to-br from-teal-50 to-emerald-50"
                : "border-gray-200 bg-gray-50"
            }`}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div className="sm:col-span-2 flex items-center gap-3 flex-wrap">
                  <div className="text-center px-3 py-2 bg-white rounded-lg border border-gray-200 min-w-[90px]">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Total costos</p>
                    <p className="text-sm font-bold text-orange-700">${fmt(totalCostos)}</p>
                  </div>
                  <span className="text-lg text-gray-400 font-light">÷</span>
                  <div className="text-center px-3 py-2 bg-white rounded-lg border border-gray-200 min-w-[90px]">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Total mercancía</p>
                    <p className="text-sm font-bold text-teal-700">${fmt(totalMercancia)}</p>
                  </div>
                  <span className="text-lg text-gray-400 font-light">× 100 =</span>
                  {totalMercancia > 0 && (
                    <div className="text-center px-3 py-2 bg-white rounded-lg border border-gray-200 min-w-[90px]">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Precio final</p>
                      <p className="text-sm font-bold text-gray-700">${fmt(precioFinal)}</p>
                    </div>
                  )}
                </div>

                <div className="text-center sm:text-right">
                  {totalMercancia === 0 ? (
                    <div className="text-gray-400">
                      <Percent className="h-8 w-8 mx-auto sm:ml-auto sm:mr-0 mb-1 opacity-30" />
                      <p className="text-xs">Ingresa datos para calcular</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] font-semibold text-teal-700 uppercase tracking-wider mb-1">
                        Porcentaje a aplicar
                      </p>
                      <div className={`text-5xl font-black tabular-nums ${porcentaje > 0 ? "text-teal-800" : "text-gray-400"}`}>
                        {porcentaje.toFixed(2)}
                        <span className="text-2xl ml-1">%</span>
                      </div>
                      <p className="text-[10px] text-teal-600 mt-1">
                        Los costos representan este % de la mercancía
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
