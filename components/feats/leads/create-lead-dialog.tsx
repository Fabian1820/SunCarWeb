"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Loader2 } from "lucide-react"
import type { ElementoPersonalizado, LeadCreateData, OfertaAsignacion } from "@/lib/api-types"
import { ElementosPersonalizadosFields } from "./elementos-personalizados-fields"
import { OfertasAsignacionFields } from "./ofertas-asignacion-fields"

interface CreateLeadDialogProps {
  onSubmit: (data: LeadCreateData) => Promise<void>
  onCancel: () => void
  availableSources?: string[]
  isLoading?: boolean
}

export function CreateLeadDialog({ onSubmit, onCancel, availableSources = [], isLoading }: CreateLeadDialogProps) {
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

  // Obtener fecha actual en formato DD/MM/YYYY
  const getCurrentDateDDMMYYYY = (): string => {
    const today = new Date()
    const day = today.getDate().toString().padStart(2, '0')
    const month = (today.getMonth() + 1).toString().padStart(2, '0')
    const year = today.getFullYear()
    return `${day}/${month}/${year}`
  }

  const [formData, setFormData] = useState<LeadCreateData>({
    fecha_contacto: getCurrentDateDDMMYYYY(), // Fecha actual en formato DD/MM/YYYY
    nombre: '',
    telefono: '',
    telefono_adicional: '',
    estado: '',
    fuente: '',
    referencia: '',
    direccion: '',
    pais_contacto: '',
    comentario: '',
    provincia_montaje: '',
    comercial: '',
    ofertas: [],
    elementos_personalizados: [],
    metodo_pago: '',
    moneda: '',
  })

  const estadosDisponibles = [
    'Esperando equipo',
    'No interesado',
    'Pendiente de enviar oferta',
    'Pendiente de instalación',
    'Pendiente de pago',
    'Pendiente de presupuesto',
    'Pendiente de visita',
    'Pendiente de visitarnos',
    'Proximamente',
    'Revisando ofertas',
    'Sin respuesta'
  ]

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: keyof LeadCreateData, value: string) => {
    let processedValue = value

    // Convertir fecha de input date (YYYY-MM-DD) a formato DD/MM/YYYY
    if (field === 'fecha_contacto') {
      processedValue = convertFromDateInput(value)
    }

    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }))

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handleOfertasChange = (items: OfertaAsignacion[]) => {
    setFormData((prev) => ({
      ...prev,
      ofertas: items,
    }))
  }

  const handleElementosChange = (items: ElementoPersonalizado[]) => {
    setFormData((prev) => ({
      ...prev,
      elementos_personalizados: items,
    }))
  }

  const sanitizeLeadData = (data: LeadCreateData): LeadCreateData => {
    const cleaned: Record<string, unknown> = { ...data }

    Object.entries(cleaned).forEach(([key, value]) => {
      if (typeof value === 'string' && value.trim() === '') {
        delete cleaned[key]
        return
      }

      if (Array.isArray(value) && value.length === 0) {
        delete cleaned[key]
      }
    })

    return cleaned as unknown as LeadCreateData
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Campos obligatorios
    if (!formData.fecha_contacto.trim()) {
      newErrors.fecha_contacto = 'La fecha de contacto es obligatoria'
    }
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio'
    }
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es obligatorio'
    }
    if (!formData.estado.trim()) {
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

    try {
      await onSubmit(sanitizeLeadData(formData))
    } catch (error) {
      console.error('Error al crear lead:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
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
                className={`text-gray-900 placeholder:text-gray-400 ${errors.nombre ? 'border-red-500' : ''}`}
              />
              {errors.nombre && (
                <p className="text-sm text-red-500 mt-1">{errors.nombre}</p>
              )}
            </div>
            <div>
              <Label htmlFor="telefono">
                Teléfono <span className="text-red-500">*</span>
              </Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => handleInputChange('telefono', e.target.value)}
                className={`text-gray-900 placeholder:text-gray-400 ${errors.telefono ? 'border-red-500' : ''}`}
              />
              {errors.telefono && (
                <p className="text-sm text-red-500 mt-1">{errors.telefono}</p>
              )}
            </div>
            <div>
              <Label htmlFor="estado">
                Estado <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => handleInputChange('estado', value)}
              >
                <SelectTrigger 
                  id="estado" 
                  className={`text-gray-900 ${errors.estado ? 'border-red-500' : ''}`}
                >
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
              {errors.estado && (
                <p className="text-sm text-red-500 mt-1">{errors.estado}</p>
              )}
            </div>
          </div>
          {/* Otros Datos Personales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="telefono_adicional">Teléfono Adicional</Label>
              <Input
                id="telefono_adicional"
                value={formData.telefono_adicional || ''}
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
            value={convertToDateInput(formData.fecha_contacto)}
            onChange={(e) => handleInputChange('fecha_contacto', e.target.value)}
            className={`text-gray-900 ${errors.fecha_contacto ? 'border-red-500' : ''}`}
          />
          {errors.fecha_contacto && (
            <p className="text-sm text-red-500 mt-1">{errors.fecha_contacto}</p>
          )}
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
              {availableSources.map((source) => (
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
              value={formData.comercial || ''}
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
              value={formData.metodo_pago || ''}
              onChange={(e) => handleInputChange('metodo_pago', e.target.value)}
              className="text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <div>
            <Label htmlFor="moneda">Moneda</Label>
            <Input
              id="moneda"
              value={formData.moneda || ''}
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
            value={formData.comentario || ''}
            onChange={(e) => handleInputChange('comentario', e.target.value)}
            rows={3}
            className="text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <div className="space-y-6">
          <OfertasAsignacionFields
            value={formData.ofertas || []}
            onChange={handleOfertasChange}
          />

          <ElementosPersonalizadosFields
            value={formData.elementos_personalizados || []}
            onChange={handleElementosChange}
          />
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
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
            'Crear Lead'
          )}
        </Button>
      </div>
    </form>
  )
}
