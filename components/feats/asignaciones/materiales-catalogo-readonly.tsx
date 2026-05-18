"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/molecule/card"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Badge } from "@/components/shared/atom/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/shared/atom/select"
import { Package, X, ChevronLeft, ChevronRight, FileText } from "lucide-react"
import { usePaginatedMaterials } from "@/hooks/use-paginated-materials"
import { LazyImage } from "@/components/shared/atom/lazy-image"
import { MaterialService } from "@/lib/api-services"

interface MarcaItem {
  id: string
  nombre: string
}

export function MaterialesCatalogoReadonly() {
  const paginated = usePaginatedMaterials()
  const [categories, setCategories] = useState<string[]>([])
  const [marcas, setMarcas] = useState<MarcaItem[]>([])

  // Cargar categorías + marcas al montar
  useEffect(() => {
    let cancelled = false
    Promise.all([
      MaterialService.getCategories().catch(() => []),
      import("@/lib/services/feats/marcas/marca-service")
        .then(m => m.MarcaService.getMarcas())
        .catch(() => []),
    ]).then(([cats, marcasData]) => {
      if (cancelled) return
      setCategories((cats as { categoria: string }[]).map(c => c.categoria).filter(Boolean))
      setMarcas(marcasData as MarcaItem[])
    })
    return () => { cancelled = true }
  }, [])

  const hasFilters =
    !!paginated.filters.q ||
    paginated.filters.categoria !== "all" ||
    paginated.filters.marca_id !== "all"

  const handleClear = () => paginated.setFilters({ q: "", categoria: "all", marca_id: "all" })

  const { meta, materials, loading } = paginated
  const from = meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0
  const to = Math.min(meta.page * meta.limit, meta.total)

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card className="border-0 shadow-sm border-l-4 border-l-emerald-500">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
            <div className="flex-1">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Buscar</Label>
              <Input
                placeholder="Código, nombre o descripción..."
                value={paginated.filters.q}
                onChange={e => paginated.setFilters({ q: e.target.value })}
              />
            </div>
            <div className="lg:w-56">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Categoría</Label>
              <Select
                value={paginated.filters.categoria}
                onValueChange={v => paginated.setFilters({ categoria: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((c, idx) => (
                    <SelectItem key={c || idx} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="lg:w-48">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Marca</Label>
              <Select
                value={paginated.filters.marca_id}
                onValueChange={v => paginated.setFilters({ marca_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las marcas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las marcas</SelectItem>
                  {marcas.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="text-gray-600 border-gray-300 hover:bg-gray-50 whitespace-nowrap"
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="border-0 shadow-md border-l-4 border-l-indigo-500">
        <CardHeader>
          <CardTitle className="text-base">Catálogo de Materiales</CardTitle>
          <CardDescription>
            {meta.total > 0
              ? `Mostrando ${from}–${to} de ${meta.total} materiales (solo lectura)`
              : loading ? "Cargando materiales..." : "No se encontraron materiales"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron materiales</h3>
              <p className="text-gray-600">No hay materiales que coincidan con los filtros aplicados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[180px]">Código</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[140px]">Categoría</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-900">Nombre</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[60px]">UM</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[80px]">Ficha</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((material, index) => (
                    <tr
                      key={`${material.codigo}-${material.categoria}-${index}`}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center space-x-2">
                          {material.foto ? (
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-200">
                              <LazyImage
                                src={material.foto}
                                alt={material.nombre || material.descripcion}
                                className="relative w-full h-full"
                                imgClassName="w-full h-full object-contain p-1"
                                fallback={
                                  <div className="absolute inset-0 bg-amber-100 flex items-center justify-center">
                                    <Package className="h-5 w-5 text-amber-700" />
                                  </div>
                                }
                              />
                            </div>
                          ) : (
                            <div className="bg-amber-100 p-1.5 rounded-lg flex-shrink-0">
                              <Package className="h-3.5 w-3.5 text-amber-700" />
                            </div>
                          )}
                          <p className="font-semibold text-gray-900 text-sm whitespace-nowrap">
                            {material.codigo}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs inline-block max-w-full truncate">
                          {material.categoria}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-sm font-medium text-gray-900 truncate block">
                          {material.nombre || material.descripcion || <span className="text-gray-400">—</span>}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-xs text-gray-600 font-medium">{material.um || "—"}</span>
                      </td>
                      <td className="py-3 px-2">
                        {material.ficha_tecnica_url ? (
                          <a
                            href={material.ficha_tecnica_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                            title="Descargar ficha técnica"
                          >
                            <FileText className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-2">
                  <p className="text-sm text-gray-600">
                    Página <span className="font-medium">{meta.page}</span> de{" "}
                    <span className="font-medium">{meta.totalPages}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => paginated.setPage(meta.page - 1)}
                      disabled={meta.page <= 1 || loading}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-gray-700 min-w-[80px] text-center">
                      {meta.page} / {meta.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => paginated.setPage(meta.page + 1)}
                      disabled={meta.page >= meta.totalPages || loading}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
