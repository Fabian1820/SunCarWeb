"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function AlmacenDetallePage() {
  const params = useParams();
  const almacenId = params.almacenId as string;
  const { toast } = useToast();

  const [almacen, setAlmacen] = useState<Almacen | null>(null);
  const [almacenesList, setAlmacenesList] = useState<Almacen[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [marcas, setMarcas] = useState<MarcaSimplificada[]>([]);
  const [catalogos, setCatalogos] = useState<BackendCatalogoProductos[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEntradaDialogOpen, setIsEntradaDialogOpen] = useState(false);
  const [isSalidaDialogOpen, setIsSalidaDialogOpen] = useState(false);
  const [isEditarStockDialogOpen, setIsEditarStockDialogOpen] = useState(false);
  const [stockToEdit, setStockToEdit] = useState<StockItem | null>(null);
  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("recepciones");
  const [stockSearch, setStockSearch] = useState("");
  const [stockCategoriaFilter, setStockCategoriaFilter] = useState("all");
  const [stockMarcaFilter, setStockMarcaFilter] = useState("all");
  const [stockPotenciaFilter, setStockPotenciaFilter] = useState("all");
  const [stockCantidadFilter, setStockCantidadFilter] = useState<"all" | "zero" | "nonzero">("all");
  const [historialSearch, setHistorialSearch] = useState("");
  const [ultimoResumenLote, setUltimoResumenLote] =
    useState<MovimientoLoteResponse | null>(null);
  const [ultimoTipoLote, setUltimoTipoLote] = useState<
    "entrada" | "salida" | null
  >(null);
  const [exportingStock, setExportingStock] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferTableKey, setTransferTableKey] = useState(0);

  const loadDetalle = async () => {
    setLoading(true);
    setError(null);
    try {
      const [almacenesData, materialesData, catalogosData, marcasData] =
        await Promise.all([
          InventarioService.getAlmacenes(),
          MaterialService.getAllMaterials(),
          MaterialService.getAllCatalogs(),
          MarcaService.getMarcasSimplificadas().catch(
            () => [] as MarcaSimplificada[],
          ),
        ]);
      const almacenEncontrado =
        almacenesData.find((item) => item.id === almacenId) || null;
      setAlmacen(almacenEncontrado);
      setAlmacenesList(almacenesData);
      setMateriales(materialesData);
      setCatalogos(catalogosData);
      setMarcas(marcasData);

      if (almacenEncontrado?.id) {
        const [stockData, movimientosData] = await Promise.all([
          InventarioService.getStock({ almacen_id: almacenEncontrado.id }),
          InventarioService.getMovimientos({
            almacen_id: almacenEncontrado.id,
          }),
        ]);
        setStock(
          stockData.map((item) => ({
            ...item,
            almacen_nombre:
              item.almacen_nombre ||
              almacenEncontrado.nombre ||
              item.almacen_id,
          })),
        );
        setMovimientos(movimientosData);
      }
    } catch (err) {
      console.error("Error loading almacen detalle:", err);
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el almacén",
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshStock = async () => {
    if (!almacen?.id) return;
    setLoadingStock(true);
    try {
      const stockData = await InventarioService.getStock({
        almacen_id: almacen.id,
      });
      setStock(
        stockData.map((item) => ({
          ...item,
          almacen_nombre:
            item.almacen_nombre || almacen.nombre || item.almacen_id,
        })),
      );
    } finally {
      setLoadingStock(false);
    }
  };

  const refreshMovimientos = async () => {
    if (!almacen?.id) return;
    setLoadingMovimientos(true);
    try {
      const movimientosData = await InventarioService.getMovimientos({
        almacen_id: almacen.id,
      });
      setMovimientos(movimientosData);
    } finally {
      setLoadingMovimientos(false);
    }
  };

  const refreshMateriales = async () => {
    const [materialesData, catalogosData] = await Promise.all([
      MaterialService.getAllMaterials(),
      MaterialService.getAllCatalogs(),
    ]);
    setMateriales(materialesData);
    setCatalogos(catalogosData);
  };

  useEffect(() => {
    setUltimoResumenLote(null);
    setUltimoTipoLote(null);
    loadDetalle();
  }, [almacenId]);

  const categorias = useMemo(() => {
    return Array.from(new Set(catalogos.map((cat) => cat.categoria))).sort();
  }, [catalogos]);

  const unidades = useMemo(() => {
    return Array.from(
      new Set(materiales.map((material) => material.um)),
    ).sort();
  }, [materiales]);

  const materialPorCodigo = useMemo(() => {
    const map = new Map<string, Material>();
    for (const material of materiales) {
      map.set(String(material.codigo).trim().toLowerCase(), material);
    }
    return map;
  }, [materiales]);

  const marcaNombrePorId = useMemo(() => {
    const map = new Map<string, string>();
    for (const marca of marcas) {
      map.set(marca.id, marca.nombre);
    }
    return map;
  }, [marcas]);

  const stockFilterOptions = useMemo(() => {
    const categoriasSet = new Set<string>();
    const potenciaSet = new Set<string>();
    const marcasMap = new Map<string, string>();

    for (const item of stock) {
      const codigo = String(item.material_codigo || "")
        .trim()
        .toLowerCase();
      const material = materialPorCodigo.get(codigo);

      const categoria = String(
        material?.categoria || item.categoria || "",
      ).trim();
      if (categoria) categoriasSet.add(categoria);

      const potencia = material?.potenciaKW;
      if (potencia !== undefined && potencia !== null && `${potencia}` !== "") {
        potenciaSet.add(String(potencia));
      }

      const marcaId = String(material?.marca_id || "").trim();
      if (marcaId) {
        marcasMap.set(marcaId, marcaNombrePorId.get(marcaId) || marcaId);
      }
    }

    const categorias = Array.from(categoriasSet).sort((a, b) =>
      a.localeCompare(b),
    );
    const potencias = Array.from(potenciaSet).sort(
      (a, b) => Number(a) - Number(b),
    );
    const marcas = Array.from(marcasMap.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    return { categorias, marcas, potencias };
  }, [stock, materialPorCodigo, marcaNombrePorId]);

  const filteredStock = useMemo(() => {
    const search = stockSearch.trim().toLowerCase();
    return stock.filter((item) => {
      const codigo = String(item.material_codigo || "")
        .trim()
        .toLowerCase();
      const material = materialPorCodigo.get(codigo);
      const nombre = String(
        material?.nombre ||
          material?.descripcion ||
          item.material_descripcion ||
          "",
      ).toLowerCase();
      const numeroSerie = String(material?.numero_serie ?? "").toLowerCase();

      const categoria = String(
        material?.categoria || item.categoria || "",
      ).trim();
      const marcaId = String(material?.marca_id || "").trim();
      const potencia = material?.potenciaKW;

      const matchSearch =
        !search ||
        codigo.includes(search) ||
        nombre.includes(search) ||
        numeroSerie.includes(search);
      const matchCategoria =
        stockCategoriaFilter === "all" || categoria === stockCategoriaFilter;
      const matchMarca =
        stockMarcaFilter === "all" || marcaId === stockMarcaFilter;
      const matchPotencia =
        stockPotenciaFilter === "all" ||
        String(potencia ?? "") === stockPotenciaFilter;
      const matchCantidad =
        stockCantidadFilter === "all" ||
        (stockCantidadFilter === "zero" && item.cantidad === 0) ||
        (stockCantidadFilter === "nonzero" && item.cantidad !== 0);

      return matchSearch && matchCategoria && matchMarca && matchPotencia && matchCantidad;
    });
  }, [
    stock,
    stockSearch,
    materialPorCodigo,
    stockCategoriaFilter,
    stockMarcaFilter,
    stockPotenciaFilter,
    stockCantidadFilter,
  ]);

  const filteredMovimientos = useMemo(() => {
    const search = historialSearch.trim().toLowerCase();
    if (!search) return movimientos;
    return movimientos.filter((mov) => {
      const codigo = String(mov.material_codigo || "").toLowerCase();
      const nombre = String(mov.material_descripcion || "").toLowerCase();
      return codigo.includes(search) || nombre.includes(search);
    });
  }, [movimientos, historialSearch]);

  const handleRegistrarSalidaLote = async (payload: {
    items: Array<{
      material_codigo: string;
      cantidad: number;
      origen_captura: "scanner" | "manual";
      estado: string;
    }>;
    motivo?: string;
    referencia?: string;
  }) => {
    if (!almacen.id) return;

    const resumen = await InventarioService.createMovimientoLote({
      tipo: "salida",
      almacen_id: almacen.id,
      motivo: payload.motivo,
      referencia: payload.referencia,
      items: payload.items,
    });

    toast({
      title: "Salida registrada",
      description: `${resumen.total_materiales_distintos} materiales distintos / ${resumen.total_cantidad} total`,
    });
    setUltimoResumenLote(resumen);
    setUltimoTipoLote("salida");
    setIsSalidaDialogOpen(false);
    await Promise.all([refreshStock(), refreshMovimientos()]);
  };

  const handleRegistrarEntradaLote = async (payload: {
    items: Array<{
      material_codigo: string;
      cantidad: number;
      origen_captura: "scanner" | "manual";
      estado: string;
    }>;
    motivo?: string;
    referencia?: string;
  }) => {
    if (!almacen.id) return;

    const resumen = await InventarioService.createMovimientoLote({
      tipo: "entrada",
      almacen_id: almacen.id,
      motivo: payload.motivo,
      referencia: payload.referencia,
      items: payload.items,
    });

    toast({
      title: "Entrada registrada",
      description: `${resumen.total_materiales_distintos} materiales distintos / ${resumen.total_cantidad} total`,
    });
    setUltimoResumenLote(resumen);
    setUltimoTipoLote("entrada");
    setIsEntradaDialogOpen(false);
    await Promise.all([refreshStock(), refreshMovimientos()]);
  };

  const handleAjustarStock = async (payload: {
    cantidad: number;
    motivo?: string;
    referencia?: string;
  }) => {
    if (!almacen.id || !stockToEdit) return;

    await InventarioService.createMovimiento({
      tipo: "ajuste",
      material_codigo: stockToEdit.material_codigo,
      cantidad: payload.cantidad,
      almacen_origen_id: almacen.id,
      motivo: payload.motivo,
      referencia: payload.referencia,
    });

    toast({
      title: "Stock ajustado",
      description: `El stock de ${stockToEdit.material_codigo} fue actualizado.`,
    });
    setIsEditarStockDialogOpen(false);
    setStockToEdit(null);
    await Promise.all([refreshStock(), refreshMovimientos()]);
  };

  const handleUpdateUbicacion = async (
    item: StockItem,
    ubicacion: string | null,
  ) => {
    if (!almacen.id || !item.material_id) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la ubicación. Falta información del material.",
        variant: "destructive",
      });
      return;
    }

    await InventarioService.updateStockUbicacion({
      almacen_id: almacen.id,
      material_id: item.material_id,
      ubicacion_en_almacen: ubicacion,
    });

    toast({
      title: "Ubicación actualizada",
      description: `La ubicación de ${item.material_codigo} fue actualizada.`,
    });
    await refreshStock();
  };

  const handleExportStockExcel = async () => {
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
        subtitle: `${almacen.nombre} | Registros: ${stock.length}`,
        filename: generateFilename(
          `stock_${String(almacen.nombre || almacen.id || "almacen")
            .trim()
            .replace(/\s+/g, "_")
            .toLowerCase()}`,
        ),
        columns: [
          { header: "Almacén", key: "almacen_nombre", width: 24 },
          { header: "Código", key: "material_codigo", width: 18 },
          { header: "Nombre", key: "material_nombre", width: 32 },
          { header: "Descripción", key: "material_descripcion", width: 42 },
          { header: "Categoría", key: "categoria", width: 18 },
          { header: "Marca ID", key: "marca_id", width: 20 },
          { header: "Marca", key: "marca_nombre", width: 24 },
          { header: "UM", key: "um", width: 10 },
          { header: "Potencia (kW)", key: "potenciaKW", width: 16 },
          { header: "Stock", key: "stock", width: 12 },
          { header: "Ubicación", key: "ubicacion_en_almacen", width: 30 },
          { header: "Precio", key: "precio", width: 14 },
          { header: "Venta Web", key: "habilitar_venta_web", width: 14 },
        ],
        data: stock.map((item) => {
          const codigo = String(item.material_codigo || "")
            .trim()
            .toLowerCase();
          const material = materialPorCodigo.get(codigo);
          const marcaId = String(material?.marca_id || "").trim();

          return {
            almacen_nombre: normalizeValue(
              item.almacen_nombre || almacen.nombre || item.almacen_id,
            ),
            material_codigo: normalizeValue(item.material_codigo),
            material_nombre: normalizeValue(material?.nombre),
            material_descripcion: normalizeValue(
              material?.descripcion || item.material_descripcion,
            ),
            categoria: normalizeValue(material?.categoria || item.categoria),
            marca_id: normalizeValue(marcaId),
            marca_nombre: normalizeValue(
              marcaId ? marcaNombrePorId.get(marcaId) || marcaId : null,
            ),
            um: normalizeValue(material?.um || item.um),
            potenciaKW: material?.potenciaKW ?? "-",
            stock: item.cantidad,
            ubicacion_en_almacen: normalizeValue(item.ubicacion_en_almacen),
            precio: material?.precio ?? "-",
            habilitar_venta_web: normalizeValue(material?.habilitar_venta_web),
          };
        }),
      });

      toast({
        title: "Exportación exitosa",
        description: "Se exportó el stock del almacén a Excel.",
      });
    } catch (err: any) {
      toast({
        title: "Error al exportar",
        description: err?.message || "No se pudo exportar el stock a Excel.",
        variant: "destructive",
      });
    } finally {
      setExportingStock(false);
    }
  };

  if (loading) {
    return <PageLoader moduleName="Almacén" text="Cargando detalles..." />;
  }

  if (error || !almacen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Error al cargar almacén
          </h3>
          <p className="text-gray-600 mb-4">
            {error || "No se encontró el almacén solicitado."}
          </p>
          <Button
            size="icon"
            onClick={loadDetalle}
            className="h-10 w-10 bg-amber-600 hover:bg-amber-700 touch-manipulation"
            aria-label="Reintentar"
            title="Reintentar"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">Reintentar</span>
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
          badge={{
            text: "Inventario",
            className: "bg-orange-100 text-orange-800",
          }}
          className="bg-white shadow-sm border-b border-orange-100"
          backButton={{
            href: `/almacenes-suncar/${almacenId}`,
            label: "Volver al Almacen",
          }}
        />

        <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="recepciones">Recepciones</TabsTrigger>
              <TabsTrigger value="stock">Stock en almacen</TabsTrigger>
              <TabsTrigger value="historial">
                Historial de movimiento
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recepciones" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recepciones</CardTitle>
                  <CardDescription>
                    Registra entradas y salidas del almacen.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button onClick={() => setIsEntradaDialogOpen(true)}>
                    <PackagePlus className="h-4 w-4 mr-2" />
                    Registrar entrada
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsSalidaDialogOpen(true)}
                  >
                    <PackageMinus className="h-4 w-4 mr-2" />
                    Registrar salida por lote
                  </Button>
                  <Button
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => setIsTransferDialogOpen(true)}
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Solicitar Traspaso
                  </Button>
                </CardContent>
              </Card>

              {/* Solicitudes de Traspaso */}
              <Card>
                <CardContent className="pt-6">
                  <SolicitudesTransferenciaTable
                    key={transferTableKey}
                    almacenes={almacenesList}
                    materiales={materiales}
                    currentAlmacenId={almacenId}
                    onResolved={() => {
                      refreshStock();
                      refreshMovimientos();
                    }}
                  />
                </CardContent>
              </Card>

              {ultimoResumenLote ? (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Ultimo resumen de{" "}
                      {ultimoTipoLote === "entrada" ? "entrada" : "salida"}
                    </CardTitle>
                    <CardDescription>
                      Respuesta devuelta por backend para el lote procesado.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-700">
                      Materiales distintos:{" "}
                      <span className="font-semibold">
                        {ultimoResumenLote.total_materiales_distintos}
                      </span>
                    </p>
                    <p className="text-sm text-gray-700">
                      Cantidad total:{" "}
                      <span className="font-semibold">
                        {ultimoResumenLote.total_cantidad}
                      </span>
                    </p>
                    <div className="rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-gray-700">
                              Material
                            </th>
                            <th className="text-left px-3 py-2 font-medium text-gray-700">
                              Cantidad
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {ultimoResumenLote.por_material.map((item) => (
                            <tr
                              key={item.material_codigo}
                              className="border-t text-gray-700"
                            >
                              <td className="px-3 py-2">
                                {item.material_codigo}
                              </td>
                              <td className="px-3 py-2">{item.cantidad}</td>
                            </tr>
                          ))}
                          {ultimoResumenLote.por_material.length === 0 ? (
                            <tr className="border-t">
                              <td
                                colSpan={2}
                                className="px-3 py-3 text-gray-500 text-center"
                              >
                                Sin desglose por material en la respuesta.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>

            <TabsContent value="stock" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Stock del almacen</CardTitle>
                    <CardDescription>Existencias actuales.</CardDescription>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Buscar por código, nombre o N° serie
                        </Label>
                        <Input
                          value={stockSearch}
                          onChange={(event) =>
                            setStockSearch(event.target.value)
                          }
                          placeholder="Ej: MAT-001, descripción o serie..."
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Categoría
                        </Label>
                        <Select
                          value={stockCategoriaFilter}
                          onValueChange={setStockCategoriaFilter}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {stockFilterOptions.categorias.map((categoria) => (
                              <SelectItem key={categoria} value={categoria}>
                                {categoria}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Marca
                        </Label>
                        <Select
                          value={stockMarcaFilter}
                          onValueChange={setStockMarcaFilter}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {stockFilterOptions.marcas.map((marca) => (
                              <SelectItem key={marca.id} value={marca.id}>
                                {marca.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Potencia
                        </Label>
                        <Select
                          value={stockPotenciaFilter}
                          onValueChange={setStockPotenciaFilter}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {stockFilterOptions.potencias.map((potencia) => (
                              <SelectItem key={potencia} value={potencia}>
                                {potencia} KW
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Cantidad
                        </Label>
                        <Select
                          value={stockCantidadFilter}
                          onValueChange={(v) => setStockCantidadFilter(v as "all" | "zero" | "nonzero")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="zero">Solo en cero</SelectItem>
                            <SelectItem value="nonzero">Excluir ceros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {(stockSearch || stockCategoriaFilter !== "all" || stockMarcaFilter !== "all" || stockPotenciaFilter !== "all" || stockCantidadFilter !== "all") && (
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setStockSearch("");
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
                      {exportingStock ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4" />
                      )}
                      <span className="ml-2">Exportar Excel</span>
                    </Button>
                    <Button variant="outline" size="icon" onClick={refreshStock} title="Refrescar">
                      {loadingStock ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <StockTable
                    stock={filteredStock}
                    detailed
                    materials={materiales}
                    marcas={marcas}
                    almacenNombreFallback={almacen.nombre}
                    onUpdateUbicacion={handleUpdateUbicacion}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="historial" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <CardTitle>Historial de movimientos</CardTitle>
                    <CardDescription>
                      Entradas y salidas registradas.
                    </CardDescription>
                    <div className="mt-3 max-w-sm">
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Buscar por código o nombre
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                          value={historialSearch}
                          onChange={(e) => setHistorialSearch(e.target.value)}
                          placeholder="Ej: MAT-001 o descripción..."
                          className="pl-9"
                        />
                      </div>
                      {historialSearch && (
                        <p className="text-xs text-gray-500 mt-1">
                          {filteredMovimientos.length} de {movimientos.length}{" "}
                          movimientos
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={refreshMovimientos}
                    title="Refrescar"
                  >
                    {loadingMovimientos ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </CardHeader>
                <CardContent>
                  <MovimientosTable
                    movimientos={filteredMovimientos}
                    materials={materiales}
                    almacenes={almacenesList}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        <Dialog
          open={isEntradaDialogOpen}
          onOpenChange={setIsEntradaDialogOpen}
        >
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Registrar entrada por lote</DialogTitle>
            </DialogHeader>
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
            <DialogHeader>
              <DialogTitle>Registrar salida por lote</DialogTitle>
            </DialogHeader>
            <SalidaLoteForm
              tipo="salida"
              almacen={almacen}
              materiales={materiales}
              onSubmit={handleRegistrarSalidaLote}
              onCancel={() => setIsSalidaDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog
          open={isEditarStockDialogOpen}
          onOpenChange={(open) => {
            setIsEditarStockDialogOpen(open);
            if (!open) setStockToEdit(null);
          }}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Editar stock de material</DialogTitle>
            </DialogHeader>
            {stockToEdit ? (
              <EditarStockForm
                almacen={almacen}
                item={stockToEdit}
                onSubmit={handleAjustarStock}
                onCancel={() => {
                  setIsEditarStockDialogOpen(false);
                  setStockToEdit(null);
                }}
              />
            ) : null}
          </DialogContent>
        </Dialog>

        <SolicitudTransferenciaDialog
          open={isTransferDialogOpen}
          onOpenChange={setIsTransferDialogOpen}
          almacenes={almacenesList}
          materiales={materiales}
          stock={stock}
          currentAlmacenId={almacenId}
          onSuccess={() => {
            setTransferTableKey((k) => k + 1);
            refreshStock();
          }}
        />

        <Dialog
          open={isMaterialDialogOpen}
          onOpenChange={setIsMaterialDialogOpen}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear material</DialogTitle>
            </DialogHeader>
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
                    categoria,
                    foto: categoryPhoto,
                    esVendible: categoryVendible,
                    materiales: [
                      {
                        codigo: String(codigo),
                        descripcion,
                        um,
                        precio: precio || 0,
                      },
                    ],
                  });
                } else {
                  const catalogo = catalogos.find(
                    (cat) => cat.categoria === categoria,
                  );
                  productoId = catalogo?.id;
                  if (!productoId) {
                    const nuevoId =
                      await MaterialService.createCategory(categoria);
                    productoId = nuevoId;
                  }
                  await MaterialService.addMaterialToProduct(productoId, {
                    codigo: String(codigo),
                    descripcion,
                    um,
                    precio: precio || 0,
                  });
                }

                await refreshMateriales();
                toast({
                  title: "Material creado",
                  description: "El material fue registrado correctamente.",
                });
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
