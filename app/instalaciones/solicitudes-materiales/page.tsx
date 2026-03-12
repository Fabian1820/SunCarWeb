"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Search, Package, Plus } from "lucide-react"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { ConfirmDeleteDialog } from "@/components/shared/molecule/dialog"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { useSolicitudesMateriales } from "@/hooks/use-solicitudes-materiales"
import { SolicitudesMaterialesTable } from "@/components/feats/solicitudes-materiales/solicitudes-materiales-table"
import { CreateSolicitudMaterialDialog } from "@/components/feats/solicitudes-materiales/create-solicitud-material-dialog"
import { SolicitudMaterialDetailDialog } from "@/components/feats/solicitudes-materiales/solicitud-material-detail-dialog"
import type { SolicitudMaterial } from "@/lib/api-types"

export default function SolicitudesMaterialesPage() {
  const { toast } = useToast()
  const {
    filteredSolicitudes,
    loading,
    searchTerm,
    setSearchTerm,
    loadSolicitudes,
    deleteSolicitud,
  } = useSolicitudesMateriales()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [solicitudToDelete, setSolicitudToDelete] = useState<SolicitudMaterial | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [solicitudDetalle, setSolicitudDetalle] = useState<SolicitudMaterial | null>(null)

  if (loading && filteredSolicitudes.length === 0) {
    return <PageLoader moduleName="Solicitudes de Materiales" text="Cargando solicitudes..." />
  }

  const handleCreateSuccess = () => {
    toast({
      title: "Éxito",
      description: "Solicitud de materiales creada correctamente",
    })
    loadSolicitudes()
  }

  const handleDeleteSolicitud = (solicitud: SolicitudMaterial) => {
    setSolicitudToDelete(solicitud)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!solicitudToDelete) return
    setDeleteLoading(true)
    try {
      const success = await deleteSolicitud(solicitudToDelete.id)
      if (!success) throw new Error("Error al eliminar la solicitud")
      toast({
        title: "Éxito",
        description: "Solicitud eliminada correctamente",
      })
      setIsDeleteDialogOpen(false)
      setSolicitudToDelete(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la solicitud",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Solicitudes de Materiales"
        subtitle="Gestiona las solicitudes de materiales para operaciones"
        badge={{ text: "Operaciones", className: "bg-purple-100 text-purple-800" }}
        className="bg-white shadow-sm border-b border-orange-100"
        actions={
          <Button
            size="icon"
            className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold shadow-md touch-manipulation"
            onClick={() => setIsCreateDialogOpen(true)}
            aria-label="Nueva solicitud"
            title="Nueva solicitud"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nueva Solicitud</span>
            <span className="sr-only">Nueva solicitud</span>
          </Button>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        {/* Filtros */}
        <Card className="border-0 shadow-md mb-6 border-l-4 border-l-purple-600">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="search" className="text-sm font-medium text-gray-700 mb-2 block">
                  Buscar
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Buscar por código, cliente, almacén, creador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card className="border-0 shadow-md border-l-4 border-l-purple-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" />
              Solicitudes de Materiales
            </CardTitle>
            <CardDescription>
              Mostrando {filteredSolicitudes.length} solicitud{filteredSolicitudes.length !== 1 ? "es" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SolicitudesMaterialesTable
              solicitudes={filteredSolicitudes}
              onView={(s) => { setSolicitudDetalle(s); setIsDetailDialogOpen(true) }}
              onDelete={handleDeleteSolicitud}
              loading={loading}
            />
          </CardContent>
        </Card>
      </main>

      {/* Create Dialog */}
      <CreateSolicitudMaterialDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      {/* Detail Dialog */}
      <SolicitudMaterialDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        solicitud={solicitudDetalle}
      />

      {/* Delete Confirmation */}
      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Eliminar Solicitud"
        message="¿Estás seguro de que quieres eliminar esta solicitud de materiales? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        confirmText="Eliminar Solicitud"
        isLoading={deleteLoading}
      />

      <Toaster />
    </div>
  )
}
