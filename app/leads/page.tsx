"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shared/molecule/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { ArrowLeft, UserPlus, Plus, Search, Loader2, Filter, Calendar } from "lucide-react"
import { LeadsTable } from "@/components/feats/leads/leads-table"
import { CreateLeadDialog } from "@/components/feats/leads/create-lead-dialog"
import { EditLeadDialog } from "@/components/feats/leads/edit-lead-dialog"
import { useLeads } from "@/hooks/use-leads"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import type { Lead, LeadCreateData, LeadUpdateData } from "@/lib/api-types"

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
    clearError,
    loadLeads,
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
    } catch (e: any) {
      toast({
        title: "Error",
        description: 'Error al eliminar lead: ' + (e.message || 'Error desconocido'),
        variant: "destructive",
      })
    } finally {
      setLoadingAction(false)
    }
  }

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead)
    setIsEditLeadDialogOpen(true)
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
                    <SelectItem value="nuevo">Nuevo</SelectItem>
                    <SelectItem value="contactado">Contactado</SelectItem>
                    <SelectItem value="calificado">Calificado</SelectItem>
                    <SelectItem value="propuesta">Propuesta</SelectItem>
                    <SelectItem value="negociacion">Negociación</SelectItem>
                    <SelectItem value="cerrado_ganado">Cerrado - Ganado</SelectItem>
                    <SelectItem value="cerrado_perdido">Cerrado - Perdido</SelectItem>
                    <SelectItem value="descartado">Descartado</SelectItem>
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
            <CardTitle className="flex items-center gap-2">
              Lista de Leads
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            </CardTitle>
            <CardDescription>
              Mostrando {filteredLeads.length} leads
            </CardDescription>
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
                loading={loading}
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
            onSubmit={(data) => handleUpdateLead(editingLead.id!, data)}
            isLoading={loadingAction}
          />
        )}

      </main>
      <Toaster />
    </div>
  )
}