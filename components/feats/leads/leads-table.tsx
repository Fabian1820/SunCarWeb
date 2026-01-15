"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Label } from "@/components/shared/atom/label"
import { Input } from "@/components/shared/molecule/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, ConfirmDeleteDialog } from "@/components/shared/molecule/dialog"
import { UploadComprobanteDialog } from "@/components/shared/molecule/upload-comprobante-dialog"
import { downloadFile } from "@/lib/utils/download-file"
import MapPicker from "@/components/shared/organism/MapPickerNoSSR"
import {
  Edit,
  Trash2,
  Phone,
  PhoneForwarded,
  Eye,
  Calendar,
  MapPin,
  Building,
  UserPlus,
  UserCheck,
  Package,
  ListChecks,
  Loader2,
  Download,
  CreditCard,
  Plus,
} from "lucide-react"
import { useOfertasPersonalizadas } from "@/hooks/use-ofertas-personalizadas"
import { OfertasPersonalizadasTable } from "@/components/feats/ofertas-personalizadas/ofertas-personalizadas-table"
import { CreateOfertaDialog } from "@/components/feats/ofertas-personalizadas/create-oferta-dialog"
import { EditOfertaDialog } from "@/components/feats/ofertas-personalizadas/edit-oferta-dialog"
import type {
  OfertaPersonalizada,
  OfertaPersonalizadaCreateRequest,
  OfertaPersonalizadaUpdateRequest,
} from "@/lib/types/feats/ofertas-personalizadas/oferta-personalizada-types"
import { useToast } from "@/hooks/use-toast"
import type { Lead, LeadConversionRequest } from "@/lib/api-types"

interface LeadsTableProps {
  leads: Lead[]
  onEdit: (lead: Lead) => void
  onDelete: (id: string) => void
  onConvert: (lead: Lead, data: LeadConversionRequest) => Promise<void>
  onUploadComprobante: (
    lead: Lead,
    payload: { file: File; metodo_pago?: string; moneda?: string }
  ) => Promise<void>
  onDownloadComprobante?: (lead: Lead) => Promise<void>
  loading?: boolean
  disableActions?: boolean
}

// Helper function to break text at approximately 25 characters
function breakTextAtLength(text: string, maxLength: number = 25): string {
  if (!text || text.length <= maxLength) return text
  
  const words = text.split(' ')
  let result = ''
  let currentLine = ''
  
  for (const word of words) {
    if ((currentLine + word).length <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word
    } else {
      if (currentLine) {
        result += (result ? '\n' : '') + currentLine
      }
      currentLine = word
    }
  }
  
  if (currentLine) {
    result += (result ? '\n' : '') + currentLine
  }
  
  return result || text
}

