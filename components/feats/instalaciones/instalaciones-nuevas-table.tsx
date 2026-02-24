"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import { SearchableSelect } from "@/components/shared/molecule/searchable-select";
import {
  Search,
  Phone,
  MapPin,
  Package,
  User,
  FileText,
  ArrowRight,
  Camera,
  Truck,
  Plus,
  Trash2,
} from "lucide-react";
import type { InstalacionNueva } from "@/lib/types/feats/instalaciones/instalaciones-types";
import type { ClienteFoto } from "@/lib/api-types";
import { ClienteService, LeadService } from "@/lib/api-services";
import { useToast } from "@/hooks/use-toast";
import { ClienteFotosDialog } from "@/components/feats/instalaciones/cliente-fotos-dialog";
import { EntregaCelebrationAnimation } from "@/components/feats/instalaciones/entrega-celebration-animation";
import { apiRequest } from "@/lib/api-config";
import { extractOfertaIdsFromEntity } from "@/lib/utils/oferta-id";

interface InstalacionesNuevasTableProps {
  instalaciones: InstalacionNueva[];
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

const getInstalacionKey = (instalacion: InstalacionNueva) =>
  `${instalacion.tipo}:${instalacion.tipo === "cliente" ? instalacion.numero || instalacion.id : instalacion.id}`;

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

const getOfertaPersistedId = (oferta: OfertaParaEntrega | null) => {
  if (!oferta) return null;
  const id =
    oferta.id || oferta._id || oferta.oferta_id || oferta.numero_oferta;
  return id ? String(id) : null;
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

const instalacionTieneEntregas = (instalacion: InstalacionNueva) =>
  (instalacion as any)?.tiene_materiales_entregados === true ||
  parseNumber((instalacion as any)?.materiales_entregados) > 0 ||
  (Array.isArray(instalacion.ofertas) &&
    instalacion.ofertas.some((oferta) => ofertaTieneEntregas(oferta as any)));

export function InstalacionesNuevasTable({
  instalaciones,
  loading,
  onFiltersChange,
  onRefresh,
  ofertasConEntregasIds,
}: InstalacionesNuevasTableProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [tipo, setTipo] = useState<"todos" | "leads" | "clientes">("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [materialesEntregadosFilter, setMaterialesEntregadosFilter] = useState<
    "todos" | "con_entregas" | "sin_entregas"
  >("todos");

  const [isUpdating, setIsUpdating] = useState(false);
  const [fotosDialogData, setFotosDialogData] = useState<{
    nombre: string;
    codigo?: string;
    fotos: ClienteFoto[];
  } | null>(null);
  const [entregaDialogOpen, setEntregaDialogOpen] = useState(false);
  const [instalacionEntregaActiva, setInstalacionEntregaActiva] =
    useState<InstalacionNueva | null>(null);
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
  const [entregasPorInstalacion, setEntregasPorInstalacion] = useState<
    Record<string, boolean>
  >({});
  const [showEntregaCelebration, setShowEntregaCelebration] = useState(false);

  // Actualizar filtros cuando cambien
  useEffect(() => {
    onFiltersChange({
      searchTerm,
      tipo,
      fechaDesde,
      fechaHasta,
      materialesEntregados: materialesEntregadosFilter,
    });
  }, [
    searchTerm,
    tipo,
    fechaDesde,
    fechaHasta,
    materialesEntregadosFilter,
    onFiltersChange,
  ]);

  // Mover a instalación en proceso
  const handleMoverAProceso = async (instalacion: InstalacionNueva) => {
    setIsUpdating(true);
    try {
      if (instalacion.tipo === "lead") {
        await LeadService.updateLead(instalacion.id, {
          estado: "Instalación en Proceso",
        });
      } else {
        await ClienteService.actualizarCliente(instalacion.numero!, {
          estado: "Instalación en Proceso",
        });
      }

      toast({
        title: "Estado actualizado",
        description: `${instalacion.nombre} movido a Instalación en Proceso`,
      });
      onRefresh();
    } catch (error: any) {
      console.error("Error al mover a proceso:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el estado",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

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

  const getFotosInstalacion = (
    instalacion: InstalacionNueva,
  ): ClienteFoto[] => {
    const directFotos = (instalacion as any)?.fotos;
    if (Array.isArray(directFotos)) return directFotos;

    const originalFotos = (instalacion as any)?.original?.fotos;
    if (Array.isArray(originalFotos)) return originalFotos;

    return [];
  };

  const handleOpenFotos = (instalacion: InstalacionNueva) => {
    setFotosDialogData({
      nombre: instalacion.nombre,
      codigo: instalacion.numero,
      fotos: getFotosInstalacion(instalacion),
    });
  };

  const getEntregaStatus = (instalacion: InstalacionNueva) => {
    const key = getInstalacionKey(instalacion);
    if (key in entregasPorInstalacion) {
      return entregasPorInstalacion[key];
    }

    const hasByEndpointIds =
      !!ofertasConEntregasIds &&
      ofertasConEntregasIds.size > 0 &&
      extractOfertaIdsFromEntity(instalacion).some((id) =>
        ofertasConEntregasIds.has(id),
      );
    if (hasByEndpointIds) return true;

    return instalacionTieneEntregas(instalacion);
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

  const loadOfertasParaEntrega = async (instalacion: InstalacionNueva) => {
    const endpoint =
      instalacion.tipo === "lead"
        ? `/ofertas/confeccion/lead/${instalacion.id}`
        : `/ofertas/confeccion/cliente/${instalacion.numero || instalacion.id}`;

    const response = await apiRequest<any>(endpoint, { method: "GET" });
    if (response?.success === false && !response?.data && !response?.ofertas) {
      return [];
    }
    return extractOfertasConfeccion(response);
  };

  const handleOpenEntregaEquipo = async (instalacion: InstalacionNueva) => {
    setInstalacionEntregaActiva(instalacion);
    setLoadingEntregaData(true);
    setEntregaDialogOpen(true);
    resetEntregaForm();
    setEntregaError(null);

    try {
      const ofertas = await loadOfertasParaEntrega(instalacion);
      if (ofertas.length === 0) {
        toast({
          title: "Sin oferta",
          description:
            "No se encontró una oferta confeccionada para registrar entregas.",
          variant: "default",
        });
        setEntregaDialogOpen(false);
        setInstalacionEntregaActiva(null);
        return;
      }

      setOfertasEntrega(ofertas);

      const ofertaConEntregas = ofertas.find((oferta) =>
        ofertaTieneEntregas(oferta),
      );
      const ofertaInicial = ofertaConEntregas || ofertas[0];
      setOfertaEntregaSeleccionadaUid(ofertaInicial._uid);
      setMostrarFormularioEntrega(!ofertaTieneEntregas(ofertaInicial));

      setEntregasPorInstalacion((prev) => ({
        ...prev,
        [getInstalacionKey(instalacion)]: ofertas.some((oferta) =>
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
      setInstalacionEntregaActiva(null);
    } finally {
      setLoadingEntregaData(false);
    }
  };

  const handleCloseEntregaDialog = (open: boolean) => {
    setEntregaDialogOpen(open);
    if (!open) {
      setInstalacionEntregaActiva(null);
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
    detalleItemsEntrega.forEach((item) => {
      map.set(item.key, item);
    });
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
    console.log("🚀 Click en Guardar entregas");
    if (!instalacionEntregaActiva || !ofertaEntregaSeleccionada) {
      setEntregaError("No hay oferta cargada para guardar la entrega.");
      console.warn("⚠️ Guardado cancelado: oferta no cargada");
      return;
    }

    setEntregaError("Validando datos...");

    const ofertaId = getOfertaPersistedId(ofertaEntregaSeleccionada);
    if (!ofertaId) {
      toast({
        title: "Oferta inválida",
        description:
          "No se pudo identificar la oferta para guardar la entrega.",
        variant: "destructive",
      });
      setEntregaError(
        "No se pudo identificar la oferta para guardar la entrega.",
      );
      console.warn("⚠️ Guardado cancelado: ofertaId inválido");
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
      console.log("🌐 Intentando guardar entregas en oferta:", ofertaId);

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

      const ofertasRecargadas = await loadOfertasParaEntrega(
        instalacionEntregaActiva,
      );

      const ofertaRecargada = ofertasRecargadas.find(
        (oferta) => getOfertaPersistedId(oferta) === ofertaId,
      );

      if (!ofertaRecargada) {
        throw new Error(
          "La oferta no apareció al recargar después de guardar. Verifica backend.",
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
        if (!itemEsperado) {
          throw new Error("No se pudo validar la persistencia de una entrega.");
        }

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

      const key = getInstalacionKey(instalacionEntregaActiva);
      setEntregasPorInstalacion((prev) => ({
        ...prev,
        [key]: ofertasRecargadas.some((oferta) => ofertaTieneEntregas(oferta)),
      }));

      await Promise.resolve(onRefresh());

      toast({
        title: "Entrega registrada",
        description: "La entrega de equipo se guardó correctamente.",
      });
      setShowEntregaCelebration(true);
    } catch (error: any) {
      console.error("Error guardando entrega:", error);
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

  // Contar por tipo
  const countLeads = instalaciones.filter((i) => i.tipo === "lead").length;
  const countClientes = instalaciones.filter(
    (i) => i.tipo === "cliente",
  ).length;

  return (
    <>
      {/* Filtros */}
      <Card className="mb-6 border-l-4 border-l-green-600">
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                className="w-full border rounded px-3 py-2"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as any)}
              >
                <option value="todos">Todos ({instalaciones.length})</option>
                <option value="leads">Leads ({countLeads})</option>
                <option value="clientes">Clientes ({countClientes})</option>
              </select>
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
      <Card className="border-l-4 border-l-green-600">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Instalaciones Nuevas ({instalaciones.length})</span>
            <div className="flex gap-2 text-sm font-normal">
              <Badge variant="outline" className="bg-blue-50">
                <User className="h-3 w-3 mr-1" />
                {countLeads} Leads
              </Badge>
              <Badge variant="outline" className="bg-green-50">
                <FileText className="h-3 w-3 mr-1" />
                {countClientes} Clientes
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {instalaciones.length === 0 && !loading ? (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay instalaciones nuevas
              </h3>
              <p className="text-gray-600">
                No se encontraron leads ni clientes pendientes de instalación
              </p>
            </div>
          ) : (
            <>
              {/* Vista móvil */}
              <div className="md:hidden space-y-3">
                {instalaciones.map((instalacion) => (
                  <Card key={instalacion.id} className="border-gray-200">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {instalacion.nombre}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <Phone className="h-3 w-3" />
                            <span>{instalacion.telefono}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm text-gray-600 mt-1">
                            <MapPin className="h-3 w-3 mt-0.5" />
                            <span>{instalacion.direccion}</span>
                          </div>
                        </div>
                        <Badge
                          variant={
                            instalacion.tipo === "lead"
                              ? "default"
                              : "secondary"
                          }
                          className={
                            instalacion.tipo === "lead"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }
                        >
                          {instalacion.tipo === "lead" ? "Lead" : "Cliente"}
                        </Badge>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Oferta:</p>
                        <p className="text-sm text-gray-700">
                          {formatOfertas(instalacion.ofertas || [])}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          size="icon"
                          variant={
                            getEntregaStatus(instalacion)
                              ? "default"
                              : "outline"
                          }
                          className={
                            getEntregaStatus(instalacion)
                              ? "border-emerald-800 bg-emerald-700 text-white hover:bg-emerald-800 hover:border-emerald-900 shadow-md shadow-emerald-500/40 ring-1 ring-emerald-300 transition-all duration-200"
                              : "border-gray-300 text-gray-600 hover:bg-gray-50"
                          }
                          onClick={() => handleOpenEntregaEquipo(instalacion)}
                          title={
                            getEntregaStatus(instalacion)
                              ? "Ver entregas de equipo"
                              : "Registrar entrega de equipo"
                          }
                        >
                          <Truck className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                          onClick={() => handleMoverAProceso(instalacion)}
                          disabled={isUpdating}
                          title="Mover a instalación en proceso"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="border-sky-300 text-sky-700 hover:bg-sky-50"
                          onClick={() => handleOpenFotos(instalacion)}
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
                        Tipo
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Nombre
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Teléfono
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Dirección
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Oferta
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {instalaciones.map((instalacion) => (
                      <tr
                        key={instalacion.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-4 px-4">
                          <Badge
                            variant={
                              instalacion.tipo === "lead"
                                ? "default"
                                : "secondary"
                            }
                            className={
                              instalacion.tipo === "lead"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }
                          >
                            {instalacion.tipo === "lead" ? "Lead" : "Cliente"}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold text-gray-900">
                            {instalacion.nombre}
                          </p>
                          {instalacion.numero && (
                            <p className="text-xs text-gray-500">
                              #{instalacion.numero}
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">
                            {instalacion.telefono}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">
                            {instalacion.direccion}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">
                            {formatOfertas(instalacion.ofertas || [])}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              size="icon"
                              variant={
                                getEntregaStatus(instalacion)
                                  ? "default"
                                  : "outline"
                              }
                              className={
                                getEntregaStatus(instalacion)
                                  ? "border-emerald-800 bg-emerald-700 text-white hover:bg-emerald-800 hover:border-emerald-900 shadow-md shadow-emerald-500/40 ring-1 ring-emerald-300 transition-all duration-200"
                                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
                              }
                              onClick={() =>
                                handleOpenEntregaEquipo(instalacion)
                              }
                              title={
                                getEntregaStatus(instalacion)
                                  ? "Ver entregas de equipo"
                                  : "Registrar entrega de equipo"
                              }
                            >
                              <Truck className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="border-blue-300 text-blue-700 hover:bg-blue-50"
                              onClick={() => handleMoverAProceso(instalacion)}
                              disabled={isUpdating}
                              title="Mover a instalación en proceso"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="border-sky-300 text-sky-700 hover:bg-sky-50"
                              onClick={() => handleOpenFotos(instalacion)}
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
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden gap-3 p-4 sm:p-5">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-2xl font-bold text-slate-900">
              Entrega de equipo
              {instalacionEntregaActiva
                ? ` - ${instalacionEntregaActiva.nombre}`
                : ""}
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
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4 space-y-3 h-full overflow-y-auto">
              {ofertasEntrega.length > 1 && (
                <div className="space-y-1">
                  <Label
                    htmlFor="oferta-entrega"
                    className="text-sm font-medium text-slate-700"
                  >
                    Oferta
                  </Label>
                  <select
                    id="oferta-entrega"
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

      <ClienteFotosDialog
        open={!!fotosDialogData}
        onOpenChange={(open) => {
          if (!open) setFotosDialogData(null);
        }}
        clienteNombre={fotosDialogData?.nombre || ""}
        clienteCodigo={fotosDialogData?.codigo}
        fotos={fotosDialogData?.fotos || []}
      />
      <EntregaCelebrationAnimation
        open={showEntregaCelebration}
        onClose={() => setShowEntregaCelebration(false)}
      />
    </>
  );
}
