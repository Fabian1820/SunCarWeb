"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, ConfirmDeleteDialog } from "@/components/shared/molecule/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shared/molecule/tabs"
import { AlertCircle, Loader2, Package, Plus, RefreshCw, ShoppingBag } from "lucide-react"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { useInventario } from "@/hooks/use-inventario"
import { MarcaService } from "@/lib/api-services"
import type { Almacen, Tienda } from "@/lib/inventario-types"
import type { MarcaSimplificada } from "@/lib/types/feats/marcas/marca-types"
import { AlmacenesTable } from "@/components/feats/inventario/almacenes-table"
import { AlmacenForm } from "@/components/feats/inventario/almacen-form"
import { TiendasTable } from "@/components/feats/inventario/tiendas-table"
import { TiendaForm } from "@/components/feats/inventario/tienda-form"
import { StockTable } from "@/components/feats/inventario/stock-table"
import { InventarioCruzadoTable } from "@/components/feats/inventario/inventario-cruzado-table"
import { MovimientosTable } from "@/components/feats/inventario/movimientos-table"
import { MovimientoForm } from "@/components/feats/inventario/movimiento-form"

export default function InventarioPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    almacenes,
    tiendas,
    stock,
    movimientos,
    materiales,
    loading,
    loadingStock,
    loadingMovimientos,
    error,
    refetchAll,
    refetchStock,
    refetchMovimientos,
    createAlmacen,
    updateAlmacen,
    deleteAlmacen,
    createTienda,
    updateTienda,
    deleteTienda,
    createMovimiento,
  } = useInventario()
  const { toast } = useToast()

  const allowedTabs = ["stock", "movimientos", "almacenes", "tiendas"]
  const initialTab = allowedTabs.includes(searchParams.get("tab") || "")
    ? (searchParams.get("tab") as string)
    : "stock"

  const [activeTab, setActiveTab] = useState(initialTab)
  const [stockAlmacenFilter, setStockAlmacenFilter] = useState("all")
  const [stockSearch, setStockSearch] = useState("")
  const [stockCategoriaFilter, setStockCategoriaFilter] = useState("all")
  const [stockMarcaFilter, setStockMarcaFilter] = useState("all")
  const [stockPotenciaFilter, setStockPotenciaFilter] = useState("all")
  const [marcas, setMarcas] = useState<MarcaSimplificada[]>([])

  const [movTipoFilter, setMovTipoFilter] = useState("all")
  const [movSearch, setMovSearch] = useState("")

  const [isAlmacenDialogOpen, setIsAlmacenDialogOpen] = useState(false)
  const [isTiendaDialogOpen, setIsTiendaDialogOpen] = useState(false)
  const [isMovimientoDialogOpen, setIsMovimientoDialogOpen] = useState(false)
  const [defaultMovimientoTipo, setDefaultMovimientoTipo] = useState<
    "entrada" | "salida" | "transferencia" | "ajuste" | "venta"
  >("entrada")

  const [editingAlmacen, setEditingAlmacen] = useState<Almacen | null>(null)
  const [editingTienda, setEditingTienda] = useState<Tienda | null>(null)
  const [almacenToDelete, setAlmacenToDelete] = useState<Almacen | null>(null)
  const [tiendaToDelete, setTiendaToDelete] = useState<Tienda | null>(null)
  const [isDeleteAlmacenOpen, setIsDeleteAlmacenOpen] = useState(false)
  const [isDeleteTiendaOpen, setIsDeleteTiendaOpen] = useState(false)

  // Load marcas once for detailed stock view
  useEffect(() => {
    MarcaService.getMarcasSimplificadas().then(setMarcas).catch(() => {})
  }, [])

  // Sync tab from URL params
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab && allowedTabs.includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Auto-refetch stock when almacen filter changes (skip initial mount, handled by the hook)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    // Reset detail filters when switching almacen
    setStockSearch("")
    setStockCategoriaFilter("all")
    setStockMarcaFilter("all")
    setStockPotenciaFilter("all")
    refetchStock(stockAlmacenFilter === "all" ? undefined : stockAlmacenFilter)
  }, [stockAlmacenFilter])

  // Build marcas map for detailed view
  const marcaNombrePorId = useMemo(() => {
    const map = new Map<string, string>()
    for (const marca of marcas) {
      map.set(marca.id, marca.nombre)
    }
    return map
  }, [marcas])

  const materialPorCodigo = useMemo(() => {
    const map = new Map<string, typeof materiales[number]>()
    for (const material of materiales) {
      map.set(String(material.codigo).trim().toLowerCase(), material)
    }
    return map
  }, [materiales])

  // Filter options derived from current stock + materials (for specific almacen view)
  const stockFilterOptions = useMemo(() => {
    const categoriasSet = new Set<string>()
    const potenciaSet = new Set<string>()
    const marcasMap = new Map<string, string>()

    for (const item of stock) {
      const codigo = String(item.material_codigo || "").trim().toLowerCase()
      const material = materialPorCodigo.get(codigo)

      const categoria = String(material?.categoria || (item as any).categoria || "").trim()
      if (categoria) categoriasSet.add(categoria)

      const potencia = material?.potenciaKW
      if (potencia !== undefined && potencia !== null && `${potencia}` !== "") {
        potenciaSet.add(String(potencia))
      }

      const marcaId = String(material?.marca_id || "").trim()
      if (marcaId) {
        marcasMap.set(marcaId, marcaNombrePorId.get(marcaId) || marcaId)
      }
    }

    return {
      categorias: Array.from(categoriasSet).sort((a, b) => a.localeCompare(b)),
      potencias: Array.from(potenciaSet).sort((a, b) => Number(a) - Number(b)),
      marcas: Array.from(marcasMap.entries())
        .map(([id, nombre]) => ({ id, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    }
  }, [stock, materialPorCodigo, marcaNombrePorId])

  // Filtered stock for the detailed almacen view
  const filteredStockDetallado = useMemo(() => {
    const search = stockSearch.trim().toLowerCase()
    return stock.filter(item => {
      const codigo = String(item.material_codigo || "").trim().toLowerCase()
      const material = materialPorCodigo.get(codigo)
      const nombre = String(
        material?.nombre || material?.descripcion || item.material_descripcion || ""
      ).toLowerCase()

      const categoria = String(material?.categoria || (item as any).categoria || "").trim()
      const marcaId = String(material?.marca_id || "").trim()
      const potencia = material?.potenciaKW

      const matchSearch = !search || codigo.includes(search) || nombre.includes(search)
      const matchCategoria = stockCategoriaFilter === "all" || categoria === stockCategoriaFilter
      const matchMarca = stockMarcaFilter === "all" || marcaId === stockMarcaFilter
      const matchPotencia = stockPotenciaFilter === "all" || String(potencia ?? "") === stockPotenciaFilter

      return matchSearch && matchCategoria && matchMarca && matchPotencia
    })
  }, [stock, stockSearch, materialPorCodigo, stockCategoriaFilter, stockMarcaFilter, stockPotenciaFilter])

  const filteredMovimientos = useMemo(() => {
    return movimientos.filter(mov => {
      const matchTipo = movTipoFilter === "all" || mov.tipo === movTipoFilter
      const search = movSearch.trim().toLowerCase()
      if (!search) return matchTipo
      const matchSearch =
        String(mov.material_codigo).toLowerCase().includes(search) ||
        (mov.material_descripcion || "").toLowerCase().includes(search) ||
        String(mov.referencia || "").toLowerCase().includes(search)
      return matchTipo && matchSearch
    })
  }, [movimientos, movTipoFilter, movSearch])

  const handleCreateAlmacen = async (data: any) => {
    await createAlmacen(data)
    setIsAlmacenDialogOpen(false)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("refreshDynamicModules"))
    }
    toast({ title: "Almacen creado", description: "El almacen fue registrado correctamente." })
  }

  const handleUpdateAlmacen = async (data: any) => {
    if (!editingAlmacen?.id) return
    await updateAlmacen(editingAlmacen.id, data)
    setEditingAlmacen(null)
    setIsAlmacenDialogOpen(false)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("refreshDynamicModules"))
    }
    toast({ title: "Almacen actualizado", description: "Los cambios se guardaron correctamente." })
  }

  const handleDeleteAlmacen = async () => {
    if (!almacenToDelete?.id) return
    await deleteAlmacen(almacenToDelete.id)
    setAlmacenToDelete(null)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("refreshDynamicModules"))
    }
    toast({ title: "Almacen eliminado", description: "El almacen fue eliminado correctamente." })
  }

  const handleCreateTienda = async (data: any) => {
    await createTienda(data)
    setIsTiendaDialogOpen(false)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("refreshDynamicModules"))
    }
    toast({ title: "Tienda creada", description: "La tienda fue registrada correctamente." })
  }

  const handleUpdateTienda = async (data: any) => {
    if (!editingTienda?.id) return
    await updateTienda(editingTienda.id, data)
    setEditingTienda(null)
    setIsTiendaDialogOpen(false)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("refreshDynamicModules"))
    }
    toast({ title: "Tienda actualizada", description: "Los cambios se guardaron correctamente." })
  }

  const handleDeleteTienda = async () => {
    if (!tiendaToDelete?.id) return
    await deleteTienda(tiendaToDelete.id)
    setTiendaToDelete(null)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("refreshDynamicModules"))
    }
    toast({ title: "Tienda eliminada", description: "La tienda fue eliminada correctamente." })
  }

  const handleCreateMovimiento = async (data: any) => {
    await createMovimiento(data)
    setIsMovimientoDialogOpen(false)
    toast({ title: "Movimiento registrado", description: "El movimiento fue guardado correctamente." })
  }

  if (loading) {
    return <PageLoader moduleName="Inventario" text="Cargando inventario..." />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar inventario</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button
            size="icon"
            onClick={refetchAll}
            className="h-10 w-10 bg-amber-600 hover:bg-amber-700 touch-manipulation"
            aria-label="Reintentar"
            title="Reintentar"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">Reintentar</span>
          </Button>
        </div>
      </div>
    )
  }

  const isSpecificAlmacen = stockAlmacenFilter !== "all"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      <ModuleHeader
        title="Inventario y Tiendas"
        subtitle="Controla almacenes, tiendas, stock y movimientos"
        badge={{ text: "Operaciones", className: "bg-orange-100 text-orange-800" }}
        className="bg-white shadow-sm border-b border-orange-100"
        backButton={
          activeTab === "tiendas"
            ? { href: "/tiendas-suncarventas", label: "Volver a Tiendas" }
            : activeTab === "almacenes"
            ? { href: "/almacenes-suncar", label: "Volver a Almacenes" }
            : undefined
        }
        actions={
          <Button
            variant="outline"
            onClick={refetchAll}
            className="border-orange-200 text-orange-700 hover:bg-orange-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        }
      />

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
            <TabsTrigger value="almacenes">Almacenes</TabsTrigger>
            <TabsTrigger value="tiendas">Tiendas</TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="space-y-6">
            <Card>
              <CardHeader className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>
                      {isSpecificAlmacen
                        ? `Stock: ${almacenes.find(a => a.id === stockAlmacenFilter)?.nombre || stockAlmacenFilter}`
                        : "Stock por almacén"}
                    </CardTitle>
                    <CardDescription>
                      {isSpecificAlmacen
                        ? "Existencias actuales en el almacén seleccionado."
                        : "Vista consolidada de existencias en todos los almacenes."}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => refetchStock(stockAlmacenFilter === "all" ? undefined : stockAlmacenFilter)}
                  >
                    {loadingStock ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-2">Refrescar</span>
                  </Button>
                </div>

                {/* Almacen filter always visible */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Almacén</Label>
                    <Select value={stockAlmacenFilter} onValueChange={setStockAlmacenFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los almacenes</SelectItem>
                        {almacenes.map(almacen => (
                          <SelectItem key={almacen.id || almacen.nombre} value={almacen.id || almacen.nombre}>
                            {almacen.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Search always visible */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Buscar material</Label>
                    <Input
                      value={stockSearch}
                      onChange={(e) => setStockSearch(e.target.value)}
                      placeholder="Código o descripción"
                    />
                  </div>

                  {/* Extra filters only for specific almacen */}
                  {isSpecificAlmacen && (
                    <>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Categoría</Label>
                        <Select value={stockCategoriaFilter} onValueChange={setStockCategoriaFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {stockFilterOptions.categorias.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Marca</Label>
                        <Select value={stockMarcaFilter} onValueChange={setStockMarcaFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {stockFilterOptions.marcas.map(marca => (
                              <SelectItem key={marca.id} value={marca.id}>{marca.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Potencia</Label>
                        <Select value={stockPotenciaFilter} onValueChange={setStockPotenciaFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {stockFilterOptions.potencias.map(p => (
                              <SelectItem key={p} value={p}>{p} KW</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {loadingStock ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                    <span className="ml-3 text-gray-600">Cargando stock...</span>
                  </div>
                ) : isSpecificAlmacen ? (
                  <StockTable
                    stock={filteredStockDetallado}
                    detailed
                    materials={materiales}
                    marcas={marcas}
                    almacenNombreFallback={almacenes.find(a => a.id === stockAlmacenFilter)?.nombre}
                  />
                ) : (
                  <InventarioCruzadoTable
                    stock={stock}
                    almacenes={almacenes}
                    search={stockSearch}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movimientos" className="space-y-6">
            <Card>
              <CardHeader className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Movimientos de inventario</CardTitle>
                    <CardDescription>Registra entradas, salidas, transferencias y ventas.</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => {
                        setDefaultMovimientoTipo("entrada")
                        setIsMovimientoDialogOpen(true)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo movimiento
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDefaultMovimientoTipo("venta")
                        setIsMovimientoDialogOpen(true)
                      }}
                    >
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Registrar venta
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => refetchMovimientos()}
                    >
                      {loadingMovimientos ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      <span className="ml-2">Refrescar</span>
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Tipo</Label>
                    <Select value={movTipoFilter} onValueChange={setMovTipoFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="entrada">Entrada</SelectItem>
                        <SelectItem value="salida">Salida</SelectItem>
                        <SelectItem value="transferencia">Transferencia</SelectItem>
                        <SelectItem value="ajuste">Ajuste</SelectItem>
                        <SelectItem value="venta">Venta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Buscar</Label>
                    <Input
                      value={movSearch}
                      onChange={(e) => setMovSearch(e.target.value)}
                      placeholder="Código, descripción, referencia"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <MovimientosTable movimientos={filteredMovimientos} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="almacenes" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Almacenes</CardTitle>
                  <CardDescription>Define los almacenes disponibles para tu inventario.</CardDescription>
                </div>
                <Dialog
                  open={isAlmacenDialogOpen}
                  onOpenChange={(open) => {
                    setIsAlmacenDialogOpen(open)
                    if (!open) setEditingAlmacen(null)
                  }}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Package className="h-4 w-4 mr-2" />
                      Nuevo almacen
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingAlmacen ? "Editar almacen" : "Nuevo almacen"}</DialogTitle>
                    </DialogHeader>
                    <AlmacenForm
                      initialData={editingAlmacen || undefined}
                      onSubmit={editingAlmacen ? handleUpdateAlmacen : handleCreateAlmacen}
                      onCancel={() => {
                        setIsAlmacenDialogOpen(false)
                        setEditingAlmacen(null)
                      }}
                      isEditing={Boolean(editingAlmacen)}
                    />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <AlmacenesTable
                  almacenes={almacenes}
                  onEdit={(almacen) => {
                    setEditingAlmacen(almacen)
                    setIsAlmacenDialogOpen(true)
                  }}
                  onView={(almacen) => {
                    if (almacen.id) {
                      router.push(`/almacenes/${almacen.id}`)
                    }
                  }}
                  onDelete={(id) => {
                    const target = almacenes.find(a => a.id === id) || null
                    setAlmacenToDelete(target)
                    setIsDeleteAlmacenOpen(true)
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tiendas" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Tiendas</CardTitle>
                  <CardDescription>Registra las sucursales y su almacen asociado.</CardDescription>
                </div>
                <Dialog
                  open={isTiendaDialogOpen}
                  onOpenChange={(open) => {
                    setIsTiendaDialogOpen(open)
                    if (!open) setEditingTienda(null)
                  }}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Nueva tienda
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingTienda ? "Editar tienda" : "Nueva tienda"}</DialogTitle>
                    </DialogHeader>
                    <TiendaForm
                      initialData={editingTienda || undefined}
                      almacenes={almacenes}
                      onSubmit={editingTienda ? handleUpdateTienda : handleCreateTienda}
                      onCancel={() => {
                        setIsTiendaDialogOpen(false)
                        setEditingTienda(null)
                      }}
                      isEditing={Boolean(editingTienda)}
                    />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <TiendasTable
                  tiendas={tiendas}
                  onEdit={(tienda) => {
                    setEditingTienda(tienda)
                    setIsTiendaDialogOpen(true)
                  }}
                  onView={(tienda) => {
                    if (tienda.id) {
                      router.push(`/tiendas/${tienda.id}`)
                    }
                  }}
                  onDelete={(id) => {
                    const target = tiendas.find(t => t.id === id) || null
                    setTiendaToDelete(target)
                    setIsDeleteTiendaOpen(true)
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isMovimientoDialogOpen} onOpenChange={setIsMovimientoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar movimiento</DialogTitle>
          </DialogHeader>
          <MovimientoForm
            almacenes={almacenes}
            tiendas={tiendas}
            materiales={materiales}
            defaultTipo={defaultMovimientoTipo}
            onSubmit={handleCreateMovimiento}
            onCancel={() => setIsMovimientoDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={isDeleteAlmacenOpen}
        onOpenChange={setIsDeleteAlmacenOpen}
        title="Eliminar almacen"
        message={`Se eliminara el almacen "${almacenToDelete?.nombre || ""}". Esta accion no se puede deshacer.`}
        onConfirm={handleDeleteAlmacen}
      />

      <ConfirmDeleteDialog
        open={isDeleteTiendaOpen}
        onOpenChange={setIsDeleteTiendaOpen}
        title="Eliminar tienda"
        message={`Se eliminara la tienda "${tiendaToDelete?.nombre || ""}". Esta accion no se puede deshacer.`}
        onConfirm={handleDeleteTienda}
      />
    </div>
  )
}
