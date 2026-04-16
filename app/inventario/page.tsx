"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useInventario } from "@/hooks/use-inventario"
import { MarcaService } from "@/lib/api-services"
import type { MarcaSimplificada } from "@/lib/types/feats/marcas/marca-types"
import { StockTable } from "@/components/feats/inventario/stock-table"
import { InventarioCruzadoTable } from "@/components/feats/inventario/inventario-cruzado-table"

export default function InventarioPage() {
  const {
    almacenes,
    stock,
    materiales,
    loading,
    loadingStock,
    error,
    refetchAll,
    refetchStock,
  } = useInventario()

  const [stockAlmacenFilter, setStockAlmacenFilter] = useState("all")
  const [stockSearch, setStockSearch] = useState("")
  const [stockCategoriaFilter, setStockCategoriaFilter] = useState("all")
  const [stockMarcaFilter, setStockMarcaFilter] = useState("all")
  const [stockPotenciaFilter, setStockPotenciaFilter] = useState("all")
  const [marcas, setMarcas] = useState<MarcaSimplificada[]>([])

  useEffect(() => {
    MarcaService.getMarcasSimplificadas().then(setMarcas).catch(() => {})
  }, [])

  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setStockSearch("")
    setStockCategoriaFilter("all")
    setStockMarcaFilter("all")
    setStockPotenciaFilter("all")
    refetchStock(stockAlmacenFilter === "all" ? undefined : stockAlmacenFilter)
  }, [stockAlmacenFilter])

  const marcaNombrePorId = useMemo(() => {
    const map = new Map<string, string>()
    for (const marca of marcas) map.set(marca.id, marca.nombre)
    return map
  }, [marcas])

  const materialPorCodigo = useMemo(() => {
    const map = new Map<string, typeof materiales[number]>()
    for (const m of materiales) map.set(String(m.codigo).trim().toLowerCase(), m)
    return map
  }, [materiales])

  const stockFilterOptions = useMemo(() => {
    const categoriasSet = new Set<string>()
    const potenciaSet = new Set<string>()
    const marcasMap = new Map<string, string>()

    for (const item of stock) {
      const material = materialPorCodigo.get(String(item.material_codigo || "").trim().toLowerCase())
      const categoria = String(material?.categoria || (item as any).categoria || "").trim()
      if (categoria) categoriasSet.add(categoria)
      const potencia = material?.potenciaKW
      if (potencia !== undefined && potencia !== null && `${potencia}` !== "") potenciaSet.add(String(potencia))
      const marcaId = String(material?.marca_id || "").trim()
      if (marcaId) marcasMap.set(marcaId, marcaNombrePorId.get(marcaId) || marcaId)
    }

    return {
      categorias: Array.from(categoriasSet).sort((a, b) => a.localeCompare(b)),
      potencias: Array.from(potenciaSet).sort((a, b) => Number(a) - Number(b)),
      marcas: Array.from(marcasMap.entries())
        .map(([id, nombre]) => ({ id, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    }
  }, [stock, materialPorCodigo, marcaNombrePorId])

  const filteredStock = useMemo(() => {
    const search = stockSearch.trim().toLowerCase()
    return stock.filter(item => {
      const codigo = String(item.material_codigo || "").trim().toLowerCase()
      const material = materialPorCodigo.get(codigo)
      const nombre = String(material?.nombre || material?.descripcion || item.material_descripcion || "").toLowerCase()
      const categoria = String(material?.categoria || (item as any).categoria || "").trim()
      const marcaId = String(material?.marca_id || "").trim()
      const potencia = material?.potenciaKW

      return (
        (!search || codigo.includes(search) || nombre.includes(search)) &&
        (stockCategoriaFilter === "all" || categoria === stockCategoriaFilter) &&
        (stockMarcaFilter === "all" || marcaId === stockMarcaFilter) &&
        (stockPotenciaFilter === "all" || String(potencia ?? "") === stockPotenciaFilter)
      )
    })
  }, [stock, stockSearch, materialPorCodigo, stockCategoriaFilter, stockMarcaFilter, stockPotenciaFilter])

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
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  const isSpecificAlmacen = stockAlmacenFilter !== "all"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      <ModuleHeader
        title="Inventario y Almacenes"
        subtitle="Consulta las existencias por almacén y tienda"
        badge={{ text: "Inventario", className: "bg-orange-100 text-orange-800" }}
        className="bg-white shadow-sm border-b border-orange-100"
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
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

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
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

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Buscar material</Label>
                <Input
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  placeholder="Código o descripción"
                />
              </div>

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
                stock={filteredStock}
                detailed
                materials={materiales}
                marcas={marcas}
                almacenNombreFallback={almacenes.find(a => a.id === stockAlmacenFilter)?.nombre}
              />
            ) : (
              <InventarioCruzadoTable
                stock={filteredStock}
                almacenes={almacenes}
                materials={materiales}
                marcas={marcas}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
