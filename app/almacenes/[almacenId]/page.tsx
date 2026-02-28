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

export default function AlmacenDetallePage() {
  const params = useParams();
  const almacenId = params.almacenId as string;
  const { toast } = useToast();

  const [almacen, setAlmacen] = useState<Almacen | null>(null);
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

      const categoria = String(
        material?.categoria || item.categoria || "",
      ).trim();
      const marcaId = String(material?.marca_id || "").trim();
      const potencia = material?.potenciaKW;

      const matchSearch =
        !search || codigo.includes(search) || nombre.includes(search);
      const matchCategoria =
        stockCategoriaFilter === "all" || categoria === stockCategoriaFilter;
      const matchMarca =
        stockMarcaFilter === "all" || marcaId === stockMarcaFilter;
      const matchPotencia =
        stockPotenciaFilter === "all" ||
        String(potencia ?? "") === stockPotenciaFilter;

      return matchSearch && matchCategoria && matchMarca && matchPotencia;
    });
  }, [
    stock,
    stockSearch,
    materialPorCodigo,
    stockCategoriaFilter,
    stockMarcaFilter,
    stockPotenciaFilter,
  ]);

  const handleRegistrarSalidaLote = async (payload: {
    items: Array<{ material_codigo: string; cantidad: number }>;
    motivo?: string;
    referencia?: string;
  }) => {
    if (!almacen.id) return;

    for (const item of payload.items) {
      await InventarioService.createMovimiento({
        tipo: "salida",
        material_codigo: item.material_codigo,
        cantidad: item.cantidad,
        almacen_origen_id: almacen.id,
        motivo: payload.motivo,
        referencia: payload.referencia,
      });
    }

    toast({
      title: "Salida registrada",
      description: `Se registraron ${payload.items.length} materiales en la salida.`,
    });
    setIsSalidaDialogOpen(false);
    await Promise.all([refreshStock(), refreshMovimientos()]);
  };

  const handleRegistrarEntradaLote = async (payload: {
    items: Array<{ material_codigo: string; cantidad: number }>;
    motivo?: string;
    referencia?: string;
  }) => {
    if (!almacen.id) return;

    for (const item of payload.items) {
      await InventarioService.createMovimiento({
        tipo: "entrada",
        material_codigo: item.material_codigo,
        cantidad: item.cantidad,
        almacen_origen_id: almacen.id,
        motivo: payload.motivo,
        referencia: payload.referencia,
      });
    }

    toast({
      title: "Entrada registrada",
      description: `Se registraron ${payload.items.length} materiales en la entrada.`,
    });
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
            href: "/almacenes-suncar",
            label: "Volver a Almacenes",
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stock" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Stock del almacen</CardTitle>
                    <CardDescription>Existencias actuales.</CardDescription>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Buscar por código o nombre
                        </Label>
                        <Input
                          value={stockSearch}
                          onChange={(event) =>
                            setStockSearch(event.target.value)
                          }
                          placeholder="Ej: MAT-001 o descripción"
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
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={refreshStock}>
                    {loadingStock ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="ml-2">Refrescar</span>
                  </Button>
                </CardHeader>
                <CardContent>
                  <StockTable
                    stock={filteredStock}
                    detailed
                    materials={materiales}
                    marcas={marcas}
                    almacenNombreFallback={almacen.nombre}
                    onEditStock={(item) => {
                      setStockToEdit(item);
                      setIsEditarStockDialogOpen(true);
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="historial" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Historial de movimientos</CardTitle>
                    <CardDescription>
                      Entradas y salidas registradas.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshMovimientos}
                  >
                    {loadingMovimientos ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="ml-2">Refrescar</span>
                  </Button>
                </CardHeader>
                <CardContent>
                  <MovimientosTable movimientos={movimientos} />
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
