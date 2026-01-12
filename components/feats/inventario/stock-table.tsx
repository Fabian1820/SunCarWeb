"use client"

import { Package } from "lucide-react"
import type { StockItem } from "@/lib/inventario-types"

interface StockTableProps {
  stock: StockItem[]
}

export function StockTable({ stock }: StockTableProps) {
  if (stock.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin stock disponible</h3>
        <p className="text-gray-600">Registra movimientos para ver el inventario actualizado.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Almacen</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Material</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Unidad</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {stock.map((item, index) => (
            <tr key={item.id || `${item.almacen_id}-${item.material_codigo}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-4 px-4">
                <div className="font-semibold text-gray-900">{item.almacen_nombre || item.almacen_id}</div>
              </td>
              <td className="py-4 px-4">
                <div className="font-semibold text-gray-900">{item.material_codigo}</div>
                <div className="text-sm text-gray-600">{item.material_descripcion || "Sin descripcion"}</div>
              </td>
              <td className="py-4 px-4">
                <span className="text-sm text-gray-700">{item.um || "-"}</span>
              </td>
              <td className="py-4 px-4">
                <span className="text-sm font-semibold text-gray-900">{item.cantidad}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
