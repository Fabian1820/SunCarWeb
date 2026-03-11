"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Badge } from "@/components/shared/atom/badge"
import { Search, Loader2, Package, Zap } from "lucide-react"
import { FichaCostoService } from "@/lib/api-services"
import type { MaterialCatalogoWeb } from "@/lib/types/feats/fichas-costo/ficha-costo-types"

interface MaterialSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (material: MaterialCatalogoWeb) => void
}

export function MaterialSearchDialog({ open, onOpenChange, onSelect }: MaterialSearchDialogProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<MaterialCatalogoWeb[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!open) {
      setQuery("")
      setResults([])
    }
  }, [open])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await FichaCostoService.buscarMateriales(query.trim())
        setResults(Array.isArray(data) ? data : [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const getMaterialId = (m: MaterialCatalogoWeb): string =>
    m.material_id || m._id || m.id || ""

  const getMaterialName = (m: MaterialCatalogoWeb): string =>
    m.nombre || ("Material " + (m.codigo || getMaterialId(m)))

  const getFotoUrl = (m: MaterialCatalogoWeb): string | null => {
    if (m.foto) return m.foto
    if (m.imagen) return m.imagen
    if (m.imagen_url) return m.imagen_url
    if (m.foto_url) return m.foto_url
    if (Array.isArray(m.fotos) && m.fotos.length > 0) return m.fotos[0]
    return null
  }

  const formatPotencia = (m: MaterialCatalogoWeb): string | null => {
    if (m.potenciaKW == null) return null
    if (m.potenciaKW >= 1) return m.potenciaKW + " kW"
    return Math.round(m.potenciaKW * 1000) + " W"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-teal-600" />
            Seleccionar Material
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
          <div>
            <Label htmlFor="material-search" className="text-sm font-medium text-gray-700">
              Buscar en catálogo
            </Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="material-search"
                placeholder="Nombre, marca, categoría..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto border rounded-md">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600 mr-2" />
                <span className="text-gray-600">Buscando...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                {query.trim().length < 2
                  ? "Escriba al menos 2 caracteres para buscar"
                  : "No se encontraron materiales"}
              </div>
            ) : (
              <div className="divide-y">
                {results.map((material, idx) => {
                  const fotoUrl = getFotoUrl(material)
                  const potencia = formatPotencia(material)
                  return (
                    <button
                      key={getMaterialId(material) || idx}
                      onClick={() => {
                        onSelect(material)
                        onOpenChange(false)
                      }}
                      className="w-full text-left px-3 py-3 hover:bg-teal-50 transition-colors flex items-start gap-3"
                    >
                      {/* Foto */}
                      <div className="flex-shrink-0 w-14 h-14 rounded-md overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                        {fotoUrl ? (
                          <img
                            src={fotoUrl}
                            alt={getMaterialName(material)}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const img = e.currentTarget as HTMLImageElement
                              img.style.display = "none"
                              const fallback = img.parentElement?.querySelector(".mat-fallback") as HTMLElement | null
                              if (fallback) fallback.style.display = "flex"
                            }}
                          />
                        ) : null}
                        <div
                          className="mat-fallback w-full h-full items-center justify-center"
                          style={{ display: fotoUrl ? "none" : "flex" }}
                        >
                          <Package className="h-6 w-6 text-gray-300" />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-gray-900 text-sm leading-tight">
                            {getMaterialName(material)}
                          </p>
                          {material.precio != null && (
                            <span className="text-sm font-bold text-teal-700 whitespace-nowrap flex-shrink-0">
                              ${Number(material.precio).toFixed(2)}
                            </span>
                          )}
                        </div>

                        {material.descripcion && material.descripcion !== material.nombre && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {material.descripcion}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {material.categoria && (
                            <Badge className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0">
                              {material.categoria}
                            </Badge>
                          )}
                          {material.marca && (
                            <Badge className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0">
                              {material.marca}
                            </Badge>
                          )}
                          {potencia && (
                            <Badge className="bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                              <Zap className="h-2.5 w-2.5" />
                              {potencia}
                            </Badge>
                          )}

                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {results.length > 0 && (
            <p className="text-xs text-gray-400 text-right">{results.length} resultado(s)</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
