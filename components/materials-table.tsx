"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, Package } from "lucide-react"
import type { Material } from "@/lib/types"

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
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Nombre</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Tipo</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Marca</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((material) => (
            <tr key={material.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-4 px-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Package className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{material.name}</p>
                    <p className="text-sm text-gray-600">ID: {material.id}</p>
                  </div>
                </div>
              </td>
              <td className="py-4 px-4">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {material.type}
                </Badge>
              </td>
              <td className="py-4 px-4">
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {material.brand}
                </Badge>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(material)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(material.id)}
                    className="border-red-300 text-red-700 hover:bg-red-50"
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
