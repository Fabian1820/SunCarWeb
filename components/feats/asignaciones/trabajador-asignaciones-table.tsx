"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shared/molecule/table"
import { Button } from "@/components/shared/atom/button"
import { Plus } from "lucide-react"
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
  onDeleteAsignacion: (ci: string, id: string) => void
  loading?: boolean
}

export function TrabajadorAsignacionesTable({
  trabajadores, mediosBasicos,
  onAddAsignacion, onUpdateAsignacion, onDeleteAsignacion,
  loading,
}: TrabajadorAsignacionesTableProps) {
  const [selectedTrabajador, setSelectedTrabajador] = useState<TrabajadorConAsignaciones | null>(null)
  const [detalleOpen, setDetalleOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAsignacion, setEditingAsignacion] = useState<Asignacion | null>(null)

  const openDetalle = (t: TrabajadorConAsignaciones) => {
    setSelectedTrabajador(t)
    setDetalleOpen(true)
  }

  const openAdd = (t?: TrabajadorConAsignaciones) => {
    if (t) setSelectedTrabajador(t)
    setEditingAsignacion(null)
    setDetalleOpen(false)
    setDialogOpen(true)
  }

  const openEdit = (a: Asignacion) => {
    setEditingAsignacion(a)
    setDetalleOpen(false)
    setDialogOpen(true)
  }

  const handleDelete = (asignacionId: string) => {
    if (!selectedTrabajador) return
    onDeleteAsignacion(selectedTrabajador.CI, asignacionId)
    setSelectedTrabajador(prev =>
      prev ? { ...prev, asignaciones: prev.asignaciones.filter(a => a.id !== asignacionId) } : null
    )
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
            {trabajadores.map(t => {
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

      <TrabajadorDetalleModal
        open={detalleOpen}
        onClose={() => setDetalleOpen(false)}
        trabajador={freshSelected}
        onAdd={() => openAdd()}
        onEdit={openEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      {selectedTrabajador && (
        <AsignacionRecursosDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          entityLabel={selectedTrabajador.nombre}
          mediosBasicos={mediosBasicos}
          asignacion={editingAsignacion}
          onSave={handleSave as any}
          loading={loading}
        />
      )}
    </>
  )
}
