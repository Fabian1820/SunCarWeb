"use client"

import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Edit, Trash2, Package, Eye } from "lucide-react"
import type { Almacen } from "@/lib/inventario-types"

interface AlmacenesTableProps {
  almacenes: Almacen[]
  onEdit: (almacen: Almacen) => void
  onDelete: (id: string) => void
  onView?: (almacen: Almacen) => void
}

export function AlmacenesTable({ almacenes, onEdit, onDelete, onView }: AlmacenesTableProps) {
  if (almacenes.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay almacenes registrados</h3>
        <p className="text-gray-600">Crea el primer almacen para gestionar el inventario.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Nombre</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Codigo</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Direccion</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {almacenes.map((almacen, index) => (
            <tr
              key={almacen.id || `${almacen.nombre || "almacen"}-${almacen.codigo || "sin-codigo"}-${index}`}
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              <td className="py-4 px-4">
                <div className="font-semibold text-gray-900">{almacen.nombre}</div>
                {almacen.responsable ? (
                  <div className="text-sm text-gray-600">Responsable: {almacen.responsable}</div>
                ) : null}
              </td>
              <td className="py-4 px-4">
                <span className="text-sm text-gray-700">{almacen.codigo || "-"}</span>
              </td>
              <td className="py-4 px-4">
                <span className="text-sm text-gray-700">{almacen.direccion || "-"}</span>
              </td>
              <td className="py-4 px-4">
                <Badge
                  variant="outline"
                  className={
                    almacen.activo === false
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-green-50 text-green-700 border-green-200"
                  }
                >
                  {almacen.activo === false ? "Inactivo" : "Activo"}
                </Badge>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center space-x-2">
                  {onView ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(almacen)}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                      title="Ver almacén"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(almacen)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    title="Editar almacen"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => almacen.id && onDelete(almacen.id)}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    title="Eliminar almacen"
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
