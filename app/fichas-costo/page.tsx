"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Card, CardContent } from "@/components/shared/molecule/card"
import {
  Package,
  Search,
  AlertCircle,
  Loader2,
  RefreshCcw,
  TrendingUp,
  Eye,
  Pencil,
} from "lucide-react"
import { Input } from "@/components/shared/molecule/input"
import { Toaster } from "@/components/shared/molecule/toaster"
import { RouteGuard } from "@/components/auth/route-guard"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { useFichasCosto } from "@/hooks/use-fichas-costo"
import { EditarPreciosDialog } from "@/components/feats/fichas-costo/editar-precios-dialog"
import { MaterialContableDetalle } from "@/components/feats/fichas-costo/material-contable-detalle"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/shared/molecule/tooltip"
import type { MaterialFichaResumen } from "@/lib/types/feats/fichas-costo/ficha-costo-types"

const calcMargen = (row: MaterialFichaResumen): number | null => {
  if (typeof row.costo !== "number" || typeof row.precio !== "number" || row.costo <= 0) return null
  return ((row.precio - row.costo) / row.costo) * 100
}

export default function FichasCostoPage() {
  return (
    <RouteGuard requiredModule="fichas-costo">
      <FichasCostoPageContent />
    </RouteGuard>
  )
}

function FichasCostoPageContent() {
  const { resumen, loadingResumen, error, loadResumen } = useFichasCosto()

  const [busqueda, setBusqueda] = useState("")
  const [materialDetalle, setMaterialDetalle] = useState<MaterialFichaResumen | null>(null)
  const [isDetalleOpen, setIsDetalleOpen] = useState(false)
  const [materialEditPrecios, setMaterialEditPrecios] = useState<MaterialFichaResumen | null>(null)
  const [isEditPreciosOpen, setIsEditPreciosOpen] = useState(false)

  useEffect(() => {
    void loadResumen()
  }, [loadResumen])

  const resumenOrdenado = useMemo(() => {
    return [...resumen].sort((a, b) => {
      const nombreA = (a.nombre || a.descripcion || "").toLowerCase()
      const nombreB = (b.nombre || b.descripcion || "").toLowerCase()
      return nombreA.localeCompare(nombreB)
    })
  }, [resumen])

  const resumenFiltrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return resumenOrdenado
    return resumenOrdenado.filter((r) => {
      const nombre = (r.nombre || r.descripcion || "").toLowerCase()
      const codigo = String(r.codigo || "").toLowerCase()
      const categoria = (r.categoria || "").toLowerCase()
      const marca = (r.marca || "").toLowerCase()
      const serie = typeof r.numero_serie === "string" ? r.numero_serie.toLowerCase() : ""
      return (
        nombre.includes(q) ||
        codigo.includes(q) ||
        categoria.includes(q) ||
        marca.includes(q) ||
        (!!serie && serie.includes(q))
      )
    })
  }, [resumenOrdenado, busqueda])

  const handleVerDetalle = (row: MaterialFichaResumen) => {
    setMaterialDetalle(row)
    setIsDetalleOpen(true)
  }

  const handleDetalleOpenChange = (open: boolean) => {
    setIsDetalleOpen(open)
    if (!open) setMaterialDetalle(null)
  }

  const handleOpenEditPrecios = (row: MaterialFichaResumen) => {
    setMaterialEditPrecios(row)
    setIsEditPreciosOpen(true)
  }

  const handleEditPreciosOpenChange = (open: boolean) => {
    setIsEditPreciosOpen(open)
    if (!open) setMaterialEditPrecios(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdf6ec] via-white to-[#fbe6cf]">
      <ModuleHeader
        title="Fichas de Costo"
        subtitle="Vista contable de materiales: costos, precios, márgenes, kardex y compras"
        badge={{ text: "Costos", className: "bg-amber-100 text-amber-800" }}
        backHref="/compras-envios-costos"
        backLabel="Volver a Compras, Envíos y Costos"
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

      <main className="content-with-fixed-header max-w-[98vw] 2xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
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

        <Card className="border-l-4 border-l-amber-600">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Materiales</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {loadingResumen ? "Cargando..." : `${resumenOrdenado.length} materiales`}
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, código, número de serie..."
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            {loadingResumen ? (
              <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
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
              <TooltipProvider delayDuration={200}>
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[150px]">Código</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[110px]">Categoría</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Nombre</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[90px]">Costo</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[100px]">Precio Venta</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[110px]">P. Instaladora</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[90px]">% Rebajable</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[100px]">Margen</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[110px]">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumenFiltrado.map((row) => {
                        const margen = calcMargen(row)
                        return (
                          <tr key={row.material_id} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
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
                                <div className="min-w-0 flex-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <p className="font-semibold text-gray-900 text-xs truncate cursor-help">{row.codigo ?? "-"}</p>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p className="max-w-xs break-words">{row.codigo ?? "-"}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  {row.numero_serie && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <p className="text-[10px] text-gray-500 truncate cursor-help">N/S: {row.numero_serie}</p>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom">
                                        <p className="max-w-xs break-words">N/S: {row.numero_serie}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-3">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs max-w-[100px] truncate inline-block">
                                {row.categoria || "-"}
                              </Badge>
                            </td>

                            <td className="py-2.5 px-3">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="font-medium text-gray-900 truncate text-sm cursor-help">{row.nombre || row.descripcion || "-"}</p>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="max-w-xs break-words">{row.nombre || row.descripcion || "-"}</p>
                                </TooltipContent>
                              </Tooltip>
                              {row.marca && <p className="text-xs text-gray-400 truncate">{row.marca}</p>}
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <span className="font-medium text-gray-900 text-xs">
                                {row.costo != null ? `$${row.costo.toFixed(2)}` : "N/A"}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <span className="font-medium text-emerald-700 text-xs">
                                {row.precio != null ? `$${row.precio.toFixed(2)}` : "N/A"}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <span className="font-medium text-indigo-700 text-xs">
                                {row.precio_instaladora != null ? `$${row.precio_instaladora.toFixed(2)}` : "N/A"}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <span className="font-medium text-gray-900 text-xs">
                                {row.porciento_rebajable_venta != null ? `${row.porciento_rebajable_venta}%` : "N/A"}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              {margen != null ? (
                                <div className="inline-flex items-center gap-0.5 justify-end">
                                  <TrendingUp className={`h-3 w-3 flex-shrink-0 ${margen >= 0 ? "text-amber-500" : "text-red-500"}`} />
                                  <span className={`font-semibold text-xs ${margen >= 0 ? "text-amber-700" : "text-red-600"}`}>
                                    {margen.toFixed(1)}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-300">N/A</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenEditPrecios(row)}
                                  title="Editar costo y precios"
                                  className="inline-flex items-center justify-center rounded p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleVerDetalle(row)}
                                  title="Ver ficha (kardex y compras)"
                                  className="inline-flex items-center justify-center rounded p-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>
      </main>

      <MaterialContableDetalle
        open={isDetalleOpen}
        onOpenChange={handleDetalleOpenChange}
        material={materialDetalle}
      />

      <EditarPreciosDialog
        open={isEditPreciosOpen}
        onOpenChange={handleEditPreciosOpenChange}
        material={materialEditPrecios}
        onSaved={() => loadResumen()}
      />

      <Toaster />
    </div>
  )
}
