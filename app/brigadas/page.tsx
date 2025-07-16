"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shared/molecule/dialog"
import { ArrowLeft, Users, Plus, Search, UserPlus, Crown, Loader2 } from "lucide-react"
import { BrigadesTable } from "@/components/feats/brigade/brigades-table"
import { BrigadeForm } from "@/components/feats/brigade/brigade-form"
import { WorkerForm } from "@/components/feats/worker/worker-form"
import { useBrigadas } from "@/hooks/use-brigadas"
import { convertBrigadaToFrontend, convertBrigadeFormDataToRequest, convertWorkerToTeamMember } from "@/lib/utils/brigada-converters"
import type { Brigade, BrigadeFormData } from "@/lib/brigade-types"
import { useBrigadasTrabajadores } from '@/hooks/use-brigadas-trabajadores'
import { TrabajadoresTable } from '@/components/feats/worker/trabajadores-table'
import { BrigadaService, TrabajadorService } from '@/lib/api-services'
import { AsignarBrigadaForm } from '@/components/feats/brigade/AsignarBrigadaForm'
import { ConvertirJefeForm } from '@/components/feats/brigade/ConvertirJefeForm'

export default function BrigadasPage() {
  const {
    brigadas: backendBrigades,
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

  const { brigadas: brigadasTrabajadores, trabajadores, refetch } = useBrigadasTrabajadores()

  // Convertir brigadas del backend al formato del frontend, usando solo el id real de MongoDB
  const brigades = Array.isArray(backendBrigades) ? backendBrigades.map(convertBrigadaToFrontend) : [];

  const [isAddBrigadeDialogOpen, setIsAddBrigadeDialogOpen] = useState(false)
  const [isAddWorkerDialogOpen, setIsAddWorkerDialogOpen] = useState(false)
  const [isEditBrigadeDialogOpen, setIsEditBrigadeDialogOpen] = useState(false)
  const [editingBrigade, setEditingBrigade] = useState<Brigade | null>(null)
  const [isAssignBrigadeDialogOpen, setIsAssignBrigadeDialogOpen] = useState(false)
  const [isConvertJefeDialogOpen, setIsConvertJefeDialogOpen] = useState(false)
  const [selectedTrabajador, setSelectedTrabajador] = useState<any>(null)
  const [loadingAction, setLoadingAction] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Filtro de trabajadores igual que brigadas
  const [workerSearch, setWorkerSearch] = useState('');
  const [workerType, setWorkerType] = useState<'todos' | 'jefes' | 'trabajadores'>('todos');
  const filteredTrabajadores = Array.isArray(trabajadores) ? trabajadores.filter(w =>
    (workerType === 'todos' ? true : workerType === 'jefes' ? w.tiene_contraseña : !w.tiene_contraseña)
    && (workerSearch === '' || w.nombre.toLowerCase().includes(workerSearch.toLowerCase()) || w.CI.includes(workerSearch))
  ) : [];

  const handleCreateBrigada = async (data: BrigadeFormData) => {
    setLoadingAction(true);
    setFeedback(null);
    try {
      const brigadaRequest = convertBrigadeFormDataToRequest(data);
      await createBrigada(brigadaRequest);
      setFeedback('Brigada creada correctamente');
      setIsAddBrigadeDialogOpen(false);
      refetch();
    } catch (e) {
      setFeedback('Error al crear brigada');
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
    setFeedback(null);
    try {
      await BrigadaService.eliminarBrigada(id);
      setFeedback('Brigada eliminada correctamente');
      await Promise.all([refetch(), loadBrigadas()]);
    } catch (e: any) {
      setFeedback('Error al eliminar brigada: ' + (e.message || 'Error desconocido'));
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAddWorker = async (data: { ci: string; name: string; password?: string; brigadeId?: string; integrantes?: string[]; mode: 'trabajador_asignar' | 'jefe_brigada' | 'asignar_brigada' | 'jefe' | 'trabajador' }) => {
    setLoadingAction(true);
    setFeedback(null);
    try {
      if (data.mode === 'trabajador_asignar' && data.brigadeId) {
        // Crear trabajador y asignar a brigada
        try {
          await TrabajadorService.crearTrabajador(data.ci, data.name);
        } catch (e: any) {
          setFeedback('Error al crear trabajador: ' + (e.message || 'Error desconocido'));
          setIsAddWorkerDialogOpen(false);
          setLoadingAction(false);
          await Promise.all([refetch(), loadBrigadas()]);
          return;
        }
        try {
          await TrabajadorService.asignarTrabajadorABrigada(data.brigadeId, data.ci, data.name);
          setFeedback('Trabajador creado y asignado a brigada correctamente');
        } catch (e: any) {
          setFeedback('Trabajador creado pero error al asignar a brigada: ' + (e.message || 'Error desconocido'));
        }
        setIsAddWorkerDialogOpen(false);
        await Promise.all([refetch(), loadBrigadas()]);
        return;
      } else if (data.mode === 'jefe_brigada' && data.password && data.integrantes) {
        // Crear jefe y brigada con integrantes
        const integrantesArr = data.integrantes.map(ci => ({ CI: ci }));
        await TrabajadorService.crearJefeBrigada(data.ci, data.name, data.password, integrantesArr);
        setFeedback('Jefe y brigada creada correctamente');
        setIsAddWorkerDialogOpen(false);
        // Refrescar tanto trabajadores como brigadas
        await Promise.all([refetch(), loadBrigadas()]);
        return; // Salir para evitar el refetch() general
      } else if (data.mode === 'asignar_brigada' && data.password && data.brigadeId) {
        await TrabajadorService.crearTrabajadorYAsignarBrigada(data.ci, data.name, data.password, data.brigadeId);
        setFeedback('Trabajador jefe creado y asignado a brigada correctamente');
        setIsAddWorkerDialogOpen(false);
      } else if (data.mode === 'jefe' && data.password) {
        await TrabajadorService.crearTrabajador(data.ci, data.name, data.password);
        setFeedback('Jefe de brigada creado correctamente');
        setIsAddWorkerDialogOpen(false);
      } else if (data.mode === 'trabajador') {
        await TrabajadorService.crearTrabajador(data.ci, data.name);
        setFeedback('Trabajador creado correctamente');
        setIsAddWorkerDialogOpen(false);
      } else {
        setFeedback('Datos inválidos');
        setLoadingAction(false);
        return;
      }
      refetch();
    } catch (e: any) {
      setFeedback(`Error al crear trabajador: ${e.message || 'Error desconocido'}`);
    } finally {
      setLoadingAction(false);
    }
  };

  // Handler para eliminar trabajador de brigada
  const handleRemoveWorker = async (brigadeId: string, workerId: string) => {
    setLoadingAction(true);
    setFeedback(null);
    try {
      await BrigadaService.eliminarTrabajadorDeBrigada(brigadeId, workerId);
      setFeedback('Trabajador removido de la brigada correctamente');
      await Promise.all([refetch(), loadBrigadas()]);
    } catch (e: any) {
      setFeedback('Error al remover trabajador de brigada: ' + (e.message || 'Error desconocido'));
    } finally {
      setLoadingAction(false);
    }
  };

  // Handler para editar trabajador
  const handleEditWorker = async (ci: string, nombre: string, nuevoCi?: string) => {
    setLoadingAction(true);
    setFeedback(null);
    try {
      await TrabajadorService.actualizarTrabajador(ci, nombre, nuevoCi);
      setFeedback('Trabajador actualizado correctamente');
      await Promise.all([refetch(), loadBrigadas()]);
    } catch (e: any) {
      setFeedback('Error al actualizar trabajador: ' + (e.message || 'Error desconocido'));
    } finally {
      setLoadingAction(false);
    }
  };

  const openEditDialog = (brigade: Brigade) => {
    // Función inhabilitada para MVP
    console.log('Función de editar brigada inhabilitada para MVP')
  }

  // Handler para asignar brigada a trabajador existente
  const handleAsignarBrigada = async (data: { brigadaId: string }) => {
    setLoadingAction(true)
    setFeedback(null)
    try {
      const result = await TrabajadorService.asignarTrabajadorABrigada(
        data.brigadaId,
        selectedTrabajador.CI,
        selectedTrabajador.nombre
      );
      if (result === true) {
        setFeedback('Brigada asignada correctamente');
        setIsAssignBrigadeDialogOpen(false);
        await Promise.all([refetch(), loadBrigadas()]);
      } else {
        setFeedback('Error al asignar brigada: respuesta inesperada del servidor');
        console.error('Respuesta inesperada al asignar trabajador a brigada:', result);
      }
    } catch (e: any) {
      setFeedback(e.message || 'Error al asignar brigada');
      console.error('Error al asignar trabajador a brigada:', e);
    } finally {
      setLoadingAction(false);
    }
  }

  // Handler para convertir trabajador a jefe de brigada
  const handleConvertirJefe = async (data: { contrasena: string, integrantes: string[] }) => {
    setLoadingAction(true)
    setFeedback(null)
    try {
      const integrantesArr = data.integrantes.map(ci => ({ CI: ci }))
      await TrabajadorService.convertirTrabajadorAJefe(selectedTrabajador.CI, data.contrasena, integrantesArr)
      setFeedback('Trabajador convertido en jefe de brigada correctamente')
      setIsConvertJefeDialogOpen(false)
      await Promise.all([refetch(), loadBrigadas()]);
    } catch (e: any) {
      setFeedback(e.message || 'Error al convertir trabajador')
    } finally {
      setLoadingAction(false)
    }
  }

  if (loading) return <div>Cargando...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header className="fixed-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al Dashboard
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Gestión de Brigadas</h1>
                  <p className="text-sm text-gray-600">Administrar equipos de trabajo y personal</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddWorkerDialogOpen} onOpenChange={setIsAddWorkerDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Nuevo Trabajador
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar Trabajador</DialogTitle>
                  </DialogHeader>
                  <WorkerForm
                    onSubmit={handleAddWorker}
                    onCancel={() => setIsAddWorkerDialogOpen(false)}
                    brigades={brigades}
                    workers={trabajadores}
                  />
                </DialogContent>
              </Dialog>
              <Dialog open={isAddBrigadeDialogOpen} onOpenChange={setIsAddBrigadeDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Brigada
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
                    existingWorkers={trabajadores}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* MVP Banner */}
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-orange-900">Modo MVP</h3>
                <p className="text-sm text-orange-800">
                  Puedes ver los formularios de creación pero las funciones de crear, editar y eliminar brigadas están deshabilitadas para esta versión. 
                  Solo se permite visualizar y buscar brigadas existentes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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
        <Card className="mb-8">
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
        <Card>
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

        <h2 className="text-xl font-bold mt-8 mb-2">Trabajadores</h2>
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="worker-search" className="text-sm font-medium text-gray-700 mb-2 block">
                  Buscar por nombre o CI de trabajador
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="worker-search"
                    placeholder="Buscar por nombre o CI..."
                    value={workerSearch}
                    onChange={(e) => setWorkerSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex flex-col justify-end">
                <Label htmlFor="worker-type" className="text-sm font-medium text-gray-700 mb-2 block">
                  Tipo
                </Label>
                <select
                  id="worker-type"
                  className="border px-2 py-2 rounded w-48"
                  value={workerType}
                  onChange={e => setWorkerType(e.target.value as any)}
                >
                  <option value="todos">Todos</option>
                  <option value="jefes">Solo jefes de brigada</option>
                  <option value="trabajadores">Solo trabajadores</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Lista de Trabajadores
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            </CardTitle>
            <CardDescription>
              Mostrando {filteredTrabajadores.length} trabajadores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrabajadoresTable
              trabajadores={filteredTrabajadores}
              brigadas={brigadasTrabajadores}
              onAdd={() => setIsAddWorkerDialogOpen(true)}
              onAddJefe={() => setIsAddWorkerDialogOpen(true)}
              onAssignBrigada={trabajador => { setSelectedTrabajador(trabajador); setIsAssignBrigadeDialogOpen(true); }}
              onConvertJefe={trabajador => { setSelectedTrabajador(trabajador); setIsConvertJefeDialogOpen(true); }}
              onEdit={async (trabajador) => { await handleEditWorker(trabajador.CI, trabajador.nombre); }}
              onDelete={async (trabajador) => { await TrabajadorService.eliminarTrabajador(trabajador.CI); setFeedback('Trabajador eliminado correctamente'); await Promise.all([refetch(), loadBrigadas()]); }}
              onRefresh={async () => { await Promise.all([refetch(), loadBrigadas()]); }}
            />
          </CardContent>
        </Card>

        {/* Modal para asignar brigada */}
        <Dialog open={isAssignBrigadeDialogOpen} onOpenChange={setIsAssignBrigadeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Asignar Brigada a Trabajador</DialogTitle>
            </DialogHeader>
            {selectedTrabajador && (
              <AsignarBrigadaForm
                onSubmit={handleAsignarBrigada}
                onCancel={() => setIsAssignBrigadeDialogOpen(false)}
                loading={loadingAction}
                brigadas={brigades}
                trabajador={selectedTrabajador}
              />
            )}
            {feedback && <div className="text-green-600 mt-2">{feedback}</div>}
          </DialogContent>
        </Dialog>

        {/* Modal para convertir trabajador a jefe */}
        <Dialog open={isConvertJefeDialogOpen} onOpenChange={setIsConvertJefeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convertir en Jefe de Brigada</DialogTitle>
            </DialogHeader>
            {selectedTrabajador && (
              <ConvertirJefeForm
                onSubmit={handleConvertirJefe}
                onCancel={() => setIsConvertJefeDialogOpen(false)}
                loading={loadingAction}
                trabajador={selectedTrabajador}
                trabajadores={trabajadores}
              />
            )}
            {feedback && <div className="text-green-600 mt-2">{feedback}</div>}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
