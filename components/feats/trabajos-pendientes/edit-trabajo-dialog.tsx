/**
 * Edit Trabajo Pendiente Dialog Component
 *
 * Dialog form for editing an existing pending work assignment
 * Pre-fills fields with current trabajo data
 */

import { useState, useEffect } from 'react'
import { Loader2, Save, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/shared/molecule/dialog'
import { Button } from '@/components/shared/atom/button'
import { Input } from '@/components/shared/molecule/input'
import { Label } from '@/components/shared/atom/label'
import { Textarea } from '@/components/shared/molecule/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/shared/atom/select'
import { FileUploadSection } from './file-upload-section'
import { TrabajoPendienteService } from '@/lib/api-services'
import type {
  TrabajoPendiente,
  TrabajoPendienteCreateData
} from '@/lib/types/feats/trabajos-pendientes/trabajo-pendiente-types'

interface EditTrabajoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (id: string, data: Partial<TrabajoPendienteCreateData>) => Promise<void>
  trabajo: TrabajoPendiente | null
}

export function EditTrabajoDialog({
  open,
  onOpenChange,
  onSubmit,
  trabajo
}: EditTrabajoDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<TrabajoPendienteCreateData>>({})

  // Load trabajo data when dialog opens
  useEffect(() => {
    if (open && trabajo) {
      setFormData({
        CI: trabajo.CI,
        estado: trabajo.estado,
        fecha_inicio: trabajo.fecha_inicio
          ? trabajo.fecha_inicio.split('T')[0]
          : new Date().toISOString().split('T')[0],
        is_active: trabajo.is_active,
        veces_visitado: trabajo.veces_visitado,
        stopped_by: trabajo.stopped_by,
        comentario: trabajo.comentario,
        responsable_parada: trabajo.responsable_parada
      })
    }
  }, [open, trabajo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!trabajo?.id) {
      alert('Error: No se pudo identificar el trabajo')
      return
    }

    // Validation
    if (!formData.estado?.trim()) {
      alert('Por favor ingrese un estado')
      return
    }
    if (!formData.fecha_inicio) {
      alert('Por favor seleccione una fecha de inicio')
      return
    }

    setLoading(true)
    try {
      await onSubmit(trabajo.id, formData)
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating trabajo:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!trabajo) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-orange-600">
            Editar Trabajo Pendiente
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* CI/Lead - Read only */}
          <div>
            <Label htmlFor="referencia_readonly">
              {trabajo.tipo_referencia === 'lead' ? 'Lead ID' : 'CI'} (No editable)
            </Label>
            <Input
              id="referencia_readonly"
              value={trabajo.CI || trabajo.lead_id || 'N/A'}
              readOnly
              disabled
              className="bg-gray-100 cursor-not-allowed"
            />
            {trabajo.Nombre && (
              <p className="text-sm text-gray-500 mt-1">
                {trabajo.tipo_referencia === 'lead' ? 'Lead' : 'Cliente'}: {trabajo.Nombre}
              </p>
            )}
          </div>

          {/* Estado */}
          <div>
            <Label htmlFor="estado">Estado *</Label>
            <Select
              value={formData.estado || ''}
              onValueChange={(value) => setFormData({ ...formData, estado: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="Finalizado">Finalizado</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fecha de Inicio */}
          <div>
            <Label htmlFor="fecha_inicio">Fecha de Inicio *</Label>
            <Input
              id="fecha_inicio"
              type="date"
              value={formData.fecha_inicio || ''}
              onChange={(e) =>
                setFormData({ ...formData, fecha_inicio: e.target.value })
              }
              required
            />
          </div>

          {/* Veces Visitado */}
          <div>
            <Label htmlFor="veces_visitado">Veces Visitado</Label>
            <Input
              id="veces_visitado"
              type="number"
              min="0"
              value={formData.veces_visitado || 0}
              onChange={(e) =>
                setFormData({ ...formData, veces_visitado: parseInt(e.target.value) || 0 })
              }
            />
          </div>

          {/* Detenido Por */}
          <div>
            <Label htmlFor="stopped_by">Detenido Por</Label>
            <Input
              id="stopped_by"
              placeholder="Motivo de la detención (opcional)"
              value={formData.stopped_by || ''}
              onChange={(e) =>
                setFormData({ ...formData, stopped_by: e.target.value || null })
              }
            />
          </div>

          {/* Responsable de la Parada */}
          <div>
            <Label htmlFor="responsable_parada">Responsable de la Parada</Label>
            <Select
              value={formData.responsable_parada || 'none'}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  responsable_parada: value === 'none' ? null : (value as any)
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar responsable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">N/A</SelectItem>
                <SelectItem value="nosotros">Nosotros</SelectItem>
                <SelectItem value="el cliente">El Cliente</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Comentario */}
          <div>
            <Label htmlFor="comentario">Comentario</Label>
            <Textarea
              id="comentario"
              placeholder="Comentarios adicionales (opcional)"
              value={formData.comentario || ''}
              onChange={(e) =>
                setFormData({ ...formData, comentario: e.target.value || null })
              }
              rows={3}
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active ?? true}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              className="rounded border-gray-300"
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Trabajo activo
            </Label>
          </div>

          {/* Archivos Section */}
          {trabajo.id && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Archivos Adjuntos</h3>
              <FileUploadSection
                archivos={trabajo.archivos || []}
                onUpload={async (files) => {
                  if (trabajo.id) {
                    await TrabajoPendienteService.uploadArchivos(trabajo.id, files)
                    // Reload trabajo data would happen in parent component
                  }
                }}
                onDelete={async (archivoId) => {
                  if (trabajo.id) {
                    await TrabajoPendienteService.deleteArchivo(trabajo.id, archivoId)
                    // Reload trabajo data would happen in parent component
                  }
                }}
                disabled={loading}
              />
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto touch-manipulation"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Actualizar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
