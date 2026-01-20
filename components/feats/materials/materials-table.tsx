"use client"

import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Edit, Trash2, Package, DollarSign } from "lucide-react"
import type { Material } from "@/lib/material-types"

interface MaterialsTableProps {
  materials: Material[]
  onEdit: (material: Material) => void
  onDelete: (id: string) => void
}

export function MaterialsTable({ materials, onEdit, onDelete }: MaterialsTableProps) {
  if (materials.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron materiales</h3>
        <p className="text-gray-600">No hay materiales que coincidan con los filtros aplicados.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[140px]">Código</th>
            <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[110px]">Categoría</th>
            <th className="text-left py-3 px-2 font-semibold text-gray-900">Material</th>
            <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[140px]">Nombre</th>
            <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[100px]">Marca</th>
            <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[90px]">Potencia</th>
            <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[80px]">Unidad</th>
            <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[90px]">Precio</th>
            <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[120px]">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((material, index) => (
            <tr key={`${material.codigo}-${material.categoria}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-2">
                <div className="flex items-center space-x-2">
                  {material.foto ? (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-200">
                      <img 
                        src={material.foto} 
                        alt={material.nombre || material.descripcion}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div className="absolute inset-0 bg-amber-100 items-center justify-center hidden">
                        <Package className="h-5 w-5 text-amber-700" />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-100 p-1.5 rounded-lg flex-shrink-0">
                      <Package className="h-3.5 w-3.5 text-amber-700" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">{material.codigo}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs whitespace-nowrap">
                  {material.categoria}
                </Badge>
              </td>
              <td className="py-3 px-2">
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 line-clamp-2">{material.descripcion}</p>
                </div>
              </td>
              <td className="py-3 px-2">
                {material.nombre ? (
                  <span className="text-sm font-medium text-gray-900 truncate block">{material.nombre}</span>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )}
              </td>
              <td className="py-3 px-2">
                {material.marca_id ? (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                    ID: {material.marca_id.slice(0, 6)}
                  </Badge>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )}
              </td>
              <td className="py-3 px-2">
                {material.potenciaKW ? (
                  <span className="text-sm font-medium text-gray-900 whitespace-nowrap">{material.potenciaKW} KW</span>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )}
              </td>
              <td className="py-3 px-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                  {material.um}
                </Badge>
              </td>
              <td className="py-3 px-2">
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {material.precio ? `${material.precio.toFixed(2)}` : 'N/A'}
                  </span>
                </div>
              </td>
              <td className="py-3 px-2">
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(material)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
                    title="Editar material"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(String(material.codigo))}
                    className="border-red-300 text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                    title="Eliminar material"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
