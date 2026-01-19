"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Search } from "lucide-react"
import { MarcasTable } from "./marcas-table"
import type { Marca, TipoMaterial } from "@/lib/types/feats/marcas/marca-types"

const TIPOS_MATERIAL: TipoMaterial[] = ['BATERÍAS', 'INVERSORES', 'PANELES', 'OTRO']

interface MarcasManagementProps {
  marcas: Marca[]
  loading: boolean
  onEdit: (marca: Marca) => void
  onDelete: (marca: Marca) => void
}

export function MarcasManagement({ marcas, loading, onEdit, onDelete }: MarcasManagementProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [tipoFilter, setTipoFilter] = useState<string>("all")

  // Filtrar marcas
  const filteredMarcas = marcas.filter((marca) => {
    const matchesSearch = marca.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         marca.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTipo = tipoFilter === "all" || marca.tipos_material.includes(tipoFilter as TipoMaterial)
    
    return matchesSearch && matchesTipo
  })

  return (
    <>
      {/* Filtros */}
      <Card className="border-0 shadow-md border-l-4 border-l-emerald-600">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search-marca" className="text-sm font-medium text-gray-700 mb-2 block">
                Buscar Marca
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search-marca"
                  placeholder="Buscar por nombre o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="lg:w-64">
              <Label htmlFor="tipo-filter" className="text-sm font-medium text-gray-700 mb-2 block">
                Filtrar por Tipo
              </Label>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {TIPOS_MATERIAL.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de marcas */}
      <Card className="border-0 shadow-md border-l-4 border-l-emerald-600">
        <CardHeader>
          <CardTitle>Marcas Registradas</CardTitle>
          <CardDescription>
            Mostrando {filteredMarcas.length} de {marcas.length} marcas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <p>Cargando marcas...</p>
            </div>
          ) : (
            <MarcasTable
              marcas={filteredMarcas}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )}
        </CardContent>
      </Card>
    </>
  )
}
