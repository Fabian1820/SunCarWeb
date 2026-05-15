"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Badge } from "@/components/shared/atom/badge"
import {
  Search,
  Loader2,
  Package,
  Boxes,
  Warehouse,
  AlertTriangle,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { InventarioService, MaterialService, MarcaService } from "@/lib/api-services"
import type { Almacen, StockItem } from "@/lib/inventario-types"

interface StockComparison {
  almacen_id: string
  almacen_nombre: string
  cantidad: number
  bajo_minimo: boolean
}

interface MaterialBuscable {
  material_id: string
  codigo: string
  nombre?: string
  descripcion?: string
  categoria?: string
  marca?: string
  numero_serie?: string | null
  stockaje_minimo?: number | null
  foto?: string
}

interface StockajesMinimosSectionProps {
  /**
   * Si `defaultCollapsed` es true, el contenido aparece plegado y los datos
   * (catálogo, marcas, almacenes) se cargan en la primera expansión.
   */
  defaultCollapsed?: boolean
}

export function StockajesMinimosSection({
  defaultCollapsed = true,
}: StockajesMinimosSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  // Catálogo (lazy)
  const [materiales, setMateriales] = useState<MaterialBuscable[]>([])
  const [catalogoLoading, setCatalogoLoading] = useState(false)
  const catalogoLoadedRef = useRef(false)

  // Búsqueda
  const [materialSearch, setMaterialSearch] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialBuscable | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  // Almacenes
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [almacenesLoading, setAlmacenesLoading] = useState(false)
  const [selectedAlmacenIds, setSelectedAlmacenIds] = useState<Set<string>>(new Set())

  // Comparación
  const [comparaciones, setComparaciones] = useState<StockComparison[]>([])
  const [comparingLoading, setComparingLoading] = useState(false)

  // Carga lazy: catálogo de materiales + marcas + almacenes al primer expand.
  useEffect(() => {
    if (collapsed || catalogoLoadedRef.current) return
    catalogoLoadedRef.current = true

    let cancelled = false
    setCatalogoLoading(true)
    setAlmacenesLoading(true)

    Promise.all([
      MaterialService.getAllMaterials().catch(() => []),
      MarcaService.getMarcasSimplificadas().catch(() => []),
      InventarioService.getAlmacenes().catch(() => []),
    ])
      .then(([materialsRaw, marcas, almacenesRaw]) => {
        if (cancelled) return
        const marcaPorId = new Map<string, string>()
        for (const m of marcas as Array<{ id: string; nombre: string }>) {
          if (m?.id) marcaPorId.set(m.id, m.nombre)
        }
        const mapped: MaterialBuscable[] = []
        for (const m of materialsRaw as any[]) {
          const material_id = m?.id || m?.material_id || m?._id
          if (!material_id) continue
          mapped.push({
            material_id: String(material_id),
            codigo: String(m?.codigo ?? ""),
            nombre: m?.nombre,
            descripcion: m?.descripcion,
            categoria: m?.categoria,
            marca: m?.marca_id ? marcaPorId.get(m.marca_id) : undefined,
            numero_serie: m?.numero_serie ?? null,
            stockaje_minimo:
              typeof m?.stockaje_minimo === "number" ? m.stockaje_minimo : null,
            foto: m?.foto,
          })
        }
        setMateriales(mapped)

        const lista = (Array.isArray(almacenesRaw) ? almacenesRaw : []).filter(
          (a) => a.id && a.activo !== false,
        )
        setAlmacenes(lista)
      })
      .finally(() => {
        if (!cancelled) {
          setCatalogoLoading(false)
          setAlmacenesLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [collapsed])

  // Filtro local del buscador
  const materialResults = useMemo<MaterialBuscable[]>(() => {
    const term = materialSearch.trim().toLowerCase()
    if (term.length < 2) return []
    if (selectedMaterial) {
      const sel = (selectedMaterial.nombre || selectedMaterial.descripcion || "").toLowerCase()
      if (term === sel) return []
    }
    const matches = materiales.filter((m) => {
      const nombre = (m.nombre || m.descripcion || "").toLowerCase()
      const codigo = String(m.codigo ?? "").toLowerCase()
      const marca = (m.marca || "").toLowerCase()
      const categoria = (m.categoria || "").toLowerCase()
      const serie = typeof m.numero_serie === "string" ? m.numero_serie.toLowerCase() : ""
      return (
        nombre.includes(term) ||
        codigo.includes(term) ||
        marca.includes(term) ||
        categoria.includes(term) ||
        (!!serie && serie.includes(term))
      )
    })
    return matches.slice(0, 25)
  }, [materialSearch, materiales, selectedMaterial])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Carga comparación al cambiar material o almacenes
  useEffect(() => {
    const materialId = selectedMaterial?.material_id
    if (!materialId || selectedAlmacenIds.size === 0) {
      setComparaciones([])
      return
    }
    let cancelled = false
    setComparingLoading(true)

    const stockMin = selectedMaterial?.stockaje_minimo
    const tieneMinimo = typeof stockMin === "number"

    InventarioService.getStock({ material_id: String(materialId), limit: 1000 })
      .then(({ data: stockItems }) => {
        if (cancelled) return
        const stockMap = new Map<string, number>()
        for (const s of stockItems as StockItem[]) {
          if (s.almacen_id) {
            stockMap.set(
              String(s.almacen_id),
              (stockMap.get(String(s.almacen_id)) ?? 0) + (s.cantidad ?? 0),
            )
          }
        }

        const result: StockComparison[] = []
        for (const a of almacenes) {
          if (!a.id || !selectedAlmacenIds.has(a.id)) continue
          const cantidad = stockMap.get(a.id) ?? 0
          result.push({
            almacen_id: a.id,
            almacen_nombre: a.nombre,
            cantidad,
            bajo_minimo: tieneMinimo && cantidad <= (stockMin as number),
          })
        }
        result.sort(
          (x, y) =>
            Number(y.bajo_minimo) - Number(x.bajo_minimo) ||
            x.almacen_nombre.localeCompare(y.almacen_nombre),
        )
        setComparaciones(result)
      })
      .catch(() => {
        if (!cancelled) setComparaciones([])
      })
      .finally(() => {
        if (!cancelled) setComparingLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedMaterial, selectedAlmacenIds, almacenes])

  const handleSelectMaterial = (m: MaterialBuscable) => {
    setSelectedMaterial(m)
    setMaterialSearch(m.nombre || m.descripcion || String(m.codigo || ""))
    setShowDropdown(false)
  }

  const handleClearMaterial = () => {
    setSelectedMaterial(null)
    setMaterialSearch("")
    setComparaciones([])
  }

  const handleToggleAlmacen = (id: string) => {
    setSelectedAlmacenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleToggleAllAlmacenes = () => {
    if (selectedAlmacenIds.size === almacenes.length) {
      setSelectedAlmacenIds(new Set())
    } else {
      setSelectedAlmacenIds(new Set(almacenes.map((a) => a.id!).filter(Boolean)))
    }
  }

  const stockMinimoMaterial = selectedMaterial?.stockaje_minimo

  const alertas = useMemo(
    () => comparaciones.filter((c) => c.bajo_minimo).length,
    [comparaciones],
  )

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardContent className="p-0">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="w-full flex items-center justify-between p-4 border-b border-gray-100 hover:bg-amber-50/40 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-amber-600" />
            <div>
              <h2 className="font-semibold text-gray-900">Stockajes Mínimos</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Compara el stock de un material contra su mínimo en cada almacén
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {alertas > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {alertas} bajo mínimo
              </Badge>
            )}
            {collapsed ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </button>

        {!collapsed && (
          <div className="p-4 space-y-4">
            {catalogoLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Cargando catálogo de materiales...
              </div>
            )}

            {/* Buscador de material */}
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                Material
              </label>
              <div className="relative" ref={dropdownRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, código o número de serie..."
                  value={materialSearch}
                  onChange={(e) => {
                    setMaterialSearch(e.target.value)
                    setShowDropdown(true)
                    if (selectedMaterial) setSelectedMaterial(null)
                  }}
                  onFocus={() => {
                    if (materialResults.length > 0) setShowDropdown(true)
                  }}
                  className="pl-10 pr-10 h-10"
                  disabled={catalogoLoading}
                />
                {selectedMaterial && (
                  <button
                    type="button"
                    onClick={handleClearMaterial}
                    title="Limpiar selección"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {showDropdown && materialResults.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
                    {materialResults.map((m) => (
                      <button
                        key={m.material_id || String(m.codigo)}
                        type="button"
                        onClick={() => handleSelectMaterial(m)}
                        className="w-full text-left px-3 py-2 hover:bg-amber-50 flex items-center gap-2 border-b border-gray-50 last:border-0"
                      >
                        {m.foto ? (
                          <img
                            src={m.foto}
                            alt={m.nombre || m.descripcion || ""}
                            className="h-8 w-8 rounded object-cover border border-gray-200 flex-shrink-0"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).style.display = "none"
                            }}
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                            <Package className="h-3.5 w-3.5 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm">
                            {m.nombre || m.descripcion || "Sin nombre"}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 truncate">
                            {m.codigo != null && <span className="font-mono">{m.codigo}</span>}
                            {m.numero_serie && <span>· N/S: {m.numero_serie}</span>}
                            {typeof m.stockaje_minimo === "number" && (
                              <span className="text-amber-700 font-medium">
                                · Mín: {m.stockaje_minimo}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown &&
                  materialSearch.trim().length >= 2 &&
                  materialResults.length === 0 &&
                  !catalogoLoading && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-xs text-gray-500">
                      Sin resultados.
                    </div>
                  )}
              </div>
            </div>

            {/* Material seleccionado */}
            {selectedMaterial && (
              <div className="flex items-center gap-3 p-3 rounded-md border border-amber-200 bg-amber-50/40">
                {selectedMaterial.foto ? (
                  <img
                    src={selectedMaterial.foto}
                    alt={selectedMaterial.nombre || selectedMaterial.descripcion}
                    className="h-12 w-12 rounded object-cover border border-amber-200 bg-white flex-shrink-0"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = "none"
                    }}
                  />
                ) : (
                  <div className="h-12 w-12 rounded bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
                    <Package className="h-5 w-5 text-amber-700" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {selectedMaterial.nombre || selectedMaterial.descripcion || "Material"}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {selectedMaterial.codigo && (
                      <Badge variant="outline" className="bg-white text-gray-700 border-gray-300 text-[11px] font-mono">
                        {selectedMaterial.codigo}
                      </Badge>
                    )}
                    {selectedMaterial.categoria && (
                      <Badge className="bg-blue-50 text-blue-700 text-[11px]">{selectedMaterial.categoria}</Badge>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[11px] uppercase text-gray-500 tracking-wide">Stock mínimo</p>
                  <p className="text-2xl font-bold text-amber-700 leading-none">
                    {typeof stockMinimoMaterial === "number" ? stockMinimoMaterial : "—"}
                  </p>
                  {typeof stockMinimoMaterial !== "number" && (
                    <p className="text-[10px] text-gray-400 mt-1">No definido</p>
                  )}
                </div>
              </div>
            )}

            {/* Selector de almacenes */}
            {selectedMaterial && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-700">
                    Almacenes a comparar
                  </label>
                  {almacenes.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleAllAlmacenes}
                      className="text-xs text-amber-700 hover:underline"
                    >
                      {selectedAlmacenIds.size === almacenes.length ? "Quitar todos" : "Seleccionar todos"}
                    </button>
                  )}
                </div>
                {almacenesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Cargando almacenes...
                  </div>
                ) : almacenes.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay almacenes disponibles.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {almacenes.map((a) => {
                      const id = a.id!
                      const active = selectedAlmacenIds.has(id)
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleToggleAlmacen(id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors ${
                            active
                              ? "bg-amber-100 border-amber-300 text-amber-800"
                              : "bg-white border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-700"
                          }`}
                        >
                          <Warehouse className="h-3 w-3" />
                          {a.nombre}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tabla de comparación */}
            {selectedMaterial && selectedAlmacenIds.size > 0 && (
              <div className="border border-gray-200 rounded-md overflow-hidden">
                {comparingLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Comparando stock...
                  </div>
                ) : comparaciones.length === 0 ? (
                  <p className="text-sm text-gray-500 py-6 text-center">
                    Sin datos para comparar.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Almacén</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Stock actual</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Stock mínimo</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Diferencia</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparaciones.map((c) => {
                        const tieneMin = typeof stockMinimoMaterial === "number"
                        const minimo = tieneMin ? (stockMinimoMaterial as number) : null
                        const diferencia = tieneMin ? c.cantidad - (minimo as number) : null
                        return (
                          <tr
                            key={c.almacen_id}
                            className={`border-b border-gray-100 last:border-0 ${
                              c.bajo_minimo ? "bg-red-50/60" : ""
                            }`}
                          >
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <Warehouse className="h-3.5 w-3.5 text-gray-400" />
                                <span className="font-medium text-gray-900">{c.almacen_nombre}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className={`font-bold ${c.bajo_minimo ? "text-red-700" : "text-gray-900"}`}>
                                {c.cantidad}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-gray-700">
                              {minimo != null ? minimo : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {diferencia == null ? (
                                <span className="text-gray-400">—</span>
                              ) : (
                                <span className={diferencia < 0 ? "text-red-700 font-semibold" : diferencia === 0 ? "text-amber-700 font-semibold" : "text-emerald-700 font-medium"}>
                                  {diferencia > 0 ? `+${diferencia}` : diferencia}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {!tieneMin ? (
                                <Badge className="bg-gray-100 text-gray-500 border-gray-200 text-xs">
                                  Sin mínimo
                                </Badge>
                              ) : c.bajo_minimo ? (
                                <Badge className="bg-red-100 text-red-700 border-red-200 text-xs gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Bajo mínimo
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  OK
                                </Badge>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {!selectedMaterial && !catalogoLoading && (
              <p className="text-xs text-gray-400 text-center py-2">
                Selecciona un material para comenzar la comparación.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
