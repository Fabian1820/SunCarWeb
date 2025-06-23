"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, FileCheck, Search, Calendar, Plus } from "lucide-react"
import { ReportsTable } from "@/components/reports-table"
import type { FormData } from "@/lib/types"
import { FormViewer } from "@/components/form-viewer"

export default function ReportesPage() {
  const [reports, setReports] = useState<FormData[]>([
    {
      formId: "H1114-001",
      serviceType: "inversion",
      brigade: { leader: "Carlos Rodríguez", members: ["Ana García", "Luis Martínez"] },
      materials: [
        { id: "1", name: "Panel Solar 450W", type: "Panel Solar", brand: "Canadian Solar" },
        { id: "2", name: "Inversor 5kW", type: "Inversor", brand: "Fronius" },
      ],
      location: {
        address: "Calle 123 #45-67, Bogotá",
        coordinates: { lat: 4.6097, lng: -74.0817 },
        distanceFromHQ: 15.5,
      },
      photos: [{ id: "1", file: new File([], ""), preview: "/placeholder.svg", description: "Instalación completa" }],
      dateTime: { date: "2024-01-15", time: "14:30" },
    },
    {
      formId: "H1114-002",
      serviceType: "mantenimiento",
      brigade: { leader: "María López", members: ["Juan Pérez"] },
      materials: [{ id: "1", name: "Panel Solar 400W", type: "Panel Solar", brand: "Jinko Solar" }],
      location: {
        address: "Carrera 45 #12-34, Medellín",
        coordinates: { lat: 6.2442, lng: -75.5812 },
        distanceFromHQ: 240.8,
      },
      photos: [{ id: "1", file: new File([], ""), preview: "/placeholder.svg", description: "Mantenimiento" }],
      dateTime: { date: "2024-01-16", time: "09:15" },
      description: "Mantenimiento preventivo de paneles solares, limpieza y revisión de conexiones.",
    },
    {
      formId: "H1114-003",
      serviceType: "averia",
      brigade: { leader: "Pedro Sánchez", members: ["Sofia Herrera", "Luis Martínez"] },
      materials: [
        { id: "1", name: "Inversor 3kW", type: "Inversor", brand: "SMA" },
        { id: "2", name: "Cable DC 6mm", type: "Cable", brand: "Prysmian" },
      ],
      location: {
        address: "Avenida 80 #25-10, Cali",
        coordinates: { lat: 3.4516, lng: -76.532 },
        distanceFromHQ: 450.2,
      },
      photos: [{ id: "1", file: new File([], ""), preview: "/placeholder.svg", description: "Reparación de avería" }],
      dateTime: { date: "2024-01-17", time: "11:00" },
      description:
        "Reparación de inversor dañado por sobretensión. Se reemplazó el equipo y se verificaron las conexiones.",
    },
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterDate, setFilterDate] = useState("")
  const [selectedReport, setSelectedReport] = useState<FormData | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  // Estados simulados para los reportes
  const [reportStatuses] = useState<Record<string, "Revisado" | "No Revisado">>({
    "H1114-001": "Revisado",
    "H1114-002": "No Revisado",
    "H1114-003": "No Revisado",
  })

  const openViewDialog = (report: FormData) => {
    setSelectedReport(report)
    setIsViewDialogOpen(true)
  }

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.formId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.brigade.leader.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.location.address.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesTypeFilter = filterType === "all" || report.serviceType === filterType
    const matchesStatusFilter = filterStatus === "all" || reportStatuses[report.formId] === filterStatus

    let matchesDateFilter = true
    if (filterDate) {
      matchesDateFilter = report.dateTime.date === filterDate
    }

    return matchesSearch && matchesTypeFilter && matchesStatusFilter && matchesDateFilter
  })

  const serviceTypes = [
    { value: "inversion", label: "Inversión" },
    { value: "mantenimiento", label: "Mantenimiento" },
    { value: "averia", label: "Avería" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
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
                  <p className="text-sm text-gray-600">Administrar historial de reportes H-1114</p>
                </div>
              </div>
            </div>
            <Link href="/formulario-h1114">
              <Button className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Reporte
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <Card className="border-0 shadow-md mb-6">
          <CardHeader>
            <CardTitle>Filtros y Búsqueda</CardTitle>
            <CardDescription>Encuentra reportes específicos en el historial</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <Label htmlFor="search" className="text-sm font-medium text-gray-700 mb-2 block">
                  Buscar Reporte
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Buscar por ID, jefe de brigada o ubicación..."
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
                    {serviceTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status-filter" className="text-sm font-medium text-gray-700 mb-2 block">
                  Estado
                </Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="Revisado">Revisado</SelectItem>
                    <SelectItem value="No Revisado">No Revisado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="date-filter" className="text-sm font-medium text-gray-700 mb-2 block">
                  Fecha
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="date-filter"
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Historial de Reportes</CardTitle>
            <CardDescription>
              Mostrando {filteredReports.length} de {reports.length} reportes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReportsTable reports={filteredReports} reportStatuses={reportStatuses} onView={openViewDialog} />
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalles del Reporte {selectedReport?.formId}</DialogTitle>
            </DialogHeader>
            {selectedReport && <FormViewer formData={selectedReport} />}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
