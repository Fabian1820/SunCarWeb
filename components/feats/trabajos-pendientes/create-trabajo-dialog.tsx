/**
 * Create Trabajo Pendiente Dialog Component
 *
 * Dialog form for creating a new pending work assignment
 * Includes client selector with search and manual CI entry
 */

import { useState, useEffect, useMemo } from 'react'
import { Loader2, Save, X, Users, UserPlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/shared/molecule/dialog'
import { Button } from '@/components/shared/atom/button'
import { Input } from '@/components/shared/molecule/input'
import { Label } from '@/components/shared/atom/label'
import { Textarea } from '@/components/shared/molecule/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/shared/atom/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/molecule/tabs'
import { FileUploadSection, getFileType } from './file-upload-section'
import type { TrabajoPendienteCreateData, ArchivoTrabajo } from '@/lib/types/feats/trabajos-pendientes/trabajo-pendiente-types'
import type { Cliente } from '@/lib/types/feats/customer/cliente-types'
import type { Lead } from '@/lib/types/feats/leads/lead-types'

interface CreateTrabajoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: TrabajoPendienteCreateData, archivos?: File[]) => Promise<void>
  clientes: Cliente[]
  leads: Lead[]
  initialCI?: string // Optional pre-filled CI
  initialLeadId?: string // Optional pre-filled Lead ID
}

