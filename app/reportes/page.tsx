"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { ArrowLeft, FileCheck, Search, Calendar, Plus, Eye, List, User, Sun, Wrench, AlertTriangle, MapPin } from "lucide-react"
import { ReportsTable } from "@/components/feats/reports/reports-table"
import type { FormData } from "@/lib/types"
import FormViewer from "@/components/feats/reports/FormViewerNoSSR"
import { ClienteService, ReporteService } from "@/lib/api-services"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/shared/molecule/tabs"
import { ClientReportsChart } from "@/components/feats/reports/client-reports-chart";
import { useBrigadasTrabajadores } from "@/hooks/use-brigadas-trabajadores"
import { useMaterials } from "@/hooks/use-materials"
import { useToast } from "@/hooks/use-toast"
import { LocationSection } from "@/components/shared/organism/location-section"
import MapPicker from "@/components/shared/organism/MapPickerNoSSR"
import { CreateReportDialog } from "@/components/feats/reports/create-report-dialog"

export default function ReportesPage() {
  const [tab, setTab] = useState<'reportes' | 'clientes'>('reportes')
  const [reports, setReports] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [selectedReport, setSelectedReport] = useState<any | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedClientReports, setSelectedClientReports] = useState<any[] | null>(null)
  const [selectedClient, setSelectedClient] = useState<any | null>(null)
  const [loadingClientReports, setLoadingClientReports] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [selectedReportData, setSelectedReportData] = useState<any | null>(null)
  const [loadingReportDetails, setLoadingReportDetails] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  // Agregar estado para el modal de cliente y su feedback
  const [isCreateClientDialogOpen, setIsCreateClientDialogOpen] = useState(false)
  const [clientFormLoading, setClientFormLoading] = useState(false)
  const [clientFormError, setClientFormError] = useState<string | null>(null)
  const [clientFormSuccess, setClientFormSuccess] = useState<string | null>(null)
  const [createdClient, setCreatedClient] = useState<any | null>(null)
  const [createdClientReports, setCreatedClientReports] = useState<any[] | null>(null)
  const [showMapModalClient, setShowMapModalClient] = useState(false)
  const [clientLatLng, setClientLatLng] = useState<{ lat: string, lng: string }>({ lat: '', lng: '' })

  // Cargar reportes
  const fetchReports = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (filterType !== "all") params.tipo_reporte = filterType
      if (searchTerm) params.q = searchTerm // búsqueda global
      const data = await ReporteService.getReportes(params)
      setReports(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setReports([])
    } finally {
      setLoading(false)
    }
  }

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
    if (tab === 'reportes') fetchReports()
    else fetchClients()
    // eslint-disable-next-line
  }, [tab, filterType, searchTerm])
  // Refrescar tablas al recibir eventos
  useEffect(() => {
    if (typeof window === "undefined") return;
    const refreshReports = () => fetchReports()
    const refreshClients = () => fetchClients()
    window.addEventListener("refreshReportsTable", refreshReports)
    window.addEventListener("refreshClientsTable", refreshClients)
    return () => {
      window.removeEventListener("refreshReportsTable", refreshReports)
      window.removeEventListener("refreshClientsTable", refreshClients)
    }
  }, [])

  useEffect(() => {
    if (tab === 'reportes' && clients.length === 0) {
      fetchClients();
    }
    // eslint-disable-next-line
  }, [tab]);

  // Columnas para reportes
  const reportColumns = [
    { key: "tipo_reporte", label: "Tipo de Servicio" },
    { key: "cliente", label: "Cliente", render: (row: any) => row.cliente?.numero || "-" },
    { key: "brigada", label: "Líder", render: (row: any) => row.brigada?.lider?.nombre || "-" },
    { key: "fecha_hora", label: "Fecha", render: (row: any) => row.fecha_hora?.fecha || "-" },
    { key: "descripcion", label: "Descripción", render: (row: any) => row.descripcion ? row.descripcion.slice(0, 40) + (row.descripcion.length > 40 ? '...' : '') : "-" },
  ]

  // Columnas para clientes
  const clientColumns = [
    { key: "numero", label: "Número" },
    { key: "nombre", label: "Nombre" },
    { key: "direccion", label: "Dirección" },
  ]

  // Acción para ver detalles de reporte
  const handleViewReport = async (report: any) => {
    setSelectedReportId(report._id || report.id)
    setIsViewDialogOpen(true)
    setLoadingReportDetails(true)
    setSelectedReportData(null)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL
      const res = await fetch(`${baseUrl}/reportes/${report._id || report.id}`)
      if (!res.ok) throw new Error('Error al obtener detalles del reporte')
      const data = await res.json()
      setSelectedReportData(data)
    } catch (e) {
      setSelectedReportData(null)
    } finally {
      setLoadingReportDetails(false)
    }
  }

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

  // Busca el cliente completo por número (comparando como string)
  const getClienteByNumero = (numero: string | number) => clients.find(c => String(c.numero) === String(numero));

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <header className="fixed-header bg-white shadow-sm border-b border-orange-100">
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
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-2 rounded-lg">
                  <FileCheck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Gestión de Reportes</h1>
                  <p className="text-sm text-gray-600">Visualiza reportes y clientes</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="default"
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white font-semibold shadow-md"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Reporte
              </Button>
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
        <Tabs value={tab} onValueChange={v => setTab(v as 'reportes' | 'clientes')} className="mb-8">
          <TabsList className="mb-6 flex gap-4 text-lg">
            <TabsTrigger value="reportes" className="flex items-center gap-2 px-6 py-3 rounded-lg border border-orange-200 shadow-sm bg-white data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700">
              <List className="h-6 w-6" /> Reportes
            </TabsTrigger>
            <TabsTrigger value="clientes" className="flex items-center gap-2 px-6 py-3 rounded-lg border border-orange-200 shadow-sm bg-white data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700">
              <User className="h-6 w-6" /> Clientes
            </TabsTrigger>
          </TabsList>
          <TabsContent value="reportes">
            <Card className="border-0 shadow-md mb-6">
              <CardHeader>
                <CardTitle>Filtros y Búsqueda</CardTitle>
                <CardDescription>Filtra por tipo de servicio o busca por cliente, líder o descripción</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="search" className="text-sm font-medium text-gray-700 mb-2 block">
                      Buscar por cliente, líder o descripción
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Buscar por cliente, líder o descripción..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="type-filter" className="text-sm font-medium text-gray-700 mb-2 block">
                      Tipo de Servicio
                    </Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los tipos</SelectItem>
                        <SelectItem value="inversion">Inversión</SelectItem>
                        <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                        <SelectItem value="averia">Avería</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Historial de Reportes</CardTitle>
                <CardDescription>
                  Mostrando {reports.length} reportes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReportsTable
                  data={reports}
                  columns={reportColumns}
                  getRowId={(row) => row._id || row.id}
                  actions={(row) => (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewReport(row)}
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver
                    </Button>
                  )}
                  loading={loading}
                />
              </CardContent>
            </Card>
            {/* Modal de detalles de reporte */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Detalles del Reporte</DialogTitle>
                </DialogHeader>
                {loadingReportDetails ? (
                  <div className="text-center py-8">Cargando detalles...</div>
                ) : selectedReportData ? (
                  <FormViewer
                    formData={selectedReportData}
                    clienteCompleto={getClienteByNumero(selectedReportData.cliente?.numero)}
                  />
                ) : (
                  <div className="text-center py-8 text-red-500">No se pudieron cargar los detalles del reporte.</div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>
          <TabsContent value="clientes">
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
                  actions={(row) => (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewClientReports(row)}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <FileCheck className="h-4 w-4 mr-2" />
                      Ver reportes
                    </Button>
                  )}
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
                      actions={(row) => (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewReport(row)}
                          className="border-green-300 text-green-700 hover:bg-green-50"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                      )}
                      loading={loadingClientReports}
                    />
                  </>
                )}
              </DialogContent>
            </Dialog>
            {/* Modal de detalles de reporte desde cliente */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Detalles del Reporte</DialogTitle>
                </DialogHeader>
                {loadingReportDetails ? (
                  <div className="text-center py-8">Cargando detalles...</div>
                ) : selectedReportData ? (
                  <FormViewer
                    formData={selectedReportData}
                    clienteCompleto={getClienteByNumero(selectedReportData.cliente?.numero)}
                  />
                ) : (
                  <div className="text-center py-8 text-red-500">No se pudieron cargar los detalles del reporte.</div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </main>
      {/* Modal de creación de reporte */}
      <CreateReportDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} clients={clients} />
      {/* Modal de creación de cliente */}
      <Dialog open={isCreateClientDialogOpen} onOpenChange={v => {
        setIsCreateClientDialogOpen(v)
        if (!v) {
          setClientFormError(null)
          setClientFormSuccess(null)
          setClientLatLng({ lat: '', lng: '' })
          // Limpiar los valores de los inputs del formulario manualmente
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
                // Limpiar los valores de los inputs del formulario manualmente
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
    </div>
  )
}
