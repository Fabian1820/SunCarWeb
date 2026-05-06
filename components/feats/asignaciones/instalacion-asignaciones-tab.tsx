"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Plus, Package, Building2, ShoppingBag, MapPin } from "lucide-react"
import { useInstalacionAsignaciones } from "@/hooks/use-asignaciones"
import { AsignacionRecursosDialog } from "./asignacion-recursos-dialog"
import type {
  TipoInstalacion,
  Instalacion,
  InstalacionConAsignaciones,
  AsignacionInstalacion,
  AsignacionInstalacionCreateData,
  AsignacionInstalacionUpdateData,
  MedioBasico,
} from "@/lib/types/feats/asignaciones/asignacion-types"
import { useToast } from "@/hooks/use-toast"

const TIPOS: { value: TipoInstalacion; label: string; labelPlural: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'almacen', label: 'Almacén', labelPlural: 'Almacenes', icon: Package },
  { value: 'tienda', label: 'Tienda', labelPlural: 'Tiendas', icon: ShoppingBag },
  { value: 'sede', label: 'Sede', labelPlural: 'Sedes', icon: Building2 },
]

interface InstalacionAsignacionesTabProps {
  mediosBasicos: MedioBasico[]
}

export function InstalacionAsignacionesTab({ mediosBasicos }: InstalacionAsignacionesTabProps) {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoInstalacion | 'todos'>('todos')
  const [instalacionId, setInstalacionId] = useState<string>("")

  const tipoParaHook = tipoSeleccionado === 'todos' ? null : tipoSeleccionado
  const { instalaciones, entidades, loading, error, clearError, addAsignacion, updateAsignacion, removeAsignacion } =
    useInstalacionAsignaciones(tipoParaHook)

  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAsignacion, setEditingAsignacion] = useState<AsignacionInstalacion | null>(null)
  const [dialogInstalacionId, setDialogInstalacionId] = useState<string>("")
  const [dialogEntityLabel, setDialogEntityLabel] = useState("")

  const openAdd = (inst: InstalacionConAsignaciones) => {
    setDialogInstalacionId(inst._id)
    setDialogEntityLabel(inst.nombre)
    setEditingAsignacion(null)
    setDialogOpen(true)
  }

  const openEdit = (inst: InstalacionConAsignaciones, a: AsignacionInstalacion) => {
    setDialogInstalacionId(inst._id)
    setDialogEntityLabel(inst.nombre)
    setEditingAsignacion(a)
    setDialogOpen(true)
  }

  const handleSave = async (
    data: AsignacionInstalacionCreateData | AsignacionInstalacionUpdateData,
    asignacionId?: string
  ): Promise<boolean> => {
    let ok: boolean
    if (asignacionId) {
      ok = await updateAsignacion(dialogInstalacionId, asignacionId, data as AsignacionInstalacionUpdateData)
      if (ok) toast({ title: "Éxito", description: "Asignación actualizada" })
      else toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" })
    } else {
      ok = await addAsignacion(dialogInstalacionId, data as AsignacionInstalacionCreateData)
      if (ok) toast({ title: "Éxito", description: "Asignación agregada" })
      else toast({ title: "Error", description: "No se pudo agregar", variant: "destructive" })
    }
    return ok
  }

  const handleDelete = async (instalacionId: string, asignacionId: string) => {
    if (!confirm("¿Eliminar esta asignación?")) return
    const ok = await removeAsignacion(instalacionId, asignacionId)
    if (ok) toast({ title: "Éxito", description: "Asignación eliminada" })
    else toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" })
  }

  // Determinar qué instalaciones mostrar según filtros
  const instalacionesMostradas: InstalacionConAsignaciones[] = (() => {
    if (tipoSeleccionado === 'todos') return instalaciones
    if (instalacionId) return instalaciones.filter(i => i._id === instalacionId)
    return instalaciones
  })()

  // Label del tipo seleccionado
  const tipoInfo = TIPOS.find(t => t.value === tipoSeleccionado)

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

      {/* Filtros */}
      <Card className="border-l-4 border-l-indigo-500">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Selector tipo */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Tipo de instalación</label>
              <div className="flex gap-1">
                <button
                  onClick={() => { setTipoSeleccionado('todos'); setInstalacionId("") }}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    tipoSeleccionado === 'todos'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  Todos
                </button>
                {TIPOS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => { setTipoSeleccionado(value); setInstalacionId("") }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      tipoSeleccionado === value
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector entidad específica */}
            {tipoSeleccionado !== 'todos' && entidades.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">
                  {tipoInfo?.label} específico/a
                </label>
                <select
                  className="text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[200px]"
                  value={instalacionId}
                  onChange={e => setInstalacionId(e.target.value)}
                >
                  <option value="">— Todos los {tipoInfo?.labelPlural} —</option>
                  {entidades.map(e => (
                    <option key={e._id} value={e._id}>
                      {e.nombre}{e.codigo ? ` (${e.codigo})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de instalaciones */}
      {tipoSeleccionado === 'todos' ? (
        <div className="text-center py-16 text-gray-400">
          <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selecciona un tipo de instalación para ver las asignaciones</p>
        </div>
      ) : loading && instalaciones.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Cargando...</div>
      ) : instalacionesMostradas.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No hay instalaciones con asignaciones
        </div>
      ) : (
        <div className="space-y-4">
          {instalacionesMostradas.map(inst => (
            <Card key={inst._id} className="border-l-4 border-l-indigo-400">
              <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
                <div className="flex items-center gap-2">
                  {tipoInfo?.icon && <tipoInfo.icon className="h-4 w-4 text-indigo-500" />}
                  <CardTitle className="text-sm font-semibold">
                    {inst.nombre}
                    {inst.codigo && <span className="ml-2 text-xs font-normal text-gray-400">({inst.codigo})</span>}
                  </CardTitle>
                  <span className="text-xs text-gray-400">{inst.asignaciones.length} asignaciones</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                  onClick={() => openAdd(inst)}
                  disabled={loading}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Asignar
                </Button>
              </CardHeader>
              {inst.asignaciones.length > 0 && (
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Recurso</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Tipo</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600">Cant.</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">N° Serie</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inst.asignaciones.map((a, i) => (
                          <tr key={a.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                            <td className="px-3 py-2 font-medium">{a.nombre}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                a.item_tipo === 'medio_basico'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {a.item_tipo === 'medio_basico' ? 'Medio básico' : 'Material'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-medium">{a.cantidad}</td>
                            <td className="px-3 py-2 text-gray-500 font-mono text-xs">
                              {a.numero_serie || <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEdit(inst, a)}
                                  disabled={loading}
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(inst._id, a.id)}
                                  disabled={loading}
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <AsignacionRecursosDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        entityLabel={dialogEntityLabel}
        mediosBasicos={mediosBasicos}
        asignacion={editingAsignacion}
        onSave={handleSave as any}
        loading={loading}
      />
    </div>
  )
}
