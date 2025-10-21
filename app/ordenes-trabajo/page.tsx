"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Search, FileText, ArrowLeft, Plus } from "lucide-react"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { ConfirmDeleteDialog } from "@/components/shared/molecule/dialog"
import { useOrdenesTrabajo } from "@/hooks/use-ordenes-trabajo"
import { OrdenesTrabajoTable } from "@/components/feats/ordenes-trabajo/ordenes-trabajo-table"
import { CreateOrdenTrabajoDialog } from "@/components/feats/ordenes-trabajo/create-orden-trabajo-dialog"
import { MessagePreviewDialog } from "@/components/feats/ordenes-trabajo/message-preview-dialog"
import { OrdenTrabajoService, ClienteService } from "@/lib/api-services"
import type { OrdenTrabajo, CreateOrdenTrabajoRequest } from "@/lib/api-types"

export default function OrdenesTrabajoPage() {
  const { toast } = useToast()
  const {
    filteredOrdenes,
    loading,
    searchTerm,
    setSearchTerm,
    filterTipoReporte,
    setFilterTipoReporte,
    filterBrigada,
    setFilterBrigada,
    loadOrdenes,
    createOrden,
    deleteOrden,
  } = useOrdenesTrabajo()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [ordenToDelete, setOrdenToDelete] = useState<OrdenTrabajo | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false)
  const [messageToShow, setMessageToShow] = useState("")

  // Cargar datos iniciales
  if (loading && filteredOrdenes.length === 0) {
    return <PageLoader moduleName="Órdenes de Trabajo" text="Cargando órdenes de trabajo..." />
  }

  const handleCreateOrden = async (data: { ordenData: CreateOrdenTrabajoRequest }) => {
    const { ordenData } = data
    try {
      const response = await createOrden(ordenData)

      if (!response.success) {
        throw new Error(response.message || 'Error al crear la orden de trabajo')
      }

      toast({
        title: "Éxito",
        description: "Orden de trabajo creada correctamente",
      })

      // Generar mensaje usando los datos de la orden creada
      if (response.data) {
        const message = OrdenTrabajoService.generateOrdenTrabajoMessage(response.data)
        setMessageToShow(message)
        setIsMessageDialogOpen(true)
      }

      await loadOrdenes()
    } catch (error: any) {
      console.error('Error al crear orden:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la orden de trabajo",
        variant: "destructive",
      })
    }
  }

  const handleViewMessage = async (orden: OrdenTrabajo) => {
    try {
      const message = OrdenTrabajoService.generateOrdenTrabajoMessage(orden)
      setMessageToShow(message)
      setIsMessageDialogOpen(true)
    } catch (error) {
      console.error('Error al generar mensaje:', error)
      toast({
        title: "Error",
        description: "No se pudo generar el mensaje",
        variant: "destructive",
      })
    }
  }

  const handleDeleteOrden = (orden: OrdenTrabajo) => {
    setOrdenToDelete(orden)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteOrden = async () => {
    if (!ordenToDelete) return

    setDeleteLoading(true)
    try {
      const success = await deleteOrden(ordenToDelete.id)
      if (!success) {
        throw new Error('Error al eliminar la orden de trabajo')
      }

      toast({
        title: "Éxito",
        description: "Orden de trabajo eliminada correctamente",
      })
      setIsDeleteDialogOpen(false)
      setOrdenToDelete(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la orden de trabajo",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
    }
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
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate flex items-center gap-2">
                  Órdenes de Trabajo
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Gestión
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                  Crea y gestiona órdenes de trabajo para brigadas
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="default"
                size="sm"
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold shadow-md"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Orden
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-8">
        {/* Filtros */}
        <Card className="border-0 shadow-md mb-6 border-l-4 border-l-orange-600">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search" className="text-sm font-medium text-gray-700 mb-2 block">
                  Buscar
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Buscar por cliente, brigada..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="filterTipo" className="text-sm font-medium text-gray-700 mb-2 block">
                  Tipo de Reporte
                </Label>
                <Select value={filterTipoReporte || "todos"} onValueChange={(value) => setFilterTipoReporte(value === "todos" ? "" : value)}>
                  <SelectTrigger id="filterTipo">
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los tipos</SelectItem>
                    <SelectItem value="inversion">Inversión</SelectItem>
                    <SelectItem value="averia">Avería</SelectItem>
                    <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="filterBrigada" className="text-sm font-medium text-gray-700 mb-2 block">
                  Brigada
                </Label>
                <Select value={filterBrigada || "todas"} onValueChange={(value) => setFilterBrigada(value === "todas" ? "" : value)}>
                  <SelectTrigger id="filterBrigada">
                    <SelectValue placeholder="Todas las brigadas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las brigadas</SelectItem>
                    {/* TODO: Cargar brigadas dinámicamente */}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de órdenes */}
        <Card className="border-0 shadow-md border-l-4 border-l-orange-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-600" />
              Órdenes de Trabajo
            </CardTitle>
            <CardDescription>
              Mostrando {filteredOrdenes.length} orden{filteredOrdenes.length !== 1 ? 'es' : ''} de trabajo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OrdenesTrabajoTable
              ordenes={filteredOrdenes}
              onViewMessage={handleViewMessage}
              onDelete={handleDeleteOrden}
              loading={loading}
            />
          </CardContent>
        </Card>
      </main>

      {/* Modal de creación */}
      <CreateOrdenTrabajoDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateOrden}
      />

      {/* Modal de mensaje */}
      <MessagePreviewDialog
        open={isMessageDialogOpen}
        onOpenChange={setIsMessageDialogOpen}
        message={messageToShow}
        title="Mensaje de Orden de Trabajo"
      />

      {/* Modal de confirmación de eliminación */}
      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Eliminar Orden de Trabajo"
        message={`¿Estás seguro de que quieres eliminar esta orden de trabajo? Esta acción no se puede deshacer.`}
        onConfirm={confirmDeleteOrden}
        confirmText="Eliminar Orden"
        isLoading={deleteLoading}
      />

      <Toaster />
    </div>
  )
}
