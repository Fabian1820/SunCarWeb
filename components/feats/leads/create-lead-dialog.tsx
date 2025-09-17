"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Loader2 } from "lucide-react"
import type { LeadCreateData } from "@/lib/api-types"

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
    estado: 'nuevo',
    fuente: '',
    referencia: '',
    direccion: '',
    pais_contacto: '',
    necesidad: '',
    provincia_montaje: ''
  })

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

    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Error al crear lead:', error)
    }
  }

  return (
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
            value={convertToDateInput(formData.fecha_contacto)}
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
            value={formData.nombre}
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
            value={formData.telefono}
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
            value={formData.estado}
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
            list="fuentes-datalist"
            placeholder="Escribir o seleccionar fuente..."
            value={formData.fuente}
            onChange={(e) => handleInputChange('fuente', e.target.value)}
          />
          <datalist id="fuentes-datalist">
            {availableSources.map((source) => (
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
            value={formData.referencia}
            onChange={(e) => handleInputChange('referencia', e.target.value)}
          />
        </div>

        {/* País de Contacto */}
        <div>
          <Label htmlFor="pais_contacto">País de Contacto</Label>
          <Input
            id="pais_contacto"
            list="paises-datalist"
            placeholder="Escribir o seleccionar país..."
            value={formData.pais_contacto}
            onChange={(e) => handleInputChange('pais_contacto', e.target.value)}
          />
          <datalist id="paises-datalist">
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
            value={formData.provincia_montaje}
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
          value={formData.direccion}
          onChange={(e) => handleInputChange('direccion', e.target.value)}
        />
      </div>

      {/* Necesidad */}
      <div>
        <Label htmlFor="necesidad">Necesidad</Label>
        <Textarea
          id="necesidad"
          placeholder="Describe la necesidad específica del cliente..."
          value={formData.necesidad}
          onChange={(e) => handleInputChange('necesidad', e.target.value)}
          rows={3}
        />
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