"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Button } from "@/components/shared/atom/button"
import { ArrowLeft, Package, TrendingUp, DollarSign, Eye, AlertTriangle, Plus, Search } from "lucide-react"
import { useOfertas } from "@/hooks/use-ofertas"
import { toast } from "sonner"
import type { Oferta, CreateOfertaRequest, UpdateOfertaRequest } from "@/lib/api-types"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"

import OfertasList from "@/components/feats/ofertas/ofertas-list"
import CreateEditOfertaDialog from "@/components/feats/ofertas/create-edit-oferta-dialog"
import OfertaDetailsDialog from "@/components/feats/ofertas/oferta-details-dialog"
import ManageElementsDialog from "@/components/feats/ofertas/manage-elements-dialog"

export default function OfertasPage() {
  const {
    ofertas,
    ofertasSimplificadas,
    loading,
    error,
    crearOferta,
    actualizarOferta,
    eliminarOferta
  } = useOfertas()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isElementsDialogOpen, setIsElementsDialogOpen] = useState(false)
  const [selectedOferta, setSelectedOferta] = useState<Oferta | null>(null)

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [minPrice, setMinPrice] = useState<number>()
  const [maxPrice, setMaxPrice] = useState<number>()

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

  const handleDelete = async (ofertaId: string) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta oferta?")) {
      const success = await eliminarOferta(ofertaId)
      if (success) {
        toast.success("Oferta eliminada correctamente")
      }
    }
  }

  // Handler para crear oferta
  const handleCreateOferta = async (data: CreateOfertaRequest | UpdateOfertaRequest): Promise<boolean> => {
    return await crearOferta(data as CreateOfertaRequest)
  }

  // Handler para actualizar oferta
  const handleUpdateOferta = async (data: CreateOfertaRequest | UpdateOfertaRequest): Promise<boolean> => {
    if (!selectedOferta) return false
    return await actualizarOferta(selectedOferta.id, data as UpdateOfertaRequest)
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
        <header className="fixed-header">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-3">
                <Link href="/">
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Volver al Dashboard</span>
                  </Button>
                </Link>
                <div className="p-0 rounded-full bg-white shadow border border-orange-200 flex items-center justify-center h-12 w-12">
                  <img src="/logo.png" alt="Logo SunCar" className="h-10 w-10 object-contain rounded-full" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Ofertas</h1>
                  <p className="text-sm text-gray-600">Gestión de ofertas y promociones</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-8">
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
      <header className="fixed-header bg-white shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 gap-4">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Volver al Dashboard</span>
                  <span className="sm:hidden">Volver</span>
                </Button>
              </Link>
              <div className="p-0 rounded-full bg-white shadow border border-orange-200 flex items-center justify-center h-8 w-8 sm:h-12 sm:w-12">
                <img src="/logo.png" alt="Logo SunCar" className="h-6 w-6 sm:h-10 sm:w-10 object-contain rounded-full" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate flex items-center gap-2">
                  Ofertas
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Promociones
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Gestión de ofertas y promociones</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="default"
                size="sm"
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold shadow-md"
                onClick={handleCreateNew}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Oferta
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-8">
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
          searchTerm={searchTerm}
          minPrice={minPrice}
          maxPrice={maxPrice}
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
        />
      </main>
    </div>
  )
}