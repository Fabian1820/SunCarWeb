"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Loader2 } from "lucide-react"
import type { ElementoPersonalizado, Lead, LeadUpdateData, OfertaAsignacion, OfertaEmbebida } from "@/lib/api-types"
import { ElementosPersonalizadosFields } from "./elementos-personalizados-fields"
import { OfertasAsignacionFields } from "./ofertas-asignacion-fields"

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
  const [ofertas, setOfertas] = useState<OfertaAsignacion[]>([])
  const [elementosPersonalizados, setElementosPersonalizados] = useState<ElementoPersonalizado[]>([])

  // Función para convertir ofertas embebidas a asignaciones
  const convertOfertasToAsignaciones = (ofertasEmbebidas: OfertaEmbebida[] | undefined): OfertaAsignacion[] => {
    if (!ofertasEmbebidas || ofertasEmbebidas.length === 0) return []
    return ofertasEmbebidas
      .filter(oferta => oferta.id) // Solo ofertas con ID
      .map(oferta => ({
        oferta_id: oferta.id!,
        cantidad: oferta.cantidad || 1
      }))
  }

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
  const convertDateToInput = (value?: string): string => {
    if (!value) return ""
    if (value.match(/^\d{4}-\d{2}-\d{2}$/)) return value
    if (value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = value.split("/")
      return `${year}-${month}-${day}`
    }
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      const month = String(parsed.getMonth() + 1).padStart(2, "0")
      const day = String(parsed.getDate()).padStart(2, "0")
      return `${parsed.getFullYear()}-${month}-${day}`
    }
    return ""
  }

  const convertDateFromInput = (value: string): string => {
    if (!value) return ""
    if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = value.split("-")
      return `${day}/${month}/${year}`
    }
    return value
  }

  useEffect(() => {
    if (lead && open) {
      setFormData({
        fecha_contacto: convertDateToInput(lead.fecha_contacto),
        nombre: lead.nombre,
        telefono: lead.telefono,
        telefono_adicional: lead.telefono_adicional || '',
        estado: lead.estado,
        fuente: lead.fuente || '',
        referencia: lead.referencia || '',
        direccion: lead.direccion || '',
        pais_contacto: lead.pais_contacto || '',
        comentario: lead.comentario || '',
        provincia_montaje: lead.provincia_montaje || '',
        comercial: lead.comercial || '',
        metodo_pago: lead.metodo_pago || '',
        moneda: lead.moneda || '',
      })
      // Convertir ofertas embebidas a asignaciones para editar
      setOfertas(convertOfertasToAsignaciones(lead.ofertas))
      setElementosPersonalizados(
        lead.elementos_personalizados ? JSON.parse(JSON.stringify(lead.elementos_personalizados)) : []
      )
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
    Object.entries(formData).forEach(([key, value]) => {
      const field = key as keyof LeadUpdateData

      if (field === 'fecha_contacto') {
        const originalDate = convertDateToInput(lead.fecha_contacto)
        if (value !== originalDate) {
          changedData.fecha_contacto = convertDateFromInput(value || '')
        }
        return
      }

      const originalValue = lead[field]
      if (value !== originalValue) {
        changedData[field] = value
      }
    })

    // Comparar ofertas: convertir las originales a asignaciones y comparar
    const originalOfertas = convertOfertasToAsignaciones(lead.ofertas)
    const hasOfertasChanged = JSON.stringify(originalOfertas) !== JSON.stringify(ofertas)
    if (hasOfertasChanged) {
      changedData.ofertas = ofertas
    }

    const originalElementos = lead.elementos_personalizados ?? []
    const hasElementosChanged = JSON.stringify(originalElementos) !== JSON.stringify(elementosPersonalizados)
    if (hasElementosChanged) {
      changedData.elementos_personalizados = elementosPersonalizados
    }

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
    setOfertas([])
    setElementosPersonalizados([])
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

            {/* Teléfono adicional */}
            <div>
              <Label htmlFor="telefono_adicional">
                Teléfono adicional
              </Label>
              <Input
                id="telefono_adicional"
                placeholder="+1234567890"
                value={formData.telefono_adicional || ''}
                onChange={(e) => handleInputChange('telefono_adicional', e.target.value)}
              />
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

            {/* Comercial */}
            <div>
              <Label htmlFor="comercial">Comercial asignado</Label>
              <Input
                id="comercial"
                placeholder="Nombre de la persona que atiende"
                value={formData.comercial || ''}
                onChange={(e) => handleInputChange('comercial', e.target.value)}
              />
            </div>

            {/* Método de pago */}
            <div>
              <Label htmlFor="metodo_pago">Método de pago</Label>
              <Input
                id="metodo_pago"
                placeholder="Transferencia, efectivo..."
                value={formData.metodo_pago || ''}
                onChange={(e) => handleInputChange('metodo_pago', e.target.value)}
              />
            </div>

            {/* Moneda */}
            <div>
              <Label htmlFor="moneda">Moneda</Label>
              <Input
                id="moneda"
                placeholder="USD, CUP, MLC..."
                value={formData.moneda || ''}
                onChange={(e) => handleInputChange('moneda', e.target.value)}
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

          {/* Comentario */}
          <div>
            <Label htmlFor="comentario">Comentario</Label>
            <Textarea
              id="comentario"
              placeholder="Notas generales sobre el lead, necesidades o contexto..."
              value={formData.comentario || ''}
              onChange={(e) => handleInputChange('comentario', e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-6">
            <OfertasAsignacionFields
              value={ofertas}
              onChange={setOfertas}
            />

            <ElementosPersonalizadosFields
              value={elementosPersonalizados}
              onChange={setElementosPersonalizados}
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
