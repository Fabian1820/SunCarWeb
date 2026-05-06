"use client"

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
  onDelete: (asignacionId: string) => void
  loading?: boolean
}

export function TrabajadorDetalleModal({
  open, onClose, trabajador,
  onAdd, onEdit, onDelete, loading,
}: TrabajadorDetalleModalProps) {
  if (!trabajador) return null

  const asignaciones = trabajador.asignaciones ?? []

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
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
              {asignaciones.map(a => (
                <div
                  key={a.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg border border-gray-100 bg-white hover:bg-orange-50/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-sm truncate">{a.nombre}</p>
                      <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        a.item_tipo === 'medio_basico'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {a.item_tipo === 'medio_basico' ? 'Medio básico' : 'Material'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className="text-xs text-gray-500">
                        Cant.: <span className="font-medium text-gray-700">{a.cantidad}</span>
                      </span>
                      {a.precio != null && (
                        <span className="text-xs text-green-600 font-medium">${a.precio.toFixed(2)}</span>
                      )}
                      {a.numero_serie && (
                        <span className="text-xs text-gray-400">N/S: {a.numero_serie}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => onEdit(a)} disabled={loading}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(a.id)} disabled={loading}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
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
