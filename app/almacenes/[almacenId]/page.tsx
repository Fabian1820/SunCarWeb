"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { PageLoader } from "@/components/shared/atom/page-loader";
import {
  AlertCircle,
  RefreshCw,
  PackageMinus,
  PackagePlus,
  Search,
  FileSpreadsheet,
  Loader2,
  ArrowRightLeft,
  X,
} from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import { Label } from "@/components/shared/atom/label";
import { Input } from "@/components/shared/molecule/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { StockTable } from "@/components/feats/inventario/stock-table";
import { MovimientosTable } from "@/components/feats/inventario/movimientos-table";
import {
  InventarioService,
  MarcaService,
  MaterialService,
} from "@/lib/api-services";
import type {
  Almacen,
  MovimientoInventario,
  MovimientoLoteResponse,
  StockItem,
} from "@/lib/inventario-types";
import type { Material, BackendCatalogoProductos } from "@/lib/material-types";
import type { MarcaSimplificada } from "@/lib/types/feats/marcas/marca-types";
import { RouteGuard } from "@/components/auth/route-guard";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { MaterialForm } from "@/components/feats/materials/material-form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shared/molecule/tabs";
import { EditarStockForm } from "@/components/feats/inventario/editar-stock-form";
import { SalidaLoteForm } from "@/components/feats/inventario/salida-lote-form";
import { SolicitudTransferenciaDialog } from "@/components/feats/inventario/solicitud-transferencia-dialog";
import { SolicitudesTransferenciaTable } from "@/components/feats/inventario/solicitudes-transferencia-table";
import { exportToExcel, generateFilename } from "@/lib/export-service";

const STOCK_LIMIT = 40;
const MOVIMIENTOS_LIMIT = 40;

