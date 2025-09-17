"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Input } from "@/components/shared/molecule/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/shared/molecule/dropdown-menu"
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  Image as ImageIcon,
  Package
} from "lucide-react"
import type { Oferta } from "@/lib/api-types"
import { Loader } from "@/components/shared/atom/loader"

interface OfertasListProps {
  ofertas: Oferta[]
  loading: boolean
  onCreateNew: () => void
  onViewDetails: (oferta: Oferta) => void
  onEdit: (oferta: Oferta) => void
  onDelete: (ofertaId: string) => void
}

export default function OfertasList({
  ofertas,
  loading,
  onCreateNew,
  onViewDetails,
  onEdit,
  onDelete
}: OfertasListProps) {
  const [searchTerm, setSearchTerm] = useState("")

  // Filtrar ofertas por término de búsqueda
  const filteredOfertas = ofertas.filter(oferta =>
    oferta.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <Loader label="Cargando ofertas..." />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con búsqueda y botón crear */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar ofertas por descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={onCreateNew} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nueva Oferta
        </Button>
      </div>

      {/* Lista de ofertas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOfertas.length === 0 ? (
          <div className="col-span-full">
            <Card className="border-dashed border-2 border-gray-300">
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchTerm ? "No se encontraron ofertas" : "No hay ofertas disponibles"}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm
                    ? `No hay ofertas que coincidan con "${searchTerm}"`
                    : "Comienza creando tu primera oferta"}
                </p>
                {!searchTerm && (
                  <Button onClick={onCreateNew} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primera Oferta
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredOfertas.map((oferta) => (
            <Card key={oferta.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                      {oferta.descripcion}
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-lg font-bold text-green-600">
                        ${oferta.precio.toLocaleString()}
                      </span>
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetails(oferta)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(oferta)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(oferta.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Imagen de la oferta */}
                {oferta.imagen ? (
                  <div className="relative w-full h-32 mb-4 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={oferta.imagen}
                      alt={oferta.descripcion}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                    <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-100">
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-32 mb-4 rounded-lg bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}

                {/* Garantías */}
                {oferta.garantias && oferta.garantias.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Garantías:</p>
                    <div className="flex flex-wrap gap-1">
                      {oferta.garantias.slice(0, 2).map((garantia, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {garantia}
                        </Badge>
                      ))}
                      {oferta.garantias.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{oferta.garantias.length - 2} más
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Elementos */}
                {oferta.elementos && oferta.elementos.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Elementos: {oferta.elementos.length} item{oferta.elementos.length !== 1 ? 's' : ''}
                    </p>
                    <div className="text-xs text-gray-600">
                      {oferta.elementos.slice(0, 2).map((elemento, index) => (
                        <div key={index} className="flex justify-between">
                          <span className="truncate">{elemento.descripcion || elemento.categoria}</span>
                          {elemento.cantidad && (
                            <span className="ml-2 text-gray-500">x{elemento.cantidad}</span>
                          )}
                        </div>
                      ))}
                      {oferta.elementos.length > 2 && (
                        <div className="text-gray-500 italic">
                          +{oferta.elementos.length - 2} elementos más...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(oferta)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(oferta)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Información adicional */}
      {filteredOfertas.length > 0 && (
        <div className="text-center text-sm text-gray-600">
          Mostrando {filteredOfertas.length} de {ofertas.length} oferta{ofertas.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}