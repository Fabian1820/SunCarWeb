"use client"

import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Edit, Trash2, Package, DollarSign, Image as ImageIcon, Eye } from "lucide-react"
import type { ArticuloTienda } from "@/lib/articulos-tienda-types"

interface ArticulosTiendaTableProps {
  articulos: ArticuloTienda[]
  onEdit: (articulo: ArticuloTienda) => void
  onDelete: (id: string) => void
  onView?: (articulo: ArticuloTienda) => void
}

export function ArticulosTiendaTable({ articulos, onEdit, onDelete, onView }: ArticulosTiendaTableProps) {
  if (articulos.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron artículos</h3>
        <p className="text-gray-600">No hay artículos que coincidan con los filtros aplicados.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Foto</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Categoría</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Modelo</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Unidad</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Precio</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Descripción</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {articulos.map((articulo) => (
            <tr key={articulo.id || articulo.articulo_id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-4 px-4">
                {articulo.foto ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={articulo.foto}
                      alt={articulo.modelo}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                    <div className="hidden flex items-center justify-center h-full bg-gray-100">
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </td>
              <td className="py-4 px-4">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {articulo.categoria}
                </Badge>
              </td>
              <td className="py-4 px-4">
                <div className="max-w-md">
                  <p className="font-semibold text-gray-900">{articulo.modelo}</p>
                </div>
              </td>
              <td className="py-4 px-4">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {articulo.unidad}
                </Badge>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    ${articulo.precio.toFixed(2)}
                  </span>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="max-w-md">
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {articulo.descripcion_uso || 'Sin descripción'}
                  </p>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center space-x-2">
                  {onView && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(articulo)}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      title="Ver detalles"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(articulo)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    title="Editar artículo"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(articulo.id || articulo.articulo_id || '')}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    title="Eliminar artículo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

