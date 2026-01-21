"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { AlertCircle, RefreshCw, PackagePlus, PackageMinus } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { StockTable } from "@/components/feats/inventario/stock-table"
import { MovimientosTable } from "@/components/feats/inventario/movimientos-table"
import { InventarioService, MaterialService } from "@/lib/api-services"
import type { Almacen, MovimientoInventario, StockItem } from "@/lib/inventario-types"
import type { Material, BackendCatalogoProductos } from "@/lib/material-types"
import { RouteGuard } from "@/components/auth/route-guard"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { MovimientoAlmacenForm } from "@/components/feats/inventario/movimiento-almacen-form"
import { MaterialForm } from "@/components/feats/materials/material-form"

export default function AlmacenDetallePage() {
  const params = useParams()
  const almacenId = params.almacenId as string
  const { toast } = useToast()

  const [almacen, setAlmacen] = useState<Almacen | null>(null)
  const [stock, setStock] = useState<StockItem[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [catalogos, setCatalogos] = useState<BackendCatalogoProductos[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMovimientos, setLoadingMovimientos] = useState(false)
  const [loadingStock, setLoadingStock] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEntradaDialogOpen, setIsEntradaDialogOpen] = useState(false)
  const [isSalidaDialogOpen, setIsSalidaDialogOpen] = useState(false)
  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false)

  const loadDetalle = async () => {
    setLoading(true)
    setError(null)
    try {
      const [almacenesData, materialesData, catalogosData] = await Promise.all([
        InventarioService.getAlmacenes(),
        MaterialService.getAllMaterials(),
        MaterialService.getAllCatalogs(),
      ])
      const almacenEncontrado = almacenesData.find((item) => item.id === almacenId) || null
      setAlmacen(almacenEncontrado)
      setMateriales(materialesData)
      setCatalogos(catalogosData)

      if (almacenEncontrado?.id) {
        const [stockData, movimientosData] = await Promise.all([
          InventarioService.getStock({ almacen_id: almacenEncontrado.id }),
          InventarioService.getMovimientos({ almacen_id: almacenEncontrado.id }),
        ])
        setStock(stockData)
        setMovimientos(movimientosData)
      }
    } catch (err) {
      console.error("Error loading almacen detalle:", err)
      setError(err instanceof Error ? err.message : "No se pudo cargar el almacén")
    } finally {
      setLoading(false)
    }
  }

  const refreshStock = async () => {
    if (!almacen?.id) return
    setLoadingStock(true)
    try {
      const stockData = await InventarioService.getStock({ almacen_id: almacen.id })
      setStock(stockData)
    } finally {
      setLoadingStock(false)
    }
  }

  const refreshMovimientos = async () => {
    if (!almacen?.id) return
    setLoadingMovimientos(true)
    try {
      const movimientosData = await InventarioService.getMovimientos({ almacen_id: almacen.id })
      setMovimientos(movimientosData)
    } finally {
      setLoadingMovimientos(false)
    }
  }

  const refreshMateriales = async () => {
    const [materialesData, catalogosData] = await Promise.all([
      MaterialService.getAllMaterials(),
      MaterialService.getAllCatalogs(),
    ])
    setMateriales(materialesData)
    setCatalogos(catalogosData)
  }

  useEffect(() => {
    loadDetalle()
  }, [almacenId])

  const categorias = useMemo(() => {
    return Array.from(new Set(catalogos.map((cat) => cat.categoria))).sort()
  }, [catalogos])

  const unidades = useMemo(() => {
    return Array.from(new Set(materiales.map((material) => material.um))).sort()
  }, [materiales])

  if (loading) {
    return <PageLoader moduleName="Almacén" text="Cargando detalles..." />
  }

  if (error || !almacen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar almacén</h3>
          <p className="text-gray-600 mb-4">{error || "No se encontró el almacén solicitado."}</p>
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
    )
  }

  return (
    <RouteGuard requiredModule={`almacen:${almacenId}`}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
        <ModuleHeader
          title={`Almacén: ${almacen.nombre}`}
          subtitle={almacen.direccion || "Gestión de entradas y salidas"}
          badge={{ text: "Inventario", className: "bg-orange-100 text-orange-800" }}
          className="bg-white shadow-sm border-b border-orange-100"
          backButton={{
            href: "/almacenes-suncar",
            label: "Volver a Almacenes"
          }}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setIsEntradaDialogOpen(true)}>
                <PackagePlus className="h-4 w-4 mr-2" />
                Registrar entrada
              </Button>
              <Button variant="outline" onClick={() => setIsSalidaDialogOpen(true)}>
                <PackageMinus className="h-4 w-4 mr-2" />
                Registrar salida
              </Button>
            </div>
          }
        />

        <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Stock del almacén</CardTitle>
                <CardDescription>Existencias actuales.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={refreshStock}>
                {loadingStock ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">Refrescar</span>
              </Button>
            </CardHeader>
            <CardContent>
              <StockTable stock={stock} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Historial de movimientos</CardTitle>
                <CardDescription>Entradas y salidas registradas.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={refreshMovimientos}>
                {loadingMovimientos ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">Refrescar</span>
              </Button>
            </CardHeader>
            <CardContent>
              <MovimientosTable movimientos={movimientos} />
            </CardContent>
          </Card>
        </main>

        <Dialog open={isEntradaDialogOpen} onOpenChange={setIsEntradaDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar entrada</DialogTitle>
            </DialogHeader>
            <MovimientoAlmacenForm
              almacen={almacen}
              tipo="entrada"
              materiales={materiales}
              onCreateMaterial={(query) => {
                setIsMaterialDialogOpen(true)
              }}
              onSubmit={async (data) => {
                await InventarioService.createMovimiento(data)
                toast({
                  title: "Entrada registrada",
                  description: "La entrada fue registrada correctamente.",
                })
                setIsEntradaDialogOpen(false)
                await Promise.all([refreshStock(), refreshMovimientos()])
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isSalidaDialogOpen} onOpenChange={setIsSalidaDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar salida</DialogTitle>
            </DialogHeader>
            <MovimientoAlmacenForm
              almacen={almacen}
              tipo="salida"
              materiales={materiales}
              onSubmit={async (data) => {
                await InventarioService.createMovimiento(data)
                toast({
                  title: "Salida registrada",
                  description: "La salida fue registrada correctamente.",
                })
                setIsSalidaDialogOpen(false)
                await Promise.all([refreshStock(), refreshMovimientos()])
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isMaterialDialogOpen} onOpenChange={setIsMaterialDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear material</DialogTitle>
            </DialogHeader>
            <MaterialForm
              existingCategories={categorias}
              existingUnits={unidades}
              onSubmit={async (material) => {
                const categoria = (material as any).categoria
                const codigo = (material as any).codigo
                const descripcion = (material as any).descripcion
                const um = (material as any).um
                const precio = (material as any).precio
                const isNewCategory = (material as any).isNewCategory
                const categoryPhoto = (material as any).categoryPhoto
                const categoryVendible = (material as any).categoryVendible

                let productoId: string | undefined
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
                  })
                } else {
                  const catalogo = catalogos.find((cat) => cat.categoria === categoria)
                  productoId = catalogo?.id
                  if (!productoId) {
                    const nuevoId = await MaterialService.createCategory(categoria)
                    productoId = nuevoId
                  }
                  await MaterialService.addMaterialToProduct(productoId, {
                    codigo: String(codigo),
                    descripcion,
                    um,
                    precio: precio || 0,
                  })
                }

                await refreshMateriales()
                toast({
                  title: "Material creado",
                  description: "El material fue registrado correctamente.",
                })
                setIsMaterialDialogOpen(false)
              }}
              onCancel={() => setIsMaterialDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </RouteGuard>
  )
}
