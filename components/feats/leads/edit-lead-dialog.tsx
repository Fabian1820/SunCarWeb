"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Loader2 } from "lucide-react"
import type { Lead, LeadUpdateData } from "@/lib/api-types"

interface EditLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead
  onSubmit: (data: LeadUpdateData) => Promise<void>
  isLoading?: boolean
}

export function EditLeadDialog({ open, onOpenChange, lead, onSubmit, isLoading }: EditLeadDialogProps) {
  const [formData, setFormData] = useState<LeadUpdateData>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fuentesDisponibles = [
    'página web',
    'redes sociales', 
    'referencia',
    'publicidad',
    'evento',
    'llamada fría',
    'email',
    'otro'
  ]

  const paisesDisponibles = [
    'Cuba',
    'España',
    'México',
    'Argentina',
    'Colombia',
    'Venezuela',
    'Chile',
    'Perú',
    'Ecuador',
    'Uruguay',
    'Paraguay',
    'Bolivia',
    'Costa Rica',
    'Panamá',
    'Guatemala',
    'Honduras',
    'El Salvador',
    'Nicaragua',
    'República Dominicana',
    'Puerto Rico',
    'Estados Unidos',
    'Canadá',
    'Brasil',
    'Francia',
    'Italia',
    'Alemania',
    'Reino Unido',
    'Portugal'
  ]

  // Inicializar el formulario con los datos del lead cuando cambie el lead o se abra el dialog
  useEffect(() => {
    if (lead && open) {
      setFormData({
        fecha_contacto: lead.fecha_contacto,
        nombre: lead.nombre,
        telefono: lead.telefono,
        estado: lead.estado,
        fuente: lead.fuente || '',
        referencia: lead.referencia || '',
        direccion: lead.direccion || '',
        pais_contacto: lead.pais_contacto || '',
        necesidad: lead.necesidad || '',
        provincia_montaje: lead.provincia_montaje || ''
      })
      setErrors({})
    }
  }, [lead, open])

  const handleInputChange = (field: keyof LeadUpdateData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Campos obligatorios
    if (formData.fecha_contacto && !formData.fecha_contacto.trim()) {
      newErrors.fecha_contacto = 'La fecha de contacto es obligatoria'
    }
    if (formData.nombre && !formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio'
    }
    if (formData.telefono && !formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es obligatorio'
    }
    if (formData.estado && !formData.estado.trim()) {
      newErrors.estado = 'El estado es obligatorio'
    }

    // Validar formato de teléfono (básico)
    if (formData.telefono && !/^[\+]?[0-9\s\-\(\)]{7,}$/.test(formData.telefono)) {
      newErrors.telefono = 'El formato del teléfono no es válido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // Solo enviar campos que han cambiado
    const changedData: LeadUpdateData = {}
    Object.keys(formData).forEach(key => {
      const field = key as keyof LeadUpdateData
      const currentValue = formData[field]
      const originalValue = lead[field]

      if (currentValue !== originalValue) {
        changedData[field] = currentValue
      }
    })

    // Si no hay cambios, no enviar nada
    if (Object.keys(changedData).length === 0) {
      onOpenChange(false)
      return
    }

    try {
      await onSubmit(changedData)
    } catch (error) {
      console.error('Error al actualizar lead:', error)
    }
  }

  const handleCancel = () => {
    setFormData({})
    setErrors({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Lead - {lead.nombre}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fecha de Contacto */}
            <div>
              <Label htmlFor="fecha_contacto">
                Fecha de Contacto <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fecha_contacto"
                type="date"
                value={formData.fecha_contacto || ''}
                onChange={(e) => handleInputChange('fecha_contacto', e.target.value)}
                className={errors.fecha_contacto ? 'border-red-500' : ''}
              />
              {errors.fecha_contacto && (
                <p className="text-sm text-red-500 mt-1">{errors.fecha_contacto}</p>
              )}
            </div>

            {/* Nombre */}
            <div>
              <Label htmlFor="nombre">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Nombre del lead"
                value={formData.nombre || ''}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
                className={errors.nombre ? 'border-red-500' : ''}
              />
              {errors.nombre && (
                <p className="text-sm text-red-500 mt-1">{errors.nombre}</p>
              )}
            </div>

            {/* Teléfono */}
            <div>
              <Label htmlFor="telefono">
                Teléfono <span className="text-red-500">*</span>
              </Label>
              <Input
                id="telefono"
                placeholder="+1234567890"
                value={formData.telefono || ''}
                onChange={(e) => handleInputChange('telefono', e.target.value)}
                className={errors.telefono ? 'border-red-500' : ''}
              />
              {errors.telefono && (
                <p className="text-sm text-red-500 mt-1">{errors.telefono}</p>
              )}
            </div>

            {/* Estado */}
            <div>
              <Label htmlFor="estado">
                Estado <span className="text-red-500">*</span>
              </Label>
              <Input
                id="estado"
                placeholder="Escribir estado del lead"
                value={formData.estado || ''}
                onChange={(e) => handleInputChange('estado', e.target.value)}
                className={errors.estado ? 'border-red-500' : ''}
              />
              {errors.estado && (
                <p className="text-sm text-red-500 mt-1">{errors.estado}</p>
              )}
            </div>

            {/* Fuente */}
            <div>
              <Label htmlFor="fuente">Fuente</Label>
              <Input
                id="fuente"
                list="fuentes-datalist-edit"
                placeholder="Escribir o seleccionar fuente..."
                value={formData.fuente || ''}
                onChange={(e) => handleInputChange('fuente', e.target.value)}
              />
              <datalist id="fuentes-datalist-edit">
                {fuentesDisponibles.map((source) => (
                  <option key={source} value={source} />
                ))}
              </datalist>
            </div>

            {/* Referencia */}
            <div>
              <Label htmlFor="referencia">Referencia</Label>
              <Input
                id="referencia"
                placeholder="Cliente anterior, empleado, etc."
                value={formData.referencia || ''}
                onChange={(e) => handleInputChange('referencia', e.target.value)}
              />
            </div>

            {/* País de Contacto */}
            <div>
              <Label htmlFor="pais_contacto">País de Contacto</Label>
              <Input
                id="pais_contacto"
                list="paises-datalist-edit"
                placeholder="Escribir o seleccionar país..."
                value={formData.pais_contacto || ''}
                onChange={(e) => handleInputChange('pais_contacto', e.target.value)}
              />
              <datalist id="paises-datalist-edit">
                {paisesDisponibles.map((pais) => (
                  <option key={pais} value={pais} />
                ))}
              </datalist>
            </div>

            {/* Provincia de Montaje */}
            <div>
              <Label htmlFor="provincia_montaje">Provincia de Montaje</Label>
              <Input
                id="provincia_montaje"
                placeholder="Madrid, Barcelona, etc."
                value={formData.provincia_montaje || ''}
                onChange={(e) => handleInputChange('provincia_montaje', e.target.value)}
              />
            </div>
          </div>

          {/* Dirección */}
          <div>
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              placeholder="Calle 123, Ciudad"
              value={formData.direccion || ''}
              onChange={(e) => handleInputChange('direccion', e.target.value)}
            />
          </div>

          {/* Necesidad */}
          <div>
            <Label htmlFor="necesidad">Necesidad</Label>
            <Textarea
              id="necesidad"
              placeholder="Describe la necesidad específica del cliente..."
              value={formData.necesidad || ''}
              onChange={(e) => handleInputChange('necesidad', e.target.value)}
              rows={3}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Actualizar Lead'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}