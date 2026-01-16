"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Button } from "@/components/shared/atom/button"
import { Search, Package, X } from "lucide-react"

interface Material {
  codigo: string
  descripcion: string
}

interface MaterialSearchSelectorProps {
  label: string
  materials: Material[]
  value: string
  onChange: (codigo: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
}

export function MaterialSearchSelector({
  label,
  materials,
  value,
  onChange,
  placeholder = "Buscar...",
  disabled = false,
  loading = false,
}: MaterialSearchSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [showResults, setShowResults] = useState(false)

  // Material seleccionado
  const selectedMaterial = materials.find(m => String(m.codigo) === String(value))

  // Filtrar materiales según búsqueda
  const filteredMaterials = useMemo(() => {
    if (!searchTerm.trim()) return []
    
    const search = searchTerm.toLowerCase()
    return materials.filter(material => 
      material.descripcion.toLowerCase().includes(search) ||
      String(material.codigo).toLowerCase().includes(search)
    )
  }, [materials, searchTerm])

  const handleSelect = (codigo: string) => {
    onChange(codigo)
    setSearchTerm("")
    setShowResults(false)
  }

  const handleClear = () => {
    onChange("")
    setSearchTerm("")
    setShowResults(false)
  }

  const handleSearchFocus = () => {
    if (!selectedMaterial) {
      setShowResults(true)
    }
  }

  return (
    <div className="relative">
      <Label>{label}</Label>
      
      {/* Material seleccionado */}
      {selectedMaterial && !showResults ? (
        <div className="mt-1 h-10 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center">
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-blue-900 truncate text-sm leading-tight">
                {selectedMaterial.descripcion}
              </p>
              <p className="text-xs text-blue-700">
                Código: {selectedMaterial.codigo}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              className="text-blue-700 hover:text-blue-900 hover:bg-blue-100 flex-shrink-0 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Campo de búsqueda */}
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={loading ? "Cargando..." : placeholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setShowResults(true)
              }}
              onFocus={handleSearchFocus}
              className="pl-10"
              disabled={disabled || loading}
            />
          </div>

          {/* Lista filtrada de materiales */}
          {showResults && searchTerm && (
            <div className="absolute z-10 left-0 right-0 mt-1 border rounded-lg max-h-[180px] overflow-y-auto bg-white shadow-lg">
              {loading ? (
                <div className="px-4 py-6 text-center text-gray-500">
                  Cargando materiales...
                </div>
              ) : filteredMaterials.length > 0 ? (
                <div className="divide-y">
                  {filteredMaterials.slice(0, 20).map((material) => (
                    <button
                      key={material.codigo}
                      type="button"
                      onClick={() => handleSelect(String(material.codigo))}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors focus:bg-blue-50 focus:outline-none"
                    >
                      <p className="font-medium text-gray-900 text-sm">{material.descripcion}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Código: {material.codigo}
                      </p>
                    </button>
                  ))}
                  {filteredMaterials.length > 20 && (
                    <div className="px-4 py-2 text-xs text-gray-500 text-center bg-gray-50">
                      Mostrando 20 de {filteredMaterials.length} resultados
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-4 py-6 text-center">
                  <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No se encontraron materiales</p>
                  <p className="text-xs text-gray-400 mt-1">Intenta con otro término</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
