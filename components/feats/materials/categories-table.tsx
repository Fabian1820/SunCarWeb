"use client"

import { Badge } from "@/components/shared/atom/badge"
import { Switch } from "@/components/shared/molecule/switch"
import { Image as ImageIcon, Package, Eye, EyeOff } from "lucide-react"
import type { BackendCatalogoProductos } from "@/lib/material-types"

interface CategoriesTableProps {
  categories: BackendCatalogoProductos[]
  onToggleVendible?: (categoryId: string, isVendible: boolean) => void
}

export function CategoriesTable({ categories, onToggleVendible }: CategoriesTableProps) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron categorías</h3>
        <p className="text-gray-600">No hay categorías que coincidan con los filtros aplicados.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Categoría</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Materiales</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Foto</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Es Vendible</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-4 px-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Package className="h-4 w-4 text-blue-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{category.categoria}</p>
                  </div>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {category.materiales?.length || 0} materiales
                  </span>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center justify-center">
                  {category.foto ? (
                    <div className="w-12 h-12 rounded overflow-hidden bg-gray-100">
                      <img
                        src={category.foto}
                        alt={category.categoria}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                      <div className="hidden flex items-center justify-center h-full bg-gray-100">
                        <ImageIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={category.esVendible ?? true}
                    onCheckedChange={(checked) => onToggleVendible?.(category.id, checked)}
                    disabled={!onToggleVendible}
                  />
                  <div className="flex items-center space-x-1">
                    {category.esVendible ? (
                      <>
                        <Eye className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">Vendible</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500">No vendible</span>
                      </>
                    )}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
