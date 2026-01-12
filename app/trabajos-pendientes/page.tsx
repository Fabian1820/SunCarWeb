/**
 * Trabajos Pendientes Page
 *
 * Main page for managing pending work assignments
 * Includes CRUD operations and client integration
 */

'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Search, History } from 'lucide-react'
import { Button } from '@/components/shared/atom/button'
import { Input } from '@/components/shared/molecule/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/molecule/card'
import { PageLoader } from '@/components/shared/atom/page-loader'
import { Toaster } from '@/components/shared/molecule/toaster'
import { useToast } from '@/hooks/use-toast'
import { useTrabajoPendientes } from '@/hooks/use-trabajos-pendientes'
import { TrabajosTableSimple } from '@/components/feats/trabajos-pendientes/trabajos-table-simple'
import { CreateTrabajoDialog } from '@/components/feats/trabajos-pendientes/create-trabajo-dialog'
import { EditTrabajoDialog } from '@/components/feats/trabajos-pendientes/edit-trabajo-dialog'
import { ClientesPendientesFAB } from '@/components/feats/trabajos-pendientes/clientes-pendientes-fab'
import { TrabajoDetailsModal } from '@/components/feats/trabajos-pendientes/trabajo-details-modal'
import { TrabajosHistorialModal } from '@/components/feats/trabajos-pendientes/trabajos-historial-modal'
import { ModuleHeader } from '@/components/shared/organism/module-header'
import { ConfirmDeleteDialog } from '@/components/shared/molecule/dialog'
import type { TrabajoPendiente, TrabajoPendienteCreateData } from '@/lib/types/feats/trabajos-pendientes/trabajo-pendiente-types'

