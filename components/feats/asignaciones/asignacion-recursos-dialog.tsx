"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import { Search, X, Loader2, Package } from "lucide-react"
import type {
  MedioBasico,
  AsignacionCreateData,
  AsignacionUpdateData,
  Asignacion,
  AsignacionInstalacionCreateData,
  AsignacionInstalacionUpdateData,
  AsignacionInstalacion,
  MotivoMovimiento,
} from "@/lib/types/feats/asignaciones/asignacion-types"
import { MOTIVOS_MOVIMIENTO } from "@/lib/types/feats/asignaciones/asignacion-types"
import type { Material } from "@/lib/material-types"
import { MaterialService } from "@/lib/api-services"

type ItemType = 'medio_basico' | 'material'

interface AsignacionRecursosDialogProps {
  open: boolean
  onClose: () => void
  entityLabel: string
  mediosBasicos: MedioBasico[]
  asignacion?: Asignacion | AsignacionInstalacion | null
  /** Si true, el dialog abre en modo "eliminar" (cantidad preseteada a 0) */
  modoEliminar?: boolean
  onSave: (data: AsignacionCreateData | AsignacionUpdateData | AsignacionInstalacionCreateData | AsignacionInstalacionUpdateData, id?: string) => Promise<boolean>
  loading?: boolean
}

