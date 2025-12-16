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
  UploadCloud,
  Download,
  CreditCard,
  ChevronRight,
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
  const [showMapModalConversion, setShowMapModalConversion] = useState(false)
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

  const openComprobanteDialog = (lead: Lead) => {
    setLeadForComprobante(lead)
    setIsComprobanteDialogOpen(true)
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

  const openOfertasLead = (lead: Lead) => {
    setSelectedLeadForOfertas(lead)
    setShowOfertasDialog(true)
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
    const colors: Record<string, string> = {
      nuevo: 'bg-blue-100 text-blue-800',
      contactado: 'bg-yellow-100 text-yellow-800',
      calificado: 'bg-purple-100 text-purple-800',
      propuesta: 'bg-orange-100 text-orange-800',
      negociacion: 'bg-pink-100 text-pink-800',
      cerrado_ganado: 'bg-green-100 text-green-800',
      cerrado_perdido: 'bg-red-100 text-red-800',
      descartado: 'bg-gray-100 text-gray-800'
    }
    return colors[estado] || 'bg-gray-100 text-gray-800'
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

  const formatCurrency = (value?: number, currency = 'USD') => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return null
    }
    try {
      return value.toLocaleString(undefined, { style: 'currency', currency })
    } catch {
      return `${value} ${currency}`
    }
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
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[160px]">
                  Lead
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[130px]">
                  Contacto
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Estado
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[110px]">
                  Fuente
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Fecha
                </th>
                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px] w-[200px]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-2 py-3 min-w-[160px] max-w-[200px]">
                    <div>
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {lead.nombre}
                      </div>
                      <div className="text-xs text-gray-500 break-words whitespace-pre-line">
                        {breakTextAtLength(lead.direccion || 'Sin dirección', 25)}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap min-w-[130px]">
                    <div className="text-sm text-gray-900 truncate">
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
                  <td className="px-2 py-3 whitespace-nowrap min-w-[100px]">
                    <div className="w-full">
                      <Badge className={`${getEstadoBadge(lead.estado)} text-xs truncate max-w-[90px] inline-block`}>
                        {lead.estado}
                      </Badge>
                      {lead.comercial && (
                        <div className="text-xs text-gray-500 flex items-center mt-1">
                          <UserCheck className="h-3 w-3 mr-1 text-gray-400" />
                          <span className="truncate">{lead.comercial}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap min-w-[110px]">
                    <div className="text-sm text-gray-900 truncate">
                      {lead.fuente || 'No especificada'}
                    </div>
                    {lead.referencia && (
                      <div className="text-xs text-gray-500 truncate">
                        Ref: {lead.referencia}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap min-w-[100px]">
                    <div className="text-sm text-gray-900 flex items-center">
                      <Calendar className="h-3 w-3 mr-1 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{formatDate(lead.fecha_contacto)}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-right text-sm font-medium min-w-[200px] w-[200px]">
                    <div className="flex items-center justify-end space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openComprobanteDialog(lead)}
                        className="text-emerald-600 hover:text-emerald-800 h-7 w-7 p-0"
                        title="Agregar comprobante"
                        disabled={disableActions || loading || !lead.id}
                      >
                        <UploadCloud className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDownloadComprobante(lead)}
                        className="text-sky-600 hover:text-sky-800 h-7 w-7 p-0"
                        title={lead.comprobante_pago_url ? "Descargar comprobante" : "Sin comprobante registrado"}
                        disabled={disableActions || !lead.comprobante_pago_url}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
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
                        onClick={() => openOfertasLead(lead)}
                        className="text-amber-600 hover:text-amber-800 h-7 w-7 p-0"
                        title="Ofertas personalizadas"
                        disabled={disableActions || !lead.id}
                      >
                        <ListChecks className="h-3 w-3" />
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Detalles del Lead</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4 sm:space-y-6 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Información Personal</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <UserCheck className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                      <span className="text-sm break-words">{selectedLead.nombre}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                      <span className="text-sm break-words">{selectedLead.telefono}</span>
                    </div>
                    {selectedLead.telefono_adicional && (
                      <div className="flex items-center">
                        <PhoneForwarded className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                        <span className="text-sm break-words">{selectedLead.telefono_adicional}</span>
                      </div>
                    )}
                    {selectedLead.direccion && (
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm break-words">{selectedLead.direccion}</span>
                      </div>
                    )}
                    {selectedLead.pais_contacto && (
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                        <span className="text-sm break-words">{selectedLead.pais_contacto}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Estado y Seguimiento</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                      <span className="text-sm break-words">Contacto: {formatDate(selectedLead.fecha_contacto)}</span>
                    </div>
                    <div className="flex items-center">
                      <Badge className={getEstadoBadge(selectedLead.estado)}>
                        {selectedLead.estado}
                      </Badge>
                    </div>
                    {selectedLead.comercial && (
                      <div className="text-sm text-gray-700 flex items-center">
                        <UserCheck className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                        <span className="break-words">Comercial: {selectedLead.comercial}</span>
                      </div>
                    )}
                    {selectedLead.fuente && (
                      <div className="text-sm break-words">
                        <span className="text-gray-500">Fuente:</span> {selectedLead.fuente}
                      </div>
                    )}
                    {selectedLead.referencia && (
                      <div className="text-sm break-words">
                        <span className="text-gray-500">Referencia:</span> {selectedLead.referencia}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(selectedLead.metodo_pago || selectedLead.moneda || selectedLead.comprobante_pago_url) && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <CreditCard className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-medium text-gray-500">Detalle de pago</p>
                      {selectedLead.metodo_pago && (
                        <p className="text-sm text-gray-700">
                          Método: <span className="font-semibold text-gray-900">{selectedLead.metodo_pago}</span>
                        </p>
                      )}
                      {selectedLead.moneda && (
                        <p className="text-sm text-gray-700">
                          Moneda: <span className="font-semibold text-gray-900">{selectedLead.moneda}</span>
                        </p>
                      )}
                      <div>
                        {selectedLead.comprobante_pago_url ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => void handleDownloadComprobante(selectedLead)}
                          >
                            <Download className="h-4 w-4" />
                            Descargar comprobante
                          </Button>
                        ) : (
                          <p className="text-xs text-gray-500">Aún no se ha subido un comprobante.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedLead.comentario && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Comentario</h3>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md break-words whitespace-pre-wrap">
                    {selectedLead.comentario}
                  </p>
                </div>
              )}

              {selectedLead.provincia_montaje && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Provincia de Montaje</h3>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                    <span className="text-sm break-words">{selectedLead.provincia_montaje}</span>
                  </div>
                </div>
              )}

              {selectedLead.elementos_personalizados && selectedLead.elementos_personalizados.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-green-600 flex-shrink-0" />
                    Elementos personalizados
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {selectedLead.elementos_personalizados.map((elemento, index) => (
                      <div key={`elemento-${selectedLead.id}-${index}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-gray-200 rounded-md px-3 py-2 bg-white">
                        <span className="text-sm text-gray-700 break-words">{elemento.descripcion}</span>
                        <Badge variant="outline" className="text-xs bg-gray-50 w-fit">
                          {elemento.cantidad}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

                  <div>
                    <Label htmlFor="fecha_montaje" className="text-xs sm:text-sm">Fecha de montaje</Label>
                    <Input
                      id="fecha_montaje"
                      type="date"
                      value={conversionData.fecha_montaje || ''}
                      onChange={(event) => handleConversionInputChange('fecha_montaje', event.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="fecha_instalacion" className="text-xs sm:text-sm">Fecha de instalación</Label>
                    <Input
                      id="fecha_instalacion"
                      type="datetime-local"
                      value={conversionData.fecha_instalacion || ''}
                      onChange={(event) => handleConversionInputChange('fecha_instalacion', event.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm">Ubicación (usar mapa para precisión)</Label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={conversionData.latitud ? String(conversionData.latitud) : ''}
                          placeholder="Latitud"
                          readOnly
                          className="flex-1"
                        />
                        <Input
                          value={conversionData.longitud ? String(conversionData.longitud) : ''}
                          placeholder="Longitud"
                          readOnly
                          className="flex-1"
                        />
                      </div>
                      <Button
                        type="button"
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => setShowMapModalConversion(true)}
                      >
                        <MapPin className="h-4 w-4 mr-2" /> Seleccionar en mapa
                      </Button>
                    </div>
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

      {/* Modal de mapa para convertir lead a cliente */}
      <Dialog open={showMapModalConversion} onOpenChange={setShowMapModalConversion}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Seleccionar ubicación en el mapa</DialogTitle>
          </DialogHeader>
          <div className="mb-4 text-gray-700">Haz click en el mapa para seleccionar la ubicación. Solo se guardarán latitud y longitud.</div>
          <MapPicker
            initialLat={conversionData.latitud ? (typeof conversionData.latitud === 'number' ? conversionData.latitud : parseFloat(String(conversionData.latitud))) : 23.1136}
            initialLng={conversionData.longitud ? (typeof conversionData.longitud === 'number' ? conversionData.longitud : parseFloat(String(conversionData.longitud))) : -82.3666}
            onSelect={(lat: number, lng: number) => {
              setConversionData(prev => ({
                ...prev,
                latitud: String(lat),
                longitud: String(lng),
              }))
            }}
          />
          <div className="flex justify-end pt-4">
            <Button type="button" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setShowMapModalConversion(false)}>
              Confirmar ubicación
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
