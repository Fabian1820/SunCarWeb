"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ArrowLeft, Users, Plus, Search, UserPlus, Crown, Loader2 } from "lucide-react"
import { BrigadesTable } from "@/components/brigades-table"
import { BrigadeForm } from "@/components/brigade-form"
import { WorkerForm } from "@/components/worker-form"
import { useBrigadas } from "@/hooks/use-brigadas"
import { convertBrigadaToFrontend, convertBrigadeFormDataToRequest, convertWorkerToTeamMember } from "@/lib/utils/brigada-converters"
import type { Brigade, BrigadeFormData } from "@/lib/brigade-types"

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
  } = useBrigadas()

  // Convertir brigadas del backend al formato del frontend
  const brigades = backendBrigades.map(convertBrigadaToFrontend)

  const [isAddBrigadeDialogOpen, setIsAddBrigadeDialogOpen] = useState(false)
  const [isAddWorkerDialogOpen, setIsAddWorkerDialogOpen] = useState(false)
  const [isEditBrigadeDialogOpen, setIsEditBrigadeDialogOpen] = useState(false)
  const [editingBrigade, setEditingBrigade] = useState<Brigade | null>(null)

  const handleCreateBrigada = async (formData: BrigadeFormData) => {
    const brigadaRequest = convertBrigadeFormDataToRequest(formData)
    const success = await createBrigada(brigadaRequest)
    if (success) {
      setIsAddBrigadeDialogOpen(false)
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

  const handleDeleteBrigada = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta brigada?")) {
      await deleteBrigada(id)
    }
  }

  const handleAddWorker = async (workerData: any) => {
    const { name, ci, brigadeId } = workerData
    const teamMember = convertWorkerToTeamMember({ name, ci })
    const success = await addTrabajador(brigadeId, teamMember)
    if (success) {
      setIsAddWorkerDialogOpen(false)
    }
  }

  const handleRemoveWorker = async (brigadeId: string, workerId: string) => {
    if (confirm("¿Estás seguro de que deseas remover este trabajador de la brigada?")) {
      // Encontrar el trabajador para obtener su CI
      const brigade = brigades.find(b => b.id === brigadeId)
      const worker = brigade?.members.find(w => w.id === workerId)
      if (worker) {
        await removeTrabajador(brigadeId, worker.ci)
      }
    }
  }

  const openEditDialog = (brigade: Brigade) => {
    setEditingBrigade(brigade)
    setIsEditBrigadeDialogOpen(true)
  }

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
                  <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
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
                  />
                </DialogContent>
              </Dialog>
              <Dialog open={isAddBrigadeDialogOpen} onOpenChange={setIsAddBrigadeDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
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
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
    </div>
  )
}
