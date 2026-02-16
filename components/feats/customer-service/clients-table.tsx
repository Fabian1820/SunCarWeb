"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import { PriorityDot } from "@/components/shared/atom/priority-dot";
import { Label } from "@/components/shared/atom/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/shared/molecule/dialog";
import { Input } from "@/components/shared/molecule/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/molecule/popover";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import {
  FileCheck,
  Eye,
  MapPin,
  Building2,
  Phone,
  Edit,
  Trash2,
  ListChecks,
  Plus,
  Search,
  ChevronDown,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { ReportsTable } from "@/components/feats/reports/reports-table";
import { ReporteService } from "@/lib/api-services";
import { ClientReportsChart } from "@/components/feats/reports/client-reports-chart";
import MapPicker from "@/components/shared/organism/MapPickerNoSSR";
import { ClienteDetallesDialog } from "@/components/feats/customer/cliente-detalles-dialog";
import { useOfertasPersonalizadas } from "@/hooks/use-ofertas-personalizadas";
import { OfertasPersonalizadasTable } from "@/components/feats/ofertas-personalizadas/ofertas-personalizadas-table";
import { CreateOfertaDialog } from "@/components/feats/ofertas-personalizadas/create-oferta-dialog";
import { EditOfertaDialog } from "@/components/feats/ofertas-personalizadas/edit-oferta-dialog";
import { GestionarAveriasDialog } from "@/components/feats/averias/gestionar-averias-dialog";
import { AsignarOfertaGenericaDialog } from "@/components/feats/ofertas/asignar-oferta-generica-dialog";
import { VerOfertaClienteDialog } from "@/components/feats/ofertas/ver-oferta-cliente-dialog";
import { DuplicarOfertaDialog } from "@/components/feats/ofertas/duplicar-oferta-dialog";
import { EditarOfertaDialog } from "@/components/feats/ofertas/editar-oferta-dialog";
import { ExportSelectionDialog } from "@/components/feats/ofertas/export-selection-dialog";
import { ConfeccionOfertasView } from "@/components/feats/ofertas/confeccion-ofertas-view";
import { useOfertasConfeccion } from "@/hooks/use-ofertas-confeccion";
import type { OfertaConfeccion } from "@/hooks/use-ofertas-confeccion";
import type {
  OfertaPersonalizada,
  OfertaPersonalizadaCreateRequest,
  OfertaPersonalizadaUpdateRequest,
} from "@/lib/types/feats/ofertas-personalizadas/oferta-personalizada-types";
import { useToast } from "@/hooks/use-toast";
import type { Cliente } from "@/lib/api-types";

interface ClientsTableProps {
  clients: Cliente[];
  onEdit: (client: Cliente) => void;
  onDelete: (client: Cliente) => void;
  onViewLocation: (client: Cliente) => void;
  onUpdatePrioridad?: (
    clientId: string,
    prioridad: "Alta" | "Media" | "Baja",
  ) => Promise<void>;
  loading?: boolean;
  onFiltersChange?: (filters: {
    searchTerm: string;
    estado: string[];
    fuente: string;
    comercial: string;
    fechaDesde: string;
    fechaHasta: string;
  }) => void;
  exportButtons?: React.ReactNode;
}

const CLIENT_ESTADOS = [
  "Equipo instalado con éxito",
  "Esperando equipo",
  "Pendiente de instalación",
  "Instalación en Proceso",
  "Pendiente de visita",
  "Pendiente de visitarnos",
];

const LEAD_FUENTES = [
  "Página Web",
  "Instagram",
  "Facebook",
  "Directo",
  "Mensaje de Whatsapp",
  "Visita",
];

const LEAD_COMERCIALES = [
  "Enelido Alexander Calero Perez",
  "Yanet Clara Rodríguez Quintana",
  "Dashel Pinillos Zubiaur",
  "Gretel María Mojena Almenares",
];

const buildSearchText = (client: Cliente) => {
  const parts: string[] = [];
  const visited = new WeakSet<object>();

  const addValue = (value: unknown) => {
    if (value === null || value === undefined) return;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      parts.push(String(value));
      return;
    }
    if (value instanceof Date) {
      parts.push(value.toISOString());
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(addValue);
      return;
    }
    if (typeof value === "object") {
      if (visited.has(value)) return;
      visited.add(value);
      Object.values(value as Record<string, unknown>).forEach(addValue);
    }
  };

  addValue(client);
  return parts.join(" ").toLowerCase();
};

