"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/atom/input"
import {
  Plus, Pencil, Trash2, Package, Building2, ShoppingBag, ChevronDown, ChevronRight, Search,
  DollarSign, ArrowRightLeft, History,
} from "lucide-react"
import { useAllInstalacionesAsignaciones } from "@/hooks/use-asignaciones"
import { AsignacionRecursosDialog } from "./asignacion-recursos-dialog"
import { AjustarCostoDialog } from "./ajustar-costo-dialog"
import { TransferirAsignacionDialog } from "./transferir-asignacion-dialog"
import { HistorialAsignacion } from "./historial-asignacion"
import type {
  TipoInstalacion,
  InstalacionConAsignaciones,
  AsignacionInstalacion,
  AsignacionInstalacionCreateData,
  AsignacionInstalacionUpdateData,
  AjustarCostoData,
  TransferirData,
  MedioBasico,
} from "@/lib/types/feats/asignaciones/asignacion-types"
import { useToast } from "@/hooks/use-toast"

interface SeccionColores {
  borderL: string
  iconText: string
  badgeBg: string
  badgeText: string
  cardHover: string
  btnBorder: string
  btnText: string
  btnHover: string
}

const COLORES: Record<TipoInstalacion, SeccionColores> = {
  almacen: {
    borderL: 'border-l-indigo-500',
    iconText: 'text-indigo-500',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-700',
    cardHover: 'hover:border-indigo-300',
    btnBorder: 'border-indigo-300',
    btnText: 'text-indigo-600',
    btnHover: 'hover:bg-indigo-50',
  },
  tienda: {
    borderL: 'border-l-amber-500',
    iconText: 'text-amber-500',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    cardHover: 'hover:border-amber-300',
    btnBorder: 'border-amber-300',
    btnText: 'text-amber-600',
    btnHover: 'hover:bg-amber-50',
  },
  sede: {
    borderL: 'border-l-emerald-500',
    iconText: 'text-emerald-500',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    cardHover: 'hover:border-emerald-300',
    btnBorder: 'border-emerald-300',
    btnText: 'text-emerald-600',
    btnHover: 'hover:bg-emerald-50',
  },
}

const SECCIONES: { tipo: TipoInstalacion; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { tipo: 'almacen', label: 'Almacenes', icon: Package },
  { tipo: 'tienda', label: 'Tiendas', icon: ShoppingBag },
  { tipo: 'sede', label: 'Sedes', icon: Building2 },
]

interface InstalacionAsignacionesTabProps {
  mediosBasicos: MedioBasico[]
}

