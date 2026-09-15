"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shared/molecule/dialog"
import { Plus, Search, Loader2 } from "lucide-react"
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
import { ExportButtons } from "@/components/shared/molecule/export-buttons"
import type { ExportOptions } from "@/lib/export-service"
import { exportListToPDF } from "@/lib/export-list-pdf"

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

  // Handler para eliminar brigada. El backend la identifica por el CI del lider.
  const handleDeleteBrigada = async (liderCi: string) => {
    setLoadingAction(true);
    try {
      await BrigadaService.eliminarBrigada(liderCi);
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


  // Handler para eliminar trabajador de brigada. El primer parametro es el CI del lider.
  const handleRemoveWorker = async (liderCi: string, workerCi: string) => {
    setLoadingAction(true);
    try {
      await BrigadaService.eliminarTrabajadorDeBrigada(liderCi, workerCi);
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

  const openEditDialog = (_brigade: Brigade) => {
    // Función inhabilitada para MVP
    console.log('Función de editar brigada inhabilitada para MVP')
  }


  // Exporta la lista tal como se ve (respeta la búsqueda): una fila por brigada,
  // con sus integrantes apilados dentro de la misma fila.
  const getExportOptions = (): Omit<ExportOptions, "filename"> => {
    const subtitlePartes = [`Fecha: ${new Date().toLocaleDateString("es-ES")}`]
    if (searchTerm.trim()) subtitlePartes.push(`Búsqueda: "${searchTerm.trim()}"`)
    subtitlePartes.push(`Brigadas: ${brigades.length}`)
    subtitlePartes.push(
      `Integrantes: ${brigades.reduce((total, b) => total + b.members.length, 0)}`,
    )

    return {
      title: "Suncar SRL - Brigadas",
      subtitle: subtitlePartes.join(" · "),
      columns: [
        { header: "No.", key: "numero", width: 6 },
        { header: "Jefe de brigada", key: "jefe", width: 30 },
        { header: "CI jefe", key: "jefe_ci", width: 16 },
        { header: "Teléfono jefe", key: "jefe_telefono", width: 16 },
        { header: "Cantidad", key: "cantidad", width: 12 },
        { header: "Integrantes (CI)", key: "integrantes", width: 42 },
      ],
      data: brigades.map((b, i) => ({
        numero: i + 1,
        jefe: b.leader.name || "",
        jefe_ci: b.leader.ci || "",
        jefe_telefono: b.leader.phone || "",
        cantidad: b.members.length,
        // Nombre y CI en la misma celda: el PDF une los arrays con comas y, en
        // columnas separadas, nombres y carnés quedarían desalineados.
        integrantes:
          b.members.length > 0
            ? b.members.map((m) => (m.ci ? `${m.name} (${m.ci})` : m.name))
            : ["Sin integrantes"],
      })),
      stackedColumnKeys: ["integrantes"],
    }
  }

  if (loading) return <PageLoader moduleName="Brigadas" text="Cargando brigadas..." />
  if (error) return <div>Error: {error}</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      {/* Header */}
      <ModuleHeader
        title="Gestión de Brigadas"
        subtitle="Administrar equipos de trabajo y asignaciones"
        badge={{ text: "Equipos", className: "bg-blue-100 text-blue-800" }}
        actions={
          <div className="flex items-center gap-2">
          {brigades.length > 0 && (
            <ExportButtons
              getExportOptions={getExportOptions}
              baseFilename="brigadas"
              variant="compact"
              pdfExporter={exportListToPDF}
            />
          )}
          <Dialog open={isAddBrigadeDialogOpen} onOpenChange={setIsAddBrigadeDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="icon"
                className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 touch-manipulation"
                aria-label="Nueva brigada"
                title="Nueva brigada"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Nueva Brigada</span>
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
                brigadas={backendBrigades}
              />
              <div className="text-xs text-gray-500 mt-2">
                Trabajadores disponibles: {trabajadores?.length || 0}
              </div>
            </DialogContent>
          </Dialog>
          </div>
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
                existingWorkers={trabajadores || []}
                brigadas={backendBrigades}
              />
            )}
          </DialogContent>
        </Dialog>

      </main>
      <Toaster />
    </div>
  )
}
