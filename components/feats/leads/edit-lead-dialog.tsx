"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Loader2 } from "lucide-react"
import type { ElementoPersonalizado, Lead, LeadUpdateData, OfertaAsignacion } from "@/lib/api-types"
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

export function EditLeadDialog({ open, onOpenChange, lead, onSubmit, isLoading }: EditLeadDialogProps) {
  // Función para convertir fecha DD/MM/YYYY a YYYY-MM-DD (para input date)
  const convertToDateInput = (ddmmyyyy: string): string => {
    if (!ddmmyyyy) return ''
    if (ddmmyyyy.match(/^\d{4}-\d{2}-\d{2}$/)) return ddmmyyyy // Ya está en formato ISO
    if (ddmmyyyy.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = ddmmyyyy.split('/')
      return `${year}-${month}-${day}`
    }
    return ''
  }

  // Función para convertir fecha YYYY-MM-DD a DD/MM/YYYY (para enviar al backend)
  const convertFromDateInput = (yyyymmdd: string): string => {
    if (!yyyymmdd) return ''
    const [year, month, day] = yyyymmdd.split('-')
    return `${day}/${month}/${year}`
  }

  // Función para convertir ofertas embebidas a asignaciones
  const convertOfertasToAsignaciones = (ofertas: Lead['ofertas']): OfertaAsignacion[] => {
    if (!ofertas || ofertas.length === 0) return []
    return ofertas
      .filter(oferta => oferta.id)
      .map(oferta => ({
        oferta_id: oferta.id!,
        cantidad: oferta.cantidad || 1
      }))
  }

  const paisesDisponibles = [
    'Cuba', 'España', 'México', 'Argentina', 'Colombia', 'Venezuela', 'Chile', 'Perú',
    'Ecuador', 'Uruguay', 'Paraguay', 'Bolivia', 'Costa Rica', 'Panamá', 'Guatemala',
    'Honduras', 'El Salvador', 'Nicaragua', 'República Dominicana', 'Puerto Rico',
    'Estados Unidos', 'Canadá', 'Brasil', 'Francia', 'Italia', 'Alemania', 'Reino Unido', 'Portugal'
  ]

  const estadosDisponibles = [
    'Esperando equipo', 'No interesado', 'Pendiente de enviar oferta',
    'Pendiente de instalación', 'Pendiente de pago', 'Pendiente de presupuesto',
    'Pendiente de visita', 'Pendiente de visitarnos', 'Proximamente',
    'Revisando ofertas', 'Sin respuesta'
  ]

  const fuentesDisponibles = [
    'página web', 'redes sociales', 'referencia', 'publicidad',
    'evento', 'llamada fría', 'email', 'otro'
  ]

  // Estado del formulario con valores iniciales del lead
  const [formData, setFormData] = useState({
    fecha_contacto: convertToDateInput(lead.fecha_contacto),
    nombre: lead.nombre || '',
    telefono: lead.telefono || '',
    telefono_adicional: lead.telefono_adicional || '',
    estado: lead.estado || '',
    fuente: lead.fuente || '',
    referencia: lead.referencia || '',
    direccion: lead.direccion || '',
    pais_contacto: lead.pais_contacto || '',
    comentario: lead.comentario || '',
    provincia_montaje: lead.provincia_montaje || '',
    comercial: lead.comercial || '',
    metodo_pago: lead.metodo_pago || '',
    moneda: lead.moneda || '',
    ofertas: convertOfertasToAsignaciones(lead.ofertas),
    elementos_personalizados: lead.elementos_personalizados ?
      JSON.parse(JSON.stringify(lead.elementos_personalizados)) : []
  })

  // Guardar valores iniciales para detectar cambios
  const [initialValues] = useState({
    fecha_contacto: convertToDateInput(lead.fecha_contacto),
    nombre: lead.nombre || '',
    telefono: lead.telefono || '',
    telefono_adicional: lead.telefono_adicional || '',
    estado: lead.estado || '',
    fuente: lead.fuente || '',
    referencia: lead.referencia || '',
    direccion: lead.direccion || '',
    pais_contacto: lead.pais_contacto || '',
    comentario: lead.comentario || '',
    provincia_montaje: lead.provincia_montaje || '',
    comercial: lead.comercial || '',
    metodo_pago: lead.metodo_pago || '',
    moneda: lead.moneda || '',
    ofertas: JSON.stringify(convertOfertasToAsignaciones(lead.ofertas)),
    elementos_personalizados: JSON.stringify(lead.elementos_personalizados || [])
  })

  // Reset cuando se abre el diálogo con un lead diferente
  useEffect(() => {
    if (open) {
      setFormData({
        fecha_contacto: convertToDateInput(lead.fecha_contacto),
        nombre: lead.nombre || '',
        telefono: lead.telefono || '',
        telefono_adicional: lead.telefono_adicional || '',
        estado: lead.estado || '',
        fuente: lead.fuente || '',
        referencia: lead.referencia || '',
        direccion: lead.direccion || '',
        pais_contacto: lead.pais_contacto || '',
        comentario: lead.comentario || '',
        provincia_montaje: lead.provincia_montaje || '',
        comercial: lead.comercial || '',
        metodo_pago: lead.metodo_pago || '',
        moneda: lead.moneda || '',
        ofertas: convertOfertasToAsignaciones(lead.ofertas),
        elementos_personalizados: lead.elementos_personalizados ?
          JSON.parse(JSON.stringify(lead.elementos_personalizados)) : []
      })
    }
  }, [open, lead])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleOfertasChange = (items: OfertaAsignacion[]) => {
    setFormData(prev => ({
      ...prev,
      ofertas: items
    }))
  }

  const handleElementosChange = (items: ElementoPersonalizado[]) => {
    setFormData(prev => ({
      ...prev,
      elementos_personalizados: items
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Detectar solo los campos que cambiaron
    const updateData: Record<string, unknown> = {}

    // Campos de texto simples
    const textFields = [
      'nombre', 'telefono', 'telefono_adicional', 'estado', 'fuente',
      'referencia', 'direccion', 'pais_contacto', 'comentario',
      'provincia_montaje', 'comercial', 'metodo_pago', 'moneda'
    ]

    textFields.forEach(field => {
      const currentValue = formData[field as keyof typeof formData]
      const initialValue = initialValues[field as keyof typeof initialValues]

      if (currentValue !== initialValue) {
        updateData[field] = currentValue || undefined
      }
    })

    // Campo fecha_contacto (necesita conversión)
    const currentFecha = convertFromDateInput(formData.fecha_contacto)
    const initialFecha = convertFromDateInput(initialValues.fecha_contacto)
    if (currentFecha !== initialFecha) {
      updateData.fecha_contacto = currentFecha
    }

    // Ofertas (comparar JSON)
    const currentOfertas = JSON.stringify(formData.ofertas)
    if (currentOfertas !== initialValues.ofertas) {
      updateData.ofertas = formData.ofertas
    }

    // Elementos personalizados (comparar JSON)
    const currentElementos = JSON.stringify(formData.elementos_personalizados)
    if (currentElementos !== initialValues.elementos_personalizados) {
      updateData.elementos_personalizados = formData.elementos_personalizados
    }

    console.log('Campos modificados:', updateData)

    try {
      await onSubmit(updateData as LeadUpdateData)
      onOpenChange(false)
    } catch (error) {
      console.error('Error al actualizar lead:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Lead - {lead.nombre}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto pr-2">
          {/* Sección 1: Datos Personales */}
          <div className="space-y-4">
            <div className="border-b-2 border-gray-300 pb-3">
              <h3 className="text-base font-bold text-gray-900">Datos Personales</h3>
            </div>
            <div className="space-y-4">
              {/* Campos Obligatorios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">
                    Nombre <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    className="text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label htmlFor="telefono">
                    Teléfono <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => handleInputChange('telefono', e.target.value)}
                    className="text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label htmlFor="estado">
                    Estado <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value) => handleInputChange('estado', value)}
                  >
                    <SelectTrigger id="estado" className="text-gray-900">
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {estadosDisponibles.map((estado) => (
                        <SelectItem key={estado} value={estado}>
                          {estado}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Otros Datos Personales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="telefono_adicional">Teléfono Adicional</Label>
                  <Input
                    id="telefono_adicional"
                    value={formData.telefono_adicional}
                    onChange={(e) => handleInputChange('telefono_adicional', e.target.value)}
                    className="text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) => handleInputChange('direccion', e.target.value)}
                  className="text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Fechas */}
          <div className="space-y-4">
            <div className="border-b-2 border-gray-300 pb-3">
              <h3 className="text-base font-bold text-gray-900">Fechas</h3>
            </div>
            <div>
              <Label htmlFor="fecha_contacto">
                Fecha de Contacto <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fecha_contacto"
                type="date"
                value={formData.fecha_contacto}
                onChange={(e) => handleInputChange('fecha_contacto', e.target.value)}
                className="text-gray-900"
              />
            </div>
          </div>

          {/* Sección 3: Información Comercial */}
          <div className="space-y-4">
            <div className="border-b-2 border-gray-300 pb-3">
              <h3 className="text-base font-bold text-gray-900">Información Comercial</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fuente">Fuente</Label>
                <Input
                  id="fuente"
                  list="fuentes-datalist"
                  value={formData.fuente}
                  onChange={(e) => handleInputChange('fuente', e.target.value)}
                  className="text-gray-900 placeholder:text-gray-400"
                />
                <datalist id="fuentes-datalist">
                  {fuentesDisponibles.map((source) => (
                    <option key={source} value={source} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label htmlFor="referencia">Referencia</Label>
                <Input
                  id="referencia"
                  value={formData.referencia}
                  onChange={(e) => handleInputChange('referencia', e.target.value)}
                  className="text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div>
                <Label htmlFor="comercial">Comercial</Label>
                <Select
                  value={formData.comercial}
                  onValueChange={(value) => handleInputChange('comercial', value)}
                >
                  <SelectTrigger id="comercial" className="text-gray-900">
                    <SelectValue placeholder="Seleccionar comercial" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dashel">Dashel</SelectItem>
                    <SelectItem value="Grethel">Grethel</SelectItem>
                    <SelectItem value="Yanet">Yanet</SelectItem>
                    <SelectItem value="Yany">Yany</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="pais_contacto">País de Contacto</Label>
                <Input
                  id="pais_contacto"
                  list="paises-datalist"
                  value={formData.pais_contacto}
                  onChange={(e) => handleInputChange('pais_contacto', e.target.value)}
                  className="text-gray-900 placeholder:text-gray-400"
                />
                <datalist id="paises-datalist">
                  {paisesDisponibles.map((pais) => (
                    <option key={pais} value={pais} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label htmlFor="provincia_montaje">Provincia de Montaje</Label>
                <Input
                  id="provincia_montaje"
                  value={formData.provincia_montaje}
                  onChange={(e) => handleInputChange('provincia_montaje', e.target.value)}
                  className="text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Sección 4: Información de Pago */}
          <div className="space-y-4">
            <div className="border-b-2 border-gray-300 pb-3">
              <h3 className="text-base font-bold text-gray-900">Información de Pago</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="metodo_pago">Método de Pago</Label>
                <Input
                  id="metodo_pago"
                  value={formData.metodo_pago}
                  onChange={(e) => handleInputChange('metodo_pago', e.target.value)}
                  className="text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div>
                <Label htmlFor="moneda">Moneda</Label>
                <Input
                  id="moneda"
                  value={formData.moneda}
                  onChange={(e) => handleInputChange('moneda', e.target.value)}
                  className="text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Sección 5: Comentarios y Detalles */}
          <div className="space-y-4">
            <div className="border-b-2 border-gray-300 pb-3">
              <h3 className="text-base font-bold text-gray-900">Comentarios y Detalles</h3>
            </div>
            <div>
              <Label htmlFor="comentario">Comentario</Label>
              <Textarea
                id="comentario"
                value={formData.comentario}
                onChange={(e) => handleInputChange('comentario', e.target.value)}
                rows={3}
                className="text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-6">
              <OfertasAsignacionFields
                value={formData.ofertas}
                onChange={handleOfertasChange}
              />

              <ElementosPersonalizadosFields
                value={formData.elementos_personalizados}
                onChange={handleElementosChange}
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
                'Guardar Cambios'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
