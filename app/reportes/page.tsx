"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, FileCheck, Search, Calendar, Plus, Eye, List, User } from "lucide-react"
import { ReportsTable } from "@/components/reports-table"
import type { FormData } from "@/lib/types"
import { FormViewer } from "@/components/form-viewer"
import { ClienteService, ReporteService } from "@/lib/api-services"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

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

  // Cargar reportes
  const fetchReports = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (filterType !== "all") params.tipo_reporte = filterType
      if (searchTerm) params.q = searchTerm // búsqueda global
      const data = await ReporteService.getReportes(params)
      setReports(data)
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
      setClients(data)
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
  const handleViewReport = (report: any) => {
    setSelectedReport(report)
    setIsViewDialogOpen(true)
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
                />
              </CardContent>
            </Card>
            {/* Modal de detalles de reporte */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Detalles del Reporte</DialogTitle>
                </DialogHeader>
                {selectedReport && (
                  <FormViewer
                    formData={selectedReport}
                    clienteCompleto={getClienteByNumero(selectedReport.cliente?.numero)}
                  />
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
                  />
                )}
              </DialogContent>
            </Dialog>
            {/* Modal de detalles de reporte desde cliente */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Detalles del Reporte</DialogTitle>
                </DialogHeader>
                {selectedReport && (
                  <FormViewer
                    formData={selectedReport}
                    clienteCompleto={getClienteByNumero(selectedReport.cliente?.numero)}
                  />
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
