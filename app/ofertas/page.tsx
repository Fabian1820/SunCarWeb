"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Button } from "@/components/shared/atom/button"
import { Package, TrendingUp, DollarSign, Eye, AlertTriangle, Plus, Search, Tag } from "lucide-react"
import { useOfertas } from "@/hooks/use-ofertas"
import { useToast } from "@/hooks/use-toast"
import type { Oferta, CreateOfertaRequest, UpdateOfertaRequest } from "@/lib/api-types"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"

import OfertasList from "@/components/feats/ofertas/ofertas-list"
import CreateEditOfertaDialog from "@/components/feats/ofertas/create-edit-oferta-dialog"
import OfertaDetailsDialog from "@/components/feats/ofertas/oferta-details-dialog"
import ManageElementsDialog from "@/components/feats/ofertas/manage-elements-dialog"
import { ModuleHeader } from "@/components/shared/organism/module-header"

export default function OfertasPage() {
  const {
    ofertas,
    ofertasSimplificadas,
    loading,
    error,
    crearOferta,
    actualizarOferta,
    eliminarOferta,
    actualizarOfertaLocal,
    actualizarEstadoOferta
  } = useOfertas()
  
  const { toast: toastNotification } = useToast()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isElementsDialogOpen, setIsElementsDialogOpen] = useState(false)
  const [selectedOferta, setSelectedOferta] = useState<Oferta | null>(null)

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [minPrice, setMinPrice] = useState<number>()
  const [maxPrice, setMaxPrice] = useState<number>()
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])

  const availableBrands = useMemo(() => {
    const brandSet = new Set<string>()
    let hasEmptyBrand = false

    ofertas.forEach(oferta => {
      const marca = oferta.marca?.trim()
      if (marca) {
        brandSet.add(marca)
      } else {
        hasEmptyBrand = true
      }
    })

    const brands = Array.from(brandSet).sort((a, b) => a.localeCompare(b))
    if (hasEmptyBrand) {
      brands.push("Sin marca")
    }
    return brands
  }, [ofertas])

  useEffect(() => {
    setSelectedBrands(prev => {
      const filtered = prev.filter(brand => availableBrands.includes(brand))
      return filtered.length === prev.length ? prev : filtered
    })
  }, [availableBrands])

  // Handlers para diálogos
  const handleCreateNew = () => {
    setSelectedOferta(null)
    setIsCreateDialogOpen(true)
  }

  const handleEdit = (oferta: Oferta) => {
    setSelectedOferta(oferta)
    setIsEditDialogOpen(true)
  }

  const handleViewDetails = (oferta: Oferta) => {
    setSelectedOferta(oferta)
    setIsDetailsDialogOpen(true)
  }

  const handleManageElements = (oferta: Oferta) => {
    setSelectedOferta(oferta)
    setIsElementsDialogOpen(true)
  }

  const toggleBrandFilter = (brand: string) => {
    setSelectedBrands(prev =>
      prev.includes(brand) ? prev.filter(item => item !== brand) : [...prev, brand]
    )
  }

  const clearBrandFilters = () => setSelectedBrands([])

  const handleOfertaUpdate = async (ofertaId: string) => {
    // Actualizar la oferta específica en el estado local
    await actualizarOfertaLocal(ofertaId)
  }

  // Actualizar la oferta seleccionada cuando cambien las ofertas
  useEffect(() => {
    if (selectedOferta) {
      const ofertaActualizada = ofertas.find(o => o.id === selectedOferta.id)
      if (ofertaActualizada && JSON.stringify(ofertaActualizada) !== JSON.stringify(selectedOferta)) {
        setSelectedOferta(ofertaActualizada)
      }
    }
  }, [ofertas, selectedOferta?.id])

  const handleDelete = async (ofertaId: string) => {
    try {
      const success = await eliminarOferta(ofertaId)
      if (success) {
        toastNotification({
          title: "Éxito",
          description: "Oferta eliminada correctamente",
        })
        // Cerrar diálogos si están abiertos
        setIsDetailsDialogOpen(false)
        setSelectedOferta(null)
      } else {
        toastNotification({
          title: "Error",
          description: "No se pudo eliminar la oferta",
          variant: "destructive",
        })
      }
    } catch (error) {
      toastNotification({
        title: "Error",
        description: "Error al eliminar la oferta",
        variant: "destructive",
      })
    }
  }

  const handleToggleVisibility = async (oferta: Oferta, nextStatus: boolean) => {
    try {
      const success = await actualizarEstadoOferta(oferta.id, nextStatus)
      if (success) {
        toastNotification({
          title: "Visibilidad actualizada",
          description: nextStatus
            ? "La oferta ahora es visible para todos los usuarios."
            : "La oferta se ocultó del catálogo.",
        })
      } else {
        toastNotification({
          title: "Error",
          description: "No se pudo actualizar la visibilidad de la oferta",
          variant: "destructive",
        })
      }
    } catch (error) {
      toastNotification({
        title: "Error",
        description: "Error al actualizar la visibilidad de la oferta",
        variant: "destructive",
      })
    }
  }

  // Handler para crear oferta
  const handleCreateOferta = async (data: CreateOfertaRequest | UpdateOfertaRequest): Promise<boolean> => {
    try {
      const success = await crearOferta(data as CreateOfertaRequest)
      if (success) {
        toastNotification({
          title: "Éxito",
          description: "Oferta creada correctamente",
        })
        setIsCreateDialogOpen(false)
        return true
      } else {
        toastNotification({
          title: "Error",
          description: "No se pudo crear la oferta",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      toastNotification({
        title: "Error",
        description: "Error al crear la oferta",
        variant: "destructive",
      })
      return false
    }
  }

  // Handler para actualizar oferta
  const handleUpdateOferta = async (data: CreateOfertaRequest | UpdateOfertaRequest): Promise<boolean> => {
    if (!selectedOferta) return false
    
    try {
      const success = await actualizarOferta(selectedOferta.id, data as UpdateOfertaRequest)
      if (success) {
        toastNotification({
          title: "Éxito",
          description: "Oferta actualizada correctamente",
        })
        setIsEditDialogOpen(false)
        setSelectedOferta(null)
        return true
      } else {
        toastNotification({
          title: "Error",
          description: "No se pudo actualizar la oferta",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      toastNotification({
        title: "Error",
        description: "Error al actualizar la oferta",
        variant: "destructive",
      })
      return false
    }
  }

  // Calcular estadísticas
  const stats = {
    total: ofertas.length,
    precioPromedio: ofertas.length > 0 ? ofertas.reduce((sum, o) => sum + o.precio, 0) / ofertas.length : 0,
    conGarantias: ofertas.filter(o => o.garantias && o.garantias.length > 0).length,
    conElementos: ofertas.filter(o => o.elementos && o.elementos.length > 0).length
  }

  // Mostrar loader mientras se cargan los datos iniciales
  if (loading && ofertas.length === 0) {
    return <PageLoader moduleName="Ofertas" text="Cargando ofertas y promociones..." />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
        <ModuleHeader
          title="Ofertas"
          subtitle="Gestión de ofertas y promociones"
          badge={{ text: "Promociones", className: "bg-orange-100 text-orange-800" }}
        />

        <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <div>
                  <h3 className="font-semibold text-red-800">Error al cargar los datos</h3>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Ofertas"
        subtitle="Gestión de ofertas y promociones"
        badge={{ text: "Promociones", className: "bg-orange-100 text-orange-800" }}
        className="bg-white shadow-sm border-b border-orange-100"
        actions={
          <Button
            size="icon"
            className="h-9 w-9 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold shadow-md touch-manipulation"
            onClick={handleCreateNew}
            aria-label="Nueva oferta"
            title="Nueva oferta"
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">Nueva oferta</span>
          </Button>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        {/* Barra de búsqueda y filtros */}
        <Card className="border-0 shadow-md mb-6 border-l-4 border-l-orange-600">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search-oferta" className="text-sm font-medium text-gray-700 mb-2 block">
                  Buscar ofertas
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search-oferta"
                    placeholder="Buscar por descripción, garantías o elementos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="min-price" className="text-sm font-medium text-gray-700 mb-2 block">
                  Precio mínimo
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="min-price"
                    type="number"
                    placeholder="0"
                    value={minPrice || ""}
                    onChange={(e) => setMinPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="max-price" className="text-sm font-medium text-gray-700 mb-2 block">
                  Precio máximo
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="max-price"
                    type="number"
                    placeholder="10000"
                    value={maxPrice || ""}
                    onChange={(e) => setMaxPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {availableBrands.length > 0 && (
              <div className="mt-4">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Filtrar por marca
                </Label>
                <div className="flex flex-wrap gap-2">
                  {availableBrands.map((brand) => {
                    const isActive = selectedBrands.includes(brand)
                    return (
                      <Button
                        key={brand}
                        type="button"
                        size="sm"
                        variant={isActive ? "default" : "outline"}
                        className={isActive ? "bg-orange-600 hover:bg-orange-700 border-orange-600 text-white" : "border-dashed"}
                        onClick={() => toggleBrandFilter(brand)}
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {brand}
                      </Button>
                    )
                  })}
                  {selectedBrands.length > 0 && (
                    <Button type="button" size="sm" variant="ghost" onClick={clearBrandFilters}>
                      Limpiar
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de ofertas */}
        <OfertasList
          ofertas={ofertas}
          loading={loading}
          onCreateNew={handleCreateNew}
          onViewDetails={handleViewDetails}
          onEdit={handleEdit}
          onManageElements={handleManageElements}
          onDelete={handleDelete}
          onToggleVisibility={handleToggleVisibility}
          searchTerm={searchTerm}
          minPrice={minPrice}
          maxPrice={maxPrice}
          selectedBrands={selectedBrands}
        />

        {/* Diálogos */}
        <CreateEditOfertaDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onSave={handleCreateOferta}
          loading={loading}
        />

        <CreateEditOfertaDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={handleUpdateOferta}
          oferta={selectedOferta}
          loading={loading}
        />

        <OfertaDetailsDialog
          isOpen={isDetailsDialogOpen}
          onClose={() => setIsDetailsDialogOpen(false)}
          oferta={selectedOferta}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <ManageElementsDialog
          isOpen={isElementsDialogOpen}
          onClose={() => setIsElementsDialogOpen(false)}
          oferta={selectedOferta}
          onOfertaUpdate={handleOfertaUpdate}
        />
      </main>
    </div>
  )
}
