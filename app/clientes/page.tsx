"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { FileCheck, Search, Eye, Wrench, User, MapPin } from "lucide-react"
import { ReportsTable } from "@/components/feats/reports/reports-table"
import { ClienteService, ReporteService } from "@/lib/api-services"
import { ClientReportsChart } from "@/components/feats/reports/client-reports-chart";
import MapPicker from "@/components/shared/organism/MapPickerNoSSR"

export default function ClientesPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClientReports, setSelectedClientReports] = useState<any[] | null>(null)
  const [selectedClient, setSelectedClient] = useState<any | null>(null)
  const [loadingClientReports, setLoadingClientReports] = useState(false)
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
  const [showClientLocation, setShowClientLocation] = useState(false)
  const [clientLocation, setClientLocation] = useState<{ lat: number, lng: number } | null>(null)

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

  useEffect(() => {
    fetchClients()
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

  // Columnas para clientes
  const clientColumns = [
    { key: "numero", label: "Número" },
    { key: "nombre", label: "Nombre" },
    { key: "direccion", label: "Dirección" },
    {
      key: "acciones",
      label: "Acciones",
      render: (row: any) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewClientReports(row)}
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <FileCheck className="h-4 w-4 mr-2" />
            Ver reportes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditClient(row)}
            className="border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            <Wrench className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (row.latitud && row.longitud) {
                setClientLocation({ lat: parseFloat(row.latitud), lng: parseFloat(row.longitud) })
                setShowClientLocation(true)
              }
            }}
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
            disabled={!row.latitud || !row.longitud}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Ver ubicación
          </Button>
        </div>
      )
    }
  ]

  // Columnas para reportes (para el modal de reportes de cliente)
  const reportColumns = [
    { key: "tipo_reporte", label: "Tipo de Servicio" },
    { key: "cliente", label: "Cliente", render: (row: any) => row.cliente?.numero || "-" },
    { key: "brigada", label: "Líder", render: (row: any) => row.brigada?.lider?.nombre || "-" },
    { key: "fecha_hora", label: "Fecha", render: (row: any) => row.fecha_hora?.fecha || "-" },
    { key: "descripcion", label: "Descripción", render: (row: any) => row.descripcion ? row.descripcion.slice(0, 40) + (row.descripcion.length > 40 ? '...' : '') : "-" },
  ]

  // Acción para ver reportes de un cliente
  const handleViewClientReports = async (client: any) => {
    setSelectedClient(client)
    setLoadingClientReports(true)
    try {
      const data = await ReporteService.getReportesPorCliente(client.numero)
      setSelectedClientReports(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setSelectedClientReports([])
    } finally {
      setLoadingClientReports(false)
    }
  }

  // Acción para editar cliente
  const handleEditClient = (client: any) => {
    setEditingClient(client)
    setEditClientLatLng({ lat: client.latitud || '', lng: client.longitud || '' })
    setIsEditClientDialogOpen(true)
    setEditClientFormError(null)
    setEditClientFormSuccess(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <header className="fixed-header bg-white shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  Volver al Dashboard
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-2 rounded-lg">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Gestión de Clientes</h1>
                  <p className="text-sm text-gray-600">Visualiza y administra clientes</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="default"
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-md"
                onClick={() => setIsCreateClientDialogOpen(true)}
              >
                <User className="h-4 w-4 mr-2" />
                Crear Cliente
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-0 shadow-md mb-6">
          <CardHeader>
            <CardTitle>Buscar Cliente</CardTitle>
            <CardDescription>Busca clientes por nombre</CardDescription>
          </CardHeader>
          <CardContent>
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
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>
              Mostrando {clients.length} clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReportsTable
              data={clients}
              columns={clientColumns}
              getRowId={(row) => row._id || row.numero}
              loading={loading}
            />
          </CardContent>
        </Card>
        {/* Modal de reportes de cliente */}
        <Dialog open={!!selectedClientReports} onOpenChange={v => { if (!v) { setSelectedClientReports(null); setSelectedClient(null); } }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Reportes de {selectedClient?.nombre || selectedClient?.numero}</DialogTitle>
            </DialogHeader>
            {loadingClientReports ? (
              <div className="text-center py-8">Cargando reportes...</div>
            ) : (
              <>
                <ClientReportsChart reports={selectedClientReports || []} />
                <ReportsTable
                  data={selectedClientReports || []}
                  columns={reportColumns}
                  getRowId={(row) => row._id || row.id}
                  loading={loadingClientReports}
                />
              </>
            )}
          </DialogContent>
        </Dialog>
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
                let baseUrlCliente = process.env.NEXT_PUBLIC_API_URL || ""
                if (baseUrlCliente.endsWith("/api")) baseUrlCliente = baseUrlCliente.slice(0, -4)
                const resCliente = await fetch(baseUrlCliente + "/api/clientes/", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ nombre, numero, direccion, latitud, longitud })
                })
                let dataCliente: any = null
                try {
                  dataCliente = await resCliente.json()
                } catch (jsonErr) {
                  throw new Error("Respuesta inesperada del servidor")
                }
                if (!resCliente.ok || !dataCliente.success) {
                  let errorMsg = dataCliente.message || "Error al crear el cliente"
                  if (dataCliente.errors && typeof dataCliente.errors === "object") {
                    errorMsg += ": " + Object.entries(dataCliente.errors).map(([field, msg]) => `${field}: ${msg}`).join("; ")
                  }
                  throw new Error(errorMsg)
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
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={clientFormLoading}>{clientFormLoading ? 'Guardando...' : 'Guardar'}</Button>
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
                let baseUrlCliente = process.env.NEXT_PUBLIC_API_URL || ""
                if (baseUrlCliente.endsWith("/api")) baseUrlCliente = baseUrlCliente.slice(0, -4)
                const resCliente = await fetch(baseUrlCliente + `/api/clientes/${editingClient.numero}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(updateBody)
                })
                let dataCliente: any = null
                try {
                  dataCliente = await resCliente.json()
                } catch (jsonErr) {
                  throw new Error("Respuesta inesperada del servidor")
                }
                if (!resCliente.ok || !dataCliente.success) {
                  let errorMsg = dataCliente.message || "Error al actualizar el cliente"
                  if (dataCliente.errors && typeof dataCliente.errors === "object") {
                    errorMsg += ": " + Object.entries(dataCliente.errors).map(([field, msg]) => `${field}: ${msg}`).join("; ")
                  }
                  throw new Error(errorMsg)
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
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={editClientFormLoading}>{editClientFormLoading ? 'Guardando...' : 'Guardar'}</Button>
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
        {/* Modal para ver ubicación del cliente */}
        <Dialog open={showClientLocation} onOpenChange={setShowClientLocation}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Ubicación del cliente</DialogTitle>
            </DialogHeader>
            {clientLocation ? (
              <MapPicker
                initialLat={clientLocation.lat}
                initialLng={clientLocation.lng}
              />
            ) : (
              <div className="text-gray-500">No hay ubicación registrada para este cliente.</div>
            )}
            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setShowClientLocation(false)}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
} 