export default function TrabajosPendientesPage() {
  const { toast } = useToast()

  const {
    trabajos,
    filteredTrabajos: allFilteredTrabajos,
    clientes,
    leads,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    createTrabajo,
    updateTrabajo,
    deleteTrabajo,
    getClientesPendientesInstalacion,
    getLeadsPendientesInstalacion
  } = useTrabajoPendientes()

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isHistorialModalOpen, setIsHistorialModalOpen] = useState(false)

  // Selected items
  const [selectedTrabajo, setSelectedTrabajo] = useState<TrabajoPendiente | null>(null)
  const [trabajoToDelete, setTrabajoToDelete] = useState<TrabajoPendiente | null>(null)
  const [trabajoToView, setTrabajoToView] = useState<TrabajoPendiente | null>(null)
  const [initialCI, setInitialCI] = useState<string | undefined>(undefined)

  // Delete loading state
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Get clientes and leads pendientes de instalación
  const clientesPendientes = getClientesPendientesInstalacion()
  const leadsPendientes = getLeadsPendientesInstalacion()

  // Filter out "Finalizado" trabajos from main view
  const filteredTrabajosNoFinalizados = useMemo(() => {
    return allFilteredTrabajos.filter(
      (trabajo) => trabajo.estado.toLowerCase() !== 'finalizado'
    )
  }, [allFilteredTrabajos])

  /**
   * Handle create trabajo
   */
  const handleCreate = async (data: TrabajoPendienteCreateData, archivos?: File[]) => {
    const result = await createTrabajo(data, archivos)
    if (result.success) {
      toast({
        title: 'Éxito',
        description: result.message
      })
      setInitialCI(undefined)
    } else {
      toast({
        title: 'Error',
        description: result.message,
        variant: 'destructive'
      })
    }
  }

  /**
   * Handle view details
   */
  const handleViewDetails = (trabajo: TrabajoPendiente) => {
    setTrabajoToView(trabajo)
    setIsDetailsModalOpen(true)
  }

  /**
   * Handle edit trabajo
   */
  const handleEdit = (trabajo: TrabajoPendiente) => {
    setSelectedTrabajo(trabajo)
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async (id: string, data: Partial<TrabajoPendienteCreateData>) => {
    const result = await updateTrabajo(id, data)
    if (result.success) {
      toast({
        title: 'Éxito',
        description: result.message
      })
    } else {
      toast({
        title: 'Error',
        description: result.message,
        variant: 'destructive'
      })
    }
  }

  /**
   * Handle delete trabajo
   */
  const handleDelete = (trabajo: TrabajoPendiente) => {
    setTrabajoToDelete(trabajo)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!trabajoToDelete?.id) return

    setDeleteLoading(true)
    const result = await deleteTrabajo(trabajoToDelete.id)
    setDeleteLoading(false)

    if (result.success) {
      toast({
        title: 'Éxito',
        description: result.message
      })
      setIsDeleteDialogOpen(false)
      setTrabajoToDelete(null)
    } else {
      toast({
        title: 'Error',
        description: result.message,
        variant: 'destructive'
      })
    }
  }

  /**
   * Handle adding cliente to TP from FAB
   */
  const handleAddToTP = (ci: string) => {
    setInitialCI(ci)
    setIsCreateDialogOpen(true)
  }

  // Show page loader on initial load
  if (loading && allFilteredTrabajos.length === 0) {
    return <PageLoader moduleName="Trabajos Pendientes" text="Cargando trabajos pendientes..." />
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
            <Link href="/">
              <Button
                className="mt-4 bg-red-600 hover:bg-red-700"
                size="icon"
                aria-label="Volver al inicio"
                title="Volver al inicio"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Volver al inicio</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Trabajos Pendientes"
        subtitle="Administra trabajos pendientes y seguimiento"
        badge={{ text: 'Gestión', className: 'bg-indigo-100 text-indigo-800' }}
        className="bg-white shadow-sm border-b border-orange-100"
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 border-indigo-200 text-indigo-700 hover:bg-indigo-50 touch-manipulation"
              onClick={() => setIsHistorialModalOpen(true)}
              aria-label="Ver historial"
              title="Ver historial"
            >
              <History className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Historial</span>
              <span className="sr-only">Ver historial</span>
            </Button>
            <Button
              variant="default"
              size="icon"
              className="h-9 w-9 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold shadow-md touch-manipulation"
              onClick={() => {
                setInitialCI(undefined)
                setIsCreateDialogOpen(true)
              }}
              aria-label="Nuevo trabajo"
              title="Nuevo trabajo"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo Trabajo</span>
              <span className="sr-only">Nuevo trabajo</span>
            </Button>
          </>
        }
      />

      {/* Main Content */}
      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24">
        {/* Search Card */}
        <Card className="border-0 shadow-md border-l-4 border-l-indigo-600 mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Buscar por CI, nombre, estado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchTerm && (
              <p className="text-sm text-gray-600 mt-2">
                {filteredTrabajosNoFinalizados.length} resultado{filteredTrabajosNoFinalizados.length !== 1 ? 's' : ''} encontrado{filteredTrabajosNoFinalizados.length !== 1 ? 's' : ''} (excluye finalizados)
              </p>
            )}
          </CardContent>
        </Card>

        {/* Trabajos Table Card - Full Width */}
        <Card className="border-0 shadow-md border-l-4 border-l-indigo-600">
          <CardHeader>
            <CardTitle>
              Trabajos Activos
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredTrabajosNoFinalizados.length} trabajo{filteredTrabajosNoFinalizados.length !== 1 ? 's' : ''})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrabajosTableSimple
              trabajos={filteredTrabajosNoFinalizados}
              onViewDetails={handleViewDetails}
              onEdit={handleEdit}
              onDelete={handleDelete}
              loading={loading}
            />
          </CardContent>
        </Card>
      </main>

      {/* FAB for Clientes Pendientes */}
      <ClientesPendientesFAB
        clientes={clientesPendientes}
        onAddToTP={handleAddToTP}
        loading={loading}
      />

      {/* Dialogs */}
      <CreateTrabajoDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        clientes={clientes}
        leads={leads}
        initialCI={initialCI}
      />

      <EditTrabajoDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={handleUpdate}
        trabajo={selectedTrabajo}
      />

      <TrabajoDetailsModal
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        trabajo={trabajoToView}
      />

      <TrabajosHistorialModal
        open={isHistorialModalOpen}
        onOpenChange={setIsHistorialModalOpen}
        trabajos={trabajos}
        onViewDetails={handleViewDetails}
      />

      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Eliminar Trabajo Pendiente"
        message={`¿Estás seguro de que quieres eliminar este trabajo pendiente?${
          trabajoToDelete?.Nombre ? ` (Cliente: ${trabajoToDelete.Nombre})` : ''
        }`}
        onConfirm={confirmDelete}
        confirmText="Eliminar Trabajo"
        isLoading={deleteLoading}
      />

      <Toaster />
    </div>
  )
}
