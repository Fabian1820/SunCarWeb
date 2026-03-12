"use client"

import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import {
  Package,
  Trash2,
  Eye,
  Calendar,
  User,
  Warehouse,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import type { SolicitudMaterial } from "@/lib/api-types"
import { useState } from "react"

interface SolicitudesMaterialesTableProps {
  solicitudes: SolicitudMaterial[]
  onDelete?: (solicitud: SolicitudMaterial) => void
  onView?: (solicitud: SolicitudMaterial) => void
  loading?: boolean
}

export function SolicitudesMaterialesTable({
  solicitudes,
  onDelete,
  onView,
}: SolicitudesMaterialesTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—"
    try {
      return new Date(dateStr).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } catch {
      return "—"
    }
  }

  if (solicitudes.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No hay solicitudes de materiales
        </h3>
        <p className="text-gray-600">
          No se encontraron solicitudes que coincidan con los filtros aplicados.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Código
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Cliente
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Almacén
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Creador
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Materiales
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Fecha
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.map((solicitud) => {
            const isExpanded = expandedId === solicitud.id
            return (
              <tr
                key={solicitud.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-4 px-4">
                  <Badge
                    variant="outline"
                    className="bg-purple-50 text-purple-700 border-purple-200 font-mono"
                  >
                    {solicitud.codigo || solicitud.id.slice(-6).toUpperCase()}
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  {solicitud.cliente_nombre ? (
                    <div>
                      <p className="font-semibold text-gray-900">
                        {solicitud.cliente_nombre}
                      </p>
                      {solicitud.cliente_numero && (
                        <p className="text-xs text-gray-500">
                          N° {solicitud.cliente_numero}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">Sin cliente</span>
                  )}
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5">
                    <Warehouse className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      {solicitud.almacen_nombre || "—"}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      {solicitud.trabajador_nombre || "—"}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <button
                    onClick={() => toggleExpand(solicitud.id)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Package className="h-4 w-4" />
                    <span>{solicitud.materiales?.length || 0} items</span>
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                  {isExpanded && solicitud.materiales?.length > 0 && (
                    <div className="mt-2 bg-gray-50 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                      {solicitud.materiales.map((mat, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between text-xs text-gray-600"
                        >
                          <span className="truncate max-w-[200px]">
                            {mat.descripcion || mat.codigo || mat.material_id}
                          </span>
                          <span className="font-medium text-gray-800 ml-2 whitespace-nowrap">
                            x{mat.cantidad} {mat.um || ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      {formatDate(solicitud.fecha_creacion)}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    {onView && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView(solicitud)}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(solicitud)}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        title="Eliminar solicitud"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
