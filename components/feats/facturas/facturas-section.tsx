"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useFacturas } from "@/hooks/use-facturas";
import { FacturasFilters } from "./facturas-filters";
import { FacturasConsolidadasTable } from "./facturas-consolidadas-table";
import { FacturaFormDialog } from "./factura-form-dialog";
import type { Factura, FacturaConsolidada, Vale } from "@/lib/types/feats/facturas/factura-types";
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
  FacturaContabilidadService,
  type FacturaContabilidadReporteMensualItem,
} from "@/lib/services/feats/facturas/factura-contabilidad-service";
import { SeleccionarValesSalidaDialog } from "./seleccionar-vales-salida-dialog";
import type { ValeSalida } from "@/lib/api-types";
import { ValeSalidaService } from "@/lib/services/feats/vales-salida/vale-salida-service";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import { Label } from "@/components/shared/atom/label";

const parseNullableNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Limpiar símbolos y espacios, preservando separadores decimales/millares.
    const cleaned = trimmed.replace(/[^\d,.-]/g, "");
    if (!cleaned) return null;

    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    let normalized = cleaned;

    // Si existen ambos separadores, el último se considera decimal.
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

const formatDateForExcel = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

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

export function FacturasSection() {
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
    agregarVale,
    actualizarVale,
    cargarFacturasConsolidadas,
  } = useFacturas();
  const { materials, loading: loadingMaterials } = useMaterials();
  const { toast } = useToast();

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [facturaToDelete, setFacturaToDelete] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [facturaDetails, setFacturaDetails] = useState<Factura | null>(null);
  const [valesListDialogOpen, setValesListDialogOpen] = useState(false);
  const [valeDialogOpen, setValeDialogOpen] = useState(false);
  const [modoManual, setModoManual] = useState(true); // true = manual, false = desde vales de salida
  const [valesDisponibles, setValesDisponibles] = useState<ValeSalida[]>([]);
  const [valesSeleccionados, setValesSeleccionados] = useState<Set<string>>(new Set());
  const [valesExpandidos, setValesExpandidos] = useState<Set<string>>(new Set());
  const [loadingValesSalida, setLoadingValesSalida] = useState(false);
  const [facturaForVale, setFacturaForVale] = useState<Factura | null>(null);
  const [valeToEdit, setValeToEdit] = useState<{ valeId: string } | null>(null);
  const [savingVale, setSavingVale] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [reversed, setReversed] = useState(false);
  const [valeDraft, setValeDraft] = useState<Vale>({
    fecha: "",
    items: [],
  });

  useEffect(() => {
    if (!facturaDetails?.id) return;

    const facturaActualizada = facturas.find((f) => f.id === facturaDetails.id);
    if (facturaActualizada) {
      setFacturaDetails(facturaActualizada);
    }
  }, [facturas, facturaDetails?.id]);

  const exportFacturaItems = () => {
    if (!facturaDetails || !facturaDetails.vales) return;
    const rows = facturaDetails.vales.flatMap((vale, valeIndex) =>
      vale.items.map((item) => ({
        vale: valeIndex + 1,
        fecha_vale: vale.fecha
          ? new Date(vale.fecha).toISOString().slice(0, 10)
          : "",
        codigo: item.codigo,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio: item.precio,
        subtotal: item.precio * item.cantidad,
      })),
    );
    const headers = [
      "Vale",
      "Fecha vale",
      "Código",
      "Descripción",
      "Cantidad",
      "Precio",
      "Subtotal",
    ];
    const csvBody = rows
      .map((r) =>
        [
          r.vale,
          r.fecha_vale,
          r.codigo,
          `"${(r.descripcion || "").replace(/"/g, '""')}"`,
          r.cantidad,
          r.precio,
          r.subtotal,
        ].join(";"),
      )
      .join("\n");
    const csvContent = [headers.join(";"), csvBody].join("\n");

    // Agregar BOM UTF-8 para correcta detección de encoding en Excel
    const BOM = "\uFEFF";
    const csvContentWithBOM = BOM + csvContent;

    const blob = new Blob([csvContentWithBOM], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `factura_${facturaDetails.numero_factura || "detalle"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCreate = () => {
    setSelectedFactura(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (factura: Factura) => {
    setSelectedFactura(factura);
    setFormDialogOpen(true);
  };

  const handleEditConsolidada = (facturaConsolidada: FacturaConsolidada) => {
    // Buscar la factura completa en el array de facturas normales
    const facturaCompleta = facturas.find(f => f.numero_factura === facturaConsolidada.numero_factura);
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

  const handleViewDetailsConsolidada = (facturaConsolidada: FacturaConsolidada) => {
    // Buscar la factura completa en el array de facturas normales
    const facturaCompleta = facturas.find(f => f.numero_factura === facturaConsolidada.numero_factura);
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
    // Buscar la factura completa en el array de facturas normales
    const facturaCompleta = facturas.find(f => f.numero_factura === facturaConsolidada.numero_factura);
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
          fecha: valeDraft.fecha,
          items: valeDraft.items,
        });
      } else {
        await agregarVale(facturaForVale.id, {
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
      // Convertir cada vale de salida al formato de Vale de factura
      for (const valeSalida of vales) {
        const valeParaFactura: Vale = {
          id: valeSalida.id, // Usar el ID del vale de salida como ID del vale
          fecha: valeSalida.fecha_creacion || new Date().toISOString(),
          items: valeSalida.materiales.map((material) => ({
            material_id: material.material_id,
            codigo: material.material_codigo || material.codigo || "",
            descripcion: material.material_descripcion || material.descripcion || "",
            precio: material.material?.precio || 0,
            cantidad: material.cantidad,
          })),
        };

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
      // Obtener vales de salida con filtros optimizados
      const vales = await ValeSalidaService.getVales({
        estado: "usado", // Solo vales usados
        // El backend debería filtrar por facturado=false, pero lo hacemos aquí también
      });

      // Filtrar vales que cumplan todos los criterios:
      // 1. Pertenecen al cliente (comparar por numero de cliente)
      // 2. Campo facturado = false
      // 3. No están anulados (ya filtrado por estado="usado")
      const valesFiltrados = vales.filter((vale) => {
        // Verificar que no esté ya facturado
        if (vale.facturado === true) return false;

        // Obtener la solicitud
        const solicitud = vale.solicitud_material || vale.solicitud_venta || vale.solicitud;
        if (!solicitud) return false;

        // Verificar que pertenezca al cliente (comparar por numero)
        const cliente = solicitud.cliente || solicitud.cliente_venta;
        if (!cliente) return false;

        // Comparar por numero de cliente
        const numeroCliente = cliente.numero || cliente.id;
        if (numeroCliente !== facturaForVale.cliente_id) return false;

        return true;
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
      valesSeleccionados.has(vale.id)
    );
    await handleValesSalidaSeleccionados(vales);
    setValeDialogOpen(false);
    resetValeDialogState();
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
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Filtro local de respaldo para asegurar que el buscador siempre funcione
  const facturasFiltradas = useMemo(() => {
    let resultado = facturasConsolidadas;

    // Filtro por búsqueda de texto
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

    // Filtro por tipo
    if (filters.tipo) {
      resultado = resultado.filter((factura) => factura.tipo === filters.tipo);
    }

    // Filtro por subtipo
    if (filters.subtipo) {
      resultado = resultado.filter((factura) => factura.subtipo === filters.subtipo);
    }

    // Filtro por fecha específica
    if (filters.fecha_vale) {
      resultado = resultado.filter((factura) => {
        if (!factura.fecha) return false;
        // Comparar solo la fecha (sin hora) - formato DD/MM/YYYY del backend
        const [dia, mes, anio] = factura.fecha.split('/');
        const facturaFecha = `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        return facturaFecha === filters.fecha_vale;
      });
    } else {
      // Filtro por mes (usando el campo 'mes' que viene del backend)
      if (filters.mes_vale) {
        resultado = resultado.filter((factura) => {
          if (!factura.mes) return false;
          const mesesMap: { [key: string]: number } = {
            'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
            'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
            'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
          };
          const mesFactura = mesesMap[factura.mes.toLowerCase()];
          return mesFactura === filters.mes_vale;
        });
      }

      // Filtro por año (extraer del campo 'fecha' DD/MM/YYYY)
      if (filters.anio_vale) {
        resultado = resultado.filter((factura) => {
          if (!factura.fecha) return false;
          const [, , anio] = factura.fecha.split('/');
          return parseInt(anio) === filters.anio_vale;
        });
      }
    }

    return resultado;
  }, [facturasConsolidadas, filters]);

  // Calcular total facturado de las facturas filtradas
  const totalFacturado = useMemo(() => {
    return facturasFiltradas.reduce((sum, factura) => sum + factura.total_factura, 0);
  }, [facturasFiltradas]);

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
      const data = facturasFiltradas.map((factura) => {
        const totalPrecioFinal = factura.ofertas.reduce((sum, oferta) => sum + oferta.precio_final, 0);
        const gananciaTotal = factura.ofertas.length > 0 ? totalPrecioFinal - factura.total_factura : 0;
        
        // Determinar el tipo/subtipo para mostrar cuando no hay cliente
        let clienteDisplay = factura.cliente_nombre || '';
        if (!clienteDisplay) {
          if (factura.tipo === 'cliente_directo') {
            clienteDisplay = 'Cliente Directo';
          } else if (factura.subtipo === 'brigada') {
            clienteDisplay = 'Brigada';
          } else {
            clienteDisplay = 'Sin cliente';
          }
        }

        return {
          numero_factura: factura.numero_factura,
          mes: factura.mes || 'N/A',
          fecha: factura.fecha || 'N/A',
          cliente: clienteDisplay,
          total_materiales: factura.total_factura,
          monto_cobrado: factura.total_cobrado_todas_ofertas,
          monto_pendiente: factura.monto_pendiente_materiales,
          precio_final_oferta: factura.ofertas.length > 0 ? totalPrecioFinal : 0,
          ganancia_actual: factura.ofertas.length > 0 ? gananciaTotal : 0,
        };
      });

      await exportToExcel({
        title: "Suncar SRL - Vales y Facturas de Instaladora",
        subtitle: `Registros exportados: ${data.length} facturas${Object.keys(filters).length > 0 ? ' (filtradas)' : ''}`,
        filename: generateFilename("facturas_instaladora"),
        columns: [
          { header: "Número Factura", key: "numero_factura", width: 18 },
          { header: "Mes", key: "mes", width: 12 },
          { header: "Fecha", key: "fecha", width: 14 },
          { header: "Cliente", key: "cliente", width: 30 },
          { header: "Total Materiales Facturados", key: "total_materiales", width: 22 },
          { header: "Monto Cobrado", key: "monto_cobrado", width: 18 },
          { header: "Monto Pendiente Materiales", key: "monto_pendiente", width: 22 },
          { header: "Precio Final Oferta", key: "precio_final_oferta", width: 20 },
          { header: "Ganancia Actual", key: "ganancia_actual", width: 18 },
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header className="fixed-header bg-white shadow-sm border-b border-orange-100">
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
              <div className="p-0 rounded-full bg-white shadow border border-orange-200 flex items-center justify-center h-8 w-8 sm:h-12 sm:w-12">
                <img
                  src="/logo.png"
                  alt="Logo SunCar"
                  className="h-6 w-6 sm:h-10 sm:w-10 object-contain rounded-full"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate flex items-center gap-2">
                  Vales y Facturas de Instaladora
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Finanzas
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                  Control de facturación y vales
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 justify-end">
              <div className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700">
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
                className="h-10 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-orange-600 hover:bg-orange-700 touch-manipulation"
                aria-label="Nueva factura"
                title="Nueva factura"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Nueva Factura</span>
                <span className="sr-only">Nueva factura</span>
              </Button>
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

        <div className="space-y-6">
          <FacturasFilters
            filters={filters}
            onApplyFilters={aplicarFiltros}
            onClearFilters={limpiarFiltros}
            reversed={reversed}
            onToggleReversed={() => setReversed(!reversed)}
          />

          <FacturasConsolidadasTable
            facturas={facturasFiltradas}
            loading={loading}
            onEdit={handleEditConsolidada}
            onViewDetails={handleViewDetailsConsolidada}
            onAddVale={handleAddValeConsolidada}
            reversed={reversed}
          />
        </div>
      </main>

      {/* Dialog de Formulario */}
      <FacturaFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        factura={selectedFactura}
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

      {/* Dialog de Detalles */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Detalles de Factura</DialogTitle>
              {facturaDetails ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditFacturaFromDetails}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar factura
                  </Button>
                  {facturaDetails.vales?.length ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportFacturaItems}
                      >
                        Exportar CSV
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
              {/* Información General */}
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
                  <p className="font-bold text-xl text-orange-600">
                    {formatCurrency(facturaDetails.total || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Estado</p>
                  <div className="flex gap-2 mt-1">
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

              {/* Items combinados de todos los vales */}
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
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Editar
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
                    <span className="text-orange-600">
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

            {/* Selector Manual / Desde Vales de Salida */}
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

            {/* Contenido según modo */}
            {modoManual ? (
              <ValeForm
                vale={valeDraft}
                index={0}
                materiales={materials}
                onChange={(_, vale) => setValeDraft(vale)}
                onRemove={() => setValeDraft(valeDraft)}
                canRemove={false}
                tipoFactura={facturaForVale?.tipo}
              />
            ) : (
              <div className="space-y-3">
                {loadingValesSalida ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
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
                            ? "border-orange-500 bg-orange-50"
                            : "border-gray-200 hover:border-orange-300"
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
                              {/* Header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-lg">
                                    Vale {vale.codigo || vale.id.slice(0, 8)}
                                  </span>
                                </div>
                                <span className="font-bold text-orange-600">
                                  {formatCurrency(total)}
                                </span>
                              </div>

                              {/* Info */}
                              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                {vale.fecha_creacion && (
                                  <div>
                                    Fecha:{" "}
                                    {new Date(
                                      vale.fecha_creacion
                                    ).toLocaleDateString("es-ES")}
                                  </div>
                                )}
                                {vale.recogido_por && (
                                  <div>Recogido: {vale.recogido_por}</div>
                                )}
                              </div>

                              {/* Materiales preview */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">
                                    Materiales ({vale.materiales.length})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => toggleExpandirVale(vale.id, e)}
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
                                    {vale.materiales.slice(0, 2).map((material, idx) => (
                                      <div
                                        key={idx}
                                        className="text-sm text-gray-700 flex justify-between"
                                      >
                                        <span>
                                          {material.material_codigo || material.codigo} -{" "}
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

                        {/* Lista expandida de materiales */}
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
                                      {material.material_codigo || material.codigo}
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
                                          material.cantidad
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
                  className="bg-orange-600 hover:bg-orange-700"
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
                  className="bg-orange-600 hover:bg-orange-700"
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
