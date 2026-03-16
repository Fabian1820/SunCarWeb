"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import {
  Plus,
  FileSpreadsheet,
  Package,
  Search,
  AlertCircle,
  Loader2,
  RefreshCcw,
  ChevronRight,
  DollarSign,
  CalendarDays,
  TrendingUp,
} from "lucide-react"
import { Input } from "@/components/shared/molecule/input"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { RouteGuard } from "@/components/auth/route-guard"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { useFichasCosto } from "@/hooks/use-fichas-costo"
import { MaterialSearchDialog } from "@/components/feats/fichas-costo/material-search-dialog"
import { CrearFichaForm } from "@/components/feats/fichas-costo/crear-ficha-form"
import { FichaDetalleCard } from "@/components/feats/fichas-costo/ficha-detalle-card"
import { ComparacionDialog } from "@/components/feats/fichas-costo/comparacion-dialog"
import { HistorialDialog } from "@/components/feats/fichas-costo/historial-dialog"
import type {
  MaterialCatalogoWeb,
  FichaCostoCreateData,
  MaterialFichaResumen,
} from "@/lib/types/feats/fichas-costo/ficha-costo-types"

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
    error,
    crearFicha,
    cargarFichaActiva,
    cargarHistorial,
    compararPrecio,
    aplicarPrecio,
    loadResumen,
    limpiarEstado,
  } = useFichasCosto()

  const [materialSeleccionado, setMaterialSeleccionado] = useState<MaterialCatalogoWeb | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isCrearOpen, setIsCrearOpen] = useState(false)
  const [isComparacionOpen, setIsComparacionOpen] = useState(false)
  const [isHistorialOpen, setIsHistorialOpen] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const detailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void loadResumen()
  }, [loadResumen])

  // Ordenar: primero los que tienen ficha (por vigente_desde desc), luego sin ficha
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

  const getMaterialId = (m: MaterialCatalogoWeb): string =>
    m.material_id || m._id || m.id || ""

  const getMaterialName = (m: MaterialCatalogoWeb): string =>
    m.nombre || m.descripcion || `Material ${m.codigo || getMaterialId(m)}`

  const handleSelectMaterial = async (material: MaterialCatalogoWeb) => {
    setMaterialSeleccionado(material)
    limpiarEstado()
    const id = getMaterialId(material)
    if (id) await cargarFichaActiva(id)
    // Scroll al detalle
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100)
  }

  const handleSelectFromTable = async (row: MaterialFichaResumen) => {
    const material: MaterialCatalogoWeb = {
      material_id: row.material_id,
      codigo: row.codigo,
      nombre: row.nombre,
      descripcion: row.descripcion,
      categoria: row.categoria,
      marca: row.marca,
      precio: row.precio,
      foto: row.foto,
      potenciaKW: row.potenciaKW,
    }
    await handleSelectMaterial(material)
  }

  const handleOpenCrear = () => {
    if (!materialSeleccionado) { setIsSearchOpen(true); return }
    setIsCrearOpen(true)
  }

  const handleCrearFicha = async (data: FichaCostoCreateData) => {
    const ficha = await crearFicha(data)
    if (ficha) {
      toast({
        title: "Ficha creada",
        description: `Versión ${ficha.version} creada. Precio de venta: $${ficha.precio_venta_calculado.toFixed(2)}`,
      })
      setIsCrearOpen(false)
      // Refrescar resumen para actualizar la tabla
      void loadResumen()
    } else {
      toast({ title: "Error", description: error || "No se pudo crear la ficha", variant: "destructive" })
    }
  }

  const handleCompararPrecio = async () => {
    if (!materialSeleccionado) return
    const result = await compararPrecio(getMaterialId(materialSeleccionado))
    if (result) setIsComparacionOpen(true)
    else toast({ title: "Error", description: error || "No se pudo comparar el precio", variant: "destructive" })
  }

  const handleAplicarPrecio = async () => {
    if (!materialSeleccionado) return
    const result = await aplicarPrecio(getMaterialId(materialSeleccionado))
    if (result) {
      toast({
        title: "Precio aplicado",
        description: `Precio actualizado de $${result.precio_anterior.toFixed(2)} a $${result.precio_nuevo.toFixed(2)}`,
      })
      setIsComparacionOpen(false)
      await cargarFichaActiva(getMaterialId(materialSeleccionado))
      void loadResumen()
    } else {
      toast({ title: "Error", description: error || "No se pudo aplicar el precio", variant: "destructive" })
    }
  }

  const handleVerHistorial = async () => {
    if (!materialSeleccionado) return
    await cargarHistorial(getMaterialId(materialSeleccionado))
    setIsHistorialOpen(true)
  }

  const selectedId = materialSeleccionado ? getMaterialId(materialSeleccionado) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Fichas de Costo"
        subtitle="Gestión de fichas de costo de materiales"
        badge={{ text: "Costos", className: "bg-teal-100 text-teal-800" }}
        actions={
          <div className="flex items-center gap-2">
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
            <Button
              size="icon"
              className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 touch-manipulation"
              aria-label="Nueva ficha de costo"
              title="Nueva ficha de costo"
              onClick={handleOpenCrear}
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Nueva Ficha</span>
            </Button>
          </div>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
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

        {/* ── LISTADO DE MATERIALES ── */}
        <Card className="border-l-4 border-l-teal-600">
          <CardContent className="p-0">
            {/* Cabecera de la tabla */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Materiales</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {loadingResumen
                    ? "Cargando..."
                    : `${resumen.length} materiales · ordenados por fecha de última ficha`}
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, código, categoría..."
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            {/* Tabla */}
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
                      <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[170px]">Código</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[120px]">Categoría</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Nombre</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[90px]">Precio</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[120px]">Precio Ficha</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[140px]">Última Ficha</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[90px]">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenFiltrado.map((row) => {
                      const isSelected = selectedId === row.material_id
                      return (
                        <tr
                          key={row.material_id}
                          onClick={() => void handleSelectFromTable(row)}
                          className={`border-b border-gray-100 cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-teal-50 border-l-2 border-l-teal-500"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          {/* Código + foto */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              {row.foto ? (
                                <div className="relative w-9 h-9 rounded-md overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-200">
                                  <img
                                    src={row.foto}
                                    alt={row.nombre || row.descripcion}
                                    className="w-full h-full object-contain p-0.5"
                                    onError={(e) => {
                                      const t = e.target as HTMLImageElement
                                      t.style.display = "none"
                                      const fb = t.nextElementSibling as HTMLElement
                                      if (fb) fb.style.display = "flex"
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-amber-100 items-center justify-center hidden">
                                    <Package className="h-4 w-4 text-amber-700" />
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-amber-100 p-1.5 rounded-md flex-shrink-0">
                                  <Package className="h-3.5 w-3.5 text-amber-700" />
                                </div>
                              )}
                              <span className="font-semibold text-gray-900 whitespace-nowrap">
                                {row.codigo ?? "-"}
                              </span>
                            </div>
                          </td>

                          {/* Categoría */}
                          <td className="py-2.5 px-3">
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200 text-xs max-w-[110px] truncate inline-block"
                            >
                              {row.categoria || "-"}
                            </Badge>
                          </td>

                          {/* Nombre */}
                          <td className="py-2.5 px-3">
                            <p className="font-medium text-gray-900 truncate">
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
                              <span className="font-medium text-gray-900">
                                {row.precio != null ? row.precio.toFixed(2) : "N/A"}
                              </span>
                            </div>
                          </td>

                          {/* Precio de ficha */}
                          <td className="py-2.5 px-3">
                            {row.ficha_activa ? (
                              <div className="flex items-center gap-0.5">
                                <TrendingUp className="h-3 w-3 text-teal-500 flex-shrink-0" />
                                <span className="font-semibold text-teal-700">
                                  ${row.ficha_activa.precio_venta_calculado.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Sin ficha</span>
                            )}
                          </td>

                          {/* Fecha última ficha */}
                          <td className="py-2.5 px-3">
                            {row.ficha_activa ? (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <CalendarDays className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                {formatDate(row.ficha_activa.vigente_desde)}
                              </div>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-gray-50 text-gray-400 border-gray-200 text-xs"
                              >
                                No tiene
                              </Badge>
                            )}
                          </td>

                          {/* Acción */}
                          <td className="py-2.5 px-3">
                            <button
                              className={`flex items-center gap-0.5 text-xs font-medium transition-colors ${
                                isSelected
                                  ? "text-teal-600"
                                  : "text-gray-400 hover:text-teal-600"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation()
                                void handleSelectFromTable(row)
                              }}
                            >
                              {row.ficha_activa ? "Ver ficha" : "Crear ficha"}
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
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

        {/* ── DETALLE DEL MATERIAL SELECCIONADO ── */}
        <div ref={detailRef}>
          {materialSeleccionado && (
            <>
              {/* Indicador de material activo */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-teal-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">{getMaterialName(materialSeleccionado)}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {materialSeleccionado.codigo && <span>Código: {materialSeleccionado.codigo}</span>}
                      {materialSeleccionado.marca && <span>Marca: {materialSeleccionado.marca}</span>}
                      {materialSeleccionado.precio != null && (
                        <span>Precio actual: ${materialSeleccionado.precio.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSearchOpen(true)}
                  className="border-teal-200 text-teal-700 hover:bg-teal-50 whitespace-nowrap"
                >
                  <Search className="h-4 w-4 mr-1.5" />
                  Cambiar material
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-7 w-7 animate-spin text-teal-600 mr-3" />
                  <p className="text-gray-600">Cargando ficha de costo...</p>
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
                <Card className="border-dashed border-2 border-gray-300">
                  <CardContent className="p-12 text-center">
                    <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Sin ficha de costo</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Este material no tiene una ficha activa. Crea una nueva para definir costos y precio de venta.
                    </p>
                    <Button
                      onClick={() => setIsCrearOpen(true)}
                      className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Ficha de Costo
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>

      {/* Dialogs */}
      <MaterialSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onSelect={handleSelectMaterial}
      />

      <Dialog open={isCrearOpen} onOpenChange={setIsCrearOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-teal-600" />
              Nueva Ficha de Costo
            </DialogTitle>
          </DialogHeader>
          {materialSeleccionado && (
            <CrearFichaForm
              materialId={getMaterialId(materialSeleccionado)}
              materialNombre={getMaterialName(materialSeleccionado)}
              onSubmit={handleCrearFicha}
              onCancel={() => setIsCrearOpen(false)}
              loading={loadingAction}
            />
          )}
        </DialogContent>
      </Dialog>

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
