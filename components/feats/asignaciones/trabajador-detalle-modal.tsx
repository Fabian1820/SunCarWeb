"use client"

import { useMemo } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Pencil, Trash2, Plus, Package } from "lucide-react"
import type { TrabajadorConAsignaciones, Asignacion } from "@/lib/types/feats/asignaciones/asignacion-types"

interface TrabajadorDetalleModalProps {
  open: boolean
  onClose: () => void
  trabajador: TrabajadorConAsignaciones | null
  onAdd: () => void
  onEdit: (a: Asignacion) => void
  onDelete: (a: Asignacion) => void
  loading?: boolean
}

const money = (n?: number | null) =>
  n == null || isNaN(Number(n)) ? "—" : `$${Number(n).toFixed(2)}`

const fmtFecha = (s?: string | null) => {
  if (!s) return "—"
  const d = new Date(s)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("es-CU", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function TrabajadorDetalleModal({
  open, onClose, trabajador,
  onAdd, onEdit, onDelete, loading,
}: TrabajadorDetalleModalProps) {
  if (!trabajador) return null

  const asignaciones = trabajador.asignaciones ?? []

  const totales = useMemo(() => {
    return asignaciones.reduce(
      (acc, a) => {
        const costoTotal = (a.costo ?? 0) * a.cantidad
        acc.costo += costoTotal
        acc.depMensual += (a.depreciacion_mensual ?? 0) * a.cantidad
        acc.depAcum += a.valor_depreciado ?? 0
        acc.residual += a.valor_residual ?? 0
        return acc
      },
      { costo: 0, depMensual: 0, depAcum: 0, residual: 0 }
    )
  }, [asignaciones])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <span>{trabajador.nombre}</span>
            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              CI: {trabajador.CI}
            </span>
          </DialogTitle>
          <p className="text-sm text-gray-500">{trabajador.cargo}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
          {asignaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <Package className="h-10 w-10 text-gray-300" />
              <p className="text-gray-400 text-sm">Sin recursos asignados</p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {asignaciones.map(a => {
                const costoTotal = (a.costo ?? 0) * a.cantidad
                return (
                  <div
                    key={a.id}
                    className="rounded-lg border border-gray-100 bg-white hover:bg-emerald-50/30 transition-colors p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="font-medium text-sm truncate">{a.nombre}</p>
                          <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            a.item_tipo === 'medio_basico'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {a.item_tipo === 'medio_basico' ? 'Medio básico' : 'Material'}
                          </span>
                          {a.numero_serie && (
                            <span className="text-xs text-gray-400 font-mono">N/S: {a.numero_serie}</span>
                          )}
                        </div>
                        {a.descripcion && (
                          <p className="text-xs text-gray-500 italic mb-1.5 truncate">
                            "{a.descripcion}"
                          </p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-1 text-xs">
                          <span className="text-gray-500">
                            Cant.: <span className="font-semibold text-gray-700">{a.cantidad}</span>
                          </span>
                          <span className="text-gray-500">
                            Asignado: <span className="font-medium text-gray-700">{fmtFecha(a.fecha_asignacion)}</span>
                          </span>
                          <span className="text-gray-500">
                            Costo unit.: <span className="font-medium text-gray-700">{money(a.costo)}</span>
                          </span>
                          <span className="text-gray-500">
                            Dep. mensual: <span className="font-medium text-amber-700">{money(a.depreciacion_mensual)}</span>
                          </span>
                          <span className="text-gray-500">
                            Depreciado: <span className="font-medium text-amber-700">{money(a.valor_depreciado)}</span>
                          </span>
                          <span className="text-gray-500">
                            Residual: <span className="font-semibold text-emerald-700">{money(a.valor_residual)}</span>
                          </span>
                          <span className="col-span-2 md:col-span-3 text-gray-500">
                            Costo total: <span className="font-medium text-gray-800">{money(costoTotal)}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => onEdit(a)} disabled={loading}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => onDelete(a)} disabled={loading}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Totales contables del trabajador */}
              <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/40 p-3 mt-3">
                <p className="text-xs font-semibold text-emerald-900 mb-2 uppercase tracking-wide">
                  Resumen contable
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1.5 text-xs">
                  <div>
                    <p className="text-gray-500">Costo total</p>
                    <p className="font-semibold text-gray-800">{money(totales.costo)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Dep. mensual</p>
                    <p className="font-semibold text-amber-700">{money(totales.depMensual)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Dep. acumulada</p>
                    <p className="font-semibold text-amber-700">{money(totales.depAcum)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Valor residual</p>
                    <p className="font-semibold text-emerald-700">{money(totales.residual)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 pt-3 border-t flex justify-between items-center">
          <span className="text-xs text-gray-400">
            {asignaciones.length} recurso{asignaciones.length !== 1 ? "s" : ""} asignado{asignaciones.length !== 1 ? "s" : ""}
          </span>
          <Button size="sm" onClick={onAdd} disabled={loading}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar recurso
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
