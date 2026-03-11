"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/molecule/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Plus, FileSpreadsheet, Package, Search, AlertCircle, Loader2 } from "lucide-react"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
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
import type { MaterialCatalogoWeb, FichaCostoCreateData } from "@/lib/types/feats/fichas-costo/ficha-costo-types"

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
    loading,
    loadingAction,
    error,
    crearFicha,
    cargarFichaActiva,
    cargarHistorial,
    compararPrecio,
    aplicarPrecio,
    limpiarEstado,
  } = useFichasCosto()

  // Estado de la UI
  const [materialSeleccionado, setMaterialSeleccionado] = useState<MaterialCatalogoWeb | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isCrearOpen, setIsCrearOpen] = useState(false)
  const [isComparacionOpen, setIsComparacionOpen] = useState(false)
  const [isHistorialOpen, setIsHistorialOpen] = useState(false)

  const getMaterialId = (m: MaterialCatalogoWeb): string => {
    return m.material_id || m._id || m.id || ""
  }

  const getMaterialName = (m: MaterialCatalogoWeb): string => {
    return m.nombre || m.descripcion || `Material ${m.codigo || getMaterialId(m)}`
  }

  // Seleccionar material y cargar ficha activa
  const handleSelectMaterial = async (material: MaterialCatalogoWeb) => {
    setMaterialSeleccionado(material)
    limpiarEstado()
    const materialId = getMaterialId(material)
    if (materialId) {
      await cargarFichaActiva(materialId)
    }
  }

  // Abrir formulario de crear ficha
  const handleOpenCrear = () => {
    if (!materialSeleccionado) {
      setIsSearchOpen(true)
      return
    }
    setIsCrearOpen(true)
  }

  // Crear ficha
  const handleCrearFicha = async (data: FichaCostoCreateData) => {
    const ficha = await crearFicha(data)
    if (ficha) {
      toast({ title: "Ficha creada", description: `Versión ${ficha.version} creada exitosamente. Precio de venta: $${ficha.precio_venta_calculado.toFixed(2)}` })
      setIsCrearOpen(false)
    } else {
      toast({ title: "Error", description: error || "No se pudo crear la ficha", variant: "destructive" })
    }
  }

  // Comparar precio
  const handleCompararPrecio = async () => {
    if (!materialSeleccionado) return
    const result = await compararPrecio(getMaterialId(materialSeleccionado))
    if (result) {
      setIsComparacionOpen(true)
    } else {
      toast({ title: "Error", description: error || "No se pudo comparar el precio", variant: "destructive" })
    }
  }

  // Aplicar precio
  const handleAplicarPrecio = async () => {
    if (!materialSeleccionado) return
    const result = await aplicarPrecio(getMaterialId(materialSeleccionado))
    if (result) {
      toast({
        title: "Precio aplicado",
        description: `Precio actualizado de $${result.precio_anterior.toFixed(2)} a $${result.precio_nuevo.toFixed(2)}`,
      })
      setIsComparacionOpen(false)
      // Recargar ficha activa
      await cargarFichaActiva(getMaterialId(materialSeleccionado))
    } else {
      toast({ title: "Error", description: error || "No se pudo aplicar el precio", variant: "destructive" })
    }
  }

  // Ver historial
  const handleVerHistorial = async () => {
    if (!materialSeleccionado) return
    await cargarHistorial(getMaterialId(materialSeleccionado))
    setIsHistorialOpen(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Fichas de Costo"
        subtitle="Gestión de fichas de costo de materiales"
        badge={{ text: "Costos", className: "bg-teal-100 text-teal-800" }}
        actions={
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
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Error global */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Selector de material */}
        <Card className="mb-6 border-l-4 border-l-teal-600">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="flex-1">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Material seleccionado
                </Label>
                {materialSeleccionado ? (
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-teal-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {getMaterialName(materialSeleccionado)}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {materialSeleccionado.marca && <span>Marca: {materialSeleccionado.marca}</span>}
                        {materialSeleccionado.codigo && <span>Código: {materialSeleccionado.codigo}</span>}
                        {materialSeleccionado.precio != null && <span>Precio actual: ${materialSeleccionado.precio.toFixed(2)}</span>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Ningún material seleccionado. Busque un material para ver o crear su ficha de costo.</p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setIsSearchOpen(true)}
                className="border-teal-200 text-teal-700 hover:bg-teal-50 whitespace-nowrap"
              >
                <Search className="h-4 w-4 mr-2" />
                {materialSeleccionado ? 'Cambiar material' : 'Buscar material'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Contenido principal */}
        {materialSeleccionado && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600 mr-3" />
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
                    Este material no tiene una ficha de costo activa. Cree una nueva ficha para definir costos y precio de venta.
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

        {/* Estado vacío inicial */}
        {!materialSeleccionado && (
          <Card className="border-dashed border-2 border-gray-300">
            <CardContent className="p-12 text-center">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Seleccione un material</h3>
              <p className="text-sm text-gray-500 mb-4">
                Busque y seleccione un material del catálogo para ver su ficha de costo activa o crear una nueva.
              </p>
              <Button
                variant="outline"
                onClick={() => setIsSearchOpen(true)}
                className="border-teal-200 text-teal-700 hover:bg-teal-50"
              >
                <Search className="h-4 w-4 mr-2" />
                Buscar Material
              </Button>
            </CardContent>
          </Card>
        )}
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
