"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { FileCheck, Search, Calendar, Plus, Eye, List, User, Sun, Wrench, AlertTriangle, MapPin } from "lucide-react"
import { ReportsTable } from "@/components/feats/reports/reports-table"
import type { FormData } from "@/lib/types"
import FormViewer from "@/components/feats/reports/FormViewerNoSSR"
import { ClienteService, ReporteService } from "@/lib/api-services"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/shared/molecule/tabs"
import { ClientReportsChart } from "@/components/feats/reports/client-reports-chart";
import { useBrigadasTrabajadores } from "@/hooks/use-brigadas-trabajadores"
import { useMaterials } from "@/hooks/use-materials"
import { Toaster } from "@/components/shared/molecule/toaster"
import { LocationSection } from "@/components/shared/organism/location-section"
import MapPicker from "@/components/shared/organism/MapPickerNoSSR"
import { CreateReportDialog } from "@/components/feats/reports/create-report-dialog"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { ModuleHeader } from "@/components/shared/organism/module-header"

export default function ReportesPage() {
  const [reports, setReports] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingClients, setLoadingClients] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [selectedReport, setSelectedReport] = useState<any | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [selectedReportData, setSelectedReportData] = useState<any | null>(null)
  const [loadingReportDetails, setLoadingReportDetails] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // Cargar clientes
  const fetchClients = async () => {
    setLoadingClients(true)
    try {
      const data = await ClienteService.getClientes()
      console.log('Clientes cargados:', data)
      // El servicio devuelve { clients: Cliente[], total, skip, limit }
      setClients(data.clients || [])
    } catch (e: any) {
      console.error('Error cargando clientes:', e)
      setClients([])
    } finally {
      setLoadingClients(false)
    }
  }

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

  // Cargar datos iniciales
  const loadInitialData = async () => {
    setInitialLoading(true)
    try {
      await Promise.all([fetchReports(), fetchClients()])
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
      fetchReports()
    }
    // eslint-disable-next-line
  }, [filterType, searchTerm])
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

  // Columnas para reportes
  const reportColumns = [
    { key: "tipo_reporte", label: "Tipo de Servicio" },
    { key: "cliente", label: "Cliente", render: (row: any) => row.cliente?.numero || "-" },
    { key: "brigada", label: "Líder", render: (row: any) => row.brigada?.lider?.nombre || "-" },
    { key: "fecha_hora", label: "Fecha", render: (row: any) => row.fecha_hora?.fecha || "-" },
    { key: "descripcion", label: "Descripción", render: (row: any) => row.descripcion ? row.descripcion.slice(0, 40) + (row.descripcion.length > 40 ? '...' : '') : "-" },
  ]

  // Acción para ver detalles de reporte
  const handleViewReport = async (report: any) => {
    setSelectedReportId(report._id || report.id)
    setIsViewDialogOpen(true)
    setLoadingReportDetails(true)
    setSelectedReportData(null)
    try {
      // Importar dinámicamente apiRequest para evitar problemas de SSR
      const { apiRequest } = await import('@/lib/api-config')
      const data = await apiRequest(`/reportes/${report._id || report.id}`)
      setSelectedReportData(data)
    } catch (e) {
      setSelectedReportData(null)
    } finally {
      setLoadingReportDetails(false)
    }
  }

  // Busca el cliente completo por número (comparando como string)
  const getClienteByNumero = (numero: string | number) => clients.find(c => String(c.numero) === String(numero));

  // Mostrar loader mientras se cargan los datos iniciales
  if (initialLoading) {
    return <PageLoader moduleName="Reportes" text="Cargando reportes..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Gestión de Reportes"
        subtitle="Visualiza reportes"
        badge={{ text: "Documentación", className: "bg-emerald-100 text-emerald-800" }}
        className="bg-white shadow-sm border-b border-orange-100"
        actions={
          <Button
            size="icon"
            className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold shadow-md touch-manipulation"
            onClick={() => setIsCreateDialogOpen(true)}
            aria-label="Crear reporte"
            title="Crear reporte"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Crear Reporte</span>
            <span className="sr-only">Crear reporte</span>
          </Button>
        }
      />
      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Card className="border-0 shadow-md mb-6 border-l-4 border-l-emerald-600">
          <CardContent className="pt-6">
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
        <Card className="border-0 shadow-md border-l-4 border-l-emerald-600">
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
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
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
      </main>
      {/* Modal de creación de reporte */}
      <CreateReportDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} clients={clients} />
      <Toaster />
    </div>
  )
}
