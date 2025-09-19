"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Button } from "@/components/shared/atom/button"
import { ArrowLeft, Package, TrendingUp, DollarSign, Eye, AlertTriangle } from "lucide-react"
import { useOfertas } from "@/hooks/use-ofertas"
import { toast } from "sonner"
import type { Oferta, CreateOfertaRequest, UpdateOfertaRequest } from "@/lib/api-types"
import { PageLoader } from "@/components/shared/atom/page-loader"

import OfertasList from "@/components/feats/ofertas/ofertas-list"
import CreateEditOfertaDialog from "@/components/feats/ofertas/create-edit-oferta-dialog"
import OfertaDetailsDialog from "@/components/feats/ofertas/oferta-details-dialog"

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
  const [selectedOferta, setSelectedOferta] = useState<Oferta | null>(null)

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

  const handleDelete = async (ofertaId: string) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta oferta?")) {
      const success = await eliminarOferta(ofertaId)
      if (success) {
        toast.success("Oferta eliminada correctamente")
      }
    }
  }

  // Handler para crear oferta
  const handleCreateOferta = async (data: CreateOfertaRequest): Promise<boolean> => {
    return await crearOferta(data)
  }

  // Handler para actualizar oferta
  const handleUpdateOferta = async (data: UpdateOfertaRequest): Promise<boolean> => {
    if (!selectedOferta) return false
    return await actualizarOferta(selectedOferta.id, data)
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
          </div>
        </div>
      </header>

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-6">
          <Card className="border-0 shadow-md">
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-medium text-gray-600">Total Ofertas</p>
                  <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Package className="h-6 w-6 md:h-8 md:w-8 text-orange-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-medium text-gray-600">Precio Promedio</p>
                  <p className="text-lg md:text-2xl font-bold text-green-600">${stats.precioPromedio.toFixed(0)}</p>
                </div>
                <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-green-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-medium text-gray-600">Con Garantías</p>
                  <p className="text-lg md:text-2xl font-bold text-blue-600">{stats.conGarantias}</p>
                </div>
                <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-blue-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-medium text-gray-600">Con Elementos</p>
                  <p className="text-lg md:text-2xl font-bold text-purple-600">{stats.conElementos}</p>
                </div>
                <Eye className="h-6 w-6 md:h-8 md:w-8 text-purple-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de ofertas */}
        <OfertasList
          ofertas={ofertas}
          loading={loading}
          onCreateNew={handleCreateNew}
          onViewDetails={handleViewDetails}
          onEdit={handleEdit}
          onDelete={handleDelete}
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
      </main>
    </div>
  )
}