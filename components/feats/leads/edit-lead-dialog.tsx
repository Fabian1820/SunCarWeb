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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"

interface EditLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead
  onSubmit: (data: LeadUpdateData) => Promise<void>
  isLoading?: boolean
}

type FieldOption = {
  value: string
  label: string
  type: 'text' | 'date' | 'textarea' | 'datalist' | 'ofertas' | 'elementos'
  datalistOptions?: string[]
}

const FIELD_OPTIONS: FieldOption[] = [
  { value: 'fecha_contacto', label: 'Fecha de Contacto', type: 'date' },
  { value: 'nombre', label: 'Nombre', type: 'text' },
  { value: 'telefono', label: 'Teléfono', type: 'text' },
  { value: 'telefono_adicional', label: 'Teléfono Adicional', type: 'text' },
  { value: 'estado', label: 'Estado', type: 'text' },
  { value: 'fuente', label: 'Fuente', type: 'datalist', datalistOptions: ['página web', 'redes sociales', 'referencia', 'publicidad', 'evento', 'llamada fría', 'email', 'otro'] },
  { value: 'referencia', label: 'Referencia', type: 'text' },
  { value: 'direccion', label: 'Dirección', type: 'text' },
  { value: 'pais_contacto', label: 'País de Contacto', type: 'datalist', datalistOptions: ['Cuba', 'España', 'México', 'Argentina', 'Colombia', 'Venezuela', 'Chile', 'Perú', 'Ecuador', 'Uruguay', 'Paraguay', 'Bolivia', 'Costa Rica', 'Panamá', 'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'República Dominicana', 'Puerto Rico', 'Estados Unidos', 'Canadá', 'Brasil', 'Francia', 'Italia', 'Alemania', 'Reino Unido', 'Portugal'] },
  { value: 'comentario', label: 'Comentario', type: 'textarea' },
  { value: 'provincia_montaje', label: 'Provincia de Montaje', type: 'text' },
  { value: 'comercial', label: 'Comercial Asignado', type: 'text' },
  { value: 'metodo_pago', label: 'Método de Pago', type: 'text' },
  { value: 'moneda', label: 'Moneda', type: 'text' },
  { value: 'ofertas', label: 'Ofertas Asignadas', type: 'ofertas' },
  { value: 'elementos_personalizados', label: 'Elementos Personalizados', type: 'elementos' },
]

export function EditLeadDialog({ open, onOpenChange, lead, onSubmit, isLoading }: EditLeadDialogProps) {
  const [selectedField, setSelectedField] = useState<string>('')
  const [fieldValue, setFieldValue] = useState<string>('')
  const [ofertas, setOfertas] = useState<OfertaAsignacion[]>([])
  const [elementosPersonalizados, setElementosPersonalizados] = useState<ElementoPersonalizado[]>([])

  // Función para convertir ofertas embebidas a asignaciones
  const convertOfertasToAsignaciones = (ofertasEmbebidas: OfertaEmbebida[] | undefined): OfertaAsignacion[] => {
    if (!ofertasEmbebidas || ofertasEmbebidas.length === 0) return []
    return ofertasEmbebidas
      .filter(oferta => oferta.id)
      .map(oferta => ({
        oferta_id: oferta.id!,
        cantidad: oferta.cantidad || 1
      }))
  }

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

  // Reset cuando cambia el campo seleccionado
  useEffect(() => {
    if (!selectedField || !lead) return

    const fieldConfig = FIELD_OPTIONS.find(f => f.value === selectedField)
    if (!fieldConfig) return

    // Inicializar el valor del campo con el valor actual del lead
    if (fieldConfig.type === 'date') {
      setFieldValue(convertDateToInput(lead[selectedField as keyof Lead] as string))
    } else if (fieldConfig.type === 'ofertas') {
      setOfertas(convertOfertasToAsignaciones(lead.ofertas))
    } else if (fieldConfig.type === 'elementos') {
      setElementosPersonalizados(
        lead.elementos_personalizados ? JSON.parse(JSON.stringify(lead.elementos_personalizados)) : []
      )
    } else {
      setFieldValue((lead[selectedField as keyof Lead] as string) || '')
    }
  }, [selectedField, lead])

  // Reset cuando se abre/cierra el diálogo
  useEffect(() => {
    if (!open) {
      setSelectedField('')
      setFieldValue('')
      setOfertas([])
      setElementosPersonalizados([])
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedField) {
      return
    }

    const fieldConfig = FIELD_OPTIONS.find(f => f.value === selectedField)
    if (!fieldConfig) return

    // Construir el objeto de actualización con SOLO el campo seleccionado
    const updateData: Record<string, unknown> = {}

    if (fieldConfig.type === 'date') {
      const dateValue = convertDateFromInput(fieldValue)
      updateData[selectedField] = dateValue
      console.log('Enviando fecha:', { campo: selectedField, valor: dateValue })
    } else if (fieldConfig.type === 'ofertas') {
      updateData['ofertas'] = ofertas
      console.log('Enviando ofertas:', { campo: 'ofertas', valor: ofertas })
    } else if (fieldConfig.type === 'elementos') {
      updateData['elementos_personalizados'] = elementosPersonalizados
      console.log('Enviando elementos:', { campo: 'elementos_personalizados', valor: elementosPersonalizados })
    } else {
      updateData[selectedField] = fieldValue
      console.log('Enviando campo:', { campo: selectedField, valor: fieldValue })
    }

    console.log('Objeto completo de actualización:', updateData)

    try {
      await onSubmit(updateData as LeadUpdateData)
      onOpenChange(false)
    } catch (error) {
      console.error('Error al actualizar lead:', error)
    }
  }

  const handleCancel = () => {
    setSelectedField('')
    setFieldValue('')
    setOfertas([])
    setElementosPersonalizados([])
    onOpenChange(false)
  }

  const selectedFieldConfig = FIELD_OPTIONS.find(f => f.value === selectedField)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Lead - {lead.nombre}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Paso 1: Seleccionar campo a editar */}
          <div>
            <Label htmlFor="field-selector">
              ¿Qué campo deseas actualizar? <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedField} onValueChange={setSelectedField}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un campo..." />
              </SelectTrigger>
              <SelectContent>
                {FIELD_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paso 2: Mostrar el campo seleccionado */}
          {selectedField && selectedFieldConfig && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium mb-4">Editar: {selectedFieldConfig.label}</h3>

              {selectedFieldConfig.type === 'text' && (
                <div>
                  <Label htmlFor="field-value">{selectedFieldConfig.label}</Label>
                  <Input
                    id="field-value"
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                    placeholder={`Ingresa ${selectedFieldConfig.label.toLowerCase()}`}
                  />
                </div>
              )}

              {selectedFieldConfig.type === 'date' && (
                <div>
                  <Label htmlFor="field-value">{selectedFieldConfig.label}</Label>
                  <Input
                    id="field-value"
                    type="date"
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                  />
                </div>
              )}

              {selectedFieldConfig.type === 'textarea' && (
                <div>
                  <Label htmlFor="field-value">{selectedFieldConfig.label}</Label>
                  <Textarea
                    id="field-value"
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                    placeholder={`Ingresa ${selectedFieldConfig.label.toLowerCase()}`}
                    rows={4}
                  />
                </div>
              )}

              {selectedFieldConfig.type === 'datalist' && (
                <div>
                  <Label htmlFor="field-value">{selectedFieldConfig.label}</Label>
                  <Input
                    id="field-value"
                    list={`datalist-${selectedField}`}
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                    placeholder={`Escribir o seleccionar ${selectedFieldConfig.label.toLowerCase()}`}
                  />
                  <datalist id={`datalist-${selectedField}`}>
                    {selectedFieldConfig.datalistOptions?.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>
              )}

              {selectedFieldConfig.type === 'ofertas' && (
                <OfertasAsignacionFields
                  value={ofertas}
                  onChange={setOfertas}
                />
              )}

              {selectedFieldConfig.type === 'elementos' && (
                <ElementosPersonalizadosFields
                  value={elementosPersonalizados}
                  onChange={setElementosPersonalizados}
                />
              )}
            </div>
          )}

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
              disabled={isLoading || !selectedField}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Actualizar Campo'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