export function LeadsTable({
  leads,
  onEdit,
  onDelete,
  onConvert,
  onUploadComprobante,
  onDownloadComprobante,
  loading,
  disableActions,
}: LeadsTableProps) {
  const { toast } = useToast()
  const {
    ofertas,
    loading: ofertasLoading,
    createOferta,
    updateOferta,
    deleteOferta,
  } = useOfertasPersonalizadas()
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null)
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false)
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null)
  const [conversionData, setConversionData] = useState<LeadConversionRequest>({ numero: '' })
  const [conversionErrors, setConversionErrors] = useState<Record<string, string>>({})
  const [conversionLoading, setConversionLoading] = useState(false)
  const [isComprobanteDialogOpen, setIsComprobanteDialogOpen] = useState(false)
  const [leadForComprobante, setLeadForComprobante] = useState<Lead | null>(null)
  const [showOfertasDialog, setShowOfertasDialog] = useState(false)
  const [selectedLeadForOfertas, setSelectedLeadForOfertas] = useState<Lead | null>(null)
  const [isCreateOfertaOpen, setIsCreateOfertaOpen] = useState(false)
  const [isEditOfertaOpen, setIsEditOfertaOpen] = useState(false)
  const [editingOferta, setEditingOferta] = useState<OfertaPersonalizada | null>(null)
  const [ofertaSubmitting, setOfertaSubmitting] = useState(false)

  const ofertasDelLead = useMemo(() => {
    if (!selectedLeadForOfertas) return []
    const leadIdentifiers = [selectedLeadForOfertas.id, selectedLeadForOfertas.telefono].filter(Boolean) as string[]
    return ofertas.filter((o) => o.lead_id && leadIdentifiers.includes(o.lead_id))
  }, [ofertas, selectedLeadForOfertas])

  const openDetailDialog = (lead: Lead) => {
    setSelectedLead(lead)
    setIsDetailDialogOpen(true)
  }

  const handleDeleteClick = (lead: Lead) => {
    setLeadToDelete(lead)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (leadToDelete?.id) {
      onDelete(leadToDelete.id)
      setIsDeleteDialogOpen(false)
      setLeadToDelete(null)
    }
  }

  const resetConversionState = () => {
    setConversionData({ numero: '', metodo_pago: '', moneda: '' })
    setConversionErrors({})
    setConversionLoading(false)
  }

  const openConvertDialog = (lead: Lead) => {
    setLeadToConvert(lead)
    setConversionData({
      numero: '',
      metodo_pago: lead.metodo_pago || '',
      moneda: lead.moneda || '',
      estado: lead.estado || '',
      fuente: lead.fuente || '',
      municipio: lead.municipio || '',
    })
    setConversionErrors({})
    setConversionLoading(false)
    setIsConvertDialogOpen(true)
  }

  const closeConvertDialog = () => {
    setIsConvertDialogOpen(false)
    setLeadToConvert(null)
    resetConversionState()
  }

  const handleComprobanteDialogOpenChange = (open: boolean) => {
    setIsComprobanteDialogOpen(open)
    if (!open) {
      setLeadForComprobante(null)
    }
  }

  const handleComprobanteSubmit = async (payload: {
    file: File
    metodo_pago?: string
    moneda?: string
  }) => {
    if (!leadForComprobante) {
      throw new Error('No se encontró el lead seleccionado')
    }
    await onUploadComprobante(leadForComprobante, payload)
  }

  const handleDownloadComprobante = async (lead: Lead) => {
    if (!lead.comprobante_pago_url) {
      return
    }

    try {
      if (onDownloadComprobante) {
        await onDownloadComprobante(lead)
        return
      }

      await downloadFile(lead.comprobante_pago_url, `comprobante-lead-${lead.nombre || lead.id || 'archivo'}`)
    } catch (error) {
      console.error('Error downloading comprobante for lead', lead.id, error)
    }
  }

  const closeOfertasDialog = () => {
    setShowOfertasDialog(false)
    setSelectedLeadForOfertas(null)
    setIsCreateOfertaOpen(false)
    setIsEditOfertaOpen(false)
    setEditingOferta(null)
  }

  const handleCreateOfertaLead = async (payload: OfertaPersonalizadaCreateRequest) => {
    if (!selectedLeadForOfertas?.id) return
    setOfertaSubmitting(true)
    try {
      const success = await createOferta({
        ...payload,
        lead_id: selectedLeadForOfertas.id,
        cliente_id: undefined,
      })
      toast({
        title: success ? "Oferta creada" : "No se pudo crear la oferta",
        description: success
          ? "Se registró la oferta personalizada para el lead."
          : "Intenta nuevamente más tarde.",
        variant: success ? "default" : "destructive",
      })
      if (success) {
        setIsCreateOfertaOpen(false)
      }
    } finally {
      setOfertaSubmitting(false)
    }
  }

  const handleUpdateOfertaLead = async (id: string, data: OfertaPersonalizadaUpdateRequest) => {
    if (!selectedLeadForOfertas?.id || !id) return
    setOfertaSubmitting(true)
    try {
      const success = await updateOferta(id, {
        ...data,
        lead_id: selectedLeadForOfertas.id,
        cliente_id: undefined,
      })
      toast({
        title: success ? "Oferta actualizada" : "No se pudo actualizar la oferta",
        description: success
          ? "Cambios guardados correctamente."
          : "Intenta nuevamente más tarde.",
        variant: success ? "default" : "destructive",
      })
      if (success) {
        setIsEditOfertaOpen(false)
        setEditingOferta(null)
      }
    } finally {
      setOfertaSubmitting(false)
    }
  }

  const handleDeleteOfertaLead = async (id: string) => {
    if (!id) return
    setOfertaSubmitting(true)
    try {
      const success = await deleteOferta(id)
      toast({
        title: success ? "Oferta eliminada" : "No se pudo eliminar",
        description: success ? "Se eliminó la oferta personalizada." : "Intenta nuevamente.",
        variant: success ? "default" : "destructive",
      })
    } finally {
      setOfertaSubmitting(false)
    }
  }

  const handleConversionInputChange = (field: keyof LeadConversionRequest, value: string) => {
    setConversionData((prev) => ({
      ...prev,
      [field]: value,
    }))

    if (conversionErrors[field]) {
      setConversionErrors((prev) => {
        const { [field]: _, ...rest } = prev
        return rest
      })
    }
  }

  const buildConversionPayload = (): LeadConversionRequest => {
    const payload: LeadConversionRequest = {
      numero: conversionData.numero.trim(),
    }

    if (conversionData.fecha_montaje && conversionData.fecha_montaje.trim()) {
      payload.fecha_montaje = conversionData.fecha_montaje
    }

    if (conversionData.latitud !== undefined && `${conversionData.latitud}`.trim() !== '') {
      payload.latitud = conversionData.latitud
    }

    if (conversionData.longitud !== undefined && `${conversionData.longitud}`.trim() !== '') {
      payload.longitud = conversionData.longitud
    }

    if (conversionData.carnet_identidad && conversionData.carnet_identidad.trim()) {
      payload.carnet_identidad = conversionData.carnet_identidad.trim()
    }

    if (conversionData.fecha_instalacion && conversionData.fecha_instalacion.trim()) {
      payload.fecha_instalacion = conversionData.fecha_instalacion
    }

    if (conversionData.metodo_pago && conversionData.metodo_pago.trim()) {
      payload.metodo_pago = conversionData.metodo_pago.trim()
    }

    if (conversionData.moneda && conversionData.moneda.trim()) {
      payload.moneda = conversionData.moneda.trim()
    }

    if (conversionData.estado && conversionData.estado.trim()) {
      payload.estado = conversionData.estado.trim()
    }

    if (conversionData.fuente && conversionData.fuente.trim()) {
      payload.fuente = conversionData.fuente.trim()
    }

    if (conversionData.municipio && conversionData.municipio.trim()) {
      payload.municipio = conversionData.municipio.trim()
    }

    return payload
  }

  const handleConfirmConversion = async () => {
    if (!leadToConvert) return

    const errors: Record<string, string> = {}
    if (!conversionData.numero || !conversionData.numero.trim()) {
      errors.numero = 'El número de cliente es obligatorio'
    }

    if (Object.keys(errors).length > 0) {
      setConversionErrors(errors)
      return
    }

    setConversionLoading(true)
    try {
      await onConvert(leadToConvert, buildConversionPayload())
      closeConvertDialog()
    } catch (error) {
      setConversionErrors({
        general: error instanceof Error ? error.message : 'No se pudo convertir el lead',
      })
    } finally {
      setConversionLoading(false)
    }
  }

  const getEstadoBadge = (estado: string) => {
    const estadosConfig: Record<string, { bg: string; text: string; hover: string; label: string }> = {
      'Esperando equipo': { bg: 'bg-amber-100', text: 'text-amber-800', hover: 'hover:bg-amber-200', label: 'Esperando equipo' },
      'No interesado': { bg: 'bg-gray-200', text: 'text-gray-700', hover: 'hover:bg-gray-300', label: 'No interesado' },
      'Pendiente de instalación': { bg: 'bg-green-100', text: 'text-green-800', hover: 'hover:bg-green-200', label: 'Pendiente de instalación' },
      'Pendiente de presupuesto': { bg: 'bg-purple-100', text: 'text-purple-800', hover: 'hover:bg-purple-200', label: 'Pendiente de presupuesto' },
      'Pendiente de visita': { bg: 'bg-blue-100', text: 'text-blue-800', hover: 'hover:bg-blue-200', label: 'Pendiente de visita' },
      'Pendiente de visitarnos': { bg: 'bg-pink-100', text: 'text-pink-800', hover: 'hover:bg-pink-200', label: 'Pendiente de visitarnos' },
      'Proximamente': { bg: 'bg-cyan-100', text: 'text-cyan-800', hover: 'hover:bg-cyan-200', label: 'Próximamente' },
      'Revisando ofertas': { bg: 'bg-indigo-100', text: 'text-indigo-800', hover: 'hover:bg-indigo-200', label: 'Revisando ofertas' },
      'Sin respuesta': { bg: 'bg-red-100', text: 'text-red-800', hover: 'hover:bg-red-200', label: 'Sin respuesta' },
    }
    
    const config = estadosConfig[estado] || { bg: 'bg-gray-100', text: 'text-gray-800', hover: 'hover:bg-gray-200', label: estado }
    return { className: `${config.bg} ${config.text} ${config.hover}`, label: config.label }
  }

  const formatDate = (dateString: string) => {
    // Si ya está en formato DD/MM/YYYY, devolverlo tal como está
    if (dateString && dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dateString
    }

    // Si está en formato ISO (YYYY-MM-DD), convertir a DD/MM/YYYY
    const date = new Date(dateString)
    if (!isNaN(date.getTime())) {
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    }

    return dateString
  }

  if (loading && leads.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando leads...</p>
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-24 w-24 text-gray-400">
          <Phone className="h-24 w-24" />
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay leads</h3>
        <p className="mt-1 text-sm text-gray-500">Comienza creando tu primer lead.</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-hidden border border-gray-200 rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] max-w-[140px]">
                  Lead
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Contacto
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] max-w-[140px]">
                  Estado
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[220px]">
                  Oferta
                </th>
                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] w-[120px]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-2 py-3 min-w-[100px] max-w-[140px]">
                    <div>
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {lead.nombre}
                      </div>
                      <div className="text-xs text-gray-500 break-words whitespace-pre-line">
                        {breakTextAtLength(lead.direccion || 'Sin dirección', 20)}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap min-w-[100px] max-w-[130px]">
                    <div className="text-xs text-gray-900 truncate">
                      {lead.telefono}
                    </div>
                    {lead.telefono_adicional && (
                      <div className="text-xs text-gray-500 flex items-center mt-1">
                        <PhoneForwarded className="h-3 w-3 mr-1 text-gray-400" />
                        <span className="truncate">{lead.telefono_adicional}</span>
                      </div>
                    )}
                    {lead.pais_contacto && (
                      <div className="text-xs text-gray-500 flex items-center mt-1">
                        <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                        <span className="truncate">{lead.pais_contacto}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-3 min-w-[120px] max-w-[140px]">
                    <div className="w-full">
                      {(() => {
                        const estadoBadge = getEstadoBadge(lead.estado)
                        return (
                          <Badge className={`${estadoBadge.className} text-xs whitespace-normal break-words leading-tight inline-block px-3 py-1.5`}>
                            {estadoBadge.label}
                          </Badge>
                        )
                      })()}
                      {lead.comercial && (
                        <div className="text-xs text-gray-500 flex items-center mt-1">
                          <UserCheck className="h-3 w-3 mr-1 text-gray-400" />
                          <span className="truncate">{lead.comercial}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3 min-w-[220px] max-w-[280px]">
                    <div className="space-y-1">
                      {lead.ofertas && lead.ofertas.length > 0 ? (
                        lead.ofertas.map((oferta, idx) => (
                          <div key={idx} className="text-xs space-y-0.5">
                            {oferta.inversor_codigo && oferta.inversor_cantidad > 0 && (
                              <div>
                                <span className="text-gray-700">Inversor:</span>{' '}
                                <span className="text-gray-900 font-medium">
                                  {oferta.inversor_nombre || oferta.inversor_codigo}
                                </span>
                                <span className="text-gray-500 ml-1">({oferta.inversor_cantidad})</span>
                              </div>
                            )}
                            {oferta.bateria_codigo && oferta.bateria_cantidad > 0 && (
                              <div>
                                <span className="text-gray-700">Batería:</span>{' '}
                                <span className="text-gray-900 font-medium">
                                  {oferta.bateria_nombre || oferta.bateria_codigo}
                                </span>
                                <span className="text-gray-500 ml-1">({oferta.bateria_cantidad})</span>
                              </div>
                            )}
                            {oferta.panel_codigo && oferta.panel_cantidad > 0 && (
                              <div>
                                <span className="text-gray-700">Paneles:</span>{' '}
                                <span className="text-gray-900 font-medium">
                                  {oferta.panel_nombre || oferta.panel_codigo}
                                </span>
                                <span className="text-gray-500 ml-1">({oferta.panel_cantidad})</span>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-gray-400">Sin ofertas</div>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-right text-sm font-medium min-w-[120px] w-[120px]">
                    <div className="flex items-center justify-end space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openConvertDialog(lead)}
                        className="text-emerald-600 hover:text-emerald-800 h-7 w-7 p-0"
                        title="Convertir a cliente"
                        disabled={disableActions || loading}
                      >
                        <UserPlus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDetailDialog(lead)}
                        className="text-blue-600 hover:text-blue-800 h-7 w-7 p-0"
                        title="Ver detalles"
                        disabled={disableActions}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(lead)}
                        className="text-orange-600 hover:text-orange-800 h-7 w-7 p-0"
                        title="Editar"
                        disabled={disableActions}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(lead)}
                        className="text-red-600 hover:text-red-800 h-7 w-7 p-0"
                        title="Eliminar"
                        disabled={disableActions}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Información del Lead
            </DialogTitle>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-6 pt-4">
              {/* Sección 1: Datos Personales */}
              <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
                <div className="pb-4 mb-4 border-b-2 border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900">Datos Personales</h3>
                  <p className="text-sm text-gray-500 mt-1">Información básica del contacto</p>
                </div>
                <div className="space-y-4">
                  {/* Fila 1: Nombre y Referencia */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700">Nombre</Label>
                      <p className="text-gray-900 font-medium mt-1">{selectedLead.nombre}</p>
                    </div>
                    {selectedLead.referencia && (
                      <div>
                        <Label className="text-gray-700">Referencia</Label>
                        <p className="text-gray-900 mt-1">{selectedLead.referencia}</p>
                      </div>
                    )}
                  </div>

                  {/* Fila 2: Teléfono y Teléfono Adicional */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700">Teléfono</Label>
                      <p className="text-gray-900 font-medium flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-gray-400" />
                        {selectedLead.telefono}
                      </p>
                    </div>
                    {selectedLead.telefono_adicional && (
                      <div>
                        <Label className="text-gray-700">Teléfono Adicional</Label>
                        <p className="text-gray-900 flex items-center gap-2 mt-1">
                          <PhoneForwarded className="h-4 w-4 text-gray-400" />
                          {selectedLead.telefono_adicional}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Fila 3: Estado, Fuente y Fecha */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-gray-700">Estado</Label>
                      <div className="mt-1">
                        {(() => {
                          const estadoBadge = getEstadoBadge(selectedLead.estado)
                          return (
                            <Badge className={`${estadoBadge.className} text-sm px-3 py-1`}>
                              {estadoBadge.label}
                            </Badge>
                          )
                        })()}
                      </div>
                    </div>
                    {selectedLead.fuente && (
                      <div>
                        <Label className="text-gray-700">Fuente</Label>
                        <p className="text-gray-900 mt-1">{selectedLead.fuente}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-gray-700">Fecha de Contacto</Label>
                      <p className="text-gray-900 flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(selectedLead.fecha_contacto)}
                      </p>
                    </div>
                  </div>

                  {/* Fila 4: Dirección (ancho completo) */}
                  {selectedLead.direccion && (
                    <div>
                      <Label className="text-gray-700">Dirección</Label>
                      <p className="text-gray-900 flex items-start gap-2 mt-1">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        {selectedLead.direccion}
                      </p>
                    </div>
                  )}

                  {/* Fila 5: Provincia, Municipio y País */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedLead.provincia_montaje && (
                      <div>
                        <Label className="text-gray-700">Provincia</Label>
                        <p className="text-gray-900 mt-1">{selectedLead.provincia_montaje}</p>
                      </div>
                    )}
                    {selectedLead.municipio && (
                      <div>
                        <Label className="text-gray-700">Municipio</Label>
                        <p className="text-gray-900 mt-1">{selectedLead.municipio}</p>
                      </div>
                    )}
                    {selectedLead.pais_contacto && (
                      <div>
                        <Label className="text-gray-700">País de Contacto</Label>
                        <p className="text-gray-900 mt-1">{selectedLead.pais_contacto}</p>
                      </div>
                    )}
                  </div>

                  {/* Fila 6: Comercial */}
                  {selectedLead.comercial && (
                    <div>
                      <Label className="text-gray-700">Comercial Asignado</Label>
                      <p className="text-gray-900 flex items-center gap-2 mt-1">
                        <UserCheck className="h-4 w-4 text-gray-400" />
                        {selectedLead.comercial}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sección 2: Oferta */}
              {selectedLead.ofertas && selectedLead.ofertas.length > 0 && (
                <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
                  <div className="pb-4 mb-4 border-b-2 border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900">Oferta</h3>
                    <p className="text-sm text-gray-500 mt-1">Detalles de productos y cantidades</p>
                  </div>
                  <div className="space-y-4">
                    {selectedLead.ofertas.map((oferta, idx) => (
                      <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                        {/* Productos en Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Inversor */}
                          {oferta.inversor_codigo && oferta.inversor_cantidad > 0 && (
                            <div>
                              <Label className="text-gray-700">Inversor</Label>
                              <p className="text-gray-900 font-medium mt-1">
                                {oferta.inversor_nombre || oferta.inversor_codigo}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">Cantidad: {oferta.inversor_cantidad}</p>
                            </div>
                          )}

                          {/* Batería */}
                          {oferta.bateria_codigo && oferta.bateria_cantidad > 0 && (
                            <div>
                              <Label className="text-gray-700">Batería</Label>
                              <p className="text-gray-900 font-medium mt-1">
                                {oferta.bateria_nombre || oferta.bateria_codigo}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">Cantidad: {oferta.bateria_cantidad}</p>
                            </div>
                          )}

                          {/* Paneles */}
                          {oferta.panel_codigo && oferta.panel_cantidad > 0 && (
                            <div>
                              <Label className="text-gray-700">Paneles</Label>
                              <p className="text-gray-900 font-medium mt-1">
                                {oferta.panel_nombre || oferta.panel_codigo}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">Cantidad: {oferta.panel_cantidad}</p>
                            </div>
                          )}
                        </div>

                        {/* Estado de la Oferta */}
                        {(oferta.aprobada || oferta.pagada) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {oferta.aprobada && (
                              <div className="flex items-center space-x-2 p-3 border rounded-md bg-white">
                                <input
                                  type="checkbox"
                                  checked={true}
                                  disabled
                                  className="h-5 w-5 rounded border-gray-300 text-green-600"
                                />
                                <Label className="font-medium">Oferta Aprobada</Label>
                              </div>
                            )}
                            {oferta.pagada && (
                              <div className="flex items-center space-x-2 p-3 border rounded-md bg-white">
                                <input
                                  type="checkbox"
                                  checked={true}
                                  disabled
                                  className="h-5 w-5 rounded border-gray-300 text-blue-600"
                                />
                                <Label className="font-medium">Oferta Pagada</Label>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Elementos Personalizados */}
                        {oferta.elementos_personalizados && (
                          <div className="mt-4">
                            <Label className="text-gray-700">Elementos Personalizados (Comentario)</Label>
                            <p className="text-sm text-gray-700 bg-white p-3 rounded-md border mt-1">
                              {oferta.elementos_personalizados}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sección 3: Costos y Pago */}
              {selectedLead.ofertas && selectedLead.ofertas.length > 0 && (
                <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
                  <div className="pb-4 mb-4 border-b-2 border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900">Costos y Pago</h3>
                    <p className="text-sm text-gray-500 mt-1">Información financiera de la oferta</p>
                  </div>
                  <div className="space-y-4">
                    {selectedLead.ofertas.map((oferta, idx) => (
                      <div key={`costos-${idx}`}>
                        {/* Costos - Primera fila */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-gray-700">Costo de Oferta</Label>
                            <p className="text-gray-900 font-semibold mt-1">
                              ${oferta.costo_oferta.toFixed(2)}
                            </p>
                          </div>
                          {oferta.costo_extra > 0 && (
                            <div>
                              <Label className="text-gray-700">Costo Extra</Label>
                              <p className="text-gray-900 font-semibold mt-1">
                                ${oferta.costo_extra.toFixed(2)}
                              </p>
                            </div>
                          )}
                          {oferta.costo_transporte > 0 && (
                            <div>
                              <Label className="text-gray-700">Costo de Transporte</Label>
                              <p className="text-gray-900 font-semibold mt-1">
                                ${oferta.costo_transporte.toFixed(2)}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Costo Final */}
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                          <Label className="text-gray-700">Costo Final</Label>
                          <p className="text-2xl font-bold text-gray-900 mt-1">
                            ${(oferta.costo_oferta + oferta.costo_extra + oferta.costo_transporte).toFixed(2)}
                          </p>
                        </div>

                        {/* Razón del Costo Extra */}
                        {oferta.razon_costo_extra && (
                          <div className="mt-4">
                            <Label className="text-gray-700">Razón del Costo Extra</Label>
                            <p className="text-sm text-gray-700 bg-white p-3 rounded-md border mt-1">
                              {oferta.razon_costo_extra}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Método de Pago y Moneda */}
                    {(selectedLead.metodo_pago || selectedLead.moneda) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        {selectedLead.metodo_pago && (
                          <div>
                            <Label className="text-gray-700">Método de Pago</Label>
                            <p className="text-gray-900 font-medium mt-1">{selectedLead.metodo_pago}</p>
                          </div>
                        )}
                        {selectedLead.moneda && (
                          <div>
                            <Label className="text-gray-700">Moneda</Label>
                            <p className="text-gray-900 font-medium mt-1">{selectedLead.moneda}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Comprobante de Pago */}
                    {selectedLead.comprobante_pago_url && (
                      <div className="pt-4 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleDownloadComprobante(selectedLead)}
                          className="w-full md:w-auto"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Descargar Comprobante
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sección 4: Comentarios (Condicional) */}
              {selectedLead.comentario && (
                <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
                  <div className="pb-4 mb-4 border-b-2 border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900">Comentarios</h3>
                    <p className="text-sm text-gray-500 mt-1">Notas adicionales sobre el lead</p>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words bg-gray-50 p-4 rounded-lg border">
                      {selectedLead.comentario}
                    </p>
                  </div>
                </div>
              )}

              {/* Sección 5: Elementos Personalizados (Condicional) */}
              {selectedLead.elementos_personalizados && selectedLead.elementos_personalizados.length > 0 && (
                <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
                  <div className="pb-4 mb-4 border-b-2 border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <ListChecks className="h-5 w-5" />
                      Elementos Personalizados
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Elementos adicionales del lead</p>
                  </div>
                  <div className="space-y-2">
                    {selectedLead.elementos_personalizados.map((elemento, index) => (
                      <div key={index} className="flex items-center justify-between border rounded-md px-4 py-3 bg-gray-50">
                        <span className="text-sm text-gray-900">{elemento.descripcion}</span>
                        <span className="text-sm font-medium text-gray-600 ml-4">
                          Cant: {elemento.cantidad}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botón Cerrar */}
              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Convert Lead Dialog */}
      <Dialog
        open={isConvertDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeConvertDialog()
          } else {
            setIsConvertDialogOpen(true)
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
          {/* Header fijo */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 pt-6 pb-4">
            <DialogHeader>
              <DialogTitle>Convertir lead a cliente</DialogTitle>
            </DialogHeader>
          </div>

          {/* Contenido scrolleable */}
          {leadToConvert && (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-5">
                <div className="text-xs sm:text-sm text-gray-600">
                  Completa los datos necesarios para crear el cliente a partir del lead{" "}
                  <span className="font-semibold text-gray-900">{leadToConvert.nombre}</span>. Los datos del lead se copiarán automáticamente.
                </div>

                {conversionErrors.general && (
                  <div className="text-xs sm:text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {conversionErrors.general}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="numero_cliente" className="text-xs sm:text-sm">Número de cliente *</Label>
                    <Input
                      id="numero_cliente"
                      placeholder="CLI-2024-001"
                      value={conversionData.numero}
                      onChange={(event) => handleConversionInputChange('numero', event.target.value)}
                      className={conversionErrors.numero ? 'border-red-500' : ''}
                      autoFocus
                    />
                    {conversionErrors.numero && (
                      <p className="text-xs text-red-600 mt-1">{conversionErrors.numero}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="carnet_identidad" className="text-xs sm:text-sm">Carnet de identidad</Label>
                    <Input
                      id="carnet_identidad"
                      placeholder="Documento opcional"
                      value={conversionData.carnet_identidad || ''}
                      onChange={(event) => handleConversionInputChange('carnet_identidad', event.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="fecha_montaje" className="text-xs sm:text-sm">Fecha de inicio de instalación</Label>
                    <Input
                      id="fecha_montaje"
                      type="date"
                      value={conversionData.fecha_montaje || ''}
                      onChange={(event) => handleConversionInputChange('fecha_montaje', event.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="fecha_instalacion" className="text-xs sm:text-sm">Fecha de fin de instalación</Label>
                    <Input
                      id="fecha_instalacion"
                      type="date"
                      value={conversionData.fecha_instalacion || ''}
                      onChange={(event) => handleConversionInputChange('fecha_instalacion', event.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="metodo_pago_conversion" className="text-xs sm:text-sm">Método de pago</Label>
                    <Input
                      id="metodo_pago_conversion"
                      placeholder="Transferencia, efectivo..."
                      value={conversionData.metodo_pago || ''}
                      onChange={(event) => handleConversionInputChange('metodo_pago', event.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="moneda_conversion" className="text-xs sm:text-sm">Moneda</Label>
                    <Input
                      id="moneda_conversion"
                      placeholder="USD, CUP, MLC..."
                      value={conversionData.moneda || ''}
                      onChange={(event) => handleConversionInputChange('moneda', event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          {leadToConvert && (
            <div className="border-t border-gray-200 px-6 py-4 bg-white">
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeConvertDialog}
                  disabled={conversionLoading}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
                  onClick={handleConfirmConversion}
                  disabled={conversionLoading}
                >
                  {conversionLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Convirtiendo...
                    </>
                  ) : (
                    'Convertir a cliente'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ofertas personalizadas asociadas */}
      <Dialog
        open={showOfertasDialog}
        onOpenChange={(open) => {
          setShowOfertasDialog(open)
          if (!open) {
            closeOfertasDialog()
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ofertas personalizadas del lead</DialogTitle>
            <DialogDescription>
              {selectedLeadForOfertas
                ? `${selectedLeadForOfertas.nombre || selectedLeadForOfertas.telefono || selectedLeadForOfertas.id || 'Lead'}`
                : 'Selecciona un lead'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              {ofertasDelLead.length} {ofertasDelLead.length === 1 ? 'oferta' : 'ofertas'} asociadas.
            </div>
            <Button
              onClick={() => setIsCreateOfertaOpen(true)}
              disabled={!selectedLeadForOfertas?.id}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva oferta
            </Button>
          </div>
          <OfertasPersonalizadasTable
            ofertas={ofertasDelLead}
            onEdit={(oferta) => {
              setEditingOferta(oferta)
              setIsEditOfertaOpen(true)
            }}
            onDelete={handleDeleteOfertaLead}
            loading={ofertasLoading || ofertaSubmitting}
          />
        </DialogContent>
      </Dialog>

      <CreateOfertaDialog
        open={isCreateOfertaOpen}
        onOpenChange={setIsCreateOfertaOpen}
        onSubmit={handleCreateOfertaLead}
        isLoading={ofertaSubmitting}
        defaultContactType="lead"
        defaultLeadId={selectedLeadForOfertas?.id || ''}
        lockContactType="lead"
        lockLeadId={selectedLeadForOfertas?.id || ''}
      />

      <EditOfertaDialog
        open={isEditOfertaOpen}
        onOpenChange={(open) => {
          setIsEditOfertaOpen(open)
          if (!open) setEditingOferta(null)
        }}
        oferta={editingOferta}
        onSubmit={handleUpdateOfertaLead}
        isLoading={ofertaSubmitting}
        lockContactType="lead"
        lockLeadId={selectedLeadForOfertas?.id || ''}
      />

      <UploadComprobanteDialog
        open={isComprobanteDialogOpen}
        onOpenChange={handleComprobanteDialogOpenChange}
        entityLabel={leadForComprobante?.nombre || leadForComprobante?.telefono || leadForComprobante?.id || 'lead'}
        defaultMetodoPago={leadForComprobante?.metodo_pago}
        defaultMoneda={leadForComprobante?.moneda}
        onSubmit={handleComprobanteSubmit}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Eliminar Lead"
        message={`¿Estás seguro de que quieres eliminar el lead de ${leadToDelete?.nombre}? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteConfirm}
        confirmText="Eliminar Lead"
      />
    </>
  )
}
