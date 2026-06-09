"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import { Search, ArrowRight, Loader2 } from "lucide-react"
import type {
  Asignacion,
  AsignacionInstalacion,
  TransferirData,
  TipoEntidad,
  Instalacion,
} from "@/lib/types/feats/asignaciones/asignacion-types"
import { AsignacionService } from "@/lib/api-services"
import { RecursosHumanosService } from "@/lib/services/feats/recursos-humanos/recursos-humanos-service"

type EntidadDestino = { id: string; nombre: string; subtitulo?: string }

interface TransferirAsignacionDialogProps {
  open: boolean
  onClose: () => void
  asignacion: Asignacion | AsignacionInstalacion | null
  origenLabel: string
  /** Tipo de entidad de la asignación origen — la excluimos del selector. */
  origenTipo: TipoEntidad
  origenId: string
  onSave: (data: TransferirData) => Promise<boolean>
  loading?: boolean
}

const TIPOS: { value: TipoEntidad; label: string }[] = [
  { value: "trabajador", label: "Trabajador" },
  { value: "almacen", label: "Almacén" },
  { value: "tienda", label: "Tienda" },
  { value: "sede", label: "Sede" },
]

export function TransferirAsignacionDialog({
  open, onClose, asignacion, origenLabel, origenTipo, origenId,
  onSave, loading,
}: TransferirAsignacionDialogProps) {
  const [tipoDestino, setTipoDestino] = useState<TipoEntidad>("trabajador")
  const [entidades, setEntidades] = useState<EntidadDestino[]>([])
  const [loadingEntidades, setLoadingEntidades] = useState(false)
  const [seleccionado, setSeleccionado] = useState<EntidadDestino | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const [nota, setNota] = useState("")

  // Reset al abrir
  useEffect(() => {
    if (!open) return
    setTipoDestino(origenTipo === "trabajador" ? "almacen" : "trabajador")
    setSeleccionado(null)
    setBusqueda("")
    setNota("")
  }, [open, origenTipo])

  // Carga de entidades del tipo elegido
  useEffect(() => {
    if (!open) return
    let cancelado = false
    setLoadingEntidades(true)
    setSeleccionado(null)
    const load = async () => {
      try {
        let list: EntidadDestino[] = []
        if (tipoDestino === "trabajador") {
          const rh = await RecursosHumanosService.getRecursosHumanos()
          list = (rh.trabajadores || [])
            .filter(t => t.activo !== false)
            .map(t => ({ id: t.CI, nombre: t.nombre, subtitulo: t.cargo ?? undefined }))
        } else {
          const insts: Instalacion[] = await AsignacionService.getEntidadesPorTipo(tipoDestino)
          list = insts.map(i => ({ id: i.id, nombre: i.nombre, subtitulo: i.codigo }))
        }
        // Excluir la entidad origen del listado
        list = list.filter(e => !(tipoDestino === origenTipo && e.id === origenId))
        if (!cancelado) setEntidades(list)
      } catch {
        if (!cancelado) setEntidades([])
      } finally {
        if (!cancelado) setLoadingEntidades(false)
      }
    }
    load()
    return () => { cancelado = true }
  }, [open, tipoDestino, origenTipo, origenId])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return entidades.slice(0, 50)
    return entidades.filter(e =>
      e.nombre.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      (e.subtitulo?.toLowerCase().includes(q) ?? false)
    ).slice(0, 50)
  }, [entidades, busqueda])

  const canSave = !!seleccionado && !loading

  const handleSave = async () => {
    if (!seleccionado) return
    const ok = await onSave({
      entidad_tipo_destino: tipoDestino,
      entidad_id_destino: seleccionado.id,
      motivo: "transferencia",
      nota: nota.trim() || undefined,
    })
    if (ok) onClose()
  }

  if (!asignacion) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            Transferir asignación
          </DialogTitle>
          <p className="text-xs text-gray-500">
            La asignación se mueve a otra entidad <strong>preservando el reloj de depreciación</strong>.
            La fecha de inicio de depreciación NO se reinicia.
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Visual origen → destino */}
          <div className="flex items-center gap-3 text-sm bg-gray-50 rounded-md p-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-gray-400">Desde</p>
              <p className="font-medium truncate">{origenLabel}</p>
              <p className="text-[11px] text-gray-500 capitalize">{origenTipo}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-gray-400">Hacia</p>
              <p className="font-medium truncate">
                {seleccionado?.nombre || <span className="text-gray-400 italic">Selecciona destino</span>}
              </p>
              <p className="text-[11px] text-gray-500 capitalize">{seleccionado ? tipoDestino : "—"}</p>
            </div>
          </div>

          {/* Recurso */}
          <div className="text-xs text-gray-500">
            Recurso: <span className="font-medium text-gray-800">{asignacion.nombre}</span>
            {asignacion.numero_serie && <span className="ml-2 font-mono">N/S: {asignacion.numero_serie}</span>}
            <span className="ml-2">× {asignacion.cantidad}</span>
          </div>

          {/* Tipo destino */}
          <div className="space-y-1.5">
            <Label>Tipo de entidad destino</Label>
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              {TIPOS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTipoDestino(t.value)}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${
                    tipoDestino === t.value ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Selector entidad */}
          <div className="space-y-1.5">
            <Label>Entidad destino *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                className="pl-9"
                placeholder="Buscar por nombre o código..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              {loadingEntidades && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>
            <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto bg-white">
              {filtrados.length === 0 ? (
                <p className="p-4 text-center text-xs text-gray-400">
                  {loadingEntidades ? "Cargando..." : "Sin resultados"}
                </p>
              ) : (
                filtrados.map(e => (
                  <button
                    key={e.id}
                    onClick={() => setSeleccionado(e)}
                    className={`w-full text-left px-3 py-2 text-sm border-b last:border-0 ${
                      seleccionado?.id === e.id ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <p className="font-medium truncate">{e.nombre}</p>
                    {e.subtitulo && <p className="text-[11px] text-gray-500 truncate">{e.subtitulo}</p>}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Nota (opcional)</Label>
            <Input
              placeholder="Razón o detalle de la transferencia..."
              value={nota}
              onChange={e => setNota(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {loading ? "Transfiriendo..." : "Transferir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
