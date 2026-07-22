"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { MaterialImage } from "@/components/shared/molecule/material-image"
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
  // En creación: "cantidad" representa la cantidad a asignar.
  // En edición: representa "unidades a retirar" — más intuitivo que "cantidad final".
  const [cantidad, setCantidad] = useState("1")
  const [numeroSerie, setNumeroSerie] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [motivo, setMotivo] = useState<MotivoMovimiento | "">("")
  const [nota, setNota] = useState("")
  // Solo creación
  const [fechaAsignacion, setFechaAsignacion] = useState("")  // YYYY-MM-DD
  const [permitirCostoCero, setPermitirCostoCero] = useState(false)

  const resetForm = useCallback(() => {
    setItemTipo(asignacion ? (asignacion.item_tipo ?? 'medio_basico') : 'medio_basico')
    setMedioBusqueda("")
    setMedioSeleccionado(null)
    setMedioComboOpen(false)
    setMaterialBusqueda("")
    setMaterialResults([])
    setMaterialSeleccionado(null)
    setMaterialComboOpen(false)
    // Creación: "cantidad a asignar" (default 1).
    // Edición: "unidades a retirar". En modoEliminar arrancamos con TODAS; en
    // modoEditar arrancamos con 0 (nada para retirar) y el usuario tipea.
    if (asignacion) {
      setCantidad(modoEliminar ? String(asignacion.cantidad) : "0")
    } else {
      setCantidad("1")
    }
    setNumeroSerie(asignacion?.numero_serie ?? "")
    setDescripcion(asignacion?.descripcion ?? "")
    setMotivo("")
    setNota("")
    // Default fecha = hoy en formato YYYY-MM-DD
    const hoy = new Date().toISOString().slice(0, 10)
    setFechaAsignacion(hoy)
    setPermitirCostoCero(false)
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
        // Endpoint admin: incluye `costo` (el web no), necesario para detectar
        // materiales sin costo antes de intentar asignarlos.
        const results = await MaterialService.searchMaterialesConCosto(term, 15)
        setMaterialResults(results)
      } catch {
        setMaterialResults([])
      } finally {
        setLoadingMateriales(false)
      }
    }, 300)
    return () => clearTimeout(handler)
  }, [materialBusqueda, itemTipo])

  // ── Validación ──
  // En CREACIÓN: cantidadNum = cantidad a asignar (≥1).
  // En EDICIÓN: cantidadNum = unidades a retirar (0..cantidadOriginal). El
  // backend recibe la cantidad final = cantidadOriginal - unidadesARetirar.
  const cantidadNum = parseInt(cantidad)
  const cantidadValida = !isNaN(cantidadNum) && cantidadNum >= 0
  const unidadesARetirar = isEdit ? cantidadNum : 0
  const cantidadFinal = isEdit ? cantidadOriginal - unidadesARetirar : cantidadNum
  const cantidadCambio = isEdit && cantidadValida && unidadesARetirar > 0
  const retiroExcedeStock = isEdit && cantidadValida && unidadesARetirar > cantidadOriginal
  const seEliminaTodo = isEdit && cantidadValida && unidadesARetirar === cantidadOriginal && cantidadOriginal > 0
  const serieCambio = isEdit && (numeroSerie ?? "") !== (asignacion?.numero_serie ?? "")
  const descripcionCambio = isEdit && (descripcion ?? "") !== (asignacion?.descripcion ?? "")
  const motivoRequerido = cantidadCambio
  const motivoOk = !motivoRequerido || !!motivo
  const hayAlgoQueGuardar = isEdit ? (cantidadCambio || serieCambio || descripcionCambio) : true

  const handleSave = async () => {
    const serie = numeroSerie.trim()
    const desc = descripcion.trim()

    if (isEdit) {
      const data: AsignacionUpdateData = {}
      // Mando al backend la CANTIDAD FINAL (ya restada), no el delta.
      if (cantidadCambio) data.cantidad = cantidadFinal
      if (serieCambio) data.numero_serie = serie || undefined
      if (descripcionCambio) data.descripcion = desc
      if (motivoRequerido && motivo) {
        data.motivo = motivo as MotivoMovimiento
        if (nota.trim()) data.nota = nota.trim()
      }
      const ok = await onSave(data, asignacion!.id)
      if (ok) onClose()
      return
    }

    const fechaISO = fechaAsignacion
      ? new Date(fechaAsignacion + "T00:00:00").toISOString()
      : undefined
    const data: AsignacionCreateData = {
      item_tipo: itemTipo,
      item_id: itemTipo === 'medio_basico' ? medioSeleccionado!.id : materialSeleccionado!.id,
      cantidad: Math.max(1, cantidadNum || 1),
      numero_serie: serie || undefined,
      descripcion: desc || undefined,
      fecha_asignacion: fechaISO,
      permitir_costo_cero: permitirCostoCero || undefined,
    }
    const ok = await onSave(data)
    if (ok) onClose()
  }

  // ── Detección de costo en el seleccionado (creación) ───────────────────────
  // El backend desnormaliza: medio_basico.precio → asignacion.costo, material.costo → asignacion.costo
  const costoSeleccionado = !isEdit
    ? (itemTipo === 'medio_basico'
        ? medioSeleccionado?.precio
        : materialSeleccionado?.costo)
    : null
  const sinCosto = !isEdit
    && !!(itemTipo === 'medio_basico' ? medioSeleccionado : materialSeleccionado)
    && (costoSeleccionado == null || costoSeleccionado === 0)
  const fechaFutura = !isEdit && fechaAsignacion
    ? new Date(fechaAsignacion + "T00:00:00") > new Date()
    : false

  const canSave = isEdit
    ? cantidadValida && !retiroExcedeStock && motivoOk && hayAlgoQueGuardar
    : (itemTipo === 'medio_basico'
        ? !!medioSeleccionado && cantidadValida && cantidadNum >= 1
        : !!materialSeleccionado && cantidadValida && cantidadNum >= 1)
      && (!sinCosto || permitirCostoCero)
      && !fechaFutura

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
                          <span className="text-green-600 font-medium" title="Costo unitario">
                            ${medioSeleccionado.precio.toFixed(2)}
                          </span>
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
                    <MaterialImage
                      foto={materialSeleccionado.foto}
                      fotoDisponible={(materialSeleccionado as { foto_disponible?: boolean | null }).foto_disponible}
                      alt={materialSeleccionado.nombre || materialSeleccionado.descripcion}
                      className="relative h-9 w-9 rounded border border-gray-200 flex-shrink-0 flex items-center justify-center bg-gray-100"
                      imgClassName="h-9 w-9 rounded object-cover"
                      fallback={<Package className="h-3.5 w-3.5 text-gray-400" />}
                    />
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
                            <MaterialImage
                              foto={m.foto}
                              fotoDisponible={m.foto_disponible}
                              alt={m.nombre || m.descripcion}
                              className="relative h-7 w-7 rounded border border-gray-200 flex-shrink-0 flex items-center justify-center bg-gray-100"
                              imgClassName="h-7 w-7 rounded object-cover"
                              fallback={<Package className="h-3 w-3 text-gray-400" />}
                            />
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
                {isEdit ? "Unidades a retirar" : "Cantidad"}
                {isEdit && (
                  <span className="ml-1 text-xs text-gray-400 font-normal">
                    (asignadas: {cantidadOriginal})
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
              {isEdit && cantidadValida && (
                <p className={`text-xs ${seEliminaTodo ? "text-red-600 font-medium" : "text-gray-500"}`}>
                  {seEliminaTodo
                    ? `Se eliminará la asignación completa (${cantidadOriginal} → 0)`
                    : `Quedarán ${cantidadFinal} de ${cantidadOriginal}`}
                </p>
              )}
              {retiroExcedeStock && (
                <p className="text-xs text-red-600">
                  No podés retirar más de {cantidadOriginal} (es lo que está asignado).
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

          {/* Fecha de asignación (solo creación) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Fecha de asignación</Label>
              <Input
                type="date"
                value={fechaAsignacion}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => setFechaAsignacion(e.target.value)}
              />
              <p className="text-[11px] text-gray-400">
                Por defecto hoy. Podés indicar una fecha anterior si el recurso ya estaba asignado.
                La depreciación contará desde esta fecha. <strong>No se podrá editar después.</strong>
              </p>
              {fechaFutura && (
                <p className="text-xs text-red-600">La fecha no puede ser futura.</p>
              )}
            </div>
          )}

          {/* Banner costo 0 (solo creación, cuando aplica) */}
          {!isEdit && sinCosto && (
            <div className="rounded-md border border-amber-400 bg-amber-50 p-3 space-y-2">
              <p className="text-sm font-semibold text-amber-900">
                Este {itemTipo === 'medio_basico' ? 'medio básico' : 'material'} no tiene costo.
              </p>
              <p className="text-xs text-amber-900">
                Para asignarlo, activá el toggle <strong>“Permitir costo cero”</strong> y luego
                editá el costo en la asignación; o bien agregá el costo al
                {itemTipo === 'medio_basico' ? ' medio básico' : ' material'} desde su ficha de costos.
              </p>
              <label className="flex items-start gap-2 cursor-pointer text-xs text-amber-900">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={permitirCostoCero}
                  onChange={e => setPermitirCostoCero(e.target.checked)}
                />
                <span>
                  <strong>Permitir costo cero</strong> — la asignación se crea pero los valores de
                  depreciación, valor depreciado y residual serán 0 hasta que cargues el costo.
                </span>
              </label>
            </div>
          )}

          {/* Descripción / comentario de la asignación */}
          <div className="space-y-1.5">
            <Label>Descripción (opcional)</Label>
            <Input
              placeholder="Estado, ubicación, observaciones..."
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              maxLength={200}
            />
            <p className="text-[11px] text-gray-400">
              Comentario propio de esta asignación. No se confunde con la descripción del material.
            </p>
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
