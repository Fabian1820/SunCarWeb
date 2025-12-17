"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shared/molecule/dialog"
import { Users, Plus, Search, Loader2 } from "lucide-react"
import { BrigadesTable } from "@/components/feats/brigade/brigades-table"
import { BrigadeForm } from "@/components/feats/brigade/brigade-form"
import { useBrigadas } from "@/hooks/use-brigadas"
import { convertBrigadaToFrontend, convertBrigadeFormDataToRequest } from "@/lib/utils/brigada-converters"
import type { Brigade, BrigadeFormData } from "@/lib/brigade-types"
import { useBrigadasTrabajadores } from '@/hooks/use-brigadas-trabajadores'
import { BrigadaService } from '@/lib/api-services'
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { RouteGuard } from "@/components/auth/route-guard"
import { ModuleHeader } from "@/components/shared/organism/module-header"

export default function BrigadasPage() {
  return (
    <RouteGuard requiredModule="brigadas">
      <BrigadasPageContent />
    </RouteGuard>
  )
}

function BrigadasPageContent() {
  const {
    brigadas: backendBrigades,
    filteredBrigadas: backendFilteredBrigades,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    createBrigada,
    updateBrigada,
    deleteBrigada,
    addTrabajador,
    removeTrabajador,
    clearError,
    loadBrigadas,
  } = useBrigadas()

  const { refetch, trabajadores } = useBrigadasTrabajadores()

  // Debug: Log trabajadores disponibles
  console.log('Trabajadores disponibles en brigadas page:', trabajadores)

  // Convertir brigadas del backend al formato del frontend, usando solo el id real de MongoDB
  const brigades = Array.isArray(backendFilteredBrigades) ? backendFilteredBrigades.map(convertBrigadaToFrontend) : [];

  const [isAddBrigadeDialogOpen, setIsAddBrigadeDialogOpen] = useState(false)
  const [isEditBrigadeDialogOpen, setIsEditBrigadeDialogOpen] = useState(false)
  const [editingBrigade, setEditingBrigade] = useState<Brigade | null>(null)
  const [loadingAction, setLoadingAction] = useState(false)
  const { toast } = useToast()

  const handleCreateBrigada = async (data: BrigadeFormData) => {
    console.log('handleCreateBrigada called with data:', data);
    setLoadingAction(true);
    try {
      const brigadaRequest = convertBrigadeFormDataToRequest(data);
      console.log('Converted brigada request:', brigadaRequest);
      await createBrigada(brigadaRequest);
      toast({
        title: "Éxito",
        description: 'Brigada creada correctamente',
      });
      setIsAddBrigadeDialogOpen(false);
      refetch();
    } catch (e) {
      console.error('Error in handleCreateBrigada:', e);
      toast({
        title: "Error",
        description: 'Error al crear brigada: ' + (e instanceof Error ? e.message : 'Error desconocido'),
        variant: "destructive",
      });
    } finally {
      setLoadingAction(false);
    }
  }

  const handleUpdateBrigada = async (formData: BrigadeFormData) => {
    if (!editingBrigade) return
    
    const brigadaRequest = convertBrigadeFormDataToRequest(formData)
    const success = await updateBrigada(editingBrigade.id, brigadaRequest)
    if (success) {
      setIsEditBrigadeDialogOpen(false)
      setEditingBrigade(null)
    }
  }

  // Handler para eliminar brigada
  const handleDeleteBrigada = async (id: string) => {
    setLoadingAction(true);
    try {
      await BrigadaService.eliminarBrigada(id);
      toast({
        title: "Éxito",
        description: 'Brigada eliminada correctamente',
      });
      await Promise.all([refetch(), loadBrigadas()]);
    } catch (e: any) {
      toast({
        title: "Error",
        description: 'Error al eliminar brigada: ' + (e.message || 'Error desconocido'),
        variant: "destructive",
      });
    } finally {
      setLoadingAction(false);
    }
  };


  // Handler para eliminar trabajador de brigada
  const handleRemoveWorker = async (brigadeId: string, workerId: string) => {
    setLoadingAction(true);
    try {
      await BrigadaService.eliminarTrabajadorDeBrigada(brigadeId, workerId);
      toast({
        title: "Éxito",
        description: 'Trabajador removido de la brigada correctamente',
      });
      await Promise.all([refetch(), loadBrigadas()]);
    } catch (e: any) {
      toast({
        title: "Error",
        description: 'Error al remover trabajador de brigada: ' + (e.message || 'Error desconocido'),
        variant: "destructive",
      });
    } finally {
      setLoadingAction(false);
    }
  };

  const openEditDialog = (brigade: Brigade) => {
    // Función inhabilitada para MVP
    console.log('Función de editar brigada inhabilitada para MVP')
  }


  if (loading) return <PageLoader moduleName="Brigadas" text="Cargando brigadas..." />
  if (error) return <div>Error: {error}</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <ModuleHeader
        title="Gestión de Brigadas"
        subtitle="Administrar equipos de trabajo y asignaciones"
        badge={{ text: "Equipos", className: "bg-blue-100 text-blue-800" }}
        actions={
          <Dialog open={isAddBrigadeDialogOpen} onOpenChange={setIsAddBrigadeDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="icon"
                className="h-9 w-9 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 touch-manipulation"
                aria-label="Nueva brigada"
                title="Nueva brigada"
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Nueva brigada</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Nueva Brigada</DialogTitle>
              </DialogHeader>
              <BrigadeForm
                onSubmit={(data) => {
                  if ('leaderName' in data && 'leaderCi' in data) {
                    handleCreateBrigada(data)
                  }
                }}
                onCancel={() => setIsAddBrigadeDialogOpen(false)}
                existingWorkers={trabajadores || []}
              />
              <div className="text-xs text-gray-500 mt-2">
                Trabajadores disponibles: {trabajadores?.length || 0}
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Error Alert */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-red-800">{error}</p>
                <Button variant="ghost" size="sm" onClick={clearError} className="text-red-600">
                  ✕
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card className="mb-8 border-l-4 border-l-blue-600">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="text-sm font-medium text-gray-700 mb-2 block">
                  Buscar por nombre de jefe o trabajador
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Buscar por nombre de jefe o trabajador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Brigades Table */}
        <Card className="border-l-4 border-l-blue-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Lista de Brigadas
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            </CardTitle>
            <CardDescription>
              Mostrando {brigades.length} brigadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && brigades.length === 0 ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Cargando brigadas...</p>
              </div>
            ) : (
            <BrigadesTable
                brigades={brigades}
              onEdit={openEditDialog}
                onDelete={handleDeleteBrigada}
                onRemoveWorker={handleRemoveWorker}
                onRefresh={async () => { await Promise.all([refetch(), loadBrigadas()]); }}
            />
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditBrigadeDialogOpen} onOpenChange={setIsEditBrigadeDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Brigada</DialogTitle>
            </DialogHeader>
            {editingBrigade && (
              <BrigadeForm
                initialData={editingBrigade}
                onSubmit={(data) => {
                  if ('leaderName' in data && 'leaderCi' in data) {
                    handleUpdateBrigada(data)
                  }
                }}
                onCancel={() => {
                  setIsEditBrigadeDialogOpen(false)
                  setEditingBrigade(null)
                }}
                isEditing
              />
            )}
          </DialogContent>
        </Dialog>

      </main>
      <Toaster />
    </div>
  )
}
