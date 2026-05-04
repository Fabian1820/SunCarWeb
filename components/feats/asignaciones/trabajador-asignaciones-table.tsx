"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shared/molecule/table"
import { Button } from "@/components/shared/atom/button"
import { Plus } from "lucide-react"
import type {
  TrabajadorConAsignaciones, Asignacion, MedioBasico,
  AsignacionCreateData, AsignacionUpdateData,
  HerramientaCatalogo, HerramientaAsignada,
  HerramientaAsignarData, HerramientaUpdateData,
} from "@/lib/types/feats/asignaciones/asignacion-types"
import { AsignacionDialog } from "./asignacion-dialog"
import { HerramientaDialog } from "./herramienta-dialog"
import { TrabajadorDetalleModal } from "./trabajador-detalle-modal"

interface TrabajadorAsignacionesTableProps {
  trabajadores: TrabajadorConAsignaciones[]
  mediosBasicos: MedioBasico[]
  catalogoHerramientas: HerramientaCatalogo[]
  onAddAsignacion: (ci: string, data: AsignacionCreateData) => Promise<boolean>
  onUpdateAsignacion: (ci: string, id: string, data: AsignacionUpdateData) => Promise<boolean>
  onDeleteAsignacion: (ci: string, id: string) => void
  onAddHerramienta: (ci: string, data: HerramientaAsignarData) => Promise<boolean>
  onUpdateHerramienta: (ci: string, id: string, data: HerramientaUpdateData) => Promise<boolean>
  onDeleteHerramienta: (ci: string, id: string) => void
  loading?: boolean
}

export function TrabajadorAsignacionesTable({
  trabajadores, mediosBasicos, catalogoHerramientas,
  onAddAsignacion, onUpdateAsignacion, onDeleteAsignacion,
  onAddHerramienta, onUpdateHerramienta, onDeleteHerramienta,
  loading,
}: TrabajadorAsignacionesTableProps) {
  const [selectedTrabajador, setSelectedTrabajador] = useState<TrabajadorConAsignaciones | null>(null)
  const [detalleOpen, setDetalleOpen] = useState(false)

  const [asignacionDialogOpen, setAsignacionDialogOpen] = useState(false)
  const [editingAsignacion, setEditingAsignacion] = useState<Asignacion | null>(null)

  const [herramientaDialogOpen, setHerramientaDialogOpen] = useState(false)
  const [editingHerramienta, setEditingHerramienta] = useState<HerramientaAsignada | null>(null)

  const openDetalle = (t: TrabajadorConAsignaciones) => {
    setSelectedTrabajador(t)
    setDetalleOpen(true)
  }

  // ── Asignaciones ────────────────────────────────────────────────────────────
  const openAddAsignacion = (t?: TrabajadorConAsignaciones) => {
    if (t) setSelectedTrabajador(t)
    setEditingAsignacion(null)
    setDetalleOpen(false)
    setAsignacionDialogOpen(true)
  }

  const openEditAsignacion = (a: Asignacion) => {
    setEditingAsignacion(a)
    setDetalleOpen(false)
    setAsignacionDialogOpen(true)
  }

  const handleDeleteAsignacion = (asignacionId: string) => {
    if (!selectedTrabajador) return
    onDeleteAsignacion(selectedTrabajador.CI, asignacionId)
    setSelectedTrabajador(prev =>
      prev ? { ...prev, asignaciones: prev.asignaciones.filter(a => a.id !== asignacionId) } : null
    )
  }

  const handleSaveAsignacion = async (ci: string, data: AsignacionCreateData | AsignacionUpdateData, asignacionId?: string) => {
    let ok: boolean
    if (asignacionId) {
      ok = await onUpdateAsignacion(ci, asignacionId, data as AsignacionUpdateData)
    } else {
      ok = await onAddAsignacion(ci, data as AsignacionCreateData)
    }
    setAsignacionDialogOpen(false)
    return ok
  }

  // ── Herramientas ─────────────────────────────────────────────────────────────
  const openAddHerramienta = (t?: TrabajadorConAsignaciones) => {
    if (t) setSelectedTrabajador(t)
    setEditingHerramienta(null)
    setDetalleOpen(false)
    setHerramientaDialogOpen(true)
  }

  const openEditHerramienta = (h: HerramientaAsignada) => {
    setEditingHerramienta(h)
    setDetalleOpen(false)
    setHerramientaDialogOpen(true)
  }

  const handleDeleteHerramienta = (herramientaId: string) => {
    if (!selectedTrabajador) return
    onDeleteHerramienta(selectedTrabajador.CI, herramientaId)
    setSelectedTrabajador(prev =>
      prev ? { ...prev, herramientas: (prev.herramientas ?? []).filter(h => h.id !== herramientaId) } : null
    )
  }

  const handleSaveHerramienta = async (ci: string, data: HerramientaAsignarData | HerramientaUpdateData, herramientaId?: string) => {
    let ok: boolean
    if (herramientaId) {
      ok = await onUpdateHerramienta(ci, herramientaId, data as HerramientaUpdateData)
    } else {
      ok = await onAddHerramienta(ci, data as HerramientaAsignarData)
    }
    setHerramientaDialogOpen(false)
    return ok
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
              <TableHead className="text-center">Medios</TableHead>
              <TableHead className="text-center">Herramientas</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trabajadores.map(t => (
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
                    t.asignaciones.length > 0 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {t.asignaciones.length}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    (t.herramientas?.length ?? 0) > 0 ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {t.herramientas?.length ?? 0}
                  </span>
                </TableCell>
                <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDetalle(t)}
                    disabled={loading}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Asignar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TrabajadorDetalleModal
        open={detalleOpen}
        onClose={() => setDetalleOpen(false)}
        trabajador={freshSelected}
        onAdd={() => openAddAsignacion()}
        onEdit={openEditAsignacion}
        onDelete={handleDeleteAsignacion}
        onAddHerramienta={() => openAddHerramienta()}
        onEditHerramienta={openEditHerramienta}
        onDeleteHerramienta={handleDeleteHerramienta}
        loading={loading}
      />

      {selectedTrabajador && (
        <AsignacionDialog
          open={asignacionDialogOpen}
          onClose={() => setAsignacionDialogOpen(false)}
          trabajadorCI={selectedTrabajador.CI}
          trabajadorNombre={selectedTrabajador.nombre}
          mediosBasicos={mediosBasicos}
          asignacion={editingAsignacion}
          onSave={handleSaveAsignacion}
          loading={loading}
        />
      )}

      {selectedTrabajador && (
        <HerramientaDialog
          open={herramientaDialogOpen}
          onClose={() => setHerramientaDialogOpen(false)}
          trabajadorCI={selectedTrabajador.CI}
          trabajadorNombre={selectedTrabajador.nombre}
          catalogo={catalogoHerramientas}
          herramienta={editingHerramienta}
          onSave={handleSaveHerramienta}
          loading={loading}
        />
      )}
    </>
  )
}
