"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import { Search, X } from "lucide-react"
import type {
  MedioBasico,
  AsignacionCreateData,
  AsignacionUpdateData,
  Asignacion,
  MaterialCatalogo,
  AsignacionInstalacionCreateData,
  AsignacionInstalacionUpdateData,
  AsignacionInstalacion,
} from "@/lib/types/feats/asignaciones/asignacion-types"
import { CATEGORIAS_MATERIAL } from "@/lib/types/feats/asignaciones/asignacion-types"
import { AsignacionService } from "@/lib/api-services"

type ItemType = 'medio_basico' | 'material'

interface AsignacionRecursosDialogProps {
  open: boolean
  onClose: () => void
  entityLabel: string
  mediosBasicos: MedioBasico[]
  asignacion?: Asignacion | AsignacionInstalacion | null
  onSave: (data: AsignacionCreateData | AsignacionUpdateData | AsignacionInstalacionCreateData | AsignacionInstalacionUpdateData, id?: string) => Promise<boolean>
  loading?: boolean
}

export function AsignacionRecursosDialog({
  open, onClose, entityLabel,
  mediosBasicos, asignacion, onSave, loading,
}: AsignacionRecursosDialogProps) {
  const isEdit = !!asignacion

  // Item type selection
  const [itemTipo, setItemTipo] = useState<ItemType>('medio_basico')

  // Medio básico state
  const [medioBusqueda, setMedioBusqueda] = useState("")
  const [medioSeleccionado, setMedioSeleccionado] = useState<MedioBasico | null>(null)
  const [comboOpen, setComboOpen] = useState(false)
  const comboRef = useRef<HTMLDivElement>(null)

  // Material state
  const [materialBusqueda, setMaterialBusqueda] = useState("")
  const [categoriaFiltro, setCategoriaFiltro] = useState("")
  const [materiales, setMateriales] = useState<MaterialCatalogo[]>([])
  const [materialSeleccionado, setMaterialSeleccionado] = useState<MaterialCatalogo | null>(null)
  const [materialComboOpen, setMaterialComboOpen] = useState(false)
  const [loadingMateriales, setLoadingMateriales] = useState(false)
  const materialComboRef = useRef<HTMLDivElement>(null)
  const materialSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Shared state
  const [cantidad, setCantidad] = useState("1")
  const [numeroSerie, setNumeroSerie] = useState("")

  const resetForm = useCallback(() => {
    setItemTipo(asignacion ? (asignacion.item_tipo ?? 'medio_basico') : 'medio_basico')
    setMedioBusqueda("")
    setMedioSeleccionado(null)
    setComboOpen(false)
    setMaterialBusqueda("")
    setCategoriaFiltro("")
    setMateriales([])
    setMaterialSeleccionado(null)
    setMaterialComboOpen(false)
    setCantidad(String(asignacion?.cantidad ?? 1))
    setNumeroSerie(asignacion?.numero_serie ?? "")
  }, [asignacion])

  useEffect(() => {
    if (open) resetForm()
  }, [open, resetForm])

  // Close combos on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) setComboOpen(false)
      if (materialComboRef.current && !materialComboRef.current.contains(e.target as Node)) setMaterialComboOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filteredMedios = mediosBasicos.filter(m =>
    m.nombre.toLowerCase().includes(medioBusqueda.toLowerCase().trim())
  )

  const buscarMateriales = useCallback(async (q: string, categoria: string) => {
    if (!q.trim() && !categoria) {
      setMateriales([])
      return
    }
    setLoadingMateriales(true)
    try {
      const data = await AsignacionService.getMaterialesCatalogo(q || undefined, categoria || undefined)
      setMateriales(data)
    } catch {
      setMateriales([])
    } finally {
      setLoadingMateriales(false)
    }
  }, [])

  const handleMaterialSearch = (value: string) => {
    setMaterialBusqueda(value)
    setMaterialComboOpen(true)
    if (materialSearchTimer.current) clearTimeout(materialSearchTimer.current)
    materialSearchTimer.current = setTimeout(() => {
      buscarMateriales(value, categoriaFiltro)
    }, 350)
  }

  const handleCategoriaChange = (cat: string) => {
    setCategoriaFiltro(cat)
    setMateriales([])
    if (materialSearchTimer.current) clearTimeout(materialSearchTimer.current)
    materialSearchTimer.current = setTimeout(() => {
      buscarMateriales(materialBusqueda, cat)
    }, 100)
  }

  const handleSave = async () => {
    const q = Math.max(1, parseInt(cantidad) || 1)
    const serie = numeroSerie.trim() || undefined

    if (isEdit) {
      const data: AsignacionUpdateData = { cantidad: q, numero_serie: serie }
      const ok = await onSave(data, asignacion!.id)
      if (ok) onClose()
      return
    }

    const data: AsignacionCreateData = {
      item_tipo: itemTipo,
      item_id: itemTipo === 'medio_basico' ? medioSeleccionado!.id : materialSeleccionado!.material_id,
      cantidad: q,
      numero_serie: serie,
    }
    const ok = await onSave(data)
    if (ok) onClose()
  }

  const canSave = isEdit
    ? parseInt(cantidad) >= 1
    : itemTipo === 'medio_basico'
      ? !!medioSeleccionado
      : !!materialSeleccionado

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isEdit ? "Editar asignación" : "Agregar asignación"}
            <span className="ml-2 text-sm font-normal text-gray-400">— {entityLabel}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Tipo de ítem */}
          {!isEdit && (
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              {(["medio_basico", "material"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setItemTipo(t); setMedioSeleccionado(null); setMaterialSeleccionado(null) }}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                    itemTipo === t
                      ? "bg-white shadow text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t === 'medio_basico' ? 'Medio básico' : 'Material'}
                </button>
              ))}
            </div>
          )}

          {/* Selector de medio básico */}
          {!isEdit && itemTipo === 'medio_basico' && (
            <div className="space-y-1.5" ref={comboRef}>
              <Label>Medio básico *</Label>
              {medioSeleccionado ? (
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-md">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{medioSeleccionado.nombre}</p>
                    {medioSeleccionado.precio != null && (
                      <p className="text-xs text-green-600">${medioSeleccionado.precio.toFixed(2)}</p>
                    )}
                  </div>
                  <button onClick={() => setMedioSeleccionado(null)} className="shrink-0 text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar medio básico..."
                    value={medioBusqueda}
                    onFocus={() => setComboOpen(true)}
                    onChange={e => { setMedioBusqueda(e.target.value); setComboOpen(true) }}
                    autoComplete="off"
                  />
                </div>
              )}
              {comboOpen && !medioSeleccionado && (
                <div className="border border-gray-200 rounded-md shadow-lg bg-white max-h-48 overflow-y-auto">
                  {filteredMedios.length === 0 ? (
                    <p className="px-3 py-4 text-center text-sm text-gray-400">Sin resultados</p>
                  ) : (
                    filteredMedios.map(m => (
                      <button
                        key={m.id}
                        className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-orange-50 border-b last:border-0"
                        onMouseDown={e => { e.preventDefault(); setMedioSeleccionado(m); setMedioBusqueda(""); setComboOpen(false) }}
                      >
                        <span className="font-medium text-gray-800 truncate pr-2">{m.nombre}</span>
                        {m.precio != null && <span className="text-xs text-green-600 shrink-0">${m.precio.toFixed(2)}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Selector de material */}
          {!isEdit && itemTipo === 'material' && (
            <div className="space-y-2">
              <Label>Material *</Label>
              <select
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                value={categoriaFiltro}
                onChange={e => handleCategoriaChange(e.target.value)}
              >
                <option value="">Todas las categorías</option>
                {CATEGORIAS_MATERIAL.map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>

              {materialSeleccionado ? (
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{materialSeleccionado.nombre}</p>
                    <p className="text-xs text-gray-400">{materialSeleccionado.categoria}</p>
                  </div>
                  <button onClick={() => setMaterialSeleccionado(null)} className="shrink-0 text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative" ref={materialComboRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar material..."
                    value={materialBusqueda}
                    onFocus={() => { setMaterialComboOpen(true); if (materialBusqueda || categoriaFiltro) buscarMateriales(materialBusqueda, categoriaFiltro) }}
                    onChange={e => handleMaterialSearch(e.target.value)}
                    autoComplete="off"
                  />
                  {materialComboOpen && (
                    <div className="absolute z-50 mt-1 w-full border border-gray-200 rounded-md shadow-lg bg-white max-h-48 overflow-y-auto">
                      {loadingMateriales ? (
                        <p className="px-3 py-4 text-center text-sm text-gray-400">Buscando...</p>
                      ) : materiales.length === 0 ? (
                        <p className="px-3 py-4 text-center text-sm text-gray-400">
                          {materialBusqueda || categoriaFiltro ? "Sin resultados" : "Escribe para buscar"}
                        </p>
                      ) : (
                        materiales.map(m => (
                          <button
                            key={m.material_id}
                            className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-blue-50 border-b last:border-0"
                            onMouseDown={e => { e.preventDefault(); setMaterialSeleccionado(m); setMaterialComboOpen(false) }}
                          >
                            <span className="font-medium text-gray-800 truncate pr-2">{m.nombre}</span>
                            <span className="text-xs text-gray-400 shrink-0">{m.categoria}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Cantidad y serie */}
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
