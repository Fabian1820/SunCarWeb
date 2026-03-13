"use client"

import React from "react"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { ArrowLeftRight, ClipboardList, Package, Eye } from "lucide-react"
import type { MovimientoInventario, Almacen } from "@/lib/inventario-types"
import type { Material } from "@/lib/material-types"
import { useMemo, useState } from "react"

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

function DetalleRow({ label, value, children }: { label: string; value?: string | number | null; children?: React.ReactNode }) {
  if (!children && (value === undefined || value === null || value === "" || value === "-")) return null
  return (
    <div className="flex gap-2 py-1.5 border-b border-gray-100 last:border-0 items-start">
      <span className="text-sm text-gray-500 w-36 shrink-0">{label}</span>
      {children ? <div className="min-w-0">{children}</div> : <span className="text-sm text-gray-900 break-words min-w-0">{value}</span>}
    </div>
  )
}

export function MovimientosTable({ movimientos, materials = [], almacenes = [] }: MovimientosTableProps) {
  const [selected, setSelected] = useState<MovimientoInventario | null>(null)

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

  const selectedMaterial = useMemo(() => {
    if (!selected) return undefined
    const codigo = String(selected.material_codigo || "").trim().toLowerCase()
    return materialPorCodigo.get(codigo)
  }, [selected, materialPorCodigo])

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
    <>
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
              <th className="py-3 px-4" />
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
                  <td className="py-3 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-gray-500 hover:text-gray-900"
                      onClick={() => setSelected(mov)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      <span className="text-xs">Detalles</span>
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del movimiento</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              {/* Movimiento */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Movimiento</h3>
                <div className="bg-gray-50 rounded-lg px-4 py-1">
                  <DetalleRow label="Tipo">
                    <Badge variant="outline" className={tipoClassNames[selected.tipo] || "bg-gray-50 text-gray-700 border-gray-200"}>
                      {selected.tipo}
                    </Badge>
                  </DetalleRow>
                  <DetalleRow label="Fecha" value={selected.fecha} />
                  <DetalleRow label="Cantidad" value={selected.cantidad != null ? `${selected.cantidad}${selected.um ? ` ${selected.um}` : ""}` : undefined} />
                  <DetalleRow label="Motivo" value={selected.motivo} />
                  <DetalleRow label="Referencia" value={selected.referencia} />
                  <DetalleRow label="Usuario" value={selected.usuario} />
                  {selected.tipo === "transferencia" ? (
                    <>
                      <DetalleRow label="Almacén origen" value={resolveAlmacenNombre(selected.almacen_origen_nombre, selected.almacen_origen_id)} />
                      <DetalleRow label="Almacén destino" value={resolveAlmacenNombre(selected.almacen_destino_nombre, selected.almacen_destino_id)} />
                    </>
                  ) : selected.tipo === "venta" ? (
                    <DetalleRow label="Tienda" value={selected.tienda_nombre || selected.tienda_id} />
                  ) : (
                    <DetalleRow label="Almacén" value={resolveAlmacenNombre(selected.almacen_origen_nombre, selected.almacen_origen_id)} />
                  )}
                </div>
              </div>

              {/* Material */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Material</h3>
                <div className="bg-gray-50 rounded-lg px-4 py-3">
                  {selectedMaterial?.foto && (
                    <div className="mb-3 flex justify-center">
                      <div className="w-28 h-28 rounded-lg overflow-hidden bg-white border border-gray-200">
                        <img
                          src={selectedMaterial.foto}
                          alt={selectedMaterial.nombre || selectedMaterial.descripcion}
                          className="w-full h-full object-contain p-2"
                        />
                      </div>
                    </div>
                  )}
                  <DetalleRow label="Código" value={selected.material_codigo} />
                  <DetalleRow label="Nombre" value={selectedMaterial?.nombre} />
                  <DetalleRow label="Descripción" value={selectedMaterial?.descripcion || selected.material_descripcion} />
                  <DetalleRow label="Categoría" value={selectedMaterial?.categoria} />
                  <DetalleRow label="Unidad" value={selectedMaterial?.um} />
                  <DetalleRow label="Precio" value={selectedMaterial?.precio != null ? `$${selectedMaterial.precio}` : undefined} />
                  <DetalleRow label="Potencia" value={selectedMaterial?.potenciaKW != null ? `${selectedMaterial.potenciaKW} kW` : undefined} />
                  {selectedMaterial?.especificaciones && Object.keys(selectedMaterial.especificaciones).length > 0 && (
                    <div className="py-1.5 border-b border-gray-100">
                      <span className="text-sm text-gray-500 block mb-1">Especificaciones</span>
                      <div className="space-y-0.5 pl-2">
                        {Object.entries(selectedMaterial.especificaciones).map(([k, v]) => (
                          <div key={k} className="text-sm text-gray-900">
                            <span className="text-gray-500">{k}:</span> {v}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