export function InstalacionAsignacionesTab({ mediosBasicos }: InstalacionAsignacionesTabProps) {
  const {
    data, loading, error, clearError,
    addAsignacion, updateAsignacion, ajustarCostoAsignacion, transferirAsignacion,
  } = useAllInstalacionesAsignaciones()
  const { toast } = useToast()

  const [busqueda, setBusqueda] = useState("")
  const [seccionesAbiertas, setSeccionesAbiertas] = useState<Record<TipoInstalacion, boolean>>({
    almacen: true, tienda: true, sede: true,
  })

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTipo, setDialogTipo] = useState<TipoInstalacion>('almacen')
  const [dialogInstalacionId, setDialogInstalacionId] = useState("")
  const [dialogInstalacionNombre, setDialogInstalacionNombre] = useState("")
  const [editingAsignacion, setEditingAsignacion] = useState<AsignacionInstalacion | null>(null)
  const [modoEliminar, setModoEliminar] = useState(false)
  // Costo / transferencia
  const [costoDialogOpen, setCostoDialogOpen] = useState(false)
  const [costoAsignacion, setCostoAsignacion] = useState<AsignacionInstalacion | null>(null)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [transferAsignacion, setTransferAsignacion] = useState<AsignacionInstalacion | null>(null)

  const openAdd = (tipo: TipoInstalacion, inst: InstalacionConAsignaciones) => {
    setDialogTipo(tipo)
    setDialogInstalacionId(inst.id)
    setDialogInstalacionNombre(inst.nombre)
    setEditingAsignacion(null)
    setModoEliminar(false)
    setDialogOpen(true)
  }

  const openEdit = (tipo: TipoInstalacion, inst: InstalacionConAsignaciones, a: AsignacionInstalacion) => {
    setDialogTipo(tipo)
    setDialogInstalacionId(inst.id)
    setDialogInstalacionNombre(inst.nombre)
    setEditingAsignacion(a)
    setModoEliminar(false)
    setDialogOpen(true)
  }

  const openDelete = (tipo: TipoInstalacion, inst: InstalacionConAsignaciones, a: AsignacionInstalacion) => {
    setDialogTipo(tipo)
    setDialogInstalacionId(inst.id)
    setDialogInstalacionNombre(inst.nombre)
    setEditingAsignacion(a)
    setModoEliminar(true)
    setDialogOpen(true)
  }

  const openAdjustCost = (tipo: TipoInstalacion, inst: InstalacionConAsignaciones, a: AsignacionInstalacion) => {
    setDialogTipo(tipo)
    setDialogInstalacionId(inst.id)
    setDialogInstalacionNombre(inst.nombre)
    setCostoAsignacion(a)
    setCostoDialogOpen(true)
  }

  const openTransfer = (tipo: TipoInstalacion, inst: InstalacionConAsignaciones, a: AsignacionInstalacion) => {
    setDialogTipo(tipo)
    setDialogInstalacionId(inst.id)
    setDialogInstalacionNombre(inst.nombre)
    setTransferAsignacion(a)
    setTransferDialogOpen(true)
  }

  const handleAdjustCost = async (data: AjustarCostoData): Promise<boolean> => {
    if (!costoAsignacion) return false
    const ok = await ajustarCostoAsignacion(dialogTipo, dialogInstalacionId, costoAsignacion.id, data)
    if (ok) toast({ title: "Éxito", description: "Costo ajustado" })
    else toast({ title: "Error", description: "No se pudo ajustar", variant: "destructive" })
    return ok
  }

  const handleTransfer = async (data: TransferirData): Promise<boolean> => {
    if (!transferAsignacion) return false
    const ok = await transferirAsignacion(dialogTipo, dialogInstalacionId, transferAsignacion.id, data)
    if (ok) toast({ title: "Éxito", description: "Asignación transferida" })
    else toast({ title: "Error", description: "No se pudo transferir", variant: "destructive" })
    return ok
  }

  const handleSave = async (
    data: AsignacionInstalacionCreateData | AsignacionInstalacionUpdateData,
    asignacionId?: string
  ): Promise<boolean> => {
    const ok = asignacionId
      ? await updateAsignacion(dialogTipo, dialogInstalacionId, asignacionId, data as AsignacionInstalacionUpdateData)
      : await addAsignacion(dialogTipo, dialogInstalacionId, data as AsignacionInstalacionCreateData)
    if (ok) toast({ title: "Éxito", description: asignacionId ? "Asignación guardada" : "Asignación agregada" })
    else toast({ title: "Error", description: "No se pudo guardar", variant: "destructive" })
    return ok
  }

  const toggleSeccion = (tipo: TipoInstalacion) =>
    setSeccionesAbiertas(prev => ({ ...prev, [tipo]: !prev[tipo] }))

  // Filtrado por búsqueda
  const dataFiltrada = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return data
    const matches = (inst: InstalacionConAsignaciones) =>
      inst.nombre.toLowerCase().includes(q) ||
      (inst.codigo?.toLowerCase().includes(q) ?? false)
    return {
      almacen: data.almacen.filter(matches),
      tienda: data.tienda.filter(matches),
      sede: data.sede.filter(matches),
    }
  }, [data, busqueda])

  return (
    <div className="space-y-4">
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3 flex items-center justify-between">
            <p className="text-red-800 text-sm">{error}</p>
            <Button variant="ghost" size="sm" onClick={clearError}>✕</Button>
          </CardContent>
        </Card>
      )}

      {/* Búsqueda global */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          className="pl-9"
          placeholder="Buscar instalación por nombre o código..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      {loading && data.almacen.length === 0 && data.tienda.length === 0 && data.sede.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Cargando instalaciones...</div>
      ) : (
        SECCIONES.map(({ tipo, label, icon: Icon }) => {
          const items = dataFiltrada[tipo]
          const abierta = seccionesAbiertas[tipo]
          const totalAsignaciones = items.reduce((acc, i) => acc + i.asignaciones.length, 0)
          const colores = COLORES[tipo]
          return (
            <Card key={tipo} className={`border-l-4 ${colores.borderL}`}>
              <CardHeader
                className="flex flex-row items-center justify-between py-3 px-4 cursor-pointer hover:bg-gray-50/60"
                onClick={() => toggleSeccion(tipo)}
              >
                <div className="flex items-center gap-2">
                  {abierta ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                  <Icon className={`h-4 w-4 ${colores.iconText}`} />
                  <CardTitle className="text-sm font-semibold">{label}</CardTitle>
                  <span className="text-xs text-gray-400">
                    {items.length} {items.length === 1 ? 'instalación' : 'instalaciones'} · {totalAsignaciones} recursos
                  </span>
                </div>
              </CardHeader>

              {abierta && (
                <CardContent className="px-4 pb-4 pt-0">
                  {items.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-6">
                      {busqueda ? "Sin resultados con esa búsqueda" : `No hay ${label.toLowerCase()} registrados`}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {items.map(inst => (
                        <InstalacionCard
                          key={inst.id}
                          colores={colores}
                          inst={inst}
                          loading={loading}
                          onAdd={() => openAdd(tipo, inst)}
                          onEdit={a => openEdit(tipo, inst, a)}
                          onDelete={a => openDelete(tipo, inst, a)}
                          onAdjustCost={a => openAdjustCost(tipo, inst, a)}
                          onTransfer={a => openTransfer(tipo, inst, a)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })
      )}

      <AsignacionRecursosDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        entityLabel={dialogInstalacionNombre}
        mediosBasicos={mediosBasicos}
        asignacion={editingAsignacion}
        modoEliminar={modoEliminar}
        onSave={handleSave as any}
        loading={loading}
      />

      <AjustarCostoDialog
        open={costoDialogOpen}
        onClose={() => setCostoDialogOpen(false)}
        asignacion={costoAsignacion}
        onSave={handleAdjustCost}
        loading={loading}
      />

      <TransferirAsignacionDialog
        open={transferDialogOpen}
        onClose={() => setTransferDialogOpen(false)}
        asignacion={transferAsignacion}
        origenLabel={dialogInstalacionNombre}
        origenTipo={dialogTipo}
        origenId={dialogInstalacionId}
        onSave={handleTransfer}
        loading={loading}
      />
    </div>
  )
}

// ── Card individual ────────────────────────────────────────────────────────────

interface InstalacionCardProps {
  colores: SeccionColores
  inst: InstalacionConAsignaciones
  loading?: boolean
  onAdd: () => void
  onEdit: (a: AsignacionInstalacion) => void
  onDelete: (a: AsignacionInstalacion) => void
  onAdjustCost: (a: AsignacionInstalacion) => void
  onTransfer: (a: AsignacionInstalacion) => void
}

function InstalacionCard({ inst, colores, loading, onAdd, onEdit, onDelete, onAdjustCost, onTransfer }: InstalacionCardProps) {
  const [expandida, setExpandida] = useState(false)
  const [historialOpenId, setHistorialOpenId] = useState<string | null>(null)
  const total = inst.asignaciones.length

  return (
    <div className={`rounded-lg border bg-white transition-colors ${colores.cardHover}`}>
      <div className="p-3 flex items-start justify-between gap-2">
        <button
          className="flex-1 text-left min-w-0"
          onClick={() => total > 0 && setExpandida(v => !v)}
          disabled={total === 0}
        >
          <div className="flex items-center gap-2">
            {total > 0 && (
              expandida
                ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                : <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            )}
            <p className="font-medium text-sm truncate">{inst.nombre}</p>
            {inst.codigo && (
              <span className="text-xs text-gray-400 font-mono shrink-0">{inst.codigo}</span>
            )}
          </div>
          <span className={`mt-1 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
            total > 0 ? `${colores.badgeBg} ${colores.badgeText}` : "bg-gray-100 text-gray-500"
          }`}>
            {total} {total === 1 ? "recurso" : "recursos"}
          </span>
        </button>
        <Button
          size="sm"
          variant="outline"
          className={`shrink-0 ${colores.btnBorder} ${colores.btnText} ${colores.btnHover}`}
          onClick={onAdd}
          disabled={loading}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Asignar
        </Button>
      </div>

      {expandida && total > 0 && (
        <div className="border-t bg-gray-50/50 px-3 py-2 space-y-2">
          {inst.asignaciones.map(a => {
            const costoTotal = (a.costo ?? 0) * a.cantidad
            const historialAbierto = historialOpenId === a.id
            return (
              <div key={a.id} className="rounded border bg-white p-2 text-xs">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      a.item_tipo === 'medio_basico'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {a.item_tipo === 'medio_basico' ? 'MB' : 'MAT'}
                    </span>
                    <span className="font-medium truncate">{a.nombre}</span>
                    <span className="text-gray-500 shrink-0">×{a.cantidad}</span>
                    {a.numero_serie && (
                      <span className="text-gray-400 font-mono shrink-0">{a.numero_serie}</span>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="outline" size="sm" className="h-6 w-6 p-0" title="Editar" onClick={() => onEdit(a)} disabled={loading}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-blue-700 border-blue-200 hover:bg-blue-50" title="Ajustar costo" onClick={() => onAdjustCost(a)} disabled={loading}>
                      <DollarSign className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-purple-700 border-purple-200 hover:bg-purple-50" title="Transferir" onClick={() => onTransfer(a)} disabled={loading}>
                      <ArrowRightLeft className="h-3 w-3" />
                    </Button>
                    <Button variant="destructive" size="sm" className="h-6 w-6 p-0" title="Eliminar" onClick={() => onDelete(a)} disabled={loading}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {a.descripcion && (
                  <p className="text-[11px] text-gray-500 italic mb-1 truncate">"{a.descripcion}"</p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
                  <span>Asig.: <span className="text-gray-700">{fmtFecha(a.fecha_asignacion)}</span></span>
                  <span>Costo u.: <span className="text-gray-700">{money(a.costo)}</span></span>
                  <span>Total: <span className="text-gray-700">{money(costoTotal)}</span></span>
                  <span>Dep./mes: <span className="text-amber-700">{money(a.depreciacion_mensual)}</span></span>
                  <span>Deprec.: <span className="text-amber-700">{money(a.valor_depreciado)}</span></span>
                  <span>Residual: <span className="text-emerald-700 font-semibold">{money(a.valor_residual)}</span></span>
                  {a.asignado_por && (
                    <span className="col-span-2 md:col-span-3 text-[10px] text-gray-400">
                      Asignado por: {a.asignado_por_nombre || a.asignado_por}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setHistorialOpenId(historialAbierto ? null : a.id)}
                  className="mt-1 flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700"
                >
                  {historialAbierto ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                  <History className="h-2.5 w-2.5" />
                  Historial ({(a.historial ?? []).length})
                </button>
                {historialAbierto && (
                  <div className="mt-1.5 bg-gray-50/80 rounded p-2 border">
                    <HistorialAsignacion historial={a.historial ?? []} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Helpers de formato ─────────────────────────────────────────────────────────
const money = (n?: number | null) =>
  n == null || isNaN(Number(n)) ? "—" : `$${Number(n).toFixed(2)}`

const fmtFecha = (s?: string | null) => {
  if (!s) return "—"
  const d = new Date(s)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("es-CU", { day: "2-digit", month: "2-digit", year: "numeric" })
}
