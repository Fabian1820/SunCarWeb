"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Search, Briefcase, X } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent } from "@/components/shared/molecule/card"

interface RecursosHumanosFiltersProps {
  cargosDisponibles: string[]
  onFilterChange: (filters: { searchTerm: string; cargoSeleccionado: string }) => void
}

export function RecursosHumanosFilters({
  cargosDisponibles,
  onFilterChange
}: RecursosHumanosFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [cargoSeleccionado, setCargoSeleccionado] = useState("")

  // Notificar cambios al padre
  useEffect(() => {
    onFilterChange({ searchTerm, cargoSeleccionado })
  }, [searchTerm, cargoSeleccionado, onFilterChange])

  const handleClearFilters = () => {
    setSearchTerm("")
    setCargoSeleccionado("")
  }

  const hasActiveFilters = searchTerm !== "" || cargoSeleccionado !== ""

  return (
    <Card className="mb-6 border-purple-200">
      <CardContent className="pt-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Buscador por nombre */}
          <div className="flex-1 min-w-[220px] space-y-2">
            <Label htmlFor="search-nombre" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Search className="h-4 w-4 text-purple-600" />
              Buscar por nombre
            </Label>
            <div className="relative">
              <Input
                id="search-nombre"
                type="text"
                placeholder="Escribe el nombre del trabajador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Filtro por cargo */}
          <div className="w-full sm:w-auto min-w-[200px] space-y-2">
            <Label htmlFor="filter-cargo" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-purple-600" />
              Filtrar por cargo
            </Label>
            <select
              id="filter-cargo"
              value={cargoSeleccionado}
              onChange={(e) => setCargoSeleccionado(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white hover:border-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors h-10"
            >
              <option value="">Todos los cargos</option>
              {cargosDisponibles.map((cargo) => (
                <option key={cargo} value={cargo}>
                  {cargo}
                </option>
              ))}
            </select>
          </div>

          {/* Botón para limpiar filtros */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 h-10"
            >
              <X className="h-4 w-4" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Indicador de filtros activos */}
        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Filtros activos:</span>{" "}
              {searchTerm && `Búsqueda: "${searchTerm}"`}
              {searchTerm && cargoSeleccionado && " • "}
              {cargoSeleccionado && `Cargo: ${cargoSeleccionado}`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
