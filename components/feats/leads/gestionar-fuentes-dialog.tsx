"use client"

import { useEffect, useState } from "react"
import { Pencil, Plus, Power, PowerOff, Check, X, AlertTriangle, Loader2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import { Badge } from "@/components/shared/atom/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { useToast } from "@/hooks/use-toast"
import { FuenteService } from "@/lib/api-services"
import type { Fuente, FuenteCreateData, TipoReferencia } from "@/lib/types/feats/fuentes/fuente-types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFuentesChange?: () => void
}

type TipoRefOpcion = { value: TipoReferencia | "ninguna"; label: string }
const TIPO_REF_OPCIONES: TipoRefOpcion[] = [
  { value: "ninguna", label: "Sin referencia" },
  { value: "sucursal", label: "Sucursal" },
  { value: "trabajador", label: "Trabajador" },
  { value: "cliente", label: "Otro cliente" },
]

// Estado de la fila en edición
interface EditState {
  nombre: string
  tipo_referencia: TipoReferencia | "ninguna"
}

// Estado del flujo de desactivación
interface DesactivarState {
  fuenteId: string
  fuenteNombre: string
  totalLeads: number
  totalClientes: number
  nuevaFuente: string
  loading: boolean
}

export function GestionarFuentesDialog({ open, onOpenChange, onFuentesChange }: Props) {
  const { toast } = useToast()
  const [fuentes, setFuentes] = useState<Fuente[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ nombre: "", tipo_referencia: "ninguna" })
  const [savingId, setSavingId] = useState<string | null>(null)

  // Nueva fuente
  const [showNueva, setShowNueva] = useState(false)
  const [nueva, setNueva] = useState<EditState>({ nombre: "", tipo_referencia: "ninguna" })
  const [creando, setCreando] = useState(false)

  // Flujo desactivar
  const [desactivar, setDesactivar] = useState<DesactivarState | null>(null)

  const cargarFuentes = async () => {
    setLoading(true)
    try {
      const data = await FuenteService.getFuentes()
      setFuentes(data)
    } catch {
      toast({ title: "Error al cargar fuentes", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) cargarFuentes()
  }, [open])

  // ── Edición inline ──────────────────────────────────────────────
  const startEdit = (f: Fuente) => {
    setEditingId(f.id)
    setEditState({
      nombre: f.nombre,
      tipo_referencia: f.tipo_referencia ?? "ninguna",
    })
  }

  const cancelEdit = () => setEditingId(null)

  const saveEdit = async (f: Fuente) => {
    if (!editState.nombre.trim()) return
    setSavingId(f.id)
    try {
      const tipoRef = editState.tipo_referencia === "ninguna" ? null : editState.tipo_referencia
      await FuenteService.updateFuente(f.id, {
        nombre: editState.nombre.trim(),
        requiere_referencia: tipoRef !== null,
        tipo_referencia: tipoRef,
      })
      toast({ title: "Fuente actualizada" })
      setEditingId(null)
      await cargarFuentes()
      onFuentesChange?.()
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" })
    } finally {
      setSavingId(null)
    }
  }

  // ── Crear nueva ─────────────────────────────────────────────────
  const crearFuente = async () => {
    if (!nueva.nombre.trim()) return
    setCreando(true)
    try {
      const tipoRef = nueva.tipo_referencia === "ninguna" ? null : nueva.tipo_referencia
      const maxOrden = fuentes.reduce((m, f) => Math.max(m, f.orden), -1)
      const data: FuenteCreateData = {
        nombre: nueva.nombre.trim(),
        requiere_referencia: tipoRef !== null,
        tipo_referencia: tipoRef,
        activo: true,
        orden: maxOrden + 1,
      }
      await FuenteService.createFuente(data)
      toast({ title: "Fuente creada" })
      setShowNueva(false)
      setNueva({ nombre: "", tipo_referencia: "ninguna" })
      await cargarFuentes()
      onFuentesChange?.()
    } catch {
      toast({ title: "Error al crear fuente", variant: "destructive" })
    } finally {
      setCreando(false)
    }
  }

  // ── Desactivar ──────────────────────────────────────────────────
  const iniciarDesactivar = async (f: Fuente) => {
    try {
      const uso = await FuenteService.getUso(f.id)
      if (uso.total === 0) {
        // Sin registros → desactivar directo
        await FuenteService.desactivar(f.id)
        toast({ title: `"${f.nombre}" desactivada` })
        await cargarFuentes()
        onFuentesChange?.()
      } else {
        // Con registros → pedir reasignación
        setDesactivar({
          fuenteId: f.id,
          fuenteNombre: f.nombre,
          totalLeads: uso.total_leads,
          totalClientes: uso.total_clientes,
          nuevaFuente: "",
          loading: false,
        })
      }
    } catch {
      toast({ title: "Error al comprobar uso", variant: "destructive" })
    }
  }

  const confirmarDesactivar = async () => {
    if (!desactivar || !desactivar.nuevaFuente) return
    setDesactivar((d) => d && { ...d, loading: true })
    try {
      const result = await FuenteService.desactivar(desactivar.fuenteId, desactivar.nuevaFuente)
      toast({
        title: `"${desactivar.fuenteNombre}" desactivada`,
        description: `${result.reasignados} registro(s) reasignados a "${desactivar.nuevaFuente}".`,
      })
      setDesactivar(null)
      await cargarFuentes()
      onFuentesChange?.()
    } catch {
      toast({ title: "Error al desactivar", variant: "destructive" })
      setDesactivar((d) => d && { ...d, loading: false })
    }
  }

  // ── Reactivar ───────────────────────────────────────────────────
  const activar = async (f: Fuente) => {
    try {
      await FuenteService.activar(f.id)
      toast({ title: `"${f.nombre}" activada` })
      await cargarFuentes()
      onFuentesChange?.()
    } catch {
      toast({ title: "Error al activar", variant: "destructive" })
    }
  }

  const fuentesActivas = fuentes.filter((f) => f.activo && f.id !== desactivar?.fuenteId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gestionar Fuentes</DialogTitle>
        </DialogHeader>

        {/* Botón nueva fuente */}
        {!showNueva && (
          <Button
            size="sm"
            variant="outline"
            className="self-start border-green-600 text-green-700 hover:bg-green-50"
            onClick={() => setShowNueva(true)}
          >
            <Plus className="h-4 w-4 mr-1" /> Nueva fuente
          </Button>
        )}

        {/* Formulario nueva fuente */}
        {showNueva && (
          <div className="border rounded-lg p-3 space-y-3 bg-green-50 border-green-200">
            <p className="text-sm font-medium text-green-800">Nueva fuente</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nombre</Label>
                <Input
                  value={nueva.nombre}
                  onChange={(e) => setNueva((s) => ({ ...s, nombre: e.target.value }))}
                  placeholder="Ej: TikTok"
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && crearFuente()}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo de referencia</Label>
                <Select
                  value={nueva.tipo_referencia}
                  onValueChange={(v) => setNueva((s) => ({ ...s, tipo_referencia: v as TipoReferencia | "ninguna" }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_REF_OPCIONES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={crearFuente} disabled={!nueva.nombre.trim() || creando}
                className="bg-green-600 hover:bg-green-700 text-white">
                {creando ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                Crear
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowNueva(false); setNueva({ nombre: "", tipo_referencia: "ninguna" }) }}>
                <X className="h-3 w-3 mr-1" /> Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Panel de reasignación */}
        {desactivar && (
          <div className="border rounded-lg p-3 space-y-3 bg-amber-50 border-amber-300">
            <div className="flex gap-2 items-start">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">"{desactivar.fuenteNombre}" tiene registros activos:</p>
                <p className="text-xs mt-0.5">
                  {desactivar.totalLeads > 0 && <span>{desactivar.totalLeads} lead(s) </span>}
                  {desactivar.totalClientes > 0 && <span>{desactivar.totalClientes} cliente(s) </span>}
                  — deben reasignarse a otra fuente antes de desactivar.
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reasignar todos a:</Label>
              <Select
                value={desactivar.nuevaFuente}
                onValueChange={(v) => setDesactivar((d) => d && { ...d, nuevaFuente: v })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Seleccionar fuente destino..." />
                </SelectTrigger>
                <SelectContent>
                  {fuentesActivas.map((f) => (
                    <SelectItem key={f.id} value={f.nombre}>{f.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={confirmarDesactivar}
                disabled={!desactivar.nuevaFuente || desactivar.loading}
                className="bg-amber-600 hover:bg-amber-700 text-white">
                {desactivar.loading
                  ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  : <PowerOff className="h-3 w-3 mr-1" />}
                Reasignar y desactivar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDesactivar(null)}>
                <X className="h-3 w-3 mr-1" /> Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Lista de fuentes */}
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : fuentes.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No hay fuentes</p>
          ) : (
            fuentes.map((f) => (
              <FuenteRow
                key={f.id}
                fuente={f}
                isEditing={editingId === f.id}
                editState={editState}
                saving={savingId === f.id}
                onEdit={() => startEdit(f)}
                onSave={() => saveEdit(f)}
                onCancelEdit={cancelEdit}
                onEditStateChange={setEditState}
                onDesactivar={() => iniciarDesactivar(f)}
                onActivar={() => activar(f)}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Fila individual ──────────────────────────────────────────────────────────

interface FuenteRowProps {
  fuente: Fuente
  isEditing: boolean
  editState: EditState
  saving: boolean
  onEdit: () => void
  onSave: () => void
  onCancelEdit: () => void
  onEditStateChange: (s: EditState) => void
  onDesactivar: () => void
  onActivar: () => void
}

function FuenteRow({
  fuente, isEditing, editState, saving,
  onEdit, onSave, onCancelEdit, onEditStateChange,
  onDesactivar, onActivar,
}: FuenteRowProps) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg border border-blue-200 bg-blue-50">
        <Input
          value={editState.nombre}
          onChange={(e) => onEditStateChange({ ...editState, nombre: e.target.value })}
          className="h-7 text-sm flex-1"
          onKeyDown={(e) => { if (e.key === "Enter") onSave(); if (e.key === "Escape") onCancelEdit() }}
          autoFocus
        />
        <Select
          value={editState.tipo_referencia}
          onValueChange={(v) => onEditStateChange({ ...editState, tipo_referencia: v as TipoReferencia | "ninguna" })}
        >
          <SelectTrigger className="h-7 text-xs w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPO_REF_OPCIONES.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button onClick={onSave} disabled={saving || !editState.nombre.trim()}
          className="p-1 rounded hover:bg-blue-100 text-blue-700 disabled:opacity-40">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </button>
        <button onClick={onCancelEdit} className="p-1 rounded hover:bg-blue-100 text-gray-500">
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border ${fuente.activo ? "border-gray-200 bg-white hover:bg-gray-50" : "border-gray-100 bg-gray-50 opacity-60"}`}>
      <span className={`text-sm flex-1 ${!fuente.activo && "line-through text-gray-400"}`}>
        {fuente.nombre}
      </span>

      {fuente.tipo_referencia && fuente.activo && (
        <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 border-gray-300 text-gray-500">
          {fuente.tipo_referencia === "sucursal" && "Sucursal"}
          {fuente.tipo_referencia === "trabajador" && "Trabajador"}
          {fuente.tipo_referencia === "cliente" && "Otro cliente"}
        </Badge>
      )}

      {!fuente.activo && (
        <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 border-gray-200 text-gray-400">
          Inactiva
        </Badge>
      )}

      {fuente.activo ? (
        <>
          <button onClick={onEdit} title="Editar"
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDesactivar} title="Desactivar"
            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
            <PowerOff className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <button onClick={onActivar} title="Activar"
          className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600">
          <Power className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