export default function AlmacenDetallePage() {
  const params = useParams();
  const almacenId = params.almacenId as string;
  const { toast } = useToast();

  // Core data
  const [almacen, setAlmacen] = useState<Almacen | null>(null);
  const [almacenesList, setAlmacenesList] = useState<Almacen[]>([]);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [marcas, setMarcas] = useState<MarcaSimplificada[]>([]);
  const [catalogos, setCatalogos] = useState<BackendCatalogoProductos[]>([]);

  // Page loading state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active tab & loaded-tabs tracking (lazy loading)
  const [activeTab, setActiveTab] = useState("recepciones");
  const loadedTabs = useRef<Set<string>>(new Set());

  // ── Stock tab state ──────────────────────────────────────────
  const [stock, setStock] = useState<StockItem[]>([]);
  const [stockTotal, setStockTotal] = useState(0);
  const [stockSkip, setStockSkip] = useState(0);
  const [loadingStock, setLoadingStock] = useState(false);
  // Filters (applied server-side)
  const [stockSearchInput, setStockSearchInput] = useState("");
  const [stockSearch, setStockSearch] = useState("");
  const [stockCategoriaFilter, setStockCategoriaFilter] = useState("all");
  const [stockMarcaFilter, setStockMarcaFilter] = useState("all");
  const [stockPotenciaFilter, setStockPotenciaFilter] = useState("all");
  const [stockCantidadFilter, setStockCantidadFilter] = useState<"all" | "zero" | "nonzero">("all");
  const [exportingStock, setExportingStock] = useState(false);

  // ── Historial tab state ──────────────────────────────────────
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [movimientosTotal, setMovimientosTotal] = useState(0);
  const [movimientosSkip, setMovimientosSkip] = useState(0);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [historialSearchInput, setHistorialSearchInput] = useState("");
  const [historialSearch, setHistorialSearch] = useState("");
  const [historialTipo, setHistorialTipo] = useState("");
  const [historialFechaDesde, setHistorialFechaDesde] = useState("");
  const [historialFechaHasta, setHistorialFechaHasta] = useState("");

  // ── Dialogs ──────────────────────────────────────────────────
  const [isEntradaDialogOpen, setIsEntradaDialogOpen] = useState(false);
  const [isSalidaDialogOpen, setIsSalidaDialogOpen] = useState(false);
  const [isEditarStockDialogOpen, setIsEditarStockDialogOpen] = useState(false);
  const [stockToEdit, setStockToEdit] = useState<StockItem | null>(null);
  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferTableKey, setTransferTableKey] = useState(0);

  // ── Lote resumen ─────────────────────────────────────────────
  const [ultimoResumenLote, setUltimoResumenLote] = useState<MovimientoLoteResponse | null>(null);
  const [ultimoTipoLote, setUltimoTipoLote] = useState<"entrada" | "salida" | null>(null);

  // ── Filter options derived from full material catalog ────────
  const marcaNombrePorId = useMemo(() => {
    const map = new Map<string, string>();
    for (const marca of marcas) map.set(marca.id, marca.nombre);
    return map;
  }, [marcas]);

  const stockFilterOptions = useMemo(() => {
    const categoriasSet = new Set<string>();
    const potenciaSet = new Set<string>();
    const marcasMap = new Map<string, string>();
    for (const m of materiales) {
      if (m.categoria) categoriasSet.add(m.categoria);
      if (m.potenciaKW !== undefined && m.potenciaKW !== null && `${m.potenciaKW}` !== "") {
        potenciaSet.add(String(m.potenciaKW));
      }
      if (m.marca_id) {
        marcasMap.set(m.marca_id, marcaNombrePorId.get(m.marca_id) || m.marca_id);
      }
    }
    return {
      categorias: Array.from(categoriasSet).sort((a, b) => a.localeCompare(b)),
      potencias: Array.from(potenciaSet).sort((a, b) => Number(a) - Number(b)),
      marcas: Array.from(marcasMap.entries())
        .map(([id, nombre]) => ({ id, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    };
  }, [materiales, marcaNombrePorId]);

  const categorias = useMemo(() => Array.from(new Set(catalogos.map((c) => c.categoria))).sort(), [catalogos]);
  const unidades = useMemo(() => Array.from(new Set(materiales.map((m) => m.um))).sort(), [materiales]);
  const materialPorCodigo = useMemo(() => {
    const map = new Map<string, Material>();
    for (const m of materiales) map.set(String(m.codigo).trim().toLowerCase(), m);
    return map;
  }, [materiales]);

  // ── Load initial data (almacen info + materials for forms) ───
  const loadDetalle = useCallback(async () => {
    setLoading(true);
    setError(null);
    loadedTabs.current = new Set();
    try {
      const [almacenesData, materialesData, catalogosData, marcasData] = await Promise.all([
        InventarioService.getAlmacenes(),
        MaterialService.getAllMaterials(),
        MaterialService.getAllCatalogs(),
        MarcaService.getMarcasSimplificadas().catch(() => [] as MarcaSimplificada[]),
      ]);
      const almacenEncontrado = almacenesData.find((item) => item.id === almacenId) || null;
      setAlmacen(almacenEncontrado);
      setAlmacenesList(almacenesData);
      setMateriales(materialesData);
      setCatalogos(catalogosData);
      setMarcas(marcasData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el almacén");
    } finally {
      setLoading(false);
    }
  }, [almacenId]);

  // ── Stock fetch ──────────────────────────────────────────────
  const fetchStock = useCallback(async (opts: {
    skip?: number;
    q?: string;
    categoria?: string;
    marca_id?: string;
    potencia_kw?: string;
    cantidad_filter?: string;
  } = {}) => {
    if (!almacenId) return;
    setLoadingStock(true);
    try {
      const result = await InventarioService.getStock({
        almacen_id: almacenId,
        skip: opts.skip ?? 0,
        limit: STOCK_LIMIT,
        q: opts.q || undefined,
        categoria: opts.categoria && opts.categoria !== "all" ? opts.categoria : undefined,
        marca_id: opts.marca_id && opts.marca_id !== "all" ? opts.marca_id : undefined,
        potencia_kw: opts.potencia_kw && opts.potencia_kw !== "all" ? opts.potencia_kw : undefined,
        cantidad_filter: opts.cantidad_filter && opts.cantidad_filter !== "all" ? opts.cantidad_filter : undefined,
      });
      setStock(result.data.map((item) => ({
        ...item,
        almacen_nombre: item.almacen_nombre || almacen?.nombre || item.almacen_id,
      })));
      setStockTotal(result.total);
      setStockSkip(result.skip);
    } finally {
      setLoadingStock(false);
    }
  }, [almacenId, almacen]);

  const refreshStock = useCallback(() => {
    fetchStock({
      skip: 0,
      q: stockSearch || undefined,
      categoria: stockCategoriaFilter,
      marca_id: stockMarcaFilter,
      potencia_kw: stockPotenciaFilter,
      cantidad_filter: stockCantidadFilter,
    });
  }, [fetchStock, stockSearch, stockCategoriaFilter, stockMarcaFilter, stockPotenciaFilter, stockCantidadFilter]);

  // ── Movimientos fetch ────────────────────────────────────────
  const fetchMovimientos = useCallback(async (opts: {
    skip?: number;
    busqueda?: string;
    tipo?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  } = {}) => {
    if (!almacenId) return;
    setLoadingMovimientos(true);
    try {
      const skip = opts.skip ?? 0;
      const fechaDesde = opts.fechaDesde ? `${opts.fechaDesde}T00:00:00` : undefined;
      const fechaHasta = opts.fechaHasta ? `${opts.fechaHasta}T23:59:59` : undefined;
      const result = await InventarioService.getMovimientos({
        almacen_id: almacenId,
        skip,
        limit: MOVIMIENTOS_LIMIT,
        busqueda: opts.busqueda || undefined,
        tipo: opts.tipo || undefined,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
      });
      setMovimientos(result.data);
      setMovimientosTotal(result.total);
      setMovimientosSkip(result.skip);
    } finally {
      setLoadingMovimientos(false);
    }
  }, [almacenId]);

  const refreshMovimientos = useCallback((overrideSkip?: number) => {
    fetchMovimientos({
      skip: overrideSkip ?? movimientosSkip,
      busqueda: historialSearch,
      tipo: historialTipo,
      fechaDesde: historialFechaDesde,
      fechaHasta: historialFechaHasta,
    });
  }, [fetchMovimientos, movimientosSkip, historialSearch, historialTipo, historialFechaDesde, historialFechaHasta]);

  // ── Tab on-demand loading ────────────────────────────────────
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    if (!almacenId) return;

    if (tab === "stock" && !loadedTabs.current.has("stock")) {
      loadedTabs.current.add("stock");
      fetchStock({ skip: 0 });
    }
    if (tab === "historial" && !loadedTabs.current.has("historial")) {
      loadedTabs.current.add("historial");
      fetchMovimientos({ skip: 0 });
    }
  }, [almacenId, fetchStock, fetchMovimientos]);

  // ── Debounce: stock search ────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setStockSearch(stockSearchInput), 400);
    return () => clearTimeout(timer);
  }, [stockSearchInput]);

  // Re-fetch stock when server-side filters change (reset to page 0)
  const isFirstStockRender = useRef(true);
  useEffect(() => {
    if (isFirstStockRender.current) {
      isFirstStockRender.current = false;
      return;
    }
    if (!loadedTabs.current.has("stock")) return;
    fetchStock({
      skip: 0,
      q: stockSearch,
      categoria: stockCategoriaFilter,
      marca_id: stockMarcaFilter,
      potencia_kw: stockPotenciaFilter,
      cantidad_filter: stockCantidadFilter,
    });
    setStockSkip(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockSearch, stockCategoriaFilter, stockMarcaFilter, stockPotenciaFilter, stockCantidadFilter]);

  // ── Debounce: historial search ────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setHistorialSearch(historialSearchInput), 400);
    return () => clearTimeout(timer);
  }, [historialSearchInput]);

  // Re-fetch movimientos when historial filters change
  const isFirstHistorialRender = useRef(true);
  useEffect(() => {
    if (isFirstHistorialRender.current) {
      isFirstHistorialRender.current = false;
      return;
    }
    if (!loadedTabs.current.has("historial")) return;
    fetchMovimientos({
      skip: 0,
      busqueda: historialSearch,
      tipo: historialTipo,
      fechaDesde: historialFechaDesde,
      fechaHasta: historialFechaHasta,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historialSearch, historialTipo, historialFechaDesde, historialFechaHasta]);

  // Initial load
  useEffect(() => {
    setUltimoResumenLote(null);
    setUltimoTipoLote(null);
    loadDetalle();
  }, [loadDetalle]);

  const refreshMateriales = async () => {
    const [materialesData, catalogosData] = await Promise.all([
      MaterialService.getAllMaterials(),
      MaterialService.getAllCatalogs(),
    ]);
    setMateriales(materialesData);
    setCatalogos(catalogosData);
  };

  // ── Pagination computed ──────────────────────────────────────
  const stockTotalPages = Math.ceil(stockTotal / STOCK_LIMIT) || 1;
  const stockCurrentPage = Math.floor(stockSkip / STOCK_LIMIT) + 1;
  const movimientosTotalPages = Math.ceil(movimientosTotal / MOVIMIENTOS_LIMIT) || 1;
  const movimientosCurrentPage = Math.floor(movimientosSkip / MOVIMIENTOS_LIMIT) + 1;

  // ── Action handlers ──────────────────────────────────────────
  const handleRegistrarSalidaLote = async (payload: {
    items: Array<{ material_codigo: string; cantidad: number; origen_captura: "scanner" | "manual"; estado: string }>;
    motivo?: string;
    referencia?: string;
  }) => {
    if (!almacen?.id) return;
    const resumen = await InventarioService.createMovimientoLote({
      tipo: "salida",
      almacen_id: almacen.id,
      motivo: payload.motivo,
      referencia: payload.referencia,
      items: payload.items,
    });
    toast({ title: "Salida registrada", description: `${resumen.total_materiales_distintos} materiales distintos / ${resumen.total_cantidad} total` });
    setUltimoResumenLote(resumen);
    setUltimoTipoLote("salida");
    setIsSalidaDialogOpen(false);
    if (loadedTabs.current.has("stock")) refreshStock();
    if (loadedTabs.current.has("historial")) fetchMovimientos({ skip: 0, busqueda: historialSearch, tipo: historialTipo, fechaDesde: historialFechaDesde, fechaHasta: historialFechaHasta });
  };

  const handleRegistrarEntradaLote = async (payload: {
    items: Array<{ material_codigo: string; cantidad: number; origen_captura: "scanner" | "manual"; estado: string }>;
    motivo?: string;
    referencia?: string;
  }) => {
    if (!almacen?.id) return;
    const resumen = await InventarioService.createMovimientoLote({
      tipo: "entrada",
      almacen_id: almacen.id,
      motivo: payload.motivo,
      referencia: payload.referencia,
      items: payload.items,
    });
    toast({ title: "Entrada registrada", description: `${resumen.total_materiales_distintos} materiales distintos / ${resumen.total_cantidad} total` });
    setUltimoResumenLote(resumen);
    setUltimoTipoLote("entrada");
    setIsEntradaDialogOpen(false);
    if (loadedTabs.current.has("stock")) refreshStock();
    if (loadedTabs.current.has("historial")) fetchMovimientos({ skip: 0, busqueda: historialSearch, tipo: historialTipo, fechaDesde: historialFechaDesde, fechaHasta: historialFechaHasta });
  };

  const handleAjustarStock = async (payload: { cantidad: number; motivo?: string; referencia?: string }) => {
    if (!almacen?.id || !stockToEdit) return;
    await InventarioService.createMovimiento({
      tipo: "ajuste",
      material_codigo: stockToEdit.material_codigo,
      cantidad: payload.cantidad,
      almacen_origen_id: almacen.id,
      motivo: payload.motivo,
      referencia: payload.referencia,
    });
    toast({ title: "Stock ajustado", description: `El stock de ${stockToEdit.material_codigo} fue actualizado.` });
    setIsEditarStockDialogOpen(false);
    setStockToEdit(null);
    if (loadedTabs.current.has("stock")) refreshStock();
    if (loadedTabs.current.has("historial")) fetchMovimientos({ skip: 0 });
  };

  const handleUpdateUbicacion = async (item: StockItem, ubicacion: string | null) => {
    if (!almacen?.id || !item.material_id) {
      toast({ title: "Error", description: "No se pudo actualizar la ubicación. Falta información del material.", variant: "destructive" });
      return;
    }
    await InventarioService.updateStockUbicacion({ almacen_id: almacen.id, material_id: item.material_id, ubicacion_en_almacen: ubicacion });
    toast({ title: "Ubicación actualizada", description: `La ubicación de ${item.material_codigo} fue actualizada.` });
    if (loadedTabs.current.has("stock")) refreshStock();
  };

  const handleExportStockExcel = async () => {
    if (!almacen) return;
    setExportingStock(true);
    try {
      const normalizeValue = (value: unknown): string | number => {
        if (typeof value === "number") return value;
        if (typeof value === "boolean") return value ? "Sí" : "No";
        if (value === null || value === undefined || value === "") return "-";
        return String(value);
      };
      await exportToExcel({
        title: "Suncar SRL - Stock de Almacén",
        subtitle: `${almacen.nombre} | Registros: ${stockTotal}`,
        filename: generateFilename(`stock_${String(almacen.nombre || almacen.id || "almacen").trim().replace(/\s+/g, "_").toLowerCase()}`),
        columns: [
          { header: "Almacén", key: "almacen_nombre", width: 24 },
          { header: "Código", key: "material_codigo", width: 18 },
          { header: "Nombre", key: "material_nombre", width: 32 },
          { header: "Descripción", key: "material_descripcion", width: 42 },
          { header: "Categoría", key: "categoria", width: 18 },
          { header: "Marca", key: "marca_nombre", width: 24 },
          { header: "UM", key: "um", width: 10 },
          { header: "Potencia (kW)", key: "potenciaKW", width: 16 },
          { header: "Stock", key: "stock", width: 12 },
          { header: "Ubicación", key: "ubicacion_en_almacen", width: 30 },
          { header: "Precio", key: "precio", width: 14 },
        ],
        data: stock.map((item) => {
          const codigo = String(item.material_codigo || "").trim().toLowerCase();
          const material = materialPorCodigo.get(codigo);
          const marcaId = String(material?.marca_id || "").trim();
          return {
            almacen_nombre: normalizeValue(item.almacen_nombre || almacen.nombre || item.almacen_id),
            material_codigo: normalizeValue(item.material_codigo),
            material_nombre: normalizeValue(material?.nombre),
            material_descripcion: normalizeValue(material?.descripcion || item.material_descripcion),
            categoria: normalizeValue(material?.categoria || item.categoria),
            marca_nombre: normalizeValue(marcaId ? marcaNombrePorId.get(marcaId) || marcaId : null),
            um: normalizeValue(material?.um || item.um),
            potenciaKW: material?.potenciaKW ?? "-",
            stock: item.cantidad,
            ubicacion_en_almacen: normalizeValue(item.ubicacion_en_almacen),
            precio: material?.precio ?? "-",
          };
        }),
      });
      toast({ title: "Exportación exitosa", description: "Se exportó el stock del almacén a Excel." });
    } catch (err: any) {
      toast({ title: "Error al exportar", description: err?.message || "No se pudo exportar el stock a Excel.", variant: "destructive" });
    } finally {
      setExportingStock(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────
  if (loading) return <PageLoader moduleName="Almacén" text="Cargando detalles..." />;

  if (error || !almacen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar almacén</h3>
          <p className="text-gray-600 mb-4">{error || "No se encontró el almacén solicitado."}</p>
          <Button size="icon" onClick={loadDetalle} className="h-10 w-10 bg-amber-600 hover:bg-amber-700 touch-manipulation" aria-label="Reintentar">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <RouteGuard requiredModule={`almacen:${almacenId}`}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
        <ModuleHeader
          title={`Almacén: ${almacen.nombre}`}
          subtitle={almacen.direccion || "Gestión de entradas y salidas"}
          badge={{ text: "Inventario", className: "bg-orange-100 text-orange-800" }}
          className="bg-white shadow-sm border-b border-orange-100"
          backButton={{ href: `/almacenes-suncar/${almacenId}`, label: "Volver al Almacen" }}
        />

        <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="recepciones">Recepciones</TabsTrigger>
              <TabsTrigger value="stock">Stock en almacen</TabsTrigger>
              <TabsTrigger value="historial">Historial de movimiento</TabsTrigger>
            </TabsList>

            {/* ── RECEPCIONES ─────────────────────────────────── */}
            <TabsContent value="recepciones" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recepciones</CardTitle>
                  <CardDescription>Registra entradas y salidas del almacen.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button onClick={() => setIsEntradaDialogOpen(true)}>
                    <PackagePlus className="h-4 w-4 mr-2" />
                    Registrar entrada
                  </Button>
                  <Button variant="outline" onClick={() => setIsSalidaDialogOpen(true)}>
                    <PackageMinus className="h-4 w-4 mr-2" />
                    Registrar salida por lote
                  </Button>
                  <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => setIsTransferDialogOpen(true)}>
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Solicitar Traspaso
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <SolicitudesTransferenciaTable
                    key={transferTableKey}
                    almacenes={almacenesList}
                    materiales={materiales}
                    currentAlmacenId={almacenId}
                    onResolved={() => {
                      if (loadedTabs.current.has("stock")) refreshStock();
                      if (loadedTabs.current.has("historial")) fetchMovimientos({ skip: 0 });
                    }}
                  />
                </CardContent>
              </Card>

              {ultimoResumenLote && (
                <Card>
                  <CardHeader>
                    <CardTitle>Ultimo resumen de {ultimoTipoLote === "entrada" ? "entrada" : "salida"}</CardTitle>
                    <CardDescription>Respuesta devuelta por backend para el lote procesado.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-700">
                      Materiales distintos: <span className="font-semibold">{ultimoResumenLote.total_materiales_distintos}</span>
                    </p>
                    <p className="text-sm text-gray-700">
                      Cantidad total: <span className="font-semibold">{ultimoResumenLote.total_cantidad}</span>
                    </p>
                    <div className="rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-gray-700">Material</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-700">Cantidad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ultimoResumenLote.por_material.length === 0 ? (
                            <tr className="border-t">
                              <td colSpan={2} className="px-3 py-3 text-gray-500 text-center">Sin desglose por material en la respuesta.</td>
                            </tr>
                          ) : ultimoResumenLote.por_material.map((item) => (
                            <tr key={item.material_codigo} className="border-t text-gray-700">
                              <td className="px-3 py-2">{item.material_codigo}</td>
                              <td className="px-3 py-2">{item.cantidad}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── STOCK ───────────────────────────────────────── */}
            <TabsContent value="stock" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <CardTitle>Stock del almacen</CardTitle>
                    <CardDescription>
                      Existencias actuales.{" "}
                      {stockTotal > 0 && (
                        <span>Total: {stockTotal} · Página {stockCurrentPage}/{stockTotalPages}</span>
                      )}
                    </CardDescription>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Buscar</Label>
                        <Input
                          value={stockSearchInput}
                          onChange={(e) => setStockSearchInput(e.target.value)}
                          placeholder="Ej: MAT-001, descripción o serie..."
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Categoría</Label>
                        <Select value={stockCategoriaFilter} onValueChange={setStockCategoriaFilter}>
                          <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {stockFilterOptions.categorias.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Marca</Label>
                        <Select value={stockMarcaFilter} onValueChange={setStockMarcaFilter}>
                          <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {stockFilterOptions.marcas.map((m) => (
                              <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Potencia</Label>
                        <Select value={stockPotenciaFilter} onValueChange={setStockPotenciaFilter}>
                          <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {stockFilterOptions.potencias.map((p) => (
                              <SelectItem key={p} value={p}>{p} KW</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Cantidad</Label>
                        <Select value={stockCantidadFilter} onValueChange={(v) => setStockCantidadFilter(v as "all" | "zero" | "nonzero")}>
                          <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="zero">Solo en cero</SelectItem>
                            <SelectItem value="nonzero">Excluir ceros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {(stockSearchInput || stockCategoriaFilter !== "all" || stockMarcaFilter !== "all" || stockPotenciaFilter !== "all" || stockCantidadFilter !== "all") && (
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setStockSearchInput("");
                            setStockCategoriaFilter("all");
                            setStockMarcaFilter("all");
                            setStockPotenciaFilter("all");
                            setStockCantidadFilter("all");
                          }}
                          className="text-gray-600 border-gray-300 hover:bg-gray-50"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Limpiar filtros
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportStockExcel}
                      disabled={exportingStock || stock.length === 0}
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      {exportingStock ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                      <span className="ml-2">Exportar Excel</span>
                    </Button>
                    <Button variant="outline" size="icon" onClick={refreshStock} title="Refrescar">
                      {loadingStock ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingStock && stock.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-gray-500">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Cargando stock...
                    </div>
                  ) : (
                    <StockTable
                      stock={stock}
                      detailed
                      materials={materiales}
                      marcas={marcas}
                      almacenNombreFallback={almacen.nombre}
                      onUpdateUbicacion={handleUpdateUbicacion}
                      loading={loadingStock}
                    />
                  )}
                  {stockTotal > STOCK_LIMIT && (
                    <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                      <p className="text-sm text-gray-500">
                        Página {stockCurrentPage} de {stockTotalPages} · {stockTotal} materiales
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={stockSkip === 0 || loadingStock}
                          onClick={() => fetchStock({ skip: stockSkip - STOCK_LIMIT, q: stockSearch, categoria: stockCategoriaFilter, marca_id: stockMarcaFilter, potencia_kw: stockPotenciaFilter, cantidad_filter: stockCantidadFilter })}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={stockCurrentPage >= stockTotalPages || loadingStock}
                          onClick={() => fetchStock({ skip: stockSkip + STOCK_LIMIT, q: stockSearch, categoria: stockCategoriaFilter, marca_id: stockMarcaFilter, potencia_kw: stockPotenciaFilter, cantidad_filter: stockCantidadFilter })}
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── HISTORIAL ───────────────────────────────────── */}
            <TabsContent value="historial" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 space-y-3">
                    <div>
                      <CardTitle>Historial de movimientos</CardTitle>
                      <CardDescription>
                        Entradas y salidas registradas. Total: {movimientosTotal}
                      </CardDescription>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-1 block">Buscar</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                          <Input
                            value={historialSearchInput}
                            onChange={(e) => setHistorialSearchInput(e.target.value)}
                            placeholder="Código, nombre o serie..."
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-1 block">Tipo</Label>
                        <Select value={historialTipo || "all"} onValueChange={(v) => setHistorialTipo(v === "all" ? "" : v)}>
                          <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="entrada">Entrada</SelectItem>
                            <SelectItem value="salida">Salida</SelectItem>
                            <SelectItem value="transferencia">Transferencia</SelectItem>
                            <SelectItem value="ajuste">Ajuste</SelectItem>
                            <SelectItem value="venta">Venta</SelectItem>
                            <SelectItem value="eliminacion">Eliminación</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-1 block">Desde</Label>
                        <Input type="date" value={historialFechaDesde} onChange={(e) => setHistorialFechaDesde(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-1 block">Hasta</Label>
                        <Input type="date" value={historialFechaHasta} onChange={(e) => setHistorialFechaHasta(e.target.value)} />
                      </div>
                    </div>
                    {(historialSearchInput || historialTipo || historialFechaDesde || historialFechaHasta) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setHistorialSearchInput(""); setHistorialTipo(""); setHistorialFechaDesde(""); setHistorialFechaHasta(""); }}
                        className="text-gray-600 border-gray-300 hover:bg-gray-50"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Limpiar filtros
                      </Button>
                    )}
                  </div>
                  <Button variant="outline" size="icon" onClick={() => refreshMovimientos()} title="Refrescar">
                    {loadingMovimientos ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingMovimientos && movimientos.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-gray-500">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Cargando historial...
                    </div>
                  ) : (
                    <MovimientosTable movimientos={movimientos} materials={materiales} almacenes={almacenesList} />
                  )}
                  {movimientosTotal > MOVIMIENTOS_LIMIT && (
                    <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                      <p className="text-sm text-gray-500">
                        Página {movimientosCurrentPage} de {movimientosTotalPages} · {movimientosTotal} movimientos
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={movimientosSkip === 0 || loadingMovimientos}
                          onClick={() => fetchMovimientos({ skip: movimientosSkip - MOVIMIENTOS_LIMIT, busqueda: historialSearch, tipo: historialTipo, fechaDesde: historialFechaDesde, fechaHasta: historialFechaHasta })}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={movimientosCurrentPage >= movimientosTotalPages || loadingMovimientos}
                          onClick={() => fetchMovimientos({ skip: movimientosSkip + MOVIMIENTOS_LIMIT, busqueda: historialSearch, tipo: historialTipo, fechaDesde: historialFechaDesde, fechaHasta: historialFechaHasta })}
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        {/* ── Dialogs ──────────────────────────────────────────── */}
        <Dialog open={isEntradaDialogOpen} onOpenChange={setIsEntradaDialogOpen}>
          <DialogContent className="max-w-5xl">
            <DialogHeader><DialogTitle>Registrar entrada por lote</DialogTitle></DialogHeader>
            <SalidaLoteForm
              tipo="entrada"
              almacen={almacen}
              materiales={materiales}
              stockActual={stock}
              onSubmit={handleRegistrarEntradaLote}
              onCancel={() => setIsEntradaDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isSalidaDialogOpen} onOpenChange={setIsSalidaDialogOpen}>
          <DialogContent className="max-w-5xl">
            <DialogHeader><DialogTitle>Registrar salida por lote</DialogTitle></DialogHeader>
            <SalidaLoteForm
              tipo="salida"
              almacen={almacen}
              materiales={materiales}
              onSubmit={handleRegistrarSalidaLote}
              onCancel={() => setIsSalidaDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isEditarStockDialogOpen} onOpenChange={(open) => { setIsEditarStockDialogOpen(open); if (!open) setStockToEdit(null); }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Editar stock de material</DialogTitle></DialogHeader>
            {stockToEdit && (
              <EditarStockForm
                almacen={almacen}
                item={stockToEdit}
                onSubmit={handleAjustarStock}
                onCancel={() => { setIsEditarStockDialogOpen(false); setStockToEdit(null); }}
              />
            )}
          </DialogContent>
        </Dialog>

        <SolicitudTransferenciaDialog
          open={isTransferDialogOpen}
          onOpenChange={setIsTransferDialogOpen}
          almacenes={almacenesList}
          materiales={materiales}
          stock={stock}
          currentAlmacenId={almacenId}
          onSuccess={() => { setTransferTableKey((k) => k + 1); if (loadedTabs.current.has("stock")) refreshStock(); }}
        />

        <Dialog open={isMaterialDialogOpen} onOpenChange={setIsMaterialDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Crear material</DialogTitle></DialogHeader>
            <MaterialForm
              existingCategories={categorias}
              existingUnits={unidades}
              onSubmit={async (material) => {
                const categoria = (material as any).categoria;
                const codigo = (material as any).codigo;
                const descripcion = (material as any).descripcion;
                const um = (material as any).um;
                const precio = (material as any).precio;
                const isNewCategory = (material as any).isNewCategory;
                const categoryPhoto = (material as any).categoryPhoto;
                const categoryVendible = (material as any).categoryVendible;

                let productoId: string | undefined;
                if (isNewCategory) {
                  productoId = await MaterialService.createCategoryWithPhoto({
                    categoria, foto: categoryPhoto, esVendible: categoryVendible,
                    materiales: [{ codigo: String(codigo), descripcion, um, precio: precio || 0 }],
                  });
                } else {
                  const catalogo = catalogos.find((cat) => cat.categoria === categoria);
                  productoId = catalogo?.id;
                  if (!productoId) productoId = await MaterialService.createCategory(categoria);
                  await MaterialService.addMaterialToProduct(productoId, { codigo: String(codigo), descripcion, um, precio: precio || 0 });
                }
                await refreshMateriales();
                toast({ title: "Material creado", description: "El material fue registrado correctamente." });
                setIsMaterialDialogOpen(false);
              }}
              onCancel={() => setIsMaterialDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </RouteGuard>
  );
}
