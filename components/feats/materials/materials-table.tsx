"use client"

import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Edit, Trash2, Package, DollarSign } from "lucide-react"
import type { Material } from "@/lib/material-types"

interface MaterialsTableProps {
  materials: Material[]
  onEdit: (material: Material) => void
  onDelete: (id: string) => void
  marcas?: any[]
}

export function MaterialsTable({ materials, onEdit, onDelete, marcas = [] }: MaterialsTableProps) {
  // Función para obtener el nombre de la marca por ID
  const getMarcaNombre = (marcaId: string | undefined): string | null => {
    if (!marcaId || marcas.length === 0) return null
    const marca = marcas.find(m => m.id === marcaId)
    return marca?.nombre || null
  }

  // Función para generar un color único basado en el ID de la marca
  const getMarcaColor = (marcaId: string): { bg: string; text: string; border: string } => {
    const colors = [
      { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
      { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
      { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
      { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
      { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
      { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
      { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200' },
      { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
      { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
      { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
      { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
      { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200' },
      { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
      { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    ]
    
    // Generar un índice basado en el hash del ID
    let hash = 0
    for (let i = 0; i < marcaId.length; i++) {
      hash = marcaId.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % colors.length
    
    return colors[index]
  }

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
            <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[180px]">Código</th>
            <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[130px]">Categoría</th>
            <th className="text-left py-3 px-2 font-semibold text-gray-900">Nombre</th>
            <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[100px]">Marca</th>
            <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[90px]">Potencia</th>
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
                    <p className="font-semibold text-gray-900 text-sm whitespace-nowrap">{material.codigo}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-2">
                <div className="max-w-[130px]">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs inline-block max-w-full truncate">
                    {material.categoria}
                  </Badge>
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
                  (() => {
                    const marcaNombre = getMarcaNombre(material.marca_id)
                    const colorClasses = getMarcaColor(material.marca_id)
                    return marcaNombre ? (
                      <div className="max-w-[100px]">
                        <Badge variant="outline" className={`${colorClasses.bg} ${colorClasses.text} ${colorClasses.border} text-xs inline-block max-w-full truncate`}>
                          {marcaNombre}
                        </Badge>
                      </div>
                    ) : (
                      <Badge variant="outline" className={`${colorClasses.bg} ${colorClasses.text} ${colorClasses.border} text-xs`}>
                        ID: {material.marca_id.slice(0, 6)}
                      </Badge>
                    )
                  })()
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
