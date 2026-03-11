"use client"

import { Badge } from "@/components/shared/atom/badge"
import { ArrowLeftRight, ClipboardList, Package } from "lucide-react"
import type { MovimientoInventario, Almacen } from "@/lib/inventario-types"
import type { Material } from "@/lib/material-types"
import { useMemo } from "react"

interface MovimientosTableProps {
  movimientos: MovimientoInventario[]
  materials?: Material[]
  almacenes?: Almacen[]
}

const tipoClassNames: Record<string, string> = {
  entrada: "bg-emerald-50 text-emerald-700 border-emerald-200",
  salida: "bg-red-50 text-red-700 border-red-200",
  transferencia: "bg-blue-50 text-blue-700 border-blue-200",
  ajuste: "bg-amber-50 text-amber-700 border-amber-200",
  venta: "bg-purple-50 text-purple-700 border-purple-200",
}

export function MovimientosTable({ movimientos, materials = [], almacenes = [] }: MovimientosTableProps) {
  const materialPorCodigo = useMemo(() => {
    const map = new Map<string, Material>()
    for (const m of materials) {
      map.set(String(m.codigo).trim().toLowerCase(), m)
    }
    return map
  }, [materials])

  const almacenPorId = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of almacenes) {
      if (a.id) map.set(a.id, a.nombre)
    }
    return map
  }, [almacenes])

  const resolveAlmacenNombre = (nombre?: string, id?: string) => {
    if (nombre) return nombre
    if (id) return almacenPorId.get(id) || id
    return "-"
  }

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
          {movimientos.map((mov, index) => {
            const codigo = String(mov.material_codigo || "").trim().toLowerCase()
            const material = materialPorCodigo.get(codigo)
            const nombreMaterial = material?.nombre || material?.descripcion || mov.material_descripcion || mov.material_codigo
            const descripcion = material?.descripcion || mov.material_descripcion

            return (
              <tr key={mov.id || `${mov.material_codigo}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <span className="text-sm text-gray-700">{mov.fecha || "-"}</span>
                </td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className={tipoClassNames[mov.tipo] || "bg-gray-50 text-gray-700 border-gray-200"}>
                    {mov.tipo}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {material?.foto ? (
                      <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-50 border border-gray-200">
                        <img
                          src={material.foto}
                          alt={nombreMaterial}
                          className="w-full h-full object-contain p-0.5"
                        />
                      </div>
                    ) : (
                      <div className="shrink-0 w-10 h-10 rounded-md bg-amber-100 flex items-center justify-center border border-amber-200">
                        <Package className="h-4 w-4 text-amber-700" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-gray-500">{mov.material_codigo}</div>
                      <div className="text-sm font-semibold text-gray-900 leading-tight truncate max-w-[200px]">{nombreMaterial}</div>
                      {descripcion && descripcion !== nombreMaterial && (
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{descripcion}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm font-semibold text-gray-900">{mov.cantidad}</span>
                  {mov.um ? <span className="text-xs text-gray-500 ml-1">{mov.um}</span> : null}
                </td>
                <td className="py-3 px-4">
                  {mov.tipo === "transferencia" ? (
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <span className="truncate max-w-[100px]">{resolveAlmacenNombre(mov.almacen_origen_nombre, mov.almacen_origen_id)}</span>
                      <ArrowLeftRight className="h-3 w-3 shrink-0 text-gray-400" />
                      <span className="truncate max-w-[100px]">{resolveAlmacenNombre(mov.almacen_destino_nombre, mov.almacen_destino_id)}</span>
                    </div>
                  ) : mov.tipo === "venta" ? (
                    <span className="text-sm text-gray-700">{mov.tienda_nombre || mov.tienda_id || "-"}</span>
                  ) : (
                    <span className="text-sm text-gray-700">{resolveAlmacenNombre(mov.almacen_origen_nombre, mov.almacen_origen_id)}</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm text-gray-700">{mov.referencia || mov.motivo || "-"}</div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
