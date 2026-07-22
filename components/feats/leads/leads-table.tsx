"use client";

import {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import { PriorityDot } from "@/components/shared/atom/priority-dot";
import { Label } from "@/components/shared/atom/label";
import { Input } from "@/components/shared/molecule/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  ConfirmDeleteDialog,
  ConfirmEditDialog,
} from "@/components/shared/molecule/dialog";
import { UploadComprobanteDialog } from "@/components/shared/molecule/upload-comprobante-dialog";
import { downloadFile } from "@/lib/utils/download-file";
import { LeadService } from "@/lib/api-services";
import MapPicker from "@/components/shared/organism/MapPickerNoSSR";
import {
  Camera,
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
  Zap,
  Battery,
  Sun,
  Globe,
  Ban,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { useOfertasPersonalizadas } from "@/hooks/use-ofertas-personalizadas";
import { useOfertasConfeccion } from "@/hooks/use-ofertas-confeccion";
import { useMaterials } from "@/hooks/use-materials";
import { useMarcas } from "@/hooks/use-marcas";
import {
  buildTerminosCondicionesHtml,
  type TerminosCondicionesPayload,
} from "@/lib/utils/terminos-condiciones-export";
import { OfertasPersonalizadasTable } from "@/components/feats/ofertas-personalizadas/ofertas-personalizadas-table";
import { CreateOfertaDialog } from "@/components/feats/ofertas-personalizadas/create-oferta-dialog";
import { EditOfertaDialog } from "@/components/feats/ofertas-personalizadas/edit-oferta-dialog";
import { AsignarOfertaGenericaDialog } from "@/components/feats/ofertas/asignar-oferta-generica-dialog";
import { VerOfertaClienteDialog } from "@/components/feats/ofertas/ver-oferta-cliente-dialog";
import { DuplicarOfertaDialog } from "@/components/feats/ofertas/duplicar-oferta-dialog";
import { EditarOfertaDialog } from "@/components/feats/ofertas/editar-oferta-dialog";
import { ExportSelectionDialog } from "@/components/feats/ofertas/export-selection-dialog";
import { ConfeccionOfertasView } from "@/components/feats/ofertas/confeccion-ofertas-view";
import { Card, CardContent } from "@/components/shared/molecule/card";
import type {
  OfertaPersonalizada,
  OfertaPersonalizadaCreateRequest,
  OfertaPersonalizadaUpdateRequest,
} from "@/lib/types/feats/ofertas-personalizadas/oferta-personalizada-types";
import type { OfertaConfeccion } from "@/hooks/use-ofertas-confeccion";
import {
  seleccionarOfertaConfirmada,
  normalizeOfertaConfeccion,
} from "@/hooks/use-ofertas-confeccion";
import { apiRequest } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import type { Lead, LeadConversionRequest, LeadFoto } from "@/lib/api-types";
import { extraerComponentesDeOfertaConfeccion } from "@/lib/utils/oferta-confeccion-items";

const CODIGO_BATERIA_ESPECIAL_NOMBRE = "FLS48100SCG01";

/** Fila compacta "etiqueta encima del valor" usada en el panel de detalle del lead. */
function LeadInfoRow({
  icon: Icon,
  label,
  value,
  strong,
}: {
  icon?: LucideIcon;
  label: string;
  value?: ReactNode;
  strong?: boolean;
}) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-start gap-2.5">
      {Icon && <Icon className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p
          className={`text-sm text-gray-900 break-words mt-0.5 ${strong ? "font-semibold" : "font-medium"}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

interface LeadsTableProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onSetLeadStatus: (
    id: string,
    activo: boolean,
  ) => Promise<
    | { success: true }
    | { success: false; error: { code: string; title: string; message: string; field?: string } }
  >;
  onConvert: (lead: Lead, data: LeadConversionRequest) => Promise<void>;
  onGenerarCodigo: (leadId: string, equipoPropio?: boolean) => Promise<string>;
  onUploadComprobante: (
    lead: Lead,
    payload: { file: File; metodo_pago?: string; moneda?: string },
  ) => Promise<void>;
  onUploadFotos?: (
    lead: Lead,
    payload: { file: File; tipo: "instalacion" | "averia" },
  ) => Promise<void>;
  onDownloadComprobante?: (lead: Lead) => Promise<void>;
  onUpdatePrioridad?: (
    leadId: string,
    prioridad: "Ninguna" | "Urgente" | "Alta" | "Media" | "Baja",
  ) => Promise<void>;
  loading?: boolean;
  disableActions?: boolean;
  /** Callback para refrescar la lista de leads (tras asignar/editar/eliminar oferta). */
  onRefreshLeads?: () => Promise<void>;
  autoOpenCrearOfertaLeadId?: string;
  autoOpenEditarOfertaLeadId?: string;
}

// Helper function to break text at approximately 25 characters
function breakTextAtLength(text: string, maxLength: number = 25): string {
  if (!text || text.length <= maxLength) return text;

  const words = text.split(" ");
  let result = "";
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + word).length <= maxLength) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) {
        result += (result ? "\n" : "") + currentLine;
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    result += (result ? "\n" : "") + currentLine;
  }

  return result || text;
}

export function LeadsTable({
  leads,
  onEdit,
  onSetLeadStatus,
  onConvert,
  onGenerarCodigo,
  onUploadComprobante,
  onUploadFotos,
  onDownloadComprobante,
  onUpdatePrioridad,
  loading,
  disableActions,
  onRefreshLeads,
  autoOpenCrearOfertaLeadId,
  autoOpenEditarOfertaLeadId,
}: LeadsTableProps) {
  const { toast } = useToast();
  const {
    ofertas,
    loading: ofertasLoading,
    createOferta,
    updateOferta,
    deleteOferta,
    loadOfertas: loadOfertasPersonalizadas,
  } = useOfertasPersonalizadas({ autoLoad: false });
  const {
    fetchOfertasGenericasAprobadas,
    asignarOfertaALead,
    obtenerOfertaPorLead,
    eliminarOferta,
    refetch: refetchOfertas,
  } = useOfertasConfeccion({ autoLoad: false });
  const ofertasPersonalizadasCargadasRef = useRef(false);
  const ofertasConfeccionCargadasRef = useRef(false);

  const ensureOfertasPersonalizadasCargadas = useCallback(() => {
    if (ofertasPersonalizadasCargadasRef.current) return;
    ofertasPersonalizadasCargadasRef.current = true;
    loadOfertasPersonalizadas();
  }, [loadOfertasPersonalizadas]);

  const ensureOfertasConfeccionCargadas = useCallback(() => {
    if (ofertasConfeccionCargadasRef.current) return;
    ofertasConfeccionCargadasRef.current = true;
    refetchOfertas();
  }, [refetchOfertas]);
  const { materials, loading: loadingMaterials } = useMaterials();
  const { marcas, loading: loadingMarcas } = useMarcas();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isToggleStatusDialogOpen, setIsToggleStatusDialogOpen] = useState(false);
  const [leadToToggleStatus, setLeadToToggleStatus] = useState<Lead | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);
  const [conversionData, setConversionData] = useState<LeadConversionRequest>({
    numero: "",
  });
  const [conversionErrors, setConversionErrors] = useState<
    Record<string, string>
  >({});
  const [conversionLoading, setConversionLoading] = useState(false);
  const [isComprobanteDialogOpen, setIsComprobanteDialogOpen] = useState(false);
  const [leadForComprobante, setLeadForComprobante] = useState<Lead | null>(
    null,
  );
  const [showUploadFotosDialog, setShowUploadFotosDialog] = useState(false);
  const [leadForUploadFotos, setLeadForUploadFotos] = useState<Lead | null>(
    null,
  );
  const [uploadFotoTipo, setUploadFotoTipo] = useState<
    "instalacion" | "averia"
  >("instalacion");
  const [uploadFotoFile, setUploadFotoFile] = useState<File | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [fotosLeadDetails, setFotosLeadDetails] = useState<LeadFoto[]>([]);
  const [loadingFotosLeadDetails, setLoadingFotosLeadDetails] = useState(false);
  const [showOfertasDialog, setShowOfertasDialog] = useState(false);
  const [selectedLeadForOfertas, setSelectedLeadForOfertas] =
    useState<Lead | null>(null);
  const [isCreateOfertaOpen, setIsCreateOfertaOpen] = useState(false);
  const autoOpenCrearOfertaTriggeredRef = useRef(false);
  useEffect(() => {
    if (!autoOpenCrearOfertaLeadId || autoOpenCrearOfertaTriggeredRef.current) {
      return;
    }
    autoOpenCrearOfertaTriggeredRef.current = true;

    (async () => {
      const leadEnPagina = leads.find(
        (l) => l.id === autoOpenCrearOfertaLeadId,
      );
      const lead =
        leadEnPagina ||
        (await LeadService.getLeadById(autoOpenCrearOfertaLeadId).catch(
          () => null,
        ));
      if (lead) {
        setLeadForAsignarOferta(lead);
        setShowCrearOfertaPersonalizadaDialog(true);
      } else {
        toast({
          title: "No se encontró el lead",
          description:
            "No se pudo abrir la oferta para este lead automáticamente.",
          variant: "destructive",
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenCrearOfertaLeadId, leads]);
  const [isEditOfertaOpen, setIsEditOfertaOpen] = useState(false);
  const [editingOferta, setEditingOferta] =
    useState<OfertaPersonalizada | null>(null);
  const [ofertaSubmitting, setOfertaSubmitting] = useState(false);

  // Estados para asignar ofertas genéricas
  const [showOfertaFlowDialog, setShowOfertaFlowDialog] = useState(false);
  const [leadForAsignarOferta, setLeadForAsignarOferta] = useState<Lead | null>(
    null,
  );
  const [tipoOfertaSeleccionada, setTipoOfertaSeleccionada] = useState<
    "generica" | "personalizada" | ""
  >("");
  const [accionPersonalizadaSeleccionada, setAccionPersonalizadaSeleccionada] =
    useState<"nueva" | "duplicar" | "">("");
  const [
    showCrearOfertaPersonalizadaDialog,
    setShowCrearOfertaPersonalizadaDialog,
  ] = useState(false);
  const [
    showDuplicarOfertaPersonalizadaDialog,
    setShowDuplicarOfertaPersonalizadaDialog,
  ] = useState(false);
  const [ofertasGenericasAprobadas, setOfertasGenericasAprobadas] = useState<
    OfertaConfeccion[]
  >([]);
  const [
    loadingOfertasGenericasAprobadas,
    setLoadingOfertasGenericasAprobadas,
  ] = useState(false);
  const [
    ofertasGenericasAprobadasCargadas,
    setOfertasGenericasAprobadasCargadas,
  ] = useState(false);
  const [ofertaGenericaParaDuplicarId, setOfertaGenericaParaDuplicarId] =
    useState("");
  const [showVerOfertaDialog, setShowVerOfertaDialog] = useState(false);
  const [showDetalleOfertaDialog, setShowDetalleOfertaDialog] = useState(false);
  const [ofertaLeadActual, setOfertaLeadActual] =
    useState<OfertaConfeccion | null>(null);
  const [ofertasLeadActuales, setOfertasLeadActuales] = useState<
    OfertaConfeccion[]
  >([]);
  const [consultandoOfertaLead, setConsultandoOfertaLead] = useState<
    string | null
  >(null);

  // Deriva si un lead tiene oferta a partir de los datos embebidos
  const leadTieneOferta = useCallback((lead: Lead) => {
    if ((lead.oferta_confeccion?.total_ofertas ?? 0) > 0) return true;
    return Boolean(
      lead.ofertas?.some(
        (o) =>
          o.inversor_codigo ||
          o.bateria_codigo ||
          o.panel_codigo ||
          o.elementos_personalizados,
      ),
    );
  }, []);

  // Estados para editar/eliminar/exportar ofertas
  const [mostrarDialogoEditar, setMostrarDialogoEditar] = useState(false);
  const [ofertaParaEditar, setOfertaParaEditar] =
    useState<OfertaConfeccion | null>(null);
  const [mostrarDialogoEliminar, setMostrarDialogoEliminar] = useState(false);
  const [ofertaParaEliminar, setOfertaParaEliminar] =
    useState<OfertaConfeccion | null>(null);
  const [eliminandoOferta, setEliminandoOferta] = useState(false);
  const [mostrarDialogoExportar, setMostrarDialogoExportar] = useState(false);
  const [ofertaParaExportar, setOfertaParaExportar] =
    useState<OfertaConfeccion | null>(null);
  const [terminosCondicionesPayload, setTerminosCondicionesPayload] =
    useState<TerminosCondicionesPayload | null>(null);

  const ofertasDelLead = useMemo(() => {
    if (!selectedLeadForOfertas) return [];
    const leadIdentifiers = [
      selectedLeadForOfertas.id,
      selectedLeadForOfertas.telefono,
    ].filter(Boolean) as string[];
    return ofertas.filter(
      (o) => o.lead_id && leadIdentifiers.includes(o.lead_id),
    );
  }, [ofertas, selectedLeadForOfertas]);

  const ofertaGenericaParaDuplicar = useMemo(
    () =>
      ofertasGenericasAprobadas.find(
        (oferta) => oferta.id === ofertaGenericaParaDuplicarId,
      ) ?? null,
    [ofertasGenericasAprobadas, ofertaGenericaParaDuplicarId],
  );

  const loadOfertasGenericasAprobadasParaDuplicar = useCallback(async () => {
    setLoadingOfertasGenericasAprobadas(true);
    try {
      const ofertas = await fetchOfertasGenericasAprobadas();
      setOfertasGenericasAprobadas(ofertas);
    } catch (error) {
      console.error(
        "Error cargando ofertas genéricas aprobadas para duplicar:",
        error,
      );
      setOfertasGenericasAprobadas([]);
    } finally {
      setLoadingOfertasGenericasAprobadas(false);
      setOfertasGenericasAprobadasCargadas(true);
    }
  }, [fetchOfertasGenericasAprobadas]);

  // Términos y condiciones: solo se usan al exportar una oferta, así que se
  // cargan de forma perezosa (la primera vez que se exporta) en vez de en
  // cada montaje del componente.
  const terminosCondicionesCargadosRef = useRef(false);
  const terminosCondicionesLoadingRef = useRef(false);

  const ensureTerminosCondicionesCargados = useCallback(async () => {
    if (terminosCondicionesCargadosRef.current) return;
    if (terminosCondicionesLoadingRef.current) return;
    terminosCondicionesLoadingRef.current = true;
    try {
      const { apiRequest } = await import("@/lib/api-config");
      const result = await apiRequest<{
        success: boolean;
        data?: TerminosCondicionesPayload;
      }>("/terminos-condiciones/activo", {
        method: "GET",
      });

      if (result.success && result.data) {
        console.log("✅ Términos y condiciones cargados");
        setTerminosCondicionesPayload(result.data);
      } else {
        console.warn("⚠️ No se encontraron términos y condiciones activos");
        setTerminosCondicionesPayload(null);
      }
      terminosCondicionesCargadosRef.current = true;
    } catch (error) {
      console.error("❌ Error cargando términos y condiciones:", error);
      setTerminosCondicionesPayload(null);
    } finally {
      terminosCondicionesLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!showOfertaFlowDialog) return;
    const necesitaGenericas =
      tipoOfertaSeleccionada === "generica" ||
      (tipoOfertaSeleccionada === "personalizada" &&
        accionPersonalizadaSeleccionada === "duplicar");
    if (!necesitaGenericas) return;
    if (ofertasGenericasAprobadasCargadas || loadingOfertasGenericasAprobadas)
      return;

    loadOfertasGenericasAprobadasParaDuplicar().catch((error) => {
      console.error("Error precargando ofertas genéricas aprobadas:", error);
    });
  }, [
    showOfertaFlowDialog,
    tipoOfertaSeleccionada,
    accionPersonalizadaSeleccionada,
    ofertasGenericasAprobadasCargadas,
    loadingOfertasGenericasAprobadas,
    loadOfertasGenericasAprobadasParaDuplicar,
  ]);

  const openAsignarOfertaDialog = async (lead: Lead) => {
    try {
      ensureOfertasConfeccionCargadas();
      console.log("Click en boton de oferta para lead:", lead.id);
      const leadId = lead.id;
      if (!leadId) {
        toast({
          title: "Error",
          description: "El lead no tiene ID válido.",
          variant: "destructive",
        });
        return;
      }

      // Verificar con el servidor
      console.log("🔍 Verificando oferta en servidor para lead:", leadId);
      const result = await obtenerOfertaPorLead(leadId);
      console.log("📡 Resultado de verificacion:", result);

      if (result.success && result.oferta) {
        const ofertas = result.ofertas?.length
          ? result.ofertas
          : [result.oferta];
        setOfertasLeadActuales(ofertas);
        setOfertaLeadActual(result.oferta);

        // Si solo tiene UNA oferta, abrir directamente el diálogo de detalles
        if (ofertas.length === 1) {
          setShowDetalleOfertaDialog(true);
        } else {
          // Si tiene MÚLTIPLES ofertas, mostrar el listado primero
          setLeadForAsignarOferta(lead);
          setShowVerOfertaDialog(true);
        }
        return;
      }

      if (result.error) {
        toast({
          title: "Error al verificar oferta",
          description:
            "No se pudo comprobar la oferta del lead. Intenta nuevamente.",
          variant: "destructive",
        });
        return;
      }

      // Mostrar flujo guiado para asignar oferta
      setLeadForAsignarOferta(lead);
      setShowOfertaFlowDialog(true);
    } catch (error) {
      console.error("Error en openAsignarOfertaDialog:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar la oferta de este lead.",
        variant: "destructive",
      });
    }
  };

  const closeOfertaFlowDialog = () => {
    setShowOfertaFlowDialog(false);
    setTipoOfertaSeleccionada("");
    setAccionPersonalizadaSeleccionada("");
    setOfertasGenericasAprobadas([]);
    setOfertaGenericaParaDuplicarId("");
    setOfertasGenericasAprobadasCargadas(false);
    setLoadingOfertasGenericasAprobadas(false);
    setLeadForAsignarOferta(null);
  };

  const handleContinuarOfertaFlow = async () => {
    if (!leadForAsignarOferta) return;

    if (!tipoOfertaSeleccionada) {
      toast({
        title: "Selecciona el tipo de oferta",
        description: "Debes elegir si será genérica o personalizada.",
        variant: "destructive",
      });
      return;
    }

    if (tipoOfertaSeleccionada === "generica") {
      if (!ofertaGenericaParaDuplicarId) {
        toast({
          title: "Selecciona una oferta genérica",
          description: "Escoge qué oferta aprobada deseas asignar al lead.",
          variant: "destructive",
        });
        return;
      }
      await handleAsignarOferta(ofertaGenericaParaDuplicarId);
      return;
    }

    if (!accionPersonalizadaSeleccionada) {
      toast({
        title: "Selecciona una acción",
        description:
          "Indica si deseas crear una nueva o duplicar y editar una existente.",
        variant: "destructive",
      });
      return;
    }

    if (accionPersonalizadaSeleccionada === "nueva") {
      setShowOfertaFlowDialog(false);
      setTipoOfertaSeleccionada("");
      setAccionPersonalizadaSeleccionada("");
      setOfertasGenericasAprobadas([]);
      setOfertaGenericaParaDuplicarId("");
      setOfertasGenericasAprobadasCargadas(false);
      setShowCrearOfertaPersonalizadaDialog(true);
      return;
    }

    if (!ofertaGenericaParaDuplicarId) {
      toast({
        title: "Selecciona una oferta genérica",
        description: "Escoge qué oferta aprobada deseas duplicar y editar.",
        variant: "destructive",
      });
      return;
    }

    setShowOfertaFlowDialog(false);
    setTipoOfertaSeleccionada("");
    setAccionPersonalizadaSeleccionada("");
    setOfertasGenericasAprobadasCargadas(false);
    setShowDuplicarOfertaPersonalizadaDialog(true);
  };

  const handleOfertaPersonalizadaConfeccionSuccess = async () => {
    setShowCrearOfertaPersonalizadaDialog(false);
    setShowDuplicarOfertaPersonalizadaDialog(false);
    setOfertasGenericasAprobadas([]);
    setOfertasGenericasAprobadasCargadas(false);
    setOfertaGenericaParaDuplicarId("");
    setLeadForAsignarOferta(null);
    // Refrescar lista para reflejar la nueva oferta en la columna y el botón
    onRefreshLeads?.();
  };

  const handleAsignarOferta = async (ofertaGenericaId: string) => {
    if (!leadForAsignarOferta?.id) return;

    const result = await asignarOfertaALead(
      ofertaGenericaId,
      leadForAsignarOferta.id,
    );

    if (result.success) {
      const leadId = leadForAsignarOferta.id;

      console.log("✅ Oferta asignada exitosamente");
      console.log("📝 Lead ID:", leadId);

      closeOfertaFlowDialog();

      // Refrescar la lista para que el botón verde se actualice
      onRefreshLeads?.();

      toast({
        title: "✅ Oferta asignada",
        description: "El lead ahora tiene una oferta asignada",
      });
    }
  };

  const closeVerOfertaDialog = () => {
    setShowVerOfertaDialog(false);
    setOfertaLeadActual(null);
    setOfertasLeadActuales([]);
  };

  const handleVerDetallesOferta = (oferta: OfertaConfeccion) => {
    setOfertaLeadActual(oferta);
    setOfertasLeadActuales([oferta]);
    setShowVerOfertaDialog(false);
    setShowDetalleOfertaDialog(true);
  };

  const closeDetalleOfertaDialog = () => {
    setShowDetalleOfertaDialog(false);
    setOfertaLeadActual(null);
  };

  const openDetailDialog = async (lead: Lead) => {
    setSelectedLead(lead);
    setIsDetailDialogOpen(true);
    setLoadingFotosLeadDetails(true);

    try {
      if (!lead.id) {
        setFotosLeadDetails([]);
        return;
      }
      const fotos = await LeadService.getFotosLead(lead.id);
      setFotosLeadDetails(fotos);
    } catch (error) {
      console.error("Error cargando fotos del lead:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los archivos del lead.",
        variant: "destructive",
      });
      setFotosLeadDetails([]);
    } finally {
      setLoadingFotosLeadDetails(false);
    }
  };

  const openUploadFotosDialog = (lead: Lead) => {
    if (!onUploadFotos) return;
    setLeadForUploadFotos(lead);
    setUploadFotoTipo("instalacion");
    setUploadFotoFile(null);
    setShowUploadFotosDialog(true);
  };

  const closeUploadFotosDialog = () => {
    setShowUploadFotosDialog(false);
    setLeadForUploadFotos(null);
    setUploadFotoTipo("instalacion");
    setUploadFotoFile(null);
    setUploadingFoto(false);
  };

  const handleUploadFotosLead = async () => {
    if (!leadForUploadFotos || !uploadFotoFile || !onUploadFotos) return;

    try {
      setUploadingFoto(true);
      await onUploadFotos(leadForUploadFotos, {
        file: uploadFotoFile,
        tipo: uploadFotoTipo,
      });
      closeUploadFotosDialog();
      if (selectedLead?.id && leadForUploadFotos.id === selectedLead.id) {
        const fotos = await LeadService.getFotosLead(selectedLead.id);
        setFotosLeadDetails(fotos);
      }
    } catch (error) {
      console.error("Error subiendo foto/video del lead:", error);
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleToggleStatusClick = (lead: Lead) => {
    setLeadToToggleStatus(lead);
    setIsToggleStatusDialogOpen(true);
  };

  const handleToggleStatusConfirm = async () => {
    if (!leadToToggleStatus?.id) return;
    const activar = leadToToggleStatus.activo === false;
    setTogglingStatus(true);
    try {
      const resultado = await onSetLeadStatus(leadToToggleStatus.id, activar);
      if (resultado.success) {
        toast({
          title: "Éxito",
          description: activar
            ? "Lead reactivado correctamente"
            : "Lead anulado correctamente",
        });
        setIsToggleStatusDialogOpen(false);
        setLeadToToggleStatus(null);
      } else {
        toast({
          title: resultado.error.title || "Error",
          description: resultado.error.message,
          variant: "destructive",
        });
      }
    } finally {
      setTogglingStatus(false);
    }
  };

  const handlePrioridadChange = async (
    leadId: string,
    prioridad: "Ninguna" | "Urgente" | "Alta" | "Media" | "Baja",
  ) => {
    if (onUpdatePrioridad) {
      try {
        await onUpdatePrioridad(leadId, prioridad);
        toast({
          title: "Prioridad actualizada",
          description: `La prioridad se cambió a ${prioridad}`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar la prioridad",
          variant: "destructive",
        });
      }
    }
  };

  const resetConversionState = () => {
    setConversionData({
      numero: "",
      metodo_pago: "",
      moneda: "",
      equipo_propio: undefined,
    });
    setConversionErrors({});
    setConversionLoading(false);
  };

  const openConvertDialog = (lead: Lead) => {
    console.log("🔵 openConvertDialog called for lead:", lead.id);
    setLeadToConvert(lead);
    setConversionErrors({});
    setConversionLoading(false);
    setConversionData({
      numero: "",
      carnet_identidad: "",
      estado: "Pendiente de instalación",
      equipo_propio: undefined,
    });
    setIsConvertDialogOpen(true);
  };

  const closeConvertDialog = () => {
    setIsConvertDialogOpen(false);
    setLeadToConvert(null);
    resetConversionState();
  };

  const setConversionBackendError = (errorMessage: string) => {
    if (errorMessage.includes("ofertas confeccionadas")) {
      setConversionErrors({
        general:
          "Este lead necesita una oferta confeccionada antes de generar el código. Crea una oferta confeccionada o marca el equipo como propio del cliente.",
      });
      return;
    }
    if (errorMessage.includes("inversor seleccionado")) {
      setConversionErrors({
        general:
          "La oferta confeccionada debe tener un inversor seleccionado. Edita la oferta o marca el equipo como propio del cliente.",
      });
      return;
    }
    if (errorMessage.includes("marca_id")) {
      setConversionErrors({
        general:
          "El material inversor no tiene marca asignada. Contacta al administrador para configurar la marca del material.",
      });
      return;
    }
    if (
      errorMessage.includes("provincia_montaje") ||
      errorMessage.includes("provincia")
    ) {
      setConversionErrors({
        general:
          "El lead no tiene provincia de montaje asignada. Por favor, edita el lead y asigna una provincia antes de convertirlo a cliente.",
      });
      return;
    }
    if (errorMessage.includes("municipio")) {
      setConversionErrors({
        general:
          "El lead no tiene municipio asignado. Por favor, edita el lead y asigna un municipio antes de convertirlo a cliente.",
      });
      return;
    }
    setConversionErrors({ general: errorMessage });
  };

  const handleSeleccionEquipoPropio = (esEquipoPropio: boolean) => {
    setConversionData((prev) => ({
      ...prev,
      numero: "",
      equipo_propio: esEquipoPropio,
    }));

    if (conversionErrors.general) {
      setConversionErrors((prev) => {
        const { general: _general, ...rest } = prev;
        return rest;
      });
    }
  };

  const leadTieneOfertaConfeccionada = Boolean(
    leadToConvert && leadTieneOferta(leadToConvert),
  );

  const handleComprobanteDialogOpenChange = (open: boolean) => {
    setIsComprobanteDialogOpen(open);
    if (!open) {
      setLeadForComprobante(null);
    }
  };

  const handleComprobanteSubmit = async (payload: {
    file: File;
    metodo_pago?: string;
    moneda?: string;
  }) => {
    if (!leadForComprobante) {
      throw new Error("No se encontró el lead seleccionado");
    }
    await onUploadComprobante(leadForComprobante, payload);
  };

  const handleDownloadComprobante = async (lead: Lead) => {
    if (!lead.comprobante_pago_url) {
      return;
    }

    try {
      if (onDownloadComprobante) {
        await onDownloadComprobante(lead);
        return;
      }

      await downloadFile(
        lead.comprobante_pago_url,
        `comprobante-lead-${lead.nombre || lead.id || "archivo"}`,
      );
    } catch (error) {
      console.error("Error downloading comprobante for lead", lead.id, error);
    }
  };

  const closeOfertasDialog = () => {
    setShowOfertasDialog(false);
    setSelectedLeadForOfertas(null);
    setIsCreateOfertaOpen(false);
    setIsEditOfertaOpen(false);
    setEditingOferta(null);
  };

  const handleCreateOfertaLead = async (
    payload: OfertaPersonalizadaCreateRequest,
  ) => {
    if (!selectedLeadForOfertas?.id) return;
    setOfertaSubmitting(true);
    try {
      const success = await createOferta({
        ...payload,
        lead_id: selectedLeadForOfertas.id,
        cliente_id: undefined,
      });
      toast({
        title: success ? "Oferta creada" : "No se pudo crear la oferta",
        description: success
          ? "Se registró la oferta personalizada para el lead."
          : "Intenta nuevamente más tarde.",
        variant: success ? "default" : "destructive",
      });
      if (success) {
        setIsCreateOfertaOpen(false);
      }
    } finally {
      setOfertaSubmitting(false);
    }
  };

  const handleUpdateOfertaLead = async (
    id: string,
    data: OfertaPersonalizadaUpdateRequest,
  ) => {
    if (!selectedLeadForOfertas?.id || !id) return;
    setOfertaSubmitting(true);
    try {
      // ✅ SOLUCIÓN: Solo enviar lead_id, no enviar cliente_id
      // Según documentación en docs/SOLUCION_ERROR_MULTIPLES_CONTACTOS.md
      const updateData: OfertaPersonalizadaUpdateRequest = {
        ...data,
        lead_id: selectedLeadForOfertas.id,
      };
      // No agregar cliente_id para evitar el error de múltiples contactos

      const success = await updateOferta(id, updateData);
      toast({
        title: success
          ? "Oferta actualizada"
          : "No se pudo actualizar la oferta",
        description: success
          ? "Cambios guardados correctamente."
          : "Intenta nuevamente más tarde.",
        variant: success ? "default" : "destructive",
      });
      if (success) {
        setIsEditOfertaOpen(false);
        setEditingOferta(null);
      }
    } finally {
      setOfertaSubmitting(false);
    }
  };

  const handleDeleteOfertaLead = async (id: string) => {
    if (!id) return;
    setOfertaSubmitting(true);
    try {
      const success = await deleteOferta(id);
      toast({
        title: success ? "Oferta eliminada" : "No se pudo eliminar",
        description: success
          ? "Se eliminó la oferta personalizada."
          : "Intenta nuevamente.",
        variant: success ? "default" : "destructive",
      });
    } finally {
      setOfertaSubmitting(false);
    }
  };

  // Funciones para manejar ofertas confeccionadas
  const handleEditarOferta = (oferta: OfertaConfeccion) => {
    setOfertaParaEditar(oferta);
    setMostrarDialogoEditar(true);
    // Cerrar el diálogo de detalles si está abierto
    setShowDetalleOfertaDialog(false);
  };

  const autoOpenEditarOfertaTriggeredRef = useRef(false);
  useEffect(() => {
    if (
      !autoOpenEditarOfertaLeadId ||
      autoOpenEditarOfertaTriggeredRef.current
    ) {
      return;
    }
    autoOpenEditarOfertaTriggeredRef.current = true;

    (async () => {
      const result = await obtenerOfertaPorLead(autoOpenEditarOfertaLeadId);
      if (result.success && result.oferta) {
        handleEditarOferta(result.oferta);
      } else {
        toast({
          title: "No se encontró la oferta",
          description:
            "No se pudo abrir la oferta de este lead automáticamente.",
          variant: "destructive",
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenEditarOfertaLeadId]);

  const handleEliminarOferta = (oferta: OfertaConfeccion) => {
    setOfertaParaEliminar(oferta);
    setMostrarDialogoEliminar(true);
    // Cerrar el diálogo de detalles si está abierto
    setShowDetalleOfertaDialog(false);
  };

  const confirmarEliminarOferta = async () => {
    if (!ofertaParaEliminar) return;

    setEliminandoOferta(true);
    try {
      await eliminarOferta(ofertaParaEliminar.id);
      setMostrarDialogoEliminar(false);
      setOfertaParaEliminar(null);

      // Refrescar para que el botón vuelva a gris si era la última oferta
      onRefreshLeads?.();

      toast({
        title: "Oferta eliminada",
        description: "La oferta se eliminó correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la oferta.",
        variant: "destructive",
      });
    } finally {
      setEliminandoOferta(false);
    }
  };

  const cancelarEliminarOferta = () => {
    setMostrarDialogoEliminar(false);
    setOfertaParaEliminar(null);
  };

  // Generar opciones de exportación para una oferta (similar a ofertas-confeccionadas-view)
  const generarOpcionesExportacion = useCallback(
    (oferta: OfertaConfeccion) => {
      console.log(
        "🚀 generarOpcionesExportacion INICIANDO para oferta:",
        oferta.id,
      );

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
      ]);

      const calcularTotalesDetalle = (oferta: OfertaConfeccion) => {
        const totalMateriales = oferta.total_materiales || 0;
        const margenInstalacion = oferta.margen_instalacion || 0;
        const costoTransportacion = oferta.costo_transportacion || 0;
        const totalElementosPersonalizados =
          oferta.total_elementos_personalizados || 0;
        const totalCostosExtras = oferta.total_costos_extras || 0;

        const subtotalConMargen = totalMateriales + margenInstalacion;
        const baseParaContribucion =
          subtotalConMargen +
          costoTransportacion +
          totalElementosPersonalizados +
          totalCostosExtras;

        const contribucion =
          oferta.aplica_contribucion && oferta.porcentaje_contribucion
            ? baseParaContribucion * (oferta.porcentaje_contribucion / 100)
            : 0;

        const subtotalAntesDescuento = baseParaContribucion + contribucion;

        const descuentoPorcentaje =
          parseFloat(oferta.descuento_porcentaje as any) || 0;
        const montoDescuento =
          descuentoPorcentaje > 0
            ? subtotalAntesDescuento * (descuentoPorcentaje / 100)
            : 0;

        const subtotalConDescuento = subtotalAntesDescuento - montoDescuento;
        const totalSinRedondeo = subtotalConDescuento;
        const precioFinal = Math.ceil(totalSinRedondeo);
        const redondeo = precioFinal - totalSinRedondeo;

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
        };
      };

      // Buscar el lead asociado
      const lead = leads.find((l) => l.id === oferta.lead_id);

      // Crear mapas de materiales y marcas
      const materialesMap = new Map(
        materials.map((m) => [m.codigo.toString(), m]),
      );
      const marcasMap = new Map(
        marcas.map((marca) => [marca.id, marca.nombre]),
      );

      // Orden de secciones
      const ordenSeccionesBase = [
        "INVERSORES",
        "BATERIAS",
        "PANELES",
        "MPPT",
        "ESTRUCTURAS",
        "CABLEADO_DC",
        "CABLEADO_AC",
        "CANALIZACION",
        "TIERRA",
        "PROTECCIONES_ELECTRICAS",
        "MATERIAL_VARIO",
      ];

      const seccionesPersonalizadasOferta =
        oferta.secciones_personalizadas || [];
      const ordenSecciones = [
        ...ordenSeccionesBase,
        ...seccionesPersonalizadasOferta.map((s: any) => s.id),
      ];

      const ordenarItemsPorSeccion = (items: any[]) => {
        return [...items].sort((a, b) => {
          const indexA = ordenSecciones.indexOf(a.seccion);
          const indexB = ordenSecciones.indexOf(b.seccion);
          const posA = indexA === -1 ? 999 : indexA;
          const posB = indexB === -1 ? 999 : indexB;
          return posA - posB;
        });
      };

      const itemsOrdenados = ordenarItemsPorSeccion(oferta.items || []);

      // Generar nombre base del archivo
      let baseFilename = (oferta.nombre || "oferta")
        .replace(/[<>:"/\\|?*]/g, "")
        .replace(/\s+/g, "_")
        .replace(/,\s*/g, "+")
        .replace(/_+/g, "_")
        .trim();

      if (oferta.tipo === "personalizada" && lead) {
        const nombreContacto = lead.nombre_completo || lead.nombre || "";
        if (nombreContacto) {
          const nombreLimpio = nombreContacto
            .replace(/[<>:"/\\|?*]/g, "")
            .replace(/\s+/g, "_")
            .replace(/_+/g, "_")
            .trim();
          baseFilename = `${baseFilename}-${nombreLimpio}`;
        }
      }

      const tasaCambioNumero = oferta.tasa_cambio || 0;
      const montoConvertido =
        tasaCambioNumero > 0 && oferta.moneda_pago !== "USD"
          ? oferta.moneda_pago === "EUR"
            ? (oferta.precio_final || 0) / tasaCambioNumero
            : (oferta.precio_final || 0) * tasaCambioNumero
          : 0;
      const tieneMonedaCambio =
        oferta.moneda_pago !== "USD" && tasaCambioNumero > 0;
      const codigoMonedaCambio = tieneMonedaCambio ? oferta.moneda_pago : "USD";
      const simboloMonedaCambio =
        oferta.moneda_pago === "EUR"
          ? "€"
          : oferta.moneda_pago === "CUP"
            ? "CUP"
            : "$";
      const convertirMontoMonedaPago = (monto: number) => {
        if (!tieneMonedaCambio) return monto;
        return oferta.moneda_pago === "EUR"
          ? monto / tasaCambioNumero
          : monto * tasaCambioNumero;
      };
      const convertirTextoTotalMonedaPago = (valor: unknown) => {
        if (
          !tieneMonedaCambio ||
          valor === null ||
          valor === undefined ||
          valor === ""
        ) {
          return valor;
        }

        if (typeof valor === "number") {
          return convertirMontoMonedaPago(valor).toFixed(2);
        }

        const valorStr = valor.toString().trim();
        const esNegativo = valorStr.startsWith("-");
        const normalizado = valorStr.replace(",", ".").replace(/[^0-9.-]/g, "");
        const numero = Number.parseFloat(normalizado);

        if (!Number.isFinite(numero)) return valor;

        const montoBase = esNegativo ? -Math.abs(numero) : numero;
        const convertido = convertirMontoMonedaPago(montoBase);
        const textoMonto = Math.abs(convertido).toFixed(2);
        return convertido < 0 ? `- ${textoMonto}` : textoMonto;
      };

      // EXPORTACIÓN COMPLETA
      const rowsCompleto: any[] = [];
      itemsOrdenados.forEach((item) => {
        let seccionLabel = seccionLabelMap.get(item.seccion) ?? item.seccion;

        if (
          seccionLabel === item.seccion &&
          seccionesPersonalizadasOferta.length > 0
        ) {
          const seccionPersonalizada = seccionesPersonalizadasOferta.find(
            (s: any) => s.id === item.seccion,
          );
          if (seccionPersonalizada) {
            seccionLabel = seccionPersonalizada.label;
          }
        }

        const material = materialesMap.get(item.material_codigo?.toString());
        const nombreMaterial = material?.nombre || item.descripcion;

        const margenAsignado = (item as any).margen_asignado || 0;
        const costoItem = item.precio * item.cantidad;

        const porcentajeMargen =
          costoItem > 0 && margenAsignado > 0
            ? (margenAsignado / costoItem) * 100
            : 0;

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
        });
      });

      const totalMateriales = itemsOrdenados.reduce((sum, item) => {
        const margenAsignado = (item as any).margen_asignado || 0;
        const costoItem = item.precio * item.cantidad;
        return sum + costoItem + margenAsignado;
      }, 0);

      // Agregar secciones personalizadas de tipo costo
      if (seccionesPersonalizadasOferta.length > 0) {
        seccionesPersonalizadasOferta.forEach((seccion: any) => {
          if (
            seccion.tipo === "extra" &&
            seccion.tipo_extra === "costo" &&
            seccion.costos_extras
          ) {
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
              });
            });
          }
        });
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
      });

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
        });
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
        });
      }

      const descuentoPorcentaje =
        parseFloat(oferta.descuento_porcentaje as any) || 0;
      const montoDescuento = parseFloat(oferta.monto_descuento as any) || 0;

      if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
        const totalesCalc = calcularTotalesDetalle(oferta);
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
        });
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
        });
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
      });

      if (
        oferta.pago_transferencia ||
        oferta.aplica_contribucion ||
        (oferta.moneda_pago !== "USD" && tasaCambioNumero > 0)
      ) {
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
          });

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
            });
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
        });

        const totalesCalc = calcularTotalesDetalle(oferta);
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
          });
        }

        if (oferta.moneda_pago !== "USD" && tasaCambioNumero > 0) {
          const simboloMoneda = oferta.moneda_pago === "EUR" ? "€" : "CUP";
          const nombreMoneda =
            oferta.moneda_pago === "EUR"
              ? "Euros (EUR)"
              : "Pesos Cubanos (CUP)";

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
          });

          const tasaTexto =
            oferta.moneda_pago === "EUR"
              ? `1 EUR = ${tasaCambioNumero} USD`
              : `1 USD = ${tasaCambioNumero} CUP`;

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
          });

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
          });
        }
      }

      // Crear mapa de fotos. Salta las fotos marcadas como no disponibles por el
      // health check server-side (foto_disponible === false).
      const fotosMap = new Map<string, string>();
      itemsOrdenados.forEach((item) => {
        const material = materials.find(
          (m) => m.codigo.toString() === item.material_codigo,
        );
        if (material?.foto && material.foto_disponible !== false) {
          fotosMap.set(item.material_codigo?.toString(), material.foto);
        }
      });

      // Extraer componentes principales (simplificado para leads)
      const componentesPrincipales: any = {};
      const itemsInversores = itemsOrdenados.filter(
        (item) => item.seccion === "INVERSORES",
      );
      if (itemsInversores.length > 0) {
        const inversor = itemsInversores[0];
        const material = materials.find(
          (m) => m.codigo.toString() === inversor.material_codigo,
        );
        const potencia = material?.potenciaKW || 0;
        const marcaId = material?.marca_id;
        const marca = marcaId ? marcasMap.get(marcaId) : undefined;

        componentesPrincipales.inversor = {
          codigo: inversor.material_codigo,
          cantidad: inversor.cantidad,
          potencia: potencia,
          marca: marca,
        };
      }

      const itemsBaterias = itemsOrdenados.filter(
        (item) => item.seccion === "BATERIAS",
      );
      if (itemsBaterias.length > 0) {
        const codigoBateriaSeleccionada = (
          (oferta as { bateria_seleccionada?: string | number | null })
            .bateria_seleccionada || ""
        )
          .toString()
          .trim();
        const codigoBateriaBase =
          codigoBateriaSeleccionada &&
          itemsBaterias.some(
            (item) =>
              item.material_codigo?.toString() === codigoBateriaSeleccionada,
          )
            ? codigoBateriaSeleccionada
            : itemsBaterias[0]?.material_codigo?.toString() || "";
        const itemsBateriaBase = itemsBaterias.filter(
          (item) => item.material_codigo?.toString() === codigoBateriaBase,
        );
        const cantidadBateriaSeleccionada = itemsBateriaBase.reduce(
          (sum, bat) => sum + (Number(bat.cantidad) || 0),
          0,
        );
        const materialSeleccionado = materials.find(
          (m) => m.codigo.toString() === codigoBateriaBase,
        );
        const capacidadSeleccionada = materialSeleccionado?.potenciaKW || 0;
        const itemsBateriaEspecial = itemsBaterias.filter(
          (item) =>
            item.material_codigo?.toString() ===
              CODIGO_BATERIA_ESPECIAL_NOMBRE &&
            item.material_codigo?.toString() !== codigoBateriaBase,
        );
        const cantidadBateriaEspecial = itemsBateriaEspecial.reduce(
          (sum, bat) => sum + (Number(bat.cantidad) || 0),
          0,
        );
        const materialEspecial = materials.find(
          (m) => m.codigo.toString() === CODIGO_BATERIA_ESPECIAL_NOMBRE,
        );
        const capacidadEspecial =
          cantidadBateriaEspecial > 0 ? materialEspecial?.potenciaKW || 0 : 0;

        const cantidadBateria =
          cantidadBateriaSeleccionada + cantidadBateriaEspecial;
        const capacidadTotal =
          cantidadBateriaSeleccionada * capacidadSeleccionada +
          cantidadBateriaEspecial * capacidadEspecial;
        const capacidad =
          cantidadBateria > 0 ? capacidadTotal / cantidadBateria : 0;

        componentesPrincipales.bateria = {
          codigo: codigoBateriaBase,
          cantidad: cantidadBateria,
          capacidad: capacidad,
        };
      }

      const itemsPaneles = itemsOrdenados.filter(
        (item) => item.seccion === "PANELES",
      );
      if (itemsPaneles.length > 0) {
        const panel = itemsPaneles[0];
        const material = materials.find(
          (m) => m.codigo.toString() === panel.material_codigo,
        );
        const potenciaKW = material?.potenciaKW || 0;
        const potencia = potenciaKW * 1000;

        componentesPrincipales.panel = {
          codigo: panel.material_codigo,
          cantidad: panel.cantidad,
          potencia: potencia,
        };
      }

      const terminosCondicionesExport = buildTerminosCondicionesHtml(
        terminosCondicionesPayload,
        { oferta },
      );

      const exportOptionsCompleto = {
        title: "Oferta - Exportación completa",
        subtitle:
          oferta.nombre_completo &&
          oferta.nombre_completo !== "0.00" &&
          isNaN(Number(oferta.nombre_completo))
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
        logoUrl: "/brand/suncar-v1-iso.png",
        leadData:
          oferta.tipo === "personalizada" && lead
            ? {
                id: lead.id,
                nombre: lead.nombre_completo || lead.nombre,
                telefono: lead.telefono,
                email: lead.email,
                provincia: lead.provincia,
                direccion: lead.direccion,
                atencion_de: lead.nombre_completo || lead.nombre,
              }
            : undefined,
        leadSinAgregarData:
          oferta.tipo === "personalizada" && oferta.nombre_lead_sin_agregar
            ? {
                nombre: oferta.nombre_lead_sin_agregar,
                atencion_de: oferta.nombre_lead_sin_agregar,
              }
            : undefined,
        ofertaData: {
          numero_oferta: oferta.numero_oferta || oferta.id,
          nombre_oferta: oferta.nombre_completo || oferta.nombre,
          tipo_oferta:
            oferta.tipo === "generica" ? "Genérica" : "Personalizada",
        },
        incluirFotos: true,
        fotosMap,
        componentesPrincipales,
        terminosCondiciones: terminosCondicionesExport || undefined,
        seccionesPersonalizadas: seccionesPersonalizadasOferta.filter(
          (s: any) =>
            s.tipo === "extra" &&
            (s.tipo_extra === "escritura" || s.tipo_extra === "costo"),
        ),
      };

      // EXPORTACIÓN SIN PRECIOS (copiado exactamente de ofertas-confeccionadas-view)
      const rowsSinPrecios: any[] = [];
      itemsOrdenados.forEach((item) => {
        let seccionLabel = seccionLabelMap.get(item.seccion) ?? item.seccion;

        if (
          seccionLabel === item.seccion &&
          seccionesPersonalizadasOferta.length > 0
        ) {
          const seccionPersonalizada = seccionesPersonalizadasOferta.find(
            (s: any) => s.id === item.seccion,
          );
          if (seccionPersonalizada) {
            seccionLabel = seccionPersonalizada.label;
          }
        }

        const material = materialesMap.get(item.material_codigo?.toString());
        const nombreMaterial = material?.nombre || item.descripcion;

        rowsSinPrecios.push({
          material_codigo: item.material_codigo,
          seccion: seccionLabel,
          tipo: "Material",
          descripcion: nombreMaterial,
          cantidad: item.cantidad,
        });
      });

      // Agregar secciones personalizadas de tipo costo (sin precios)
      if (seccionesPersonalizadasOferta.length > 0) {
        seccionesPersonalizadasOferta.forEach((seccion: any) => {
          if (
            seccion.tipo === "extra" &&
            seccion.tipo_extra === "costo" &&
            seccion.costos_extras
          ) {
            seccion.costos_extras.forEach((costo: any) => {
              rowsSinPrecios.push({
                material_codigo: "",
                seccion: seccion.label,
                tipo: "Costo extra",
                descripcion: costo.descripcion,
                cantidad: costo.cantidad,
              });
            });
          }
        });
      }

      rowsSinPrecios.push({
        material_codigo: "",
        seccion: "Totales",
        tipo: "Subtotal",
        descripcion: "Total de materiales",
        cantidad: "",
      });

      if (oferta.margen_instalacion && oferta.margen_instalacion > 0) {
        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "Servicios",
          tipo: "Servicio",
          descripcion: "Costo de instalación y puesta en marcha",
          cantidad: 1,
        });
      }

      if (oferta.costo_transportacion && oferta.costo_transportacion > 0) {
        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "Logística",
          tipo: "Transportación",
          descripcion: "Costo de transportación",
          cantidad: 1,
          total: oferta.costo_transportacion.toFixed(2),
        });
      }

      if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
        const totalesCalc = calcularTotalesDetalle(oferta);
        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "Contribución",
          tipo: "Contribucion",
          descripcion: `Contribución (${oferta.porcentaje_contribucion}%)`,
          cantidad: 1,
          total: totalesCalc.contribucion.toFixed(2),
        });
      }

      if (oferta.descuento_porcentaje && oferta.descuento_porcentaje > 0) {
        const totalesCalc = calcularTotalesDetalle(oferta);
        const montoDescuento =
          totalesCalc.montoDescuento || oferta.monto_descuento || 0;
        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "Descuento",
          tipo: "Descuento",
          descripcion: `Descuento aplicado (${oferta.descuento_porcentaje}%)`,
          cantidad: 1,
          total: `- ${montoDescuento.toFixed(2)}`,
        });
      }

      rowsSinPrecios.push({
        material_codigo: "",
        seccion: "Totales",
        tipo: "TOTAL",
        descripcion: "Precio Total",
        cantidad: "",
        total: (oferta.precio_final || 0).toFixed(2),
      });

      // Datos de pago para sin precios
      if (
        oferta.pago_transferencia ||
        oferta.aplica_contribucion ||
        (oferta.moneda_pago !== "USD" && tasaCambioNumero > 0)
      ) {
        if (oferta.pago_transferencia) {
          rowsSinPrecios.push({
            material_codigo: "",
            seccion: "PAGO",
            tipo: "Info",
            descripcion: "✓ Pago por transferencia",
            cantidad: "",
          });

          if (oferta.datos_cuenta) {
            rowsSinPrecios.push({
              material_codigo: "",
              seccion: "PAGO",
              tipo: "Datos",
              descripcion: "Datos de la cuenta",
              cantidad: "",
              total: oferta.datos_cuenta,
            });
          }
        }

        if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
          rowsSinPrecios.push({
            material_codigo: "",
            seccion: "PAGO",
            tipo: "Info",
            descripcion: `✓ Aplicar ${oferta.porcentaje_contribucion}% de Contribución`,
            cantidad: "",
          });
        }

        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "TOTAL",
          descripcion: "Precio Final",
          cantidad: "",
          total: (oferta.precio_final || 0).toFixed(2),
        });

        const totalesCalc = calcularTotalesDetalle(oferta);
        if (Math.abs(totalesCalc.redondeo) > 0.01) {
          rowsSinPrecios.push({
            material_codigo: "",
            seccion: "PAGO",
            tipo: "Nota",
            descripcion: `(Redondeado desde ${totalesCalc.totalSinRedondeo.toFixed(2)} $)`,
            cantidad: "",
          });
        }

        if (oferta.moneda_pago !== "USD" && tasaCambioNumero > 0) {
          const simboloMoneda = oferta.moneda_pago === "EUR" ? "€" : "CUP";
          const nombreMoneda =
            oferta.moneda_pago === "EUR"
              ? "Euros (EUR)"
              : "Pesos Cubanos (CUP)";

          rowsSinPrecios.push({
            material_codigo: "",
            seccion: "PAGO",
            tipo: "Info",
            descripcion: "Moneda de pago",
            cantidad: "",
            total: nombreMoneda,
          });

          const tasaTexto =
            oferta.moneda_pago === "EUR"
              ? `Tasa de cambio: 1 EUR = ${tasaCambioNumero} USD`
              : `Tasa de cambio: 1 USD = ${tasaCambioNumero} CUP`;

          rowsSinPrecios.push({
            material_codigo: "",
            seccion: "PAGO",
            tipo: "Tasa",
            descripcion: tasaTexto,
            cantidad: "",
          });

          rowsSinPrecios.push({
            material_codigo: "",
            seccion: "PAGO",
            tipo: "Conversión",
            descripcion: `Precio en ${oferta.moneda_pago}`,
            cantidad: "",
            total: `${montoConvertido.toFixed(2)} ${simboloMoneda}`,
          });
        }
      }

      const exportOptionsSinPrecios = {
        title: "Oferta - Cliente sin precios",
        subtitle:
          oferta.nombre_completo &&
          oferta.nombre_completo !== "0.00" &&
          isNaN(Number(oferta.nombre_completo))
            ? oferta.nombre_completo
            : oferta.nombre,
        columns: [
          { header: "Material", key: "descripcion", width: 60 },
          { header: "Cant", key: "cantidad", width: 10 },
        ],
        data: rowsSinPrecios,
        logoUrl: "/brand/suncar-v1-iso.png",
        leadData:
          oferta.tipo === "personalizada" && lead
            ? {
                id: lead.id,
                nombre: lead.nombre_completo || lead.nombre,
                telefono: lead.telefono,
                email: lead.email,
                provincia: lead.provincia,
                direccion: lead.direccion,
                atencion_de: lead.nombre_completo || lead.nombre,
              }
            : undefined,
        leadSinAgregarData:
          oferta.tipo === "personalizada" && oferta.nombre_lead_sin_agregar
            ? {
                nombre: oferta.nombre_lead_sin_agregar,
                atencion_de: oferta.nombre_lead_sin_agregar,
              }
            : undefined,
        ofertaData: {
          numero_oferta: oferta.numero_oferta || oferta.id,
          nombre_oferta: oferta.nombre_completo || oferta.nombre,
          tipo_oferta:
            oferta.tipo === "generica" ? "Genérica" : "Personalizada",
        },
        incluirFotos: true,
        fotosMap,
        sinPrecios: true,
        componentesPrincipales,
        terminosCondiciones: terminosCondicionesExport || undefined,
        seccionesPersonalizadas: seccionesPersonalizadasOferta.filter(
          (s: any) =>
            s.tipo === "extra" &&
            (s.tipo_extra === "escritura" || s.tipo_extra === "costo"),
        ),
      };

      console.log("🔍 DEBUG exportOptionsSinPrecios desde leads:", {
        sinPrecios: exportOptionsSinPrecios.sinPrecios,
        columns: exportOptionsSinPrecios.columns,
        dataLength: exportOptionsSinPrecios.data.length,
        firstRow: exportOptionsSinPrecios.data[0],
      });

      // EXPORTACIÓN CLIENTE CON PRECIOS (copiado exactamente de ofertas-confeccionadas-view)
      const rowsClienteConPrecios: any[] = [];
      itemsOrdenados.forEach((item) => {
        let seccionLabel = seccionLabelMap.get(item.seccion) ?? item.seccion;

        if (
          seccionLabel === item.seccion &&
          seccionesPersonalizadasOferta.length > 0
        ) {
          const seccionPersonalizada = seccionesPersonalizadasOferta.find(
            (s: any) => s.id === item.seccion,
          );
          if (seccionPersonalizada) {
            seccionLabel = seccionPersonalizada.label;
          }
        }

        const margenAsignado = (item as any).margen_asignado || 0;
        const costoItem = item.precio * item.cantidad;
        const totalConMargen = costoItem + margenAsignado;

        const material = materialesMap.get(item.material_codigo?.toString());
        const nombreMaterial = material?.nombre || item.descripcion;

        rowsClienteConPrecios.push({
          material_codigo: item.material_codigo,
          seccion: seccionLabel,
          tipo: "Material",
          descripcion: nombreMaterial,
          cantidad: item.cantidad,
          total: totalConMargen.toFixed(2),
        });
      });

      const totalMaterialesCliente = itemsOrdenados.reduce((sum, item) => {
        const margenAsignado = (item as any).margen_asignado || 0;
        const costoItem = item.precio * item.cantidad;
        return sum + costoItem + margenAsignado;
      }, 0);

      let totalCostosExtrasCliente = 0;
      if (seccionesPersonalizadasOferta.length > 0) {
        seccionesPersonalizadasOferta.forEach((seccion: any) => {
          if (
            seccion.tipo === "extra" &&
            seccion.tipo_extra === "costo" &&
            seccion.costos_extras
          ) {
            seccion.costos_extras.forEach((costo: any) => {
              totalCostosExtrasCliente +=
                costo.cantidad * costo.precio_unitario;
            });
          }
        });
      }

      if (seccionesPersonalizadasOferta.length > 0) {
        seccionesPersonalizadasOferta.forEach((seccion: any) => {
          if (
            seccion.tipo === "extra" &&
            seccion.tipo_extra === "costo" &&
            seccion.costos_extras
          ) {
            seccion.costos_extras.forEach((costo: any) => {
              rowsClienteConPrecios.push({
                material_codigo: "",
                seccion: seccion.label,
                tipo: "Costo extra",
                descripcion: costo.descripcion,
                cantidad: costo.cantidad,
                total: (costo.cantidad * costo.precio_unitario).toFixed(2),
              });
            });
          }
        });
      }

      rowsClienteConPrecios.push({
        material_codigo: "",
        seccion: "Totales",
        tipo: "Subtotal",
        descripcion: "Total de materiales",
        cantidad: "",
        total: totalMaterialesCliente.toFixed(2),
      });

      if (totalCostosExtrasCliente > 0) {
        rowsClienteConPrecios.push({
          material_codigo: "",
          seccion: "Totales",
          tipo: "Subtotal",
          descripcion: "Total costos extras",
          cantidad: "",
          total: totalCostosExtrasCliente.toFixed(2),
        });
      }

      if (oferta.margen_instalacion && oferta.margen_instalacion > 0) {
        rowsClienteConPrecios.push({
          material_codigo: "",
          seccion: "Servicios",
          tipo: "Servicio",
          descripcion: "Costo de instalación y puesta en marcha",
          cantidad: 1,
          total: oferta.margen_instalacion.toFixed(2),
        });
      }

      if (oferta.costo_transportacion && oferta.costo_transportacion > 0) {
        rowsClienteConPrecios.push({
          material_codigo: "",
          seccion: "Logística",
          tipo: "Transportación",
          descripcion: "Costo de transportación",
          cantidad: 1,
          total: oferta.costo_transportacion.toFixed(2),
        });
      }

      if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
        const totalesCalc = calcularTotalesDetalle(oferta);
        rowsClienteConPrecios.push({
          material_codigo: "",
          seccion: "Contribución",
          tipo: "Contribucion",
          descripcion: `Contribución (${oferta.porcentaje_contribucion}%)`,
          cantidad: 1,
          total: totalesCalc.contribucion.toFixed(2),
        });
      }

      if (oferta.descuento_porcentaje && oferta.descuento_porcentaje > 0) {
        const totalesCalc = calcularTotalesDetalle(oferta);
        const montoDescuento =
          totalesCalc.montoDescuento || oferta.monto_descuento || 0;
        rowsClienteConPrecios.push({
          material_codigo: "",
          seccion: "Descuento",
          tipo: "Descuento",
          descripcion: `Descuento aplicado (${oferta.descuento_porcentaje}%)`,
          cantidad: 1,
          total: `- ${montoDescuento.toFixed(2)}`,
        });
      }

      rowsClienteConPrecios.push({
        material_codigo: "",
        seccion: "Totales",
        tipo: "TOTAL",
        descripcion: "PRECIO TOTAL",
        cantidad: "",
        total: (oferta.precio_final || 0).toFixed(2),
      });

      // Datos de pago para cliente con precios
      if (
        oferta.pago_transferencia ||
        oferta.aplica_contribucion ||
        (oferta.moneda_pago !== "USD" && tasaCambioNumero > 0)
      ) {
        if (oferta.pago_transferencia) {
          rowsClienteConPrecios.push({
            descripcion: "✓ Pago por transferencia",
            cantidad: "",
            seccion: "PAGO",
            tipo: "Info",
          });

          if (oferta.datos_cuenta) {
            rowsClienteConPrecios.push({
              descripcion: "Datos de la cuenta",
              cantidad: "",
              total: oferta.datos_cuenta,
              seccion: "PAGO",
              tipo: "Datos",
            });
          }
        }

        if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
          const totalesCalc = calcularTotalesDetalle(oferta);

          rowsClienteConPrecios.push({
            descripcion: `✓ Aplicar ${oferta.porcentaje_contribucion}% de Contribución`,
            cantidad: "",
            seccion: "PAGO",
            tipo: "Info",
          });

          rowsClienteConPrecios.push({
            descripcion: "Contribución",
            cantidad: "",
            total: totalesCalc.contribucion.toFixed(2),
            seccion: "PAGO",
            tipo: "Monto",
          });
        }

        rowsClienteConPrecios.push({
          descripcion: "Precio Final",
          cantidad: "",
          total: (oferta.precio_final || 0).toFixed(2),
          seccion: "PAGO",
          tipo: "TOTAL",
        });

        const totalesCalc = calcularTotalesDetalle(oferta);
        if (Math.abs(totalesCalc.redondeo) > 0.01) {
          rowsClienteConPrecios.push({
            descripcion: `(Redondeado desde ${totalesCalc.totalSinRedondeo.toFixed(2)} $)`,
            cantidad: "",
            seccion: "PAGO",
            tipo: "Nota",
          });
        }

        if (oferta.moneda_pago !== "USD" && tasaCambioNumero > 0) {
          const simboloMoneda = oferta.moneda_pago === "EUR" ? "€" : "CUP";
          const nombreMoneda =
            oferta.moneda_pago === "EUR"
              ? "Euros (EUR)"
              : "Pesos Cubanos (CUP)";

          rowsClienteConPrecios.push({
            descripcion: "Moneda de pago",
            cantidad: "",
            total: nombreMoneda,
            seccion: "PAGO",
            tipo: "Info",
          });

          const tasaTexto =
            oferta.moneda_pago === "EUR"
              ? `Tasa de cambio: 1 EUR = ${tasaCambioNumero} USD`
              : `Tasa de cambio: 1 USD = ${tasaCambioNumero} CUP`;

          rowsClienteConPrecios.push({
            descripcion: tasaTexto,
            cantidad: "",
            seccion: "PAGO",
            tipo: "Tasa",
          });

          rowsClienteConPrecios.push({
            descripcion: `Precio en ${oferta.moneda_pago}`,
            cantidad: "",
            total: `${montoConvertido.toFixed(2)} ${simboloMoneda}`,
            seccion: "PAGO",
            tipo: "Conversión",
          });
        }
      }

      const rowsClienteConPreciosTasaCambio = rowsClienteConPrecios.map(
        (row) => {
          if (
            !tieneMonedaCambio ||
            row.total === undefined ||
            row.total === ""
          ) {
            return row;
          }

          if (
            row.tipo === "Datos" ||
            row.tipo === "Info" ||
            row.tipo === "Tasa" ||
            row.tipo === "Conversión"
          ) {
            return row;
          }

          return {
            ...row,
            total: convertirTextoTotalMonedaPago(row.total),
          };
        },
      );

      const exportOptionsClienteConPrecios = {
        title: "Oferta - Cliente con precios",
        subtitle:
          oferta.nombre_completo &&
          oferta.nombre_completo !== "0.00" &&
          isNaN(Number(oferta.nombre_completo))
            ? oferta.nombre_completo
            : oferta.nombre,
        columns: [
          { header: "Material", key: "descripcion", width: 50 },
          { header: "Cant", key: "cantidad", width: 10 },
          { header: "Total ($)", key: "total", width: 15 },
        ],
        data: rowsClienteConPrecios,
        logoUrl: "/brand/suncar-v1-iso.png",
        leadData:
          oferta.tipo === "personalizada" && lead
            ? {
                id: lead.id,
                nombre: lead.nombre_completo || lead.nombre,
                telefono: lead.telefono,
                email: lead.email,
                provincia: lead.provincia,
                direccion: lead.direccion,
                atencion_de: lead.nombre_completo || lead.nombre,
              }
            : undefined,
        leadSinAgregarData:
          oferta.tipo === "personalizada" && oferta.nombre_lead_sin_agregar
            ? {
                nombre: oferta.nombre_lead_sin_agregar,
                atencion_de: oferta.nombre_lead_sin_agregar,
              }
            : undefined,
        ofertaData: {
          numero_oferta: oferta.numero_oferta || oferta.id,
          nombre_oferta: oferta.nombre_completo || oferta.nombre,
          tipo_oferta:
            oferta.tipo === "generica" ? "Genérica" : "Personalizada",
        },
        incluirFotos: true,
        fotosMap,
        conPreciosCliente: true,
        componentesPrincipales,
        terminosCondiciones: terminosCondicionesExport || undefined,
        seccionesPersonalizadas: seccionesPersonalizadasOferta.filter(
          (s: any) =>
            s.tipo === "extra" &&
            (s.tipo_extra === "escritura" || s.tipo_extra === "costo"),
        ),
      };

      const exportOptionsClienteConPreciosTasaCambio = {
        title: "Oferta - Cliente con precios y tasa de cambio",
        subtitle:
          oferta.nombre_completo &&
          oferta.nombre_completo !== "0.00" &&
          isNaN(Number(oferta.nombre_completo))
            ? oferta.nombre_completo
            : oferta.nombre,
        columns: [
          { header: "Material", key: "descripcion", width: 50 },
          { header: "Cant", key: "cantidad", width: 10 },
          { header: `Total (${codigoMonedaCambio})`, key: "total", width: 15 },
        ],
        data: rowsClienteConPreciosTasaCambio,
        logoUrl: "/brand/suncar-v1-iso.png",
        leadData:
          oferta.tipo === "personalizada" && lead
            ? {
                id: lead.id,
                nombre: lead.nombre_completo || lead.nombre,
                telefono: lead.telefono,
                email: lead.email,
                provincia: lead.provincia,
                direccion: lead.direccion,
                atencion_de: lead.nombre_completo || lead.nombre,
              }
            : undefined,
        leadSinAgregarData:
          oferta.tipo === "personalizada" && oferta.nombre_lead_sin_agregar
            ? {
                nombre: oferta.nombre_lead_sin_agregar,
                atencion_de: oferta.nombre_lead_sin_agregar,
              }
            : undefined,
        ofertaData: {
          numero_oferta: oferta.numero_oferta || oferta.id,
          nombre_oferta: oferta.nombre_completo || oferta.nombre,
          tipo_oferta:
            oferta.tipo === "generica" ? "Genérica" : "Personalizada",
        },
        incluirFotos: true,
        fotosMap,
        conPreciosCliente: true,
        simboloMoneda: tieneMonedaCambio ? simboloMonedaCambio : "$",
        codigoMoneda: codigoMonedaCambio,
        componentesPrincipales,
        terminosCondiciones: terminosCondicionesExport || undefined,
        seccionesPersonalizadas: seccionesPersonalizadasOferta.filter(
          (s: any) =>
            s.tipo === "extra" &&
            (s.tipo_extra === "escritura" || s.tipo_extra === "costo"),
        ),
      };

      const resultado = {
        baseFilename,
        exportOptionsCompleto,
        exportOptionsSinPrecios,
        exportOptionsClienteConPrecios,
        exportOptionsClienteConPreciosTasaCambio,
      };

      console.log("✅ generarOpcionesExportacion RESULTADO:", {
        baseFilename: resultado.baseFilename,
        sinPrecios: resultado.exportOptionsSinPrecios?.sinPrecios,
        conPreciosCliente:
          resultado.exportOptionsClienteConPrecios?.conPreciosCliente,
        columns_sinPrecios: resultado.exportOptionsSinPrecios?.columns?.length,
        columns_conPrecios:
          resultado.exportOptionsClienteConPrecios?.columns?.length,
        columns_conPrecios_tasa:
          resultado.exportOptionsClienteConPreciosTasaCambio?.columns?.length,
      });

      return resultado;
    },
    [leads, materials, marcas, terminosCondicionesPayload],
  );

  const handleExportarOferta = async (oferta: OfertaConfeccion) => {
    await ensureTerminosCondicionesCargados();
    setOfertaParaExportar(oferta);
    setMostrarDialogoExportar(true);
    // Cerrar el diálogo de detalles si está abierto
    setShowDetalleOfertaDialog(false);
  };

  const handleConversionInputChange = (
    field: keyof LeadConversionRequest,
    value: string,
  ) => {
    setConversionData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (conversionErrors[field]) {
      setConversionErrors((prev) => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const buildConversionPayload = (
    numeroCliente: string,
  ): LeadConversionRequest => {
    const payload: LeadConversionRequest = {
      numero: numeroCliente.trim(),
    };

    if (
      conversionData.carnet_identidad &&
      conversionData.carnet_identidad.trim()
    ) {
      payload.carnet_identidad = conversionData.carnet_identidad.trim();
    }

    if (conversionData.estado && conversionData.estado.trim()) {
      payload.estado = conversionData.estado.trim();
    }

    if (conversionData.equipo_propio !== undefined) {
      payload.equipo_propio = conversionData.equipo_propio;
    }

    return payload;
  };

  const handleConfirmConversion = async () => {
    if (!leadToConvert) return;

    const errors: Record<string, string> = {};

    // Verificar si necesita responder sobre equipo propio
    if (conversionData.equipo_propio === undefined) {
      errors.general =
        "Debes indicar si el equipo es propio del cliente o si necesita asignar un inversor";
      setConversionErrors(errors);
      return;
    }

    // Validar carnet solo si se proporciona
    if (
      conversionData.carnet_identidad &&
      conversionData.carnet_identidad.trim()
    ) {
      if (conversionData.carnet_identidad.length !== 11) {
        errors.carnet_identidad =
          "El carnet de identidad debe tener exactamente 11 dígitos";
      } else if (!/^\d{11}$/.test(conversionData.carnet_identidad)) {
        errors.carnet_identidad =
          "El carnet de identidad solo debe contener números";
      }
    }

    if (!conversionData.estado || !conversionData.estado.trim()) {
      errors.estado = "Debes seleccionar un estado para el cliente";
    }

    if (Object.keys(errors).length > 0) {
      setConversionErrors(errors);
      return;
    }

    setConversionLoading(true);
    try {
      if (!leadToConvert.id) {
        throw new Error("El lead no tiene ID válido");
      }

      const codigoGenerado = await onGenerarCodigo(
        leadToConvert.id,
        conversionData.equipo_propio ? true : undefined,
      );

      const formatoEsperado = conversionData.equipo_propio
        ? /^P\d{9}$/
        : /^[A-Z]\d{9}$/;
      if (
        codigoGenerado.length !== 10 ||
        !formatoEsperado.test(codigoGenerado)
      ) {
        throw new Error("El código generado tiene un formato incorrecto");
      }

      setConversionData((prev) => ({
        ...prev,
        numero: codigoGenerado,
      }));

      await onConvert(leadToConvert, buildConversionPayload(codigoGenerado));
      closeConvertDialog();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "No se pudo convertir el lead";
      setConversionBackendError(errorMessage);
    } finally {
      setConversionLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const estadosConfig: Record<
      string,
      { bg: string; text: string; hover: string; label: string }
    > = {
      "Esperando equipo": {
        bg: "bg-amber-100",
        text: "text-amber-600",
        hover: "hover:bg-amber-200",
        label: "Esperando equipo",
      },
      "No interesado": {
        bg: "bg-gray-200",
        text: "text-slate-500",
        hover: "hover:bg-gray-300",
        label: "No interesado",
      },
      "Pendiente de instalación": {
        bg: "bg-green-100",
        text: "text-green-600",
        hover: "hover:bg-green-200",
        label: "Pendiente de instalación",
      },
      "Pendiente de presupuesto": {
        bg: "bg-purple-100",
        text: "text-violet-700",
        hover: "hover:bg-purple-200",
        label: "Pendiente de presupuesto",
      },
      "Pendiente de visita": {
        bg: "bg-blue-100",
        text: "text-blue-600",
        hover: "hover:bg-blue-200",
        label: "Pendiente de visita",
      },
      "Pendiente de visitarnos": {
        bg: "bg-pink-100",
        text: "text-fuchsia-600",
        hover: "hover:bg-pink-200",
        label: "Pendiente de visitarnos",
      },
      Proximamente: {
        bg: "bg-cyan-100",
        text: "text-teal-600",
        hover: "hover:bg-cyan-200",
        label: "Próximamente",
      },
      "Revisando ofertas": {
        bg: "bg-indigo-100",
        text: "text-indigo-600",
        hover: "hover:bg-indigo-200",
        label: "Revisando ofertas",
      },
      "Sin respuesta": {
        bg: "bg-red-100",
        text: "text-red-600",
        hover: "hover:bg-red-200",
        label: "Sin respuesta",
      },
    };

    const config = estadosConfig[estado] || {
      bg: "bg-gray-100",
      text: "text-gray-600",
      hover: "hover:bg-gray-200",
      label: estado,
    };
    return {
      className: `${config.text} bg-transparent border-transparent hover:bg-transparent`,
      label: config.label,
    };
  };

  const formatDate = (dateString: string) => {
    // Si ya está en formato DD/MM/YYYY, devolverlo tal como está
    if (dateString && dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dateString;
    }

    // Si está en formato ISO (YYYY-MM-DD), convertir a DD/MM/YYYY
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }

    return dateString;
  };

  const isVideoUrl = (url: string) =>
    /\.(mp4|webm|ogg|mov|m4v|avi|mkv|3gp)(\?|#|$)/i.test(url);

  const formatFechaArchivo = (value?: string) => {
    if (!value) return "Sin fecha";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString("es-ES");
  };

  const handleDownloadArchivo = async (url: string, index: number) => {
    if (!selectedLead?.id) return;
    try {
      await downloadFile(url, `lead-${selectedLead.id}-archivo-${index + 1}`);
    } catch (error) {
      console.error(
        "Error descargando archivo del lead",
        selectedLead.id,
        error,
      );
    }
  };

  if (loading && leads.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando leads...</p>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-24 w-24 text-gray-400">
          <Phone className="h-24 w-24" />
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay leads</h3>
        <p className="mt-1 text-sm text-gray-500">
          Comienza creando tu primer lead.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden border border-gray-200 rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-gray-500 uppercase tracking-wider min-w-[240px] max-w-[320px]">
                  Lead
                </th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Contacto
                </th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-gray-500 uppercase tracking-wider min-w-[200px] max-w-[240px]">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-gray-500 uppercase tracking-wider min-w-[220px]">
                  Oferta
                </th>
                <th className="px-4 py-3 text-right text-[13px] font-semibold text-gray-500 uppercase tracking-wider min-w-[120px] w-[120px]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className={`hover:bg-gray-50 ${lead.activo === false ? "opacity-60" : ""}`}
                >
                  <td className="px-4 py-3min-w-[240px] max-w-[320px]">
                    <div className="flex items-start gap-2">
                      <div className="pt-1">
                        <PriorityDot
                          prioridad={lead.prioridad}
                          onChange={(prioridad) =>
                            lead.id && handlePrioridadChange(lead.id, prioridad)
                          }
                          disabled={disableActions || !onUpdatePrioridad}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 break-words">
                          {lead.nombre}
                        </div>
                        <div className="text-sm text-gray-500 break-words whitespace-pre-line">
                          {breakTextAtLength(
                            lead.direccion || "Sin dirección",
                            32,
                          )}
                        </div>
                        {(lead.municipio || lead.provincia_montaje) && (
                          <div className="text-[13px] text-gray-500 flex items-center mt-1">
                            <MapPin className="h-3.5 w-3.5 mr-1 text-gray-400 flex-shrink-0" />
                            <span className="truncate">
                              {[lead.municipio, lead.provincia_montaje]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3whitespace-nowrap min-w-[100px] max-w-[130px]">
                    <div className="text-sm text-gray-900 truncate">
                      {lead.telefono}
                    </div>
                    {lead.telefono_adicional && (
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <PhoneForwarded className="h-4 w-4 mr-1 text-gray-400" />
                        <span className="truncate">
                          {lead.telefono_adicional}
                          {lead.telefono_adicional_nombre &&
                            ` (${lead.telefono_adicional_nombre})`}
                        </span>
                      </div>
                    )}
                    {lead.pais_contacto && (
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                        <span className="truncate">{lead.pais_contacto}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3min-w-[200px] max-w-[240px]">
                    <div className="w-full">
                      {lead.activo === false && (
                        <Badge className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 mb-1 inline-block">
                          Anulado
                        </Badge>
                      )}
                      {(() => {
                        const estadoBadge = getEstadoBadge(lead.estado);
                        return (
                          <Badge
                            className={`${estadoBadge.className} text-sm whitespace-normal break-words leading-tight inline-block px-3 py-1.5`}
                          >
                            {estadoBadge.label}
                          </Badge>
                        );
                      })()}
                      {lead.comercial && (
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <UserCheck className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="truncate">{lead.comercial}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3min-w-[220px] max-w-[280px]">
                    <div className="space-y-1">
                      {(() => {
                        type Componente = {
                          cantidad: number;
                          descripcion: string;
                        };
                        let inv: Componente | null = null;
                        let bats: Componente[] = [];
                        let pan: Componente | null = null;
                        let elementoPersonalizado: string | null = null;

                        const embebidas =
                          lead.ofertas?.filter(
                            (o) =>
                              o.inversor_codigo ||
                              o.bateria_codigo ||
                              o.panel_codigo ||
                              o.elementos_personalizados,
                          ) ?? [];
                        const oc = lead.oferta_confeccion;

                        if (oc && oc.items?.length) {
                          ({ inv, bats, pan } =
                            extraerComponentesDeOfertaConfeccion(oc));
                        } else if (embebidas.length > 0) {
                          const oferta = embebidas[0];
                          if (
                            oferta.inversor_codigo &&
                            oferta.inversor_cantidad > 0
                          ) {
                            inv = {
                              cantidad: oferta.inversor_cantidad,
                              descripcion:
                                oferta.inversor_nombre ||
                                oferta.inversor_codigo,
                            };
                          }
                          if (
                            oferta.bateria_codigo &&
                            oferta.bateria_cantidad > 0
                          ) {
                            bats = [
                              {
                                cantidad: oferta.bateria_cantidad,
                                descripcion:
                                  oferta.bateria_nombre ||
                                  oferta.bateria_codigo,
                              },
                            ];
                          }
                          if (
                            oferta.panel_codigo &&
                            oferta.panel_cantidad > 0
                          ) {
                            pan = {
                              cantidad: oferta.panel_cantidad,
                              descripcion:
                                oferta.panel_nombre || oferta.panel_codigo,
                            };
                          }
                          if (oferta.elementos_personalizados) {
                            elementoPersonalizado =
                              oferta.elementos_personalizados;
                          }
                        }

                        const sinComponentes =
                          !inv &&
                          bats.length === 0 &&
                          !pan &&
                          !elementoPersonalizado;
                        if (sinComponentes && !oc) {
                          return (
                            <div className="text-sm text-gray-400">
                              Sin ofertas
                            </div>
                          );
                        }

                        const totalOfertas = oc?.total_ofertas ?? 0;
                        const totalConfirmadas = oc?.total_confirmadas ?? 0;

                        return (
                          <div className="space-y-1.5">
                            {oc && (
                              <div className="flex flex-wrap gap-1">
                                <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-[13px] font-medium text-gray-700">
                                  {totalOfertas}{" "}
                                  {totalOfertas === 1 ? "oferta" : "ofertas"}
                                </span>
                                <span
                                  className={`inline-flex items-center rounded px-2 py-0.5 text-[13px] font-medium ${
                                    totalConfirmadas > 0
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {totalConfirmadas} confirmada
                                  {totalConfirmadas === 1 ? "" : "s"}
                                </span>
                              </div>
                            )}
                            <div className="space-y-1 text-[14px]">
                              {inv && (
                                <div className="flex items-center gap-1.5 text-gray-700">
                                  <Zap className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                  <span className="font-medium">
                                    {inv.cantidad}x
                                  </span>
                                  <span className="truncate">
                                    {inv.descripcion}
                                  </span>
                                </div>
                              )}
                              {bats.map((bat, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-1.5 text-gray-700"
                                >
                                  <Battery className="h-4 w-4 text-green-500 flex-shrink-0" />
                                  <span className="font-medium">
                                    {bat.cantidad}x
                                  </span>
                                  <span className="truncate">
                                    {bat.descripcion}
                                  </span>
                                </div>
                              ))}
                              {pan && (
                                <div className="flex items-center gap-1.5 text-gray-700">
                                  <Sun className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                  <span className="font-medium">
                                    {pan.cantidad}x
                                  </span>
                                  <span className="truncate">
                                    {pan.descripcion}
                                  </span>
                                </div>
                              )}
                              {elementoPersonalizado && (
                                <div className="text-gray-700 text-[13px] truncate">
                                  {elementoPersonalizado}
                                </div>
                              )}
                              {sinComponentes && oc && (
                                <div className="text-gray-400 text-[13px]">
                                  Sin componentes principales
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-3whitespace-nowrap text-right text-sm font-medium min-w-[120px] w-[120px]">
                    <div className="flex items-center justify-end space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setConsultandoOfertaLead(lead.id || null);
                          openAsignarOfertaDialog(lead)
                            .catch((err) => {
                              console.error("Error al abrir dialogo:", err);
                            })
                            .finally(() => {
                              setConsultandoOfertaLead((prev) =>
                                prev === lead.id ? null : prev,
                              );
                            });
                        }}
                        disabled={consultandoOfertaLead === lead.id}
                        className={(() => {
                          const tieneOferta = leadTieneOferta(lead);
                          if (tieneOferta)
                            return "text-green-600 hover:text-green-700 hover:bg-green-50 border border-green-300 h-7 w-7 p-0";
                          return "text-gray-600 hover:text-gray-700 hover:bg-gray-50 h-7 w-7 p-0";
                        })()}
                        title={
                          leadTieneOferta(lead)
                            ? "Ver oferta asignada"
                            : "Asignar oferta generica"
                        }
                      >
                        <FileCheck
                          className={`h-3 w-3 ${consultandoOfertaLead === lead.id ? "animate-pulse" : ""}`}
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
                        onClick={() => openUploadFotosDialog(lead)}
                        className="text-violet-600 hover:text-violet-800 h-7 w-7 p-0"
                        title="Agregar foto o video"
                        disabled={disableActions || !onUploadFotos}
                      >
                        <Camera className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          void openDetailDialog(lead);
                        }}
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
                        className="text-emerald-600 hover:text-emerald-800 h-7 w-7 p-0"
                        title="Editar"
                        disabled={disableActions}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatusClick(lead)}
                        className={
                          lead.activo === false
                            ? "text-emerald-600 hover:text-emerald-800 h-7 w-7 p-0"
                            : "text-red-600 hover:text-red-800 h-7 w-7 p-0"
                        }
                        title={lead.activo === false ? "Reactivar" : "Anular"}
                        disabled={disableActions}
                      >
                        {lead.activo === false ? (
                          <RotateCcw className="h-3 w-3" />
                        ) : (
                          <Ban className="h-3 w-3" />
                        )}
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
      <Dialog
        open={isDetailDialogOpen}
        onOpenChange={(open) => {
          setIsDetailDialogOpen(open);
          if (!open) {
            setSelectedLead(null);
            setFotosLeadDetails([]);
            setLoadingFotosLeadDetails(false);
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0 gap-0 flex flex-col">
          <DialogHeader className="shrink-0 border-b border-gray-100 px-5 py-4 pr-10">
            {selectedLead && (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-base font-semibold text-emerald-700">
                  {selectedLead.nombre?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="truncate text-base font-semibold text-gray-900">
                    {selectedLead.nombre}
                  </DialogTitle>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    {(() => {
                      const estadoBadge = getEstadoBadge(selectedLead.estado);
                      return (
                        <Badge
                          className={`${estadoBadge.className} px-2 py-0.5 text-xs`}
                        >
                          {estadoBadge.label}
                        </Badge>
                      );
                    })()}
                    {selectedLead.prioridad &&
                      selectedLead.prioridad !== "Ninguna" && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              selectedLead.prioridad === "Alta"
                                ? "bg-red-500"
                                : selectedLead.prioridad === "Baja"
                                  ? "bg-blue-500"
                                  : "bg-emerald-500"
                            }`}
                          />
                          {selectedLead.prioridad}
                        </span>
                      )}
                  </div>
                </div>
              </div>
            )}
          </DialogHeader>

          {selectedLead && (
            <>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div className="space-y-5">
                  {/* Contacto */}
                  <section>
                    <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      Contacto
                    </h4>
                    <div className="space-y-2.5">
                      <LeadInfoRow
                        icon={Phone}
                        label="Teléfono"
                        value={selectedLead.telefono}
                      />
                      {selectedLead.telefono_adicional && (
                        <LeadInfoRow
                          icon={PhoneForwarded}
                          label="Teléfono adicional"
                          value={`${selectedLead.telefono_adicional}${
                            selectedLead.telefono_adicional_nombre
                              ? ` (${selectedLead.telefono_adicional_nombre})`
                              : ""
                          }`}
                        />
                      )}
                      <LeadInfoRow
                        icon={Globe}
                        label="País de contacto"
                        value={selectedLead.pais_contacto}
                      />
                      <LeadInfoRow
                        label="Referencia"
                        value={selectedLead.referencia}
                      />
                    </div>
                  </section>

                  {/* Ubicación */}
                  {(selectedLead.direccion ||
                    selectedLead.provincia_montaje ||
                    selectedLead.municipio) && (
                    <section className="border-t border-gray-100 pt-5">
                      <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        Ubicación
                      </h4>
                      <div className="space-y-2.5">
                        <LeadInfoRow
                          icon={MapPin}
                          label="Dirección"
                          value={selectedLead.direccion}
                        />
                        <LeadInfoRow
                          label="Provincia"
                          value={selectedLead.provincia_montaje}
                        />
                        <LeadInfoRow
                          label="Municipio"
                          value={selectedLead.municipio}
                        />
                      </div>
                    </section>
                  )}

                  {/* Seguimiento */}
                  <section className="border-t border-gray-100 pt-5">
                    <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      Seguimiento
                    </h4>
                    <div className="space-y-2.5">
                      <LeadInfoRow
                        icon={Calendar}
                        label="Fecha de contacto"
                        value={formatDate(selectedLead.fecha_contacto)}
                      />
                      <LeadInfoRow label="Fuente" value={selectedLead.fuente} />
                      <LeadInfoRow
                        icon={UserCheck}
                        label="Comercial asignado"
                        value={selectedLead.comercial}
                      />
                    </div>
                  </section>

                  {/* Oferta */}
                  {selectedLead.ofertas && selectedLead.ofertas.length > 0 && (
                    <section className="border-t border-gray-100 pt-5">
                      <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        Oferta
                      </h4>
                      <div className="space-y-4">
                        {selectedLead.ofertas.map((oferta, idx) => (
                          <div key={idx} className="space-y-2.5">
                            <LeadInfoRow
                              icon={Zap}
                              label="Inversor"
                              value={
                                oferta.inversor_codigo &&
                                oferta.inversor_cantidad > 0
                                  ? `${oferta.inversor_nombre || oferta.inversor_codigo} · Cant: ${oferta.inversor_cantidad}`
                                  : undefined
                              }
                            />
                            <LeadInfoRow
                              icon={Battery}
                              label="Batería"
                              value={
                                oferta.bateria_codigo &&
                                oferta.bateria_cantidad > 0
                                  ? `${oferta.bateria_nombre || oferta.bateria_codigo} · Cant: ${oferta.bateria_cantidad}`
                                  : undefined
                              }
                            />
                            <LeadInfoRow
                              icon={Sun}
                              label="Paneles"
                              value={
                                oferta.panel_codigo && oferta.panel_cantidad > 0
                                  ? `${oferta.panel_nombre || oferta.panel_codigo} · Cant: ${oferta.panel_cantidad}`
                                  : undefined
                              }
                            />
                            {(oferta.aprobada || oferta.pagada) && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                {oferta.aprobada && (
                                  <Badge className="bg-green-100 px-2 py-0.5 text-xs text-green-700">
                                    Oferta aprobada
                                  </Badge>
                                )}
                                {oferta.pagada && (
                                  <Badge className="bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                                    Oferta pagada
                                  </Badge>
                                )}
                              </div>
                            )}
                            {oferta.elementos_personalizados && (
                              <LeadInfoRow
                                label="Elementos personalizados"
                                value={oferta.elementos_personalizados}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Costos y Pago */}
                  {selectedLead.ofertas && selectedLead.ofertas.length > 0 && (
                    <section className="border-t border-gray-100 pt-5">
                      <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        Costos y pago
                      </h4>
                      <div className="space-y-4">
                        {selectedLead.ofertas.map((oferta, idx) => (
                          <div key={`costos-${idx}`} className="space-y-2.5">
                            <LeadInfoRow
                              icon={CreditCard}
                              label="Costo de oferta"
                              value={`$${oferta.costo_oferta.toFixed(2)}`}
                            />
                            {oferta.costo_extra > 0 && (
                              <LeadInfoRow
                                label="Costo extra"
                                value={`$${oferta.costo_extra.toFixed(2)}`}
                              />
                            )}
                            {oferta.costo_transporte > 0 && (
                              <LeadInfoRow
                                label="Costo de transporte"
                                value={`$${oferta.costo_transporte.toFixed(2)}`}
                              />
                            )}
                            <LeadInfoRow
                              strong
                              label="Costo final"
                              value={`$${(
                                oferta.costo_oferta +
                                oferta.costo_extra +
                                oferta.costo_transporte
                              ).toFixed(2)}`}
                            />
                            {oferta.razon_costo_extra && (
                              <LeadInfoRow
                                label="Razón del costo extra"
                                value={oferta.razon_costo_extra}
                              />
                            )}
                          </div>
                        ))}

                        <LeadInfoRow
                          label="Método de pago"
                          value={selectedLead.metodo_pago}
                        />
                        <LeadInfoRow
                          label="Moneda"
                          value={selectedLead.moneda}
                        />

                        {selectedLead.comprobante_pago_url && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              void handleDownloadComprobante(selectedLead)
                            }
                            className="mt-1 w-full"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Descargar comprobante
                          </Button>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Evidencias */}
                  <section className="border-t border-gray-100 pt-5">
                    <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      Evidencias
                    </h4>
                    {loadingFotosLeadDetails ? (
                      <p className="text-sm text-gray-500">
                        Cargando archivos...
                      </p>
                    ) : fotosLeadDetails.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        Este lead no tiene archivos subidos.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5">
                        {fotosLeadDetails.map((archivo, index) => (
                          <div
                            key={`${archivo.url}-${index}`}
                            className="rounded-md border border-gray-100 p-2"
                          >
                            <div className="mb-2 h-24 w-full overflow-hidden rounded bg-black/5">
                              {isVideoUrl(archivo.url) ? (
                                <video
                                  src={archivo.url}
                                  controls
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <img
                                  src={archivo.url}
                                  alt={`Evidencia ${index + 1}`}
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <Badge className="border-blue-200 bg-blue-100 px-1.5 py-0 text-[10px] text-blue-700">
                                {archivo.tipo === "instalacion"
                                  ? "Instalación"
                                  : "Avería"}
                              </Badge>
                              <span className="text-[10px] text-gray-500">
                                {formatFechaArchivo(archivo.fecha)}
                              </span>
                            </div>
                            <div className="mt-2 flex gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  window.open(archivo.url, "_blank")
                                }
                                className="h-7 flex-1 px-1 text-xs"
                              >
                                Ver
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  void handleDownloadArchivo(archivo.url, index)
                                }
                                className="h-7 flex-1 px-1 text-xs"
                              >
                                Descargar
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Comentarios */}
                  {selectedLead.comentario && (
                    <section className="border-t border-gray-100 pt-5">
                      <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        Comentarios
                      </h4>
                      <p className="whitespace-pre-wrap break-words rounded-md bg-gray-50 p-3 text-sm leading-relaxed text-gray-700">
                        {selectedLead.comentario}
                      </p>
                    </section>
                  )}

                  {/* Elementos Personalizados */}
                  {selectedLead.elementos_personalizados &&
                    selectedLead.elementos_personalizados.length > 0 && (
                      <section className="border-t border-gray-100 pt-5">
                        <h4 className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                          <ListChecks className="h-3.5 w-3.5" />
                          Elementos personalizados
                        </h4>
                        <div className="divide-y divide-gray-100">
                          {selectedLead.elementos_personalizados.map(
                            (elemento, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between py-2 text-sm"
                              >
                                <span className="text-gray-900">
                                  {elemento.descripcion}
                                </span>
                                <span className="ml-4 font-medium text-gray-500">
                                  Cant: {elemento.cantidad}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </section>
                    )}
                </div>
              </div>

              <div className="flex shrink-0 justify-end border-t border-gray-100 px-5 py-3.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDetailDialogOpen(false)}
                >
                  Cerrar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Convert Lead Dialog */}
      <Dialog
        open={isConvertDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeConvertDialog();
          } else {
            setIsConvertDialogOpen(true);
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
                  Completa los datos necesarios para crear el cliente a partir
                  del lead{" "}
                  <span className="font-semibold text-gray-900">
                    {leadToConvert.nombre}
                  </span>
                  . Los datos del lead se copiarán automáticamente.
                </div>

                {conversionErrors.general && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    <div className="text-xs sm:text-sm text-red-700 mb-2">
                      {conversionErrors.general}
                    </div>
                    {(conversionErrors.general.includes(
                      "oferta confeccionada",
                    ) ||
                      conversionErrors.general.includes(
                        "inversor seleccionado",
                      )) && (
                      <div className="mt-2 flex flex-col gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-red-300 hover:bg-red-100 text-red-700"
                          onClick={() => handleSeleccionEquipoPropio(true)}
                        >
                          Marcar equipo propio
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-red-300 hover:bg-red-100 text-red-700"
                          onClick={() => {
                            closeConvertDialog();
                            openAsignarOfertaDialog(leadToConvert);
                          }}
                        >
                          Crear Oferta Confeccionada
                        </Button>
                      </div>
                    )}
                    {(conversionErrors.general.includes("provincia") ||
                      conversionErrors.general.includes("municipio")) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 border-red-300 hover:bg-red-100 text-red-700"
                        onClick={() => {
                          closeConvertDialog();
                          if (leadToConvert) {
                            onEdit(leadToConvert);
                          }
                        }}
                      >
                        Editar Lead
                      </Button>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <Label className="text-sm font-semibold text-amber-900 mb-3 block">
                      ¿El equipo es propio del cliente?
                    </Label>
                    <p className="text-xs text-amber-700 mb-3">
                      {leadTieneOfertaConfeccionada
                        ? "Este lead tiene oferta confeccionada. Elige si usar equipo propio o generar código con la oferta."
                        : "Este lead no tiene una oferta confeccionada detectada. Puedes marcar equipo propio o crear una oferta antes de convertir."}
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className={`w-full ${
                          conversionData.equipo_propio === true
                            ? "bg-amber-100 border-amber-500 border-2"
                            : "border-amber-300"
                        } hover:bg-amber-100`}
                        onClick={() => handleSeleccionEquipoPropio(true)}
                      >
                        {conversionData.equipo_propio === true && "✓ "}Sí, es
                        equipo propio
                      </Button>
                      {leadTieneOfertaConfeccionada && (
                        <Button
                          type="button"
                          variant="outline"
                          className={`w-full ${
                            conversionData.equipo_propio === false
                              ? "bg-amber-100 border-amber-500 border-2"
                              : "border-amber-300"
                          } hover:bg-amber-100`}
                          onClick={() => handleSeleccionEquipoPropio(false)}
                        >
                          {conversionData.equipo_propio === false && "✓ "}No,
                          usar oferta confeccionada
                        </Button>
                      )}
                      {!leadTieneOfertaConfeccionada && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-amber-300 hover:bg-amber-100"
                          onClick={() => {
                            closeConvertDialog();
                            openAsignarOfertaDialog(leadToConvert);
                          }}
                        >
                          Crear oferta confeccionada
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor="numero_cliente"
                      className="text-xs sm:text-sm"
                    >
                      Código de cliente (generado automáticamente)
                    </Label>
                    <Input
                      id="numero_cliente"
                      value={conversionData.numero}
                      disabled
                      className="bg-gray-100 cursor-not-allowed"
                      placeholder="Se generará al confirmar la conversión"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {conversionData.numero
                        ? conversionData.equipo_propio
                          ? 'Código con prefijo "P" para equipo propio del cliente'
                          : "Código generado según marca de inversor, provincia y municipio"
                        : "El código se generará cuando confirmes la conversión"}
                    </p>
                  </div>

                  <div>
                    <Label
                      htmlFor="carnet_identidad"
                      className="text-xs sm:text-sm"
                    >
                      Carnet de identidad
                    </Label>
                    <Input
                      id="carnet_identidad"
                      placeholder="Ej: 12345678901"
                      value={conversionData.carnet_identidad || ""}
                      onChange={(e) => {
                        // Solo permitir números y máximo 11 dígitos
                        const value = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 11);
                        handleConversionInputChange("carnet_identidad", value);
                      }}
                      maxLength={11}
                      className={
                        conversionErrors.carnet_identidad
                          ? "border-red-500"
                          : ""
                      }
                      autoFocus
                    />
                    {conversionErrors.carnet_identidad ? (
                      <p className="text-xs text-red-600 mt-1">
                        {conversionErrors.carnet_identidad}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">
                        Opcional - Si se proporciona, debe tener 11 dígitos
                      </p>
                    )}
                  </div>

                  <div>
                    <Label
                      htmlFor="estado_cliente"
                      className="text-xs sm:text-sm"
                    >
                      Estado del cliente *
                    </Label>
                    <Select
                      value={
                        conversionData.estado || "Pendiente de instalación"
                      }
                      onValueChange={(value) =>
                        handleConversionInputChange("estado", value)
                      }
                    >
                      <SelectTrigger id="estado_cliente">
                        <SelectValue placeholder="Selecciona un estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendiente de instalación">
                          Pendiente de instalación
                        </SelectItem>
                        <SelectItem value="Esperando equipo">
                          Esperando equipo
                        </SelectItem>
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
                    "Convertir a cliente"
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
          setShowOfertasDialog(open);
          if (open) {
            ensureOfertasPersonalizadasCargadas();
          } else {
            closeOfertasDialog();
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ofertas personalizadas del lead</DialogTitle>
            <DialogDescription>
              {selectedLeadForOfertas
                ? `${selectedLeadForOfertas.nombre || selectedLeadForOfertas.telefono || selectedLeadForOfertas.id || "Lead"}`
                : "Selecciona un lead"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              {ofertasDelLead.length}{" "}
              {ofertasDelLead.length === 1 ? "oferta" : "ofertas"} asociadas.
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
              setEditingOferta(oferta);
              setIsEditOfertaOpen(true);
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
        defaultLeadId={selectedLeadForOfertas?.id || ""}
        lockContactType="lead"
        lockLeadId={selectedLeadForOfertas?.id || ""}
      />

      <EditOfertaDialog
        open={isEditOfertaOpen}
        onOpenChange={(open) => {
          setIsEditOfertaOpen(open);
          if (!open) setEditingOferta(null);
        }}
        oferta={editingOferta}
        onSubmit={handleUpdateOfertaLead}
        isLoading={ofertaSubmitting}
        lockContactType="lead"
        lockLeadId={selectedLeadForOfertas?.id || ""}
      />

      <Dialog
        open={showUploadFotosDialog}
        onOpenChange={(open) => {
          setShowUploadFotosDialog(open);
          if (!open) closeUploadFotosDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar foto/video del lead</DialogTitle>
            <DialogDescription>
              {leadForUploadFotos
                ? `${leadForUploadFotos.nombre || leadForUploadFotos.telefono || leadForUploadFotos.id || "Lead"}`
                : "Selecciona un lead"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lead-foto-tipo">Tipo</Label>
              <Select
                value={uploadFotoTipo}
                onValueChange={(value: "instalacion" | "averia") =>
                  setUploadFotoTipo(value)
                }
              >
                <SelectTrigger id="lead-foto-tipo">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instalacion">Instalación</SelectItem>
                  <SelectItem value="averia">Avería</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-foto-archivo">Archivo</Label>
              <Input
                id="lead-foto-archivo"
                type="file"
                accept="image/*,video/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setUploadFotoFile(file);
                }}
                disabled={uploadingFoto}
              />
              <p className="text-xs text-gray-500">Acepta imágenes y videos.</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeUploadFotosDialog}
                disabled={uploadingFoto}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void handleUploadFotosLead();
                }}
                disabled={!uploadFotoFile || uploadingFoto || !onUploadFotos}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {uploadingFoto ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  "Subir archivo"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UploadComprobanteDialog
        open={isComprobanteDialogOpen}
        onOpenChange={handleComprobanteDialogOpenChange}
        entityLabel={
          leadForComprobante?.nombre ||
          leadForComprobante?.telefono ||
          leadForComprobante?.id ||
          "lead"
        }
        defaultMetodoPago={leadForComprobante?.metodo_pago}
        defaultMoneda={leadForComprobante?.moneda}
        onSubmit={handleComprobanteSubmit}
      />

      {/* Flujo guiado para elegir tipo de oferta */}
      <Dialog
        open={showOfertaFlowDialog}
        onOpenChange={(open) => {
          setShowOfertaFlowDialog(open);
          if (!open) closeOfertaFlowDialog();
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
                  setTipoOfertaSeleccionada(value);
                  setAccionPersonalizadaSeleccionada("");
                  setOfertasGenericasAprobadas([]);
                  setOfertasGenericasAprobadasCargadas(false);
                  setOfertaGenericaParaDuplicarId("");
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
                    setAccionPersonalizadaSeleccionada(value);
                    setOfertasGenericasAprobadas([]);
                    setOfertasGenericasAprobadasCargadas(false);
                    setOfertaGenericaParaDuplicarId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Crear nueva o duplicar y editar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nueva">Crear nueva</SelectItem>
                    <SelectItem value="duplicar">
                      Duplicar y editar existente
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(tipoOfertaSeleccionada === "generica" ||
              (tipoOfertaSeleccionada === "personalizada" &&
                accionPersonalizadaSeleccionada === "duplicar")) && (
                <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                  <Label>
                    {tipoOfertaSeleccionada === "generica"
                      ? "Selecciona la oferta genérica a asignar"
                      : "Selecciona la oferta genérica a duplicar"}
                  </Label>
                  {loadingOfertasGenericasAprobadas ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                      <span className="ml-3 text-gray-600">
                        Cargando ofertas...
                      </span>
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
                              inversor: null as {
                                cantidad: number;
                                descripcion: string;
                              } | null,
                              bateria: null as {
                                cantidad: number;
                                descripcion: string;
                              } | null,
                              panel: null as {
                                cantidad: number;
                                descripcion: string;
                              } | null,
                            };
                            oferta.items?.forEach((item) => {
                              const seccion = item.seccion?.toLowerCase() || "";
                              const itemData = {
                                cantidad: item.cantidad,
                                descripcion: item.descripcion,
                              };
                              if (
                                seccion === "inversor" ||
                                seccion === "inversores"
                              ) {
                                if (
                                  !items.inversor ||
                                  item.cantidad > items.inversor.cantidad
                                ) {
                                  items.inversor = itemData;
                                }
                              } else if (
                                seccion === "bateria" ||
                                seccion === "baterias" ||
                                seccion === "batería" ||
                                seccion === "baterías"
                              ) {
                                if (
                                  !items.bateria ||
                                  item.cantidad > items.bateria.cantidad
                                ) {
                                  items.bateria = itemData;
                                }
                              } else if (
                                seccion === "panel" ||
                                seccion === "paneles"
                              ) {
                                if (
                                  !items.panel ||
                                  item.cantidad > items.panel.cantidad
                                ) {
                                  items.panel = itemData;
                                }
                              }
                            });
                            return items;
                          })();

                          const isSelected =
                            ofertaGenericaParaDuplicarId === oferta.id;

                          return (
                            <Card
                              key={oferta.id}
                              className={`border cursor-pointer transition-all ${
                                isSelected
                                  ? "border-emerald-500 bg-emerald-50 shadow-md"
                                  : "hover:shadow-md hover:border-emerald-300"
                              }`}
                              onClick={() =>
                                setOfertaGenericaParaDuplicarId(oferta.id)
                              }
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
                                        <span className="text-sm font-bold text-emerald-600">
                                          {new Intl.NumberFormat("es-ES", {
                                            style: "currency",
                                            currency:
                                              oferta.moneda_pago || "USD",
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
                                          <span className="font-medium">
                                            {maxItems.inversor.cantidad}x
                                          </span>
                                          <span className="truncate max-w-[180px]">
                                            {maxItems.inversor.descripcion}
                                          </span>
                                        </div>
                                      )}
                                      {maxItems.bateria && (
                                        <div className="flex items-center gap-1 text-gray-700">
                                          <span className="font-medium">
                                            {maxItems.bateria.cantidad}x
                                          </span>
                                          <span className="truncate max-w-[180px]">
                                            {maxItems.bateria.descripcion}
                                          </span>
                                        </div>
                                      )}
                                      {maxItems.panel && (
                                        <div className="flex items-center gap-1 text-gray-700">
                                          <span className="font-medium">
                                            {maxItems.panel.cantidad}x
                                          </span>
                                          <span className="truncate max-w-[180px]">
                                            {maxItems.panel.descripcion}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Indicador de selección */}
                                  <div className="flex-shrink-0 flex items-center">
                                    <div
                                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                        isSelected
                                          ? "border-emerald-600 bg-emerald-600"
                                          : "border-gray-300 bg-white"
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
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={closeOfertaFlowDialog}
            >
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
          setShowCrearOfertaPersonalizadaDialog(open);
          if (!open) {
            setOfertasGenericasAprobadas([]);
            setOfertasGenericasAprobadasCargadas(false);
            setLeadForAsignarOferta(null);
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
                  console.error(
                    "Error actualizando estado tras crear oferta personalizada:",
                    error,
                  );
                });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de duplicar y editar oferta genérica aprobada */}
      <DuplicarOfertaDialog
        open={showDuplicarOfertaPersonalizadaDialog}
        onOpenChange={(open) => {
          setShowDuplicarOfertaPersonalizadaDialog(open);
          if (!open) {
            setOfertaGenericaParaDuplicarId("");
            setOfertasGenericasAprobadas([]);
            setOfertasGenericasAprobadasCargadas(false);
            setLeadForAsignarOferta(null);
          }
        }}
        oferta={ofertaGenericaParaDuplicar}
        leadIdInicial={leadForAsignarOferta?.id}
        tipoContactoInicial="lead"
        ofertaGenericaInicial={false}
        onSuccess={() => {
          handleOfertaPersonalizadaConfeccionSuccess().catch((error) => {
            console.error(
              "Error actualizando estado tras duplicar oferta:",
              error,
            );
          });
        }}
      />

      {/* Modal de ver oferta del lead */}
      <AsignarOfertaGenericaDialog
        open={showVerOfertaDialog}
        onOpenChange={(open) => {
          setShowVerOfertaDialog(open);
          if (!open) closeVerOfertaDialog();
        }}
        cliente={
          leadForAsignarOferta
            ? ({
                nombre: leadForAsignarOferta.nombre,
                numero: leadForAsignarOferta.id || "",
              } as any)
            : ofertaLeadActual
              ? ({
                  nombre: ofertaLeadActual.lead_nombre || "",
                  numero: ofertaLeadActual.lead_id || "",
                } as any)
              : null
        }
        modo="ver"
        ofertasExistentes={ofertasLeadActuales}
        onVerDetalles={handleVerDetallesOferta}
      />

      {/* Modal de detalles completos de una oferta específica */}
      <VerOfertaClienteDialog
        open={showDetalleOfertaDialog}
        onOpenChange={(open) => {
          setShowDetalleOfertaDialog(open);
          if (!open) closeDetalleOfertaDialog();
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
          setMostrarDialogoEditar(false);
          setOfertaParaEditar(null);
          if (refetchOfertas) refetchOfertas();
          onRefreshLeads?.();
          toast({
            title: "Oferta actualizada",
            description: "Los cambios se guardaron correctamente.",
          });
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
      <Dialog
        open={mostrarDialogoEliminar}
        onOpenChange={setMostrarDialogoEliminar}
      >
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
              <span className="font-semibold">
                {ofertaParaEliminar?.nombre}
              </span>
              ?
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

      {/* Anular/Reactivar Confirmation Dialog */}
      {leadToToggleStatus?.activo === false ? (
        <ConfirmEditDialog
          open={isToggleStatusDialogOpen}
          onOpenChange={setIsToggleStatusDialogOpen}
          title="Reactivar Lead"
          message={`¿Reactivar el lead de ${leadToToggleStatus?.nombre}? Volverá a aparecer en el listado de leads activos.`}
          onConfirm={handleToggleStatusConfirm}
          confirmText="Reactivar Lead"
          isLoading={togglingStatus}
        />
      ) : (
        <ConfirmDeleteDialog
          open={isToggleStatusDialogOpen}
          onOpenChange={setIsToggleStatusDialogOpen}
          title="Anular Lead"
          message={`¿Estás seguro de que quieres anular el lead de ${leadToToggleStatus?.nombre}? Pasará a estado "No interesado", se cancelarán todas sus ofertas de confección vinculadas (liberando las reservas de materiales que tuvieran) y dejará de aparecer en el listado de leads activos. Podrás reactivarlo luego, pero eso no revertirá las ofertas ya canceladas.`}
          onConfirm={handleToggleStatusConfirm}
          confirmText="Anular Lead"
          isLoading={togglingStatus}
        />
      )}
    </>
  );
}
