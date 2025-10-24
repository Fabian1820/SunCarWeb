"use client"

import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Edit, Trash2, Package, DollarSign, Image as ImageIcon } from "lucide-react"
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
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Código</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Categoría</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Material</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Unidad</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Precio</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((material) => (
            <tr key={material.id || material.codigo || `${material.categoria}-${material.codigo}`} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-4 px-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-amber-100 p-2 rounded-lg">
                    <Package className="h-4 w-4 text-amber-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{material.codigo}</p>
                  </div>
                </div>
              </td>
              <td className="py-4 px-4">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {material.categoria}
                </Badge>
              </td>
              <td className="py-4 px-4">
                <div className="max-w-md">
                  <p className="text-sm text-gray-900 leading-relaxed">{material.descripcion}</p>
                </div>
              </td>
              <td className="py-4 px-4">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {material.um}
                </Badge>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {material.precio ? `$${material.precio.toFixed(2)}` : 'N/A'}
                  </span>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(material)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    title="Editar material"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(String(material.codigo))}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    title="Eliminar material"
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
