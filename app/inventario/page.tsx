"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useMaterialesStock } from "@/hooks/use-materiales-stock"
import { MaterialService, MarcaService } from "@/lib/api-services"
import type { MarcaSimplificada } from "@/lib/types/feats/marcas/marca-types"
import { MaterialesStockTable } from "@/components/feats/inventario/materiales-stock-table"

export default function InventarioPage() {
  const {
    data,
    almacenesDisponibles,
    loading,
    error,
    meta,
    filters,
    sort,
    setFilters,
    setSort,
    setPage,
    refetch,
  } = useMaterialesStock()

  const [categorias, setCategorias] = useState<string[]>([])
  const [marcas, setMarcas] = useState<MarcaSimplificada[]>([])
  const [filtersReady, setFiltersReady] = useState(false)

  useEffect(() => {
    let mounted = true
    Promise.all([
      MaterialService.getCategories().catch(() => []),
      MarcaService.getMarcasSimplificadas().catch(() => []),
    ]).then(([cats, mks]) => {
      if (!mounted) return
      const nombres = (cats as any[])
        .map((c) => c?.categoria || c?.nombre)
        .filter((c): c is string => typeof c === "string" && c.length > 0)
      setCategorias(Array.from(new Set(nombres)).sort((a, b) => a.localeCompare(b)))
      setMarcas(mks as MarcaSimplificada[])
      setFiltersReady(true)
    })
    return () => {
      mounted = false
    }
  }, [])

  const isInitialLoad = loading && data.length === 0 && !error && !filtersReady

  if (isInitialLoad) {
    return <PageLoader moduleName="Inventario" text="Cargando inventario..." />
  }

  if (error && data.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Error al cargar inventario
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button
            size="icon"
            onClick={refetch}
            className="h-10 w-10 bg-amber-600 hover:bg-amber-700 touch-manipulation"
            aria-label="Reintentar"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  const almacenSeleccionado =
    filters.almacen_id !== "all"
      ? almacenesDisponibles.find((a) => a.id === filters.almacen_id)
      : undefined

  const cardTitle = almacenSeleccionado
    ? `Stock en ${almacenSeleccionado.nombre}`
    : "Stock consolidado por almacén"
  const cardDescription = almacenSeleccionado
    ? "Existencias actuales del almacén seleccionado."
    : "Cantidad por material y desglose por almacén. Expande una fila para ver el detalle."

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
                <CardTitle>{cardTitle}</CardTitle>
                <CardDescription>{cardDescription}</CardDescription>
              </div>
              <Button variant="outline" onClick={refetch} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Refrescar</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Almacén
                </Label>
                <Select
                  value={filters.almacen_id}
                  onValueChange={(value) => setFilters({ almacen_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los almacenes</SelectItem>
                    {almacenesDisponibles.map((almacen) => (
                      <SelectItem key={almacen.id} value={almacen.id}>
                        {almacen.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Buscar material
                </Label>
                <Input
                  value={filters.q}
                  onChange={(e) => setFilters({ q: e.target.value })}
                  placeholder="Código o nombre"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Categoría
                </Label>
                <Select
                  value={filters.categoria}
                  onValueChange={(value) => setFilters({ categoria: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categorias.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
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
                  value={filters.marca_id}
                  onValueChange={(value) => setFilters({ marca_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {marcas.map((marca) => (
                      <SelectItem key={marca.id} value={marca.id}>
                        {marca.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Potencia (KW)
                </Label>
                <Input
                  value={filters.potencia_kw === "all" ? "" : filters.potencia_kw}
                  onChange={(e) =>
                    setFilters({
                      potencia_kw: e.target.value.trim() === "" ? "all" : e.target.value,
                    })
                  }
                  placeholder="ej. 10"
                  inputMode="decimal"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Disponibilidad
                </Label>
                <Select
                  value={filters.cantidad_filter}
                  onValueChange={(value) =>
                    setFilters({
                      cantidad_filter: value as
                        | "all"
                        | "con_stock"
                        | "sin_stock",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="con_stock">Con stock</SelectItem>
                    <SelectItem value="sin_stock">Sin stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <MaterialesStockTable
              data={data}
              loading={loading}
              almacenSeleccionadoId={almacenSeleccionado?.id}
              almacenSeleccionadoNombre={almacenSeleccionado?.nombre}
              sort={sort}
              onSortChange={(sort_by) => {
                if (sort.sort_by === sort_by) {
                  setSort({
                    sort_dir: sort.sort_dir === "asc" ? "desc" : "asc",
                  })
                } else {
                  setSort({ sort_by, sort_dir: "asc" })
                }
              }}
              pagination={{
                page: meta.page,
                totalPages: meta.totalPages,
                total: meta.total,
                limit: meta.limit,
                onPageChange: setPage,
              }}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
