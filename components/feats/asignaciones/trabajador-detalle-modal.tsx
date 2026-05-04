"use client"

import { useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Pencil, Trash2, Plus, Package, Wrench } from "lucide-react"
import type {
  TrabajadorConAsignaciones, Asignacion, HerramientaAsignada,
} from "@/lib/types/feats/asignaciones/asignacion-types"

type ModalTab = "medios" | "herramientas"

interface TrabajadorDetalleModalProps {
  open: boolean
  onClose: () => void
  trabajador: TrabajadorConAsignaciones | null
  onAdd: () => void
  onEdit: (a: Asignacion) => void
  onDelete: (asignacionId: string) => void
  onAddHerramienta: () => void
  onEditHerramienta: (h: HerramientaAsignada) => void
  onDeleteHerramienta: (herramientaId: string) => void
  loading?: boolean
}

export function TrabajadorDetalleModal({
  open, onClose, trabajador,
  onAdd, onEdit, onDelete,
  onAddHerramienta, onEditHerramienta, onDeleteHerramienta,
  loading,
}: TrabajadorDetalleModalProps) {
  const [tab, setTab] = useState<ModalTab>("medios")

  if (!trabajador) return null

  const asignaciones = trabajador.asignaciones ?? []
  const herramientas = trabajador.herramientas ?? []

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

        {/* Tab switcher */}
        <div className="shrink-0 flex gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              tab === "medios"
                ? "bg-white shadow text-orange-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setTab("medios")}
          >
            <Package className="h-3.5 w-3.5" />
            Medios básicos
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              tab === "medios" ? "bg-orange-100 text-orange-700" : "bg-gray-200 text-gray-500"
            }`}>
              {asignaciones.length}
            </span>
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              tab === "herramientas"
                ? "bg-white shadow text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setTab("herramientas")}
          >
            <Wrench className="h-3.5 w-3.5" />
            Herramientas
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              tab === "herramientas" ? "bg-indigo-100 text-indigo-700" : "bg-gray-200 text-gray-500"
            }`}>
              {herramientas.length}
            </span>
          </button>
        </div>

        {/* Lista scrolleable */}
        <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
          {tab === "medios" && (
            asignaciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <Package className="h-10 w-10 text-gray-300" />
                <p className="text-gray-400 text-sm">Sin medios básicos asignados</p>
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {asignaciones.map(a => (
                  <div
                    key={a.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border border-gray-100 bg-white hover:bg-orange-50/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{a.nombre}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
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
            )
          )}

          {tab === "herramientas" && (
            herramientas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <Wrench className="h-10 w-10 text-gray-300" />
                <p className="text-gray-400 text-sm">Sin herramientas asignadas</p>
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {herramientas.map(h => (
                  <div
                    key={h.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border border-indigo-50 bg-white hover:bg-indigo-50/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{h.nombre}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        <span className="text-xs text-gray-500">
                          Cant.: <span className="font-medium text-gray-700">{h.cantidad}</span>
                        </span>
                        {h.precio != null && (
                          <span className="text-xs text-green-600 font-medium">${h.precio.toFixed(2)}</span>
                        )}
                        {h.numero_serie && (
                          <span className="text-xs text-gray-400">N/S: {h.numero_serie}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => onEditHerramienta(h)} disabled={loading}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => onDeleteHerramienta(h.id)} disabled={loading}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer fijo */}
        <div className="shrink-0 pt-3 border-t flex justify-between items-center">
          {tab === "medios" ? (
            <>
              <span className="text-xs text-gray-400">
                {asignaciones.length} asignación{asignaciones.length !== 1 ? "es" : ""}
              </span>
              <Button size="sm" onClick={onAdd} disabled={loading}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar medio básico
              </Button>
            </>
          ) : (
            <>
              <span className="text-xs text-gray-400">
                {herramientas.length} herramienta{herramientas.length !== 1 ? "s" : ""}
              </span>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={onAddHerramienta} disabled={loading}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar herramienta
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
