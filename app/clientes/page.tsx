"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Label } from "@/components/shared/atom/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, ConfirmDeleteDialog } from "@/components/shared/molecule/dialog"
import { Calendar } from "@/components/shared/molecule/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shared/molecule/popover"
import { Search, User, MapPin, ArrowLeft, CalendarIcon } from "lucide-react"
import { ClienteService } from "@/lib/api-services"
import { ElementosPersonalizadosFields } from "@/components/feats/leads/elementos-personalizados-fields"
import { OfertasAsignacionFields } from "@/components/feats/leads/ofertas-asignacion-fields"
import { ClientsTable } from "@/components/feats/customer-service/clients-table"
import { PageLoader } from "@/components/shared/atom/page-loader"
import MapPicker from "@/components/shared/organism/MapPickerNoSSR"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type {
  Cliente,
  ClienteCreateData,
  ClienteUpdateData,
  ElementoPersonalizado,
  OfertaAsignacion,
  OfertaEmbebida,
} from "@/lib/api-types"
import { downloadFile } from "@/lib/utils/download-file"
import { EditClientDialog } from "@/components/feats/cliente/edit-client-dialog"

export default function ClientesPage() {
  const [clients, setClients] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const [isCreateClientDialogOpen, setIsCreateClientDialogOpen] = useState(false)
  const [clientFormLoading, setClientFormLoading] = useState(false)
  const { toast } = useToast()
  const [showMapModalClient, setShowMapModalClient] = useState(false)
  const [clientLatLng, setClientLatLng] = useState<{ lat: string, lng: string }>({ lat: '', lng: '' })
  const [fechaInstalacion, setFechaInstalacion] = useState<Date | undefined>(undefined)
  const [isEditClientDialogOpen, setIsEditClientDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Cliente | null>(null)
  const [editClientFormLoading, setEditClientFormLoading] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Cliente | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [createOfertas, setCreateOfertas] = useState<OfertaAsignacion[]>([])
  const [createElementos, setCreateElementos] = useState<ElementoPersonalizado[]>([])
  const [fechaContacto, setFechaContacto] = useState<string>("")
  const [fechaMontaje, setFechaMontaje] = useState<string>("")

  // Cargar clientes
  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const params: { nombre?: string } = {}
      if (searchTerm.trim()) params.nombre = searchTerm.trim()
      const data = await ClienteService.getClientes(params)
      setClients(Array.isArray(data) ? data : [])
    } catch (error: unknown) {
      console.error('Error cargando clientes:', error)
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [searchTerm])

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
                  Gestión de Clientes
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Servicio
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Visualiza y administra clientes</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="default"
                size="sm"
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold shadow-md"
                onClick={() => setIsCreateClientDialogOpen(true)}
              >
                <User className="h-4 w-4 mr-2" />
                Crear Cliente
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-8">
        <Card className="border-0 shadow-md mb-6 border-l-4 border-l-orange-600">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="search-client" className="text-sm font-medium text-gray-700 mb-2 block">
                  Buscar por nombre
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search-client"
                    placeholder="Buscar por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md border-l-4 border-l-orange-600">
          <CardHeader>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>
              Mostrando {clients.length} clientes
            </CardDescription>
          </CardHeader>
                      <CardContent>
              <ClientsTable
                clients={clients}
                onEdit={handleEditClient}
                onDelete={handleDeleteClient}
                onViewLocation={handleViewClientLocation}
                loading={loading}
              />
            </CardContent>
          </Card>
        {/* Modal de creación de cliente */}
        <Dialog open={isCreateClientDialogOpen} onOpenChange={v => {
          setIsCreateClientDialogOpen(v)
          if (!v) {
            setClientLatLng({ lat: '', lng: '' })
            setFechaInstalacion(undefined)
            setFechaContacto('')
            setFechaMontaje('')
            setCreateOfertas([])
            setCreateElementos([])
            setTimeout(() => {
              const form = document.getElementById('create-client-form') as HTMLFormElement | null
              if (form) {
                const nombreInput = form.elements.namedItem('nombre') as HTMLInputElement | null;
                if (nombreInput) nombreInput.value = '';
                const numeroInput = form.elements.namedItem('numero') as HTMLInputElement | null;
                if (numeroInput) numeroInput.value = '';
                const direccionInput = form.elements.namedItem('direccion') as HTMLInputElement | null;
                if (direccionInput) direccionInput.value = '';
              }
            }, 0)
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear nuevo cliente</DialogTitle>
            </DialogHeader>
            <form id="create-client-form" className="space-y-6" onSubmit={async e => {
              e.preventDefault()
              setClientFormLoading(true)
              const form = e.target as HTMLFormElement
              const nombre = (form.elements.namedItem('nombre') as HTMLInputElement).value.trim()
              const numero = (form.elements.namedItem('numero') as HTMLInputElement).value.trim()
              const direccion = (form.elements.namedItem('direccion') as HTMLInputElement).value.trim()
              const telefono = (form.elements.namedItem('telefono') as HTMLInputElement)?.value.trim()
              const telefonoAdicional = (form.elements.namedItem('telefono_adicional') as HTMLInputElement)?.value.trim()
              const carnetIdentidad = (form.elements.namedItem('carnet_identidad') as HTMLInputElement)?.value.trim()
              const estado = (form.elements.namedItem('estado') as HTMLInputElement)?.value.trim()
              const fuente = (form.elements.namedItem('fuente') as HTMLInputElement)?.value.trim()
              const referencia = (form.elements.namedItem('referencia') as HTMLInputElement)?.value.trim()
              const paisContacto = (form.elements.namedItem('pais_contacto') as HTMLInputElement)?.value.trim()
              const comentario = (form.elements.namedItem('comentario') as HTMLTextAreaElement)?.value.trim()
              const provinciaMontaje = (form.elements.namedItem('provincia_montaje') as HTMLInputElement)?.value.trim()
              const comercial = (form.elements.namedItem('comercial') as HTMLInputElement)?.value.trim()
              const metodoPago = (form.elements.namedItem('metodo_pago') as HTMLInputElement)?.value.trim()
              const moneda = (form.elements.namedItem('moneda') as HTMLInputElement)?.value.trim()
              const latitud = clientLatLng.lat.trim()
              const longitud = clientLatLng.lng.trim()

              if (!nombre || !numero || !direccion) {
                toast({
                  title: "Error",
                  description: 'Completa todos los campos obligatorios (nombre, número, dirección)',
                  variant: "destructive",
                });
                setClientFormLoading(false)
                return
              }

              try {
                const clienteData: ClienteCreateData = {
                  nombre,
                  numero,
                  direccion,
                }

                if (telefono) clienteData.telefono = telefono
                if (telefonoAdicional) clienteData.telefono_adicional = telefonoAdicional
                if (fechaContacto) clienteData.fecha_contacto = fechaContacto
                if (estado) clienteData.estado = estado
                if (fuente) clienteData.fuente = fuente
                if (referencia) clienteData.referencia = referencia
                if (paisContacto) clienteData.pais_contacto = paisContacto
                if (comentario) clienteData.comentario = comentario
                if (provinciaMontaje) clienteData.provincia_montaje = provinciaMontaje
                if (comercial) clienteData.comercial = comercial
                if (metodoPago) clienteData.metodo_pago = metodoPago
                if (moneda) clienteData.moneda = moneda
                if (latitud) clienteData.latitud = latitud
                if (longitud) clienteData.longitud = longitud
                if (carnetIdentidad) clienteData.carnet_identidad = carnetIdentidad
                if (fechaMontaje) clienteData.fecha_montaje = fechaMontaje
                if (fechaInstalacion) clienteData.fecha_instalacion = fechaInstalacion.toISOString()
                if (createOfertas.length > 0) clienteData.ofertas = createOfertas
                if (createElementos.length > 0) clienteData.elementos_personalizados = createElementos

                const dataCliente = await ClienteService.crearCliente(clienteData)

                if (!dataCliente?.success) {
                  throw new Error(dataCliente?.message || "Error al crear el cliente")
                }
                toast({
                  title: "Éxito",
                  description: dataCliente.message || "Cliente creado correctamente",
                });
                setIsCreateClientDialogOpen(false)
                setClientLatLng({ lat: '', lng: '' })
                setFechaInstalacion(undefined)
                setFechaContacto('')
                setFechaMontaje('')
                setCreateOfertas([])
                setCreateElementos([])
                const form = document.getElementById('create-client-form') as HTMLFormElement | null
                if (form) form.reset()
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("refreshClientsTable"))
                }
              } catch (err: unknown) {
                toast({
                  title: "Error",
                  description: err instanceof Error ? err.message : "Error al crear el cliente",
                  variant: "destructive",
                });
              } finally {
                setClientFormLoading(false)
              }
            }}>
              <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input id="nombre" name="nombre" placeholder="Nombre del cliente" required />
                </div>
                <div>
                  <Label htmlFor="numero">Número *</Label>
                  <Input id="numero" name="numero" placeholder="Número identificador" required />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="direccion">Dirección *</Label>
                  <Input id="direccion" name="direccion" placeholder="Dirección" required />
                </div>
                <div>
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input id="telefono" name="telefono" placeholder="555-1234" />
                </div>
                <div>
                  <Label htmlFor="telefono_adicional">Teléfono adicional</Label>
                  <Input id="telefono_adicional" name="telefono_adicional" placeholder="Teléfono secundario" />
                </div>
                <div>
                  <Label htmlFor="estado">Estado</Label>
                  <Input id="estado" name="estado" placeholder="Ej: activo, prospecto" />
                </div>
                <div>
                  <Label htmlFor="fuente">Fuente</Label>
                  <Input id="fuente" name="fuente" placeholder="Página web, referido..." />
                </div>
                <div>
                  <Label htmlFor="referencia">Referencia</Label>
                  <Input id="referencia" name="referencia" placeholder="Detalle de origen" />
                </div>
                <div>
                  <Label htmlFor="pais_contacto">País de contacto</Label>
                  <Input id="pais_contacto" name="pais_contacto" placeholder="País del cliente" />
                </div>
                <div>
                  <Label htmlFor="provincia_montaje">Provincia de montaje</Label>
                  <Input id="provincia_montaje" name="provincia_montaje" placeholder="Provincia" />
                </div>
                <div>
                  <Label htmlFor="comercial">Comercial</Label>
                  <Input id="comercial" name="comercial" placeholder="Nombre del comercial" />
                </div>
                <div>
                  <Label htmlFor="metodo_pago">Método de pago</Label>
                  <Input id="metodo_pago" name="metodo_pago" placeholder="Transferencia, efectivo..." />
                </div>
                <div>
                  <Label htmlFor="moneda">Moneda</Label>
                  <Input id="moneda" name="moneda" placeholder="USD, CUP, MLC..." />
                </div>
                <div>
                  <Label htmlFor="carnet_identidad">Carnet de Identidad</Label>
                  <Input id="carnet_identidad" name="carnet_identidad" placeholder="12345678901" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha_contacto">Fecha de contacto</Label>
                  <Input
                    id="fecha_contacto"
                    name="fecha_contacto"
                    type="date"
                    value={fechaContacto}
                    onChange={(event) => setFechaContacto(event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="fecha_montaje">Fecha de montaje</Label>
                  <Input
                    id="fecha_montaje"
                    name="fecha_montaje"
                    type="date"
                    value={fechaMontaje}
                    onChange={(event) => setFechaMontaje(event.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="comentario">Comentario</Label>
                <Textarea
                  id="comentario"
                  name="comentario"
                  placeholder="Notas generales o contexto del cliente"
                  rows={3}
                />
              </div>

              <div className="space-y-6">
                <OfertasAsignacionFields
                  value={createOfertas}
                  onChange={setCreateOfertas}
                />

                <ElementosPersonalizadosFields
                  value={createElementos}
                  onChange={setCreateElementos}
                />
              </div>

              <div>
                <Label>Fecha de Instalación</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fechaInstalacion && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fechaInstalacion ? (
                        format(fechaInstalacion, "PPP 'a las' p", { locale: es })
                      ) : (
                        <span>Seleccionar fecha (opcional)</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fechaInstalacion}
                      onSelect={setFechaInstalacion}
                      locale={es}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Ubicación (usar mapa para precisión)</Label>
                <div className="flex gap-2 items-center">
                  <Input value={clientLatLng.lat} placeholder="Latitud" readOnly className="w-32" />
                  <Input value={clientLatLng.lng} placeholder="Longitud" readOnly className="w-32" />
                  <Button type="button" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setShowMapModalClient(true)}>
                    <MapPin className="h-4 w-4 mr-1" /> Seleccionar en mapa
                  </Button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 sticky bottom-0 bg-white pb-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateClientDialogOpen(false)} disabled={clientFormLoading}>Cancelar</Button>
                <Button type="submit" className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white" disabled={clientFormLoading}>{clientFormLoading ? 'Guardando...' : 'Guardar'}</Button>
              </div>
              </div>
            </form>
            {/* Modal de mapa para seleccionar ubicación */}
            <Dialog open={showMapModalClient} onOpenChange={setShowMapModalClient}>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Seleccionar ubicación en el mapa</DialogTitle>
                </DialogHeader>
                <div className="mb-4 text-gray-700">Haz click en el mapa para seleccionar la ubicación. Solo se guardarán latitud y longitud.</div>
                <MapPicker
                  initialLat={clientLatLng.lat ? parseFloat(clientLatLng.lat) : 23.1136}
                  initialLng={clientLatLng.lng ? parseFloat(clientLatLng.lng) : -82.3666}
                  onSelect={(lat: number, lng: number) => {
                    setClientLatLng({ lat: String(lat), lng: String(lng) })
                  }}
                />
                <div className="flex justify-end pt-4">
                  <Button type="button" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setShowMapModalClient(false)}>
                    Confirmar ubicación
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
