"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/shared/atom/button";
import {
  ArrowLeft,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  Package,
  Hand,
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useFacturas } from "@/hooks/use-facturas";
import { FacturasFilters } from "./facturas-filters";
import { FacturasConsolidadasTable } from "./facturas-consolidadas-table";
import { FacturaVentasFormDialog } from "./factura-ventas-form-dialog";
import { AnularFacturaDialog } from "./anular-factura-dialog";
import type {
  Factura,
  FacturaConsolidada,
  Vale,
} from "@/lib/types/feats/facturas/factura-types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/shared/atom/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { ValeForm } from "./vale-form";
import { useMaterials } from "@/hooks/use-materials";
import { exportToExcel, generateFilename } from "@/lib/export-service";
import { useToast } from "@/hooks/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shared/molecule/tabs";
import { facturaService } from "@/lib/services/feats/facturas/factura-service";
import {
  ExportFacturaService,
  type FacturaExportClienteData,
  type FacturaExportMeta,
} from "@/lib/services/feats/facturas/export-factura-service";
import { useAuth } from "@/contexts/auth-context";
import { ValeSalidaService } from "@/lib/services/feats/vales-salida/vale-salida-service";
import { ClienteVentaService } from "@/lib/services/feats/clientes-ventas/cliente-venta-service";
import { DevolucionValeService } from "@/lib/api-services";
import type { ValeSalida } from "@/lib/api-types";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import { Label } from "@/components/shared/atom/label";
import { Input } from "@/components/shared/molecule/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";

const parseNullableNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const cleaned = trimmed.replace(/[^\d,.-]/g, "");
    if (!cleaned) return null;

    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    let normalized = cleaned;

    if (lastComma !== -1 && lastDot !== -1) {
      if (lastComma > lastDot) {
        normalized = cleaned.replace(/\./g, "").replace(",", ".");
      } else {
        normalized = cleaned.replace(/,/g, "");
      }
    } else if (lastComma !== -1) {
      normalized = cleaned.replace(",", ".");
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const parseDateTimestamp = (value?: string): number => {
  if (!value) return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split("/").map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const MESES_OPCIONES = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

const calcularTotalMaterialesFactura = (factura: Factura): number => {
  const totalFactura = parseNullableNumber(factura.total);
  if (totalFactura !== null) return totalFactura;

  return (factura.vales || []).reduce((accVale, vale) => {
    const totalVale = (vale.items || []).reduce((accItem, item) => {
      const precio = parseNullableNumber(item.precio) || 0;
      const cantidad = parseNullableNumber(item.cantidad) || 0;
      return accItem + precio * cantidad;
    }, 0);
    return accVale + totalVale;
  }, 0);
};

const getMesAnioFactura = (
  factura: Factura,
): { mes: number; anio: number } | null => {
  const source = factura.fecha_creacion;
  if (!source) return null;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return null;
  return {
    mes: date.getMonth() + 1,
    anio: date.getFullYear(),
  };
};

type VistaFacturacionTab = "facturas" | "vales-no-facturados";

const normalizeKey = (value?: string | null) =>
  (value || "").trim().toUpperCase();

const getSolicitudFromVale = (vale: ValeSalida) =>
  vale.solicitud_venta || vale.solicitud_material || vale.solicitud || null;

const getClienteFromVale = (vale: ValeSalida) => {
  const solicitud = getSolicitudFromVale(vale);
  if (!solicitud) return null;
  return solicitud.cliente_venta || solicitud.cliente || null;
};

const getClienteKeyFromVale = (vale: ValeSalida): string | null => {
  const cliente = getClienteFromVale(vale);
  const key = (cliente?.id || cliente?.numero || "").toString().trim();
  return key || null;
};

const getClienteNombreFromVale = (vale: ValeSalida) =>
  getClienteFromVale(vale)?.nombre || "Sin cliente";

const isValeNoFacturadoDisponible = (vale: ValeSalida) => {
  if (vale.facturado === true) return false;

  const estadoVale = (vale.estado || "").trim().toLowerCase();
  if (estadoVale === "anulado") return false;

  const solicitud = getSolicitudFromVale(vale);
  if (!solicitud) return false;

  const estadoSolicitud = (solicitud.estado || "").trim().toLowerCase();
  if (estadoSolicitud === "anulada" || estadoSolicitud === "anulado") {
    return false;
  }

  return Boolean(getClienteKeyFromVale(vale));
};

const mapValeSalidaToFacturaVale = (valeSalida: ValeSalida): Vale => ({
  id: valeSalida.id,
  id_vale_salida: valeSalida.id,
  fecha: valeSalida.fecha_creacion || new Date().toISOString(),
  items: (valeSalida.materiales || []).map((material) => {
    const codigo =
      material.material_codigo ||
      material.codigo ||
      material.material?.codigo ||
      "";
    const basePrice = Number(material.material?.precio || 0);
    return {
      material_id: (material.material_id || "").toString(),
      codigo,
      descripcion:
        material.material_descripcion ||
        material.descripcion ||
        material.material?.descripcion ||
        material.material?.nombre ||
        "",
      precio: basePrice, // ventas: precio original sin descuento
      cantidad: Number(material.cantidad || 0),
    };
  }),
});

const toSafeNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeMaterialId = (value: unknown): string =>
  String(value ?? "").trim();

const ajustarValeConDevoluciones = async (
  vale: ValeSalida,
): Promise<ValeSalida> => {
  const valeId = String(vale.id || "").trim();
  if (!valeId || !Array.isArray(vale.materiales) || vale.materiales.length === 0) {
    return vale;
  }

  try {
    const resumen = await DevolucionValeService.getResumenPorVale(valeId);
    const restantesPorMaterial = new Map<string, number>();

    (resumen?.materiales || []).forEach((material) => {
      const materialId = normalizeMaterialId(material.material_id);
      if (!materialId) return;
      restantesPorMaterial.set(materialId, toSafeNumber(material.cantidad_devuelta));
    });

    if (restantesPorMaterial.size === 0) return vale;

    const materialesAjustados = vale.materiales.map((material) => {
      const materialId = normalizeMaterialId(material.material_id);
      const cantidadOriginal = toSafeNumber(material.cantidad);
      if (!materialId || cantidadOriginal <= 0) {
        return material;
      }

      const restanteDevuelto = toSafeNumber(restantesPorMaterial.get(materialId));
      if (restanteDevuelto <= 0) {
        return material;
      }

      const descuento = Math.min(cantidadOriginal, restanteDevuelto);
      restantesPorMaterial.set(materialId, restanteDevuelto - descuento);

      return {
        ...material,
        cantidad: Math.max(0, cantidadOriginal - descuento),
      };
    });

    return {
      ...vale,
      materiales: materialesAjustados,
    };
  } catch (error) {
    console.warn("No se pudo ajustar vale con devoluciones:", {
      valeId,
      error,
    });
    return vale;
  }
};

export function FacturasVentasSection() {
  const {
    facturas,
    facturasConsolidadas,
    stats,
    loading,
    error,
    filters,
    aplicarFiltros,
    limpiarFiltros,
    obtenerNumeroSugerido,
    crearFactura,
    actualizarFactura,
    eliminarFactura,
    anularFactura,
    agregarVale,
    actualizarVale,
    eliminarVale,
    cargarFacturasConsolidadas,
  } = useFacturas({ tipoFactura: "venta" });
  const { materials, loading: loadingMaterials } = useMaterials();
  const { toast } = useToast();
  const { user } = useAuth();

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [facturaToDelete, setFacturaToDelete] = useState<string | null>(null);
  const [anularDialogOpen, setAnularDialogOpen] = useState(false);
  const [facturaToAnular, setFacturaToAnular] = useState<Factura | null>(null);
  const [anulandoFactura, setAnulandoFactura] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [facturaDetails, setFacturaDetails] = useState<Factura | null>(null);
  const [valesListDialogOpen, setValesListDialogOpen] = useState(false);
  const [valeDialogOpen, setValeDialogOpen] = useState(false);
  const [modoManual, setModoManual] = useState(true);
  const [valesDisponibles, setValesDisponibles] = useState<ValeSalida[]>([]);
  const [valesSeleccionados, setValesSeleccionados] = useState<Set<string>>(
    new Set(),
  );
  const [valesExpandidos, setValesExpandidos] = useState<Set<string>>(
    new Set(),
  );
  const [loadingValesSalida, setLoadingValesSalida] = useState(false);
  const [facturaForVale, setFacturaForVale] = useState<Factura | null>(null);
  const [valeToEdit, setValeToEdit] = useState<{ valeId: string } | null>(null);
  const [savingVale, setSavingVale] = useState(false);
  const [deletingValeId, setDeletingValeId] = useState<string | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingFacturaPdf, setExportingFacturaPdf] = useState(false);
  const [exportingFacturaExcel, setExportingFacturaExcel] = useState(false);
  const [reversed, setReversed] = useState(false);
  const [activeTab, setActiveTab] = useState<VistaFacturacionTab>("facturas");
  const [valeDraft, setValeDraft] = useState<Vale>({
    fecha: "",
    items: [],
  });
  const [valesNoFacturados, setValesNoFacturados] = useState<ValeSalida[]>([]);
  const [valesNoFacturadosOriginales, setValesNoFacturadosOriginales] =
    useState<Record<string, ValeSalida>>({});
  const [loadingValesNoFacturados, setLoadingValesNoFacturados] =
    useState(false);
  const [valesNoFacturadosError, setValesNoFacturadosError] = useState<
    string | null
  >(null);
  const [searchValesNoFacturados, setSearchValesNoFacturados] = useState("");
  const [mesValesNoFacturados, setMesValesNoFacturados] = useState<
    number | undefined
  >(undefined);
  const [anioValesNoFacturados, setAnioValesNoFacturados] = useState<
    number | undefined
  >(undefined);
  const [fechaValesNoFacturados, setFechaValesNoFacturados] = useState("");
  const [selectedValesNoFacturados, setSelectedValesNoFacturados] = useState<
    Set<string>
  >(new Set());
  const [expandedValesNoFacturados, setExpandedValesNoFacturados] = useState<
    Set<string>
  >(new Set());
  const [selectedFacturaDestinoId, setSelectedFacturaDestinoId] =
    useState<string>("");
  const [processingValesNoFacturados, setProcessingValesNoFacturados] =
    useState(false);
  const [prefillNuevaFacturaClienteId, setPrefillNuevaFacturaClienteId] =
    useState<string | null>(null);
  const [prefillNuevaFacturaVales, setPrefillNuevaFacturaVales] = useState<
    ValeSalida[]
  >([]);

  const yearsValesNoFacturados = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  useEffect(() => {
    if (!facturaDetails?.id) return;

    const facturaActualizada = facturas.find((f) => f.id === facturaDetails.id);
    if (facturaActualizada) {
      setFacturaDetails(facturaActualizada);
    }
  }, [facturas, facturaDetails?.id]);

  const getValeSalidaCodeMapForFactura = useCallback(
    async (factura: Factura) => {
      const ids = Array.from(
        new Set(
          (factura.vales || [])
            .map((vale) => (vale.id_vale_salida || "").toString().trim())
            .filter(Boolean),
        ),
      );

      if (ids.length === 0) return new Map<string, string>();

      const pairs = await Promise.all(
        ids.map(async (id) => {
          try {
            const vale = await ValeSalidaService.getValeById(id);
            const codigo = (vale?.codigo || "").toString().trim();
            if (codigo) return [id, codigo] as const;
            return [id, `VS-${id.slice(-6).toUpperCase()}`] as const;
          } catch {
            return [id, `VS-${id.slice(-6).toUpperCase()}`] as const;
          }
        }),
      );

      return new Map<string, string>(pairs);
    },
    [],
  );

  const getClienteDataForFacturaExport = useCallback(
    async (factura: Factura): Promise<FacturaExportClienteData> => {
      const identifier = (factura.cliente_id || "").toString().trim();
      const fallback: FacturaExportClienteData = {
        numero: identifier || null,
        nombre: factura.nombre_cliente || null,
        carnet_identidad: null,
        telefono: null,
        direccion: null,
        provincia_montaje: null,
        municipio: null,
      };

      if (!identifier) return fallback;

      try {
        const clienteVenta = await ClienteVentaService.getClienteById(identifier);
        if (clienteVenta) {
          return {
            numero: (clienteVenta as any).numero || null,
            nombre: clienteVenta.nombre || null,
            carnet_identidad:
              (clienteVenta as any).ci ||
              (clienteVenta as any).carnet_identidad ||
              null,
            telefono: clienteVenta.telefono || null,
            direccion: clienteVenta.direccion || null,
            provincia_montaje:
              (clienteVenta as any).provincia ||
              (clienteVenta as any).provincia_montaje ||
              null,
            municipio: clienteVenta.municipio || null,
          };
        }
      } catch {
        // noop
      }

      return fallback;
    },
    [],
  );

  const getExportMetaForFactura = useCallback(
    async (factura: Factura): Promise<FacturaExportMeta> => {
      return {
        titular: "cliente",
        cliente: await getClienteDataForFacturaExport(factura),
      };
    },
    [getClienteDataForFacturaExport],
  );

  const handleExportFacturaPdf = useCallback(async () => {
    if (!facturaDetails) return;
    setExportingFacturaPdf(true);
    try {
      const valeCodeMap = await getValeSalidaCodeMapForFactura(facturaDetails);
      const exportMeta = await getExportMetaForFactura(facturaDetails);
      await ExportFacturaService.exportarFacturaPDF(
        facturaDetails,
        valeCodeMap,
        exportMeta,
      );
      toast({
        title: "PDF exportado",
        description: `Se exportó la factura ${facturaDetails.numero_factura}.`,
      });
    } catch (error) {
      toast({
        title: "Error exportando PDF",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo exportar el PDF.",
        variant: "destructive",
      });
    } finally {
      setExportingFacturaPdf(false);
    }
  }, [
    facturaDetails,
    getValeSalidaCodeMapForFactura,
    getExportMetaForFactura,
    toast,
  ]);

  const handleExportFacturaExcel = useCallback(async () => {
    if (!facturaDetails) return;
    setExportingFacturaExcel(true);
    try {
      const valeCodeMap = await getValeSalidaCodeMapForFactura(facturaDetails);
      const exportMeta = await getExportMetaForFactura(facturaDetails);
      await ExportFacturaService.exportarFacturaExcel(
        facturaDetails,
        valeCodeMap,
        exportMeta,
      );
      toast({
        title: "Excel exportado",
        description: `Se exportó la factura ${facturaDetails.numero_factura}.`,
      });
    } catch (error) {
      toast({
        title: "Error exportando Excel",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo exportar el Excel.",
        variant: "destructive",
      });
    } finally {
      setExportingFacturaExcel(false);
    }
  }, [
    facturaDetails,
    getValeSalidaCodeMapForFactura,
    getExportMetaForFactura,
    toast,
  ]);

  const handleCreate = () => {
    setSelectedFactura(null);
    setPrefillNuevaFacturaClienteId(null);
    setPrefillNuevaFacturaVales([]);
    setFormDialogOpen(true);
  };

  const handleEdit = (factura: Factura) => {
    setSelectedFactura(factura);
    setPrefillNuevaFacturaClienteId(null);
    setPrefillNuevaFacturaVales([]);
    setFormDialogOpen(true);
  };

  const getFacturaFromConsolidada = (
    facturaConsolidada: FacturaConsolidada,
  ): Factura | undefined => {
    if (facturaConsolidada.id) {
      const facturaPorId = facturas.find((f) => f.id === facturaConsolidada.id);
      if (facturaPorId) return facturaPorId;
    }

    return facturas.find(
      (f) => f.numero_factura === facturaConsolidada.numero_factura,
    );
  };

  const handleEditConsolidada = (facturaConsolidada: FacturaConsolidada) => {
    const facturaCompleta = getFacturaFromConsolidada(facturaConsolidada);
    if (facturaCompleta) {
      handleEdit(facturaCompleta);
    } else {
      toast({
        title: "Error",
        description: "No se pudo cargar la factura para editar",
        variant: "destructive",
      });
    }
  };

  const handleEditFacturaFromDetails = () => {
    if (!facturaDetails) return;
    setDetailsDialogOpen(false);
    handleEdit(facturaDetails);
  };

  const handleViewDetails = (factura: Factura) => {
    setFacturaDetails(factura);
    setDetailsDialogOpen(true);
  };

  const handleViewDetailsConsolidada = (
    facturaConsolidada: FacturaConsolidada,
  ) => {
    const facturaCompleta = getFacturaFromConsolidada(facturaConsolidada);
    if (facturaCompleta) {
      handleViewDetails(facturaCompleta);
    } else {
      toast({
        title: "Error",
        description: "No se pudo cargar los detalles de la factura",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setFacturaToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleAddValeClick = (factura: Factura) => {
    if (factura.anulada) {
      toast({
        title: "Factura anulada",
        description: "No puedes agregar vales a una factura anulada.",
        variant: "destructive",
      });
      return;
    }

    setFacturaForVale(factura);
    setValeToEdit(null);
    setModoManual(true);
    setValesDisponibles([]);
    setValesSeleccionados(new Set());
    setValeDraft({
      fecha: "",
      items: [],
    });
    setValeDialogOpen(true);
  };

  const handleAddValeConsolidada = (facturaConsolidada: FacturaConsolidada) => {
    const facturaCompleta = getFacturaFromConsolidada(facturaConsolidada);
    if (facturaCompleta) {
      handleAddValeClick(facturaCompleta);
    } else {
      toast({
        title: "Error",
        description: "No se pudo cargar la factura para agregar vale",
        variant: "destructive",
      });
    }
  };

  const handleAnularClick = (factura: Factura) => {
    if (factura.anulada) {
      toast({
        title: "Factura ya anulada",
        description: "Esta factura ya está anulada.",
      });
      return;
    }
    setFacturaToAnular(factura);
    setAnularDialogOpen(true);
  };

  const handleAnularConsolidada = (facturaConsolidada: FacturaConsolidada) => {
    const facturaCompleta = getFacturaFromConsolidada(facturaConsolidada);
    if (!facturaCompleta) {
      toast({
        title: "Error",
        description: "No se pudo cargar la factura para anular",
        variant: "destructive",
      });
      return;
    }
    handleAnularClick(facturaCompleta);
  };

  const confirmAnularFactura = async (motivo: string) => {
    if (!facturaToAnular?.id) return;

    setAnulandoFactura(true);
    try {
      await anularFactura(
        facturaToAnular.id,
        motivo,
        user?.nombre || undefined,
      );
      toast({
        title: "Factura anulada",
        description:
          "La factura se anuló correctamente y los vales de salida asociados se desfacturaron.",
      });
      setAnularDialogOpen(false);
      setFacturaToAnular(null);
    } catch (error) {
      toast({
        title: "Error al anular",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo anular la factura",
        variant: "destructive",
      });
    } finally {
      setAnulandoFactura(false);
    }
  };

  const handleEditValeClick = (factura: Factura, vale: Vale) => {
    if (!vale.id) {
      toast({
        title: "Vale sin identificador",
        description:
          "No se puede editar este vale porque no tiene ID en la respuesta del backend.",
        variant: "destructive",
      });
      return;
    }

    setFacturaForVale(factura);
    setValeToEdit({ valeId: vale.id });
    setValeDraft({
      id: vale.id,
      id_vale_salida: vale.id_vale_salida,
      fecha: vale.fecha,
      items: (vale.items || []).map((item) => ({ ...item })),
    });
    setValesListDialogOpen(false);
    setValeDialogOpen(true);
  };

  const resetValeDialogState = () => {
    setFacturaForVale(null);
    setValeToEdit(null);
    setModoManual(true);
    setValesDisponibles([]);
    setValesSeleccionados(new Set());
    setValesExpandidos(new Set());
    setValeDraft({
      fecha: "",
      items: [],
    });
  };

  const handleValeDialogOpenChange = (open: boolean) => {
    setValeDialogOpen(open);
    if (!open && !savingVale) {
      resetValeDialogState();
    }
  };

  const handleSaveVale = async () => {
    if (!facturaForVale?.id) return;

    setSavingVale(true);
    try {
      if (valeToEdit?.valeId) {
        await actualizarVale(facturaForVale.id, valeToEdit.valeId, {
          id: valeToEdit.valeId,
          id_vale_salida: valeDraft.id_vale_salida,
          fecha: valeDraft.fecha,
          items: valeDraft.items,
        });
      } else {
        await agregarVale(facturaForVale.id, {
          id_vale_salida: valeDraft.id_vale_salida,
          fecha: valeDraft.fecha,
          items: valeDraft.items,
        });
      }

      setValeDialogOpen(false);
      resetValeDialogState();
      toast({
        title: valeToEdit ? "Vale actualizado" : "Vale agregado",
        description: valeToEdit
          ? "Se actualizó correctamente el vale de la factura."
          : "Se agregó correctamente el vale a la factura.",
      });
    } catch (error) {
      toast({
        title: "Error guardando vale",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo guardar el vale.",
        variant: "destructive",
      });
    } finally {
      setSavingVale(false);
    }
  };

  const handleValesSalidaSeleccionados = async (vales: ValeSalida[]) => {
    if (!facturaForVale?.id) return;

    setSavingVale(true);
    try {
      for (const valeSalida of vales) {
        const valeAjustado = await ajustarValeConDevoluciones(valeSalida);
        const valeParaFactura = mapValeSalidaToFacturaVale(valeAjustado);
        await agregarVale(facturaForVale.id, valeParaFactura);
      }

      toast({
        title: "Vales agregados",
        description: `Se agregaron ${vales.length} vale(s) a la factura correctamente.`,
      });
    } catch (error) {
      toast({
        title: "Error agregando vales",
        description:
          error instanceof Error
            ? error.message
            : "No se pudieron agregar los vales.",
        variant: "destructive",
      });
    } finally {
      setSavingVale(false);
    }
  };

  const cargarValesDisponibles = async () => {
    if (!facturaForVale?.cliente_id) return;

    setLoadingValesSalida(true);
    try {
      const valesFiltrados = await facturaService.obtenerValesDisponibles({
        solicitud_tipo: "venta",
        cliente_id: facturaForVale.cliente_id,
        skip: 0,
        limit: 200,
      });

      setValesDisponibles(valesFiltrados);

      if (valesFiltrados.length === 0) {
        toast({
          title: "Sin vales disponibles",
          description: "No hay vales de salida disponibles para este cliente.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error cargando vales disponibles:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los vales disponibles.",
        variant: "destructive",
      });
    } finally {
      setLoadingValesSalida(false);
    }
  };

  const toggleVale = (valeId: string) => {
    const newSet = new Set(valesSeleccionados);
    if (newSet.has(valeId)) {
      newSet.delete(valeId);
    } else {
      newSet.add(valeId);
    }
    setValesSeleccionados(newSet);
  };

  const toggleExpandirVale = (valeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(valesExpandidos);
    if (newSet.has(valeId)) {
      newSet.delete(valeId);
    } else {
      newSet.add(valeId);
    }
    setValesExpandidos(newSet);
  };

  const handleAgregarValesSeleccionados = async () => {
    const vales = valesDisponibles.filter((vale) =>
      valesSeleccionados.has(vale.id),
    );
    await handleValesSalidaSeleccionados(vales);
    setValeDialogOpen(false);
    resetValeDialogState();
  };

  const handleQuitarValeClick = async (factura: Factura, vale: Vale) => {
    if (!factura.id) {
      toast({
        title: "Factura sin identificador",
        description:
          "No se puede quitar el vale porque la factura no tiene ID.",
        variant: "destructive",
      });
      return;
    }

    if (!vale.id) {
      toast({
        title: "Vale sin identificador",
        description: "No se puede quitar este vale porque no tiene ID.",
        variant: "destructive",
      });
      return;
    }

    const esValeSalida = Boolean((vale.id_vale_salida || "").trim());
    const confirmado = window.confirm(
      esValeSalida
        ? "Este vale proviene de vale de salida. Se quitará de la factura y el vale de salida volverá a facturado=false. ¿Continuar?"
        : "Este vale manual se eliminará de la factura. ¿Continuar?",
    );

    if (!confirmado) return;

    setDeletingValeId(vale.id);
    try {
      await eliminarVale(factura.id, vale.id);
      toast({
        title: "Vale eliminado",
        description: esValeSalida
          ? "Se quitó de la factura y el vale de salida quedó no facturado."
          : "Se quitó el vale manual de la factura.",
      });
    } catch (error) {
      toast({
        title: "Error quitando vale",
        description:
          error instanceof Error ? error.message : "No se pudo quitar el vale.",
        variant: "destructive",
      });
    } finally {
      setDeletingValeId(null);
    }
  };

  const confirmDelete = async () => {
    if (!facturaToDelete) return;

    try {
      await eliminarFactura(facturaToDelete);
      setDeleteDialogOpen(false);
      setFacturaToDelete(null);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Error eliminando factura",
      );
    }
  };

  const handleSave = async (
    factura: Omit<Factura, "id" | "fecha_creacion" | "total">,
  ) => {
    if (selectedFactura?.id) {
      await actualizarFactura(selectedFactura.id, factura);
    } else {
      await crearFactura(factura);
      if (prefillNuevaFacturaVales.length > 0) {
        limpiarSeleccionValesNoFacturados();
        await cargarValesNoFacturados();
        setActiveTab("facturas");
      }
    }
    setPrefillNuevaFacturaClienteId(null);
    setPrefillNuevaFacturaVales([]);
  };

  const handleFormDialogOpenChange = (open: boolean) => {
    setFormDialogOpen(open);
    if (!open) {
      setPrefillNuevaFacturaClienteId(null);
      setPrefillNuevaFacturaVales([]);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getEstadoFacturaLabel = (factura: Factura) => {
    if (factura.anulada) return "Anulada";
    if (!factura.terminada) return "No terminada";
    if (factura.pagada) return "Terminada y pagada";
    return "Terminada - no pagada";
  };

  const facturasFiltradas = useMemo(() => {
    let resultado = facturasConsolidadas;

    const term = (filters.nombre_cliente || "").trim().toLowerCase();
    if (term) {
      resultado = resultado.filter((factura) => {
        const numeroFactura = (factura.numero_factura || "").toLowerCase();
        const nombreCliente = (factura.cliente_nombre || "").toLowerCase();
        const codigoCliente = (factura.cliente_codigo || "").toLowerCase();

        return (
          numeroFactura.includes(term) ||
          nombreCliente.includes(term) ||
          codigoCliente.includes(term)
        );
      });
    }

    if (filters.fecha_vale) {
      resultado = resultado.filter((factura) => {
        if (!factura.fecha) return false;
        const [dia, mes, anio] = factura.fecha.split("/");
        const facturaFecha = `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
        return facturaFecha === filters.fecha_vale;
      });
    } else {
      if (filters.mes_vale) {
        resultado = resultado.filter((factura) => {
          if (!factura.mes) return false;
          const mesesMap: { [key: string]: number } = {
            enero: 1,
            febrero: 2,
            marzo: 3,
            abril: 4,
            mayo: 5,
            junio: 6,
            julio: 7,
            agosto: 8,
            septiembre: 9,
            octubre: 10,
            noviembre: 11,
            diciembre: 12,
          };
          const mesFactura = mesesMap[factura.mes.toLowerCase()];
          return mesFactura === filters.mes_vale;
        });
      }

      if (filters.anio_vale) {
        resultado = resultado.filter((factura) => {
          if (!factura.fecha) return false;
          const [, , anio] = factura.fecha.split("/");
          return parseInt(anio) === filters.anio_vale;
        });
      }
    }

    const facturasPorNumero = new Map(
      facturas.map((factura) => [factura.numero_factura, factura]),
    );

    return resultado.map((facturaConsolidada) => {
      const facturaReal = facturasPorNumero.get(
        facturaConsolidada.numero_factura,
      );
      if (!facturaReal) return facturaConsolidada;

      return {
        ...facturaConsolidada,
        id: facturaConsolidada.id || facturaReal.id,
        cliente_nombre:
          facturaConsolidada.cliente_nombre || facturaReal.nombre_cliente,
        cliente_codigo:
          facturaConsolidada.cliente_codigo ||
          facturaReal.cliente_id ||
          undefined,
        nombre_responsable:
          facturaReal.nombre_responsable ||
          facturaConsolidada.nombre_responsable,
        anulada: facturaReal.anulada ?? facturaConsolidada.anulada,
        motivo_anulacion:
          facturaReal.motivo_anulacion ?? facturaConsolidada.motivo_anulacion,
      };
    });
  }, [facturasConsolidadas, filters, facturas]);

  const totalFacturado = useMemo(() => {
    return facturasFiltradas
      .filter((factura) => factura.anulada !== true)
      .reduce((sum, factura) => sum + factura.total_factura, 0);
  }, [facturasFiltradas]);

  const cargarValesNoFacturados = useCallback(async () => {
    setLoadingValesNoFacturados(true);
    setValesNoFacturadosError(null);
    try {
      const allVales = await facturaService.obtenerValesNoFacturados({
        solicitud_tipo: "venta",
        skip: 0,
        limit: 200,
        q: searchValesNoFacturados.trim() || undefined,
      });
      const disponibles = allVales.filter(isValeNoFacturadoDisponible);
      const originalesById = Object.fromEntries(
        disponibles.map((vale) => [vale.id, vale]),
      );
      const ajustados = await Promise.all(
        disponibles.map((vale) => ajustarValeConDevoluciones(vale)),
      );
      setValesNoFacturadosOriginales(originalesById);
      setValesNoFacturados(ajustados);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los vales no facturados.";
      setValesNoFacturadosError(message);
      setValesNoFacturadosOriginales({});
      toast({
        title: "Error cargando vales",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoadingValesNoFacturados(false);
    }
  }, [toast, searchValesNoFacturados]);

  useEffect(() => {
    if (activeTab !== "vales-no-facturados") return;
    const timeout = window.setTimeout(() => {
      cargarValesNoFacturados();
    }, 250);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeTab, cargarValesNoFacturados]);

  useEffect(() => {
    const availableIds = new Set(valesNoFacturados.map((vale) => vale.id));
    setSelectedValesNoFacturados((prev) => {
      const cleaned = new Set(
        Array.from(prev).filter((id) => availableIds.has(id)),
      );
      if (cleaned.size === prev.size) return prev;
      return cleaned;
    });
    setExpandedValesNoFacturados((prev) => {
      const cleaned = new Set(
        Array.from(prev).filter((id) => availableIds.has(id)),
      );
      if (cleaned.size === prev.size) return prev;
      return cleaned;
    });
  }, [valesNoFacturados]);

  const valesNoFacturadosFiltrados = useMemo(() => {
    const term = searchValesNoFacturados.trim().toLowerCase();

    return valesNoFacturados.filter((vale) => {
      if (term) {
        const solicitud = getSolicitudFromVale(vale);
        const cliente = getClienteFromVale(vale);
        const searchableValues = [
          vale.codigo,
          vale.id,
          solicitud?.codigo,
          solicitud?.estado,
          cliente?.nombre,
          (cliente as any)?.numero,
          cliente?.id,
        ];

        const matchesTerm = searchableValues.some((value) =>
          (value || "").toString().toLowerCase().includes(term),
        );
        if (!matchesTerm) return false;
      }

      const fechaVale = vale.fecha_creacion
        ? new Date(vale.fecha_creacion)
        : null;
      if (!fechaVale || Number.isNaN(fechaVale.getTime())) {
        return (
          !fechaValesNoFacturados &&
          !mesValesNoFacturados &&
          !anioValesNoFacturados
        );
      }

      if (fechaValesNoFacturados) {
        return fechaVale.toISOString().slice(0, 10) === fechaValesNoFacturados;
      }

      if (
        mesValesNoFacturados &&
        fechaVale.getMonth() + 1 !== mesValesNoFacturados
      ) {
        return false;
      }

      if (
        anioValesNoFacturados &&
        fechaVale.getFullYear() !== anioValesNoFacturados
      ) {
        return false;
      }

      return true;
    });
  }, [
    valesNoFacturados,
    searchValesNoFacturados,
    fechaValesNoFacturados,
    mesValesNoFacturados,
    anioValesNoFacturados,
  ]);

  const totalNoFacturado = useMemo(() => {
    return valesNoFacturadosFiltrados.reduce((sum, vale) => {
      const totalVale = (vale.materiales || []).reduce(
        (s, item) =>
          s + Number(item.material?.precio ?? 0) * Number(item.cantidad || 0),
        0,
      );
      return sum + totalVale;
    }, 0);
  }, [valesNoFacturadosFiltrados]);

  const valesNoFacturadosSeleccionadosLista = useMemo(
    () =>
      valesNoFacturados.filter((vale) =>
        selectedValesNoFacturados.has(vale.id),
      ),
    [valesNoFacturados, selectedValesNoFacturados],
  );

  const selectedClienteKeys = useMemo(
    () =>
      Array.from(
        new Set(
          valesNoFacturadosSeleccionadosLista
            .map((vale) => normalizeKey(getClienteKeyFromVale(vale)))
            .filter(Boolean),
        ),
      ),
    [valesNoFacturadosSeleccionadosLista],
  );

  const selectedClienteKey =
    selectedClienteKeys.length === 1 ? selectedClienteKeys[0] : null;
  const hasClientesMezclados =
    selectedValesNoFacturados.size > 0 && selectedClienteKeys.length > 1;

  const selectedClienteRaw = useMemo(() => {
    if (!selectedClienteKey) return null;
    const found = valesNoFacturadosSeleccionadosLista.find(
      (vale) =>
        normalizeKey(getClienteKeyFromVale(vale)) === selectedClienteKey,
    );
    return found ? getClienteKeyFromVale(found) : null;
  }, [selectedClienteKey, valesNoFacturadosSeleccionadosLista]);

  const selectedClienteNombre = useMemo(() => {
    if (!selectedClienteKey) return null;
    const found = valesNoFacturadosSeleccionadosLista.find(
      (vale) =>
        normalizeKey(getClienteKeyFromVale(vale)) === selectedClienteKey,
    );
    return found ? getClienteNombreFromVale(found) : null;
  }, [selectedClienteKey, valesNoFacturadosSeleccionadosLista]);

  const facturasDestinoCompatibles = useMemo(
    () =>
      facturas.filter((factura) => {
        if (!factura.id) return false;
        if (factura.anulada) return false;
        if (factura.tipo !== "venta" || factura.subtipo !== "cliente") {
          return false;
        }
        return (
          selectedClienteKey !== null &&
          normalizeKey(factura.cliente_id) === selectedClienteKey
        );
      }),
    [facturas, selectedClienteKey],
  );

  useEffect(() => {
    if (!selectedFacturaDestinoId) return;
    const exists = facturasDestinoCompatibles.some(
      (factura) => factura.id === selectedFacturaDestinoId,
    );
    if (!exists) setSelectedFacturaDestinoId("");
  }, [selectedFacturaDestinoId, facturasDestinoCompatibles]);

  const toggleValeNoFacturado = (valeId: string) => {
    setSelectedValesNoFacturados((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(valeId)) {
        newSet.delete(valeId);
      } else {
        newSet.add(valeId);
      }
      return newSet;
    });
  };

  const toggleExpandirValeNoFacturado = (valeId: string) => {
    setExpandedValesNoFacturados((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(valeId)) {
        newSet.delete(valeId);
      } else {
        newSet.add(valeId);
      }
      return newSet;
    });
  };

  const seleccionarTodosValesNoFacturados = () => {
    setSelectedValesNoFacturados(
      new Set(valesNoFacturadosFiltrados.map((vale) => vale.id)),
    );
  };

  const limpiarFiltrosValesNoFacturados = () => {
    setMesValesNoFacturados(undefined);
    setAnioValesNoFacturados(undefined);
    setFechaValesNoFacturados("");
    setSearchValesNoFacturados("");
  };

  const limpiarSeleccionValesNoFacturados = () => {
    setSelectedValesNoFacturados(new Set());
    setSelectedFacturaDestinoId("");
  };

  const handleCrearFacturaDesdeValesNoFacturados = async () => {
    if (
      !selectedClienteRaw ||
      valesNoFacturadosSeleccionadosLista.length === 0
    ) {
      return;
    }
    if (hasClientesMezclados) {
      toast({
        title: "Clientes mezclados",
        description:
          "Debes seleccionar vales del mismo cliente para crear la factura.",
        variant: "destructive",
      });
      return;
    }

    setProcessingValesNoFacturados(true);
    try {
      const valesAjustados = await Promise.all(
        valesNoFacturadosSeleccionadosLista.map((vale) =>
          ajustarValeConDevoluciones(vale),
        ),
      );

      setSelectedFactura(null);
      setPrefillNuevaFacturaClienteId(selectedClienteRaw);
      setPrefillNuevaFacturaVales(valesAjustados);
      setFormDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error preparando vales",
        description:
          error instanceof Error
            ? error.message
            : "No se pudieron preparar los vales seleccionados.",
        variant: "destructive",
      });
    } finally {
      setProcessingValesNoFacturados(false);
    }
  };

  const handleAgregarValesNoFacturadosAFactura = async () => {
    if (
      !selectedFacturaDestinoId ||
      valesNoFacturadosSeleccionadosLista.length === 0
    ) {
      return;
    }
    if (hasClientesMezclados) {
      toast({
        title: "Clientes mezclados",
        description:
          "Debes seleccionar vales del mismo cliente para agregarlos a una factura existente.",
        variant: "destructive",
      });
      return;
    }

    const facturaDestino = facturas.find(
      (factura) => factura.id === selectedFacturaDestinoId,
    );
    if (!facturaDestino) {
      toast({
        title: "Factura no encontrada",
        description: "No se encontró la factura destino seleccionada.",
        variant: "destructive",
      });
      return;
    }
    if (facturaDestino.anulada) {
      toast({
        title: "Factura anulada",
        description: "No puedes agregar vales a una factura anulada.",
        variant: "destructive",
      });
      return;
    }

    setProcessingValesNoFacturados(true);
    try {
      for (const vale of valesNoFacturadosSeleccionadosLista) {
        const valeAjustado = await ajustarValeConDevoluciones(vale);
        await agregarVale(
          selectedFacturaDestinoId,
          mapValeSalidaToFacturaVale(valeAjustado),
        );
      }
      toast({
        title: "Vales agregados",
        description: `Se agregaron ${valesNoFacturadosSeleccionadosLista.length} vale(s) a la factura seleccionada.`,
      });
      limpiarSeleccionValesNoFacturados();
      await cargarValesNoFacturados();
    } catch (error) {
      toast({
        title: "Error agregando vales",
        description:
          error instanceof Error
            ? error.message
            : "No se pudieron agregar los vales a la factura.",
        variant: "destructive",
      });
    } finally {
      setProcessingValesNoFacturados(false);
    }
  };

  const handleExportFacturasExcel = async () => {
    if (facturasFiltradas.length === 0) {
      toast({
        title: "Sin datos para exportar",
        description: "No hay facturas en la vista actual.",
        variant: "destructive",
      });
      return;
    }

    setExportingExcel(true);
    try {
      const facturasOrdenadas = [...facturasFiltradas].sort((a, b) => {
        const fechaA = parseDateTimestamp(a.fecha || a.fecha_creacion || "");
        const fechaB = parseDateTimestamp(b.fecha || b.fecha_creacion || "");
        return fechaA - fechaB;
      });

      const data = facturasOrdenadas.map((factura) => {
        let clienteDisplay = factura.cliente_nombre || "";
        if (!clienteDisplay) {
          clienteDisplay = "Sin cliente";
        }

        return {
          numero_factura: factura.numero_factura,
          mes: factura.mes || "N/A",
          fecha: factura.fecha || "N/A",
          cliente: clienteDisplay,
          estado_factura: factura.anulada ? "Anulada" : "Activa",
          motivo_anulacion: factura.motivo_anulacion?.trim() || "-",
          total_materiales: factura.total_factura,
          monto_pagado: factura.monto_pagado ?? factura.total_factura,
        };
      });

      await exportToExcel({
        title: "Suncar SRL - Vales y Facturas de Ventas",
        subtitle: `Registros exportados: ${data.length} facturas${Object.keys(filters).length > 0 ? " (filtradas)" : ""}`,
        filename: generateFilename("facturas_ventas"),
        columns: [
          { header: "Número Factura", key: "numero_factura", width: 18 },
          { header: "Mes", key: "mes", width: 12 },
          { header: "Fecha", key: "fecha", width: 14 },
          { header: "Cliente", key: "cliente", width: 30 },
          { header: "Estado", key: "estado_factura", width: 14 },
          { header: "Motivo Anulacion", key: "motivo_anulacion", width: 34 },
          {
            header: "Total Materiales Facturados",
            key: "total_materiales",
            width: 22,
          },
          { header: "Monto Pagado", key: "monto_pagado", width: 18 },
        ],
        data,
      });

      toast({
        title: "Exportación completada",
        description: `Se exportaron ${data.length} facturas a Excel.`,
      });
    } catch (error) {
      console.error("Error exportando facturas a Excel:", error);
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el archivo Excel.",
        variant: "destructive",
      });
    } finally {
      setExportingExcel(false);
    }
  };

  const allValesFiltradosSeleccionados = useMemo(
    () =>
      valesNoFacturadosFiltrados.length > 0 &&
      valesNoFacturadosFiltrados.every((vale) =>
        selectedValesNoFacturados.has(vale.id),
      ),
    [valesNoFacturadosFiltrados, selectedValesNoFacturados],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Header */}
      <header className="fixed-header bg-white shadow-sm border-b border-blue-100">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-5 gap-4">
            <div className="flex items-center space-x-3">
              <Link href="/facturas">
                <Button
                  variant="ghost"
                  size="icon"
                  className="touch-manipulation h-9 w-9 sm:h-10 sm:w-auto sm:px-4 sm:rounded-md gap-2"
                  aria-label="Volver a Facturación"
                  title="Volver a Facturación"
                >
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Volver a Facturación</span>
                  <span className="sr-only">Volver a Facturación</span>
                </Button>
              </Link>
              <div className="p-0 rounded-full bg-white shadow border border-blue-200 flex items-center justify-center h-8 w-8 sm:h-12 sm:w-12">
                <img
                  src="/logo.png"
                  alt="Logo SunCar"
                  className="h-6 w-6 sm:h-10 sm:w-10 object-contain rounded-full"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate flex items-center gap-2">
                  Vales y Facturas de Ventas
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Finanzas
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                  Control de facturación y vales de ventas
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 justify-end">
              {activeTab === "facturas" ? (
                <>
                  <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                    Total facturado: {formatCurrency(totalFacturado)}
                  </div>
                  <Button
                    onClick={handleExportFacturasExcel}
                    variant="outline"
                    size="sm"
                    disabled={exportingExcel || facturasFiltradas.length === 0}
                    className="h-10 sm:h-auto sm:w-auto sm:px-4 sm:py-2 border-green-300 text-green-700 hover:bg-green-50 touch-manipulation"
                  >
                    {exportingExcel ? (
                      <>
                        <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                        <span className="hidden sm:inline">Exportando...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Exportar Excel</span>
                      </>
                    )}
                    <span className="sr-only">Exportar facturas a Excel</span>
                  </Button>
                  <Button
                    onClick={handleCreate}
                    size="sm"
                    className="h-10 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 touch-manipulation"
                    aria-label="Nueva factura"
                    title="Nueva factura"
                  >
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Nueva Factura</span>
                    <span className="sr-only">Nueva factura</span>
                  </Button>
                </>
              ) : (
                <>
                  <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                    Total no facturado: {formatCurrency(totalNoFacturado)}
                  </div>
                  <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600">
                    {valesNoFacturadosFiltrados.length !== valesNoFacturados.length
                      ? `${valesNoFacturadosFiltrados.length} de ${valesNoFacturados.length} vales`
                      : `${valesNoFacturados.length} vales`}
                  </div>
                  <Button
                    onClick={cargarValesNoFacturados}
                    variant="outline"
                    size="sm"
                    disabled={loadingValesNoFacturados}
                    className="h-10 sm:h-auto sm:w-auto sm:px-4 sm:py-2 border-blue-300 text-blue-700 hover:bg-blue-50 touch-manipulation"
                  >
                    {loadingValesNoFacturados ? (
                      <>
                        <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                        <span className="hidden sm:inline">Cargando...</span>
                      </>
                    ) : (
                      "Recargar Vales"
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="content-with-fixed-header pb-10 w-full px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  Error al cargar facturas
                </h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <p className="mt-2 text-xs text-red-600">
                  Verifica la consola del navegador (F12) para más detalles.
                </p>
              </div>
            </div>
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as VistaFacturacionTab)}
          className="space-y-6"
        >
          <TabsList className="grid w-full max-w-lg grid-cols-2">
            <TabsTrigger value="facturas">Facturas</TabsTrigger>
            <TabsTrigger value="vales-no-facturados">
              Vales No Facturados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="facturas" className="space-y-6 mt-0">
            <FacturasFilters
              filters={filters}
              onApplyFilters={aplicarFiltros}
              onClearFilters={limpiarFiltros}
              reversed={reversed}
              onToggleReversed={() => setReversed(!reversed)}
              hideEstado
              hideTipo
              hideSubtipo
            />

            <FacturasConsolidadasTable
              facturas={facturasFiltradas}
              loading={loading}
              onEdit={handleEditConsolidada}
              onViewDetails={handleViewDetailsConsolidada}
              onAddVale={handleAddValeConsolidada}
              onAnular={handleAnularConsolidada}
              reversed={reversed}
              modeVentas
            />
          </TabsContent>

          <TabsContent value="vales-no-facturados" className="space-y-6 mt-0">
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
              <div>
                <p className="font-semibold text-gray-900">
                  Selección de vales no facturados
                </p>
                <p className="text-sm text-gray-600">
                  Selecciona uno o varios vales del mismo cliente para crear una
                  factura nueva o agregarlos a una factura existente.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <div className="space-y-1">
                  <Label>Mes</Label>
                  <Select
                    value={mesValesNoFacturados?.toString() || "0"}
                    onValueChange={(value) =>
                      setMesValesNoFacturados(
                        value === "0" ? undefined : parseInt(value, 10),
                      )
                    }
                    disabled={Boolean(fechaValesNoFacturados)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Mes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Todos</SelectItem>
                      {MESES_OPCIONES.map((mes) => (
                        <SelectItem
                          key={mes.value}
                          value={mes.value.toString()}
                        >
                          {mes.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Año</Label>
                  <Select
                    value={anioValesNoFacturados?.toString() || "0"}
                    onValueChange={(value) =>
                      setAnioValesNoFacturados(
                        value === "0" ? undefined : parseInt(value, 10),
                      )
                    }
                    disabled={Boolean(fechaValesNoFacturados)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Todos</SelectItem>
                      {yearsValesNoFacturados.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Fecha específica</Label>
                  <Input
                    type="date"
                    value={fechaValesNoFacturados}
                    onChange={(event) => {
                      const value = event.target.value;
                      setFechaValesNoFacturados(value);
                      if (value) {
                        setMesValesNoFacturados(undefined);
                        setAnioValesNoFacturados(undefined);
                      }
                    }}
                    disabled={Boolean(
                      mesValesNoFacturados || anioValesNoFacturados,
                    )}
                  />
                </div>

                <div className="space-y-1 lg:col-span-2">
                  <Label>Buscador</Label>
                  <Input
                    value={searchValesNoFacturados}
                    onChange={(event) =>
                      setSearchValesNoFacturados(event.target.value)
                    }
                    placeholder="Buscar por vale, cliente o solicitud..."
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={limpiarFiltrosValesNoFacturados}
                >
                  Limpiar filtros
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    allValesFiltradosSeleccionados
                      ? limpiarSeleccionValesNoFacturados()
                      : seleccionarTodosValesNoFacturados()
                  }
                  disabled={valesNoFacturadosFiltrados.length === 0}
                >
                  {allValesFiltradosSeleccionados
                    ? "Limpiar selección"
                    : "Seleccionar todos"}
                </Button>
              </div>

              {selectedValesNoFacturados.size > 0 && (
                <div className="space-y-3 border-t pt-3">
                  <p className="text-sm text-gray-700">
                    Seleccionados:{" "}
                    <span className="font-semibold">
                      {selectedValesNoFacturados.size} vale(s)
                    </span>
                    {selectedClienteNombre ? (
                      <>
                        {" "}
                        del cliente{" "}
                        <span className="font-semibold">
                          {selectedClienteNombre}
                        </span>
                      </>
                    ) : null}
                  </p>

                  {hasClientesMezclados ? (
                    <p className="text-sm text-red-600">
                      La selección incluye vales de clientes diferentes. Deben
                      ser del mismo cliente para continuar.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <Button
                        type="button"
                        onClick={handleCrearFacturaDesdeValesNoFacturados}
                        disabled={
                          processingValesNoFacturados || !selectedClienteRaw
                        }
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {processingValesNoFacturados ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creando factura...
                          </>
                        ) : (
                          "Crear Factura Nueva"
                        )}
                      </Button>

                      <div className="flex gap-2">
                        <Select
                          value={selectedFacturaDestinoId}
                          onValueChange={setSelectedFacturaDestinoId}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecciona factura destino" />
                          </SelectTrigger>
                          <SelectContent>
                            {facturasDestinoCompatibles.length === 0 ? (
                              <SelectItem value="__sin_facturas__" disabled>
                                No hay facturas del cliente
                              </SelectItem>
                            ) : (
                              facturasDestinoCompatibles.map((factura) => (
                                <SelectItem
                                  key={factura.id}
                                  value={factura.id as string}
                                >
                                  {`${factura.numero_factura} | ${
                                    factura.fecha_creacion
                                      ? new Date(
                                          factura.fecha_creacion,
                                        ).toLocaleDateString("es-ES")
                                      : "Sin fecha"
                                  } | ${formatCurrency(
                                    calcularTotalMaterialesFactura(factura),
                                  )} | ${getEstadoFacturaLabel(factura)}`}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAgregarValesNoFacturadosAFactura}
                          disabled={
                            processingValesNoFacturados ||
                            !selectedFacturaDestinoId ||
                            facturasDestinoCompatibles.length === 0
                          }
                        >
                          {processingValesNoFacturados ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Agregar"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {loadingValesNoFacturados ? (
              <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : valesNoFacturadosError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">{valesNoFacturadosError}</p>
              </div>
            ) : valesNoFacturadosFiltrados.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-700 font-medium">
                  No hay vales no facturados disponibles
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Prueba ajustando la búsqueda o recargando los vales.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {valesNoFacturadosFiltrados.map((vale) => {
                  const valeOriginal = valesNoFacturadosOriginales[vale.id] || vale;
                  const total = vale.materiales.reduce((sum, material) => {
                    const precio = material.material?.precio || 0;
                    const cantidad = material.cantidad || 0;
                    return sum + precio * cantidad;
                  }, 0);
                  const totalDevuelto = vale.materiales.reduce(
                    (sum, material, index) => {
                      const originalCantidad = toSafeNumber(
                        valeOriginal.materiales?.[index]?.cantidad,
                      );
                      const facturableCantidad = toSafeNumber(material.cantidad);
                      return sum + Math.max(0, originalCantidad - facturableCantidad);
                    },
                    0,
                  );
                  const solicitud = getSolicitudFromVale(vale);
                  const cliente = getClienteFromVale(vale);
                  const isSelected = selectedValesNoFacturados.has(vale.id);
                  const isExpanded = expandedValesNoFacturados.has(vale.id);

                  return (
                    <div
                      key={vale.id}
                      className={`border rounded-lg transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-blue-300"
                      }`}
                    >
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => toggleValeNoFacturado(vale.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() =>
                              toggleValeNoFacturado(vale.id)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-gray-900">
                                  Vale {vale.codigo || vale.id.slice(0, 8)}
                                </p>
                                <p className="text-xs text-gray-600">
                                  Cliente: {cliente?.nombre || "Sin cliente"}{" "}
                                  {(cliente as any)?.numero
                                    ? `(#${(cliente as any).numero})`
                                    : ""}
                                </p>
                              </div>
                              <span className="font-bold text-blue-600">
                                {formatCurrency(total)}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600">
                              <p>
                                Solicitud:{" "}
                                {solicitud?.codigo || solicitud?.id || "N/A"}
                              </p>
                              <p>
                                Estado solicitud: {solicitud?.estado || "N/A"}
                              </p>
                              <p>
                                Fecha:{" "}
                                {vale.fecha_creacion
                                  ? new Date(
                                      vale.fecha_creacion,
                                    ).toLocaleDateString("es-ES")
                                  : "N/A"}
                              </p>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">
                                  Materiales ({vale.materiales.length})
                                </span>
                                {totalDevuelto > 0 ? (
                                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                                    Devuelto: {totalDevuelto}
                                  </span>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleExpandirValeNoFacturado(vale.id);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-3 w-3" />
                                    Ocultar
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3 w-3" />
                                    Ver todos
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-200 bg-gray-50 p-4">
                          <div className="space-y-2">
                            {vale.materiales.map((material, idx) => {
                              const originalCantidad = toSafeNumber(
                                valeOriginal.materiales?.[idx]?.cantidad,
                              );
                              const facturableCantidad = toSafeNumber(
                                material.cantidad,
                              );
                              const devueltaCantidad = Math.max(
                                0,
                                originalCantidad - facturableCantidad,
                              );

                              return (
                                <div
                                  key={idx}
                                  className="flex justify-between items-start text-sm bg-white p-2 rounded border border-gray-200"
                                >
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900">
                                      {material.material_codigo ||
                                        material.codigo ||
                                        "Sin código"}
                                    </p>
                                    <p className="text-gray-600 text-xs">
                                      {material.material_descripcion ||
                                        material.descripcion ||
                                        material.material?.descripcion ||
                                        material.material?.nombre ||
                                        "Sin descripción"}
                                    </p>
                                    {devueltaCantidad > 0 ? (
                                      <p className="text-[11px] text-amber-700 mt-1">
                                        Devuelto: {devueltaCantidad} • Original:{" "}
                                        {originalCantidad}
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-gray-900">
                                      x{facturableCantidad}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formatCurrency(
                                        (material.material?.precio || 0) *
                                          facturableCantidad,
                                      )}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialog de Formulario */}
      <FacturaVentasFormDialog
        open={formDialogOpen}
        onOpenChange={handleFormDialogOpenChange}
        factura={selectedFactura}
        prefillClienteId={prefillNuevaFacturaClienteId}
        prefillVales={prefillNuevaFacturaVales}
        onSave={handleSave}
        onGetNumeroSugerido={obtenerNumeroSugerido}
        materials={materials}
      />

      {/* Dialog de Confirmación de Eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar factura?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La factura y todos sus vales
              serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnularFacturaDialog
        open={anularDialogOpen}
        onOpenChange={(open) => {
          setAnularDialogOpen(open);
          if (!open) setFacturaToAnular(null);
        }}
        factura={facturaToAnular}
        onConfirm={confirmAnularFactura}
        isLoading={anulandoFactura}
      />

      {/* Dialog de Detalles */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Detalles de Factura</DialogTitle>
              {facturaDetails ? (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleAnularClick(facturaDetails)}
                    disabled={facturaDetails.anulada}
                  >
                    {facturaDetails.anulada ? "Factura anulada" : "Anular"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditFacturaFromDetails}
                    disabled={facturaDetails.anulada}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar factura
                  </Button>
                  {facturaDetails.vales?.length ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportFacturaPdf}
                        disabled={exportingFacturaPdf || exportingFacturaExcel}
                      >
                        {exportingFacturaPdf ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Exportando PDF...
                          </>
                        ) : (
                          <>
                            <FileText className="mr-2 h-4 w-4" />
                            Exportar PDF
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportFacturaExcel}
                        disabled={exportingFacturaPdf || exportingFacturaExcel}
                      >
                        {exportingFacturaExcel ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Exportando Excel...
                          </>
                        ) : (
                          <>
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Exportar Excel
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setValesListDialogOpen(true)}
                      >
                        Ver vales ({facturaDetails.vales.length})
                      </Button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </DialogHeader>

          {facturaDetails && (
            <div className="space-y-6 max-h-[78vh] overflow-y-auto pr-1">
              {facturaDetails.anulada ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-semibold text-red-700">
                    Factura anulada
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    Motivo:{" "}
                    {facturaDetails.motivo_anulacion?.trim() ||
                      "No especificado"}
                  </p>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Número de Factura</p>
                  <p className="font-semibold text-lg">
                    {facturaDetails.numero_factura}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cliente</p>
                  <p className="font-semibold">
                    {facturaDetails.nombre_cliente || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="font-bold text-xl text-blue-600">
                    {formatCurrency(facturaDetails.total || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Estado</p>
                  <div className="flex gap-2 mt-1">
                    {facturaDetails.anulada ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                        Anulada
                      </span>
                    ) : null}
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        facturaDetails.pagada
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {facturaDetails.pagada ? "Pagada" : "No Pagada"}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        facturaDetails.terminada
                          ? "bg-blue-100 text-blue-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {facturaDetails.terminada ? "Terminada" : "En Proceso"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">
                  Items (
                  {facturaDetails.vales.reduce(
                    (acc, v) => acc + v.items.length,
                    0,
                  )}
                  )
                </h3>
                {facturaDetails.vales
                  .flatMap((vale, valeIndex) =>
                    vale.items.map((item) => ({
                      valeIndex,
                      ...item,
                    })),
                  )
                  .map((entry, idx) => (
                    <div
                      key={`${entry.valeIndex}-${idx}-${entry.codigo}`}
                      className="grid grid-cols-12 gap-2 text-sm bg-white p-3 rounded border"
                    >
                      <div className="col-span-1 text-gray-500">#{idx + 1}</div>
                      <div className="col-span-4">
                        <p className="font-medium">{entry.descripcion}</p>
                        <p className="text-gray-500 text-xs">
                          Cod: {entry.codigo}
                        </p>
                      </div>
                      <div className="col-span-2 text-right">
                        <p>Cant: {entry.cantidad}</p>
                      </div>
                      <div className="col-span-2 text-right">
                        <p>Precio: {formatCurrency(entry.precio)}</p>
                      </div>
                      <div className="col-span-2 text-right font-semibold">
                        <p>
                          Subtotal:{" "}
                          {formatCurrency(entry.precio * entry.cantidad)}
                        </p>
                      </div>
                      <div className="col-span-1 text-right text-xs text-gray-500">
                        Vale {entry.valeIndex + 1}
                      </div>
                    </div>
                  ))}
                {facturaDetails.vales.length === 0 && (
                  <p className="text-sm text-gray-500">
                    No hay vales asociados.
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialogo listado de vales */}
      <Dialog open={valesListDialogOpen} onOpenChange={setValesListDialogOpen}>
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vales asociados</DialogTitle>
          </DialogHeader>
          {facturaDetails?.vales?.length ? (
            <div className="space-y-4">
              {facturaDetails.vales.map((vale, valeIndex) => (
                <div
                  key={vale.id || valeIndex}
                  className="border rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold">Vale #{valeIndex + 1}</h4>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-600">
                        Fecha:{" "}
                        {new Date(vale.fecha).toLocaleDateString("es-ES")}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleEditValeClick(facturaDetails, vale)
                        }
                        disabled={
                          facturaDetails.anulada || deletingValeId === vale.id
                        }
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          handleQuitarValeClick(facturaDetails, vale)
                        }
                        disabled={
                          facturaDetails.anulada || deletingValeId === vale.id
                        }
                      >
                        {deletingValeId === vale.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                        )}
                        Quitar
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {vale.items.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0"
                      >
                        <div className="flex-1">
                          <p className="font-medium">
                            {item.codigo} - {item.descripcion}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(item.precio)} x {item.cantidad}
                          </p>
                        </div>
                        <div className="font-semibold">
                          {formatCurrency(item.precio * item.cantidad)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-300 flex justify-between font-semibold">
                    <span>Total del Vale:</span>
                    <span className="text-blue-600">
                      {formatCurrency(
                        vale.items.reduce(
                          (sum, item) => sum + item.precio * item.cantidad,
                          0,
                        ),
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No hay vales asociados.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialogo para agregar vale a factura existente */}
      <Dialog open={valeDialogOpen} onOpenChange={handleValeDialogOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {valeToEdit ? "Editar Vale" : "Agregar Vale"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            <p className="text-sm text-gray-600">
              Factura:{" "}
              <span className="font-semibold">
                {facturaForVale?.numero_factura || "Sin número"}
              </span>
            </p>

            {!valeToEdit && facturaForVale?.cliente_id && (
              <div>
                <Label className="text-sm font-medium text-gray-700 block">
                  Forma de agregar vale
                </Label>
                <p className="text-xs text-gray-600 mt-1 mb-3">
                  Selecciona cómo deseas agregar el vale a la factura.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setModoManual(true)}
                    className={`rounded-md border p-3 text-left transition-colors ${
                      modoManual
                        ? "border-amber-500 bg-amber-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Hand className="h-4 w-4" />
                      Manual
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Crea un vale agregando materiales manualmente.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModoManual(false);
                      cargarValesDisponibles();
                    }}
                    className={`rounded-md border p-3 text-left transition-colors ${
                      !modoManual
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <FileText className="h-4 w-4" />
                      Desde Vales de Salida
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Selecciona vales de salida existentes del cliente.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {modoManual ? (
              <ValeForm
                vale={valeDraft}
                index={0}
                materiales={materials}
                onChange={(_, vale) => setValeDraft(vale)}
                onRemove={() => setValeDraft(valeDraft)}
                canRemove={false}
                tipoFactura="venta"
              />
            ) : (
              <div className="space-y-3">
                {loadingValesSalida ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : valesDisponibles.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600 font-medium">
                      No hay vales disponibles
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      No se encontraron vales de salida para este cliente.
                    </p>
                  </div>
                ) : (
                  valesDisponibles.map((vale) => {
                    const total = vale.materiales.reduce((sum, material) => {
                      const precio = material.material?.precio || 0;
                      const cantidad = material.cantidad || 0;
                      return sum + precio * cantidad;
                    }, 0);
                    const isSelected = valesSeleccionados.has(vale.id);
                    const isExpanded = valesExpandidos.has(vale.id);

                    return (
                      <div
                        key={vale.id}
                        className={`border rounded-lg transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        <div
                          className="p-4 cursor-pointer"
                          onClick={() => toggleVale(vale.id)}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleVale(vale.id)}
                              className="mt-1"
                            />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-lg">
                                    Vale {vale.codigo || vale.id.slice(0, 8)}
                                  </span>
                                </div>
                                <span className="font-bold text-blue-600">
                                  {formatCurrency(total)}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                {vale.fecha_creacion && (
                                  <div>
                                    Fecha:{" "}
                                    {new Date(
                                      vale.fecha_creacion,
                                    ).toLocaleDateString("es-ES")}
                                  </div>
                                )}
                                {vale.recogido_por && (
                                  <div>Recogido: {vale.recogido_por}</div>
                                )}
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">
                                    Materiales ({vale.materiales.length})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      toggleExpandirVale(vale.id, e)
                                    }
                                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="h-3 w-3" />
                                        Ocultar
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-3 w-3" />
                                        Ver todos
                                      </>
                                    )}
                                  </button>
                                </div>

                                {!isExpanded ? (
                                  <div className="space-y-1">
                                    {vale.materiales
                                      .slice(0, 2)
                                      .map((material, idx) => (
                                        <div
                                          key={idx}
                                          className="text-sm text-gray-700 flex justify-between"
                                        >
                                          <span>
                                            {material.material_codigo ||
                                              material.codigo}{" "}
                                            -{" "}
                                            {material.material_descripcion ||
                                              material.descripcion}
                                          </span>
                                          <span className="text-gray-500">
                                            x{material.cantidad}
                                          </span>
                                        </div>
                                      ))}
                                    {vale.materiales.length > 2 && (
                                      <p className="text-xs text-gray-500">
                                        +{vale.materiales.length - 2} más...
                                      </p>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-gray-200 bg-gray-50 p-4">
                            <div className="space-y-2">
                              {vale.materiales.map((material, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between items-start text-sm bg-white p-2 rounded border border-gray-200"
                                >
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900">
                                      {material.material_codigo ||
                                        material.codigo}
                                    </p>
                                    <p className="text-gray-600 text-xs">
                                      {material.material_descripcion ||
                                        material.descripcion}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-gray-900">
                                      x{material.cantidad}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formatCurrency(
                                        (material.material?.precio || 0) *
                                          material.cantidad,
                                      )}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center gap-2 border-t pt-4">
            {!modoManual && valesSeleccionados.size > 0 && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">
                  {valesSeleccionados.size} vale(s) seleccionado(s)
                </span>
              </div>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={() => handleValeDialogOpenChange(false)}
                disabled={savingVale}
              >
                Cancelar
              </Button>
              {modoManual ? (
                <Button
                  onClick={handleSaveVale}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={
                    savingVale ||
                    loadingMaterials ||
                    valeDraft.items.length === 0 ||
                    !valeDraft.fecha
                  }
                >
                  {savingVale ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : valeToEdit ? (
                    "Actualizar Vale"
                  ) : (
                    "Guardar Vale"
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleAgregarValesSeleccionados}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={savingVale || valesSeleccionados.size === 0}
                >
                  {savingVale ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    `Agregar (${valesSeleccionados.size})`
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
