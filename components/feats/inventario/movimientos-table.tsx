"use client"

import React from "react"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import { MaterialImage } from "@/components/shared/molecule/material-image"
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

const estadoClassNames: Record<string, string> = {
  aplicado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rechazado: "bg-red-50 text-red-700 border-red-200",
  nuevo: "bg-gray-50 text-gray-600 border-gray-200",
  procesando: "bg-amber-50 text-amber-700 border-amber-200",
  rollback: "bg-orange-50 text-orange-700 border-orange-200",
}

const referenciaTipoTitulo: Record<string, string> = {
  vale_salida: "Vale de salida",
  devolucion_vale: "Devolución de vale",
  solicitud_entrada: "Solicitud de entrada",
  solicitud_transferencia: "Solicitud de transferencia",
}

function formatFecha(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })
}

function formatBool(value: unknown): string | undefined {
  if (value === true) return "Sí"
  if (value === false) return "No"
  return undefined
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

  const selectedEmbedded = (selected?.material as Record<string, any> | undefined) || undefined
  const selectedFoto = (selectedMaterial?.foto as string | undefined) || (selectedEmbedded?.foto as string | undefined)
  const selectedCodigo = (selectedMaterial?.codigo as string | undefined) || (selectedEmbedded?.codigo as string | undefined) || selected?.material_codigo
  const selectedNombre = selectedMaterial?.nombre || (selectedEmbedded?.nombre as string | undefined)
  const selectedDescripcion = selectedMaterial?.descripcion || (selectedEmbedded?.descripcion as string | undefined) || selected?.material_descripcion
  const selectedUm = selectedMaterial?.um || (selectedEmbedded?.um as string | undefined)

  const refDetalleRows = useMemo(() => {
    const d = (selected?.referencia_detalle as Record<string, any> | undefined) || undefined
    const tipo = selected?.referencia_tipo
    if (!d || !tipo) return [] as { label: string; value?: string | number | null }[]
    const rows: { label: string; value?: string | number | null }[] = []
    if (tipo === "vale_salida" || tipo === "devolucion_vale") {
      rows.push({ label: "Código", value: d.codigo })
      rows.push({ label: "Estado", value: d.estado })
      rows.push({ label: "Tipo de solicitud", value: d.solicitud_tipo })
      rows.push({ label: "Recogido por", value: d.recogido_por })
      rows.push({ label: "Creado por (CI)", value: d.creado_por_ci })
      rows.push({ label: "Facturado", value: formatBool(d.facturado) })
      rows.push({ label: "Materiales", value: d.total_materiales })
      rows.push({ label: "Fecha de creación", value: formatFecha(d.fecha_creacion) })
    } else if (tipo === "solicitud_entrada") {
      rows.push({ label: "Origen", value: d.origen })
      rows.push({ label: "Estado", value: d.estado })
      rows.push({ label: "Almacén", value: d.almacen_id ? resolveAlmacenNombre(undefined, d.almacen_id) : undefined })
      rows.push({ label: "Compra", value: d.compra_id })
      rows.push({ label: "Consignación", value: d.consignacion_id })
      rows.push({ label: "Materiales", value: d.total_materiales })
      rows.push({ label: "Creado por (CI)", value: d.creado_por_ci })
      rows.push({ label: "Aprobado por (CI)", value: d.aprobado_por_ci })
      rows.push({ label: "Fecha de creación", value: formatFecha(d.fecha_creacion) })
      rows.push({ label: "Fecha de resolución", value: formatFecha(d.fecha_resolucion) })
    } else if (tipo === "solicitud_transferencia") {
      rows.push({ label: "Referencia", value: d.referencia })
      rows.push({ label: "Motivo", value: d.motivo })
      rows.push({ label: "Estado", value: d.estado })
      rows.push({ label: "Almacén origen", value: d.almacen_origen_id ? resolveAlmacenNombre(undefined, d.almacen_origen_id) : undefined })
      rows.push({ label: "Almacén destino", value: d.almacen_destino_id ? resolveAlmacenNombre(undefined, d.almacen_destino_id) : undefined })
      rows.push({ label: "Solicitante", value: d.solicitante })
      rows.push({ label: "Aprobador", value: d.aprobador })
      rows.push({ label: "Materiales", value: d.total_materiales })
      rows.push({ label: "Fecha de solicitud", value: formatFecha(d.fecha_solicitud) })
      rows.push({ label: "Fecha de resolución", value: formatFecha(d.fecha_resolucion) })
    }
    return rows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, almacenPorId])

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
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
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
              const embedded = (mov.material as Record<string, any> | undefined) || undefined
              const codigoMostrar = (material?.codigo as string | undefined) || (embedded?.codigo as string | undefined) || mov.material_codigo
              const nombreMaterial =
                material?.nombre ||
                material?.descripcion ||
                (embedded?.nombre as string | undefined) ||
                (embedded?.descripcion as string | undefined) ||
                mov.material_descripcion ||
                codigoMostrar
              const descripcion = material?.descripcion || (embedded?.descripcion as string | undefined) || mov.material_descripcion
              const fotoMaterial = (material?.foto as string | undefined) || (embedded?.foto as string | undefined)
              const fotoDisponibleMaterial = (material as { foto_disponible?: boolean | null } | undefined)?.foto_disponible

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
                    {mov.estado ? (
                      <Badge variant="outline" className={estadoClassNames[mov.estado] || "bg-gray-50 text-gray-700 border-gray-200"}>
                        {mov.estado}
                      </Badge>
                    ) : <span className="text-sm text-gray-400">-</span>}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {fotoMaterial && fotoDisponibleMaterial !== false ? (
                        <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-50 border border-gray-200">
                          <MaterialImage
                            foto={fotoMaterial}
                            fotoDisponible={fotoDisponibleMaterial}
                            alt={nombreMaterial}
                            imgClassName="w-full h-full object-contain p-0.5"
                            fallback={
                              <div className="w-full h-full flex items-center justify-center bg-amber-50">
                                <Package className="h-4 w-4 text-amber-700" />
                              </div>
                            }
                          />
                        </div>
                      ) : (
                        <div className="shrink-0 w-10 h-10 rounded-md bg-amber-100 flex items-center justify-center border border-amber-200">
                          <Package className="h-4 w-4 text-amber-700" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-mono text-gray-500">{codigoMostrar}</div>
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
                    <div className="text-sm text-gray-700">{mov.referencia_label || mov.referencia || mov.motivo || "-"}</div>
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
                  {selected.estado && (
                    <DetalleRow label="Estado">
                      <Badge variant="outline" className={estadoClassNames[selected.estado] || "bg-gray-50 text-gray-700 border-gray-200"}>
                        {selected.estado}
                      </Badge>
                    </DetalleRow>
                  )}
                  {selected.motivo_error && (
                    <DetalleRow label="Error" value={selected.motivo_error} />
                  )}
                  <DetalleRow label="Fecha" value={selected.fecha} />
                  <DetalleRow label="Cantidad" value={selected.cantidad != null ? `${selected.cantidad}${selected.um ? ` ${selected.um}` : ""}` : undefined} />
                  <DetalleRow label="Motivo" value={selected.motivo} />
                  <DetalleRow label="Referencia" value={selected.referencia_label || selected.referencia} />
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

              {/* Documento de referencia */}
              {refDetalleRows.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    {(selected.referencia_tipo && referenciaTipoTitulo[selected.referencia_tipo]) || "Documento de referencia"}
                  </h3>
                  <div className="bg-gray-50 rounded-lg px-4 py-1">
                    {refDetalleRows.map((row) => (
                      <DetalleRow key={row.label} label={row.label} value={row.value} />
                    ))}
                  </div>
                </div>
              )}

              {/* Material */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Material</h3>
                <div className="bg-gray-50 rounded-lg px-4 py-3">
                  {selectedFoto && (
                    <div className="mb-3 flex justify-center">
                      <div className="w-28 h-28 rounded-lg overflow-hidden bg-white border border-gray-200">
                        <img
                          src={selectedFoto}
                          alt={selectedNombre || selectedDescripcion || selectedCodigo}
                          className="w-full h-full object-contain p-2"
                        />
                      </div>
                    </div>
                  )}
                  <DetalleRow label="Código" value={selectedCodigo} />
                  <DetalleRow label="Nombre" value={selectedNombre} />
                  <DetalleRow label="Descripción" value={selectedDescripcion} />
                  <DetalleRow label="Categoría" value={selectedMaterial?.categoria} />
                  <DetalleRow label="Unidad" value={selectedUm} />
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
