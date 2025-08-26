"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, ConfirmDeleteDialog } from "@/components/shared/molecule/dialog"
import { Search, User, MapPin, ArrowLeft } from "lucide-react"
import { ClienteService } from "@/lib/api-services"
import { ClientsTable } from "@/components/feats/customer-service/clients-table"
import { PageLoader } from "@/components/shared/atom/page-loader"
import MapPicker from "@/components/shared/organism/MapPickerNoSSR"

export default function ClientesPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const [isCreateClientDialogOpen, setIsCreateClientDialogOpen] = useState(false)
  const [clientFormLoading, setClientFormLoading] = useState(false)
  const [clientFormError, setClientFormError] = useState<string | null>(null)
  const [clientFormSuccess, setClientFormSuccess] = useState<string | null>(null)
  const [showMapModalClient, setShowMapModalClient] = useState(false)
  const [clientLatLng, setClientLatLng] = useState<{ lat: string, lng: string }>({ lat: '', lng: '' })
  const [isEditClientDialogOpen, setIsEditClientDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<any | null>(null)
  const [editClientFormLoading, setEditClientFormLoading] = useState(false)
  const [editClientFormError, setEditClientFormError] = useState<string | null>(null)
  const [editClientFormSuccess, setEditClientFormSuccess] = useState<string | null>(null)
  const [editClientLatLng, setEditClientLatLng] = useState<{ lat: string, lng: string }>({ lat: '', lng: '' })
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<any | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)


  // Cargar clientes
  const fetchClients = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (searchTerm) params.nombre = searchTerm
      const data = await ClienteService.getClientes(params)
      setClients(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  // Cargar datos iniciales
  const loadInitialData = async () => {
    setInitialLoading(true)
    try {
      await fetchClients()
    } catch (e: any) {
      console.error('Error cargando datos iniciales:', e)
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
    // eslint-disable-next-line
  }, [searchTerm])

  useEffect(() => {
    if (typeof window === "undefined") return;
    const refreshClients = () => fetchClients()
    window.addEventListener("refreshClientsTable", refreshClients)
    return () => {
      window.removeEventListener("refreshClientsTable", refreshClients)
    }
  }, [])



  // Acción para editar cliente
  const handleEditClient = (client: any) => {
    setEditingClient(client)
    setEditClientLatLng({ lat: client.latitud || '', lng: client.longitud || '' })
    setIsEditClientDialogOpen(true)
    setEditClientFormError(null)
    setEditClientFormSuccess(null)
  }

  // Acción para eliminar cliente
  const handleDeleteClient = (client: any) => {
    setClientToDelete(client)
    setIsDeleteDialogOpen(true)
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
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('refreshClientsTable'))
      }
    } catch (e: any) {
      alert(e?.message || 'No se pudo eliminar el cliente')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Acción para ver ubicación del cliente
  const handleViewClientLocation = (client: any) => {
    // Esta funcionalidad se maneja dentro del componente ClientsTable
    console.log('Ver ubicación del cliente:', client)
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
            setClientFormError(null)
            setClientFormSuccess(null)
            setClientLatLng({ lat: '', lng: '' })
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
              setClientFormError(null)
              setClientFormSuccess(null)
              const form = e.target as HTMLFormElement
              const nombre = (form.elements.namedItem('nombre') as HTMLInputElement).value.trim()
              const numero = (form.elements.namedItem('numero') as HTMLInputElement).value.trim()
              const direccion = (form.elements.namedItem('direccion') as HTMLInputElement).value.trim()
              const latitud = clientLatLng.lat
              const longitud = clientLatLng.lng
              if (!nombre || !numero || !direccion) {
                setClientFormError('Completa todos los campos obligatorios')
                setClientFormLoading(false)
                return
              }
              try {
                const dataCliente = await ClienteService.crearCliente({ nombre, numero, direccion, latitud, longitud })
                if (!dataCliente?.success) {
                  throw new Error(dataCliente?.message || "Error al crear el cliente")
                }
                setClientFormSuccess(dataCliente.message || "Cliente creado correctamente")
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("refreshClientsTable"))
                }
                setTimeout(() => {
                  setIsCreateClientDialogOpen(false)
                  setClientFormSuccess(null)
                  setClientFormError(null)
                  setClientLatLng({ lat: '', lng: '' })
                  const form = document.getElementById('create-client-form') as HTMLFormElement | null
                  if (form) {
                    const nombreInput = form.elements.namedItem('nombre') as HTMLInputElement | null;
                    if (nombreInput) nombreInput.value = '';
                    const numeroInput = form.elements.namedItem('numero') as HTMLInputElement | null;
                    if (numeroInput) numeroInput.value = '';
                    const direccionInput = form.elements.namedItem('direccion') as HTMLInputElement | null;
                    if (direccionInput) direccionInput.value = '';
                  }
                }, 1200)
              } catch (err: any) {
                setClientFormError(err.message || "Error al crear el cliente")
              } finally {
                setClientFormLoading(false)
              }
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input id="nombre" name="nombre" placeholder="Nombre del cliente" />
                </div>
                <div>
                  <Label htmlFor="numero">Número</Label>
                  <Input id="numero" name="numero" placeholder="Número identificador" />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input id="direccion" name="direccion" placeholder="Dirección" />
                </div>
                <div className="md:col-span-2">
                  <Label>Ubicación (opcional)</Label>
                  <div className="flex gap-2 items-center">
                    <Input value={clientLatLng.lat} placeholder="Latitud" readOnly className="w-32" />
                    <Input value={clientLatLng.lng} placeholder="Longitud" readOnly className="w-32" />
                    <Button type="button" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setShowMapModalClient(true)}>
                      <MapPin className="h-4 w-4 mr-1" /> Seleccionar en mapa
                    </Button>
                  </div>
                </div>
              </div>
              {clientFormError && <div className="text-red-600 text-sm pt-2">{clientFormError}</div>}
              {clientFormSuccess && <div className="text-green-600 text-sm pt-2">{clientFormSuccess}</div>}
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateClientDialogOpen(false)} disabled={clientFormLoading}>Cancelar</Button>
                <Button type="submit" className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white" disabled={clientFormLoading}>{clientFormLoading ? 'Guardando...' : 'Guardar'}</Button>
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
        <Dialog open={isEditClientDialogOpen} onOpenChange={v => {
          setIsEditClientDialogOpen(v)
          if (!v) {
            setEditClientFormError(null)
            setEditClientFormSuccess(null)
            setEditClientLatLng({ lat: '', lng: '' })
            setEditingClient(null)
            setTimeout(() => {
              const form = document.getElementById('edit-client-form') as HTMLFormElement | null
              if (form) {
                const nombreInput = form.elements.namedItem('nombre') as HTMLInputElement | null;
                if (nombreInput) nombreInput.value = '';
                const direccionInput = form.elements.namedItem('direccion') as HTMLInputElement | null;
                if (direccionInput) direccionInput.value = '';
              }
            }, 0)
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar cliente</DialogTitle>
            </DialogHeader>
            <form id="edit-client-form" className="space-y-6" onSubmit={async e => {
              e.preventDefault()
              setEditClientFormLoading(true)
              setEditClientFormError(null)
              setEditClientFormSuccess(null)
              if (!editingClient) return
              const form = e.target as HTMLFormElement
              const nombre = (form.elements.namedItem('nombre') as HTMLInputElement).value.trim()
              const direccion = (form.elements.namedItem('direccion') as HTMLInputElement).value.trim()
              const latitud = editClientLatLng.lat
              const longitud = editClientLatLng.lng
              // Solo enviar campos que cambian
              const updateBody: any = {}
              if (nombre && nombre !== editingClient.nombre) updateBody.nombre = nombre
              if (direccion && direccion !== editingClient.direccion) updateBody.direccion = direccion
              if (latitud && latitud !== (editingClient.latitud || '')) updateBody.latitud = latitud
              if (longitud && longitud !== (editingClient.longitud || '')) updateBody.longitud = longitud
              if (Object.keys(updateBody).length === 0) {
                setEditClientFormError('No hay cambios para guardar')
                setEditClientFormLoading(false)
                return
              }
              try {
                const dataCliente = await ClienteService.actualizarCliente(editingClient.numero, updateBody)
                if (!dataCliente?.success) {
                  throw new Error(dataCliente?.message || "Error al actualizar el cliente")
                }
                setEditClientFormSuccess(dataCliente.message || "Cliente actualizado correctamente")
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("refreshClientsTable"))
                }
                setTimeout(() => {
                  setIsEditClientDialogOpen(false)
                  setEditClientFormSuccess(null)
                  setEditClientFormError(null)
                  setEditClientLatLng({ lat: '', lng: '' })
                  setEditingClient(null)
                }, 1200)
              } catch (err: any) {
                setEditClientFormError(err.message || "Error al actualizar el cliente")
              } finally {
                setEditClientFormLoading(false)
              }
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input id="nombre" name="nombre" placeholder="Nombre del cliente" defaultValue={editingClient?.nombre || ''} />
                </div>
                <div>
                  <Label htmlFor="numero">Número</Label>
                  <Input id="numero" name="numero" placeholder="Número identificador" value={editingClient?.numero || ''} readOnly className="bg-gray-100" />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input id="direccion" name="direccion" placeholder="Dirección" defaultValue={editingClient?.direccion || ''} />
                </div>
                <div className="md:col-span-2">
                  <Label>Ubicación (opcional)</Label>
                  <div className="flex gap-2 items-center">
                    <Input value={editClientLatLng.lat} placeholder="Latitud" readOnly className="w-32" />
                    <Input value={editClientLatLng.lng} placeholder="Longitud" readOnly className="w-32" />
                    <Button type="button" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setShowMapModalClient(true)}>
                      <MapPin className="h-4 w-4 mr-1" /> Seleccionar en mapa
                    </Button>
                  </div>
                </div>
              </div>
              {editClientFormError && <div className="text-red-600 text-sm pt-2">{editClientFormError}</div>}
              {editClientFormSuccess && <div className="text-green-600 text-sm pt-2">{editClientFormSuccess}</div>}
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditClientDialogOpen(false)} disabled={editClientFormLoading}>Cancelar</Button>
                <Button type="submit" className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white" disabled={editClientFormLoading}>{editClientFormLoading ? 'Guardando...' : 'Guardar'}</Button>
              </div>
            </form>
            {/* Modal de mapa para seleccionar ubicación (reutiliza showMapModalClient y setShowMapModalClient) */}
            <Dialog open={showMapModalClient} onOpenChange={setShowMapModalClient}>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Seleccionar ubicación en el mapa</DialogTitle>
                </DialogHeader>
                <div className="mb-4 text-gray-700">Haz click en el mapa para seleccionar la ubicación. Solo se guardarán latitud y longitud.</div>
                <MapPicker
                  initialLat={editClientLatLng.lat ? parseFloat(editClientLatLng.lat) : 23.1136}
                  initialLng={editClientLatLng.lng ? parseFloat(editClientLatLng.lng) : -82.3666}
                  onSelect={(lat: number, lng: number) => {
                    setEditClientLatLng({ lat: String(lat), lng: String(lng) })
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
    </div>
  )
} 