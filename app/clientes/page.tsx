"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/shared/atom/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, ConfirmDeleteDialog } from "@/components/shared/molecule/dialog"
import { User } from "lucide-react"
import { ClienteService } from "@/lib/api-services"
import { ClientsTable } from "@/components/feats/customer-service/clients-table"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { useFuentesSync } from "@/hooks/use-fuentes-sync"
import { Toaster } from "@/components/shared/molecule/toaster"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { CreateClientDialog } from "@/components/feats/cliente/create-client-dialog"
import { FuentesManager } from "@/components/shared/molecule/fuentes-manager"
import { ExportButtons } from "@/components/shared/molecule/export-buttons"
import type {
  Cliente,
  ClienteCreateData,
  ClienteUpdateData,
} from "@/lib/api-types"
import type { ExportOptions } from "@/lib/export-service"
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
  
  // Sincronizar fuentes de clientes con localStorage
  useFuentesSync([], clients, !initialLoading)
  
  // Estado para capturar los filtros aplicados desde ClientsTable
  const [appliedFilters, setAppliedFilters] = useState({
    searchTerm: "",
    estado: [] as string[],
    fuente: "",
    comercial: "",
    fechaDesde: "",
    fechaHasta: "",
  })

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

  // Handler para actualizar solo la prioridad del cliente
  const handleUpdateClientPrioridad = async (clientId: string, prioridad: "Alta" | "Media" | "Baja") => {
    try {
      // Buscar el cliente por su ID de MongoDB
      const cliente = clients.find(c => c.id === clientId)
      if (!cliente) {
        throw new Error("Cliente no encontrado")
      }
      
      const result = await ClienteService.actualizarCliente(cliente.numero, { prioridad })
      if (!result?.success) {
        throw new Error(result?.message || "Error al actualizar la prioridad")
      }
      await fetchClients()
      // No mostrar toast aquí, lo maneja la tabla
    } catch (err: unknown) {
      console.error('Error updating client priority:', err)
      throw err // Re-lanzar para que la tabla maneje el error
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

  const handleUploadClientFoto = async (
    client: Cliente,
    payload: { file: File; tipo: "instalacion" | "averia" }
  ) => {
    try {
      await ClienteService.uploadFotoCliente(client.numero, payload)
      toast({
        title: "Archivo agregado",
        description: `Se adjuntó correctamente como ${payload.tipo}.`,
      })
      await fetchClients()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo subir el archivo"
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

  // Función para parsear fechas
  const parseDateValue = (value?: string) => {
    if (!value) return null
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [day, month, year] = value.split("/").map(Number)
      const parsed = new Date(year, month - 1, day)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  // Función para construir texto de búsqueda
  const buildSearchText = (client: Cliente) => {
    const parts: string[] = []
    const visited = new WeakSet<object>()

    const addValue = (value: unknown) => {
      if (value === null || value === undefined) return
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        parts.push(String(value))
        return
      }
      if (value instanceof Date) {
        parts.push(value.toISOString())
        return
      }
      if (Array.isArray(value)) {
        value.forEach(addValue)
        return
      }
      if (typeof value === "object") {
        if (visited.has(value)) return
        visited.add(value)
        Object.values(value as Record<string, unknown>).forEach(addValue)
      }
    }

    addValue(client)
    return parts.join(" ").toLowerCase()
  }

  // Clientes filtrados usando la misma lógica que ClientsTable
  const filteredClients = useMemo(() => {
    const search = appliedFilters.searchTerm.trim().toLowerCase()
    const fechaDesde = parseDateValue(appliedFilters.fechaDesde)
    const fechaHasta = parseDateValue(appliedFilters.fechaHasta)
    const selectedEstados = appliedFilters.estado.map((estado) => estado.toLowerCase())
    const selectedFuente = appliedFilters.fuente.trim().toLowerCase()
    const selectedComercial = appliedFilters.comercial.trim().toLowerCase()

    if (fechaDesde) fechaDesde.setHours(0, 0, 0, 0)
    if (fechaHasta) fechaHasta.setHours(23, 59, 59, 999)

    const filtered = clients.filter((client) => {
      if (search) {
        const text = buildSearchText(client)
        if (!text.includes(search)) {
          return false
        }
      }

      if (appliedFilters.estado.length > 0) {
        const estado = client.estado?.trim()
        if (!estado || !selectedEstados.includes(estado.toLowerCase())) {
          return false
        }
      }

      if (appliedFilters.fuente) {
        const fuente = client.fuente?.trim().toLowerCase()
        if (!fuente || fuente !== selectedFuente) {
          return false
        }
      }

      if (appliedFilters.comercial) {
        const comercial = client.comercial?.trim().toLowerCase()
        if (!comercial || comercial !== selectedComercial) {
          return false
        }
      }

      if (fechaDesde || fechaHasta) {
        const fecha = parseDateValue(client.fecha_contacto)
        if (!fecha) return false
        if (fechaDesde && fecha < fechaDesde) return false
        if (fechaHasta && fecha > fechaHasta) return false
      }

      return true
    })

    // Ordenar por los últimos 3 dígitos del código de cliente (descendente)
    return filtered.sort((a, b) => {
      const getLastThreeDigits = (numero: string) => {
        const digits = numero.match(/\d+/g)?.join('') || '0'
        return parseInt(digits.slice(-3)) || 0
      }

      const aNum = getLastThreeDigits(a.numero)
      const bNum = getLastThreeDigits(b.numero)

      return bNum - aNum
    })
  }, [clients, appliedFilters])

  // Preparar opciones de exportación para clientes
  const getExportOptions = (): Omit<ExportOptions, 'filename'> => {
    // Construir título con filtro de estado si aplica
    let titulo = 'Listado de Clientes'
    if (appliedFilters.estado.length === 1) {
      titulo = `Listado de Clientes - ${appliedFilters.estado[0]}`
    } else if (appliedFilters.estado.length > 1) {
      titulo = `Listado de Clientes - ${appliedFilters.estado.length} estados`
    }
    
    // Verificar si hay clientes con estado "Instalación en Proceso"
    const tieneInstalacionEnProceso = filteredClients.some(c => c.estado === 'Instalación en Proceso')
    
    // Ordenar clientes por provincia: La Habana primero, luego el resto alfabéticamente
    const clientesOrdenados = [...filteredClients].sort((a, b) => {
      const provinciaA = (a.provincia_montaje || '').trim()
      const provinciaB = (b.provincia_montaje || '').trim()
      
      // Si ambos son La Habana, mantener orden original
      if (provinciaA === 'La Habana' && provinciaB === 'La Habana') return 0
      
      // La Habana siempre va primero
      if (provinciaA === 'La Habana') return -1
      if (provinciaB === 'La Habana') return 1
      
      // Para el resto, ordenar alfabéticamente
      return provinciaA.localeCompare(provinciaB, 'es')
    })
    
    const exportData = clientesOrdenados.map((client, index) => {
      // Formatear ofertas SIN saltos de línea - el wrap natural de Excel lo hará
      let ofertaTexto = ''
      
      if (client.ofertas && client.ofertas.length > 0) {
        const ofertasFormateadas = client.ofertas.map((oferta: any) => {
          const productos: string[] = []
          
          // Inversor
          if (oferta.inversor_codigo && oferta.inversor_cantidad > 0) {
            const nombre = oferta.inversor_nombre || oferta.inversor_codigo
            productos.push(`${oferta.inversor_cantidad}x ${nombre}`)
          }
          
          // Batería
          if (oferta.bateria_codigo && oferta.bateria_cantidad > 0) {
            const nombre = oferta.bateria_nombre || oferta.bateria_codigo
            productos.push(`${oferta.bateria_cantidad}x ${nombre}`)
          }
          
          // Paneles
          if (oferta.panel_codigo && oferta.panel_cantidad > 0) {
            const nombre = oferta.panel_nombre || oferta.panel_codigo
            productos.push(`${oferta.panel_cantidad}x ${nombre}`)
          }
          
          // Elementos personalizados de la oferta
          if (oferta.elementos_personalizados) {
            productos.push(oferta.elementos_personalizados)
          }
          
          // Agregar • al inicio de cada producto
          return productos.length > 0 ? '• ' + productos.join(' • ') : ''
        }).filter(Boolean)
        
        ofertaTexto = ofertasFormateadas.join(' • ') || ''
      }

      const baseData: any = {
        numero: index + 1,
        nombre: client.nombre || 'N/A',
        telefono: client.telefono || 'N/A',
        provincia: client.provincia_montaje || 'N/A',
        municipio: client.municipio || 'N/A',
        direccion: client.direccion || 'N/A',
      }

      // Si hay clientes con "Instalación en Proceso", agregar columna "falta"
      if (tieneInstalacionEnProceso) {
        baseData.falta = client.estado === 'Instalación en Proceso' 
          ? (client.falta_instalacion || 'No especificado')
          : ''
      }

      baseData.oferta = ofertaTexto

      return baseData
    })

    // Definir columnas base
    const baseColumns = [
      { header: 'No.', key: 'numero', width: 4 },
      { header: 'Nombre', key: 'nombre', width: 14 },
      { header: 'Teléfono', key: 'telefono', width: 14 },
      { header: 'Provincia', key: 'provincia', width: 12 },
      { header: 'Municipio', key: 'municipio', width: 12 },
      { header: 'Dirección', key: 'direccion', width: 38 },
    ]

    // Si hay clientes con "Instalación en Proceso", agregar columna "Falta"
    if (tieneInstalacionEnProceso) {
      baseColumns.push({ header: 'Falta', key: 'falta', width: 20 })
    }

    // Agregar columna de oferta al final
    baseColumns.push({ header: 'Oferta', key: 'oferta', width: 23.57 })

    return {
      title: `Suncar SRL: ${titulo}`,
      subtitle: `Fecha: ${new Date().toLocaleDateString('es-ES')}`,
      columns: baseColumns,
      data: exportData
    }
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
          <div className="flex items-center gap-2">
            <FuentesManager />
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
          </div>
        }
      />
      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <ClientsTable
          clients={clients}
          onEdit={handleEditClient}
          onDelete={handleDeleteClient}
          onViewLocation={handleViewClientLocation}
          onUploadFotos={handleUploadClientFoto}
          onUpdatePrioridad={handleUpdateClientPrioridad}
          loading={loading}
          onFiltersChange={setAppliedFilters}
          exportButtons={
            filteredClients.length > 0 ? (
              <ExportButtons
                exportOptions={getExportOptions()}
                baseFilename="clientes"
                variant="compact"
              />
            ) : undefined
          }
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
