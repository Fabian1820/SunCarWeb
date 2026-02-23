"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { PriorityDot } from "@/components/shared/atom/priority-dot"
import { Label } from "@/components/shared/atom/label"
import { Input } from "@/components/shared/molecule/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
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
  FileCheck,
} from "lucide-react"
import { useOfertasPersonalizadas } from "@/hooks/use-ofertas-personalizadas"
import { useOfertasConfeccion } from "@/hooks/use-ofertas-confeccion"
import { useMaterials } from "@/hooks/use-materials"
import { useMarcas } from "@/hooks/use-marcas"
import {
  buildTerminosCondicionesHtml,
  type TerminosCondicionesPayload,
} from "@/lib/utils/terminos-condiciones-export"
import { OfertasPersonalizadasTable } from "@/components/feats/ofertas-personalizadas/ofertas-personalizadas-table"
import { CreateOfertaDialog } from "@/components/feats/ofertas-personalizadas/create-oferta-dialog"
import { EditOfertaDialog } from "@/components/feats/ofertas-personalizadas/edit-oferta-dialog"
import { AsignarOfertaGenericaDialog } from "@/components/feats/ofertas/asignar-oferta-generica-dialog"
import { VerOfertaClienteDialog } from "@/components/feats/ofertas/ver-oferta-cliente-dialog"
import { DuplicarOfertaDialog } from "@/components/feats/ofertas/duplicar-oferta-dialog"
import { EditarOfertaDialog } from "@/components/feats/ofertas/editar-oferta-dialog"
import { ExportSelectionDialog } from "@/components/feats/ofertas/export-selection-dialog"
import { ConfeccionOfertasView } from "@/components/feats/ofertas/confeccion-ofertas-view"
import { Card, CardContent } from "@/components/shared/molecule/card"
import type {
  OfertaPersonalizada,
  OfertaPersonalizadaCreateRequest,
  OfertaPersonalizadaUpdateRequest,
} from "@/lib/types/feats/ofertas-personalizadas/oferta-personalizada-types"
import type { OfertaConfeccion } from "@/hooks/use-ofertas-confeccion"
import { useToast } from "@/hooks/use-toast"
import type { Lead, LeadConversionRequest } from "@/lib/api-types"

interface LeadsTableProps {
  leads: Lead[]
  onEdit: (lead: Lead) => void
  onDelete: (id: string) => void
  onConvert: (lead: Lead, data: LeadConversionRequest) => Promise<void>
  onGenerarCodigo: (leadId: string, equipoPropio?: boolean) => Promise<string>
  onUploadComprobante: (
    lead: Lead,
    payload: { file: File; metodo_pago?: string; moneda?: string }
  ) => Promise<void>
  onDownloadComprobante?: (lead: Lead) => Promise<void>
  onUpdatePrioridad?: (leadId: string, prioridad: "Alta" | "Media" | "Baja") => Promise<void>
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
  onGenerarCodigo,
  onUploadComprobante,
  onDownloadComprobante,
  onUpdatePrioridad,
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
  const {
    fetchOfertasGenericasAprobadas,
    asignarOfertaALead,
    obtenerIdsLeadsConOfertas,
    obtenerOfertaPorLead,
    eliminarOferta,
    refetch: refetchOfertas,
  } = useOfertasConfeccion()
  const { materials, loading: loadingMaterials } = useMaterials()
  const { marcas, loading: loadingMarcas } = useMarcas()
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
  
  // Estados para asignar ofertas genéricas
  const [showOfertaFlowDialog, setShowOfertaFlowDialog] = useState(false)
  const [showAsignarOfertaDialog, setShowAsignarOfertaDialog] = useState(false)
  const [leadForAsignarOferta, setLeadForAsignarOferta] = useState<Lead | null>(null)
  const [tipoOfertaSeleccionada, setTipoOfertaSeleccionada] = useState<"generica" | "personalizada" | "">("")
  const [accionPersonalizadaSeleccionada, setAccionPersonalizadaSeleccionada] = useState<"nueva" | "duplicar" | "">("")
  const [showCrearOfertaPersonalizadaDialog, setShowCrearOfertaPersonalizadaDialog] = useState(false)
  const [showDuplicarOfertaPersonalizadaDialog, setShowDuplicarOfertaPersonalizadaDialog] = useState(false)
  const [ofertasGenericasAprobadas, setOfertasGenericasAprobadas] = useState<OfertaConfeccion[]>([])
  const [loadingOfertasGenericasAprobadas, setLoadingOfertasGenericasAprobadas] = useState(false)
  const [ofertasGenericasAprobadasCargadas, setOfertasGenericasAprobadasCargadas] = useState(false)
  const [ofertaGenericaParaDuplicarId, setOfertaGenericaParaDuplicarId] = useState("")
  const [showVerOfertaDialog, setShowVerOfertaDialog] = useState(false)
  const [showDetalleOfertaDialog, setShowDetalleOfertaDialog] = useState(false)
  const [ofertaLeadActual, setOfertaLeadActual] = useState<OfertaConfeccion | null>(null)
  const [ofertasLeadActuales, setOfertasLeadActuales] = useState<OfertaConfeccion[]>([])
  const [leadsConOferta, setLeadsConOferta] = useState<Set<string>>(new Set())
  const [cargaSetOfertasTerminada, setCargaSetOfertasTerminada] = useState(false)
  const [consultandoOfertaLead, setConsultandoOfertaLead] = useState<string | null>(null)
  
  // Estados para editar/eliminar/exportar ofertas
  const [mostrarDialogoEditar, setMostrarDialogoEditar] = useState(false)
  const [ofertaParaEditar, setOfertaParaEditar] = useState<OfertaConfeccion | null>(null)
  const [mostrarDialogoEliminar, setMostrarDialogoEliminar] = useState(false)
  const [ofertaParaEliminar, setOfertaParaEliminar] = useState<OfertaConfeccion | null>(null)
  const [eliminandoOferta, setEliminandoOferta] = useState(false)
  const [mostrarDialogoExportar, setMostrarDialogoExportar] = useState(false)
  const [ofertaParaExportar, setOfertaParaExportar] = useState<OfertaConfeccion | null>(null)
  const [terminosCondiciones, setTerminosCondiciones] = useState<string | null>(null)

  const ofertasDelLead = useMemo(() => {
    if (!selectedLeadForOfertas) return []
    const leadIdentifiers = [selectedLeadForOfertas.id, selectedLeadForOfertas.telefono].filter(Boolean) as string[]
    return ofertas.filter((o) => o.lead_id && leadIdentifiers.includes(o.lead_id))
  }, [ofertas, selectedLeadForOfertas])

  const ofertaGenericaParaDuplicar = useMemo(
    () => ofertasGenericasAprobadas.find((oferta) => oferta.id === ofertaGenericaParaDuplicarId) ?? null,
    [ofertasGenericasAprobadas, ofertaGenericaParaDuplicarId]
  )

  // Cargar leads con ofertas al montar el componente
  const cargarLeadsConOfertas = useCallback(async (options?: { skipCache?: boolean; silent?: boolean }) => {
    if (!options?.silent) {
      setCargaSetOfertasTerminada(false)
    }
    try {
      const result = await obtenerIdsLeadsConOfertas({ skipCache: options?.skipCache })
      
      if (result.success) {
        const idsConOferta = new Set(result.ids_leads.filter(Boolean))
        
        console.log('✅ Leads con oferta cargados:', idsConOferta.size)
        
        setLeadsConOferta(idsConOferta)
        
        return true
      } else {
        console.warn('⚠️ No se pudo cargar endpoint de leads con ofertas')
        return false
      }
    } catch (error) {
      console.error('❌ Error cargando leads con ofertas:', error)
      return false
    } finally {
      if (!options?.silent) {
        setCargaSetOfertasTerminada(true)
      }
    }
  }, [obtenerIdsLeadsConOfertas])

