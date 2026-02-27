"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Button } from "@/components/shared/atom/button";
import { SearchableSelect } from "@/components/shared/molecule/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import {
  Search,
  CheckCircle,
  Edit,
  Phone,
  MapPin,
  Package,
  Camera,
  Truck,
  Plus,
  Trash2,
  FileText,
  Zap,
} from "lucide-react";
import type { Cliente } from "@/lib/api-types";
import { ClienteService } from "@/lib/api-services";
import { useToast } from "@/hooks/use-toast";
import { ClienteFotosDialog } from "@/components/feats/instalaciones/cliente-fotos-dialog";
import { EntregaCelebrationAnimation } from "@/components/feats/instalaciones/entrega-celebration-animation";
import { apiRequest } from "@/lib/api-config";
import { extractOfertaIdsFromEntity } from "@/lib/utils/oferta-id";

interface InstalacionesEnProcesoTableProps {
  clients: Cliente[];
  loading: boolean;
  onFiltersChange: (filters: any) => void;
  onRefresh: () => void;
  ofertasConEntregasIds?: Set<string>;
}

interface EntregaOferta {
  cantidad: number;
  fecha: string;
}

interface EntregaDraft {
  rowId: string;
  itemKey: string;
  cantidad: string;
  fecha: string;
}

interface ItemOfertaEntrega {
  material_codigo: string;
  descripcion: string;
  cantidad: number;
  cantidad_pendiente_por_entregar?: number;
  cantidad_en_servicio?: number;
  en_servicio?: boolean;
  entregas: EntregaOferta[];
  [key: string]: any;
}

interface OfertaParaEntrega {
  id?: string;
  _id?: string;
  oferta_id?: string;
  numero_oferta?: string;
  nombre?: string;
  nombre_automatico?: string;
  items: ItemOfertaEntrega[];
  _uid: string;
  [key: string]: any;
}

type ServicioCategoria = "inversores" | "paneles" | "baterias";

const getClienteKey = (cliente: Cliente) =>
  String(cliente.numero || cliente.id || "");

const getTodayDateInput = () => new Date().toISOString().split("T")[0];

