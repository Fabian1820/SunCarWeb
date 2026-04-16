"use client"

import { useMemo } from "react"
import { Package } from "lucide-react"
import type { StockItem } from "@/lib/inventario-types"
import type { Almacen } from "@/lib/inventario-types"

interface InventarioCruzadoTableProps {
  stock: StockItem[]
  almacenes: Almacen[]
  search?: string
}

export function InventarioCruzadoTable({ stock, almacenes, search }: InventarioCruzadoTableProps) {
  const { rows, almacenesConStock } = useMemo(() => {
    const almacenesConStockIds = new Set(stock.map(item => item.almacen_id))
    const almacenesConStock = almacenes.filter(a => a.id && almacenesConStockIds.has(a.id))

    const materialMap = new Map<string, {
      codigo: string
      descripcion: string
      porAlmacen: Map<string, number>
    }>()

    for (const item of stock) {
      const key = String(item.material_codigo)
      if (!materialMap.has(key)) {
        materialMap.set(key, {
          codigo: item.material_codigo,
          descripcion: item.material_descripcion || "",
          porAlmacen: new Map(),
        })
      }
      const entry = materialMap.get(key)!
      const prev = entry.porAlmacen.get(item.almacen_id) ?? 0
      entry.porAlmacen.set(item.almacen_id, prev + item.cantidad)
    }

    let rows = Array.from(materialMap.values()).sort((a, b) =>
      String(a.codigo).localeCompare(String(b.codigo))
    )

    if (search?.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(r =>
        String(r.codigo).toLowerCase().includes(q) ||
        r.descripcion.toLowerCase().includes(q)
      )
    }

    return { rows, almacenesConStock }
  }, [stock, almacenes, search])

  if (rows.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin stock disponible</h3>
        <p className="text-gray-600">No hay existencias registradas en los almacenes.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-3 font-semibold text-gray-900 min-w-[120px]">Código</th>
            <th className="text-left py-3 px-3 font-semibold text-gray-900 min-w-[200px]">Descripción</th>
            {almacenesConStock.map(almacen => (
              <th key={almacen.id} className="text-center py-3 px-3 font-semibold text-gray-900 min-w-[110px]">
                {almacen.nombre}
              </th>
            ))}
            <th className="text-center py-3 px-3 font-semibold text-gray-900 min-w-[80px] bg-amber-50">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const total = Array.from(row.porAlmacen.values()).reduce((s, v) => s + v, 0)
            return (
              <tr key={`${row.codigo}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-3 font-semibold text-gray-900">{row.codigo}</td>
                <td className="py-3 px-3 text-gray-700">{row.descripcion || "Sin descripción"}</td>
                {almacenesConStock.map(almacen => {
                  const cant = row.porAlmacen.get(almacen.id!) ?? 0
                  return (
                    <td key={almacen.id} className="py-3 px-3 text-center">
                      {cant > 0 ? (
                        <span className="inline-flex rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-xs font-semibold">
                          {cant}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  )
                })}
                <td className="py-3 px-3 text-center bg-amber-50">
                  <span className="inline-flex rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-2 py-1 text-xs font-semibold">
                    {total}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
