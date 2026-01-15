"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/shared/atom/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, ConfirmDeleteDialog } from "@/components/shared/molecule/dialog"
import { User } from "lucide-react"
import { ClienteService } from "@/lib/api-services"
import { ClientsTable } from "@/components/feats/customer-service/clients-table"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { CreateClientDialog } from "@/components/feats/cliente/create-client-dialog"
import type {
  Cliente,
  ClienteCreateData,
  ClienteUpdateData,
} from "@/lib/api-types"
import { downloadFile } from "@/lib/utils/download-file"
import { EditClientDialog } from "@/components/feats/cliente/edit-client-dialog"

export default function ClientesPage() {
  const [clients, setClients] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const [isCreateClientDialogOpen, setIsCreateClientDialogOpen] = useState(false)
  const [clientFormLoading, setClientFormLoading] = useState(false)
  const { toast } = useToast()
  const [isEditClientDialogOpen, setIsEditClientDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Cliente | null>(null)
  const [editClientFormLoading, setEditClientFormLoading] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Cliente | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Cargar clientes
  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      // Primero obtener todos los clientes
      const allClients = await ClienteService.getClientes({})
      
      // Si hay término de búsqueda, filtrar en el frontend
      setClients(allClients)
    } catch (error: unknown) {
      console.error('Error cargando clientes:', error)
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Cargar datos iniciales
  const loadInitialData = async () => {
    setInitialLoading(true)
    try {
      await fetchClients()
    } catch (error: unknown) {
      console.error('Error cargando datos iniciales:', error)
    } finally {
      setInitialLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
    // eslint-disable-next-line
  }, [])

  useEffect(() => {
    if (!initialLoading) {
      fetchClients()
    }
  }, [initialLoading, fetchClients])

  useEffect(() => {
    if (typeof window === "undefined") return undefined
    const refreshClients = () => fetchClients()
    window.addEventListener("refreshClientsTable", refreshClients)
    return () => {
      window.removeEventListener("refreshClientsTable", refreshClients)
    }
  }, [fetchClients])



  // Acción para editar cliente
  const handleEditClient = (client: Cliente) => {
    setEditingClient(client)
    setIsEditClientDialogOpen(true)
  }

  // Handler para actualizar cliente
  const handleUpdateClient = async (data: ClienteUpdateData) => {
    if (!editingClient) return

    try {
      const result = await ClienteService.actualizarCliente(editingClient.numero, data)
      if (!result?.success) {
        throw new Error(result?.message || "Error al actualizar el cliente")
      }
      toast({
        title: "Éxito",
        description: result.message || "Cliente actualizado correctamente",
      })
      await fetchClients()
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Error al actualizar el cliente",
        variant: "destructive",
      })
      throw err
    }
  }

  const handleCreateClient = async (data: ClienteCreateData) => {
    setClientFormLoading(true)
    try {
      const dataCliente = await ClienteService.crearCliente(data)
      if (!dataCliente?.success) {
        throw new Error(dataCliente?.message || "Error al crear el cliente")
      }
      toast({
        title: "Éxito",
        description: dataCliente.message || "Cliente creado correctamente",
      })
      setIsCreateClientDialogOpen(false)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refreshClientsTable"))
      }
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Error al crear el cliente",
        variant: "destructive",
      })
    } finally {
      setClientFormLoading(false)
    }
  }

  // Acción para eliminar cliente
  const handleDeleteClient = (client: Cliente) => {
    setClientToDelete(client)
    setIsDeleteDialogOpen(true)
  }

  const handleUploadClientComprobante = async (
    client: Cliente,
    payload: { file: File; metodo_pago?: string; moneda?: string }
  ) => {
    try {
      const result = await ClienteService.uploadComprobante(client.numero, payload)
      toast({
        title: "Comprobante actualizado",
        description: result.metodo_pago
          ? `Método: ${result.metodo_pago}${result.moneda ? ` • Moneda: ${result.moneda}` : ''}`
          : 'Comprobante guardado correctamente',
      })
      await fetchClients()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo subir el comprobante'
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
      throw error instanceof Error ? error : new Error(message)
    }
  }

  const handleDownloadClientComprobante = async (client: Cliente) => {
    if (!client.comprobante_pago_url) {
      toast({
        title: "Sin comprobante",
        description: "Este cliente aún no tiene un comprobante registrado.",
        variant: "destructive",
      })
      return
    }

    try {
      await downloadFile(client.comprobante_pago_url, `comprobante-cliente-${client.numero || client.nombre || 'archivo'}`)
      toast({
        title: "Descarga iniciada",
        description: "Revisa tu carpeta de descargas para ver el comprobante.",
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo descargar el comprobante'
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    }
  }

  // Confirmar eliminación de cliente
  const confirmDeleteClient = async () => {
    if (!clientToDelete) return
    
    setDeleteLoading(true)
    try {
      const res = await ClienteService.eliminarCliente(clientToDelete.numero)
      if (!res?.success) {
        throw new Error(res?.message || 'Error al eliminar el cliente')
      }
      toast({
        title: "Éxito",
        description: 'Cliente eliminado correctamente',
      });
      setIsDeleteDialogOpen(false);
      setClientToDelete(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('refreshClientsTable'))
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'No se pudo eliminar el cliente',
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleViewClientLocation = (client: Cliente) => {
    void client
  }

  // Mostrar loader mientras se cargan los datos iniciales
  if (initialLoading) {
    return <PageLoader moduleName="Clientes" text="Cargando lista de clientes..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Gestión de Clientes"
        subtitle="Visualiza y administra clientes"
        badge={{ text: "Servicio", className: "bg-orange-100 text-orange-800" }}
        className="bg-white shadow-sm border-b border-orange-100"
        actions={
          <Button
            size="icon"
            className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold shadow-md touch-manipulation"
            onClick={() => setIsCreateClientDialogOpen(true)}
            aria-label="Crear cliente"
            title="Crear cliente"
          >
            <User className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Crear Cliente</span>
            <span className="sr-only">Crear cliente</span>
          </Button>
        }
      />
      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <ClientsTable
          clients={clients}
          onEdit={handleEditClient}
          onDelete={handleDeleteClient}
          onViewLocation={handleViewClientLocation}
          loading={loading}
        />
        {/* Modal de creacion de cliente */}
        <Dialog open={isCreateClientDialogOpen} onOpenChange={setIsCreateClientDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear nuevo cliente</DialogTitle>
            </DialogHeader>
            <CreateClientDialog
              onSubmit={handleCreateClient}
              onCancel={() => setIsCreateClientDialogOpen(false)}
              isLoading={clientFormLoading}
            />
          </DialogContent>
        </Dialog>
        {/* Modal de edición de cliente */}
        {editingClient && (
          <EditClientDialog
            open={isEditClientDialogOpen}
            onOpenChange={(open) => {
              setIsEditClientDialogOpen(open)
              if (!open) setEditingClient(null)
            }}
            client={editingClient}
            onSubmit={handleUpdateClient}
            isLoading={editClientFormLoading}
          />
        )}

        {/* Modal de confirmación de eliminación */}
        <ConfirmDeleteDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          title="Eliminar Cliente"
          message={`¿Estás seguro de que quieres eliminar al cliente ${clientToDelete?.nombre}? Esta acción no se puede deshacer.`}
          onConfirm={confirmDeleteClient}
          confirmText="Eliminar Cliente"
          isLoading={deleteLoading}
        />
      </main>
      <Toaster />
    </div>
  )
} 
