"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { StockTable } from "@/components/feats/inventario/stock-table"
import { MovimientosTable } from "@/components/feats/inventario/movimientos-table"
import { VentaForm } from "@/components/feats/inventario/venta-form"
import { InventarioService, MaterialService } from "@/lib/api-services"
import type { Almacen, MovimientoInventario, StockItem, Tienda } from "@/lib/inventario-types"
import type { Material } from "@/lib/material-types"
import { RouteGuard } from "@/components/auth/route-guard"
import { useToast } from "@/hooks/use-toast"

export default function TiendaDetallePage() {
  const params = useParams()
  const tiendaId = params.tiendaId as string
  const { toast } = useToast()

  const [tienda, setTienda] = useState<Tienda | null>(null)
  const [almacen, setAlmacen] = useState<Almacen | null>(null)
  const [stock, setStock] = useState<StockItem[]>([])
  const [ventas, setVentas] = useState<MovimientoInventario[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingVentas, setLoadingVentas] = useState(false)
  const [loadingStock, setLoadingStock] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDetalle = async () => {
    setLoading(true)
    setError(null)
    try {
      const [tiendasData, almacenesData, materialesData] = await Promise.all([
        InventarioService.getTiendas(),
        InventarioService.getAlmacenes(),
        MaterialService.getAllMaterials(),
      ])
      const tiendaEncontrada = tiendasData.find((item) => item.id === tiendaId) || null
      setTienda(tiendaEncontrada)
      const almacenEncontrado = almacenesData.find((item) => item.id === tiendaEncontrada?.almacen_id) || null
      setAlmacen(almacenEncontrado)
      setMateriales(materialesData)
      if (tiendaEncontrada?.almacen_id) {
        const stockData = await InventarioService.getStock({ almacen_id: tiendaEncontrada.almacen_id })
        setStock(stockData)
      }
      if (tiendaEncontrada?.id) {
        const ventasData = await InventarioService.getMovimientos({
          tipo: "venta",
          tienda_id: tiendaEncontrada.id,
        })
        setVentas(ventasData)
      }
    } catch (err) {
      console.error("Error loading tienda detalle:", err)
      setError(err instanceof Error ? err.message : "No se pudo cargar la tienda")
    } finally {
      setLoading(false)
    }
  }

  const refreshVentas = async () => {
    if (!tienda?.id) return
    setLoadingVentas(true)
    try {
      const ventasData = await InventarioService.getMovimientos({
        tipo: "venta",
        tienda_id: tienda.id,
      })
      setVentas(ventasData)
    } finally {
      setLoadingVentas(false)
    }
  }

  const refreshStock = async () => {
    if (!tienda?.almacen_id) return
    setLoadingStock(true)
    try {
      const stockData = await InventarioService.getStock({ almacen_id: tienda.almacen_id })
      setStock(stockData)
    } finally {
      setLoadingStock(false)
    }
  }

  useEffect(() => {
    loadDetalle()
  }, [tiendaId])

  const movimientosVentas = useMemo(() => ventas, [ventas])

  if (loading) {
    return <PageLoader moduleName="Tienda" text="Cargando detalles..." />
  }

  if (error || !tienda) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar tienda</h3>
          <p className="text-gray-600 mb-4">{error || "No se encontró la tienda solicitada."}</p>
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
    <RouteGuard requiredModule={`tienda:${tiendaId}`}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
        <ModuleHeader
          title={`Tienda: ${tienda.nombre}`}
          subtitle={almacen ? `Almacén asociado: ${almacen.nombre}` : "Sin almacén asignado"}
          badge={{ text: "Ventas", className: "bg-orange-100 text-orange-800" }}
          className="bg-white shadow-sm border-b border-orange-100"
        />

        <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Registrar venta</CardTitle>
                <CardDescription>Registra una venta para esta tienda.</CardDescription>
              </CardHeader>
              <CardContent>
                <VentaForm
                  tiendaId={tienda.id || tiendaId}
                  materiales={materiales}
                  onSubmit={async (data) => {
                    await InventarioService.createVenta(data)
                    toast({
                      title: "Venta registrada",
                      description: "La venta fue registrada correctamente.",
                    })
                    await Promise.all([refreshVentas(), refreshStock()])
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Stock de tienda</CardTitle>
                  <CardDescription>Stock del almacén asociado.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={refreshStock}>
                  {loadingStock ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </CardHeader>
              <CardContent>
                <StockTable stock={stock} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Historial de ventas</CardTitle>
                <CardDescription>Ventas registradas en esta tienda.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={refreshVentas}>
                {loadingVentas ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">Refrescar</span>
              </Button>
            </CardHeader>
            <CardContent>
              <MovimientosTable movimientos={movimientosVentas} />
            </CardContent>
          </Card>
        </main>
      </div>
    </RouteGuard>
  )
}