const parseDateValue = (value?: string) => {
  if (!value) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split("/").map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeClienteNumero = (value?: string) =>
  (value ?? "")
    .toString()
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

export function ClientsTable({
  clients,
  onEdit,
  onDelete,
  onViewLocation,
  onUpdatePrioridad,
  loading = false,
  onFiltersChange,
  exportButtons,
}: ClientsTableProps) {
  const { toast } = useToast();
  const {
    ofertas,
    loading: ofertasLoading,
    createOferta,
    updateOferta,
    deleteOferta,
  } = useOfertasPersonalizadas();
  const {
    fetchOfertasGenericasAprobadas,
    asignarOfertaACliente,
    obtenerNumerosClientesConOfertas,
    obtenerOfertaPorCliente,
    eliminarOferta,
    refetch: refetchOfertas,
  } = useOfertasConfeccion();
  const [selectedClientReports, setSelectedClientReports] = useState<
    any[] | null
  >(null);
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [loadingClientReports, setLoadingClientReports] = useState(false);
  const [showClientLocation, setShowClientLocation] = useState(false);
  const [clientLocation, setClientLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [clientForDetails, setClientForDetails] = useState<Cliente | null>(
    null,
  );
  const [showOfertasDialog, setShowOfertasDialog] = useState(false);
  const [clientForOfertas, setClientForOfertas] = useState<Cliente | null>(
    null,
  );
  const [isCreateOfertaOpen, setIsCreateOfertaOpen] = useState(false);
  const [isEditOfertaOpen, setIsEditOfertaOpen] = useState(false);
  const [editingOferta, setEditingOferta] =
    useState<OfertaPersonalizada | null>(null);
  const [ofertaSubmitting, setOfertaSubmitting] = useState(false);
  const [showAveriasDialog, setShowAveriasDialog] = useState(false);
  const [clientForAverias, setClientForAverias] = useState<Cliente | null>(
    null,
  );
  const [showOfertaFlowDialog, setShowOfertaFlowDialog] = useState(false);
  const [showAsignarOfertaDialog, setShowAsignarOfertaDialog] = useState(false);
  const [clientForAsignarOferta, setClientForAsignarOferta] =
    useState<Cliente | null>(null);
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
  const [ofertaClienteActual, setOfertaClienteActual] =
    useState<OfertaConfeccion | null>(null);
  const [ofertasClienteActuales, setOfertasClienteActuales] = useState<
    OfertaConfeccion[]
  >([]);
  const [clientesConOferta, setClientesConOferta] = useState<Set<string>>(
    new Set(),
  );
  const [cargaSetOfertasTerminada, setCargaSetOfertasTerminada] =
    useState(false);
  const [consultandoOfertaCliente, setConsultandoOfertaCliente] = useState<
    string | null
  >(null);
  
  // Estados para editar/eliminar/exportar ofertas
  const [mostrarDialogoEditar, setMostrarDialogoEditar] = useState(false);
  const [ofertaParaEditar, setOfertaParaEditar] = useState<OfertaConfeccion | null>(null);
  const [mostrarDialogoEliminar, setMostrarDialogoEliminar] = useState(false);
  const [ofertaParaEliminar, setOfertaParaEliminar] = useState<OfertaConfeccion | null>(null);
  const [eliminandoOferta, setEliminandoOferta] = useState(false);
  const [mostrarDialogoExportar, setMostrarDialogoExportar] = useState(false);
  const [ofertaParaExportar, setOfertaParaExportar] = useState<OfertaConfeccion | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    estado: [] as string[],
    fuente: "",
    comercial: "",
    fechaDesde: "",
    fechaHasta: "",
  });

  const ofertasDelCliente = useMemo(() => {
    if (!clientForOfertas) return [];
    // Usar solo el ID de MongoDB para filtrar ofertas
    const clienteId = clientForOfertas.id;
    if (!clienteId) return [];
    return ofertas.filter((o) => o.cliente_id === clienteId);
  }, [ofertas, clientForOfertas]);

  const ofertaGenericaParaDuplicar = useMemo(
    () =>
      ofertasGenericasAprobadas.find(
        (oferta) => oferta.id === ofertaGenericaParaDuplicarId,
      ) ?? null,
    [ofertasGenericasAprobadas, ofertaGenericaParaDuplicarId],
  );

  const availableEstados = CLIENT_ESTADOS;
  const availableFuentes = LEAD_FUENTES;
  const availableComerciales = LEAD_COMERCIALES;

  const toggleEstado = (estado: string) => {
    setFilters((prev) => {
      const next = prev.estado.includes(estado)
        ? prev.estado.filter((value) => value !== estado)
        : [...prev.estado, estado];
      return { ...prev, estado: next };
    });
  };

  // Notificar al padre cuando cambien los filtros
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange({
        searchTerm,
        estado: filters.estado,
        fuente: filters.fuente,
        comercial: filters.comercial,
        fechaDesde: filters.fechaDesde,
        fechaHasta: filters.fechaHasta,
      });
    }
  }, [searchTerm, filters, onFiltersChange]);

  const filteredClients = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const fechaDesde = parseDateValue(filters.fechaDesde);
    const fechaHasta = parseDateValue(filters.fechaHasta);
    const selectedEstados = filters.estado.map((estado) =>
      estado.toLowerCase(),
    );
    const selectedFuente = filters.fuente.trim().toLowerCase();
    const selectedComercial = filters.comercial.trim().toLowerCase();

    if (fechaDesde) fechaDesde.setHours(0, 0, 0, 0);
    if (fechaHasta) fechaHasta.setHours(23, 59, 59, 999);

    const filtered = clients.filter((client) => {
      if (search) {
        const text = buildSearchText(client);
        if (!text.includes(search)) {
          return false;
        }
      }

      if (filters.estado.length > 0) {
        const estado = client.estado?.trim();
        if (!estado || !selectedEstados.includes(estado.toLowerCase())) {
          return false;
        }
      }

      if (filters.fuente) {
        const fuente = client.fuente?.trim().toLowerCase();
        if (!fuente || fuente !== selectedFuente) {
          return false;
        }
      }

      if (filters.comercial) {
        const comercial = client.comercial?.trim().toLowerCase();
        if (!comercial || comercial !== selectedComercial) {
          return false;
        }
      }

      if (fechaDesde || fechaHasta) {
        const fecha = parseDateValue(client.fecha_contacto);
        if (!fecha) return false;
        if (fechaDesde && fecha < fechaDesde) return false;
        if (fechaHasta && fecha > fechaHasta) return false;
      }

      return true;
    });

    // Ordenar por los últimos 3 dígitos del código de cliente (descendente)
    return filtered.sort((a, b) => {
      // Extraer los últimos 3 dígitos del código
      const getLastThreeDigits = (numero: string) => {
        const digits = numero.match(/\d+/g)?.join("") || "0";
        return parseInt(digits.slice(-3)) || 0;
      };

      const aNum = getLastThreeDigits(a.numero);
      const bNum = getLastThreeDigits(b.numero);

      // Ordenar de mayor a menor (más reciente primero)
      return bNum - aNum;
    });
  }, [clients, searchTerm, filters]);

  const cargarClientesConOfertas = useCallback(
    async (options?: { skipCache?: boolean; silent?: boolean }) => {
      if (!options?.silent) {
        setCargaSetOfertasTerminada(false);
      }
      try {
        const result = await obtenerNumerosClientesConOfertas({
          skipCache: options?.skipCache,
        });

        if (result.success) {
          const numerosConOferta = new Set(
            result.numeros_clientes.map(normalizeClienteNumero).filter(Boolean),
          );

          console.log(
            "✅ Clientes con oferta cargados:",
            numerosConOferta.size,
          );

          // Actualizar el set de clientes con oferta
          setClientesConOferta(numerosConOferta);

          return true;
        } else {
          console.warn("⚠️ No se pudo cargar endpoint de clientes con ofertas");
          return false;
        }
      } catch (error) {
        console.error("❌ Error cargando clientes con ofertas:", error);
        return false;
      } finally {
        if (!options?.silent) {
          setCargaSetOfertasTerminada(true);
        }
      }
    },
    [obtenerNumerosClientesConOfertas],
  );

  // Verificacion progresiva: DESACTIVADA
  // Ya no es necesaria porque el endpoint /clientes-con-ofertas nos da toda la info
  // Esto elimina los 404 "falsos" en la consola del navegador
  /*
  useEffect(() => {
    if (!cargaSetOfertasTerminada) return
    if (filteredClients.length === 0) return
    if (verificacionEnProgresoRef.current) return

    const candidatos = filteredClients
      .map((client) => normalizeClienteNumero(client.numero))
      .filter(Boolean)
      .filter((numero) => !numerosOfertaVerificadosRef.current.has(numero))
      .slice(0, 40)

    if (candidatos.length === 0) return

    verificacionEnProgresoRef.current = true
    let cancelado = false
    const concurrencia = 6
    let indice = 0

    const worker = async () => {
      while (!cancelado) {
        const currentIndex = indice
        indice += 1
        if (currentIndex >= candidatos.length) return

        const numero = candidatos[currentIndex]
        numerosOfertaVerificadosRef.current.add(numero)
        const result = await obtenerOfertaPorCliente(numero)
        if (cancelado) return

        if (result.success && result.oferta) {
          setClientesConOferta((prev) => {
            const next = new Set(prev)
            next.add(numero)
            return next
          })
        }
      }
    }

    const workers = Array.from({ length: Math.min(concurrencia, candidatos.length) }, () => worker())
    Promise.all(workers).catch((error) => {
      console.error('Error en verificacion progresiva de ofertas:', error)
    }).finally(() => {
      verificacionEnProgresoRef.current = false
    })

    return () => {
      cancelado = true
      verificacionEnProgresoRef.current = false
    }
  }, [filteredClients, cargaSetOfertasTerminada, obtenerOfertaPorCliente])
  */

  // Cargar set de clientes con ofertas al montar el componente
  // SIEMPRE ignora el cache para obtener datos frescos del servidor
  useEffect(() => {
    let activo = true;
    const reintentosMs = [0, 500, 1500, 3000];

    const intentarCarga = async () => {
      for (const delay of reintentosMs) {
        if (!activo) return;
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          if (!activo) return;
        }

        try {
          console.log(
            "🔄 Cargando clientes con ofertas desde servidor (ignorando cache)",
          );
          // IMPORTANTE: skipCache: true para siempre obtener datos frescos al recargar la página
          const ok = await cargarClientesConOfertas({ skipCache: true });
          if (ok) {
            console.log(
              "✅ Clientes con ofertas cargados exitosamente desde servidor",
            );
            return;
          }
        } catch (error) {
          console.error("Error cargando clientes con ofertas:", error);
          if (activo) setCargaSetOfertasTerminada(true);
        }
      }
    };

    intentarCarga().catch((error) => {
      console.error("Error en reintentos de clientes con ofertas:", error);
      if (activo) setCargaSetOfertasTerminada(true);
    });

    return () => {
      activo = false;
    };
  }, [cargarClientesConOfertas]);

  useEffect(() => {
    const handleRefresh = () => {
      cargarClientesConOfertas().catch((error) => {
        console.error("Error refrescando clientes con ofertas:", error);
      });
    };

    const handleOfertaEliminada = () => {
      console.log("🗑️ Oferta eliminada - Invalidando cache y recargando");
      // Invalidar cache
      if (typeof window !== "undefined") {
        localStorage.removeItem("clientes_con_ofertas_cache_v2");
      }
      // Recargar desde el servidor
      cargarClientesConOfertas({ skipCache: true }).catch((error) => {
        console.error("Error refrescando clientes con ofertas:", error);
      });
    };

    if (typeof window !== "undefined") {
      window.addEventListener(
        "refreshClientsTable",
        handleRefresh as EventListener,
      );
      window.addEventListener(
        "ofertaEliminada",
        handleOfertaEliminada as EventListener,
      );
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "refreshClientsTable",
          handleRefresh as EventListener,
        );
        window.removeEventListener(
          "ofertaEliminada",
          handleOfertaEliminada as EventListener,
        );
      }
    };
  }, [cargarClientesConOfertas]);

  const hasActiveFilters =
    searchTerm.trim() ||
    filters.estado.length > 0 ||
    filters.fuente ||
    filters.comercial ||
    filters.fechaDesde ||
    filters.fechaHasta;

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilters({
      estado: [],
      fuente: "",
      comercial: "",
      fechaDesde: "",
      fechaHasta: "",
    });
  };

  const handlePrioridadChange = async (
    clientId: string,
    prioridad: "Alta" | "Media" | "Baja",
  ) => {
    if (onUpdatePrioridad) {
      try {
        await onUpdatePrioridad(clientId, prioridad);
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

  // Acción para ver reportes de un cliente
  const handleViewClientReports = async (client: Cliente) => {
    setSelectedClient(client);
    setLoadingClientReports(true);
    try {
      const data = await ReporteService.getReportesPorCliente(client.numero);
      setSelectedClientReports(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setSelectedClientReports([]);
    } finally {
      setLoadingClientReports(false);
    }
  };

  // Acción para ver ubicación del cliente
  const handleViewClientLocation = (client: Cliente) => {
    if (
      client.latitud !== undefined &&
      client.longitud !== undefined &&
      client.latitud !== null &&
      client.longitud !== null
    ) {
      const lat =
        typeof client.latitud === "number"
          ? client.latitud
          : parseFloat(client.latitud);
      const lng =
        typeof client.longitud === "number"
          ? client.longitud
          : parseFloat(client.longitud);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        setClientLocation({ lat, lng });
        setShowClientLocation(true);
      }
    }
  };

  // Acción para ver detalles completos del cliente
  const handleViewClientDetails = (client: Cliente) => {
    setClientForDetails(client);
    setShowClientDetails(true);
  };

  const openOfertasCliente = (client: Cliente) => {
    setClientForOfertas(client);
    setShowOfertasDialog(true);
  };

  const closeOfertasDialog = () => {
    setShowOfertasDialog(false);
    setClientForOfertas(null);
    setIsCreateOfertaOpen(false);
    setIsEditOfertaOpen(false);
    setEditingOferta(null);
  };

  const openAveriasCliente = (client: Cliente) => {
    setClientForAverias(client);
    setShowAveriasDialog(true);
  };

  const closeAveriasDialog = () => {
    setShowAveriasDialog(false);
    setClientForAverias(null);
  };

  const openAsignarOfertaDialog = async (client: Cliente) => {
    try {
      console.log("Click en boton de oferta para cliente:", client.numero);
      const numeroCliente = normalizeClienteNumero(client.numero);
      if (!numeroCliente) {
        toast({
          title: "Error",
          description: "El cliente no tiene numero valido.",
          variant: "destructive",
        });
        return;
      }

      if (!cargaSetOfertasTerminada) {
        toast({
          title: "Cargando ofertas",
          description:
            "Espera un momento mientras se verifica el estado de ofertas.",
        });
        return;
      }

      // SIEMPRE verificar con el servidor, sin importar si está en el set local
      // Esto asegura que detectemos ofertas eliminadas directamente de la BD
      console.log(
        "🔍 Verificando oferta en servidor para cliente:",
        numeroCliente,
      );
      const result = await obtenerOfertaPorCliente(numeroCliente);
      console.log("📡 Resultado de verificacion:", result);

      if (result.success && result.oferta) {
        // Cliente tiene oferta - actualizar set local si no estaba
        if (!clientesConOferta.has(numeroCliente)) {
          console.log(
            "✅ Cliente tiene oferta pero no estaba en el set - agregando",
          );
          setClientesConOferta((prev) => {
            const next = new Set(prev);
            next.add(numeroCliente);
            return next;
          });
        }

        const ofertas = result.ofertas?.length
          ? result.ofertas
          : [result.oferta];
        setOfertasClienteActuales(ofertas);
        setOfertaClienteActual(result.oferta);

        // Si solo tiene UNA oferta, abrir directamente el diálogo de detalles
        if (ofertas.length === 1) {
          setShowDetalleOfertaDialog(true);
        } else {
          // Si tiene MÚLTIPLES ofertas, mostrar el listado primero
          setClientForAsignarOferta(client);
          setShowVerOfertaDialog(true);
        }
        return;
      }

      // Cliente NO tiene oferta
      if (clientesConOferta.has(numeroCliente)) {
        // Estaba en el set pero ya no tiene oferta - remover
        console.log(
          "⚠️ Cliente estaba en el set pero ya no tiene oferta - removiendo",
        );
        removerClienteDelSet(numeroCliente);
      }

      if (result.error) {
        toast({
          title: "Error al verificar oferta",
          description:
            "No se pudo comprobar la oferta del cliente. Intenta nuevamente.",
          variant: "destructive",
        });
        return;
      }

      // Mostrar diálogo para asignar oferta
      setClientForAsignarOferta(client);
      setShowOfertaFlowDialog(true);
    } catch (error) {
      console.error("Error en openAsignarOfertaDialog:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar la oferta de este cliente.",
        variant: "destructive",
      });
    }
  };

  const closeAsignarOfertaDialog = () => {
    setShowAsignarOfertaDialog(false);
    setClientForAsignarOferta(null);
  };

  const closeOfertaFlowDialog = () => {
    setShowOfertaFlowDialog(false);
    setTipoOfertaSeleccionada("");
    setAccionPersonalizadaSeleccionada("");
    setOfertasGenericasAprobadas([]);
    setOfertaGenericaParaDuplicarId("");
    setOfertasGenericasAprobadasCargadas(false);
    setLoadingOfertasGenericasAprobadas(false);
    setClientForAsignarOferta(null);
  };

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

  useEffect(() => {
    if (!showOfertaFlowDialog) return;
    if (tipoOfertaSeleccionada !== "personalizada") return;
    if (accionPersonalizadaSeleccionada !== "duplicar") return;
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

  const handleContinuarOfertaFlow = async () => {
    if (!clientForAsignarOferta) return;

    if (!tipoOfertaSeleccionada) {
      toast({
        title: "Selecciona el tipo de oferta",
        description: "Debes elegir si será genérica o personalizada.",
        variant: "destructive",
      });
      return;
    }

    if (tipoOfertaSeleccionada === "generica") {
      setShowOfertaFlowDialog(false);
      setTipoOfertaSeleccionada("");
      setAccionPersonalizadaSeleccionada("");
      setOfertasGenericasAprobadas([]);
      setOfertaGenericaParaDuplicarId("");
      setOfertasGenericasAprobadasCargadas(false);
      setShowAsignarOfertaDialog(true);
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

    // NO limpiar ofertasGenericasAprobadas aquí porque se necesita para ofertaGenericaParaDuplicar
    // Se limpiarán cuando se cierre el diálogo de duplicar
    setShowOfertaFlowDialog(false);
    setTipoOfertaSeleccionada("");
    setAccionPersonalizadaSeleccionada("");
    setOfertasGenericasAprobadasCargadas(false);
    setShowDuplicarOfertaPersonalizadaDialog(true);
  };

  const closeVerOfertaDialog = () => {
    setShowVerOfertaDialog(false);
    setOfertaClienteActual(null);
    setOfertasClienteActuales([]);
  };

  const handleVerDetallesOferta = (oferta: OfertaConfeccion) => {
    // Pasar solo la oferta seleccionada para que abra en modo detalle directo
    setOfertaClienteActual(oferta);
    setOfertasClienteActuales([oferta]); // Solo una oferta para modo detalle
    setShowVerOfertaDialog(false);
    setShowDetalleOfertaDialog(true);
  };

  const closeDetalleOfertaDialog = () => {
    setShowDetalleOfertaDialog(false);
    setOfertaClienteActual(null);
  };

  // Funciones para manejar ofertas confeccionadas
  const handleEditarOferta = (oferta: OfertaConfeccion) => {
    setOfertaParaEditar(oferta);
    setMostrarDialogoEditar(true);
    // Cerrar el diálogo de detalles si está abierto
    setShowDetalleOfertaDialog(false);
  };

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
      
      // Actualizar el estado de clientes con ofertas
      await cargarClientesConOfertas({ skipCache: true, silent: true });
      
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

  const handleExportarOferta = (oferta: OfertaConfeccion) => {
    setOfertaParaExportar(oferta);
    setMostrarDialogoExportar(true);
    // Cerrar el diálogo de detalles si está abierto
    setShowDetalleOfertaDialog(false);
  };

  // Función para remover un cliente del set de clientes con oferta
  const removerClienteDelSet = useCallback((numeroCliente: string) => {
    const numeroNormalizado = normalizeClienteNumero(numeroCliente);

    console.log("🗑️ Removiendo cliente del set de ofertas");
    console.log("📝 Número cliente normalizado:", numeroNormalizado);

    // Actualizar el estado local
    setClientesConOferta((prev) => {
      const next = new Set(prev);
      const removed = next.delete(numeroNormalizado);
      console.log("📊 Cliente removido del set:", removed);
      console.log("📊 Estado actualizado:", Array.from(next));
      return next;
    });

    // Actualizar también el cache de localStorage
    if (typeof window !== "undefined") {
      try {
        const cachedRaw = localStorage.getItem("clientes_con_ofertas_cache_v2");
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          const numeros = Array.isArray(cached.numeros) ? cached.numeros : [];
          const index = numeros.indexOf(numeroNormalizado);
          if (index > -1) {
            numeros.splice(index, 1);
            localStorage.setItem(
              "clientes_con_ofertas_cache_v2",
              JSON.stringify({
                ts: Date.now(),
                numeros,
              }),
            );
            console.log("💾 Cache actualizado - cliente removido");
          }
        }
      } catch (error) {
        console.error("Error actualizando cache:", error);
      }
    }
  }, []);

  const handleAsignarOferta = async (ofertaGenericaId: string) => {
    if (!clientForAsignarOferta) return;

    const result = await asignarOfertaACliente(
      ofertaGenericaId,
      clientForAsignarOferta.numero,
    );

    if (result.success) {
      const numeroCliente = normalizeClienteNumero(
        clientForAsignarOferta.numero,
      );

      console.log("✅ Oferta asignada exitosamente");
      console.log("📝 Número cliente normalizado:", numeroCliente);
      console.log(
        "📊 Estado actual antes de actualizar:",
        Array.from(clientesConOferta),
      );

      // Actualizar el estado local inmediatamente para que el botón se ponga verde
      setClientesConOferta((prev) => {
        const next = new Set(prev);
        next.add(numeroCliente);
        console.log("📊 Estado actualizado:", Array.from(next));
        console.log("✅ Cliente agregado al set:", next.has(numeroCliente));
        return next;
      });

      // Actualizar también el cache de localStorage para mantener consistencia
      if (typeof window !== "undefined") {
        try {
          const cachedRaw = localStorage.getItem(
            "clientes_con_ofertas_cache_v2",
          );
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            const numeros = Array.isArray(cached.numeros) ? cached.numeros : [];
            if (!numeros.includes(numeroCliente)) {
              numeros.push(numeroCliente);
              localStorage.setItem(
                "clientes_con_ofertas_cache_v2",
                JSON.stringify({
                  ts: Date.now(),
                  numeros,
                }),
              );
              console.log("💾 Cache actualizado con nuevo cliente");
            }
          }
        } catch (error) {
          console.error("Error actualizando cache:", error);
        }

        // Disparar evento de refresh para otros componentes
        window.dispatchEvent(new CustomEvent("refreshClientsTable"));
      }

      closeAsignarOfertaDialog();

      toast({
        title: "✅ Oferta asignada",
        description: "El cliente ahora tiene una oferta asignada",
      });
    }
  };

  const handleOfertaPersonalizadaConfeccionSuccess = async () => {
    setShowCrearOfertaPersonalizadaDialog(false);
    setShowDuplicarOfertaPersonalizadaDialog(false);
    setOfertasGenericasAprobadas([]);
    setOfertasGenericasAprobadasCargadas(false);
    setOfertaGenericaParaDuplicarId("");
    setClientForAsignarOferta(null);

    await cargarClientesConOfertas({ skipCache: true, silent: true });
  };

  const handleAveriasSuccess = async () => {
    // Refrescar la lista de clientes para actualizar el estado de averías
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("refreshClientsTable"));
    }
  };

  // Actualizar clientForAverias cuando cambie la lista de clientes
  useEffect(() => {
    if (clientForAverias) {
      // Buscar el cliente actualizado en la lista
      const clienteActualizado = clients.find(
        (c) => c.numero === clientForAverias.numero,
      );
      if (clienteActualizado) {
        setClientForAverias(clienteActualizado);
      }
    }
  }, [clients, clientForAverias]);

  // Función para obtener el estado de averías de un cliente
  const getAveriaStatus = (client: Cliente) => {
    const averias = client.averias || [];

    // Sin averías
    if (averias.length === 0) {
      return {
        color: "text-gray-600 hover:text-gray-700 hover:bg-gray-50",
        title: "Gestionar averías",
        hasPendientes: false,
      };
    }

    // Verificar si tiene averías pendientes
    const tienePendientes = averias.some((a) => a.estado === "Pendiente");

    if (tienePendientes) {
      return {
        color:
          "text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-300",
        title: "Tiene averías pendientes",
        hasPendientes: true,
      };
    }

    // Todas las averías están solucionadas
    return {
      color:
        "text-green-600 hover:text-green-700 hover:bg-green-50 border border-green-300",
      title: "Todas las averías solucionadas",
      hasPendientes: false,
    };
  };

  const handleCreateOfertaCliente = async (
    payload: OfertaPersonalizadaCreateRequest,
  ) => {
    // Usar solo el ID de MongoDB del cliente
    const clienteId = clientForOfertas?.id;
    if (!clienteId) {
      toast({
        title: "Error",
        description: "El cliente no tiene un ID válido de MongoDB.",
        variant: "destructive",
      });
      return;
    }
    setOfertaSubmitting(true);
    try {
      const success = await createOferta({
        ...payload,
        cliente_id: clienteId,
        lead_id: undefined,
      });
      toast({
        title: success ? "Oferta creada" : "No se pudo crear la oferta",
        description: success
          ? "Se registró la oferta personalizada para el cliente."
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

  const handleUpdateOfertaCliente = async (
    id: string,
    data: OfertaPersonalizadaUpdateRequest,
  ) => {
    // Usar solo el ID de MongoDB del cliente
    const clienteId = clientForOfertas?.id;
    if (!clienteId || !id) {
      toast({
        title: "Error",
        description: "El cliente no tiene un ID válido de MongoDB.",
        variant: "destructive",
      });
      return;
    }
    setOfertaSubmitting(true);
    try {
      // ✅ SOLUCIÓN: Solo enviar cliente_id, no enviar lead_id
      // Según documentación en docs/SOLUCION_ERROR_MULTIPLES_CONTACTOS.md
      const updateData: OfertaPersonalizadaUpdateRequest = {
        ...data,
        cliente_id: clienteId,
      };
      // No agregar lead_id para evitar el error de múltiples contactos

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

  const handleDeleteOfertaCliente = async (id: string) => {
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

  // Columnas para reportes (para el modal de reportes de cliente)
  const reportColumns = [
    { key: "tipo_reporte", label: "Tipo de Servicio" },
    {
      key: "cliente",
      label: "Cliente",
      render: (row: any) => row.cliente?.numero || "-",
    },
    {
      key: "brigada",
      label: "Líder",
      render: (row: any) => row.brigada?.lider?.nombre || "-",
    },
    {
      key: "fecha_hora",
      label: "Fecha",
      render: (row: any) => row.fecha_hora?.fecha || "-",
    },
    {
      key: "descripcion",
      label: "Descripción",
      render: (row: any) =>
        row.descripcion
          ? row.descripcion.slice(0, 40) +
            (row.descripcion.length > 40 ? "..." : "")
          : "-",
    },
  ];

  return (
    <>
      <Card className="mb-6 border-l-4 border-l-orange-600">
        <CardContent className="p-6">
          <div className="flex gap-3 mb-4 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search-client"
                placeholder="Buscar por cualquier dato..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="text-gray-600 hover:text-gray-800 whitespace-nowrap"
              disabled={!hasActiveFilters}
            >
              Limpiar Filtros
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="truncate">
                      {filters.estado.length > 0
                        ? `${filters.estado.length} estado${filters.estado.length > 1 ? "s" : ""}`
                        : "Todos los estados"}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm text-gray-700">Estado</Label>
                    {filters.estado.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          setFilters((prev) => ({ ...prev, estado: [] }))
                        }
                      >
                        Limpiar
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {availableEstados.map((estado) => (
                      <label
                        key={estado}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <Checkbox
                          checked={filters.estado.includes(estado)}
                          onCheckedChange={() => toggleEstado(estado)}
                        />
                        <span>{estado}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Select
                value={filters.fuente || "todas"}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    fuente: value === "todas" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las fuentes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las fuentes</SelectItem>
                  {availableFuentes.map((fuente) => (
                    <SelectItem key={fuente} value={fuente}>
                      {fuente}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={filters.comercial || "todos"}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    comercial: value === "todos" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los comerciales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los comerciales</SelectItem>
                  {availableComerciales.map((comercial) => (
                    <SelectItem key={comercial} value={comercial}>
                      {comercial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Input
                type="date"
                value={filters.fechaDesde}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    fechaDesde: event.target.value,
                  }))
                }
                placeholder="Fecha desde"
              />
            </div>

            <div>
              <Input
                type="date"
                value={filters.fechaHasta}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    fechaHasta: event.target.value,
                  }))
                }
                placeholder="Fecha hasta"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-orange-600">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <CardTitle>Clientes</CardTitle>
              <CardDescription>
                Mostrando {filteredClients.length} cliente
                {filteredClients.length === 1 ? "" : "s"}
              </CardDescription>
            </div>

            {/* Botones de exportación */}
            {exportButtons && filteredClients.length > 0 && (
              <div className="flex-shrink-0">{exportButtons}</div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No se encontraron clientes
              </h3>
              <p className="text-gray-600">
                No hay clientes que coincidan con los filtros aplicados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[16%]">
                      Cliente
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[24%]">
                      Contacto
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[20%]">
                      Estado
                    </th>
                    {filteredClients.some(
                      (c) => c.estado === "Instalación en Proceso",
                    ) && (
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[15%]">
                        Falta Instalación
                      </th>
                    )}
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[24%]">
                      Oferta
                    </th>
                    <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[16%]">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredClients.map((client) => {
                    // Determinar el color del estado (igual que en leads-table)
                    const getEstadoColor = (estado: string | undefined) => {
                      if (!estado)
                        return "bg-gray-100 text-gray-700 hover:bg-gray-200";

                      // Normalizar el estado (trim y comparación)
                      const estadoNormalizado = estado.trim();

                      // Mapeo exacto de estados como en leads
                      const estadosConfig: Record<string, string> = {
                        // Estados de leads
                        "Esperando equipo":
                          "bg-amber-100 text-amber-800 hover:bg-amber-200",
                        "No interesado":
                          "bg-gray-200 text-gray-700 hover:bg-gray-300",
                        "Pendiente de instalación":
                          "bg-green-100 text-green-800 hover:bg-green-200",
                        "Pendiente de presupuesto":
                          "bg-purple-100 text-purple-800 hover:bg-purple-200",
                        "Pendiente de visita":
                          "bg-blue-100 text-blue-800 hover:bg-blue-200",
                        "Pendiente de visitarnos":
                          "bg-pink-100 text-pink-800 hover:bg-pink-200",
                        Proximamente:
                          "bg-cyan-100 text-cyan-800 hover:bg-cyan-200",
                        "Revisando ofertas":
                          "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
                        "Sin respuesta":
                          "bg-red-100 text-red-800 hover:bg-red-200",
                        // Estados de clientes
                        "Equipo instalado con éxito":
                          "bg-orange-100 text-orange-800 hover:bg-orange-200",
                        "Instalación en Proceso":
                          "bg-blue-100 text-blue-800 hover:bg-blue-200",
                      };

                      return (
                        estadosConfig[estadoNormalizado] ||
                        "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      );
                    };

                    return (
                      <tr
                        key={client._id || client.numero}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-3">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm mb-1">
                              {client.nombre}
                            </p>
                            <p className="text-xs text-gray-500">
                              {client.numero}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center text-sm text-gray-900">
                              <Phone className="h-3.5 w-3.5 text-gray-400 mr-1.5" />
                              <span className="font-medium">
                                {client.telefono || "Sin teléfono"}
                              </span>
                            </div>
                            {client.direccion && (
                              <div className="flex items-start text-xs text-gray-500">
                                <MapPin className="h-3.5 w-3.5 text-gray-400 mr-1.5 mt-0.5 flex-shrink-0" />
                                <span className="line-clamp-2">
                                  {client.direccion}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-3">
                          <div className="w-full">
                            {client.estado && (
                              <Badge
                                className={`${getEstadoColor(client.estado)} text-xs whitespace-normal break-words leading-tight inline-block px-3 py-1.5`}
                              >
                                {client.estado}
                              </Badge>
                            )}
                            {client.comercial && (
                              <div className="text-xs text-gray-500 flex items-center mt-2">
                                <span className="truncate">
                                  {client.comercial}
                                </span>
                              </div>
                            )}
                            {client.fuente && (
                              <div className="text-xs text-gray-500 mt-1">
                                <span className="text-gray-400">Fuente:</span>{" "}
                                {client.fuente}
                              </div>
                            )}
                          </div>
                        </td>
                        {filteredClients.some(
                          (c) => c.estado === "Instalación en Proceso",
                        ) && (
                          <td className="py-4 px-3">
                            {client.estado === "Instalación en Proceso" && (
                              <div className="text-xs">
                                <div className="text-gray-500 mb-1">Falta:</div>
                                <div className="text-gray-900 font-medium">
                                  {client.falta_instalacion ||
                                    "No especificado"}
                                </div>
                              </div>
                            )}
                          </td>
                        )}
                        <td className="py-4 px-3">
                          <div className="space-y-1">
                            {client.ofertas && client.ofertas.length > 0 ? (
                              client.ofertas.map((oferta: any, idx: number) => (
                                <div key={idx} className="text-xs space-y-0.5">
                                  {oferta.inversor_codigo &&
                                    oferta.inversor_cantidad > 0 && (
                                      <div>
                                        <span className="text-gray-700">
                                          Inversor:
                                        </span>{" "}
                                        <span className="text-gray-900 font-medium">
                                          {oferta.inversor_nombre ||
                                            oferta.inversor_codigo}
                                        </span>
                                        <span className="text-gray-500 ml-1">
                                          ({oferta.inversor_cantidad})
                                        </span>
                                      </div>
                                    )}
                                  {oferta.bateria_codigo &&
                                    oferta.bateria_cantidad > 0 && (
                                      <div>
                                        <span className="text-gray-700">
                                          Batería:
                                        </span>{" "}
                                        <span className="text-gray-900 font-medium">
                                          {oferta.bateria_nombre ||
                                            oferta.bateria_codigo}
                                        </span>
                                        <span className="text-gray-500 ml-1">
                                          ({oferta.bateria_cantidad})
                                        </span>
                                      </div>
                                    )}
                                  {oferta.panel_codigo &&
                                    oferta.panel_cantidad > 0 && (
                                      <div>
                                        <span className="text-gray-700">
                                          Paneles:
                                        </span>{" "}
                                        <span className="text-gray-900 font-medium">
                                          {oferta.panel_nombre ||
                                            oferta.panel_codigo}
                                        </span>
                                        <span className="text-gray-500 ml-1">
                                          ({oferta.panel_cantidad})
                                        </span>
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
                              <div className="text-xs text-gray-400">
                                Sin ofertas
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-3">
                          <div className="flex items-center justify-end gap-2">
                            <div className="flex items-center h-8 w-8 justify-center">
                              <PriorityDot
                                prioridad={client.prioridad}
                                onChange={(prioridad) =>
                                  client.id &&
                                  handlePrioridadChange(client.id, prioridad)
                                }
                                disabled={!onUpdatePrioridad}
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setConsultandoOfertaCliente(client.numero);
                                openAsignarOfertaDialog(client)
                                  .catch((err) => {
                                    console.error(
                                      "Error al abrir dialogo:",
                                      err,
                                    );
                                  })
                                  .finally(() => {
                                    setConsultandoOfertaCliente((prev) =>
                                      prev === client.numero ? null : prev,
                                    );
                                  });
                              }}
                              disabled={
                                consultandoOfertaCliente === client.numero ||
                                !cargaSetOfertasTerminada
                              }
                              className={(() => {
                                if (!cargaSetOfertasTerminada) {
                                  return "text-slate-400 hover:text-slate-500 hover:bg-slate-50";
                                }
                                const numeroCliente = normalizeClienteNumero(
                                  client.numero,
                                );
                                const tieneOferta =
                                  clientesConOferta.has(numeroCliente);
                                if (tieneOferta)
                                  return "text-green-600 hover:text-green-700 hover:bg-green-50 border border-green-300";
                                return "text-gray-600 hover:text-gray-700 hover:bg-gray-50";
                              })()}
                              title={(() => {
                                if (!cargaSetOfertasTerminada)
                                  return "Cargando estado de oferta...";
                                const numeroCliente = normalizeClienteNumero(
                                  client.numero,
                                );
                                const tieneOferta =
                                  clientesConOferta.has(numeroCliente);
                                if (tieneOferta) return "Ver oferta asignada";
                                return "Asignar oferta generica";
                              })()}
                            >
                              <FileCheck
                                className={`h-4 w-4 ${consultandoOfertaCliente === client.numero || !cargaSetOfertasTerminada ? "animate-pulse" : ""}`}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAveriasCliente(client)}
                              className={getAveriaStatus(client).color}
                              title={getAveriaStatus(client).title}
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewClientDetails(client)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(client)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(client)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ofertas personalizadas */}
      <Dialog
        open={showOfertasDialog}
        onOpenChange={(open) => {
          setShowOfertasDialog(open);
          if (!open) {
            closeOfertasDialog();
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ofertas personalizadas del cliente</DialogTitle>
            <DialogDescription>
              {clientForOfertas
                ? `${clientForOfertas.nombre} (${clientForOfertas.numero})`
                : "Selecciona un cliente"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              {ofertasDelCliente.length}{" "}
              {ofertasDelCliente.length === 1 ? "oferta" : "ofertas"} asociadas.
            </div>
            <Button
              onClick={() => setIsCreateOfertaOpen(true)}
              disabled={!clientForOfertas?.id}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva oferta
            </Button>
          </div>
          <OfertasPersonalizadasTable
            ofertas={ofertasDelCliente}
            onEdit={(oferta) => {
              setEditingOferta(oferta);
              setIsEditOfertaOpen(true);
            }}
            onDelete={handleDeleteOfertaCliente}
            loading={ofertasLoading || ofertaSubmitting}
          />
        </DialogContent>
      </Dialog>

      <CreateOfertaDialog
        open={isCreateOfertaOpen}
        onOpenChange={setIsCreateOfertaOpen}
        onSubmit={handleCreateOfertaCliente}
        isLoading={ofertaSubmitting}
        defaultContactType="cliente"
        defaultClienteId={clientForOfertas?.id || ""}
        lockContactType="cliente"
        lockClienteId={clientForOfertas?.id || ""}
      />

      <EditOfertaDialog
        open={isEditOfertaOpen}
        onOpenChange={(open) => {
          setIsEditOfertaOpen(open);
          if (!open) setEditingOferta(null);
        }}
        oferta={editingOferta}
        onSubmit={handleUpdateOfertaCliente}
        isLoading={ofertaSubmitting}
        lockContactType="cliente"
        lockClienteId={clientForOfertas?.id || ""}
      />

      {/* Modal de reportes de cliente */}
      <Dialog
        open={!!selectedClientReports}
        onOpenChange={(v) => {
          if (!v) {
            setSelectedClientReports(null);
            setSelectedClient(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Reportes de {selectedClient?.nombre || selectedClient?.numero}
            </DialogTitle>
          </DialogHeader>
          {loadingClientReports ? (
            <div className="text-center py-8">Cargando reportes...</div>
          ) : (
            <>
              <ClientReportsChart reports={selectedClientReports || []} />
              <ReportsTable
                data={selectedClientReports || []}
                columns={reportColumns}
                getRowId={(row) => row._id || row.id}
                loading={loadingClientReports}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal para ver ubicación del cliente */}
      <Dialog open={showClientLocation} onOpenChange={setShowClientLocation}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Ubicación del cliente</DialogTitle>
          </DialogHeader>
          {clientLocation ? (
            <MapPicker
              initialLat={clientLocation.lat}
              initialLng={clientLocation.lng}
            />
          ) : (
            <div className="text-gray-500">
              No hay ubicación registrada para este cliente.
            </div>
          )}
          <div className="flex justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowClientLocation(false)}
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de detalles completos del cliente */}
      <ClienteDetallesDialog
        open={showClientDetails}
        onOpenChange={setShowClientDetails}
        cliente={clientForDetails}
        onViewMap={handleViewClientLocation}
      />

      {/* Modal de gestión de averías */}
      {clientForAverias && (
        <GestionarAveriasDialog
          open={showAveriasDialog}
          onOpenChange={(open) => {
            setShowAveriasDialog(open);
            if (!open) closeAveriasDialog();
          }}
          cliente={clientForAverias}
          onSuccess={handleAveriasSuccess}
        />
      )}

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
              {clientForAsignarOferta
                ? `${clientForAsignarOferta.nombre} (${clientForAsignarOferta.numero})`
                : "Selecciona un cliente"}
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

            {tipoOfertaSeleccionada === "personalizada" &&
              accionPersonalizadaSeleccionada === "duplicar" && (
                <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                  <Label>Selecciona la oferta genérica a duplicar</Label>
                  {loadingOfertasGenericasAprobadas ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
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
                                  ? "border-orange-500 bg-orange-50 shadow-md"
                                  : "hover:shadow-md hover:border-orange-300"
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
                                        <span className="text-sm font-bold text-orange-600">
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
                                          ? "border-orange-600 bg-orange-600"
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
            setClientForAsignarOferta(null);
          }
        }}
      >
        <DialogContent className="max-w-full w-screen h-screen p-0 m-0 rounded-none border-0 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 px-6 py-4 border-b bg-white">
            <DialogTitle className="text-lg font-semibold text-slate-900">
              Crear oferta personalizada
            </DialogTitle>
            {clientForAsignarOferta && (
              <DialogDescription>
                Cliente: {clientForAsignarOferta.nombre} (
                {clientForAsignarOferta.numero})
              </DialogDescription>
            )}
          </div>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <ConfeccionOfertasView
              modoEdicion={false}
              clienteIdInicial={clientForAsignarOferta?.id}
              tipoContactoInicial="cliente"
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
            setClientForAsignarOferta(null);
          }
        }}
        oferta={ofertaGenericaParaDuplicar}
        clienteIdInicial={clientForAsignarOferta?.id}
        tipoContactoInicial="cliente"
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

      {/* Modal de asignar oferta genérica */}
      <AsignarOfertaGenericaDialog
        open={showAsignarOfertaDialog}
        onOpenChange={(open) => {
          setShowAsignarOfertaDialog(open);
          if (!open) closeAsignarOfertaDialog();
        }}
        cliente={clientForAsignarOferta}
        onAsignar={handleAsignarOferta}
        fetchOfertasGenericas={fetchOfertasGenericasAprobadas}
      />

      {/* Modal de ver oferta del cliente - Reutilizando AsignarOfertaGenericaDialog */}
      <AsignarOfertaGenericaDialog
        open={showVerOfertaDialog}
        onOpenChange={(open) => {
          setShowVerOfertaDialog(open);
          if (!open) closeVerOfertaDialog();
        }}
        cliente={
          clientForAsignarOferta ||
          (ofertaClienteActual
            ? ({
                nombre: ofertaClienteActual.cliente_nombre || "",
                numero: ofertaClienteActual.cliente_numero || "",
              } as Cliente)
            : null)
        }
        modo="ver"
        ofertasExistentes={ofertasClienteActuales}
        onVerDetalles={handleVerDetallesOferta}
      />

      {/* Modal de detalles completos de una oferta específica */}
      <VerOfertaClienteDialog
        open={showDetalleOfertaDialog}
        onOpenChange={(open) => {
          setShowDetalleOfertaDialog(open);
          if (!open) closeDetalleOfertaDialog();
        }}
        oferta={ofertaClienteActual}
        ofertas={ofertasClienteActuales}
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
          // Recargar ofertas después de editar
          await cargarClientesConOfertas({ skipCache: true, silent: true });
          if (refetchOfertas) refetchOfertas();
          toast({
            title: "Oferta actualizada",
            description: "Los cambios se guardaron correctamente.",
          });
        }}
      />

      {/* Diálogo de Exportación */}
      <ExportSelectionDialog
        open={mostrarDialogoExportar}
        onOpenChange={setMostrarDialogoExportar}
        oferta={ofertaParaExportar}
      />

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
    </>
  );
}
