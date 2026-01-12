"use client"

import { Badge } from "@/components/shared/atom/badge"
import { ArrowLeftRight, ClipboardList } from "lucide-react"
import type { MovimientoInventario } from "@/lib/inventario-types"

interface MovimientosTableProps {
  movimientos: MovimientoInventario[]
}

const tipoClassNames: Record<string, string> = {
  entrada: "bg-emerald-50 text-emerald-700 border-emerald-200",
  salida: "bg-red-50 text-red-700 border-red-200",
  transferencia: "bg-blue-50 text-blue-700 border-blue-200",
  ajuste: "bg-amber-50 text-amber-700 border-amber-200",
  venta: "bg-purple-50 text-purple-700 border-purple-200",
}

export function MovimientosTable({ movimientos }: MovimientosTableProps) {
  if (movimientos.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin movimientos registrados</h3>
        <p className="text-gray-600">Registra entradas, salidas o ventas para ver el historial.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Tipo</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Material</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Cantidad</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Origen/Destino</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Referencia</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((mov, index) => (
            <tr key={mov.id || `${mov.material_codigo}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-4 px-4">
                <span className="text-sm text-gray-700">{mov.fecha || "-"}</span>
              </td>
              <td className="py-4 px-4">
                <Badge variant="outline" className={tipoClassNames[mov.tipo] || "bg-gray-50 text-gray-700 border-gray-200"}>
                  {mov.tipo}
                </Badge>
              </td>
              <td className="py-4 px-4">
                <div className="font-semibold text-gray-900">{mov.material_codigo}</div>
                <div className="text-sm text-gray-600">{mov.material_descripcion || "Sin descripcion"}</div>
              </td>
              <td className="py-4 px-4">
                <span className="text-sm font-semibold text-gray-900">{mov.cantidad}</span>
                {mov.um ? <span className="text-xs text-gray-500 ml-2">{mov.um}</span> : null}
              </td>
              <td className="py-4 px-4">
                {mov.tipo === "transferencia" ? (
                  <div className="flex items-center text-sm text-gray-700">
                    <span>{mov.almacen_origen_nombre || mov.almacen_origen_id || "-"}</span>
                    <ArrowLeftRight className="h-4 w-4 mx-2 text-gray-400" />
                    <span>{mov.almacen_destino_nombre || mov.almacen_destino_id || "-"}</span>
                  </div>
                ) : mov.tipo === "venta" ? (
                  <span className="text-sm text-gray-700">{mov.tienda_nombre || mov.tienda_id || "-"}</span>
                ) : (
                  <span className="text-sm text-gray-700">{mov.almacen_origen_nombre || mov.almacen_origen_id || "-"}</span>
                )}
              </td>
              <td className="py-4 px-4">
                <div className="text-sm text-gray-700">{mov.referencia || mov.motivo || "-"}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
