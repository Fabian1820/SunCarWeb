"use client"

import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Edit, Trash2, ShoppingBag, Eye } from "lucide-react"
import type { Tienda } from "@/lib/inventario-types"

interface TiendasTableProps {
  tiendas: Tienda[]
  onEdit: (tienda: Tienda) => void
  onDelete: (id: string) => void
  onView?: (tienda: Tienda) => void
}

export function TiendasTable({ tiendas, onEdit, onDelete, onView }: TiendasTableProps) {
  if (tiendas.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay tiendas registradas</h3>
        <p className="text-gray-600">Registra las sucursales para vincularlas a un almacen.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Tienda</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Codigo</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Almacen</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {tiendas.map((tienda) => (
            <tr key={tienda.id || tienda.nombre} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-4 px-4">
                <div className="font-semibold text-gray-900">{tienda.nombre}</div>
                {tienda.direccion ? (
                  <div className="text-sm text-gray-600">{tienda.direccion}</div>
                ) : null}
              </td>
              <td className="py-4 px-4">
                <span className="text-sm text-gray-700">{tienda.codigo || "-"}</span>
              </td>
              <td className="py-4 px-4">
                <span className="text-sm text-gray-700">{tienda.almacen_nombre || tienda.almacen_id}</span>
              </td>
              <td className="py-4 px-4">
                <Badge
                  variant="outline"
                  className={
                    tienda.activo === false
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-green-50 text-green-700 border-green-200"
                  }
                >
                  {tienda.activo === false ? "Inactiva" : "Activa"}
                </Badge>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center space-x-2">
                  {onView ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(tienda)}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                      title="Ver tienda"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(tienda)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    title="Editar tienda"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => tienda.id && onDelete(tienda.id)}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    title="Eliminar tienda"
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
