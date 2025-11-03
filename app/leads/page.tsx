"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shared/molecule/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { ArrowLeft, Plus, Search, Loader2, Filter, Calendar } from "lucide-react"
import { LeadsTable } from "@/components/feats/leads/leads-table"
import { CreateLeadDialog } from "@/components/feats/leads/create-lead-dialog"
import { EditLeadDialog } from "@/components/feats/leads/edit-lead-dialog"
import { ExportButtons } from "@/components/shared/molecule/export-buttons"
import { useLeads } from "@/hooks/use-leads"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import type { Lead, LeadCreateData, LeadUpdateData, LeadConversionRequest } from "@/lib/api-types"
import type { ExportOptions } from "@/lib/export-service"
import { downloadFile } from "@/lib/utils/download-file"

export default function LeadsPage() {
  const {
    leads,
    filteredLeads,
    availableSources,
    filters,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    setFilters,
    createLead,
    updateLead,
    deleteLead,
    convertLead,
    uploadLeadComprobante,
    clearError,
  } = useLeads()

  const [isCreateLeadDialogOpen, setIsCreateLeadDialogOpen] = useState(false)
  const [isEditLeadDialogOpen, setIsEditLeadDialogOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [loadingAction, setLoadingAction] = useState(false)
  const { toast } = useToast()

  const handleCreateLead = async (data: LeadCreateData) => {
    console.log('handleCreateLead called with data:', data)
    setLoadingAction(true)
    try {
      await createLead(data)
      toast({
        title: "Éxito",
        description: 'Lead creado correctamente',
      })
      setIsCreateLeadDialogOpen(false)
    } catch (e) {
      console.error('Error in handleCreateLead:', e)
      toast({
        title: "Error",
        description: 'Error al crear lead: ' + (e instanceof Error ? e.message : 'Error desconocido'),
        variant: "destructive",
      })
    } finally {
      setLoadingAction(false)
    }
  }

  const handleUpdateLead = async (leadId: string, data: LeadUpdateData) => {
    if (!leadId) {
      toast({
        title: "Error",
        description: "No se puede actualizar un lead sin identificador.",
        variant: "destructive",
      })
      return
    }
    setLoadingAction(true)
    try {
      await updateLead(leadId, data)
      toast({
        title: "Éxito",
        description: 'Lead actualizado correctamente',
      })
      setIsEditLeadDialogOpen(false)
      setEditingLead(null)
    } catch (e) {
      console.error('Error in handleUpdateLead:', e)
      toast({
        title: "Error",
        description: 'Error al actualizar lead: ' + (e instanceof Error ? e.message : 'Error desconocido'),
        variant: "destructive",
      })
    } finally {
      setLoadingAction(false)
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    setLoadingAction(true)
    try {
      await deleteLead(leadId)
      toast({
        title: "Éxito",
        description: 'Lead eliminado correctamente',
      })
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: 'Error al eliminar lead: ' + (error instanceof Error ? error.message : 'Error desconocido'),
        variant: "destructive",
      })
    } finally {
      setLoadingAction(false)
    }
  }

  const handleUploadLeadComprobante = async (
    lead: Lead,
    payload: { file: File; metodo_pago?: string; moneda?: string }
  ) => {
    if (!lead.id) {
      const message = "No se puede subir un comprobante sin ID de lead."
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
      throw new Error(message)
    }

    setLoadingAction(true)
    try {
      const result = await uploadLeadComprobante(lead.id, payload)
      toast({
        title: "Comprobante actualizado",
        description: result.metodo_pago
          ? `Método: ${result.metodo_pago}${result.moneda ? ` • Moneda: ${result.moneda}` : ''}`
          : 'Comprobante subido correctamente',
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo subir el comprobante'
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
      throw error instanceof Error ? error : new Error(message)
    } finally {
      setLoadingAction(false)
    }
  }

  const handleDownloadLeadComprobante = async (lead: Lead) => {
    if (!lead.comprobante_pago_url) {
      toast({
        title: "Sin comprobante",
        description: "Este lead aún no tiene un comprobante asociado.",
        variant: "destructive",
      })
      return
    }

    try {
      await downloadFile(lead.comprobante_pago_url, `comprobante-lead-${lead.nombre || lead.id || 'archivo'}`)
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

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead)
    setIsEditLeadDialogOpen(true)
  }

  const handleConvertLead = async (lead: Lead, data: LeadConversionRequest) => {
    if (!lead.id) {
      toast({
        title: "Error",
        description: "No se puede convertir un lead sin identificador.",
        variant: "destructive",
      })
      return
    }

    setLoadingAction(true)
    try {
      const cliente = await convertLead(lead.id, data)
      toast({
        title: "Lead convertido",
        description: `Se creó el cliente ${cliente.numero || 'sin número asignado'} a partir del lead.`,
      })
    } catch (e) {
      console.error('Error converting lead:', e)
      toast({
        title: "Error",
        description: 'No se pudo convertir el lead: ' + (e instanceof Error ? e.message : 'Error desconocido'),
        variant: "destructive",
      })
    } finally {
      setLoadingAction(false)
    }
  }

 // Función para formatear el estado de manera legible
const formatEstado = (estado: string): string => {
  const estados: Record<string, string> = {
    'pendiente_visita': 'Pendiente de visita',
    'pendiente_visitarnos': 'Pendiente de visitarnos',
    'pendiente_pago': 'Pendiente de pago',
    'revisando_ofertas': 'Revisando ofertas',
    'sin_respuesta': 'Sin respuesta aun',
    'proximamente': 'Proximamente',
    'pendiente_instalacion': 'Pendiente de instalación',
    'pendiente_presupuesto': 'Pendiente de presupuesto',
  }
  return estados[estado] || estado
}
  const formatFecha = (valor?: string): string => {
    if (!valor) return 'N/A'
    if (valor.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return valor
    }
    const fecha = new Date(valor)
    if (!Number.isNaN(fecha.getTime())) {
      return fecha.toLocaleDateString('es-ES')
    }
    return valor
  }

  // Preparar opciones de exportación para leads
  const getExportOptions = (): Omit<ExportOptions, 'filename'> => {
    // Preparar datos para exportación con formato legible
    const exportData = filteredLeads.map(lead => {
      const ofertasResumen = (lead.ofertas || [])
        .map(oferta => `${oferta.descripcion} (x${oferta.cantidad})`)
        .join(' | ')

      const elementosResumen = (lead.elementos_personalizados || [])
        .map(elemento => `${elemento.descripcion} (x${elemento.cantidad})`)
        .join(' | ')

      return {
        ...lead,
        fecha_contacto: formatFecha(lead.fecha_contacto),
        estado: formatEstado(lead.estado),
        fuente: lead.fuente || 'N/A',
        referencia: lead.referencia || 'N/A',
        direccion: lead.direccion || 'N/A',
        pais_contacto: lead.pais_contacto || 'N/A',
        telefono_adicional: lead.telefono_adicional || 'N/A',
        comentario: lead.comentario || 'N/A',
        comercial: lead.comercial || 'N/A',
        provincia_montaje: lead.provincia_montaje || 'N/A',
        ofertas_resumen: ofertasResumen || 'N/A',
        elementos_resumen: elementosResumen || 'N/A'
      }
    })

    return {
      title: 'Listado de Leads',
      subtitle: `Total de leads: ${filteredLeads.length} | Fecha: ${new Date().toLocaleDateString('es-ES')}`,
      columns: [
        { header: 'Fecha Contacto', key: 'fecha_contacto', width: 15 },
        { header: 'Nombre', key: 'nombre', width: 25 },
        { header: 'Teléfono', key: 'telefono', width: 15 },
        { header: 'Teléfono adicional', key: 'telefono_adicional', width: 18 },
        { header: 'Estado', key: 'estado', width: 18 },
        { header: 'Comercial', key: 'comercial', width: 20 },
        { header: 'Fuente', key: 'fuente', width: 15 },
        { header: 'Referencia', key: 'referencia', width: 20 },
        { header: 'Dirección', key: 'direccion', width: 30 },
        { header: 'País', key: 'pais_contacto', width: 15 },
        { header: 'Comentario', key: 'comentario', width: 30 },
        { header: 'Provincia Montaje', key: 'provincia_montaje', width: 18 },
        { header: 'Ofertas', key: 'ofertas_resumen', width: 40 },
        { header: 'Elementos personalizados', key: 'elementos_resumen', width: 35 },
      ],
      data: exportData
    }
  }

  if (loading && leads.length === 0) return <PageLoader moduleName="Leads" text="Cargando leads..." />
  if (error) return <div>Error: {error}</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header className="fixed-header">
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
                  Gestión de Leads
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Ventas
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Administrar leads y oportunidades de venta</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={isCreateLeadDialogOpen} onOpenChange={setIsCreateLeadDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Lead
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Lead</DialogTitle>
                  </DialogHeader>
                  <CreateLeadDialog
                    onSubmit={handleCreateLead}
                    onCancel={() => setIsCreateLeadDialogOpen(false)}
                    availableSources={availableSources}
                    isLoading={loadingAction}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Error Alert */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-red-800">{error}</p>
                <Button variant="ghost" size="sm" onClick={clearError} className="text-red-600">
                  ✕
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <Card className="mb-8 border-l-4 border-l-green-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-green-600" />
              Búsqueda y Filtros
            </CardTitle>
            <CardDescription>Filtra y busca leads por diferentes criterios</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* Búsqueda general */}
              <div>
                <Label htmlFor="search" className="text-sm font-medium text-gray-700 mb-2 block">
                  Búsqueda General
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Nombre, teléfono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Filtro por Estado */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Estado
                </Label>
                <Select value={filters.estado || "todos"} onValueChange={(value) => setFilters({ estado: value === "todos" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                 <SelectContent>
  <SelectItem value="todos">Todos los estados</SelectItem>
  <SelectItem value="Pendiente de visita">Pendiente de visita</SelectItem>
  <SelectItem value="Pendiente de visitarnos">Pendiente de visitarnos</SelectItem>
  <SelectItem value="Pendiente de pago">Pendiente de pago</SelectItem>
  <SelectItem value="Revisando ofertas">Revisando ofertas</SelectItem>
  <SelectItem value="Sin respuesta">Sin respuesta</SelectItem>
  <SelectItem value="Proximamente">Proximamente</SelectItem>
  <SelectItem value="Pendiente de instalación">Pendiente de instalación</SelectItem>
  <SelectItem value="Pendiente de presupuesto">Pendiente de presupuesto</SelectItem>
</SelectContent>
                </Select>
              </div>

              {/* Filtro por Fuente */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Fuente
                </Label>
                <Select value={filters.fuente || "todas"} onValueChange={(value) => setFilters({ fuente: value === "todas" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las fuentes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las fuentes</SelectItem>
                    {availableSources.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Fecha Desde */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Fecha Desde
                </Label>
                <Input
                  type="date"
                  value={filters.fechaDesde}
                  onChange={(e) => setFilters({ fechaDesde: e.target.value })}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {/* Filtro Fecha Hasta */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Fecha Hasta
                </Label>
                <Input
                  type="date"
                  value={filters.fechaHasta}
                  onChange={(e) => setFilters({ fechaHasta: e.target.value })}
                  placeholder="DD/MM/YYYY"
                />
              </div>
            </div>

            {/* Botón para limpiar filtros */}
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setFilters({
                    searchTerm: '',
                    estado: '',
                    fuente: '',
                    fechaDesde: '',
                    fechaHasta: ''
                  })
                }}
                className="text-gray-600 hover:text-gray-800"
              >
                Limpiar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card className="border-l-4 border-l-green-600">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Lista de Leads
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                </CardTitle>
                <CardDescription>
                  Mostrando {filteredLeads.length} leads
                </CardDescription>
              </div>
              
              {/* Botones de exportación */}
              {filteredLeads.length > 0 && (
                <div className="flex-shrink-0">
                  <ExportButtons
                    exportOptions={getExportOptions()}
                    baseFilename="leads"
                    variant="compact"
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading && leads.length === 0 ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Cargando leads...</p>
              </div>
            ) : (
              <LeadsTable
                leads={filteredLeads}
                onEdit={handleEditLead}
                onDelete={handleDeleteLead}
                onConvert={handleConvertLead}
                onUploadComprobante={handleUploadLeadComprobante}
                onDownloadComprobante={handleDownloadLeadComprobante}
                loading={loading}
                disableActions={loadingAction}
              />
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        {editingLead && (
          <EditLeadDialog
            open={isEditLeadDialogOpen}
            onOpenChange={setIsEditLeadDialogOpen}
            lead={editingLead}
            onSubmit={(data) => handleUpdateLead(editingLead.id || '', data)}
            isLoading={loadingAction}
          />
        )}

      </main>
      <Toaster />
    </div>
  )
}
