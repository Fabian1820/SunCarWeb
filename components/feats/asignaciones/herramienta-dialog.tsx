"use client"

import { useState, useRef, useEffect } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import { Search, X } from "lucide-react"
import type {
  HerramientaCatalogo, HerramientaAsignada,
  HerramientaAsignarData, HerramientaUpdateData,
} from "@/lib/types/feats/asignaciones/asignacion-types"

interface HerramientaDialogProps {
  open: boolean
  onClose: () => void
  trabajadorNombre: string
  trabajadorCI: string
  catalogo: HerramientaCatalogo[]
  herramienta?: HerramientaAsignada | null
  onSave: (ci: string, data: HerramientaAsignarData | HerramientaUpdateData, herramientaId?: string) => Promise<boolean>
  loading?: boolean
}

export function HerramientaDialog({
  open, onClose, trabajadorNombre, trabajadorCI,
  catalogo, herramienta, onSave, loading,
}: HerramientaDialogProps) {
  const isEdit = !!herramienta

  const [busqueda, setBusqueda] = useState("")
  const [seleccionada, setSeleccionada] = useState<HerramientaCatalogo | null>(null)
  const [comboOpen, setComboOpen] = useState(false)
  const comboRef = useRef<HTMLDivElement>(null)

  const [cantidad, setCantidad] = useState(String(herramienta?.cantidad ?? 1))
  const [numeroSerie, setNumeroSerie] = useState(herramienta?.numero_serie ?? "")

  useEffect(() => {
    if (open) {
      setBusqueda("")
      setSeleccionada(null)
      setComboOpen(false)
      setCantidad(String(herramienta?.cantidad ?? 1))
      setNumeroSerie(herramienta?.numero_serie ?? "")
    }
  }, [open, herramienta])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node))
        setComboOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filtrados = catalogo.filter(h =>
    h.nombre.toLowerCase().includes(busqueda.toLowerCase().trim()) ||
    h.codigo.toLowerCase().includes(busqueda.toLowerCase().trim())
  )

  const handleSave = async () => {
    const q = parseInt(cantidad)
    if (isEdit) {
      const data: HerramientaUpdateData = {}
      if (!isNaN(q) && q >= 1) data.cantidad = q
      data.numero_serie = numeroSerie.trim() || undefined
      await onSave(trabajadorCI, data, herramienta!.id)
    } else {
      const data: HerramientaAsignarData = {
        producto_id: seleccionada!.producto_id,
        cantidad: isNaN(q) || q < 1 ? 1 : q,
        numero_serie: numeroSerie.trim() || undefined,
      }
      await onSave(trabajadorCI, data)
    }
    onClose()
  }

  const canSave = isEdit ? parseInt(cantidad) >= 1 : !!seleccionada

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isEdit ? "Editar herramienta" : "Asignar herramienta"}
            <span className="ml-2 text-sm font-normal text-gray-400">— {trabajadorNombre}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Selector con buscador */}
          {!isEdit && (
            <div className="space-y-1.5" ref={comboRef}>
              <Label>Herramienta *</Label>

              {seleccionada ? (
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-md">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{seleccionada.nombre}</p>
                    <p className="text-xs text-gray-400">Cód: {seleccionada.codigo}{seleccionada.precio > 0 ? ` · $${seleccionada.precio.toFixed(2)}` : ""}</p>
                  </div>
                  <button onClick={() => setSeleccionada(null)} className="shrink-0 text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar por nombre o código..."
                    value={busqueda}
                    onFocus={() => setComboOpen(true)}
                    onChange={e => { setBusqueda(e.target.value); setComboOpen(true) }}
                    autoComplete="off"
                  />
                </div>
              )}

              {comboOpen && !seleccionada && (
                <div className="border border-gray-200 rounded-md shadow-lg bg-white max-h-52 overflow-y-auto">
                  {filtrados.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-gray-400">Sin resultados</div>
                  ) : (
                    filtrados.map(h => (
                      <button
                        key={h.producto_id}
                        className="w-full flex items-start justify-between gap-2 px-3 py-2.5 text-left hover:bg-indigo-50 transition-colors border-b last:border-0"
                        onMouseDown={e => { e.preventDefault(); setSeleccionada(h); setComboOpen(false); setBusqueda("") }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{h.nombre}</p>
                          <p className="text-xs text-gray-400">Cód: {h.codigo}</p>
                        </div>
                        {h.precio > 0 && (
                          <span className="text-xs text-green-600 shrink-0 mt-0.5">${h.precio.toFixed(2)}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {isEdit && (
            <div className="px-3 py-2 bg-gray-50 rounded-md border">
              <p className="text-sm font-medium">{herramienta!.nombre}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cantidad</Label>
              <Input type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>N° de serie (opcional)</Label>
              <Input placeholder="SN-001" value={numeroSerie} onChange={e => setNumeroSerie(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!canSave || loading}>
              {loading ? "Guardando..." : isEdit ? "Guardar" : "Asignar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
