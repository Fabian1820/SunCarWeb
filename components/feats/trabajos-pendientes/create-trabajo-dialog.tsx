/**
 * Create Trabajo Pendiente Dialog Component
 *
 * Dialog form for creating a new pending work assignment
 * Includes client selector with search and manual CI entry
 */

import { useState, useEffect, useMemo } from 'react'
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
import type { TrabajoPendienteCreateData } from '@/lib/types/feats/trabajos-pendientes/trabajo-pendiente-types'
import type { Cliente } from '@/lib/types/feats/customer/cliente-types'

interface CreateTrabajoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: TrabajoPendienteCreateData) => Promise<void>
  clientes: Cliente[]
  initialCI?: string // Optional pre-filled CI
}

export function CreateTrabajoDialog({
  open,
  onOpenChange,
  onSubmit,
  clientes,
  initialCI
}: CreateTrabajoDialogProps) {
  const [loading, setLoading] = useState(false)
  const [useManualCI, setUseManualCI] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState<TrabajoPendienteCreateData>({
    CI: initialCI || '',
    estado: 'Pendiente',
    fecha_inicio: new Date().toISOString().split('T')[0],
    is_active: true,
    veces_visitado: 0,
    stopped_by: null,
    comentario: null,
    responsable_parada: null
  })

  // Reset form when dialog opens/closes or initialCI changes
  useEffect(() => {
    if (open) {
      setFormData({
        CI: initialCI || '',
        estado: 'Pendiente',
        fecha_inicio: new Date().toISOString().split('T')[0],
        is_active: true,
        veces_visitado: 0,
        stopped_by: null,
        comentario: null,
        responsable_parada: null
      })
      setUseManualCI(!!initialCI)
      setSearchTerm('')
    }
  }, [open, initialCI])

  // Filter clients by search term
  const filteredClientes = useMemo(() => {
    if (!searchTerm.trim()) return clientes
    const lower = searchTerm.toLowerCase()
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(lower) ||
        c.carnet_identidad?.toLowerCase().includes(lower) ||
        c.numero.toLowerCase().includes(lower)
    )
  }, [clientes, searchTerm])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.CI.trim()) {
      alert('Por favor ingrese un CI')
      return
    }
    if (!formData.estado.trim()) {
      alert('Por favor seleccione un estado')
      return
    }
    if (!formData.fecha_inicio) {
      alert('Por favor seleccione una fecha de inicio')
      return
    }

    setLoading(true)
    try {
      await onSubmit(formData)
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating trabajo:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClientSelect = (value: string) => {
    setFormData({ ...formData, CI: value })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-orange-600">
            Crear Trabajo Pendiente
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Selection Section */}
          <div className="space-y-3 border-b pb-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useManualCI"
                checked={useManualCI}
                onChange={(e) => {
                  setUseManualCI(e.target.checked)
                  if (!e.target.checked) {
                    setFormData({ ...formData, CI: '' })
                  }
                }}
                className="rounded border-gray-300"
              />
              <Label htmlFor="useManualCI" className="cursor-pointer">
                Ingresar CI manualmente
              </Label>
            </div>

            {!useManualCI ? (
              <div>
                <Label htmlFor="searchCliente">Buscar Cliente</Label>
                <Input
                  id="searchCliente"
                  placeholder="Buscar por nombre o CI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-2"
                />
                <Select value={formData.CI} onValueChange={handleClientSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredClientes.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">
                        No se encontraron clientes
                      </div>
                    ) : (
                      filteredClientes.map((cliente) => (
                        <SelectItem
                          key={cliente.numero}
                          value={cliente.carnet_identidad || cliente.numero}
                        >
                          {cliente.nombre} - CI: {cliente.carnet_identidad || 'N/A'}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label htmlFor="manualCI">CI Manual</Label>
                <Input
                  id="manualCI"
                  placeholder="Ingresar CI..."
                  value={formData.CI}
                  onChange={(e) => setFormData({ ...formData, CI: e.target.value })}
                  required
                />
              </div>
            )}
          </div>

          {/* Estado */}
          <div>
            <Label htmlFor="estado">Estado *</Label>
            <Select
              value={formData.estado}
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
              value={formData.fecha_inicio}
              onChange={(e) =>
                setFormData({ ...formData, fecha_inicio: e.target.value })
              }
              required
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
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              className="rounded border-gray-300"
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Trabajo activo
            </Label>
          </div>

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
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
