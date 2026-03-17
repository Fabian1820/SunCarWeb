"use client"

import { useEffect, useMemo, useState } from "react"
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
  Eye,
  PlusCircle,
  Calculator,
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
import { CrearFichaForm } from "@/components/feats/fichas-costo/crear-ficha-form"
import { CalcPorcentajeDialog } from "@/components/feats/fichas-costo/calc-porcentaje-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import type {
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

  const [materialDetalle, setMaterialDetalle] = useState<MaterialFichaResumen | null>(null)
  const [materialParaFicha, setMaterialParaFicha] = useState<MaterialFichaResumen | null>(null)
  const [isCrearFichaOpen, setIsCrearFichaOpen] = useState(false)
  const [isDetalleOpen, setIsDetalleOpen] = useState(false)
  const [isComparacionOpen, setIsComparacionOpen] = useState(false)
  const [isHistorialOpen, setIsHistorialOpen] = useState(false)
  const [isCalcOpen, setIsCalcOpen] = useState(false)
  const [busqueda, setBusqueda] = useState("")

  useEffect(() => {
    void loadResumen()
  }, [loadResumen])

  const resumenOrdenado = useMemo(() => {
    return resumen.sort((a, b) => {
      // Primero: materiales CON ficha (ordenados por fecha más reciente)
      // Después: materiales SIN ficha (ordenados alfabéticamente)
      const aConFicha = a.ficha_activa !== null
      const bConFicha = b.ficha_activa !== null
      
      if (aConFicha && !bConFicha) return -1
      if (!aConFicha && bConFicha) return 1
      
      if (aConFicha && bConFicha) {
        const da = new Date(a.ficha_activa!.vigente_desde).getTime()
        const db = new Date(b.ficha_activa!.vigente_desde).getTime()
        return db - da
      }
      
      // Ambos sin ficha: ordenar por nombre
      const nombreA = (a.nombre || a.descripcion || '').toLowerCase()
      const nombreB = (b.nombre || b.descripcion || '').toLowerCase()
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
      return nombre.includes(q) || codigo.includes(q) || categoria.includes(q) || marca.includes(q)
    })
  }, [resumenOrdenado, busqueda])

  const handleOpenCrearFicha = (row: MaterialFichaResumen) => {
    setMaterialParaFicha(row)
    setIsCrearFichaOpen(true)
  }

  const handleCrearDialogOpenChange = (open: boolean) => {
    setIsCrearFichaOpen(open)
    if (!open) setMaterialParaFicha(null)
  }

  const handleCrearFicha = async (data: FichaCostoCreateData) => {
    const result = await crearFicha(data)
    if (!result) {
      toast({
        title: "Error",
        description: error || "No se pudo crear la ficha de costo",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Ficha creada",
      description: `${materialParaFicha?.nombre || materialParaFicha?.descripcion || "Material"} · +${data.porcentaje}%`,
    })

    handleCrearDialogOpenChange(false)

    if (materialDetalle?.material_id === data.material_id) {
      await cargarFichaActiva(data.material_id)
    }
    void loadResumen()
  }

  const handleVerDetalle = async (row: MaterialFichaResumen) => {
    limpiarEstado()
    setMaterialDetalle(row)
    setIsDetalleOpen(true)
    await cargarFichaActiva(row.material_id)
  }

  const handleDetalleOpenChange = (open: boolean) => {
    setIsDetalleOpen(open)
    if (!open) {
      setMaterialDetalle(null)
      limpiarEstado()
    }
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
        subtitle="Gestiona fichas producto a producto con costo base y % de incremento"
        badge={{ text: "Costos", className: "bg-teal-100 text-teal-800" }}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCalcOpen(true)}
              className="border-teal-200 text-teal-700 hover:bg-teal-50"
            >
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Calculadora %</span>
            </Button>
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

        <Card className="border-l-4 border-l-teal-600">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Materiales</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {loadingResumen ? "Cargando..." : `${resumenOrdenado.length} materiales · ${resumenOrdenado.filter(r => r.ficha_activa).length} con ficha`}
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
                      <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[150px]">Código</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[110px]">Categoría</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Nombre</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[100px]">Precio</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[130px]">Ficha</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[130px]">Última ficha</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[150px]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenFiltrado.map((row) => {
                      return (
                        <tr
                          key={row.material_id}
                          className="border-b border-gray-100 transition-colors hover:bg-gray-50"
                        >
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

                          <td className="py-2.5 px-3">
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200 text-xs max-w-[100px] truncate inline-block"
                            >
                              {row.categoria || "-"}
                            </Badge>
                          </td>

                          <td className="py-2.5 px-3">
                            <p className="font-medium text-gray-900 truncate text-sm">
                              {row.nombre || row.descripcion || "-"}
                            </p>
                            {row.marca && <p className="text-xs text-gray-400 truncate">{row.marca}</p>}
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-0.5">
                              <DollarSign className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              <span className="font-medium text-gray-900 text-xs">
                                {row.precio != null ? row.precio.toFixed(2) : "N/A"}
                              </span>
                            </div>
                          </td>

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

                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenCrearFicha(row)}
                                title={row.ficha_activa ? "Crear nueva versión de ficha" : "Crear ficha de costo"}
                                className="inline-flex items-center justify-center rounded p-1 text-teal-600 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                              >
                                <PlusCircle className="h-3.5 w-3.5" />
                              </button>
                              {row.ficha_activa && (
                                <button
                                  onClick={() => void handleVerDetalle(row)}
                                  title="Ver detalle de ficha"
                                  className="inline-flex items-center justify-center rounded p-1 transition-colors text-gray-300 hover:text-blue-600 hover:bg-blue-50"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
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

      </main>

      <Dialog open={isDetalleOpen} onOpenChange={handleDetalleOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              <div>
                <span className="block">
                  {materialDetalle?.nombre || materialDetalle?.descripcion || `Material ${materialDetalle?.codigo}`}
                </span>
                {(materialDetalle?.codigo || materialDetalle?.marca) && (
                  <span className="text-xs font-normal text-gray-500 block mt-0.5">
                    {[materialDetalle?.codigo && `Código: ${materialDetalle.codigo}`, materialDetalle?.marca]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

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
            <div className="p-8 text-center">
              <FileSpreadsheet className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Este material no tiene ficha activa aún.</p>
              <p className="text-xs text-gray-400 mt-1">Crea la ficha desde el botón + de la fila del material.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCrearFichaOpen} onOpenChange={handleCrearDialogOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {materialParaFicha?.ficha_activa ? "Nueva versión de ficha" : "Crear ficha de costo"}
            </DialogTitle>
          </DialogHeader>

          {materialParaFicha && (
            <CrearFichaForm
              materialId={materialParaFicha.material_id}
              materialNombre={materialParaFicha.nombre || materialParaFicha.descripcion || "Material"}
              materialPrecio={materialParaFicha.precio}
              onSubmit={handleCrearFicha}
              onCancel={() => handleCrearDialogOpenChange(false)}
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

      <CalcPorcentajeDialog open={isCalcOpen} onOpenChange={setIsCalcOpen} materiales={resumen} />

      <Toaster />
    </div>
  )
}
