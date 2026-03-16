"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Card, CardContent } from "@/components/shared/molecule/card"
import {
  FileSpreadsheet,
  Package,
  Search,
  AlertCircle,
  Loader2,
  RefreshCcw,
  DollarSign,
  CalendarDays,
  TrendingUp,
  CheckSquare,
  Square,
  Percent,
  Zap,
  X,
  Eye,
} from "lucide-react"
import { Input } from "@/components/shared/molecule/input"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { RouteGuard } from "@/components/auth/route-guard"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { useFichasCosto } from "@/hooks/use-fichas-costo"
import { FichaDetalleCard } from "@/components/feats/fichas-costo/ficha-detalle-card"
import { ComparacionDialog } from "@/components/feats/fichas-costo/comparacion-dialog"
import { HistorialDialog } from "@/components/feats/fichas-costo/historial-dialog"
import type { MaterialFichaResumen } from "@/lib/types/feats/fichas-costo/ficha-costo-types"

const formatDate = (value: string) => {
  if (!value) return "-"
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return d.toLocaleDateString("es-CU", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function FichasCostoPage() {
  return (
    <RouteGuard requiredModule="fichas-costo">
      <FichasCostoPageContent />
    </RouteGuard>
  )
}

function FichasCostoPageContent() {
  const { toast } = useToast()
  const {
    fichaActiva,
    historial,
    comparacion,
    resumen,
    loading,
    loadingAction,
    loadingResumen,
    loadingBulk,
    error,
    crearBulk,
    cargarFichaActiva,
    cargarHistorial,
    compararPrecio,
    aplicarPrecio,
    loadResumen,
    limpiarEstado,
  } = useFichasCosto()

  // Multi-select state
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [porcentajeBulk, setPorcentajeBulk] = useState("")

  // Detail panel state
  const [materialDetalle, setMaterialDetalle] = useState<MaterialFichaResumen | null>(null)
  const [isComparacionOpen, setIsComparacionOpen] = useState(false)
  const [isHistorialOpen, setIsHistorialOpen] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const detailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void loadResumen()
  }, [loadResumen])

  // Sorted: with ficha first (desc date), then without
  const resumenOrdenado = useMemo(() => {
    const conFicha = resumen
      .filter((r) => r.ficha_activa !== null)
      .sort((a, b) => {
        const da = new Date(a.ficha_activa!.vigente_desde).getTime()
        const db = new Date(b.ficha_activa!.vigente_desde).getTime()
        return db - da
      })
    const sinFicha = resumen.filter((r) => r.ficha_activa === null)
    return [...conFicha, ...sinFicha]
  }, [resumen])

  const resumenFiltrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return resumenOrdenado
    return resumenOrdenado.filter((r) => {
      const nombre = (r.nombre || r.descripcion || "").toLowerCase()
      const codigo = String(r.codigo || "").toLowerCase()
      const categoria = (r.categoria || "").toLowerCase()
      const marca = (r.marca || "").toLowerCase()
      return nombre.includes(q) || codigo.includes(q) || categoria.includes(q) || marca.includes(q)
    })
  }, [resumenOrdenado, busqueda])

  // ── Selection helpers ──
  const toggleSeleccion = (materialId: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(materialId)) next.delete(materialId)
      else next.add(materialId)
      return next
    })
  }

  const toggleTodos = () => {
    if (seleccionados.size === resumenFiltrado.length) {
      setSeleccionados(new Set())
    } else {
      setSeleccionados(new Set(resumenFiltrado.map((r) => r.material_id)))
    }
  }

  const limpiarSeleccion = () => setSeleccionados(new Set())

  const todosSeleccionados =
    resumenFiltrado.length > 0 && seleccionados.size === resumenFiltrado.length
  const algunoSeleccionado = seleccionados.size > 0
  const pct = parseFloat(porcentajeBulk) || 0

  // ── Bulk create ──
  const handleCrearBulk = async () => {
    if (!algunoSeleccionado || pct <= 0) return
    const ids = Array.from(seleccionados)
    const result = await crearBulk(ids, pct)
    if (!result) {
      toast({ title: "Error", description: error || "No se pudo crear las fichas", variant: "destructive" })
      return
    }
    if (result.creadas > 0) {
      toast({
        title: `✅ ${result.creadas} ficha${result.creadas !== 1 ? "s" : ""} creada${result.creadas !== 1 ? "s" : ""}`,
        description:
          result.errores_count > 0
            ? `${result.errores_count} material${result.errores_count !== 1 ? "es" : ""} con error`
            : `+${pct}% aplicado a ${result.creadas} material${result.creadas !== 1 ? "es" : ""}`,
      })
    }
    if (result.errores_count > 0 && result.creadas === 0) {
      toast({ title: "Error", description: "No se pudo crear ninguna ficha", variant: "destructive" })
    }
    limpiarSeleccion()
    setPorcentajeBulk("")
    void loadResumen()
    // Refresh detail panel if its material was updated
    if (materialDetalle && ids.includes(materialDetalle.material_id)) {
      await cargarFichaActiva(materialDetalle.material_id)
    }
  }

  // ── Detail panel ──
  const handleVerDetalle = async (row: MaterialFichaResumen) => {
    limpiarEstado()
    setMaterialDetalle(row)
    await cargarFichaActiva(row.material_id)
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100)
  }

  const handleCompararPrecio = async () => {
    if (!materialDetalle) return
    const result = await compararPrecio(materialDetalle.material_id)
    if (result) setIsComparacionOpen(true)
    else toast({ title: "Error", description: error || "No se pudo comparar el precio", variant: "destructive" })
  }

  const handleAplicarPrecio = async () => {
    if (!materialDetalle) return
    const result = await aplicarPrecio(materialDetalle.material_id)
    if (result) {
      toast({
        title: "Precio aplicado",
        description: `$${result.precio_anterior.toFixed(2)} → $${result.precio_nuevo.toFixed(2)}`,
      })
      setIsComparacionOpen(false)
      await cargarFichaActiva(materialDetalle.material_id)
      void loadResumen()
    } else {
      toast({ title: "Error", description: error || "No se pudo aplicar el precio", variant: "destructive" })
    }
  }

  const handleVerHistorial = async () => {
    if (!materialDetalle) return
    await cargarHistorial(materialDetalle.material_id)
    setIsHistorialOpen(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Fichas de Costo"
        subtitle="Selecciona materiales, pon un % y crea las fichas"
        badge={{ text: "Costos", className: "bg-teal-100 text-teal-800" }}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadResumen()}
            disabled={loadingResumen}
            title="Actualizar lista"
          >
            <RefreshCcw className={`h-4 w-4 ${loadingResumen ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline ml-1">Actualizar</span>
          </Button>
        }
      />

      <main
        className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6"
        style={{ paddingBottom: algunoSeleccionado ? "110px" : undefined }}
      >
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── MATERIALES TABLE ── */}
        <Card className="border-l-4 border-l-teal-600">
          <CardContent className="p-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Materiales</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {loadingResumen
                    ? "Cargando..."
                    : algunoSeleccionado
                    ? `${seleccionados.size} seleccionado${seleccionados.size !== 1 ? "s" : ""} de ${resumen.length}`
                    : `${resumen.length} materiales · marca los que quieres y pon el %`}
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, código..."
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            {/* Table */}
            {loadingResumen ? (
              <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                <span className="text-sm">Cargando materiales...</span>
              </div>
            ) : resumenFiltrado.length === 0 ? (
              <div className="text-center py-16">
                <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {busqueda ? "Sin resultados para la búsqueda." : "No hay materiales disponibles."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="py-2.5 px-3 w-10">
                        <button
                          onClick={toggleTodos}
                          className="flex items-center justify-center text-gray-400 hover:text-teal-600 transition-colors"
                          title={todosSeleccionados ? "Deseleccionar todos" : "Seleccionar todos"}
                        >
                          {todosSeleccionados ? (
                            <CheckSquare className="h-4 w-4 text-teal-600" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[150px]">Código</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[110px]">Categoría</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Nombre</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[90px]">Precio</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[120px]">Ficha</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[130px]">Última ficha</th>
                      <th className="py-2.5 px-3 w-14"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenFiltrado.map((row) => {
                      const isChecked = seleccionados.has(row.material_id)
                      const isDetalle = materialDetalle?.material_id === row.material_id
                      return (
                        <tr
                          key={row.material_id}
                          onClick={() => toggleSeleccion(row.material_id)}
                          className={`border-b border-gray-100 cursor-pointer transition-colors select-none ${
                            isChecked
                              ? "bg-teal-50/60"
                              : isDetalle
                              ? "bg-blue-50/40"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleSeleccion(row.material_id)}
                              className="flex items-center justify-center"
                            >
                              {isChecked ? (
                                <CheckSquare className="h-4 w-4 text-teal-600" />
                              ) : (
                                <Square className="h-4 w-4 text-gray-300 hover:text-gray-500" />
                              )}
                            </button>
                          </td>

                          {/* Código + foto */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              {row.foto ? (
                                <div className="relative w-8 h-8 rounded-md overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-200">
                                  <img
                                    src={row.foto}
                                    alt={row.nombre || row.descripcion}
                                    className="w-full h-full object-contain p-0.5"
                                    onError={(e) => {
                                      const t = e.target as HTMLImageElement
                                      t.style.display = "none"
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="bg-amber-100 p-1.5 rounded-md flex-shrink-0">
                                  <Package className="h-3 w-3 text-amber-700" />
                                </div>
                              )}
                              <span className="font-semibold text-gray-900 whitespace-nowrap text-xs">
                                {row.codigo ?? "-"}
                              </span>
                            </div>
                          </td>

                          {/* Categoría */}
                          <td className="py-2.5 px-3">
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200 text-xs max-w-[100px] truncate inline-block"
                            >
                              {row.categoria || "-"}
                            </Badge>
                          </td>

                          {/* Nombre */}
                          <td className="py-2.5 px-3">
                            <p className="font-medium text-gray-900 truncate text-sm">
                              {row.nombre || row.descripcion || "-"}
                            </p>
                            {row.marca && (
                              <p className="text-xs text-gray-400 truncate">{row.marca}</p>
                            )}
                          </td>

                          {/* Precio actual */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-0.5">
                              <DollarSign className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              <span className="font-medium text-gray-900 text-xs">
                                {row.precio != null ? row.precio.toFixed(2) : "N/A"}
                              </span>
                            </div>
                          </td>

                          {/* Precio ficha */}
                          <td className="py-2.5 px-3">
                            {row.ficha_activa ? (
                              <div className="flex items-center gap-0.5">
                                <TrendingUp className="h-3 w-3 text-teal-500 flex-shrink-0" />
                                <span className="font-semibold text-teal-700 text-xs">
                                  ${row.ficha_activa.precio_venta_calculado.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-gray-50 text-gray-400 border-gray-200 text-xs"
                              >
                                Sin ficha
                              </Badge>
                            )}
                          </td>

                          {/* Fecha */}
                          <td className="py-2.5 px-3">
                            {row.ficha_activa ? (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <CalendarDays className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                {formatDate(row.ficha_activa.vigente_desde)}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300 italic">No tiene</span>
                            )}
                          </td>

                          {/* Ver detalle */}
                          <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                            {row.ficha_activa && (
                              <button
                                onClick={() => void handleVerDetalle(row)}
                                title="Ver detalle de ficha"
                                className={`flex items-center justify-center rounded p-1 transition-colors ${
                                  isDetalle
                                    ? "text-blue-600 bg-blue-50"
                                    : "text-gray-300 hover:text-blue-600 hover:bg-blue-50"
                                }`}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── DETAIL PANEL ── */}
        <div ref={detailRef}>
          {materialDetalle && (
            <>
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {materialDetalle.nombre || materialDetalle.descripcion || `Material ${materialDetalle.codigo}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {[
                        materialDetalle.codigo && `Código: ${materialDetalle.codigo}`,
                        materialDetalle.marca,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMaterialDetalle(null)
                    limpiarEstado()
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-teal-600 mr-3" />
                  <p className="text-gray-600 text-sm">Cargando ficha...</p>
                </div>
              ) : fichaActiva ? (
                <FichaDetalleCard
                  ficha={fichaActiva}
                  onCompararPrecio={handleCompararPrecio}
                  onAplicarPrecio={handleAplicarPrecio}
                  onVerHistorial={handleVerHistorial}
                  loadingAction={loadingAction}
                />
              ) : (
                <Card className="border-dashed border-2 border-gray-200">
                  <CardContent className="p-8 text-center">
                    <FileSpreadsheet className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Este material no tiene ficha activa aún.</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Selecciónalo con el checkbox y usa la barra inferior para crear una.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── STICKY BULK ACTION BAR ── */}
      {algunoSeleccionado && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-teal-300 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center gap-3">
            {/* Count badge */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-full px-3 py-1.5">
                <CheckSquare className="h-4 w-4 text-teal-600" />
                <span className="text-sm font-bold text-teal-800">
                  {seleccionados.size} material{seleccionados.size !== 1 ? "es" : ""}
                </span>
              </div>
              <button
                onClick={limpiarSeleccion}
                className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
              >
                Limpiar
              </button>
            </div>

            {/* Percentage input */}
            <div className="flex items-center gap-2 flex-1 sm:max-w-xs">
              <div className="relative flex-1">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500 pointer-events-none" />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Porcentaje (ej: 20)"
                  value={porcentajeBulk}
                  onChange={(e) => setPorcentajeBulk(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                />
              </div>
              {pct > 0 && (
                <span className="text-xs font-semibold text-amber-600 whitespace-nowrap flex-shrink-0 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  +{pct}%
                </span>
              )}
            </div>

            {/* Create button */}
            <Button
              onClick={() => void handleCrearBulk()}
              disabled={loadingBulk || pct <= 0}
              className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 whitespace-nowrap flex-shrink-0 w-full sm:w-auto font-semibold"
            >
              {loadingBulk ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creando fichas...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Crear {seleccionados.size} ficha{seleccionados.size !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ComparacionDialog
        open={isComparacionOpen}
        onOpenChange={setIsComparacionOpen}
        comparacion={comparacion}
        onAplicarPrecio={handleAplicarPrecio}
        loadingAction={loadingAction}
      />

      <HistorialDialog
        open={isHistorialOpen}
        onOpenChange={setIsHistorialOpen}
        historial={historial}
        loading={loading}
      />

      <Toaster />
    </div>
  )
}
