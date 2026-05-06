"use client"

import { useState, useRef, useEffect } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import { Search, Check, X } from "lucide-react"
import type { MedioBasico, Asignacion, AsignacionCreateData, AsignacionUpdateData } from "@/lib/types/feats/asignaciones/asignacion-types"

// Este componente está obsoleto — usar AsignacionRecursosDialog en su lugar

interface AsignacionDialogProps {
  open: boolean
  onClose: () => void
  trabajadorNombre: string
  trabajadorCI: string
  mediosBasicos: MedioBasico[]
  asignacion?: Asignacion | null
  onSave: (ci: string, data: AsignacionCreateData | AsignacionUpdateData, asignacionId?: string) => Promise<boolean>
  loading?: boolean
}

export function AsignacionDialog({
  open, onClose, trabajadorNombre, trabajadorCI,
  mediosBasicos, asignacion, onSave, loading,
}: AsignacionDialogProps) {
  const isEdit = !!asignacion
  const [mode, setMode] = useState<"existente" | "nuevo">("existente")

  // Combobox state
  const [busqueda, setBusqueda] = useState("")
  const [medioSeleccionado, setMedioSeleccionado] = useState<MedioBasico | null>(null)
  const [comboOpen, setComboOpen] = useState(false)
  const comboRef = useRef<HTMLDivElement>(null)

  // Form state
  const [nuevoNombre, setNuevoNombre] = useState("")
  const [nuevoPrecio, setNuevoPrecio] = useState("")
  const [cantidad, setCantidad] = useState(String(asignacion?.cantidad ?? 1))
  const [numeroSerie, setNumeroSerie] = useState(asignacion?.numero_serie ?? "")

  // Reset on open
  useEffect(() => {
    if (open) {
      setMode("existente")
      setBusqueda("")
      setMedioSeleccionado(null)
      setComboOpen(false)
      setNuevoNombre("")
      setNuevoPrecio("")
      setCantidad(String(asignacion?.cantidad ?? 1))
      setNumeroSerie(asignacion?.numero_serie ?? "")
    }
  }, [open, asignacion])

  // Cierra combo al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filteredMedios = mediosBasicos.filter(m =>
    m.nombre.toLowerCase().includes(busqueda.toLowerCase().trim())
  )

  const selectMedio = (m: MedioBasico) => {
    setMedioSeleccionado(m)
    setBusqueda("")
    setComboOpen(false)
  }

  const clearMedio = () => {
    setMedioSeleccionado(null)
    setBusqueda("")
  }

  const handleSave = async () => {
    if (isEdit) {
      const data: AsignacionUpdateData = {}
      const q = parseInt(cantidad)
      if (!isNaN(q) && q >= 1) data.cantidad = q
      data.numero_serie = numeroSerie.trim() || undefined
      await onSave(trabajadorCI, data, asignacion!.id)
    } else {
      const q = parseInt(cantidad)
      const data: AsignacionCreateData = {
        item_tipo: 'medio_basico',
        item_id: medioSeleccionado?.id ?? nuevoNombre.trim(),
        cantidad: isNaN(q) || q < 1 ? 1 : q,
        numero_serie: numeroSerie.trim() || undefined,
      }
      await onSave(trabajadorCI, data)
    }
    onClose()
  }

  const canSave = isEdit
    ? parseInt(cantidad) >= 1
    : mode === "existente"
      ? !!medioSeleccionado
      : !!nuevoNombre.trim()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isEdit ? "Editar asignación" : "Agregar asignación"}
            <span className="ml-2 text-sm font-normal text-gray-400">— {trabajadorNombre}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Toggle modo */}
          {!isEdit && (
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              {(["existente", "nuevo"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                    mode === m
                      ? "bg-white shadow text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {m === "existente" ? "Medio existente" : "Crear nuevo"}
                </button>
              ))}
            </div>
          )}

          {/* Combobox buscable */}
          {!isEdit && mode === "existente" && (
            <div className="space-y-1.5" ref={comboRef}>
              <Label>Medio básico *</Label>

              {/* Medio seleccionado */}
              {medioSeleccionado ? (
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-md">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{medioSeleccionado.nombre}</p>
                    {medioSeleccionado.precio != null && (
                      <p className="text-xs text-green-600">${medioSeleccionado.precio.toFixed(2)}</p>
                    )}
                  </div>
                  <button
                    onClick={clearMedio}
                    className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar medio básico..."
                    value={busqueda}
                    onFocus={() => setComboOpen(true)}
                    onChange={e => { setBusqueda(e.target.value); setComboOpen(true) }}
                    autoComplete="off"
                  />
                </div>
              )}

              {/* Dropdown */}
              {comboOpen && !medioSeleccionado && (
                <div className="border border-gray-200 rounded-md shadow-lg bg-white max-h-48 overflow-y-auto z-50">
                  {filteredMedios.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-gray-400">
                      Sin resultados
                      {busqueda && (
                        <span> para "<span className="font-medium">{busqueda}</span>"</span>
                      )}
                    </div>
                  ) : (
                    filteredMedios.map(m => (
                      <button
                        key={m.id}
                        className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-orange-50 transition-colors border-b last:border-0"
                        onMouseDown={e => { e.preventDefault(); selectMedio(m) }}
                      >
                        <span className="font-medium text-gray-800 truncate pr-2">{m.nombre}</span>
                        {m.precio != null && (
                          <span className="text-xs text-green-600 shrink-0">${m.precio.toFixed(2)}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Crear nuevo */}
          {!isEdit && mode === "nuevo" && (
            <>
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input
                  placeholder="Ej: Taladro Bosch 500W"
                  value={nuevoNombre}
                  onChange={e => setNuevoNombre(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Precio (opcional)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={nuevoPrecio}
                  onChange={e => setNuevoPrecio(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min="1"
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>N° de serie (opcional)</Label>
              <Input
                placeholder="SN-001"
                value={numeroSerie}
                onChange={e => setNumeroSerie(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!canSave || loading}>
              {loading ? "Guardando..." : isEdit ? "Guardar" : "Asignar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