export function CreateTrabajoDialog({
  open,
  onOpenChange,
  onSubmit,
  clientes,
  leads,
  initialCI,
  initialLeadId
}: CreateTrabajoDialogProps) {
  const [loading, setLoading] = useState(false)
  const [tipoReferencia, setTipoReferencia] = useState<'cliente' | 'lead'>('cliente')
  const [useManualCI, setUseManualCI] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [archivosToUpload, setArchivosToUpload] = useState<File[]>([])

  const [formData, setFormData] = useState<TrabajoPendienteCreateData>({
    CI: initialCI || undefined,
    lead_id: initialLeadId || undefined,
    estado: 'Pendiente',
    fecha_inicio: new Date().toISOString().split('T')[0],
    is_active: true,
    veces_visitado: 0,
    stopped_by: null,
    comentario: null,
    responsable_parada: null
  })

  // Reset form when dialog opens/closes or initialCI/initialLeadId changes
  useEffect(() => {
    if (open) {
      const hasInitialCI = !!initialCI
      const hasInitialLead = !!initialLeadId
      
      setFormData({
        CI: initialCI || undefined,
        lead_id: initialLeadId || undefined,
        estado: 'Pendiente',
        fecha_inicio: new Date().toISOString().split('T')[0],
        is_active: true,
        veces_visitado: 0,
        stopped_by: null,
        comentario: null,
        responsable_parada: null
      })
      
      setTipoReferencia(hasInitialLead ? 'lead' : 'cliente')
      setUseManualCI(hasInitialCI)
      setSearchTerm('')
      setArchivosToUpload([])
    }
  }, [open, initialCI, initialLeadId])

  // Filter clients by search term
  const filteredClientes = useMemo(() => {
    if (!searchTerm.trim()) return clientes
    const lower = searchTerm.toLowerCase()
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(lower) ||
        c.carnet_identidad?.toLowerCase().includes(lower) ||
        c.numero.toLowerCase().includes(lower)
    )
  }, [clientes, searchTerm])

  // Filter leads by search term
  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return leads
    const lower = searchTerm.toLowerCase()
    return leads.filter(
      (l) =>
        l.nombre.toLowerCase().includes(lower) ||
        l.telefono.toLowerCase().includes(lower) ||
        l.id?.toLowerCase().includes(lower)
    )
  }, [leads, searchTerm])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (tipoReferencia === 'cliente') {
      if (!formData.CI?.trim()) {
        alert('Por favor ingrese un CI o seleccione un cliente')
        return
      }
    } else {
      if (!formData.lead_id?.trim()) {
        alert('Por favor seleccione un lead')
        return
      }
    }
    
    if (!formData.estado.trim()) {
      alert('Por favor seleccione un estado')
      return
    }
    if (!formData.fecha_inicio) {
      alert('Por favor seleccione una fecha de inicio')
      return
    }

    setLoading(true)
    try {
      // Clean up data based on tipo_referencia
      const dataToSubmit = { ...formData }
      if (tipoReferencia === 'cliente') {
        delete dataToSubmit.lead_id
      } else {
        delete dataToSubmit.CI
      }
      
      await onSubmit(dataToSubmit, archivosToUpload)
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating trabajo:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClientSelect = (value: string) => {
    setFormData({ ...formData, CI: value, lead_id: undefined })
  }

  const handleLeadSelect = (value: string) => {
    setFormData({ ...formData, lead_id: value, CI: undefined })
  }

  const handleFileUpload = async (files: File[]) => {
    // Store files to upload after trabajo is created
    setArchivosToUpload(prev => [...prev, ...files])
  }

  const handleFileDelete = async (index: number) => {
    setArchivosToUpload(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-orange-600">
            Crear Trabajo Pendiente
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tabs para Cliente o Lead */}
          <Tabs value={tipoReferencia} onValueChange={(v) => setTipoReferencia(v as 'cliente' | 'lead')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cliente" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Cliente
              </TabsTrigger>
              <TabsTrigger value="lead" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Lead
              </TabsTrigger>
            </TabsList>

            {/* Tab Content: Cliente */}
            <TabsContent value="cliente" className="space-y-3 mt-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useManualCI"
                  checked={useManualCI}
                  onChange={(e) => {
                    setUseManualCI(e.target.checked)
                    if (!e.target.checked) {
                      setFormData({ ...formData, CI: undefined })
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="useManualCI" className="cursor-pointer">
                  Ingresar CI manualmente
                </Label>
              </div>

              {!useManualCI ? (
                <div>
                  <Label htmlFor="searchCliente">Buscar Cliente</Label>
                  <Input
                    id="searchCliente"
                    placeholder="Buscar por nombre o CI..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mb-2"
                  />
                  <Select value={formData.CI} onValueChange={handleClientSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredClientes.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">
                          No se encontraron clientes
                        </div>
                      ) : (
                        filteredClientes.map((cliente) => (
                          <SelectItem
                            key={cliente.numero}
                            value={cliente.carnet_identidad || cliente.numero}
                          >
                            {cliente.nombre} - CI: {cliente.carnet_identidad || 'N/A'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label htmlFor="manualCI">CI Manual</Label>
                  <Input
                    id="manualCI"
                    placeholder="Ingresar CI..."
                    value={formData.CI || ''}
                    onChange={(e) => setFormData({ ...formData, CI: e.target.value })}
                    required
                  />
                </div>
              )}
            </TabsContent>

            {/* Tab Content: Lead */}
            <TabsContent value="lead" className="space-y-3 mt-4">
              <div>
                <Label htmlFor="searchLead">Buscar Lead</Label>
                <Input
                  id="searchLead"
                  placeholder="Buscar por nombre o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-2"
                />
                <Select value={formData.lead_id} onValueChange={handleLeadSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredLeads.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">
                        No se encontraron leads
                      </div>
                    ) : (
                      filteredLeads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id || ''}>
                          {lead.nombre} - Tel: {lead.telefono} - Estado: {lead.estado}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          {/* Estado */}
          <div>
            <Label htmlFor="estado">Estado *</Label>
            <Select
              value={formData.estado}
              onValueChange={(value) => setFormData({ ...formData, estado: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="Finalizado">Finalizado</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fecha de Inicio */}
          <div>
            <Label htmlFor="fecha_inicio">Fecha de Inicio *</Label>
            <Input
              id="fecha_inicio"
              type="date"
              value={formData.fecha_inicio}
              onChange={(e) =>
                setFormData({ ...formData, fecha_inicio: e.target.value })
              }
              required
            />
          </div>

          {/* Detenido Por */}
          <div>
            <Label htmlFor="stopped_by">Detenido Por</Label>
            <Input
              id="stopped_by"
              placeholder="Motivo de la detención (opcional)"
              value={formData.stopped_by || ''}
              onChange={(e) =>
                setFormData({ ...formData, stopped_by: e.target.value || null })
              }
            />
          </div>

          {/* Responsable de la Parada */}
          <div>
            <Label htmlFor="responsable_parada">Responsable de la Parada</Label>
            <Select
              value={formData.responsable_parada || 'none'}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  responsable_parada: value === 'none' ? null : (value as any)
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar responsable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">N/A</SelectItem>
                <SelectItem value="nosotros">Nosotros</SelectItem>
                <SelectItem value="el cliente">El Cliente</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Comentario */}
          <div>
            <Label htmlFor="comentario">Comentario</Label>
            <Textarea
              id="comentario"
              placeholder="Comentarios adicionales (opcional)"
              value={formData.comentario || ''}
              onChange={(e) =>
                setFormData({ ...formData, comentario: e.target.value || null })
              }
              rows={3}
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              className="rounded border-gray-300"
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Trabajo activo
            </Label>
          </div>

          {/* Archivos Section */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Archivos Adjuntos</h3>
            <FileUploadSection
              archivos={archivosToUpload.map((file, index) => ({
                id: `temp-${index}`,
                url: URL.createObjectURL(file),
                tipo: getFileType(file.type),
                nombre: file.name,
                tamano: file.size,
                mime_type: file.type,
                created_at: new Date().toISOString()
              }))}
              onUpload={handleFileUpload}
              onDelete={(id) => {
                const index = parseInt(id.replace('temp-', ''))
                handleFileDelete(index)
              }}
              disabled={loading}
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto touch-manipulation"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