export function AsignacionRecursosDialog({
  open, onClose, entityLabel,
  mediosBasicos, asignacion, modoEliminar, onSave, loading,
}: AsignacionRecursosDialogProps) {
  const isEdit = !!asignacion
  const cantidadOriginal = asignacion?.cantidad ?? 0

  // Item type selection
  const [itemTipo, setItemTipo] = useState<ItemType>('medio_basico')

  // Medio básico state
  const [medioBusqueda, setMedioBusqueda] = useState("")
  const [medioSeleccionado, setMedioSeleccionado] = useState<MedioBasico | null>(null)
  const [medioComboOpen, setMedioComboOpen] = useState(false)
  const medioComboRef = useRef<HTMLDivElement>(null)

  // Material state
  const [materialBusqueda, setMaterialBusqueda] = useState("")
  const [materialResults, setMaterialResults] = useState<Material[]>([])
  const [materialSeleccionado, setMaterialSeleccionado] = useState<Material | null>(null)
  const [materialComboOpen, setMaterialComboOpen] = useState(false)
  const [loadingMateriales, setLoadingMateriales] = useState(false)
  const materialComboRef = useRef<HTMLDivElement>(null)

  // Shared state
  const [cantidad, setCantidad] = useState("1")
  const [numeroSerie, setNumeroSerie] = useState("")
  const [motivo, setMotivo] = useState<MotivoMovimiento | "">("")
  const [nota, setNota] = useState("")

  const resetForm = useCallback(() => {
    setItemTipo(asignacion ? (asignacion.item_tipo ?? 'medio_basico') : 'medio_basico')
    setMedioBusqueda("")
    setMedioSeleccionado(null)
    setMedioComboOpen(false)
    setMaterialBusqueda("")
    setMaterialResults([])
    setMaterialSeleccionado(null)
    setMaterialComboOpen(false)
    setCantidad(modoEliminar ? "0" : String(asignacion?.cantidad ?? 1))
    setNumeroSerie(asignacion?.numero_serie ?? "")
    setMotivo("")
    setNota("")
  }, [asignacion, modoEliminar])

  useEffect(() => {
    if (open) resetForm()
  }, [open, resetForm])

  // Close combos on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (medioComboRef.current && !medioComboRef.current.contains(e.target as Node)) setMedioComboOpen(false)
      if (materialComboRef.current && !materialComboRef.current.contains(e.target as Node)) setMaterialComboOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ── Búsqueda de medios básicos: in-memory + filtra por nombre y código ──
  const filteredMedios = useMemo(() => {
    const q = medioBusqueda.trim().toLowerCase()
    if (!q) return mediosBasicos.slice(0, 15)
    return mediosBasicos
      .filter(m =>
        m.nombre.toLowerCase().includes(q) ||
        (m.codigo?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, 15)
  }, [mediosBasicos, medioBusqueda])

  // ── Búsqueda de materiales: mismo patrón que solicitudes-materiales ──
  useEffect(() => {
    if (itemTipo !== 'material') return
    const term = materialBusqueda.trim()
    if (!term) {
      setMaterialResults([])
      return
    }
    const handler = setTimeout(async () => {
      setLoadingMateriales(true)
      try {
        const results = await MaterialService.searchMaterialsByCode(term, 15)
        setMaterialResults(results)
      } catch {
        setMaterialResults([])
      } finally {
        setLoadingMateriales(false)
      }
    }, 300)
    return () => clearTimeout(handler)
  }, [materialBusqueda, itemTipo])

  // ── Validación del modo edición ──
  // El backend solo permite DISMINUIR la cantidad. Cualquier delta exige motivo.
  const cantidadNum = parseInt(cantidad)
  const cantidadValida = !isNaN(cantidadNum) && cantidadNum >= 0
  const cantidadCambio = isEdit && cantidadValida && cantidadNum !== cantidadOriginal
  const cantidadAumenta = isEdit && cantidadValida && cantidadNum > cantidadOriginal
  const serieCambio = isEdit && (numeroSerie ?? "") !== (asignacion?.numero_serie ?? "")
  const motivoRequerido = cantidadCambio
  const motivoOk = !motivoRequerido || !!motivo
  const hayAlgoQueGuardar = isEdit ? (cantidadCambio || serieCambio) : true

  const handleSave = async () => {
    const serie = numeroSerie.trim()

    if (isEdit) {
      const data: AsignacionUpdateData = {}
      if (cantidadCambio) data.cantidad = cantidadNum
      if (serieCambio) data.numero_serie = serie || undefined
      if (motivoRequerido && motivo) {
        data.motivo = motivo as MotivoMovimiento
        if (nota.trim()) data.nota = nota.trim()
      }
      const ok = await onSave(data, asignacion!.id)
      if (ok) onClose()
      return
    }

    const data: AsignacionCreateData = {
      item_tipo: itemTipo,
      item_id: itemTipo === 'medio_basico' ? medioSeleccionado!.id : materialSeleccionado!.id,
      cantidad: Math.max(1, cantidadNum || 1),
      numero_serie: serie || undefined,
    }
    const ok = await onSave(data)
    if (ok) onClose()
  }

  const canSave = isEdit
    ? cantidadValida && !cantidadAumenta && motivoOk && hayAlgoQueGuardar
    : itemTipo === 'medio_basico'
      ? !!medioSeleccionado && cantidadValida && cantidadNum >= 1
      : !!materialSeleccionado && cantidadValida && cantidadNum >= 1

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {!isEdit && "Agregar asignación"}
            {isEdit && modoEliminar && "Eliminar asignación"}
            {isEdit && !modoEliminar && "Editar asignación"}
            <span className="ml-2 text-sm font-normal text-gray-400">— {entityLabel}</span>
          </DialogTitle>
          {isEdit && modoEliminar && (
            <p className="text-xs text-gray-500">
              La asignación se marcará como eliminada conservando el historial. Indica el motivo.
            </p>
          )}
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
            <div className="space-y-1.5" ref={medioComboRef}>
              <Label>Medio básico *</Label>
              {medioSeleccionado ? (
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-md">
                  <div className="min-w-0 flex items-center gap-2">
                    {medioSeleccionado.foto ? (
                      <img
                        src={medioSeleccionado.foto}
                        alt={medioSeleccionado.nombre}
                        className="h-9 w-9 rounded object-cover border border-emerald-200 flex-shrink-0"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
                      />
                    ) : (
                      <div className="bg-emerald-100 p-1.5 rounded-lg flex-shrink-0">
                        <Package className="h-3.5 w-3.5 text-emerald-700" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{medioSeleccionado.nombre}</p>
                      <div className="flex items-center gap-2 text-xs">
                        {medioSeleccionado.codigo && (
                          <span className="text-gray-400 font-mono">{medioSeleccionado.codigo}</span>
                        )}
                        {medioSeleccionado.precio != null && (
                          <span className="text-green-600 font-medium">${medioSeleccionado.precio.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
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
                    placeholder="Buscar por nombre o código (MB-XXXXXX)..."
                    value={medioBusqueda}
                    onFocus={() => setMedioComboOpen(true)}
                    onChange={e => { setMedioBusqueda(e.target.value); setMedioComboOpen(true) }}
                    autoComplete="off"
                  />
                  {medioComboOpen && (
                    <div className="absolute z-50 mt-1 w-full border border-gray-200 rounded-md shadow-lg bg-white max-h-56 overflow-y-auto">
                      {filteredMedios.length === 0 ? (
                        <p className="px-3 py-4 text-center text-sm text-gray-400">
                          {medioBusqueda ? "Sin resultados" : "No hay medios básicos registrados"}
                        </p>
                      ) : (
                        filteredMedios.map(m => (
                          <button
                            key={m.id}
                            className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-sm flex items-center gap-2 border-b last:border-0"
                            onMouseDown={e => {
                              e.preventDefault()
                              setMedioSeleccionado(m)
                              setMedioBusqueda("")
                              setMedioComboOpen(false)
                            }}
                          >
                            {m.foto ? (
                              <img
                                src={m.foto}
                                alt={m.nombre}
                                className="h-7 w-7 rounded object-cover border border-emerald-200 flex-shrink-0"
                                onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
                              />
                            ) : (
                              <div className="bg-emerald-100 p-1.5 rounded-lg flex-shrink-0">
                                <Package className="h-3 w-3 text-emerald-700" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{m.nombre}</p>
                              <div className="flex items-center gap-2 text-xs">
                                {m.codigo && <span className="text-gray-400 font-mono">{m.codigo}</span>}
                                {m.precio != null && (
                                  <span className="text-green-600 font-medium">${m.precio.toFixed(2)}</span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Selector de material */}
          {!isEdit && itemTipo === 'material' && (
            <div className="space-y-1.5" ref={materialComboRef}>
              <Label>Material *</Label>
              {materialSeleccionado ? (
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="min-w-0 flex items-center gap-2">
                    {materialSeleccionado.foto ? (
                      <img
                        src={materialSeleccionado.foto}
                        alt={materialSeleccionado.nombre || materialSeleccionado.descripcion}
                        className="h-9 w-9 rounded object-cover border border-gray-200 flex-shrink-0"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
                      />
                    ) : (
                      <div className="h-9 w-9 rounded bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                        <Package className="h-3.5 w-3.5 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {materialSeleccionado.nombre || materialSeleccionado.descripcion}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400 font-mono">{materialSeleccionado.codigo}</span>
                        {materialSeleccionado.um && <span className="text-gray-400">{materialSeleccionado.um}</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setMaterialSeleccionado(null)} className="shrink-0 text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    className="pl-9 pr-9"
                    placeholder="Buscar material por código o nombre..."
                    value={materialBusqueda}
                    onFocus={() => setMaterialComboOpen(true)}
                    onChange={e => { setMaterialBusqueda(e.target.value); setMaterialComboOpen(true) }}
                    autoComplete="off"
                  />
                  {loadingMateriales && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                  )}
                  {materialComboOpen && (
                    <div className="absolute z-50 mt-1 w-full border border-gray-200 rounded-md shadow-lg bg-white max-h-56 overflow-y-auto">
                      {materialBusqueda.trim() === "" ? (
                        <p className="px-3 py-4 text-center text-sm text-gray-400">Escribe para buscar materiales</p>
                      ) : loadingMateriales ? (
                        <p className="px-3 py-4 text-center text-sm text-gray-400">Buscando...</p>
                      ) : materialResults.length === 0 ? (
                        <p className="px-3 py-4 text-center text-sm text-gray-400">Sin resultados</p>
                      ) : (
                        materialResults.map(m => (
                          <button
                            key={m.id}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex items-center gap-2 border-b last:border-0"
                            onMouseDown={e => {
                              e.preventDefault()
                              setMaterialSeleccionado(m)
                              setMaterialComboOpen(false)
                            }}
                          >
                            {m.foto ? (
                              <img
                                src={m.foto}
                                alt={m.nombre || m.descripcion}
                                className="h-7 w-7 rounded object-cover border border-gray-200 flex-shrink-0"
                                onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
                              />
                            ) : (
                              <div className="h-7 w-7 rounded bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                                <Package className="h-3 w-3 text-gray-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {m.nombre || m.descripcion}
                              </p>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-gray-400 font-mono">{m.codigo}</span>
                                {m.um && <span className="text-gray-400">{m.um}</span>}
                                {m.categoria && <span className="text-blue-600">{m.categoria}</span>}
                              </div>
                            </div>
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
              <Label>
                Cantidad
                {isEdit && (
                  <span className="ml-1 text-xs text-gray-400 font-normal">
                    (actual: {cantidadOriginal})
                  </span>
                )}
              </Label>
              <Input
                type="number"
                min={isEdit ? "0" : "1"}
                max={isEdit ? String(cantidadOriginal) : undefined}
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
              />
              {cantidadAumenta && (
                <p className="text-xs text-red-600">
                  Solo se puede disminuir. Para aumentar, crea una nueva asignación.
                </p>
              )}
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

          {/* Motivo + nota (solo cuando la cantidad cambia) */}
          {motivoRequerido && (
            <div className="space-y-3 p-3 rounded-md bg-amber-50 border border-amber-200">
              <div className="space-y-1.5">
                <Label>
                  Motivo <span className="text-red-500">*</span>
                </Label>
                <select
                  className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                  value={motivo}
                  onChange={e => setMotivo(e.target.value as MotivoMovimiento | "")}
                >
                  <option value="">Selecciona un motivo...</option>
                  {MOTIVOS_MOVIMIENTO.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Nota (opcional)</Label>
                <Input
                  placeholder="Detalle adicional..."
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={!canSave || loading}
              className={modoEliminar ? "bg-red-600 hover:bg-red-700" : undefined}
            >
              {loading
                ? "Guardando..."
                : modoEliminar
                  ? "Eliminar"
                  : isEdit
                    ? "Guardar"
                    : "Asignar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
