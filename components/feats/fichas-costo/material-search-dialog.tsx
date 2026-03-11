"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Input } from "@/components/shared/molecule/input"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { Search, Loader2, Package } from "lucide-react"
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
      return
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

  const getMaterialId = (m: MaterialCatalogoWeb): string => {
    return m.material_id || m._id || m.id || ""
  }

  const getMaterialName = (m: MaterialCatalogoWeb): string => {
    return m.nombre || m.descripcion || `Material ${m.codigo || getMaterialId(m)}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-teal-600" />
            Seleccionar Material
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div>
            <Label htmlFor="material-search" className="text-sm font-medium text-gray-700">
              Buscar material
            </Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="material-search"
                placeholder="Escriba al menos 2 caracteres para buscar..."
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
                <span className="text-gray-600">Buscando materiales...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {query.trim().length < 2
                  ? "Escriba para buscar materiales del catálogo"
                  : "No se encontraron materiales"}
              </div>
            ) : (
              <div className="divide-y">
                {results.map((material, idx) => (
                  <button
                    key={getMaterialId(material) || idx}
                    onClick={() => {
                      onSelect(material)
                      onOpenChange(false)
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">
                        {getMaterialName(material)}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                        {material.marca && <span>Marca: {material.marca}</span>}
                        {material.codigo && <span>Código: {material.codigo}</span>}
                        {material.categoria && <span>{material.categoria}</span>}
                      </div>
                    </div>
                    {material.precio != null && (
                      <span className="text-sm font-semibold text-teal-700 whitespace-nowrap">
                        ${material.precio.toFixed(2)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