  // Cargar set de leads con ofertas al montar el componente
  useEffect(() => {
    let activo = true
    const reintentosMs = [0, 500, 1500, 3000]

    const intentarCarga = async () => {
      for (const delay of reintentosMs) {
        if (!activo) return
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay))
          if (!activo) return
        }

        try {
          console.log('🔄 Cargando leads con ofertas desde servidor')
          const ok = await cargarLeadsConOfertas({ skipCache: true })
          if (ok) {
            console.log('✅ Leads con ofertas cargados exitosamente desde servidor')
            return
          }
        } catch (error) {
          console.error('Error cargando leads con ofertas:', error)
          if (activo) setCargaSetOfertasTerminada(true)
        }
      }
    }

    intentarCarga().catch((error) => {
      console.error('Error en reintentos de leads con ofertas:', error)
      if (activo) setCargaSetOfertasTerminada(true)
    })

    return () => {
      activo = false
    }
  }, [cargarLeadsConOfertas])

  const loadOfertasGenericasAprobadasParaDuplicar = useCallback(async () => {
    setLoadingOfertasGenericasAprobadas(true)
    try {
      const ofertas = await fetchOfertasGenericasAprobadas()
      setOfertasGenericasAprobadas(ofertas)
    } catch (error) {
      console.error("Error cargando ofertas genéricas aprobadas para duplicar:", error)
      setOfertasGenericasAprobadas([])
    } finally {
      setLoadingOfertasGenericasAprobadas(false)
      setOfertasGenericasAprobadasCargadas(true)
    }
  }, [fetchOfertasGenericasAprobadas])

  // Cargar términos y condiciones al montar el componente
  useEffect(() => {
    const cargarTerminos = async () => {
      try {
        const { apiRequest } = await import('@/lib/api-config')
        const result = await apiRequest<{
          success: boolean
          data?: TerminosCondicionesPayload
        }>('/terminos-condiciones/activo', {
          method: 'GET'
        })
        
        const terminosHtml = buildTerminosCondicionesHtml(result.data)
        
        if (result.success && terminosHtml) {
          console.log('✅ Términos y condiciones cargados:', `${terminosHtml.length} caracteres`)
          setTerminosCondiciones(terminosHtml)
        } else {
          console.warn('⚠️ No se encontraron términos y condiciones activos')
          setTerminosCondiciones(null)
        }
      } catch (error) {
        console.error('❌ Error cargando términos y condiciones:', error)
        setTerminosCondiciones(null)
      }
    }
    cargarTerminos()
  }, [])

  useEffect(() => {
    if (!showOfertaFlowDialog) return
    if (tipoOfertaSeleccionada !== "personalizada") return
    if (accionPersonalizadaSeleccionada !== "duplicar") return
    if (ofertasGenericasAprobadasCargadas || loadingOfertasGenericasAprobadas) return

    loadOfertasGenericasAprobadasParaDuplicar().catch((error) => {
      console.error("Error precargando ofertas genéricas aprobadas:", error)
    })
  }, [
    showOfertaFlowDialog,
    tipoOfertaSeleccionada,
    accionPersonalizadaSeleccionada,
    ofertasGenericasAprobadasCargadas,
    loadingOfertasGenericasAprobadas,
    loadOfertasGenericasAprobadasParaDuplicar,
  ])

  const openAsignarOfertaDialog = async (lead: Lead) => {
    try {
      console.log('Click en boton de oferta para lead:', lead.id)
      const leadId = lead.id
      if (!leadId) {
        toast({
          title: "Error",
          description: "El lead no tiene ID válido.",
          variant: "destructive",
        })
        return
      }

      if (!cargaSetOfertasTerminada) {
        toast({
          title: "Cargando ofertas",
          description: "Espera un momento mientras se verifica el estado de ofertas.",
        })
        return
      }

      // Verificar con el servidor
      console.log('🔍 Verificando oferta en servidor para lead:', leadId)
      const result = await obtenerOfertaPorLead(leadId)
      console.log('📡 Resultado de verificacion:', result)

      if (result.success && result.oferta) {
        // Lead tiene oferta - actualizar set local si no estaba
        if (!leadsConOferta.has(leadId)) {
          console.log('✅ Lead tiene oferta pero no estaba en el set - agregando')
          setLeadsConOferta((prev) => {
            const next = new Set(prev)
            next.add(leadId)
            return next
          })
        }
        
        const ofertas = result.ofertas?.length ? result.ofertas : [result.oferta]
        setOfertasLeadActuales(ofertas)
        setOfertaLeadActual(result.oferta)
        
        // Si solo tiene UNA oferta, abrir directamente el diálogo de detalles
        if (ofertas.length === 1) {
          setShowDetalleOfertaDialog(true)
        } else {
          // Si tiene MÚLTIPLES ofertas, mostrar el listado primero
          setLeadForAsignarOferta(lead)
          setShowVerOfertaDialog(true)
        }
        return
      }

      // Lead NO tiene oferta
      if (leadsConOferta.has(leadId)) {
        // Estaba en el set pero ya no tiene oferta - remover
        console.log('⚠️ Lead estaba en el set pero ya no tiene oferta - removiendo')
        setLeadsConOferta((prev) => {
          const next = new Set(prev)
          next.delete(leadId)
          return next
        })
      }

      if (result.error) {
        toast({
          title: "Error al verificar oferta",
          description: "No se pudo comprobar la oferta del lead. Intenta nuevamente.",
          variant: "destructive",
        })
        return
      }

      // Mostrar flujo guiado para asignar oferta
      setLeadForAsignarOferta(lead)
      setShowOfertaFlowDialog(true)
    } catch (error) {
      console.error('Error en openAsignarOfertaDialog:', error)
      toast({
        title: "Error",
        description: "No se pudo procesar la oferta de este lead.",
        variant: "destructive",
      })
    }
  }

  const closeOfertaFlowDialog = () => {
    setShowOfertaFlowDialog(false)
    setTipoOfertaSeleccionada("")
    setAccionPersonalizadaSeleccionada("")
    setOfertasGenericasAprobadas([])
    setOfertaGenericaParaDuplicarId("")
    setOfertasGenericasAprobadasCargadas(false)
    setLoadingOfertasGenericasAprobadas(false)
    setLeadForAsignarOferta(null)
  }

  const handleContinuarOfertaFlow = async () => {
    if (!leadForAsignarOferta) return

    if (!tipoOfertaSeleccionada) {
      toast({
        title: "Selecciona el tipo de oferta",
        description: "Debes elegir si será genérica o personalizada.",
        variant: "destructive",
      })
      return
    }

    if (tipoOfertaSeleccionada === "generica") {
      setShowOfertaFlowDialog(false)
      setTipoOfertaSeleccionada("")
      setAccionPersonalizadaSeleccionada("")
      setOfertasGenericasAprobadas([])
      setOfertaGenericaParaDuplicarId("")
      setOfertasGenericasAprobadasCargadas(false)
      setShowAsignarOfertaDialog(true)
      return
    }

    if (!accionPersonalizadaSeleccionada) {
      toast({
        title: "Selecciona una acción",
        description: "Indica si deseas crear una nueva o duplicar y editar una existente.",
        variant: "destructive",
      })
      return
    }

    if (accionPersonalizadaSeleccionada === "nueva") {
      setShowOfertaFlowDialog(false)
      setTipoOfertaSeleccionada("")
      setAccionPersonalizadaSeleccionada("")
      setOfertasGenericasAprobadas([])
      setOfertaGenericaParaDuplicarId("")
      setOfertasGenericasAprobadasCargadas(false)
      setShowCrearOfertaPersonalizadaDialog(true)
      return
    }

    if (!ofertaGenericaParaDuplicarId) {
      toast({
        title: "Selecciona una oferta genérica",
        description: "Escoge qué oferta aprobada deseas duplicar y editar.",
        variant: "destructive",
      })
      return
    }

    setShowOfertaFlowDialog(false)
    setTipoOfertaSeleccionada("")
    setAccionPersonalizadaSeleccionada("")
    setOfertasGenericasAprobadasCargadas(false)
    setShowDuplicarOfertaPersonalizadaDialog(true)
  }

  const handleOfertaPersonalizadaConfeccionSuccess = async () => {
    setShowCrearOfertaPersonalizadaDialog(false)
    setShowDuplicarOfertaPersonalizadaDialog(false)
    setOfertasGenericasAprobadas([])
    setOfertasGenericasAprobadasCargadas(false)
    setOfertaGenericaParaDuplicarId("")
    setLeadForAsignarOferta(null)

    await cargarLeadsConOfertas({ skipCache: true, silent: true })
  }

  const handleAsignarOferta = async (ofertaGenericaId: string) => {
    if (!leadForAsignarOferta?.id) return

    const result = await asignarOfertaALead(ofertaGenericaId, leadForAsignarOferta.id)

    if (result.success) {
      const leadId = leadForAsignarOferta.id
      
      console.log('✅ Oferta asignada exitosamente')
      console.log('📝 Lead ID:', leadId)
      
      // Actualizar el estado local inmediatamente
      setLeadsConOferta((prev) => {
        const next = new Set(prev)
        next.add(leadId)
        console.log('📊 Estado actualizado:', Array.from(next))
        return next
      })
      
      closeAsignarOfertaDialog()
      closeOfertaFlowDialog()
      
      toast({
        title: "✅ Oferta asignada",
        description: "El lead ahora tiene una oferta asignada",
      })
    }
  }

  const closeAsignarOfertaDialog = () => {
    setShowAsignarOfertaDialog(false)
    setLeadForAsignarOferta(null)
  }

  const closeVerOfertaDialog = () => {
    setShowVerOfertaDialog(false)
    setOfertaLeadActual(null)
    setOfertasLeadActuales([])
  }

  const handleVerDetallesOferta = (oferta: OfertaConfeccion) => {
    setOfertaLeadActual(oferta)
    setOfertasLeadActuales([oferta])
    setShowVerOfertaDialog(false)
    setShowDetalleOfertaDialog(true)
  }

  const closeDetalleOfertaDialog = () => {
    setShowDetalleOfertaDialog(false)
    setOfertaLeadActual(null)
  }

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

  const handlePrioridadChange = async (leadId: string, prioridad: "Alta" | "Media" | "Baja") => {
    if (onUpdatePrioridad) {
      try {
        await onUpdatePrioridad(leadId, prioridad)
        toast({
          title: "Prioridad actualizada",
          description: `La prioridad se cambió a ${prioridad}`,
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar la prioridad",
          variant: "destructive",
        })
      }
    }
  }

  const resetConversionState = () => {
    setConversionData({ numero: '', metodo_pago: '', moneda: '', equipo_propio: undefined })
    setConversionErrors({})
    setConversionLoading(false)
  }

  const openConvertDialog = async (lead: Lead) => {
    console.log('🔵 openConvertDialog called for lead:', lead.id)
    setLeadToConvert(lead)
    setConversionLoading(true)
    setConversionErrors({})
    
    // Abrir el diálogo inmediatamente para evitar pantalla de error
    console.log('🔵 Opening dialog immediately')
    setIsConvertDialogOpen(true)
    
    // Esperar un tick para asegurar que el diálogo se renderice
    await new Promise(resolve => setTimeout(resolve, 0))
    console.log('🔵 Dialog should be open now')
    
    try {
      // Verificar si el lead tiene oferta confeccionada
      const leadId = lead.id
      if (!leadId) {
        console.log('🔴 Lead has no ID')
        setConversionErrors({
          general: 'El lead no tiene ID válido'
        })
        setConversionData({
          numero: '',
          carnet_identidad: '',
          estado: 'Pendiente de instalación',
          equipo_propio: undefined,
        })
        setConversionLoading(false)
        return
      }

      // Verificar si tiene oferta confeccionada
      const tieneOfertaConfeccionada = leadsConOferta.has(leadId)
      console.log('🔵 Lead has oferta confeccionada:', tieneOfertaConfeccionada)
      
      if (!tieneOfertaConfeccionada) {
        // Si no tiene oferta confeccionada, preguntar si el equipo es propio
        console.log('🔵 No oferta confeccionada, asking about equipo propio')
        setConversionData({
          numero: '',
          carnet_identidad: '',
          estado: 'Pendiente de instalación',
          equipo_propio: undefined, // Indicar que necesita respuesta
        })
        setConversionLoading(false)
        return
      }
      
      console.log('🔵 Generating client code...')
      // Generar el código de cliente automáticamente con manejo de error robusto
      let codigoGenerado: string
      try {
        codigoGenerado = await onGenerarCodigo(leadId)
        console.log('✅ Code generated successfully:', codigoGenerado)
      } catch (genError) {
        // Capturar el error de generación de código específicamente
        console.log('🔴 Error generating code, caught in inner try-catch')
        const genErrorMessage = genError instanceof Error ? genError.message : 'Error al generar el código de cliente'
        throw new Error(genErrorMessage)
      }
      
      // Validar que el código tenga exactamente 10 caracteres
      // Formato: {Letra}{Provincia}{Municipio}{Consecutivo}
      // Ejemplo: F020400208 (1 letra + 9 dígitos)
      if (codigoGenerado.length !== 10) {
        throw new Error(
          `El código generado tiene un formato incorrecto. ` +
          `Se esperaban 10 caracteres pero se recibieron ${codigoGenerado.length}. ` +
          `Código recibido: "${codigoGenerado}". ` +
          `Verifica que el lead tenga:\n` +
          `- Oferta confeccionada con inversor seleccionado\n` +
          `- Marca de inversor configurada en el material\n` +
          `- Provincia y municipio válidos en la base de datos`
        )
      }
      
      // Validar formato: 1 letra mayúscula + 9 dígitos
      if (!/^[A-Z]\d{9}$/.test(codigoGenerado)) {
        throw new Error(
          `El código generado tiene un formato inválido: "${codigoGenerado}". ` +
          `Debe ser 1 letra mayúscula seguida de 9 dígitos.`
        )
      }
      
      setConversionData({
        numero: codigoGenerado,
        carnet_identidad: '',
        estado: 'Pendiente de instalación',
        equipo_propio: false,
      })
    } catch (error) {
      console.log('🔴 Error caught in outer try-catch')
      console.error('Error generating client code:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error al generar el código de cliente'
      
      // Detectar errores específicos del backend
      if (errorMessage.includes('ofertas confeccionadas')) {
        setConversionErrors({
          general: 'Este lead necesita una oferta confeccionada antes de generar el código. Crea una oferta confeccionada o marca el equipo como propio del cliente.'
        })
      } else if (errorMessage.includes('inversor seleccionado')) {
        setConversionErrors({
          general: 'La oferta confeccionada debe tener un inversor seleccionado. Edita la oferta o marca el equipo como propio del cliente.'
        })
      } else if (errorMessage.includes('marca_id')) {
        setConversionErrors({
          general: 'El material inversor no tiene marca asignada. Contacta al administrador para configurar la marca del material.'
        })
      } else if (errorMessage.includes('provincia_montaje') || errorMessage.includes('provincia')) {
        console.log('🔴 Setting provincia error')
        setConversionErrors({
          general: 'El lead no tiene provincia de montaje asignada. Por favor, edita el lead y asigna una provincia antes de convertirlo a cliente.'
        })
      } else if (errorMessage.includes('municipio')) {
        setConversionErrors({
          general: 'El lead no tiene municipio asignado. Por favor, edita el lead y asigna un municipio antes de convertirlo a cliente.'
        })
      } else {
        setConversionErrors({
          general: errorMessage
        })
      }
      
      setConversionData({
        numero: '',
        carnet_identidad: '',
        estado: 'Pendiente de instalación',
        equipo_propio: undefined,
      })
    } finally {
      console.log('🔵 Setting loading to false')
      setConversionLoading(false)
    }
    
    console.log('🔵 openConvertDialog finished')
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
      // ✅ SOLUCIÓN: Solo enviar lead_id, no enviar cliente_id
      // Según documentación en docs/SOLUCION_ERROR_MULTIPLES_CONTACTOS.md
      const updateData: OfertaPersonalizadaUpdateRequest = {
        ...data,
        lead_id: selectedLeadForOfertas.id,
      }
      // No agregar cliente_id para evitar el error de múltiples contactos
      
      const success = await updateOferta(id, updateData)
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

  // Funciones para manejar ofertas confeccionadas
  const handleEditarOferta = (oferta: OfertaConfeccion) => {
    setOfertaParaEditar(oferta)
    setMostrarDialogoEditar(true)
    // Cerrar el diálogo de detalles si está abierto
    setShowDetalleOfertaDialog(false)
  }

  const handleEliminarOferta = (oferta: OfertaConfeccion) => {
    setOfertaParaEliminar(oferta)
    setMostrarDialogoEliminar(true)
    // Cerrar el diálogo de detalles si está abierto
    setShowDetalleOfertaDialog(false)
  }

  const confirmarEliminarOferta = async () => {
    if (!ofertaParaEliminar) return

    setEliminandoOferta(true)
    try {
      await eliminarOferta(ofertaParaEliminar.id)
      setMostrarDialogoEliminar(false)
      setOfertaParaEliminar(null)
      
      // Actualizar el estado de leads con ofertas
      await cargarLeadsConOfertas({ skipCache: true, silent: true })
      
      toast({
        title: "Oferta eliminada",
        description: "La oferta se eliminó correctamente.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la oferta.",
        variant: "destructive",
      })
    } finally {
      setEliminandoOferta(false)
    }
  }

  const cancelarEliminarOferta = () => {
    setMostrarDialogoEliminar(false)
    setOfertaParaEliminar(null)
  }

  // Generar opciones de exportación para una oferta (similar a ofertas-confeccionadas-view)
  const generarOpcionesExportacion = useCallback((oferta: OfertaConfeccion) => {
    console.log('🚀 generarOpcionesExportacion INICIANDO para oferta:', oferta.id)
    
    // Importar funciones necesarias desde ofertas-confeccionadas-view
    const seccionLabelMap = new Map([
      ["INVERSORES", "Inversores"],
      ["BATERIAS", "Baterías"],
      ["PANELES", "Paneles Solares"],
      ["MPPT", "Controladores MPPT"],
      ["ESTRUCTURAS", "Estructuras de Montaje"],
      ["CABLEADO_DC", "Cableado DC"],
      ["CABLEADO_AC", "Cableado AC"],
      ["CANALIZACION", "Canalización"],
      ["TIERRA", "Sistema de Tierra"],
      ["PROTECCIONES_ELECTRICAS", "Protecciones Eléctricas"],
      ["MATERIAL_VARIO", "Material Vario"],
    ])

    const calcularTotalesDetalle = (oferta: OfertaConfeccion) => {
      const totalMateriales = oferta.total_materiales || 0
      const margenInstalacion = oferta.margen_instalacion || 0
      const costoTransportacion = oferta.costo_transportacion || 0
      const totalElementosPersonalizados = oferta.total_elementos_personalizados || 0
      const totalCostosExtras = oferta.total_costos_extras || 0
      
      const subtotalConMargen = totalMateriales + margenInstalacion
      const baseParaContribucion = subtotalConMargen + costoTransportacion + totalElementosPersonalizados + totalCostosExtras
      
      const contribucion = oferta.aplica_contribucion && oferta.porcentaje_contribucion
        ? baseParaContribucion * (oferta.porcentaje_contribucion / 100)
        : 0
      
      const subtotalAntesDescuento = baseParaContribucion + contribucion
      
      const descuentoPorcentaje = parseFloat(oferta.descuento_porcentaje as any) || 0
      const montoDescuento = descuentoPorcentaje > 0
        ? subtotalAntesDescuento * (descuentoPorcentaje / 100)
        : 0
      
      const subtotalConDescuento = subtotalAntesDescuento - montoDescuento
      const totalSinRedondeo = subtotalConDescuento
      const precioFinal = Math.ceil(totalSinRedondeo)
      const redondeo = precioFinal - totalSinRedondeo
      
      return {
        totalMateriales,
        margenInstalacion,
        costoTransportacion,
        totalElementosPersonalizados,
        totalCostosExtras,
        subtotalConMargen,
        contribucion,
        subtotalAntesDescuento,
        montoDescuento,
        subtotalConDescuento,
        totalSinRedondeo,
        precioFinal,
        redondeo,
      }
    }

    // Buscar el lead asociado
    const lead = leads.find(l => l.id === oferta.lead_id)
    
    // Crear mapas de materiales y marcas
    const materialesMap = new Map(materials.map(m => [m.codigo.toString(), m]))
    const marcasMap = new Map(marcas.map(marca => [marca.id, marca.nombre]))
    
    // Orden de secciones
    const ordenSeccionesBase = [
      "INVERSORES", "BATERIAS", "PANELES", "MPPT", "ESTRUCTURAS",
      "CABLEADO_DC", "CABLEADO_AC", "CANALIZACION", "TIERRA",
      "PROTECCIONES_ELECTRICAS", "MATERIAL_VARIO",
    ]
    
    const seccionesPersonalizadasOferta = oferta.secciones_personalizadas || []
    const ordenSecciones = [
      ...ordenSeccionesBase,
      ...seccionesPersonalizadasOferta.map((s: any) => s.id)
    ]
    
    const ordenarItemsPorSeccion = (items: any[]) => {
      return [...items].sort((a, b) => {
        const indexA = ordenSecciones.indexOf(a.seccion)
        const indexB = ordenSecciones.indexOf(b.seccion)
        const posA = indexA === -1 ? 999 : indexA
        const posB = indexB === -1 ? 999 : indexB
        return posA - posB
      })
    }
    
    const itemsOrdenados = ordenarItemsPorSeccion(oferta.items || [])
    
    // Generar nombre base del archivo
    let baseFilename = (oferta.nombre || 'oferta')
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .replace(/,\s*/g, '+')
      .replace(/_+/g, '_')
      .trim()
    
    if (oferta.tipo === 'personalizada' && lead) {
      const nombreContacto = lead.nombre_completo || lead.nombre || ''
      if (nombreContacto) {
        const nombreLimpio = nombreContacto
          .replace(/[<>:"/\\|?*]/g, '')
          .replace(/\s+/g, '_')
          .replace(/_+/g, '_')
          .trim()
        baseFilename = `${baseFilename}-${nombreLimpio}`
      }
    }
    
    const tasaCambioNumero = oferta.tasa_cambio || 0
    const montoConvertido = tasaCambioNumero > 0 && oferta.moneda_pago !== 'USD'
      ? oferta.moneda_pago === 'EUR'
        ? (oferta.precio_final || 0) / tasaCambioNumero
        : (oferta.precio_final || 0) * tasaCambioNumero
      : 0
    
    // EXPORTACIÓN COMPLETA
    const rowsCompleto: any[] = []
    itemsOrdenados.forEach((item) => {
      let seccionLabel = seccionLabelMap.get(item.seccion) ?? item.seccion
      
      if (seccionLabel === item.seccion && seccionesPersonalizadasOferta.length > 0) {
        const seccionPersonalizada = seccionesPersonalizadasOferta.find((s: any) => s.id === item.seccion)
        if (seccionPersonalizada) {
          seccionLabel = seccionPersonalizada.label
        }
      }
      
      const material = materialesMap.get(item.material_codigo?.toString())
      const nombreMaterial = material?.nombre || item.descripcion
      
      const margenAsignado = (item as any).margen_asignado || 0
      const costoItem = item.precio * item.cantidad
      
      const porcentajeMargen = costoItem > 0 && margenAsignado > 0
        ? (margenAsignado / costoItem) * 100
        : 0
      
      rowsCompleto.push({
        material_codigo: item.material_codigo,
        seccion: seccionLabel,
        tipo: "Material",
        descripcion: nombreMaterial,
        cantidad: item.cantidad,
        precio_unitario: item.precio.toFixed(2),
        porcentaje_margen: `${porcentajeMargen.toFixed(2)}%`,
        margen: margenAsignado.toFixed(2),
        total: (costoItem + margenAsignado).toFixed(2),
      })
    })
    
    const totalMateriales = itemsOrdenados.reduce((sum, item) => {
      const margenAsignado = (item as any).margen_asignado || 0
      const costoItem = item.precio * item.cantidad
      return sum + costoItem + margenAsignado
    }, 0)
    
    // Agregar secciones personalizadas de tipo costo
    if (seccionesPersonalizadasOferta.length > 0) {
      seccionesPersonalizadasOferta.forEach((seccion: any) => {
        if (seccion.tipo === 'extra' && seccion.tipo_extra === 'costo' && seccion.costos_extras) {
          seccion.costos_extras.forEach((costo: any) => {
            rowsCompleto.push({
              material_codigo: "",
              seccion: seccion.label,
              tipo: "Costo extra",
              descripcion: costo.descripcion,
              cantidad: costo.cantidad,
              precio_unitario: costo.precio_unitario.toFixed(2),
              porcentaje_margen: "",
              margen: "",
              total: (costo.cantidad * costo.precio_unitario).toFixed(2),
            })
          })
        }
      })
    }
    
    rowsCompleto.push({
      material_codigo: "",
      seccion: "Totales",
      tipo: "Subtotal",
      descripcion: "Total de materiales",
      cantidad: "",
      precio_unitario: "",
      porcentaje_margen: "",
      margen: "",
      total: totalMateriales.toFixed(2),
    })
    
    if (oferta.margen_instalacion && oferta.margen_instalacion > 0) {
      rowsCompleto.push({
        material_codigo: "",
        seccion: "Servicios",
        tipo: "Servicio",
        descripcion: "Costo de instalación y puesta en marcha",
        cantidad: 1,
        precio_unitario: oferta.margen_instalacion.toFixed(2),
        porcentaje_margen: "",
        margen: "",
        total: oferta.margen_instalacion.toFixed(2),
      })
    }
    
    if (oferta.costo_transportacion && oferta.costo_transportacion > 0) {
      rowsCompleto.push({
        material_codigo: "",
        seccion: "Logística",
        tipo: "Transportación",
        descripcion: "Costo de transportación",
        cantidad: 1,
        precio_unitario: oferta.costo_transportacion.toFixed(2),
        porcentaje_margen: "",
        margen: "",
        total: oferta.costo_transportacion.toFixed(2),
      })
    }
    
    const descuentoPorcentaje = parseFloat(oferta.descuento_porcentaje as any) || 0
    const montoDescuento = parseFloat(oferta.monto_descuento as any) || 0
    
    if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
      const totalesCalc = calcularTotalesDetalle(oferta)
      rowsCompleto.push({
        material_codigo: "",
        seccion: "Contribución",
        tipo: "Contribucion",
        descripcion: `Contribución (${oferta.porcentaje_contribucion}%)`,
        cantidad: 1,
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: totalesCalc.contribucion.toFixed(2),
      })
    }
    
    if (descuentoPorcentaje > 0) {
      rowsCompleto.push({
        material_codigo: "",
        seccion: "Descuento",
        tipo: "Descuento",
        descripcion: `Descuento aplicado (${descuentoPorcentaje}%)`,
        cantidad: 1,
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: `- ${montoDescuento.toFixed(2)}`,
      })
    }
    
    rowsCompleto.push({
      material_codigo: "",
      seccion: "Totales",
      tipo: "TOTAL",
      descripcion: "Precio final",
      cantidad: "",
      precio_unitario: "",
      porcentaje_margen: "",
      margen: "",
      total: (oferta.precio_final || 0).toFixed(2),
    })
    
    if (oferta.pago_transferencia || oferta.aplica_contribucion || (oferta.moneda_pago !== 'USD' && tasaCambioNumero > 0)) {
      if (oferta.pago_transferencia) {
        rowsCompleto.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Info",
          descripcion: "✓ Pago por transferencia",
          cantidad: "",
          precio_unitario: "",
          porcentaje_margen: "",
          margen: "",
          total: "",
        })
        
        if (oferta.datos_cuenta) {
          rowsCompleto.push({
            material_codigo: "",
            seccion: "PAGO",
            tipo: "Datos",
            descripcion: "Datos de la cuenta",
            cantidad: "",
            precio_unitario: "",
            porcentaje_margen: "",
            margen: "",
            total: oferta.datos_cuenta,
          })
        }
      }
      
      rowsCompleto.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "TOTAL",
        descripcion: "Precio Final",
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: (oferta.precio_final || 0).toFixed(2),
      })
      
      const totalesCalc = calcularTotalesDetalle(oferta)
      if (Math.abs(totalesCalc.redondeo) > 0.01) {
        rowsCompleto.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Nota",
          descripcion: `(Redondeado desde ${totalesCalc.totalSinRedondeo.toFixed(2)} $)`,
          cantidad: "",
          precio_unitario: "",
          porcentaje_margen: "",
          margen: "",
          total: "",
        })
      }
      
      if (oferta.moneda_pago !== 'USD' && tasaCambioNumero > 0) {
        const simboloMoneda = oferta.moneda_pago === 'EUR' ? '€' : 'CUP'
        const nombreMoneda = oferta.moneda_pago === 'EUR' ? 'Euros (EUR)' : 'Pesos Cubanos (CUP)'
        
        rowsCompleto.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Info",
          descripcion: "Moneda de pago",
          cantidad: "",
          precio_unitario: "",
          porcentaje_margen: "",
          margen: "",
          total: nombreMoneda,
        })
        
        const tasaTexto = oferta.moneda_pago === 'EUR' 
          ? `1 EUR = ${tasaCambioNumero} USD`
          : `1 USD = ${tasaCambioNumero} CUP`
        
        rowsCompleto.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Tasa",
          descripcion: tasaTexto,
          cantidad: "",
          precio_unitario: "",
          porcentaje_margen: "",
          margen: "",
          total: "",
        })
        
        rowsCompleto.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Conversión",
          descripcion: `Precio en ${oferta.moneda_pago}`,
          cantidad: "",
          precio_unitario: "",
          porcentaje_margen: "",
          margen: "",
          total: `${montoConvertido.toFixed(2)} ${simboloMoneda}`,
        })
      }
    }
    
    // Crear mapa de fotos
    const fotosMap = new Map<string, string>()
    itemsOrdenados.forEach((item) => {
      const material = materials.find(m => m.codigo.toString() === item.material_codigo)
      if (material?.foto) {
        fotosMap.set(item.material_codigo?.toString(), material.foto)
      }
    })

    // Extraer componentes principales (simplificado para leads)
    const componentesPrincipales: any = {}
    const itemsInversores = itemsOrdenados.filter(item => item.seccion === 'INVERSORES')
    if (itemsInversores.length > 0) {
      const inversor = itemsInversores[0]
      const material = materials.find(m => m.codigo.toString() === inversor.material_codigo)
      const potencia = material?.potenciaKW || 0
      const marcaId = material?.marca_id
      const marca = marcaId ? marcasMap.get(marcaId) : undefined
      
      componentesPrincipales.inversor = {
        codigo: inversor.material_codigo,
        cantidad: inversor.cantidad,
        potencia: potencia,
        marca: marca
      }
    }
    
    const itemsBaterias = itemsOrdenados.filter(item => item.seccion === 'BATERIAS')
    if (itemsBaterias.length > 0) {
      const bateria = itemsBaterias[0]
      const material = materials.find(m => m.codigo.toString() === bateria.material_codigo)
      const capacidad = material?.potenciaKW || 0
      
      componentesPrincipales.bateria = {
        codigo: bateria.material_codigo,
        cantidad: bateria.cantidad,
        capacidad: capacidad
      }
    }
    
    const itemsPaneles = itemsOrdenados.filter(item => item.seccion === 'PANELES')
    if (itemsPaneles.length > 0) {
      const panel = itemsPaneles[0]
      const material = materials.find(m => m.codigo.toString() === panel.material_codigo)
      const potenciaKW = material?.potenciaKW || 0
      const potencia = potenciaKW * 1000
      
      componentesPrincipales.panel = {
        codigo: panel.material_codigo,
        cantidad: panel.cantidad,
        potencia: potencia
      }
    }
    
    const exportOptionsCompleto = {
      title: "Oferta - Exportación completa",
      subtitle: (oferta.nombre_completo && oferta.nombre_completo !== '0.00' && isNaN(Number(oferta.nombre_completo))) 
        ? oferta.nombre_completo 
        : oferta.nombre,
      columns: [
        { header: "Sección", key: "seccion", width: 18 },
        { header: "Tipo", key: "tipo", width: 12 },
        { header: "Descripción", key: "descripcion", width: 45 },
        { header: "Cant", key: "cantidad", width: 8 },
        { header: "P.Unit ($)", key: "precio_unitario", width: 12 },
        { header: "% Margen", key: "porcentaje_margen", width: 8 },
        { header: "Margen ($)", key: "margen", width: 14 },
        { header: "Total ($)", key: "total", width: 14 },
      ],
      data: rowsCompleto,
      logoUrl: '/logo Suncar.png',
      leadData: oferta.tipo === 'personalizada' && lead ? {
        id: lead.id,
        nombre: lead.nombre_completo || lead.nombre,
        telefono: lead.telefono,
        email: lead.email,
        provincia: lead.provincia,
        direccion: lead.direccion,
        atencion_de: lead.nombre_completo || lead.nombre,
      } : undefined,
      leadSinAgregarData: oferta.tipo === 'personalizada' && oferta.nombre_lead_sin_agregar ? {
        nombre: oferta.nombre_lead_sin_agregar,
        atencion_de: oferta.nombre_lead_sin_agregar,
      } : undefined,
      ofertaData: {
        numero_oferta: oferta.numero_oferta || oferta.id,
        nombre_oferta: oferta.nombre_completo || oferta.nombre,
        tipo_oferta: oferta.tipo === 'generica' ? 'Genérica' : 'Personalizada',
      },
      incluirFotos: true,
      fotosMap,
      componentesPrincipales,
      terminosCondiciones: terminosCondiciones || undefined,
      seccionesPersonalizadas: seccionesPersonalizadasOferta.filter((s: any) => 
        s.tipo === 'extra' && (s.tipo_extra === 'escritura' || s.tipo_extra === 'costo')
      ),
    }
    
    // EXPORTACIÓN SIN PRECIOS (copiado exactamente de ofertas-confeccionadas-view)
    const rowsSinPrecios: any[] = []
    itemsOrdenados.forEach((item) => {
      let seccionLabel = seccionLabelMap.get(item.seccion) ?? item.seccion
      
      if (seccionLabel === item.seccion && seccionesPersonalizadasOferta.length > 0) {
        const seccionPersonalizada = seccionesPersonalizadasOferta.find((s: any) => s.id === item.seccion)
        if (seccionPersonalizada) {
          seccionLabel = seccionPersonalizada.label
        }
      }
      
      const material = materialesMap.get(item.material_codigo?.toString())
      const nombreMaterial = material?.nombre || item.descripcion
      
      rowsSinPrecios.push({
        material_codigo: item.material_codigo,
        seccion: seccionLabel,
        tipo: "Material",
        descripcion: nombreMaterial,
        cantidad: item.cantidad,
      })
    })

    // Agregar secciones personalizadas de tipo costo (sin precios)
    if (seccionesPersonalizadasOferta.length > 0) {
      seccionesPersonalizadasOferta.forEach((seccion: any) => {
        if (seccion.tipo === 'extra' && seccion.tipo_extra === 'costo' && seccion.costos_extras) {
          seccion.costos_extras.forEach((costo: any) => {
            rowsSinPrecios.push({
              material_codigo: "",
              seccion: seccion.label,
              tipo: "Costo extra",
              descripcion: costo.descripcion,
              cantidad: costo.cantidad,
            })
          })
        }
      })
    }

    rowsSinPrecios.push({
      material_codigo: "",
      seccion: "Totales",
      tipo: "Subtotal",
      descripcion: "Total de materiales",
      cantidad: "",
    })

    if (oferta.margen_instalacion && oferta.margen_instalacion > 0) {
      rowsSinPrecios.push({
        material_codigo: "",
        seccion: "Servicios",
        tipo: "Servicio",
        descripcion: "Costo de instalación y puesta en marcha",
        cantidad: 1,
      })
    }

    if (oferta.costo_transportacion && oferta.costo_transportacion > 0) {
      rowsSinPrecios.push({
        material_codigo: "",
        seccion: "Logística",
        tipo: "Transportación",
        descripcion: "Costo de transportación",
        cantidad: 1,
        total: oferta.costo_transportacion.toFixed(2),
      })
    }

    if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
      const totalesCalc = calcularTotalesDetalle(oferta)
      rowsSinPrecios.push({
        material_codigo: "",
        seccion: "Contribución",
        tipo: "Contribucion",
        descripcion: `Contribución (${oferta.porcentaje_contribucion}%)`,
        cantidad: 1,
        total: totalesCalc.contribucion.toFixed(2),
      })
    }

    if (oferta.descuento_porcentaje && oferta.descuento_porcentaje > 0) {
      const totalesCalc = calcularTotalesDetalle(oferta)
      const montoDescuento = totalesCalc.montoDescuento || oferta.monto_descuento || 0
      rowsSinPrecios.push({
        material_codigo: "",
        seccion: "Descuento",
        tipo: "Descuento",
        descripcion: `Descuento aplicado (${oferta.descuento_porcentaje}%)`,
        cantidad: 1,
        total: `- ${montoDescuento.toFixed(2)}`,
      })
    }

    rowsSinPrecios.push({
      material_codigo: "",
      seccion: "Totales",
      tipo: "TOTAL",
      descripcion: "Precio Total",
      cantidad: "",
      total: (oferta.precio_final || 0).toFixed(2),
    })

    // Datos de pago para sin precios
    if (oferta.pago_transferencia || oferta.aplica_contribucion || (oferta.moneda_pago !== 'USD' && tasaCambioNumero > 0)) {
      if (oferta.pago_transferencia) {
        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Info",
          descripcion: "✓ Pago por transferencia",
          cantidad: "",
        })
        
        if (oferta.datos_cuenta) {
          rowsSinPrecios.push({
            material_codigo: "",
            seccion: "PAGO",
            tipo: "Datos",
            descripcion: "Datos de la cuenta",
            cantidad: "",
            total: oferta.datos_cuenta,
          })
        }
      }

      if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Info",
          descripcion: `✓ Aplicar ${oferta.porcentaje_contribucion}% de Contribución`,
          cantidad: "",
        })
      }

      rowsSinPrecios.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "TOTAL",
        descripcion: "Precio Final",
        cantidad: "",
        total: (oferta.precio_final || 0).toFixed(2),
      })

      const totalesCalc = calcularTotalesDetalle(oferta)
      if (Math.abs(totalesCalc.redondeo) > 0.01) {
        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Nota",
          descripcion: `(Redondeado desde ${totalesCalc.totalSinRedondeo.toFixed(2)} $)`,
          cantidad: "",
        })
      }

      if (oferta.moneda_pago !== 'USD' && tasaCambioNumero > 0) {
        const simboloMoneda = oferta.moneda_pago === 'EUR' ? '€' : 'CUP'
        const nombreMoneda = oferta.moneda_pago === 'EUR' ? 'Euros (EUR)' : 'Pesos Cubanos (CUP)'
        
        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Info",
          descripcion: "Moneda de pago",
          cantidad: "",
          total: nombreMoneda,
        })
        
        const tasaTexto = oferta.moneda_pago === 'EUR' 
          ? `Tasa de cambio: 1 EUR = ${tasaCambioNumero} USD`
          : `Tasa de cambio: 1 USD = ${tasaCambioNumero} CUP`
        
        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Tasa",
          descripcion: tasaTexto,
          cantidad: "",
        })
        
        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Conversión",
          descripcion: `Precio en ${oferta.moneda_pago}`,
          cantidad: "",
          total: `${montoConvertido.toFixed(2)} ${simboloMoneda}`,
        })
      }
    }
    
    const exportOptionsSinPrecios = {
      title: "Oferta - Cliente sin precios",
      subtitle: (oferta.nombre_completo && oferta.nombre_completo !== '0.00' && isNaN(Number(oferta.nombre_completo))) 
        ? oferta.nombre_completo 
        : oferta.nombre,
      columns: [
        { header: "Material", key: "descripcion", width: 60 },
        { header: "Cant", key: "cantidad", width: 10 },
      ],
      data: rowsSinPrecios,
      logoUrl: '/logo Suncar.png',
      leadData: oferta.tipo === 'personalizada' && lead ? {
        id: lead.id,
        nombre: lead.nombre_completo || lead.nombre,
        telefono: lead.telefono,
        email: lead.email,
        provincia: lead.provincia,
        direccion: lead.direccion,
        atencion_de: lead.nombre_completo || lead.nombre,
      } : undefined,
      leadSinAgregarData: oferta.tipo === 'personalizada' && oferta.nombre_lead_sin_agregar ? {
        nombre: oferta.nombre_lead_sin_agregar,
        atencion_de: oferta.nombre_lead_sin_agregar,
      } : undefined,
      ofertaData: {
        numero_oferta: oferta.numero_oferta || oferta.id,
        nombre_oferta: oferta.nombre_completo || oferta.nombre,
        tipo_oferta: oferta.tipo === 'generica' ? 'Genérica' : 'Personalizada',
      },
      incluirFotos: true,
      fotosMap,
      sinPrecios: true,
      componentesPrincipales,
      terminosCondiciones: terminosCondiciones || undefined,
      seccionesPersonalizadas: seccionesPersonalizadasOferta.filter((s: any) => 
        s.tipo === 'extra' && (s.tipo_extra === 'escritura' || s.tipo_extra === 'costo')
      ),
    }
    
    console.log('🔍 DEBUG exportOptionsSinPrecios desde leads:', {
      sinPrecios: exportOptionsSinPrecios.sinPrecios,
      columns: exportOptionsSinPrecios.columns,
      dataLength: exportOptionsSinPrecios.data.length,
      firstRow: exportOptionsSinPrecios.data[0],
    })
    
    // EXPORTACIÓN CLIENTE CON PRECIOS (copiado exactamente de ofertas-confeccionadas-view)
    const rowsClienteConPrecios: any[] = []
    itemsOrdenados.forEach((item) => {
      let seccionLabel = seccionLabelMap.get(item.seccion) ?? item.seccion
      
      if (seccionLabel === item.seccion && seccionesPersonalizadasOferta.length > 0) {
        const seccionPersonalizada = seccionesPersonalizadasOferta.find((s: any) => s.id === item.seccion)
        if (seccionPersonalizada) {
          seccionLabel = seccionPersonalizada.label
        }
      }
      
      const margenAsignado = (item as any).margen_asignado || 0
      const costoItem = item.precio * item.cantidad
      const totalConMargen = costoItem + margenAsignado
      
      const material = materialesMap.get(item.material_codigo?.toString())
      const nombreMaterial = material?.nombre || item.descripcion
      
      rowsClienteConPrecios.push({
        material_codigo: item.material_codigo,
        seccion: seccionLabel,
        tipo: "Material",
        descripcion: nombreMaterial,
        cantidad: item.cantidad,
        total: totalConMargen.toFixed(2),
      })
    })

    const totalMaterialesCliente = itemsOrdenados.reduce((sum, item) => {
      const margenAsignado = (item as any).margen_asignado || 0
      const costoItem = item.precio * item.cantidad
      return sum + costoItem + margenAsignado
    }, 0)

    let totalCostosExtrasCliente = 0
    if (seccionesPersonalizadasOferta.length > 0) {
      seccionesPersonalizadasOferta.forEach((seccion: any) => {
        if (seccion.tipo === 'extra' && seccion.tipo_extra === 'costo' && seccion.costos_extras) {
          seccion.costos_extras.forEach((costo: any) => {
            totalCostosExtrasCliente += costo.cantidad * costo.precio_unitario
          })
        }
      })
    }

    if (seccionesPersonalizadasOferta.length > 0) {
      seccionesPersonalizadasOferta.forEach((seccion: any) => {
        if (seccion.tipo === 'extra' && seccion.tipo_extra === 'costo' && seccion.costos_extras) {
          seccion.costos_extras.forEach((costo: any) => {
            rowsClienteConPrecios.push({
              material_codigo: "",
              seccion: seccion.label,
              tipo: "Costo extra",
              descripcion: costo.descripcion,
              cantidad: costo.cantidad,
              total: (costo.cantidad * costo.precio_unitario).toFixed(2),
            })
          })
        }
      })
    }

    rowsClienteConPrecios.push({
      material_codigo: "",
      seccion: "Totales",
      tipo: "Subtotal",
      descripcion: "Total de materiales",
      cantidad: "",
      total: totalMaterialesCliente.toFixed(2),
    })

    if (totalCostosExtrasCliente > 0) {
      rowsClienteConPrecios.push({
        material_codigo: "",
        seccion: "Totales",
        tipo: "Subtotal",
        descripcion: "Total costos extras",
        cantidad: "",
        total: totalCostosExtrasCliente.toFixed(2),
      })
    }

    if (oferta.margen_instalacion && oferta.margen_instalacion > 0) {
      rowsClienteConPrecios.push({
        material_codigo: "",
        seccion: "Servicios",
        tipo: "Servicio",
        descripcion: "Costo de instalación y puesta en marcha",
        cantidad: 1,
        total: oferta.margen_instalacion.toFixed(2),
      })
    }

    if (oferta.costo_transportacion && oferta.costo_transportacion > 0) {
      rowsClienteConPrecios.push({
        material_codigo: "",
        seccion: "Logística",
        tipo: "Transportación",
        descripcion: "Costo de transportación",
        cantidad: 1,
        total: oferta.costo_transportacion.toFixed(2),
      })
    }

    if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
      const totalesCalc = calcularTotalesDetalle(oferta)
      rowsClienteConPrecios.push({
        material_codigo: "",
        seccion: "Contribución",
        tipo: "Contribucion",
        descripcion: `Contribución (${oferta.porcentaje_contribucion}%)`,
        cantidad: 1,
        total: totalesCalc.contribucion.toFixed(2),
      })
    }

    if (oferta.descuento_porcentaje && oferta.descuento_porcentaje > 0) {
      const totalesCalc = calcularTotalesDetalle(oferta)
      const montoDescuento = totalesCalc.montoDescuento || oferta.monto_descuento || 0
      rowsClienteConPrecios.push({
        material_codigo: "",
        seccion: "Descuento",
        tipo: "Descuento",
        descripcion: `Descuento aplicado (${oferta.descuento_porcentaje}%)`,
        cantidad: 1,
        total: `- ${montoDescuento.toFixed(2)}`,
      })
    }

    rowsClienteConPrecios.push({
      material_codigo: "",
      seccion: "Totales",
      tipo: "TOTAL",
      descripcion: "PRECIO TOTAL",
      cantidad: "",
      total: (oferta.precio_final || 0).toFixed(2),
    })

    // Datos de pago para cliente con precios
    if (oferta.pago_transferencia || oferta.aplica_contribucion || (oferta.moneda_pago !== 'USD' && tasaCambioNumero > 0)) {
      if (oferta.pago_transferencia) {
        rowsClienteConPrecios.push({
          descripcion: "✓ Pago por transferencia",
          cantidad: "",
          seccion: "PAGO",
          tipo: "Info",
        })
        
        if (oferta.datos_cuenta) {
          rowsClienteConPrecios.push({
            descripcion: "Datos de la cuenta",
            cantidad: "",
            total: oferta.datos_cuenta,
            seccion: "PAGO",
            tipo: "Datos",
          })
        }
      }

      if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
        const totalesCalc = calcularTotalesDetalle(oferta)
        
        rowsClienteConPrecios.push({
          descripcion: `✓ Aplicar ${oferta.porcentaje_contribucion}% de Contribución`,
          cantidad: "",
          seccion: "PAGO",
          tipo: "Info",
        })
        
        rowsClienteConPrecios.push({
          descripcion: "Contribución",
          cantidad: "",
          total: totalesCalc.contribucion.toFixed(2),
          seccion: "PAGO",
          tipo: "Monto",
        })
      }

      rowsClienteConPrecios.push({
        descripcion: "Precio Final",
        cantidad: "",
        total: (oferta.precio_final || 0).toFixed(2),
        seccion: "PAGO",
        tipo: "TOTAL",
      })

      const totalesCalc = calcularTotalesDetalle(oferta)
      if (Math.abs(totalesCalc.redondeo) > 0.01) {
        rowsClienteConPrecios.push({
          descripcion: `(Redondeado desde ${totalesCalc.totalSinRedondeo.toFixed(2)} $)`,
          cantidad: "",
          seccion: "PAGO",
          tipo: "Nota",
        })
      }

      if (oferta.moneda_pago !== 'USD' && tasaCambioNumero > 0) {
        const simboloMoneda = oferta.moneda_pago === 'EUR' ? '€' : 'CUP'
        const nombreMoneda = oferta.moneda_pago === 'EUR' ? 'Euros (EUR)' : 'Pesos Cubanos (CUP)'
        
        rowsClienteConPrecios.push({
          descripcion: "Moneda de pago",
          cantidad: "",
          total: nombreMoneda,
          seccion: "PAGO",
          tipo: "Info",
        })
        
        const tasaTexto = oferta.moneda_pago === 'EUR' 
          ? `Tasa de cambio: 1 EUR = ${tasaCambioNumero} USD`
          : `Tasa de cambio: 1 USD = ${tasaCambioNumero} CUP`
        
        rowsClienteConPrecios.push({
          descripcion: tasaTexto,
          cantidad: "",
          seccion: "PAGO",
          tipo: "Tasa",
        })
        
        rowsClienteConPrecios.push({
          descripcion: `Precio en ${oferta.moneda_pago}`,
          cantidad: "",
          total: `${montoConvertido.toFixed(2)} ${simboloMoneda}`,
          seccion: "PAGO",
          tipo: "Conversión",
        })
      }
    }
    
    const exportOptionsClienteConPrecios = {
      title: "Oferta - Cliente con precios",
      subtitle: (oferta.nombre_completo && oferta.nombre_completo !== '0.00' && isNaN(Number(oferta.nombre_completo))) 
        ? oferta.nombre_completo 
        : oferta.nombre,
      columns: [
        { header: "Material", key: "descripcion", width: 50 },
        { header: "Cant", key: "cantidad", width: 10 },
        { header: "Total ($)", key: "total", width: 15 },
      ],
      data: rowsClienteConPrecios,
      logoUrl: '/logo Suncar.png',
      leadData: oferta.tipo === 'personalizada' && lead ? {
        id: lead.id,
        nombre: lead.nombre_completo || lead.nombre,
        telefono: lead.telefono,
        email: lead.email,
        provincia: lead.provincia,
        direccion: lead.direccion,
        atencion_de: lead.nombre_completo || lead.nombre,
      } : undefined,
      leadSinAgregarData: oferta.tipo === 'personalizada' && oferta.nombre_lead_sin_agregar ? {
        nombre: oferta.nombre_lead_sin_agregar,
        atencion_de: oferta.nombre_lead_sin_agregar,
      } : undefined,
      ofertaData: {
        numero_oferta: oferta.numero_oferta || oferta.id,
        nombre_oferta: oferta.nombre_completo || oferta.nombre,
        tipo_oferta: oferta.tipo === 'generica' ? 'Genérica' : 'Personalizada',
      },
      incluirFotos: true,
      fotosMap,
      conPreciosCliente: true,
      componentesPrincipales,
      terminosCondiciones: terminosCondiciones || undefined,
      seccionesPersonalizadas: seccionesPersonalizadasOferta.filter((s: any) => 
        s.tipo === 'extra' && (s.tipo_extra === 'escritura' || s.tipo_extra === 'costo')
      ),
    }
    
    const resultado = {
      baseFilename,
      exportOptionsCompleto,
      exportOptionsSinPrecios,
      exportOptionsClienteConPrecios,
    }
    
    console.log('✅ generarOpcionesExportacion RESULTADO:', {
      baseFilename: resultado.baseFilename,
      sinPrecios: resultado.exportOptionsSinPrecios?.sinPrecios,
      conPreciosCliente: resultado.exportOptionsClienteConPrecios?.conPreciosCliente,
      columns_sinPrecios: resultado.exportOptionsSinPrecios?.columns?.length,
      columns_conPrecios: resultado.exportOptionsClienteConPrecios?.columns?.length,
    })
    
    return resultado
  }, [leads, materials, marcas, terminosCondiciones])

  const handleExportarOferta = (oferta: OfertaConfeccion) => {
    setOfertaParaExportar(oferta)
    setMostrarDialogoExportar(true)
    // Cerrar el diálogo de detalles si está abierto
    setShowDetalleOfertaDialog(false)
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

    if (conversionData.carnet_identidad && conversionData.carnet_identidad.trim()) {
      payload.carnet_identidad = conversionData.carnet_identidad.trim()
    }

    if (conversionData.estado && conversionData.estado.trim()) {
      payload.estado = conversionData.estado.trim()
    }

    if (conversionData.equipo_propio !== undefined) {
      payload.equipo_propio = conversionData.equipo_propio
    }

    return payload
  }

  const handleConfirmConversion = async () => {
    if (!leadToConvert) return

    const errors: Record<string, string> = {}
    
    // Verificar si necesita responder sobre equipo propio
    if (conversionData.equipo_propio === undefined) {
      errors.general = 'Debes indicar si el equipo es propio del cliente o si necesita asignar un inversor'
      setConversionErrors(errors)
      return
    }
    
    if (!conversionData.numero || !conversionData.numero.trim()) {
      errors.numero = 'El código de cliente no se pudo generar. Intenta de nuevo.'
    }
    
    // Validar carnet solo si se proporciona
    if (conversionData.carnet_identidad && conversionData.carnet_identidad.trim()) {
      if (conversionData.carnet_identidad.length !== 11) {
        errors.carnet_identidad = 'El carnet de identidad debe tener exactamente 11 dígitos'
      } else if (!/^\d{11}$/.test(conversionData.carnet_identidad)) {
        errors.carnet_identidad = 'El carnet de identidad solo debe contener números'
      }
    }
    
    if (!conversionData.estado || !conversionData.estado.trim()) {
      errors.estado = 'Debes seleccionar un estado para el cliente'
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
                            {oferta.elementos_personalizados && (
                              <div className="text-gray-700">
                                {oferta.elementos_personalizados}
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
                      <div className="flex items-center h-7 w-7 justify-center">
                        <PriorityDot
                          prioridad={lead.prioridad}
                          onChange={(prioridad) => lead.id && handlePrioridadChange(lead.id, prioridad)}
                          disabled={disableActions || !onUpdatePrioridad}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setConsultandoOfertaLead(lead.id || null)
                          openAsignarOfertaDialog(lead).catch(err => {
                            console.error('Error al abrir dialogo:', err)
                          }).finally(() => {
                            setConsultandoOfertaLead((prev) => (prev === lead.id ? null : prev))
                          })
                        }}
                        disabled={consultandoOfertaLead === lead.id || !cargaSetOfertasTerminada}
                        className={(() => {
                          if (!cargaSetOfertasTerminada) {
                            return "text-slate-400 hover:text-slate-500 hover:bg-slate-50 h-7 w-7 p-0"
                          }
                          const leadId = lead.id
                          const tieneOferta = leadId && leadsConOferta.has(leadId)
                          if (tieneOferta) return "text-green-600 hover:text-green-700 hover:bg-green-50 border border-green-300 h-7 w-7 p-0"
                          return "text-gray-600 hover:text-gray-700 hover:bg-gray-50 h-7 w-7 p-0"
                        })()}
                        title={(() => {
                          if (!cargaSetOfertasTerminada) return "Cargando estado de oferta..."
                          const leadId = lead.id
                          const tieneOferta = leadId && leadsConOferta.has(leadId)
                          if (tieneOferta) return "Ver oferta asignada"
                          return "Asignar oferta generica"
                        })()}
                      >
                        <FileCheck
                          className={`h-3 w-3 ${consultandoOfertaLead === lead.id || !cargaSetOfertasTerminada ? "animate-pulse" : ""}`}
                        />
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

                  {/* Fila 3.5: Prioridad */}
                  {selectedLead.prioridad && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-gray-700">Prioridad</Label>
                        <div className="mt-1 flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            selectedLead.prioridad === 'Alta' ? 'bg-red-500' :
                            selectedLead.prioridad === 'Baja' ? 'bg-blue-500' :
                            'bg-orange-500'
                          }`} />
                          <span className="text-sm text-gray-900 font-medium">
                            {selectedLead.prioridad}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

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
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    <div className="text-xs sm:text-sm text-red-700 mb-2">
                      {conversionErrors.general}
                    </div>
                    {(conversionErrors.general.includes('oferta confeccionada') || 
                      conversionErrors.general.includes('inversor seleccionado')) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 border-red-300 hover:bg-red-100 text-red-700"
                        onClick={() => {
                          closeConvertDialog()
                          openAsignarOfertaDialog(leadToConvert)
                        }}
                      >
                        Crear Oferta Confeccionada
                      </Button>
                    )}
                    {(conversionErrors.general.includes('provincia') || 
                      conversionErrors.general.includes('municipio')) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 border-red-300 hover:bg-red-100 text-red-700"
                        onClick={() => {
                          closeConvertDialog()
                          if (leadToConvert) {
                            onEdit(leadToConvert)
                          }
                        }}
                      >
                        Editar Lead
                      </Button>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  {/* Pregunta sobre equipo propio - solo si no hay oferta confeccionada */}
                  {conversionData.equipo_propio === undefined && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <Label className="text-sm font-semibold text-amber-900 mb-3 block">
                        ¿El equipo es propio del cliente?
                      </Label>
                      <p className="text-xs text-amber-700 mb-3">
                        Este lead no tiene una oferta confeccionada. Indica si el cliente ya tiene su propio equipo instalado o si necesitas crear una oferta confeccionada.
                      </p>
                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-amber-300 hover:bg-amber-100"
                          onClick={async () => {
                            setConversionLoading(true)
                            setConversionErrors({})
                            try {
                              // Generar código con prefijo P para equipo propio
                              const codigoGenerado = await onGenerarCodigo(leadToConvert.id || '', true)
                              
                              if (codigoGenerado.length !== 10 || !/^P\d{9}$/.test(codigoGenerado)) {
                                throw new Error('El código generado tiene un formato incorrecto')
                              }
                              
                              setConversionData(prev => ({
                                ...prev,
                                numero: codigoGenerado,
                                equipo_propio: true,
                              }))
                              setConversionErrors({})
                            } catch (error) {
                              console.error('Error generando código para equipo propio:', error)
                              const errorMessage = error instanceof Error ? error.message : 'Error al generar el código'
                              
                              // Detectar errores específicos
                              if (errorMessage.includes('provincia_montaje') || errorMessage.includes('provincia')) {
                                setConversionErrors({
                                  general: 'El lead no tiene provincia de montaje asignada. Por favor, edita el lead y asigna una provincia antes de convertirlo a cliente.'
                                })
                              } else if (errorMessage.includes('municipio')) {
                                setConversionErrors({
                                  general: 'El lead no tiene municipio asignado. Por favor, edita el lead y asigna un municipio antes de convertirlo a cliente.'
                                })
                              } else {
                                setConversionErrors({
                                  general: errorMessage
                                })
                              }
                            } finally {
                              setConversionLoading(false)
                            }
                          }}
                        >
                          Sí, es equipo propio del cliente
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-amber-300 hover:bg-amber-100"
                          onClick={() => {
                            closeConvertDialog()
                            openAsignarOfertaDialog(leadToConvert)
                          }}
                        >
                          No, crear oferta confeccionada
                        </Button>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="numero_cliente" className="text-xs sm:text-sm">Código de cliente (generado automáticamente)</Label>
                    <Input
                      id="numero_cliente"
                      value={conversionData.numero}
                      disabled
                      className="bg-gray-100 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {conversionData.equipo_propio 
                        ? 'Código con prefijo "P" para equipo propio del cliente'
                        : 'Este código se genera automáticamente basado en la marca del inversor, provincia y municipio'
                      }
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="carnet_identidad" className="text-xs sm:text-sm">Carnet de identidad</Label>
                    <Input
                      id="carnet_identidad"
                      placeholder="Ej: 12345678901"
                      value={conversionData.carnet_identidad || ''}
                      onChange={(e) => {
                        // Solo permitir números y máximo 11 dígitos
                        const value = e.target.value.replace(/\D/g, '').slice(0, 11)
                        handleConversionInputChange('carnet_identidad', value)
                      }}
                      maxLength={11}
                      className={conversionErrors.carnet_identidad ? 'border-red-500' : ''}
                      autoFocus
                    />
                    {conversionErrors.carnet_identidad ? (
                      <p className="text-xs text-red-600 mt-1">{conversionErrors.carnet_identidad}</p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">
                        Opcional - Si se proporciona, debe tener 11 dígitos
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="estado_cliente" className="text-xs sm:text-sm">Estado del cliente *</Label>
                    <Select
                      value={conversionData.estado || 'Pendiente de instalación'}
                      onValueChange={(value) => handleConversionInputChange('estado', value)}
                    >
                      <SelectTrigger id="estado_cliente">
                        <SelectValue placeholder="Selecciona un estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendiente de instalación">Pendiente de instalación</SelectItem>
                        <SelectItem value="Esperando equipo">Esperando equipo</SelectItem>
                      </SelectContent>
                    </Select>
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

      {/* Flujo guiado para elegir tipo de oferta */}
      <Dialog
        open={showOfertaFlowDialog}
        onOpenChange={(open) => {
          setShowOfertaFlowDialog(open)
          if (!open) closeOfertaFlowDialog()
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Asignar oferta</DialogTitle>
            <DialogDescription>
              {leadForAsignarOferta
                ? `${leadForAsignarOferta.nombre}`
                : "Selecciona un lead"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 min-h-0 flex flex-col">
            <div className="space-y-2 flex-shrink-0">
              <Label>Tipo de oferta</Label>
              <Select
                value={tipoOfertaSeleccionada || undefined}
                onValueChange={(value: "generica" | "personalizada") => {
                  setTipoOfertaSeleccionada(value)
                  setAccionPersonalizadaSeleccionada("")
                  setOfertasGenericasAprobadas([])
                  setOfertasGenericasAprobadasCargadas(false)
                  setOfertaGenericaParaDuplicarId("")
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tipo de oferta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generica">Generica</SelectItem>
                  <SelectItem value="personalizada">Personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipoOfertaSeleccionada === "personalizada" && (
              <div className="space-y-2 flex-shrink-0">
                <Label>Accion</Label>
                <Select
                  value={accionPersonalizadaSeleccionada || undefined}
                  onValueChange={(value: "nueva" | "duplicar") => {
                    setAccionPersonalizadaSeleccionada(value)
                    setOfertasGenericasAprobadas([])
                    setOfertasGenericasAprobadasCargadas(false)
                    setOfertaGenericaParaDuplicarId("")
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Crear nueva o duplicar y editar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nueva">Crear nueva</SelectItem>
                    <SelectItem value="duplicar">Duplicar y editar existente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {tipoOfertaSeleccionada === "personalizada" && accionPersonalizadaSeleccionada === "duplicar" && (
              <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                <Label>Selecciona la oferta genérica a duplicar</Label>
                {loadingOfertasGenericasAprobadas ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                    <span className="ml-3 text-gray-600">Cargando ofertas...</span>
                  </div>
                ) : ofertasGenericasAprobadas.length === 0 ? (
                  <div className="text-center py-8">
                    <FileCheck className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      No hay ofertas genéricas aprobadas para duplicar.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                    <div className="grid grid-cols-1 gap-2">
                      {ofertasGenericasAprobadas.map((oferta) => {
                        const maxItems = (() => {
                          const items = {
                            inversor: null as { cantidad: number; descripcion: string } | null,
                            bateria: null as { cantidad: number; descripcion: string } | null,
                            panel: null as { cantidad: number; descripcion: string } | null,
                          }
                          oferta.items?.forEach((item) => {
                            const seccion = item.seccion?.toLowerCase() || ''
                            const itemData = { cantidad: item.cantidad, descripcion: item.descripcion }
                            if (seccion === 'inversor' || seccion === 'inversores') {
                              if (!items.inversor || item.cantidad > items.inversor.cantidad) {
                                items.inversor = itemData
                              }
                            } else if (seccion === 'bateria' || seccion === 'baterias' || seccion === 'batería' || seccion === 'baterías') {
                              if (!items.bateria || item.cantidad > items.bateria.cantidad) {
                                items.bateria = itemData
                              }
                            } else if (seccion === 'panel' || seccion === 'paneles') {
                              if (!items.panel || item.cantidad > items.panel.cantidad) {
                                items.panel = itemData
                              }
                            }
                          })
                          return items
                        })()

                        const isSelected = ofertaGenericaParaDuplicarId === oferta.id

                        return (
                          <Card
                            key={oferta.id}
                            className={`border cursor-pointer transition-all ${
                              isSelected
                                ? 'border-orange-500 bg-orange-50 shadow-md'
                                : 'hover:shadow-md hover:border-orange-300'
                            }`}
                            onClick={() => setOfertaGenericaParaDuplicarId(oferta.id)}
                          >
                            <CardContent className="p-2.5">
                              <div className="flex gap-2.5">
                                {/* Foto */}
                                <div className="flex-shrink-0">
                                  <div className="w-20 h-20 bg-gray-100 rounded-md overflow-hidden relative border">
                                    {oferta.foto_portada ? (
                                      <img
                                        src={oferta.foto_portada}
                                        alt={oferta.nombre}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <FileCheck className="h-7 w-7 text-gray-300" />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Contenido */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <h3 className="font-semibold text-sm text-gray-900 truncate flex-1">
                                      {oferta.nombre}
                                    </h3>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      <span className="text-sm font-bold text-orange-600">
                                        {new Intl.NumberFormat('es-ES', {
                                          style: 'currency',
                                          currency: oferta.moneda_pago || 'USD',
                                          minimumFractionDigits: 2,
                                        }).format(oferta.precio_final)}
                                      </span>
                                      <span className="text-gray-400">|</span>
                                      <span className="text-xs font-semibold text-green-600">
                                        {oferta.margen_comercial?.toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                                    {maxItems.inversor && (
                                      <div className="flex items-center gap-1 text-gray-700">
                                        <span className="font-medium">{maxItems.inversor.cantidad}x</span>
                                        <span className="truncate max-w-[180px]">{maxItems.inversor.descripcion}</span>
                                      </div>
                                    )}
                                    {maxItems.bateria && (
                                      <div className="flex items-center gap-1 text-gray-700">
                                        <span className="font-medium">{maxItems.bateria.cantidad}x</span>
                                        <span className="truncate max-w-[180px]">{maxItems.bateria.descripcion}</span>
                                      </div>
                                    )}
                                    {maxItems.panel && (
                                      <div className="flex items-center gap-1 text-gray-700">
                                        <span className="font-medium">{maxItems.panel.cantidad}x</span>
                                        <span className="truncate max-w-[180px]">{maxItems.panel.descripcion}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Indicador de selección */}
                                <div className="flex-shrink-0 flex items-center">
                                  <div
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                      isSelected
                                        ? 'border-orange-600 bg-orange-600'
                                        : 'border-gray-300 bg-white'
                                    }`}
                                  >
                                    {isSelected && (
                                      <div className="w-2 h-2 bg-white rounded-full" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
            <Button type="button" variant="outline" onClick={closeOfertaFlowDialog}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => handleContinuarOfertaFlow()}>
              Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de crear oferta personalizada (confección) */}
      <Dialog
        open={showCrearOfertaPersonalizadaDialog}
        onOpenChange={(open) => {
          setShowCrearOfertaPersonalizadaDialog(open)
          if (!open) {
            setOfertasGenericasAprobadas([])
            setOfertasGenericasAprobadasCargadas(false)
            setLeadForAsignarOferta(null)
          }
        }}
      >
        <DialogContent className="max-w-full w-screen h-screen p-0 m-0 rounded-none border-0 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 px-6 py-4 border-b bg-white">
            <DialogTitle className="text-lg font-semibold text-slate-900">
              Crear oferta personalizada
            </DialogTitle>
            {leadForAsignarOferta && (
              <DialogDescription>
                Lead: {leadForAsignarOferta.nombre}
              </DialogDescription>
            )}
          </div>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <ConfeccionOfertasView
              modoEdicion={false}
              leadIdInicial={leadForAsignarOferta?.id}
              tipoContactoInicial="lead"
              ofertaGenericaInicial={false}
              onGuardarExito={() => {
                handleOfertaPersonalizadaConfeccionSuccess().catch((error) => {
                  console.error("Error actualizando estado tras crear oferta personalizada:", error)
                })
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de duplicar y editar oferta genérica aprobada */}
      <DuplicarOfertaDialog
        open={showDuplicarOfertaPersonalizadaDialog}
        onOpenChange={(open) => {
          setShowDuplicarOfertaPersonalizadaDialog(open)
          if (!open) {
            setOfertaGenericaParaDuplicarId("")
            setOfertasGenericasAprobadas([])
            setOfertasGenericasAprobadasCargadas(false)
            setLeadForAsignarOferta(null)
          }
        }}
        oferta={ofertaGenericaParaDuplicar}
        leadIdInicial={leadForAsignarOferta?.id}
        tipoContactoInicial="lead"
        ofertaGenericaInicial={false}
        onSuccess={() => {
          handleOfertaPersonalizadaConfeccionSuccess().catch((error) => {
            console.error("Error actualizando estado tras duplicar oferta:", error)
          })
        }}
      />

      {/* Modal de asignar oferta genérica */}
      <AsignarOfertaGenericaDialog
        open={showAsignarOfertaDialog}
        onOpenChange={(open) => {
          setShowAsignarOfertaDialog(open)
          if (!open) closeAsignarOfertaDialog()
        }}
        cliente={leadForAsignarOferta ? {
          nombre: leadForAsignarOferta.nombre,
          numero: leadForAsignarOferta.id || '',
        } as any : null}
        onAsignar={handleAsignarOferta}
        fetchOfertasGenericas={fetchOfertasGenericasAprobadas}
      />

      {/* Modal de ver oferta del lead */}
      <AsignarOfertaGenericaDialog
        open={showVerOfertaDialog}
        onOpenChange={(open) => {
          setShowVerOfertaDialog(open)
          if (!open) closeVerOfertaDialog()
        }}
        cliente={leadForAsignarOferta ? {
          nombre: leadForAsignarOferta.nombre,
          numero: leadForAsignarOferta.id || '',
        } as any : (ofertaLeadActual ? {
          nombre: ofertaLeadActual.lead_nombre || '',
          numero: ofertaLeadActual.lead_id || '',
        } as any : null)}
        modo="ver"
        ofertasExistentes={ofertasLeadActuales}
        onVerDetalles={handleVerDetallesOferta}
      />

      {/* Modal de detalles completos de una oferta específica */}
      <VerOfertaClienteDialog
        open={showDetalleOfertaDialog}
        onOpenChange={(open) => {
          setShowDetalleOfertaDialog(open)
          if (!open) closeDetalleOfertaDialog()
        }}
        oferta={ofertaLeadActual}
        ofertas={ofertasLeadActuales}
        onEditar={handleEditarOferta}
        onEliminar={handleEliminarOferta}
        onExportar={handleExportarOferta}
      />

      {/* Diálogo de Edición */}
      <EditarOfertaDialog
        open={mostrarDialogoEditar}
        onOpenChange={setMostrarDialogoEditar}
        oferta={ofertaParaEditar}
        onSuccess={async () => {
          setMostrarDialogoEditar(false)
          setOfertaParaEditar(null)
          // Recargar ofertas después de editar
          await cargarLeadsConOfertas({ skipCache: true, silent: true })
          if (refetchOfertas) refetchOfertas()
          toast({
            title: "Oferta actualizada",
            description: "Los cambios se guardaron correctamente.",
          })
        }}
      />

      {/* Diálogo de Exportación */}
      {ofertaParaExportar && (
        <ExportSelectionDialog
          open={mostrarDialogoExportar}
          onOpenChange={setMostrarDialogoExportar}
          oferta={ofertaParaExportar}
          exportOptions={generarOpcionesExportacion(ofertaParaExportar)}
        />
      )}

      {/* Diálogo de Eliminación */}
      <Dialog open={mostrarDialogoEliminar} onOpenChange={setMostrarDialogoEliminar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              ¿Eliminar oferta?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              ¿Estás seguro de que deseas eliminar la oferta{" "}
              <span className="font-semibold">{ofertaParaEliminar?.nombre}</span>?
            </p>
            <p className="text-sm text-slate-600">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={cancelarEliminarOferta}
                disabled={eliminandoOferta}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmarEliminarOferta}
                disabled={eliminandoOferta}
              >
                {eliminandoOferta ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar oferta
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