const createEntregaDraft = (): EntregaDraft => ({
  rowId: `entrega-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  itemKey: "",
  cantidad: "1",
  fecha: getTodayDateInput(),
});

const formatFecha = (value?: string) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const parseNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeMaterialCode = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toUpperCase();

const normalizeMaterialDescription = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const getServicioCategoria = (
  item: ItemOfertaEntrega,
): ServicioCategoria | null => {
  const descripcion = String(item.descripcion || "").toLowerCase();
  const codigo = String(item.material_codigo || "").toLowerCase();
  const seccion = String(item.seccion || "").toLowerCase();

  if (
    seccion.includes("inversor") ||
    descripcion.includes("inversor") ||
    codigo.includes("inv")
  ) {
    return "inversores";
  }
  if (
    seccion.includes("panel") ||
    descripcion.includes("panel") ||
    codigo.includes("pan")
  ) {
    return "paneles";
  }
  if (
    seccion.includes("bateria") ||
    seccion.includes("batería") ||
    descripcion.includes("bateria") ||
    descripcion.includes("batería") ||
    codigo.includes("bat")
  ) {
    return "baterias";
  }

  return null;
};

const getServicioItemId = (
  item: ItemOfertaEntrega,
  index: number,
  categoria: ServicioCategoria,
) => {
  const codigo = String(item.material_codigo || "")
    .trim()
    .toUpperCase();
  return codigo ? `${codigo}-${index}` : `${categoria}-${index}`;
};

const normalizeEntrega = (entrega: any): EntregaOferta => ({
  cantidad: parseNumber(entrega?.cantidad),
  fecha: typeof entrega?.fecha === "string" ? entrega.fecha : "",
});

const normalizeOfertaParaEntrega = (
  oferta: any,
  index: number,
): OfertaParaEntrega => {
  const items = Array.isArray(oferta?.items)
    ? oferta.items.map((item: any) => ({
        ...item,
        material_codigo: String(item?.material_codigo || ""),
        descripcion: String(item?.descripcion || ""),
        cantidad: parseNumber(item?.cantidad),
        cantidad_en_servicio: Number.isFinite(
          Number(item?.cantidad_en_servicio),
        )
          ? parseNumber(item?.cantidad_en_servicio)
          : undefined,
        en_servicio:
          item?.en_servicio === undefined
            ? undefined
            : Boolean(item?.en_servicio),
        cantidad_pendiente_por_entregar: Number.isFinite(
          Number(item?.cantidad_pendiente_por_entregar),
        )
          ? parseNumber(item?.cantidad_pendiente_por_entregar)
          : undefined,
        entregas: Array.isArray(item?.entregas)
          ? item.entregas.map(normalizeEntrega)
          : [],
      }))
    : [];

  return {
    ...oferta,
    items,
    _uid: String(
      oferta?.id ||
        oferta?._id ||
        oferta?.oferta_id ||
        oferta?.numero_oferta ||
        `oferta-${index}`,
    ),
  };
};

const extractOfertasConfeccion = (response: any): OfertaParaEntrega[] => {
  const payload = response?.data ?? response;

  const ofertasFromPayload = Array.isArray(payload?.ofertas)
    ? payload.ofertas
    : [];
  const ofertasFromRoot = Array.isArray(response?.ofertas)
    ? response.ofertas
    : [];
  const ofertasRaw =
    ofertasFromPayload.length > 0 ? ofertasFromPayload : ofertasFromRoot;

  if (ofertasRaw.length > 0) {
    return ofertasRaw.map((oferta: any, index: number) =>
      normalizeOfertaParaEntrega(oferta, index),
    );
  }

  const singleOferta = payload?.oferta ?? payload?.data ?? payload;
  const isSingleOferta =
    singleOferta &&
    typeof singleOferta === "object" &&
    (singleOferta.id ||
      singleOferta._id ||
      singleOferta.oferta_id ||
      singleOferta.numero_oferta ||
      Array.isArray(singleOferta.items));

  if (isSingleOferta) {
    return [normalizeOfertaParaEntrega(singleOferta, 0)];
  }

  return [];
};

const isValidOfertaIdForEdit = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^[a-f0-9]{24}$/i.test(trimmed)) return true;
  if (/^OF-\d{8}-\d{3,}$/.test(trimmed)) return true;
  return false;
};

const getOfertaPersistedId = (oferta: OfertaParaEntrega | null) => {
  if (!oferta) return null;
  const candidatos = [
    oferta._id,
    oferta.oferta_id,
    oferta.numero_oferta,
    oferta.id,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const preferido = candidatos.find((value) => isValidOfertaIdForEdit(value));
  if (preferido) return preferido;
  return candidatos[0] || null;
};

const extractApiErrorMessage = (response: any) => {
  if (!response) return null;
  if (typeof response?.message === "string" && response.message.trim()) {
    return response.message;
  }
  if (typeof response?.detail === "string" && response.detail.trim()) {
    return response.detail;
  }
  if (typeof response?.error === "string" && response.error.trim()) {
    return response.error;
  }
  if (
    response?.error &&
    typeof response.error === "object" &&
    typeof response.error.message === "string" &&
    response.error.message.trim()
  ) {
    return response.error.message;
  }
  return null;
};

const itemTieneEntregas = (item: any) => {
  const entregasRaw = Array.isArray(item?.entregas) ? item.entregas : [];
  const totalEntregas = entregasRaw.reduce(
    (sum: number, entrega: any) => sum + parseNumber(entrega?.cantidad),
    0,
  );
  if (totalEntregas > 0) return true;

  const cantidad = parseNumber(item?.cantidad);
  const pendienteRaw = Number(item?.cantidad_pendiente_por_entregar);
  if (
    Number.isFinite(pendienteRaw) &&
    cantidad > 0 &&
    parseNumber(pendienteRaw) < cantidad
  ) {
    return true;
  }

  if (
    parseNumber(item?.cantidad_entregada) > 0 ||
    parseNumber(item?.total_entregado) > 0
  ) {
    return true;
  }

  return false;
};

const ofertaTieneEntregas = (oferta: any) => {
  if (!oferta || typeof oferta !== "object") return false;

  if (
    oferta?.tiene_materiales_entregados === true ||
    oferta?.tiene_entregas === true
  ) {
    return true;
  }

  if (
    parseNumber(oferta?.materiales_entregados) > 0 ||
    parseNumber(oferta?.total_entregado) > 0
  ) {
    return true;
  }

  const itemsRaw = Array.isArray(oferta?.items)
    ? oferta.items
    : Array.isArray(oferta?.materiales)
      ? oferta.materiales
      : [];

  return itemsRaw.some((item: any) => itemTieneEntregas(item));
};

export function InstalacionesEnProcesoTable({
  clients,
  loading,
  onFiltersChange,
  onRefresh,
  ofertasConEntregasIds,
}: InstalacionesEnProcesoTableProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [materialesEntregadosFilter, setMaterialesEntregadosFilter] = useState<
    "todos" | "con_entregas" | "sin_entregas"
  >("todos");

  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [isEditFaltaDialogOpen, setIsEditFaltaDialogOpen] = useState(false);
  const [faltaValue, setFaltaValue] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [clienteFotosSeleccionado, setClienteFotosSeleccionado] =
    useState<Cliente | null>(null);
  const [entregaDialogOpen, setEntregaDialogOpen] = useState(false);
  const [clienteEntregaActivo, setClienteEntregaActivo] =
    useState<Cliente | null>(null);
  const [ofertasEntrega, setOfertasEntrega] = useState<OfertaParaEntrega[]>([]);
  const [ofertaEntregaSeleccionadaUid, setOfertaEntregaSeleccionadaUid] =
    useState("");
  const [loadingEntregaData, setLoadingEntregaData] = useState(false);
  const [savingEntrega, setSavingEntrega] = useState(false);
  const [entregaError, setEntregaError] = useState<string | null>(null);
  const [mostrarFormularioEntrega, setMostrarFormularioEntrega] =
    useState(false);
  const [entregaDrafts, setEntregaDrafts] = useState<EntregaDraft[]>([
    createEntregaDraft(),
  ]);
  const [entregasPorCliente, setEntregasPorCliente] = useState<
    Record<string, boolean>
  >({});
  const [showEntregaCelebration, setShowEntregaCelebration] = useState(false);
  const [verOfertaDialogOpen, setVerOfertaDialogOpen] = useState(false);
  const [clienteOfertaSeleccionado, setClienteOfertaSeleccionado] =
    useState<Cliente | null>(null);
  const [ofertaConfeccionCargada, setOfertaConfeccionCargada] =
    useState<OfertaParaEntrega | null>(null);
  const [loadingOfertaConfeccion, setLoadingOfertaConfeccion] = useState(false);
  const [materialServicioDialogOpen, setMaterialServicioDialogOpen] =
    useState(false);
  const [clienteMaterialServicio, setClienteMaterialServicio] =
    useState<Cliente | null>(null);
  const [ofertaServicioCargada, setOfertaServicioCargada] =
    useState<OfertaParaEntrega | null>(null);
  const [loadingOfertaServicio, setLoadingOfertaServicio] = useState(false);
  const [savingOfertaServicio, setSavingOfertaServicio] = useState(false);
  const [equiposEnServicio, setEquiposEnServicio] = useState<{
    inversores: string[];
    paneles: string[];
    baterias: string[];
  }>({
    inversores: [],
    paneles: [],
    baterias: [],
  });
  const [cantidadEnServicioPorItem, setCantidadEnServicioPorItem] = useState<
    Record<string, string>
  >({});

  const buildServicioDraftFromOferta = (
    oferta: OfertaParaEntrega | null,
  ): {
    equipos: { inversores: string[]; paneles: string[]; baterias: string[] };
    cantidades: Record<string, string>;
  } => {
    const equipos = {
      inversores: [] as string[],
      paneles: [] as string[],
      baterias: [] as string[],
    };
    const cantidades: Record<string, string> = {};

    if (!oferta?.items || oferta.items.length === 0) {
      return { equipos, cantidades };
    }

    oferta.items.forEach((item, index) => {
      const categoria = getServicioCategoria(item);
      if (!categoria) return;

      const itemId = getServicioItemId(item, index, categoria);
      const cantidadTotal = Math.max(0, parseNumber(item.cantidad));
      const cantidadEnServicioRaw = parseNumber(item.cantidad_en_servicio);
      const marcadoEnServicio = item.en_servicio === true;
      const cantidadEnServicio =
        cantidadEnServicioRaw > 0
          ? Math.min(cantidadTotal, cantidadEnServicioRaw)
          : marcadoEnServicio
            ? cantidadTotal
            : 0;

      cantidades[itemId] = String(cantidadEnServicio);
      if (cantidadEnServicio > 0 || marcadoEnServicio) {
        equipos[categoria].push(itemId);
      }
    });

    return { equipos, cantidades };
  };

  const servicioItems = useMemo(() => {
    if (
      !ofertaServicioCargada?.items ||
      ofertaServicioCargada.items.length === 0
    ) {
      return [] as Array<{
        itemIndex: number;
        itemId: string;
        categoria: ServicioCategoria;
        materialCodigo: string;
        materialCodigoPayload: string;
        descripcion: string;
        cantidadTotal: number;
      }>;
    }

    return ofertaServicioCargada.items
      .map((item, index) => {
        const categoria = getServicioCategoria(item);
        if (!categoria) return null;
        return {
          itemIndex: index,
          itemId: getServicioItemId(item, index, categoria),
          categoria,
          materialCodigo: String(item.material_codigo || "")
            .trim()
            .toUpperCase(),
          materialCodigoPayload: String(item.material_codigo || "").trim(),
          descripcion: item.descripcion || "Sin descripción",
          cantidadTotal: Math.max(0, parseNumber(item.cantidad)),
        };
      })
      .filter(
        (
          item,
        ): item is {
          itemIndex: number;
          itemId: string;
          categoria: ServicioCategoria;
          materialCodigo: string;
          materialCodigoPayload: string;
          descripcion: string;
          cantidadTotal: number;
        } => Boolean(item),
      );
  }, [ofertaServicioCargada]);

  const inversoresServicioItems = useMemo(
    () => servicioItems.filter((item) => item.categoria === "inversores"),
    [servicioItems],
  );
  const panelesServicioItems = useMemo(
    () => servicioItems.filter((item) => item.categoria === "paneles"),
    [servicioItems],
  );
  const bateriasServicioItems = useMemo(
    () => servicioItems.filter((item) => item.categoria === "baterias"),
    [servicioItems],
  );

  // Actualizar filtros cuando cambien
  useEffect(() => {
    onFiltersChange({
      searchTerm,
      fechaDesde,
      fechaHasta,
      materialesEntregados: materialesEntregadosFilter,
    });
  }, [
    searchTerm,
    fechaDesde,
    fechaHasta,
    materialesEntregadosFilter,
    onFiltersChange,
  ]);

  // Formatear ofertas para mostrar
  const formatOfertas = (ofertas: any[]) => {
    if (!ofertas || ofertas.length === 0) return "Sin oferta";

    return ofertas
      .map((oferta: any) => {
        const productos: string[] = [];

        if (oferta.inversor_codigo && oferta.inversor_cantidad > 0) {
          const nombre = oferta.inversor_nombre || oferta.inversor_codigo;
          productos.push(`${oferta.inversor_cantidad}x ${nombre}`);
        }

        if (oferta.bateria_codigo && oferta.bateria_cantidad > 0) {
          const nombre = oferta.bateria_nombre || oferta.bateria_codigo;
          productos.push(`${oferta.bateria_cantidad}x ${nombre}`);
        }

        if (oferta.panel_codigo && oferta.panel_cantidad > 0) {
          const nombre = oferta.panel_nombre || oferta.panel_codigo;
          productos.push(`${oferta.panel_cantidad}x ${nombre}`);
        }

        if (oferta.elementos_personalizados) {
          productos.push(oferta.elementos_personalizados);
        }

        return productos.join(" • ");
      })
      .join(" | ");
  };

  // Cambiar estado a "Equipo Instalado con Éxito"
  const handleCambiarEstado = async (client: Cliente) => {
    setIsUpdating(true);
    try {
      await ClienteService.actualizarCliente(client.numero, {
        estado: "Equipo Instalado con Éxito",
      });
      toast({
        title: "Estado actualizado",
        description: `El cliente ${client.nombre} ahora tiene estado "Equipo Instalado con Éxito"`,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el estado",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Abrir diálogo para editar "Qué falta"
  const handleEditFalta = (client: Cliente) => {
    setSelectedClient(client);
    setFaltaValue(client.falta_instalacion || "");
    setIsEditFaltaDialogOpen(true);
  };

  // Guardar cambios en "Qué falta"
  const handleSaveFalta = async () => {
    if (!selectedClient) return;

    setIsUpdating(true);
    try {
      await ClienteService.actualizarCliente(selectedClient.numero, {
        falta_instalacion: faltaValue,
      });
      toast({
        title: "Actualizado",
        description: "Se actualizó lo que falta para la instalación",
      });
      setIsEditFaltaDialogOpen(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenFotos = (client: Cliente) => {
    setClienteFotosSeleccionado(client);
  };

  const handleVerOferta = async (client: Cliente) => {
    setClienteOfertaSeleccionado(client);
    setVerOfertaDialogOpen(true);
    setLoadingOfertaConfeccion(true);
    setOfertaConfeccionCargada(null);

    try {
      const ofertas = await loadOfertasParaEntrega(client);
      if (ofertas.length > 0) {
        setOfertaConfeccionCargada(ofertas[0]);
      } else {
        toast({
          title: "Sin oferta confeccionada",
          description:
            "No se encontró una oferta confeccionada para este cliente.",
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error("Error cargando oferta confeccionada:", error);
      toast({
        title: "Error",
        description:
          error?.message || "No se pudo cargar la oferta confeccionada",
        variant: "destructive",
      });
    } finally {
      setLoadingOfertaConfeccion(false);
    }
  };

  const handleMaterialEnServicio = async (client: Cliente) => {
    setClienteMaterialServicio(client);
    setMaterialServicioDialogOpen(true);
    setLoadingOfertaServicio(true);
    setSavingOfertaServicio(false);
    setOfertaServicioCargada(null);
    setEquiposEnServicio({
      inversores: [],
      paneles: [],
      baterias: [],
    });
    setCantidadEnServicioPorItem({});

    try {
      const ofertas = await loadOfertasParaEntrega(client);
      if (ofertas.length > 0) {
        const oferta = ofertas[0];
        setOfertaServicioCargada(oferta);
        const draft = buildServicioDraftFromOferta(oferta);
        setEquiposEnServicio(draft.equipos);
        setCantidadEnServicioPorItem(draft.cantidades);
      } else {
        toast({
          title: "Sin oferta confeccionada",
          description:
            "No se encontró una oferta confeccionada para este cliente.",
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error("Error cargando oferta para servicio:", error);
      toast({
        title: "Error",
        description: error?.message || "No se pudo cargar la oferta",
        variant: "destructive",
      });
    } finally {
      setLoadingOfertaServicio(false);
    }
  };

  const handleGuardarEquiposEnServicio = async () => {
    if (!ofertaServicioCargada || !clienteMaterialServicio) {
      toast({
        title: "Error",
        description: "No hay oferta cargada para actualizar.",
        variant: "destructive",
      });
      return;
    }

    const ofertaId = getOfertaPersistedId(ofertaServicioCargada);
    if (!ofertaId) {
      toast({
        title: "Error",
        description: "No se pudo identificar la oferta.",
        variant: "destructive",
      });
      return;
    }

    const cambiosEsperadosPorIndex = new Map<
      number,
      {
        codigo: string;
        descripcion: string;
        cantidad: number;
      }
    >();

    for (const item of servicioItems) {
      const seleccionados = equiposEnServicio[item.categoria];
      const marcado = seleccionados.includes(item.itemId);
      const cantidadRaw = marcado
        ? parseNumber(cantidadEnServicioPorItem[item.itemId])
        : 0;
      const cantidad = Math.max(0, Math.min(item.cantidadTotal, cantidadRaw));

      if (marcado && cantidad <= 0) {
        toast({
          title: "Cantidad inválida",
          description: `Debes indicar una cantidad en servicio mayor que 0 para ${item.descripcion}.`,
          variant: "destructive",
        });
        return;
      }

      if (!item.materialCodigoPayload) {
        if (marcado || cantidad > 0) {
          toast({
            title: "Material sin código",
            description:
              "Hay materiales seleccionados sin código, no se pueden guardar en servicio.",
            variant: "destructive",
          });
          return;
        }
        continue;
      }

      cambiosEsperadosPorIndex.set(item.itemIndex, {
        codigo: item.materialCodigoPayload,
        descripcion: item.descripcion,
        cantidad,
      });
    }

    if (cambiosEsperadosPorIndex.size === 0) {
      toast({
        title: "Sin materiales",
        description: "No hay materiales válidos para guardar en servicio.",
        variant: "destructive",
      });
      return;
    }

    const itemsActualizados = (ofertaServicioCargada.items || []).map(
      (item, index) => {
        const cambio = cambiosEsperadosPorIndex.get(index);
        if (!cambio) return item;
        return {
          ...item,
          cantidad_en_servicio: cambio.cantidad,
          en_servicio: cambio.cantidad > 0,
        };
      },
    );

    setSavingOfertaServicio(true);
    try {
      const ofertaPayloadCompleta: Record<string, unknown> = {
        ...ofertaServicioCargada,
        items: itemsActualizados,
        materiales: itemsActualizados,
      };
      delete ofertaPayloadCompleta._uid;

      let response = await apiRequest<any>(
        `/ofertas/confeccion/${encodeURIComponent(ofertaId)}`,
        {
          method: "PUT",
          body: JSON.stringify(ofertaPayloadCompleta),
        },
      );

      if (response?.success === false || response?.error) {
        response = await apiRequest<any>(
          `/ofertas/confeccion/${encodeURIComponent(ofertaId)}`,
          {
            method: "PATCH",
            body: JSON.stringify(ofertaPayloadCompleta),
          },
        );
      }

      if (response?.success === false || response?.error) {
        response = await apiRequest<any>(
          `/ofertas/confeccion/${encodeURIComponent(ofertaId)}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              items: itemsActualizados,
              materiales: itemsActualizados,
            }),
          },
        );
      }

      if (response?.success === false || response?.error) {
        throw new Error(
          extractApiErrorMessage(response) ||
            "No se pudieron actualizar los materiales en servicio.",
        );
      }

      const ofertasRecargadas = await loadOfertasParaEntrega(
        clienteMaterialServicio,
      );
      const ofertaRecargada = ofertasRecargadas.find(
        (oferta) => getOfertaPersistedId(oferta) === ofertaId,
      );
      if (!ofertaRecargada) {
        throw new Error(
          "La oferta no apareció al recargar después de guardar.",
        );
      }

      const itemsRecargados = Array.isArray(ofertaRecargada.items)
        ? ofertaRecargada.items
        : [];

      for (const [
        itemIndex,
        cambioEsperado,
      ] of cambiosEsperadosPorIndex.entries()) {
        const codeEsperado = normalizeMaterialCode(cambioEsperado.codigo);
        const descripcionEsperada = normalizeMaterialDescription(
          cambioEsperado.descripcion,
        );

        const itemByIndex = itemsRecargados[itemIndex];
        const itemRecargado =
          itemByIndex &&
          (normalizeMaterialCode(itemByIndex.material_codigo) ===
            codeEsperado ||
            normalizeMaterialDescription(itemByIndex.descripcion) ===
              descripcionEsperada)
            ? itemByIndex
            : itemsRecargados.find((item) => {
                const sameCode =
                  codeEsperado !== "" &&
                  normalizeMaterialCode(item.material_codigo) === codeEsperado;
                const sameDescription =
                  descripcionEsperada !== "" &&
                  normalizeMaterialDescription(item.descripcion) ===
                    descripcionEsperada;
                return sameCode || sameDescription;
              });

        if (!itemRecargado) {
          throw new Error(
            "El backend respondió éxito, pero no devolvió el material actualizado.",
          );
        }

        const cantidadGuardada = parseNumber(
          itemRecargado.cantidad_en_servicio,
        );
        if (cantidadGuardada !== cambioEsperado.cantidad) {
          throw new Error(
            "El backend respondió éxito, pero no persistió cantidad_en_servicio en la oferta.",
          );
        }
      }

      if (ofertaRecargada) {
        setOfertaServicioCargada(ofertaRecargada);
        const draft = buildServicioDraftFromOferta(ofertaRecargada);
        setEquiposEnServicio(draft.equipos);
        setCantidadEnServicioPorItem(draft.cantidades);
      }

      toast({
        title: "Equipos registrados",
        description:
          "Los materiales en servicio se actualizaron correctamente en la oferta.",
      });
      setMaterialServicioDialogOpen(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.message ||
          "No se pudieron actualizar los materiales en servicio.",
        variant: "destructive",
      });
    } finally {
      setSavingOfertaServicio(false);
    }
  };

  const clienteTieneEntregas = (client: Cliente) => {
    const hasByRootFlags =
      (client as any)?.tiene_materiales_entregados === true ||
      parseNumber((client as any)?.materiales_entregados) > 0;
    if (hasByRootFlags) return true;

    const hasByEndpointIds =
      !!ofertasConEntregasIds &&
      ofertasConEntregasIds.size > 0 &&
      extractOfertaIdsFromEntity(client).some((id) =>
        ofertasConEntregasIds.has(id),
      );
    if (hasByEndpointIds) return true;

    return (
      Array.isArray(client.ofertas) &&
      client.ofertas.some((oferta) => ofertaTieneEntregas(oferta as any))
    );
  };

  const getEntregaStatus = (client: Cliente) => {
    const key = getClienteKey(client);
    if (key in entregasPorCliente) {
      return entregasPorCliente[key];
    }
    return clienteTieneEntregas(client);
  };

  const resetEntregaForm = () => {
    setEntregaDrafts([createEntregaDraft()]);
    setEntregaError(null);
  };

  const addEntregaDraftRow = () => {
    setEntregaDrafts((prev) => [...prev, createEntregaDraft()]);
  };

  const removeEntregaDraftRow = (rowId: string) => {
    setEntregaDrafts((prev) => {
      const next = prev.filter((row) => row.rowId !== rowId);
      return next.length > 0 ? next : [createEntregaDraft()];
    });
  };

  const updateEntregaDraft = (
    rowId: string,
    patch: Partial<Omit<EntregaDraft, "rowId">>,
  ) => {
    setEntregaDrafts((prev) =>
      prev.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)),
    );
  };

  const loadOfertasParaEntrega = async (client: Cliente) => {
    const endpoint = `/ofertas/confeccion/cliente/${client.numero || client.id}`;
    const response = await apiRequest<any>(endpoint, { method: "GET" });
    if (response?.success === false && !response?.data && !response?.ofertas) {
      return [];
    }
    return extractOfertasConfeccion(response);
  };

  const handleOpenEntregaEquipo = async (client: Cliente) => {
    setClienteEntregaActivo(client);
    setLoadingEntregaData(true);
    setEntregaDialogOpen(true);
    resetEntregaForm();
    setEntregaError(null);

    try {
      const ofertas = await loadOfertasParaEntrega(client);
      if (ofertas.length === 0) {
        toast({
          title: "Sin oferta",
          description:
            "No se encontró una oferta confeccionada para registrar entregas.",
          variant: "default",
        });
        setEntregaDialogOpen(false);
        setClienteEntregaActivo(null);
        return;
      }

      setOfertasEntrega(ofertas);
      const ofertaConEntregas = ofertas.find((oferta) =>
        ofertaTieneEntregas(oferta),
      );
      const ofertaInicial = ofertaConEntregas || ofertas[0];
      setOfertaEntregaSeleccionadaUid(ofertaInicial._uid);
      setMostrarFormularioEntrega(!ofertaTieneEntregas(ofertaInicial));

      setEntregasPorCliente((prev) => ({
        ...prev,
        [getClienteKey(client)]: ofertas.some((oferta) =>
          ofertaTieneEntregas(oferta),
        ),
      }));
    } catch (error: any) {
      console.error("Error cargando oferta para entregas:", error);
      toast({
        title: "Error",
        description:
          error?.message ||
          "No se pudo cargar la oferta para registrar entregas",
        variant: "destructive",
      });
      setEntregaDialogOpen(false);
      setClienteEntregaActivo(null);
    } finally {
      setLoadingEntregaData(false);
    }
  };

  const handleCloseEntregaDialog = (open: boolean) => {
    setEntregaDialogOpen(open);
    if (!open) {
      setClienteEntregaActivo(null);
      setOfertasEntrega([]);
      setOfertaEntregaSeleccionadaUid("");
      setMostrarFormularioEntrega(false);
      resetEntregaForm();
      setLoadingEntregaData(false);
      setSavingEntrega(false);
      setEntregaError(null);
    }
  };

  const ofertaEntregaSeleccionada = useMemo(
    () =>
      ofertasEntrega.find(
        (oferta) => oferta._uid === ofertaEntregaSeleccionadaUid,
      ) ||
      ofertasEntrega[0] ||
      null,
    [ofertasEntrega, ofertaEntregaSeleccionadaUid],
  );

  const detalleItemsEntrega = useMemo(() => {
    if (!ofertaEntregaSeleccionada) return [];

    return (ofertaEntregaSeleccionada.items || []).map((item, index) => {
      const entregas = Array.isArray(item.entregas)
        ? item.entregas.map(normalizeEntrega)
        : [];
      const totalEntregado = entregas.reduce(
        (sum, entrega) => sum + parseNumber(entrega.cantidad),
        0,
      );
      const cantidadTotal = parseNumber(item.cantidad);
      const pendienteCalculado = Math.max(0, cantidadTotal - totalEntregado);
      const pendiente =
        Number.isFinite(Number(item.cantidad_pendiente_por_entregar)) &&
        item.cantidad_pendiente_por_entregar !== undefined
          ? parseNumber(item.cantidad_pendiente_por_entregar)
          : pendienteCalculado;

      return {
        key: `${index}-${item.material_codigo || "sin-codigo"}`,
        itemIndex: index,
        descripcion: item.descripcion || "Material sin descripción",
        codigo: item.material_codigo || "--",
        cantidadTotal,
        totalEntregado,
        pendiente,
        entregas,
      };
    });
  }, [ofertaEntregaSeleccionada]);

  const detalleItemsEntregados = useMemo(
    () => detalleItemsEntrega.filter((item) => item.entregas.length > 0),
    [detalleItemsEntrega],
  );

  const detalleItemsPendientes = useMemo(
    () => detalleItemsEntrega.filter((item) => item.pendiente > 0),
    [detalleItemsEntrega],
  );

  const resumenEntrega = useMemo(() => {
    const totalMateriales = detalleItemsEntrega.length;
    const totalUnidades = detalleItemsEntrega.reduce(
      (acc, item) => acc + item.cantidadTotal,
      0,
    );
    const unidadesEntregadas = detalleItemsEntrega.reduce(
      (acc, item) => acc + item.totalEntregado,
      0,
    );
    const unidadesPendientes = detalleItemsEntrega.reduce(
      (acc, item) => acc + Math.max(0, item.pendiente),
      0,
    );

    return {
      totalMateriales,
      materialesEntregados: detalleItemsEntregados.length,
      materialesPendientes: detalleItemsPendientes.length,
      totalUnidades,
      unidadesEntregadas,
      unidadesPendientes,
      avance:
        totalUnidades > 0
          ? Math.min(
              100,
              Math.round((unidadesEntregadas / totalUnidades) * 100),
            )
          : 0,
    };
  }, [detalleItemsEntrega, detalleItemsEntregados, detalleItemsPendientes]);

  const detalleItemsEntregaMap = useMemo(() => {
    const map = new Map<string, (typeof detalleItemsEntrega)[number]>();
    detalleItemsEntrega.forEach((item) => map.set(item.key, item));
    return map;
  }, [detalleItemsEntrega]);

  const getMaterialOptionsForDraft = (rowId: string) => {
    const currentSelection =
      entregaDrafts.find((row) => row.rowId === rowId)?.itemKey || "";
    const selectedByOthers = new Set(
      entregaDrafts
        .filter((row) => row.rowId !== rowId)
        .map((row) => row.itemKey)
        .filter(Boolean),
    );

    return detalleItemsEntrega
      .filter(
        (item) =>
          item.pendiente > 0 &&
          (!selectedByOthers.has(item.key) || item.key === currentSelection),
      )
      .map((item) => ({
        value: item.key,
        label: `${item.descripcion} (${item.pendiente} u pendientes)`,
      }));
  };

  const handleOfertaEntregaChange = (uid: string) => {
    setOfertaEntregaSeleccionadaUid(uid);
    const oferta = ofertasEntrega.find((item) => item._uid === uid) || null;
    setMostrarFormularioEntrega(!ofertaTieneEntregas(oferta));
    resetEntregaForm();
  };

  const handleSaveEntrega = async () => {
    console.log("🚀 Click en Guardar entregas (en proceso)");
    if (!clienteEntregaActivo || !ofertaEntregaSeleccionada) {
      setEntregaError("No hay oferta cargada para guardar la entrega.");
      return;
    }

    setEntregaError("Validando datos...");
    const ofertaId = getOfertaPersistedId(ofertaEntregaSeleccionada);
    if (!ofertaId) {
      setEntregaError(
        "No se pudo identificar la oferta para guardar la entrega.",
      );
      return;
    }

    setSavingEntrega(true);
    try {
      const filasActivas = entregaDrafts.filter(
        (row) => row.itemKey || row.cantidad.trim() !== "",
      );

      if (filasActivas.length === 0) {
        throw new Error(
          "Agrega al menos un material para registrar la entrega.",
        );
      }

      const materialKeys = new Set<string>();
      const entregasPorItemIndex = new Map<number, EntregaOferta[]>();
      const expectedTotalsByItemKey = new Map<string, number>();

      for (const fila of filasActivas) {
        if (!fila.itemKey) {
          throw new Error(
            "Selecciona el material en todas las filas cargadas.",
          );
        }
        if (materialKeys.has(fila.itemKey)) {
          throw new Error(
            "No repitas el mismo material. Usa una sola fila por material.",
          );
        }
        materialKeys.add(fila.itemKey);

        const item = detalleItemsEntregaMap.get(fila.itemKey);
        if (!item) {
          throw new Error(
            "Uno de los materiales seleccionados ya no está disponible.",
          );
        }

        const cantidad = parseNumber(fila.cantidad);
        if (cantidad <= 0) {
          throw new Error(
            `La cantidad entregada para "${item.descripcion}" debe ser mayor que 0.`,
          );
        }
        if (cantidad > item.pendiente) {
          throw new Error(
            `La cantidad para "${item.descripcion}" no puede superar lo pendiente (${item.pendiente} u).`,
          );
        }
        if (!fila.fecha) {
          throw new Error(
            `Selecciona la fecha de entrega para "${item.descripcion}".`,
          );
        }

        const fechaDate = new Date(`${fila.fecha}T12:00:00`);
        if (Number.isNaN(fechaDate.getTime())) {
          throw new Error(
            `La fecha de entrega para "${item.descripcion}" no es válida.`,
          );
        }

        const entregaNueva: EntregaOferta = {
          cantidad,
          fecha: fechaDate.toISOString(),
        };

        const prev = entregasPorItemIndex.get(item.itemIndex) || [];
        entregasPorItemIndex.set(item.itemIndex, [...prev, entregaNueva]);

        const totalPrevioEsperado =
          expectedTotalsByItemKey.get(item.key) ?? item.totalEntregado;
        expectedTotalsByItemKey.set(item.key, totalPrevioEsperado + cantidad);
      }

      const itemsActualizados = (ofertaEntregaSeleccionada.items || []).map(
        (item, idx) => {
          const nuevasEntregas = entregasPorItemIndex.get(idx);
          if (!nuevasEntregas || nuevasEntregas.length === 0) return item;

          const entregasActuales = Array.isArray(item.entregas)
            ? item.entregas.map(normalizeEntrega)
            : [];
          const entregasCombinadas = [...entregasActuales, ...nuevasEntregas];

          const sumaEntregas = entregasCombinadas.reduce(
            (sum, entrega) => sum + parseNumber(entrega.cantidad),
            0,
          );
          const cantidadTotal = parseNumber(item.cantidad);
          if (sumaEntregas > cantidadTotal) {
            throw new Error(
              `La suma de entregas no puede superar ${cantidadTotal} u para ${item.descripcion || item.material_codigo || "el material seleccionado"}.`,
            );
          }

          return {
            ...item,
            entregas: entregasCombinadas,
          };
        },
      );

      const ofertaPayloadCompleta: Record<string, unknown> = {
        ...ofertaEntregaSeleccionada,
        items: itemsActualizados,
        materiales: itemsActualizados,
      };
      delete ofertaPayloadCompleta._uid;

      let response = await apiRequest<any>(`/ofertas/confeccion/${ofertaId}`, {
        method: "PUT",
        body: JSON.stringify(ofertaPayloadCompleta),
      });

      if (response?.success === false || response?.error) {
        response = await apiRequest<any>(`/ofertas/confeccion/${ofertaId}`, {
          method: "PATCH",
          body: JSON.stringify(ofertaPayloadCompleta),
        });
      }

      if (response?.success === false || response?.error) {
        response = await apiRequest<any>(`/ofertas/confeccion/${ofertaId}`, {
          method: "PATCH",
          body: JSON.stringify({
            items: itemsActualizados,
            materiales: itemsActualizados,
          }),
        });
      }

      if (response?.success === false || response?.error) {
        throw new Error(
          extractApiErrorMessage(response) || "No se pudo guardar la entrega.",
        );
      }

      const ofertasRecargadas =
        await loadOfertasParaEntrega(clienteEntregaActivo);
      const ofertaRecargada = ofertasRecargadas.find(
        (oferta) => getOfertaPersistedId(oferta) === ofertaId,
      );

      if (!ofertaRecargada) {
        throw new Error(
          "La oferta no apareció al recargar después de guardar.",
        );
      }

      const itemsRecargados = Array.isArray(ofertaRecargada.items)
        ? ofertaRecargada.items
        : [];

      for (const [
        itemKey,
        totalEsperado,
      ] of expectedTotalsByItemKey.entries()) {
        const itemEsperado = detalleItemsEntregaMap.get(itemKey);
        if (!itemEsperado) continue;

        const codeEsperado = normalizeMaterialCode(itemEsperado.codigo);
        const descripcionEsperada = normalizeMaterialDescription(
          itemEsperado.descripcion,
        );

        const itemByIndex = itemsRecargados[itemEsperado.itemIndex];
        const itemRecargado =
          itemByIndex &&
          (normalizeMaterialCode(itemByIndex.material_codigo) ===
            codeEsperado ||
            normalizeMaterialDescription(itemByIndex.descripcion) ===
              descripcionEsperada)
            ? itemByIndex
            : itemsRecargados.find((item) => {
                const sameCode =
                  codeEsperado !== "" &&
                  normalizeMaterialCode(item.material_codigo) === codeEsperado;
                const sameDescription =
                  descripcionEsperada !== "" &&
                  normalizeMaterialDescription(item.descripcion) ===
                    descripcionEsperada;
                return sameCode || sameDescription;
              });

        const entregasRecargadas = Array.isArray(itemRecargado?.entregas)
          ? itemRecargado.entregas.map(normalizeEntrega)
          : [];
        const totalRecargado = entregasRecargadas.reduce(
          (sum, entrega) => sum + parseNumber(entrega.cantidad),
          0,
        );

        if (totalRecargado < totalEsperado) {
          throw new Error(
            "El backend respondió éxito, pero no persistió las entregas en la oferta.",
          );
        }
      }

      setOfertasEntrega(ofertasRecargadas);
      setOfertaEntregaSeleccionadaUid((prev) => {
        const existe = ofertasRecargadas.some((oferta) => oferta._uid === prev);
        if (existe) return prev;
        const ofertaActualizada = ofertasRecargadas.find(
          (oferta) => getOfertaPersistedId(oferta) === ofertaId,
        );
        return ofertaActualizada?._uid || ofertasRecargadas[0]?._uid || "";
      });

      setMostrarFormularioEntrega(false);
      resetEntregaForm();
      setEntregaError(null);
      setEntregasPorCliente((prev) => ({
        ...prev,
        [getClienteKey(clienteEntregaActivo)]: ofertasRecargadas.some(
          (oferta) => ofertaTieneEntregas(oferta),
        ),
      }));

      await Promise.resolve(onRefresh());
      toast({
        title: "Entrega registrada",
        description: "La entrega de equipo se guardó correctamente.",
      });
      setShowEntregaCelebration(true);
    } catch (error: any) {
      const message = error?.message || "No se pudo guardar la entrega";
      setEntregaError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSavingEntrega(false);
    }
  };

  return (
    <>
      {/* Filtros */}
      <Card className="mb-6 border-l-4 border-l-blue-600">
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nombre, teléfono, dirección..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="materiales-entregados">
                Materiales Entregados
              </Label>
              <select
                id="materiales-entregados"
                className="w-full border rounded px-3 py-2 bg-white"
                value={materialesEntregadosFilter}
                onChange={(e) =>
                  setMaterialesEntregadosFilter(
                    e.target.value as "todos" | "con_entregas" | "sin_entregas",
                  )
                }
              >
                <option value="todos">Todos</option>
                <option value="con_entregas">Con materiales entregados</option>
                <option value="sin_entregas">Sin materiales entregados</option>
              </select>
            </div>
            <div>
              <Label htmlFor="fecha-desde">Fecha Desde</Label>
              <Input
                id="fecha-desde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="fecha-hasta">Fecha Hasta</Label>
              <Input
                id="fecha-hasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="border-l-4 border-l-blue-600">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Instalaciones en Proceso ({clients.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 && !loading ? (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay instalaciones en proceso
              </h3>
              <p className="text-gray-600">
                No se encontraron clientes con instalación en proceso
              </p>
            </div>
          ) : (
            <>
              {/* Vista móvil */}
              <div className="md:hidden space-y-3">
                {clients.map((client) => (
                  <Card key={client.numero} className="border-gray-200">
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {client.nombre}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <Phone className="h-3 w-3" />
                          <span>{client.telefono}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-gray-600 mt-1">
                          <MapPin className="h-3 w-3 mt-0.5" />
                          <span>{client.direccion}</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Oferta:</p>
                        <p className="text-sm text-gray-700">
                          {formatOfertas(client.ofertas || [])}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Qué falta:</p>
                        <p className="text-sm text-gray-700">
                          {client.falta_instalacion || "No especificado"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                          onClick={() => handleVerOferta(client)}
                          title="Ver oferta"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="border-purple-300 text-purple-700 hover:bg-purple-50"
                          onClick={() => handleMaterialEnServicio(client)}
                          title="Equipos en servicio"
                        >
                          <Zap className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant={
                            getEntregaStatus(client) ? "default" : "outline"
                          }
                          className={
                            getEntregaStatus(client)
                              ? "border-emerald-800 bg-emerald-700 text-white hover:bg-emerald-800 hover:border-emerald-900 shadow-md shadow-emerald-500/40 ring-1 ring-emerald-300 transition-all duration-200"
                              : "border-gray-300 text-gray-600 hover:bg-gray-50"
                          }
                          onClick={() => handleOpenEntregaEquipo(client)}
                          title={
                            getEntregaStatus(client)
                              ? "Ver entregas de equipo"
                              : "Registrar entrega de equipo"
                          }
                        >
                          <Truck className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="border-green-300 text-green-700 hover:bg-green-50"
                          onClick={() => handleCambiarEstado(client)}
                          disabled={isUpdating}
                          title="Marcar como instalado"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="border-orange-300 text-orange-700 hover:bg-orange-50"
                          onClick={() => handleEditFalta(client)}
                          title="Editar qué falta"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="border-sky-300 text-sky-700 hover:bg-sky-50"
                          onClick={() => handleOpenFotos(client)}
                          title="Ver fotos del cliente"
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Vista escritorio */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Nombre
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Teléfonos
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Dirección
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Oferta
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Qué Falta
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr
                        key={client.numero}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-4 px-4">
                          <p className="font-semibold text-gray-900">
                            {client.nombre}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">
                            {client.telefono}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">
                            {client.direccion}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">
                            {formatOfertas(client.ofertas || [])}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">
                            {client.falta_instalacion || "No especificado"}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="border-blue-300 text-blue-700 hover:bg-blue-50"
                              onClick={() => handleVerOferta(client)}
                              title="Ver oferta"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="border-purple-300 text-purple-700 hover:bg-purple-50"
                              onClick={() => handleMaterialEnServicio(client)}
                              title="Equipos en servicio"
                            >
                              <Zap className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant={
                                getEntregaStatus(client) ? "default" : "outline"
                              }
                              className={
                                getEntregaStatus(client)
                                  ? "border-emerald-800 bg-emerald-700 text-white hover:bg-emerald-800 hover:border-emerald-900 shadow-md shadow-emerald-500/40 ring-1 ring-emerald-300 transition-all duration-200"
                                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
                              }
                              onClick={() => handleOpenEntregaEquipo(client)}
                              title={
                                getEntregaStatus(client)
                                  ? "Ver entregas de equipo"
                                  : "Registrar entrega de equipo"
                              }
                            >
                              <Truck className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="border-green-300 text-green-700 hover:bg-green-50"
                              onClick={() => handleCambiarEstado(client)}
                              disabled={isUpdating}
                              title="Marcar como instalado"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="border-orange-300 text-orange-700 hover:bg-orange-50"
                              onClick={() => handleEditFalta(client)}
                              title="Editar qué falta"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="border-sky-300 text-sky-700 hover:bg-sky-50"
                              onClick={() => handleOpenFotos(client)}
                              title="Ver fotos del cliente"
                            >
                              <Camera className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={entregaDialogOpen} onOpenChange={handleCloseEntregaDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto gap-3 p-4 sm:p-5">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-2xl font-bold text-slate-900">
              Entrega de equipo
              {clienteEntregaActivo ? ` - ${clienteEntregaActivo.nombre}` : ""}
            </DialogTitle>
            <p className="text-sm text-slate-600">
              Registra equipos entregados antes de la instalación.
            </p>
          </DialogHeader>

          {loadingEntregaData ? (
            <div className="py-8 text-center text-sm text-slate-600">
              Cargando oferta y entregas...
            </div>
          ) : ofertasEntrega.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-600">
              No hay oferta disponible para registrar entregas.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4 space-y-3">
              {ofertasEntrega.length > 1 && (
                <div className="space-y-1">
                  <Label
                    htmlFor="oferta-entrega-proceso"
                    className="text-sm font-medium text-slate-700"
                  >
                    Oferta
                  </Label>
                  <select
                    id="oferta-entrega-proceso"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white text-slate-900"
                    value={ofertaEntregaSeleccionadaUid}
                    onChange={(e) => handleOfertaEntregaChange(e.target.value)}
                  >
                    {ofertasEntrega.map((oferta, idx) => (
                      <option key={oferta._uid} value={oferta._uid}>
                        {oferta.nombre ||
                          oferta.nombre_automatico ||
                          oferta.numero_oferta ||
                          `Oferta ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!mostrarFormularioEntrega && ofertaEntregaSeleccionada && (
                <div className="space-y-4">
                  <Card className="border-slate-200 bg-white shadow-sm">
                    <CardContent className="p-3 sm:p-4 space-y-3">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">
                            Materiales
                          </p>
                          <p className="text-lg font-semibold text-slate-900">
                            {resumenEntrega.totalMateriales}
                          </p>
                        </div>
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-wide text-emerald-700">
                            Entregados
                          </p>
                          <p className="text-lg font-semibold text-emerald-800">
                            {resumenEntrega.materialesEntregados}
                          </p>
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-wide text-amber-700">
                            Pendientes
                          </p>
                          <p className="text-lg font-semibold text-amber-800">
                            {resumenEntrega.materialesPendientes}
                          </p>
                        </div>
                        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-wide text-sky-700">
                            Avance
                          </p>
                          <p className="text-lg font-semibold text-sky-800">
                            {resumenEntrega.avance}%
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>
                            {resumenEntrega.unidadesEntregadas} u entregadas
                          </span>
                          <span>
                            {resumenEntrega.unidadesPendientes} u pendientes
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-sky-500 transition-all"
                            style={{ width: `${resumenEntrega.avance}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <Card className="border-emerald-200 bg-white shadow-sm">
                      <CardContent className="p-3 space-y-2.5 h-[350px] flex flex-col">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-emerald-800">
                            Materiales entregados
                          </h4>
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            {detalleItemsEntregados.length}
                          </span>
                        </div>
                        {detalleItemsEntregados.length === 0 ? (
                          <div className="rounded-md border border-emerald-100 bg-emerald-50/40 px-3 py-4 text-sm text-emerald-700">
                            Aún no se han registrado entregas.
                          </div>
                        ) : (
                          <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                            {detalleItemsEntregados.map((item) => {
                              const ultimaFechaEntrega =
                                item.entregas
                                  .map((entrega) => new Date(entrega.fecha))
                                  .filter(
                                    (date) => !Number.isNaN(date.getTime()),
                                  )
                                  .sort(
                                    (a, b) => b.getTime() - a.getTime(),
                                  )[0] || null;
                              return (
                                <div
                                  key={item.key}
                                  className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-2.5 space-y-1.5"
                                >
                                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                                    <p className="text-sm font-semibold text-slate-900 min-w-0">
                                      {item.descripcion}
                                    </p>
                                    <p className="text-xs text-emerald-700 font-semibold sm:text-right">
                                      Entregados {item.totalEntregado} de{" "}
                                      {item.cantidadTotal}
                                    </p>
                                  </div>
                                  <p className="text-xs text-slate-600">
                                    Fecha:{" "}
                                    {ultimaFechaEntrega
                                      ? formatFecha(
                                          ultimaFechaEntrega.toISOString(),
                                        )
                                      : "--"}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-amber-200 bg-white shadow-sm">
                      <CardContent className="p-3 space-y-2.5 h-[350px] flex flex-col">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-amber-800">
                            Materiales pendientes
                          </h4>
                          <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            {detalleItemsPendientes.length}
                          </span>
                        </div>
                        {detalleItemsPendientes.length === 0 ? (
                          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-4 text-sm text-emerald-700">
                            Todo el material de esta oferta ya fue entregado.
                          </div>
                        ) : (
                          <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                            {detalleItemsPendientes.map((item) => {
                              return (
                                <div
                                  key={item.key}
                                  className="rounded-lg border border-amber-100 bg-amber-50/40 p-2.5"
                                >
                                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                                    <p className="text-sm font-semibold text-slate-900 min-w-0">
                                      {item.descripcion}
                                    </p>
                                    <p className="text-xs text-amber-700 font-semibold sm:text-right">
                                      Cantidad pendiente: {item.pendiente} u
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="sticky bottom-0 z-10 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-300 text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        setMostrarFormularioEntrega(true);
                        resetEntregaForm();
                      }}
                    >
                      Agregar otra entrega
                    </Button>
                  </div>
                </div>
              )}

              {mostrarFormularioEntrega && (
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardContent className="p-3.5 sm:p-4 space-y-3.5">
                    <div className="hidden md:grid md:grid-cols-12 gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 px-1">
                      <div className="md:col-span-5">Material</div>
                      <div className="md:col-span-2">Cantidad Entregada</div>
                      <div className="md:col-span-2">Pendiente</div>
                      <div className="md:col-span-2">Fecha de Entrega</div>
                      <div className="md:col-span-1 text-center">Acción</div>
                    </div>

                    <div className="space-y-2">
                      {entregaDrafts.map((row) => {
                        const itemSeleccionado = row.itemKey
                          ? detalleItemsEntregaMap.get(row.itemKey) || null
                          : null;

                        return (
                          <div
                            key={row.rowId}
                            className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start rounded-lg border border-slate-200 bg-slate-50/70 p-2"
                          >
                            <div className="md:col-span-5 space-y-1">
                              <Label className="md:hidden text-xs font-medium text-slate-600">
                                Material
                              </Label>
                              <SearchableSelect
                                options={getMaterialOptionsForDraft(row.rowId)}
                                value={row.itemKey}
                                onValueChange={(value) =>
                                  updateEntregaDraft(row.rowId, {
                                    itemKey: value,
                                  })
                                }
                                placeholder="Buscar y seleccionar material"
                                searchPlaceholder="Buscar material..."
                                className="min-h-10 bg-white border-slate-300"
                                disablePortal
                                truncateSelected={false}
                                truncateOptions={false}
                                listClassName="min-h-[220px] max-h-[320px]"
                              />
                            </div>

                            <div className="md:col-span-2 space-y-1">
                              <Label className="md:hidden text-xs font-medium text-slate-600">
                                Cantidad entregada
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                max={itemSeleccionado?.pendiente || undefined}
                                value={row.cantidad}
                                onChange={(e) =>
                                  updateEntregaDraft(row.rowId, {
                                    cantidad: e.target.value,
                                  })
                                }
                                placeholder="0"
                                className="h-10 bg-white"
                              />
                            </div>

                            <div className="md:col-span-2 space-y-1">
                              <Label className="md:hidden text-xs font-medium text-slate-600">
                                Pendiente
                              </Label>
                              <div className="h-10 rounded-md border border-slate-300 bg-white px-3 flex items-center text-sm font-semibold text-slate-900">
                                {itemSeleccionado
                                  ? `${itemSeleccionado.pendiente} u`
                                  : "--"}
                              </div>
                            </div>

                            <div className="md:col-span-2 space-y-1">
                              <Label className="md:hidden text-xs font-medium text-slate-600">
                                Fecha de entrega
                              </Label>
                              <Input
                                type="date"
                                value={row.fecha}
                                onChange={(e) =>
                                  updateEntregaDraft(row.rowId, {
                                    fecha: e.target.value,
                                  })
                                }
                                className="h-10 bg-white"
                              />
                            </div>

                            <div className="md:col-span-1 flex md:justify-center">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-10 w-10 p-0 border-slate-300 text-slate-700 hover:bg-slate-100"
                                onClick={() => removeEntregaDraftRow(row.rowId)}
                                disabled={entregaDrafts.length === 1}
                                title="Quitar material"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {entregaError && (
                      <div
                        className={`rounded-md px-3 py-2 text-sm ${
                          entregaError === "Validando datos..."
                            ? "border border-blue-200 bg-blue-50 text-blue-700"
                            : "border border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {entregaError}
                      </div>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-slate-300 text-slate-700 hover:bg-slate-100"
                        onClick={addEntregaDraftRow}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar material
                      </Button>

                      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                        {ofertaEntregaSeleccionada &&
                          ofertaTieneEntregas(ofertaEntregaSeleccionada) && (
                            <Button
                              type="button"
                              variant="outline"
                              className="border-slate-300 text-slate-700 hover:bg-slate-100"
                              onClick={() => {
                                setMostrarFormularioEntrega(false);
                                resetEntregaForm();
                              }}
                              disabled={savingEntrega}
                            >
                              Cancelar
                            </Button>
                          )}
                        <Button
                          type="button"
                          onClick={() => {
                            void handleSaveEntrega();
                          }}
                          disabled={savingEntrega}
                          className="bg-green-600 hover:bg-green-700 text-white sm:min-w-[190px]"
                        >
                          {savingEntrega ? "Guardando..." : "Guardar entregas"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo para editar "Qué falta" */}
      <Dialog
        open={isEditFaltaDialogOpen}
        onOpenChange={setIsEditFaltaDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Qué Falta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="falta">Cliente: {selectedClient?.nombre}</Label>
            </div>
            <div>
              <Label htmlFor="falta">
                Qué falta para completar la instalación
              </Label>
              <Input
                id="falta"
                value={faltaValue}
                onChange={(e) => setFaltaValue(e.target.value)}
                placeholder="Ej: Falta cable, paneles, etc."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsEditFaltaDialogOpen(false)}
                disabled={isUpdating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveFalta}
                disabled={isUpdating}
                className="bg-gradient-to-r from-blue-500 to-blue-600"
              >
                {isUpdating ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ClienteFotosDialog
        open={!!clienteFotosSeleccionado}
        onOpenChange={(open) => {
          if (!open) setClienteFotosSeleccionado(null);
        }}
        clienteNombre={clienteFotosSeleccionado?.nombre || ""}
        clienteCodigo={clienteFotosSeleccionado?.numero}
        fotos={clienteFotosSeleccionado?.fotos || []}
      />
      <EntregaCelebrationAnimation
        open={showEntregaCelebration}
        onClose={() => setShowEntregaCelebration(false)}
      />

      {/* Diálogo para ver oferta */}
      <Dialog
        open={verOfertaDialogOpen}
        onOpenChange={(open) => {
          setVerOfertaDialogOpen(open);
          if (!open) {
            setClienteOfertaSeleccionado(null);
            setOfertaConfeccionCargada(null);
            setLoadingOfertaConfeccion(false);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Oferta Confeccionada</DialogTitle>
            {clienteOfertaSeleccionado && (
              <p className="text-sm text-gray-600">
                {clienteOfertaSeleccionado.nombre} - Código:{" "}
                {clienteOfertaSeleccionado.numero}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            {loadingOfertaConfeccion ? (
              <div className="py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-sm text-gray-600">Cargando oferta...</p>
              </div>
            ) : ofertaConfeccionCargada ? (
              <div className="space-y-4">
                {ofertaConfeccionCargada.items &&
                ofertaConfeccionCargada.items.length > 0 ? (
                  <div className="space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-gray-300">
                            <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">
                              Material
                            </th>
                            <th className="text-center py-3 px-3 text-sm font-semibold text-gray-700">
                              Cantidad
                            </th>
                            <th className="text-center py-3 px-3 text-sm font-semibold text-emerald-700">
                              Entregado
                            </th>
                            <th className="text-center py-3 px-3 text-sm font-semibold text-amber-700">
                              Pendiente
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {ofertaConfeccionCargada.items.map((item, index) => {
                            const totalEntregado = Array.isArray(item.entregas)
                              ? item.entregas.reduce(
                                  (sum, entrega) =>
                                    sum + parseNumber(entrega.cantidad),
                                  0,
                                )
                              : 0;
                            const pendiente = Number.isFinite(
                              Number(item.cantidad_pendiente_por_entregar),
                            )
                              ? parseNumber(
                                  item.cantidad_pendiente_por_entregar,
                                )
                              : Math.max(0, item.cantidad - totalEntregado);

                            return (
                              <tr
                                key={index}
                                className="border-b border-gray-100 hover:bg-gray-50"
                              >
                                <td className="py-3 px-3">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {item.descripcion || "Sin descripción"}
                                    </p>
                                    {item.material_codigo && (
                                      <p className="text-xs text-gray-500">
                                        {item.material_codigo}
                                      </p>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="text-sm font-semibold text-gray-900">
                                    {item.cantidad}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="text-sm font-semibold text-emerald-600">
                                    {totalEntregado}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="text-sm font-semibold text-amber-600">
                                    {pendiente}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Resumen simplificado */}
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Materiales</p>
                        <p className="text-xl font-bold text-gray-900">
                          {ofertaConfeccionCargada.items.length}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <p className="text-xs text-emerald-700 mb-1">
                          Entregado
                        </p>
                        <p className="text-xl font-bold text-emerald-700">
                          {ofertaConfeccionCargada.items.reduce(
                            (sum, item) =>
                              sum +
                              (Array.isArray(item.entregas)
                                ? item.entregas.reduce(
                                    (s, e) => s + parseNumber(e.cantidad),
                                    0,
                                  )
                                : 0),
                            0,
                          )}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-amber-50 rounded-lg">
                        <p className="text-xs text-amber-700 mb-1">Pendiente</p>
                        <p className="text-xl font-bold text-amber-700">
                          {ofertaConfeccionCargada.items.reduce((sum, item) => {
                            const totalEntregado = Array.isArray(item.entregas)
                              ? item.entregas.reduce(
                                  (s, e) => s + parseNumber(e.cantidad),
                                  0,
                                )
                              : 0;
                            const pendiente = Number.isFinite(
                              Number(item.cantidad_pendiente_por_entregar),
                            )
                              ? parseNumber(
                                  item.cantidad_pendiente_por_entregar,
                                )
                              : Math.max(0, item.cantidad - totalEntregado);
                            return sum + pendiente;
                          }, 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No hay materiales en esta oferta
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p>No se encontró una oferta confeccionada</p>
              </div>
            )}
            <div className="flex justify-end pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => setVerOfertaDialogOpen(false)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para equipos en servicio */}
      <Dialog
        open={materialServicioDialogOpen}
        onOpenChange={(open) => {
          setMaterialServicioDialogOpen(open);
          if (!open) {
            setClienteMaterialServicio(null);
            setOfertaServicioCargada(null);
            setLoadingOfertaServicio(false);
            setSavingOfertaServicio(false);
            setEquiposEnServicio({
              inversores: [],
              paneles: [],
              baterias: [],
            });
            setCantidadEnServicioPorItem({});
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-900">
              <Zap className="h-5 w-5 text-purple-600" />
              Equipos en Servicio
            </DialogTitle>
            {clienteMaterialServicio && (
              <p className="text-sm text-gray-600">
                {clienteMaterialServicio.nombre}
              </p>
            )}
          </DialogHeader>

          {loadingOfertaServicio ? (
            <div className="py-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="mt-3 text-sm text-gray-600">Cargando equipos...</p>
            </div>
          ) : ofertaServicioCargada ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Marca los equipos que están conectados y define la cantidad en
                servicio:
              </p>

              {servicioItems.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {/* Inversores */}
                  {inversoresServicioItems.map((item) => {
                    const checked = equiposEnServicio.inversores.includes(
                      item.itemId,
                    );
                    return (
                      <div
                        key={`inv-${item.itemId}`}
                        className="flex items-center gap-3 p-3 rounded-lg border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-all"
                      >
                        <input
                          type="checkbox"
                          className="h-5 w-5 text-purple-600 rounded focus:ring-purple-500"
                          checked={checked}
                          disabled={
                            item.cantidadTotal <= 0 || savingOfertaServicio
                          }
                          onChange={(e) => {
                            setEquiposEnServicio((prev) => ({
                              ...prev,
                              inversores: e.target.checked
                                ? Array.from(
                                    new Set([...prev.inversores, item.itemId]),
                                  )
                                : prev.inversores.filter(
                                    (current) => current !== item.itemId,
                                  ),
                            }));
                            setCantidadEnServicioPorItem((prev) => {
                              const current = parseNumber(prev[item.itemId]);
                              const nextQty = e.target.checked
                                ? Math.max(
                                    1,
                                    Math.min(
                                      item.cantidadTotal,
                                      current > 0 ? current : 1,
                                    ),
                                  )
                                : 0;
                              return {
                                ...prev,
                                [item.itemId]: String(nextQty),
                              };
                            });
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {item.descripcion}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.materialCodigo || "--"} • Cant:{" "}
                            {item.cantidadTotal}
                          </p>
                        </div>
                        <div className="w-28">
                          <Label className="text-[10px] uppercase tracking-wide text-gray-500">
                            En servicio
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            max={item.cantidadTotal}
                            value={
                              cantidadEnServicioPorItem[item.itemId] ?? "0"
                            }
                            disabled={!checked || savingOfertaServicio}
                            onChange={(event) => {
                              const raw = event.target.value;
                              if (raw === "") {
                                setCantidadEnServicioPorItem((prev) => ({
                                  ...prev,
                                  [item.itemId]: "",
                                }));
                                return;
                              }
                              const value = Math.max(
                                0,
                                Math.min(item.cantidadTotal, parseNumber(raw)),
                              );
                              setCantidadEnServicioPorItem((prev) => ({
                                ...prev,
                                [item.itemId]: String(value),
                              }));
                            }}
                            className="h-8"
                          />
                        </div>
                        <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded">
                          Inversor
                        </span>
                      </div>
                    );
                  })}

                  {/* Paneles */}
                  {panelesServicioItems.map((item) => {
                    const checked = equiposEnServicio.paneles.includes(
                      item.itemId,
                    );
                    return (
                      <div
                        key={`pan-${item.itemId}`}
                        className="flex items-center gap-3 p-3 rounded-lg border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-all"
                      >
                        <input
                          type="checkbox"
                          className="h-5 w-5 text-purple-600 rounded focus:ring-purple-500"
                          checked={checked}
                          disabled={
                            item.cantidadTotal <= 0 || savingOfertaServicio
                          }
                          onChange={(e) => {
                            setEquiposEnServicio((prev) => ({
                              ...prev,
                              paneles: e.target.checked
                                ? Array.from(
                                    new Set([...prev.paneles, item.itemId]),
                                  )
                                : prev.paneles.filter(
                                    (current) => current !== item.itemId,
                                  ),
                            }));
                            setCantidadEnServicioPorItem((prev) => {
                              const current = parseNumber(prev[item.itemId]);
                              const nextQty = e.target.checked
                                ? Math.max(
                                    1,
                                    Math.min(
                                      item.cantidadTotal,
                                      current > 0 ? current : 1,
                                    ),
                                  )
                                : 0;
                              return {
                                ...prev,
                                [item.itemId]: String(nextQty),
                              };
                            });
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {item.descripcion}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.materialCodigo || "--"} • Cant:{" "}
                            {item.cantidadTotal}
                          </p>
                        </div>
                        <div className="w-28">
                          <Label className="text-[10px] uppercase tracking-wide text-gray-500">
                            En servicio
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            max={item.cantidadTotal}
                            value={
                              cantidadEnServicioPorItem[item.itemId] ?? "0"
                            }
                            disabled={!checked || savingOfertaServicio}
                            onChange={(event) => {
                              const raw = event.target.value;
                              if (raw === "") {
                                setCantidadEnServicioPorItem((prev) => ({
                                  ...prev,
                                  [item.itemId]: "",
                                }));
                                return;
                              }
                              const value = Math.max(
                                0,
                                Math.min(item.cantidadTotal, parseNumber(raw)),
                              );
                              setCantidadEnServicioPorItem((prev) => ({
                                ...prev,
                                [item.itemId]: String(value),
                              }));
                            }}
                            className="h-8"
                          />
                        </div>
                        <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded">
                          Panel
                        </span>
                      </div>
                    );
                  })}

                  {/* Baterías */}
                  {bateriasServicioItems.map((item) => {
                    const checked = equiposEnServicio.baterias.includes(
                      item.itemId,
                    );
                    return (
                      <div
                        key={`bat-${item.itemId}`}
                        className="flex items-center gap-3 p-3 rounded-lg border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-all"
                      >
                        <input
                          type="checkbox"
                          className="h-5 w-5 text-purple-600 rounded focus:ring-purple-500"
                          checked={checked}
                          disabled={
                            item.cantidadTotal <= 0 || savingOfertaServicio
                          }
                          onChange={(e) => {
                            setEquiposEnServicio((prev) => ({
                              ...prev,
                              baterias: e.target.checked
                                ? Array.from(
                                    new Set([...prev.baterias, item.itemId]),
                                  )
                                : prev.baterias.filter(
                                    (current) => current !== item.itemId,
                                  ),
                            }));
                            setCantidadEnServicioPorItem((prev) => {
                              const current = parseNumber(prev[item.itemId]);
                              const nextQty = e.target.checked
                                ? Math.max(
                                    1,
                                    Math.min(
                                      item.cantidadTotal,
                                      current > 0 ? current : 1,
                                    ),
                                  )
                                : 0;
                              return {
                                ...prev,
                                [item.itemId]: String(nextQty),
                              };
                            });
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {item.descripcion}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.materialCodigo || "--"} • Cant:{" "}
                            {item.cantidadTotal}
                          </p>
                        </div>
                        <div className="w-28">
                          <Label className="text-[10px] uppercase tracking-wide text-gray-500">
                            En servicio
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            max={item.cantidadTotal}
                            value={
                              cantidadEnServicioPorItem[item.itemId] ?? "0"
                            }
                            disabled={!checked || savingOfertaServicio}
                            onChange={(event) => {
                              const raw = event.target.value;
                              if (raw === "") {
                                setCantidadEnServicioPorItem((prev) => ({
                                  ...prev,
                                  [item.itemId]: "",
                                }));
                                return;
                              }
                              const value = Math.max(
                                0,
                                Math.min(item.cantidadTotal, parseNumber(raw)),
                              );
                              setCantidadEnServicioPorItem((prev) => ({
                                ...prev,
                                [item.itemId]: String(value),
                              }));
                            }}
                            className="h-8"
                          />
                        </div>
                        <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded">
                          Batería
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No se encontraron inversores, paneles o baterías en esta
                  oferta
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  variant="outline"
                  onClick={() => setMaterialServicioDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => {
                    void handleGuardarEquiposEnServicio();
                  }}
                  disabled={savingOfertaServicio || servicioItems.length === 0}
                >
                  {savingOfertaServicio ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p>No se encontró una oferta confeccionada</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
