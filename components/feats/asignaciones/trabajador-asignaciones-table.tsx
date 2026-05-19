"use client"

import { useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shared/molecule/table"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Plus, Search, X } from "lucide-react"
import type {
  TrabajadorConAsignaciones, Asignacion, MedioBasico,
  AsignacionCreateData, AsignacionUpdateData,
} from "@/lib/types/feats/asignaciones/asignacion-types"
import { AsignacionRecursosDialog } from "./asignacion-recursos-dialog"
import { TrabajadorDetalleModal } from "./trabajador-detalle-modal"

interface TrabajadorAsignacionesTableProps {
  trabajadores: TrabajadorConAsignaciones[]
  mediosBasicos: MedioBasico[]
  onAddAsignacion: (ci: string, data: AsignacionCreateData) => Promise<boolean>
  onUpdateAsignacion: (ci: string, id: string, data: AsignacionUpdateData) => Promise<boolean>
  loading?: boolean
}

export function TrabajadorAsignacionesTable({
  trabajadores, mediosBasicos,
  onAddAsignacion, onUpdateAsignacion,
  loading,
}: TrabajadorAsignacionesTableProps) {
  const [selectedTrabajador, setSelectedTrabajador] = useState<TrabajadorConAsignaciones | null>(null)
  const [detalleOpen, setDetalleOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAsignacion, setEditingAsignacion] = useState<Asignacion | null>(null)
  const [modoEliminar, setModoEliminar] = useState(false)
  const [busqueda, setBusqueda] = useState("")

  const trabajadoresFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return trabajadores
    return trabajadores.filter(t =>
      t.nombre.toLowerCase().includes(q) ||
      t.CI.toLowerCase().includes(q) ||
      (t.cargo?.toLowerCase().includes(q) ?? false)
    )
  }, [trabajadores, busqueda])

  const openDetalle = (t: TrabajadorConAsignaciones) => {
    setSelectedTrabajador(t)
    setDetalleOpen(true)
  }

  const openAdd = (t?: TrabajadorConAsignaciones) => {
    if (t) setSelectedTrabajador(t)
    setEditingAsignacion(null)
    setModoEliminar(false)
    setDetalleOpen(false)
    setDialogOpen(true)
  }

  const openEdit = (a: Asignacion) => {
    setEditingAsignacion(a)
    setModoEliminar(false)
    setDetalleOpen(false)
    setDialogOpen(true)
  }

  const openDelete = (a: Asignacion) => {
    setEditingAsignacion(a)
    setModoEliminar(true)
    setDetalleOpen(false)
    setDialogOpen(true)
  }

  const handleSave = async (
    data: AsignacionCreateData | AsignacionUpdateData,
    asignacionId?: string
  ): Promise<boolean> => {
    if (!selectedTrabajador) return false
    if (asignacionId) {
      return onUpdateAsignacion(selectedTrabajador.CI, asignacionId, data as AsignacionUpdateData)
    }
    return onAddAsignacion(selectedTrabajador.CI, data as AsignacionCreateData)
  }

  if (trabajadores.length === 0) {
    return <div className="text-center py-10"><p className="text-gray-500 text-sm">No hay trabajadores activos</p></div>
  }

  const freshSelected = selectedTrabajador
    ? trabajadores.find(t => t.CI === selectedTrabajador.CI) ?? selectedTrabajador
    : null

  return (
    <>
      {/* Buscador */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          className="pl-9 pr-9"
          placeholder="Buscar por nombre, CI o cargo..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Trabajador</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead className="text-center">Recursos</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trabajadoresFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-gray-400 py-8">
                  Sin resultados para "{busqueda}"
                </TableCell>
              </TableRow>
            )}
            {trabajadoresFiltrados.map(t => {
              const total = t.asignaciones.length
              return (
                <TableRow
                  key={t.CI}
                  className="cursor-pointer hover:bg-orange-50/40 transition-colors"
                  onClick={() => openDetalle(t)}
                >
                  <TableCell className="font-medium">
                    <div>{t.nombre}</div>
                    <div className="text-xs text-gray-400">CI: {t.CI}</div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{t.cargo}</TableCell>
                  <TableCell className="text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      total > 0 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {total}
                    </span>
                  </TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAdd(t)}
                      disabled={loading}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Asignar
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        {busqueda
          ? `${trabajadoresFiltrados.length} de ${trabajadores.length} trabajadores`
          : `${trabajadores.length} trabajadores`}
      </p>

      <TrabajadorDetalleModal
        open={detalleOpen}
        onClose={() => setDetalleOpen(false)}
        trabajador={freshSelected}
        onAdd={() => openAdd()}
        onEdit={openEdit}
        onDelete={openDelete}
        loading={loading}
      />

      {selectedTrabajador && (
        <AsignacionRecursosDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          entityLabel={selectedTrabajador.nombre}
          mediosBasicos={mediosBasicos}
          asignacion={editingAsignacion}
          modoEliminar={modoEliminar}
          onSave={handleSave as any}
          loading={loading}
        />
      )}
    </>
  )
}
