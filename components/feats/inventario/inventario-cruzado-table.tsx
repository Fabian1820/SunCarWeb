"use client"

import { useMemo } from "react"
import { Package } from "lucide-react"
import type { StockItem, Almacen } from "@/lib/inventario-types"
import type { Material } from "@/lib/material-types"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/shared/molecule/tooltip"

interface MarcaItem {
  id: string
  nombre: string
}

interface InventarioCruzadoTableProps {
  stock: StockItem[]
  almacenes: Almacen[]
  materials?: Material[]
  marcas?: MarcaItem[]
}

const normalizarCodigo = (codigo: string) => codigo.trim().toLowerCase()

export function InventarioCruzadoTable({
  stock,
  almacenes,
  materials = [],
  marcas = [],
}: InventarioCruzadoTableProps) {
  const materialPorCodigo = useMemo(() => {
    const map = new Map<string, Material>()
    for (const m of materials) {
      map.set(normalizarCodigo(String(m.codigo)), m)
    }
    return map
  }, [materials])

  const marcaPorId = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of marcas) {
      map.set(m.id, m.nombre)
    }
    return map
  }, [marcas])

  const { rows, almacenesConStock } = useMemo(() => {
    const almacenesConStockIds = new Set(stock.map(item => item.almacen_id))
    const almacenesConStock = almacenes.filter(a => a.id && almacenesConStockIds.has(a.id))

    const materialMap = new Map<string, {
      codigo: string
      descripcion: string
      porAlmacen: Map<string, number>
    }>()

    for (const item of stock) {
      const key = normalizarCodigo(String(item.material_codigo))
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

    return { rows, almacenesConStock }
  }, [stock, almacenes, materialPorCodigo])

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
    <TooltipProvider>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[60px]">Foto</th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900">Nombre</th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[120px]">Código</th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[90px]">Potencia</th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[110px]">Marca</th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[110px]">Categoría</th>
              {almacenesConStock.map(almacen => (
                <th
                  key={almacen.id}
                  className="text-center py-3 px-2 font-semibold text-gray-900 w-[100px]"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="truncate block cursor-default">{almacen.nombre}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{almacen.nombre}</p>
                    </TooltipContent>
                  </Tooltip>
                </th>
              ))}
              <th className="text-center py-3 px-2 font-semibold text-gray-900 w-[80px] bg-amber-50">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const material = materialPorCodigo.get(normalizarCodigo(row.codigo))
              const marcaNombre = material?.marca_id
                ? (marcaPorId.get(material.marca_id) ?? `ID: ${material.marca_id.slice(0, 6)}`)
                : null
              const nombreMaterial =
                material?.nombre ||
                material?.descripcion ||
                row.descripcion ||
                "Sin nombre"
              const total = Array.from(row.porAlmacen.values()).reduce((s, v) => s + v, 0)

              return (
                <tr
                  key={`${row.codigo}-${index}`}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  {/* Foto */}
                  <td className="py-3 px-2">
                    {material?.foto ? (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
                        <img
                          src={material.foto}
                          alt={nombreMaterial}
                          className="w-full h-full object-contain p-1"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center border border-amber-200">
                        <Package className="h-5 w-5 text-amber-700" />
                      </div>
                    )}
                  </td>

                  {/* Nombre */}
                  <td className="py-3 px-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-sm font-medium text-gray-900 truncate cursor-help">
                          {nombreMaterial}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{nombreMaterial}</p>
                      </TooltipContent>
                    </Tooltip>
                  </td>

                  {/* Código */}
                  <td className="py-3 px-2">
                    <div className="text-sm font-semibold text-gray-900">{row.codigo}</div>
                  </td>

                  {/* Potencia */}
                  <td className="py-3 px-2">
                    <span className="text-sm text-gray-700">
                      {material?.potenciaKW ? `${material.potenciaKW} KW` : "—"}
                    </span>
                  </td>

                  {/* Marca */}
                  <td className="py-3 px-2">
                    <span className="text-sm text-gray-700">{marcaNombre || "—"}</span>
                  </td>

                  {/* Categoría */}
                  <td className="py-3 px-2">
                    <span className="text-sm text-gray-700">
                      {material?.categoria || (row as any).categoria || "—"}
                    </span>
                  </td>

                  {/* Cantidad por almacén */}
                  {almacenesConStock.map(almacen => {
                    const cant = row.porAlmacen.get(almacen.id!) ?? 0
                    return (
                      <td key={almacen.id} className="py-3 px-2 text-center">
                        {cant > 0 ? (
                          <span className="inline-flex rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-sm font-semibold">
                            {cant}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    )
                  })}

                  {/* Total */}
                  <td className="py-3 px-2 text-center bg-amber-50">
                    <span className="inline-flex rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-2 py-1 text-sm font-semibold">
                      {total}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  )
}
