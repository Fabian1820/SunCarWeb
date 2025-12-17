"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Search, FileText, Plus } from "lucide-react"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { ConfirmDeleteDialog } from "@/components/shared/molecule/dialog"
import { useOrdenesTrabajo } from "@/hooks/use-ordenes-trabajo"
import { OrdenesTrabajoTable } from "@/components/feats/ordenes-trabajo/ordenes-trabajo-table"
import { CreateOrdenTrabajoDialog } from "@/components/feats/ordenes-trabajo/create-orden-trabajo-dialog"
import { MessagePreviewDialog } from "@/components/feats/ordenes-trabajo/message-preview-dialog"
import { OrdenTrabajoService } from "@/lib/api-services"
import type { OrdenTrabajo, CreateOrdenTrabajoRequest } from "@/lib/api-types"
import { ModuleHeader } from "@/components/shared/organism/module-header"

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

  const handleCreateOrden = async (data: { payload: CreateOrdenTrabajoRequest }) => {
    const { payload } = data
    try {
      const response = await createOrden(payload)
      toast({
        title: "Éxito",
        description: response.message || "Órdenes de trabajo creadas correctamente",
      })

      // Si se crearon múltiples órdenes, obtener todas y generar mensaje combinado
      if (response.ids?.length) {
        // Guardar grupo de órdenes creadas juntas en localStorage para agrupación
        const grupoId = Date.now().toString()
        if (typeof window !== 'undefined') {
          const gruposExistentes = JSON.parse(
            localStorage.getItem('ordenes_grupos') || '{}'
          )
          response.ids.forEach((id) => {
            gruposExistentes[id] = grupoId
          })
          localStorage.setItem('ordenes_grupos', JSON.stringify(gruposExistentes))
        }

        // Obtener todas las órdenes creadas
        const ordenesCreadas = await Promise.all(
          response.ids.map((id) => OrdenTrabajoService.getOrdenTrabajoById(id))
        )
        const ordenesValidas = ordenesCreadas.filter((o): o is OrdenTrabajo => o !== null)

        if (ordenesValidas.length > 0) {
          // Generar mensaje combinado si hay múltiples órdenes, o individual si es una sola
          const message =
            ordenesValidas.length > 1
              ? OrdenTrabajoService.generateMultipleOrdenesTrabajoMessage(ordenesValidas)
              : OrdenTrabajoService.generateOrdenTrabajoMessage(ordenesValidas[0])
          setMessageToShow(message)
          setIsMessageDialogOpen(true)
        }
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

  const handleViewMessage = async (orden: OrdenTrabajo | OrdenTrabajo[]) => {
    try {
      const ordenes = Array.isArray(orden) ? orden : [orden]
      const message =
        ordenes.length > 1
          ? OrdenTrabajoService.generateMultipleOrdenesTrabajoMessage(ordenes)
          : OrdenTrabajoService.generateOrdenTrabajoMessage(ordenes[0])
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
      <ModuleHeader
        title="Órdenes de Trabajo"
        subtitle="Crea y gestiona órdenes de trabajo para brigadas"
        badge={{ text: "Gestión", className: "bg-orange-100 text-orange-800" }}
        className="bg-white shadow-sm border-b border-orange-100"
        actions={
          <Button
            size="icon"
            className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold shadow-md touch-manipulation"
            onClick={() => setIsCreateDialogOpen(true)}
            aria-label="Crear orden"
            title="Crear orden"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Crear Orden</span>
            <span className="sr-only">Crear orden</span>
          </Button>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
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
