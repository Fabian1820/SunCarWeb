"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shared/molecule/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Plus, Search, Loader2, Filter, Calendar } from "lucide-react"
import { LeadsTable } from "@/components/feats/leads/leads-table"
import { CreateLeadDialog } from "@/components/feats/leads/create-lead-dialog"
import { EditLeadDialog } from "@/components/feats/leads/edit-lead-dialog"
import { ExportButtons } from "@/components/shared/molecule/export-buttons"
import { FuentesManager } from "@/components/shared/molecule/fuentes-manager"
import { useLeads } from "@/hooks/use-leads"
import { useFuentesSync } from "@/hooks/use-fuentes-sync"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import type { Lead, LeadCreateData, LeadUpdateData, LeadConversionRequest } from "@/lib/api-types"
import type { ExportOptions } from "@/lib/export-service"
import { downloadFile } from "@/lib/utils/download-file"
import { ModuleHeader } from "@/components/shared/organism/module-header"

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
    generarCodigoCliente,
    uploadLeadComprobante,
    clearError,
  } = useLeads()

  // Sincronizar fuentes de leads con localStorage
  useFuentesSync(leads, [], !loading)

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

  const handleUpdateLeadPrioridad = async (leadId: string, prioridad: "Alta" | "Media" | "Baja") => {
    if (!leadId) return
    try {
      await updateLead(leadId, { prioridad })
      // No mostrar toast aquí, lo maneja la tabla
    } catch (e) {
      console.error('Error updating lead priority:', e)
      throw e // Re-lanzar para que la tabla maneje el error
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

  // Wrapper para generarCodigoCliente que NO lanza excepciones
  // Devuelve el código o null en caso de error
  const handleGenerarCodigoCliente = async (leadId: string, equipoPropio?: boolean): Promise<string> => {
    try {
      return await generarCodigoCliente(leadId, equipoPropio)
    } catch (error) {
      // NO re-lanzar el error, devolverlo como string vacío
      // El componente LeadsTable manejará esto
      console.error('Error in handleGenerarCodigoCliente:', error)
      // Lanzar el error para que LeadsTable lo capture en su try-catch
      throw error
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
    // Construir título con filtro de estado si aplica
    let titulo = 'Listado de Leads'
    if (filters.estado) {
      titulo = `Listado de Leads - ${filters.estado}`
    }
    
    const exportData = filteredLeads.map((lead, index) => {
      // Formatear ofertas SIN saltos de línea - el wrap natural de Excel lo hará
      let ofertaTexto = ''
      
      if (lead.ofertas && lead.ofertas.length > 0) {
        const ofertasFormateadas = lead.ofertas.map(oferta => {
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

      return {
        numero: index + 1,
        nombre: lead.nombre || 'N/A',
        telefono: lead.telefono || 'N/A',
        provincia: lead.provincia_montaje || 'N/A',
        municipio: lead.municipio || 'N/A',
        direccion: lead.direccion || 'N/A',
        oferta: ofertaTexto
      }
    })

    return {
      title: `Suncar SRL: ${titulo}`,
      subtitle: `Fecha: ${new Date().toLocaleDateString('es-ES')}`,
      columns: [
        { header: 'No.', key: 'numero', width: 4 },
        { header: 'Nombre', key: 'nombre', width: 14 },
        { header: 'Teléfono', key: 'telefono', width: 14 },
        { header: 'Provincia', key: 'provincia', width: 12 },
        { header: 'Municipio', key: 'municipio', width: 12 },
        { header: 'Dirección', key: 'direccion', width: 38 },
        { header: 'Oferta', key: 'oferta', width: 23.57 },
      ],
      data: exportData
    }
  }

  if (loading && leads.length === 0) return <PageLoader moduleName="Leads" text="Cargando leads..." />
  if (error) return <div>Error: {error}</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <ModuleHeader
        title="Gestión de Leads"
        subtitle="Administrar leads y oportunidades de venta"
        badge={{ text: "Ventas", className: "bg-green-100 text-green-800" }}
        actions={
          <div className="flex items-center gap-2">
            <FuentesManager />
            <Dialog open={isCreateLeadDialogOpen} onOpenChange={setIsCreateLeadDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 touch-manipulation"
                  aria-label="Nuevo lead"
                  title="Nuevo lead"
                >
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Nuevo Lead</span>
                  <span className="sr-only">Nuevo lead</span>
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
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
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
          <CardContent className="p-6">
            {/* Primera fila: Búsqueda y botón limpiar */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Buscar por nombre, teléfono, dirección..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setFilters({
                    searchTerm: '',
                    estado: '',
                    fuente: '',
                    comercial: '',
                    fechaDesde: '',
                    fechaHasta: ''
                  })
                }}
                className="text-gray-600 hover:text-gray-800 whitespace-nowrap"
              >
                Limpiar Filtros
              </Button>
            </div>

            {/* Segunda fila: Todos los filtros en una sola fila con buen espaciado */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Filtro por Estado */}
              <div>
                <Select value={filters.estado || "todos"} onValueChange={(value) => setFilters({ estado: value === "todos" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="Esperando equipo">Esperando equipo</SelectItem>
                    <SelectItem value="No interesado">No interesado</SelectItem>
                    <SelectItem value="Pendiente de instalación">Pendiente de instalación</SelectItem>
                    <SelectItem value="Pendiente de presupuesto">Pendiente de presupuesto</SelectItem>
                    <SelectItem value="Pendiente de visita">Pendiente de visita</SelectItem>
                    <SelectItem value="Pendiente de visitarnos">Pendiente de visitarnos</SelectItem>
                    <SelectItem value="Proximamente">Proximamente</SelectItem>
                    <SelectItem value="Revisando ofertas">Revisando ofertas</SelectItem>
                    <SelectItem value="Sin respuesta">Sin respuesta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Fuente */}
              <div>
                <Select value={filters.fuente || "todas"} onValueChange={(value) => setFilters({ fuente: value === "todas" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las fuentes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las fuentes</SelectItem>
                    <SelectItem value="Página Web">Página Web</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Directo">Directo</SelectItem>
                    <SelectItem value="Mensaje de Whatsapp">Mensaje de Whatsapp</SelectItem>
                    <SelectItem value="Visita">Visita</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Comercial */}
              <div>
                <Select value={filters.comercial || "todos"} onValueChange={(value) => setFilters({ comercial: value === "todos" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los comerciales" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los comerciales</SelectItem>
                    <SelectItem value="Enelido Alexander Calero Perez">Enelido Alexander Calero Perez</SelectItem>
                    <SelectItem value="Yanet Clara Rodríguez Quintana">Yanet Clara Rodríguez Quintana</SelectItem>
                    <SelectItem value="Dashel Pinillos Zubiaur">Dashel Pinillos Zubiaur</SelectItem>
                    <SelectItem value="Gretel María Mojena Almenares">Gretel María Mojena Almenares</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Fecha Desde */}
              <div>
                <Input
                  type="date"
                  value={filters.fechaDesde}
                  onChange={(e) => setFilters({ fechaDesde: e.target.value })}
                  placeholder="Fecha desde"
                />
              </div>

              {/* Filtro Fecha Hasta */}
              <div>
                <Input
                  type="date"
                  value={filters.fechaHasta}
                  onChange={(e) => setFilters({ fechaHasta: e.target.value })}
                  placeholder="Fecha hasta"
                />
              </div>
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
                onGenerarCodigo={handleGenerarCodigoCliente}
                onUploadComprobante={handleUploadLeadComprobante}
                onDownloadComprobante={handleDownloadLeadComprobante}
                onUpdatePrioridad={handleUpdateLeadPrioridad}
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
