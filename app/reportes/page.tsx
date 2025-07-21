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
import { FormViewer } from "@/components/feats/reports/form-viewer"
import { ClienteService, ReporteService } from "@/lib/api-services"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/shared/molecule/tabs"
import { ClientReportsChart } from "@/components/feats/reports/client-reports-chart";
import { useBrigadasTrabajadores } from "@/hooks/use-brigadas-trabajadores"
import { useMaterials } from "@/hooks/use-materials"
import { useToast } from "@/hooks/use-toast"
import { LocationSection } from "@/components/shared/organism/location-section"
import { MapPicker } from "@/components/shared/organism/MapPicker"

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
                disabled
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
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear nuevo reporte</DialogTitle>
          </DialogHeader>
          {/* Formulario de creación de reporte */}
          <CreateReportForm clients={clients} />
        </DialogContent>
      </Dialog>
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
              (form.elements.namedItem('nombre') as HTMLInputElement).value = ''
              (form.elements.namedItem('numero') as HTMLInputElement).value = ''
              (form.elements.namedItem('direccion') as HTMLInputElement).value = ''
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
              const dataCliente = await resCliente.json()
              if (!resCliente.ok || !dataCliente.success) throw new Error(dataCliente.message || "Error al crear el cliente")
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
                  (form.elements.namedItem('nombre') as HTMLInputElement).value = ''
                  (form.elements.namedItem('numero') as HTMLInputElement).value = ''
                  (form.elements.namedItem('direccion') as HTMLInputElement).value = ''
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
                onSelect={(lat, lng) => {
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

// --- Componente auxiliar para el formulario de creación de reporte ---

function CreateReportForm({ clients }: { clients: any[] }) {
  const [tipoReporte, setTipoReporte] = useState<string>("")
  const [clienteNuevo, setClienteNuevo] = useState({ nombre: "", numero: "", direccion: "", latitud: "", longitud: "" })
  const [clienteExistente, setClienteExistente] = useState("")
  const [jefeBrigada, setJefeBrigada] = useState("")
  const [integrantes, setIntegrantes] = useState<string[]>([])
  type MaterialReporte = { nombre: string; cantidad: string; codigo: string | number; categoria: string; um: string };
  const [materiales, setMateriales] = useState<MaterialReporte[]>([])
  // Fecha y hora (nuevo: inicio y fin)
  const [fecha, setFecha] = useState("")
  const [horaInicio, setHoraInicio] = useState("")
  const [horaFin, setHoraFin] = useState("")
  // Formato largo para la fecha
  const [fechaLarga, setFechaLarga] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [fotosInicio, setFotosInicio] = useState<File[]>([])
  const [fotosFin, setFotosFin] = useState<File[]>([])
  const [showIntegrantesSelector, setShowIntegrantesSelector] = useState(false)
  // Materiales
  const { materials, categories, loading: loadingMaterials, error: errorMaterials } = useMaterials()
  const [tipoMaterial, setTipoMaterial] = useState("")
  const [materialSeleccionado, setMaterialSeleccionado] = useState("")
  const [cantidadMaterial, setCantidadMaterial] = useState("")
  const { toast } = useToast()
  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [firmaCliente, setFirmaCliente] = useState<File | null>(null)

  // Obtener jefes e integrantes reales del backend
  const { trabajadores, brigadas, loading: loadingTrabajadores, error: errorTrabajadores, refetch } = useBrigadasTrabajadores()

  // Cuando cambia el jefe de brigada, seleccionar integrantes de su brigada por defecto
  useEffect(() => {
    if (!jefeBrigada) {
      setIntegrantes([])
      return
    }
    // Buscar la brigada cuyo líder sea el jefe seleccionado
    const brigada = brigadas.find(b => {
      const lider = b.lider;
      return lider && typeof lider === 'object' && lider !== null && typeof (lider as any).CI === 'string' && (lider as any).CI === jefeBrigada;
    });
    if (brigada && Array.isArray(brigada.integrantes)) {
      // Solo los CI de los integrantes (sin el jefe)
      const integrantesCIs: string[] = brigada.integrantes
        .map((i: any) => {
          if (typeof i === 'string') return i;
          if (i && typeof i === 'object' && 'CI' in i && typeof i.CI === 'string') return i.CI;
          if (i && typeof i === 'object' && 'CI' in i && typeof i.CI === 'number') return String(i.CI);
          return null;
        })
        .filter((ci): ci is string => typeof ci === 'string' && !!ci);
      setIntegrantes(integrantesCIs)
    } else {
      setIntegrantes([])
    }
  }, [jefeBrigada, brigadas])

  // Handlers para materiales
  const handleAddMaterial = () => {
    if (materialSeleccionado && cantidadMaterial && !isNaN(Number(cantidadMaterial))) {
      const mat = materials.find(m => (m.id || m.codigo) === materialSeleccionado)
      if (mat) {
        setMateriales([...materiales, { nombre: mat.descripcion, cantidad: cantidadMaterial, codigo: mat.codigo, categoria: mat.categoria, um: mat.um }])
        setMaterialSeleccionado("")
        setCantidadMaterial("")
      }
    }
  }
  const handleRemoveMaterial = (idx: number) => {
    setMateriales(materiales.filter((_, i) => i !== idx))
  }

  // Handlers para fotos
  const handleFotosInicio = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFotosInicio(Array.from(e.target.files))
  }
  const handleFotosFin = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFotosFin(Array.from(e.target.files))
  }

  useEffect(() => {
    // Solo setear por defecto si están vacíos
    if (!fecha || !horaInicio || !horaFin) {
      const now = new Date()
      // yyyy-mm-dd para input date
      const yyyy = now.getFullYear()
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      const dateStr = `${yyyy}-${mm}-${dd}`
      // hh:mm para input time
      const hh = String(now.getHours()).padStart(2, '0')
      const min = String(now.getMinutes()).padStart(2, '0')
      const timeStr = `${hh}:${min}`
      setFecha(f => f || dateStr)
      setHoraInicio(h => h || timeStr)
      setHoraFin(h => h || timeStr)
    }
  }, [])

  useEffect(() => {
    // Actualizar fecha larga cuando cambia fecha
    if (fecha) {
      // Parsear yyyy-mm-dd como local, no UTC
      const [yyyy, mm, dd] = fecha.split('-').map(Number)
      const dateObj = new Date(yyyy, mm - 1, dd)
      const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      // @ts-ignore
      setFechaLarga(dateObj.toLocaleDateString('es-ES', opciones))
    } else {
      setFechaLarga("")
    }
  }, [fecha])

  // Envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingSubmit(true)
    try {
      // Validación básica
      if (!tipoReporte) throw new Error("Selecciona el tipo de reporte")
      if (tipoReporte === "inversion" && (!clienteNuevo.nombre || !clienteNuevo.numero)) throw new Error("Completa los datos del cliente")
      if ((tipoReporte === "mantenimiento" || tipoReporte === "averia") && !clienteExistente) throw new Error("Selecciona un cliente existente")
      if (!jefeBrigada) throw new Error("Selecciona un jefe de brigada")
      if (integrantes.length === 0) throw new Error("Selecciona al menos un integrante")
      if (materiales.length === 0) throw new Error("Agrega al menos un material")
      if (!fecha || !horaInicio || !horaFin) throw new Error("Completa la fecha y las horas")
      if ((tipoReporte === "mantenimiento" || tipoReporte === "averia") && !descripcion.trim()) throw new Error("Agrega una descripción")

      // Lógica de creación de cliente según backend
      let clienteParaReporte: any = null;
      if (tipoReporte === "inversion") {
        // Para inversión, si el cliente no existe, créalo primero
        const clienteExistente = clients.find(c => String(c.numero) === String(clienteNuevo.numero))
        if (!clienteExistente) {
          // Crear cliente
          let baseUrlCliente = process.env.NEXT_PUBLIC_API_URL || ""
          if (baseUrlCliente.endsWith("/api")) baseUrlCliente = baseUrlCliente.slice(0, -4)
          const resCliente = await fetch(baseUrlCliente + "/api/clientes/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(clienteNuevo)
          })
          const dataCliente = await resCliente.json()
          if (!resCliente.ok || !dataCliente.success) throw new Error(dataCliente.message || "Error al crear el cliente")
          clienteParaReporte = dataCliente.data
        } else {
          clienteParaReporte = clienteExistente
        }
      } else {
        // Para avería/mantenimiento, el cliente debe existir, si no existe, créalo primero
        const clienteSeleccionado = clients.find(c => String(c.numero) === String(clienteExistente))
        if (!clienteSeleccionado) {
          // Buscar datos del cliente en el formulario (no hay, así que error)
          throw new Error("El cliente seleccionado no existe. Debe crearse primero desde la sección de clientes.")
        } else {
          clienteParaReporte = clienteSeleccionado
        }
      }

      // Construir FormData para el reporte
      const formData = new FormData()
      formData.append("tipo_reporte", tipoReporte)
      formData.append("brigada", JSON.stringify({
        lider: trabajadores.find(w => w.CI === jefeBrigada),
        integrantes: integrantes.map(ci => trabajadores.find(w => w.CI === ci))
      }))
      formData.append("materiales", JSON.stringify(materiales.map(m => ({ nombre: m.nombre, cantidad: m.cantidad, codigo: m.codigo, categoria: m.categoria, um: m.um }))))
      formData.append("cliente", JSON.stringify(clienteParaReporte))
      formData.append("fecha_hora", JSON.stringify({ fecha, hora_inicio: horaInicio, hora_fin: horaFin }))
      if (tipoReporte === "mantenimiento" || tipoReporte === "averia") {
        formData.append("descripcion", descripcion)
      }
      // Solo agregar archivos si existen y son File válidos
      if (Array.isArray(fotosInicio) && fotosInicio.length > 0) {
        fotosInicio.forEach(f => {
          if (f instanceof File) formData.append("fotos_inicio", f)
        })
      }
      if (Array.isArray(fotosFin) && fotosFin.length > 0) {
        fotosFin.forEach(f => {
          if (f instanceof File) formData.append("fotos_fin", f)
        })
      }
      if (firmaCliente && firmaCliente instanceof File) {
        formData.append("firma_cliente", firmaCliente)
      }
      // Logs de depuración
      console.log("[DEBUG] fotos_inicio:", fotosInicio)
      console.log("[DEBUG] fotos_fin:", fotosFin)
      console.log("[DEBUG] firma_cliente:", firmaCliente)
      // Mostrar contenido del FormData
      for (let pair of formData.entries()) {
        if (pair[1] instanceof File) {
          console.log(`[DEBUG] FormData: ${pair[0]} => File: ${pair[1].name}, size: ${pair[1].size}`)
        } else {
          console.log(`[DEBUG] FormData: ${pair[0]} =>`, pair[1])
        }
      }
      // Endpoint según tipo
      let endpoint = ""
      if (tipoReporte === "inversion") endpoint = "/api/reportes/inversion"
      if (tipoReporte === "mantenimiento") endpoint = "/api/reportes/mantenimiento"
      if (tipoReporte === "averia") endpoint = "/api/reportes/averia"

      let baseUrl = process.env.NEXT_PUBLIC_API_URL || ""
      if (baseUrl.endsWith("/api")) baseUrl = baseUrl.slice(0, -4) // quita el /api final si existe

      const res = await fetch(baseUrl + endpoint, {
        method: "POST",
        body: formData
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || "Error al crear el reporte")
      toast({ title: "Reporte creado", description: data.message, variant: "default" })
      // Opcional: limpiar formulario o cerrar modal
      if (typeof window !== "undefined") {
        // Cerrar modal si está en Dialog
        const evt = new CustomEvent("closeCreateReportModal")
        window.dispatchEvent(evt)
      }
      // Refrescar tablas de reportes y clientes automáticamente
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refreshReportsTable"))
        window.dispatchEvent(new CustomEvent("refreshClientsTable"))
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Error al crear el reporte", variant: "destructive" })
    } finally {
      setLoadingSubmit(false)
    }
  }

  if (loadingTrabajadores) {
    return <div className="text-center py-8 text-gray-500">Cargando trabajadores y jefes de brigada...</div>
  }
  if (errorTrabajadores) {
    return <div className="text-center py-8 text-red-500">Error al cargar trabajadores: {errorTrabajadores}</div>
  }

  return (
    <form className="space-y-6 max-h-[70vh] overflow-y-auto pr-2" onSubmit={handleSubmit}>
      {/* Tipo de reporte */}
      <div>
        <Label htmlFor="tipo-reporte">Tipo de reporte</Label>
        <Select value={tipoReporte} onValueChange={setTipoReporte}>
          <SelectTrigger id="tipo-reporte" className="mt-1 w-full">
            <SelectValue placeholder="Selecciona el tipo de reporte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inversion">
              <span className="flex items-center gap-2"><Sun className="h-4 w-4 text-orange-500" /> Inversión</span>
            </SelectItem>
            <SelectItem value="mantenimiento">
              <span className="flex items-center gap-2"><Wrench className="h-4 w-4 text-blue-600" /> Mantenimiento</span>
            </SelectItem>
            <SelectItem value="averia">
              <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-600" /> Avería</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Brigada */}
      <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
        <Label className="font-semibold">Brigada</Label>
        <div>
          <Label>Jefe de Brigada</Label>
          <select className="w-full border rounded p-2 mt-1" value={jefeBrigada} onChange={e => setJefeBrigada(e.target.value)}>
            <option value="">Selecciona un jefe...</option>
            {trabajadores.filter(w => w.tiene_contraseña).map(w => (
              <option key={w.CI} value={w.CI}>{w.nombre} ({w.CI})</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Integrantes seleccionados</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {integrantes.map(ci => {
              const w = trabajadores.find(t => t.CI === ci)
              if (!w) return null
              return (
                <div key={ci} className="flex items-center bg-gray-100 text-gray-900 rounded px-3 py-1">
                  <span>{w.nombre} ({w.CI})</span>
                  <button
                    type="button"
                    className="ml-2 text-blue-700 hover:text-red-600 font-bold"
                    onClick={() => setIntegrantes(integrantes.filter(i => i !== ci))}
                    title="Quitar integrante"
                  >
                    ×
                  </button>
                </div>
              )
            })}
            {integrantes.length === 0 && <span className="text-gray-400">Ningún integrante seleccionado</span>}
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
            onClick={() => setShowIntegrantesSelector(v => !v)}
          >
            {showIntegrantesSelector ? 'Ocultar listado' : 'Agregar más integrantes'}
          </Button>
          {showIntegrantesSelector && (
            <div className="border rounded p-3 max-h-32 overflow-y-auto mt-2 bg-white">
              {trabajadores.filter(w => !w.tiene_contraseña && w.CI !== jefeBrigada && !integrantes.includes(w.CI)).length === 0 ? (
                <div className="text-gray-400 text-sm">No hay más trabajadores disponibles</div>
              ) : (
                trabajadores.filter(w => !w.tiene_contraseña && w.CI !== jefeBrigada && !integrantes.includes(w.CI)).map(w => (
                  <label key={w.CI} className="flex items-center space-x-2 cursor-pointer hover:bg-blue-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={e => {
                        if (e.target.checked) setIntegrantes([...integrantes, w.CI])
                      }}
                    />
                    <span>{w.nombre} ({w.CI})</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      {/* Materiales */}
      <div className="space-y-4 bg-amber-50 p-4 rounded-lg border border-amber-200">
        <Label className="font-semibold">Materiales utilizados</Label>
        {loadingMaterials ? (
          <div className="text-center text-amber-700">Cargando materiales...</div>
        ) : errorMaterials ? (
          <div className="text-center text-red-600">Error al cargar materiales</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <Label>Tipo</Label>
              <select className="w-full border rounded p-2 mt-1" value={tipoMaterial} onChange={e => {
                setTipoMaterial(e.target.value)
                setMaterialSeleccionado("")
              }}>
                <option value="">Selecciona un tipo...</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Material</Label>
              <select
                className="w-full border rounded p-2 mt-1"
                value={materialSeleccionado}
                onChange={e => setMaterialSeleccionado(e.target.value)}
                disabled={!tipoMaterial}
              >
                <option value="">{tipoMaterial ? "Selecciona un material..." : "Selecciona un tipo primero"}</option>
                {materials.filter(m => m.categoria === tipoMaterial).map(m => (
                  <option key={m.id || m.codigo} value={m.id || m.codigo}>{m.descripcion} ({m.codigo})</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Cantidad</Label>
              <Input type="number" min="1" value={cantidadMaterial} onChange={e => setCantidadMaterial(e.target.value)} placeholder="Cantidad" disabled={!materialSeleccionado} />
            </div>
            <div>
              <Button
                type="button"
                onClick={handleAddMaterial}
                disabled={!materialSeleccionado || !cantidadMaterial || isNaN(Number(cantidadMaterial))}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              >
                Agregar
              </Button>
            </div>
          </div>
        )}
        {materiales.length > 0 && (
          <div className="space-y-2 mt-4">
            {materiales.map((mat, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white border rounded p-2">
                <span>{mat.nombre} (Cod: {mat.codigo}) - {mat.cantidad} {mat.um}</span>
                <Button type="button" size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => handleRemoveMaterial(idx)}>Quitar</Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cliente */}
      {tipoReporte === "inversion" ? (
        <div className="space-y-4 bg-green-50 p-4 rounded-lg border border-green-200">
          <Label className="font-semibold">Datos del cliente (nuevo)</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cliente-nombre">Nombre</Label>
              <Input id="cliente-nombre" name="cliente-nombre" placeholder="Nombre del cliente" value={clienteNuevo.nombre} onChange={e => setClienteNuevo({ ...clienteNuevo, nombre: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="cliente-numero">Número</Label>
              <Input id="cliente-numero" name="cliente-numero" placeholder="Número identificador" value={clienteNuevo.numero} onChange={e => setClienteNuevo({ ...clienteNuevo, numero: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="cliente-direccion">Dirección</Label>
              <div className="flex gap-2">
                <Input id="cliente-direccion" name="cliente-direccion" placeholder="Dirección" value={clienteNuevo.direccion} onChange={e => setClienteNuevo({ ...clienteNuevo, direccion: e.target.value })} />
                <Button type="button" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setShowMapModal(true)}>
                  <MapPin className="h-4 w-4 mr-1" /> Seleccionar ubicación en el mapa
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="cliente-latitud">Latitud</Label>
              <Input id="cliente-latitud" name="cliente-latitud" placeholder="Latitud" value={clienteNuevo.latitud} onChange={e => setClienteNuevo({ ...clienteNuevo, latitud: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="cliente-longitud">Longitud</Label>
              <Input id="cliente-longitud" name="cliente-longitud" placeholder="Longitud" value={clienteNuevo.longitud} onChange={e => setClienteNuevo({ ...clienteNuevo, longitud: e.target.value })} />
            </div>
          </div>
          {/* Modal de mapa */}
          <Dialog open={showMapModal} onOpenChange={setShowMapModal}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Seleccionar ubicación en el mapa</DialogTitle>
              </DialogHeader>
              <div className="mb-4 text-gray-700">Haz click en el mapa para seleccionar la ubicación. Solo se guardarán latitud y longitud.</div>
              <MapPicker
                initialLat={clienteNuevo.latitud ? parseFloat(clienteNuevo.latitud) : 23.1136}
                initialLng={clienteNuevo.longitud ? parseFloat(clienteNuevo.longitud) : -82.3666}
                onSelect={(lat, lng) => {
                  setClienteNuevo(c => ({ ...c, latitud: String(lat), longitud: String(lng) }))
                }}
              />
              <div className="flex justify-end pt-4">
                <Button type="button" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setShowMapModal(false)}>
                  Confirmar ubicación
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}
      {(tipoReporte === "mantenimiento" || tipoReporte === "averia") && (
        <div className="space-y-4 bg-green-50 p-4 rounded-lg border border-green-200">
          <Label className="font-semibold">Selecciona un cliente existente</Label>
          <select className="w-full border rounded p-2 mt-1" value={clienteExistente} onChange={e => setClienteExistente(e.target.value)}>
            <option value="">Selecciona un cliente...</option>
            {clients.map((c) => (
              <option key={c.numero} value={c.numero}>{c.nombre} ({c.numero})</option>
            ))}
          </select>
        </div>
      )}

      {/* Fecha y hora */}
      <div className="space-y-4 bg-purple-200 p-4 rounded-lg border border-purple-300">
        <Label className="font-semibold">Fecha y hora del trabajo</Label>
        <div className="mb-2 text-purple-900 font-bold text-lg">
          {fechaLarga && <span>{fechaLarga}</span>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
          <div>
            <Label>Hora de inicio</Label>
            <Input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
          </div>
          <div>
            <Label>Hora de fin</Label>
            <Input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Descripción */}
      {(tipoReporte === "mantenimiento" || tipoReporte === "averia") && (
        <div className="space-y-4 bg-green-50 p-4 rounded-lg border border-green-200">
          <Label className="font-semibold">Descripción del trabajo</Label>
          <textarea className="w-full border rounded p-2 min-h-[80px]" value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Describe el trabajo realizado..." />
        </div>
      )}

      {/* Fotos inicio */}
      <div className="space-y-2 bg-gradient-to-br from-gray-50 to-gray-200 p-4 rounded-lg border border-gray-400">
        <Label className="font-semibold text-gray-800">Fotos del inicio del trabajo</Label>
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="flex-1">
            <label htmlFor="fotos-inicio" className="block cursor-pointer border-2 border-dashed border-gray-500 rounded-lg p-4 text-center hover:bg-gray-100 transition">
              <div className="flex flex-col items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>
                <span className="text-gray-800 font-medium">Arrastra o haz click para seleccionar fotos</span>
                <span className="text-xs text-gray-600">Puedes seleccionar varias imágenes</span>
              </div>
              <input id="fotos-inicio" type="file" multiple accept="image/*" className="hidden" onChange={handleFotosInicio} />
            </label>
          </div>
          {fotosInicio.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {fotosInicio.map((file, idx) => (
                <div key={idx} className="relative w-20 h-20 bg-white border border-gray-500 rounded overflow-hidden flex items-center justify-center group">
                  <img src={URL.createObjectURL(file)} alt="foto inicio" className="object-cover w-full h-full" />
                  <button type="button" className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-80 hover:opacity-100" title="Eliminar"
                    onClick={() => setFotosInicio(fotosInicio.filter((_, i) => i !== idx))}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Fotos fin */}
      <div className="space-y-2 bg-gradient-to-br from-gray-50 to-gray-200 p-4 rounded-lg border border-gray-400">
        <Label className="font-semibold text-gray-800">Fotos del final del trabajo</Label>
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="flex-1">
            <label htmlFor="fotos-fin" className="block cursor-pointer border-2 border-dashed border-gray-500 rounded-lg p-4 text-center hover:bg-gray-100 transition">
              <div className="flex flex-col items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>
                <span className="text-gray-800 font-medium">Arrastra o haz click para seleccionar fotos</span>
                <span className="text-xs text-gray-600">Puedes seleccionar varias imágenes</span>
              </div>
              <input id="fotos-fin" type="file" multiple accept="image/*" className="hidden" onChange={handleFotosFin} />
            </label>
          </div>
          {fotosFin.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {fotosFin.map((file, idx) => (
                <div key={idx} className="relative w-20 h-20 bg-white border border-gray-500 rounded overflow-hidden flex items-center justify-center group">
                  <img src={URL.createObjectURL(file)} alt="foto fin" className="object-cover w-full h-full" />
                  <button type="button" className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-80 hover:opacity-100" title="Eliminar"
                    onClick={() => setFotosFin(fotosFin.filter((_, i) => i !== idx))}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Firma del cliente (opcional) */}
      <div className="space-y-2 bg-gradient-to-br from-gray-50 to-gray-200 p-4 rounded-lg border border-gray-400">
        <Label className="font-semibold text-gray-800">Firma del cliente (opcional)</Label>
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="flex-1">
            <label htmlFor="firma-cliente" className="block cursor-pointer border-2 border-dashed border-gray-500 rounded-lg p-4 text-center hover:bg-gray-100 transition">
              <div className="flex flex-col items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>
                <span className="text-gray-800 font-medium">Arrastra o haz click para seleccionar la firma</span>
                <span className="text-xs text-gray-600">Solo se permite una imagen</span>
              </div>
              <input id="firma-cliente" type="file" accept="image/*" className="hidden" onChange={e => {
                if (e.target.files && e.target.files[0]) setFirmaCliente(e.target.files[0])
                else setFirmaCliente(null)
              }} />
            </label>
          </div>
          {firmaCliente && (
            <div className="relative w-40 h-24 mt-2 flex items-center justify-center">
              <img src={URL.createObjectURL(firmaCliente)} alt="Firma del cliente" className="object-contain w-full h-full border border-gray-400 rounded bg-white shadow" />
              <button type="button" className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-80 hover:opacity-100" title="Eliminar"
                onClick={() => setFirmaCliente(null)}>
                ×
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6" disabled={loadingSubmit}>
          {loadingSubmit ? "Creando..." : "Crear Reporte"}
        </Button>
      </div>
    </form>
  )
}
