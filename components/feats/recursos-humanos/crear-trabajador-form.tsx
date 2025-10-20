"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Checkbox } from "@/components/shared/molecule/checkbox"
import type { CrearTrabajadorRRHHRequest } from "@/lib/recursos-humanos-types"

interface CrearTrabajadorFormProps {
  onSubmit: (data: CrearTrabajadorRRHHRequest) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export function CrearTrabajadorForm({
  onSubmit,
  onCancel,
  isSubmitting = false
}: CrearTrabajadorFormProps) {
  const [formData, setFormData] = useState<CrearTrabajadorRRHHRequest>({
    ci: '',
    nombre: '',
    cargo: 'Técnico',
    salario_fijo: 0,
    porcentaje_fijo_estimulo: 0,
    porcentaje_variable_estimulo: 0,
    alimentacion: 0,
    dias_trabajables: 24,
    is_brigadista: false,
    contrasena: undefined
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [asignarContrasena, setAsignarContrasena] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validaciones obligatorias
    if (!formData.ci.trim()) {
      newErrors.ci = 'El CI es obligatorio'
    } else if (!/^\d{11}$/.test(formData.ci.replace(/-/g, ''))) {
      newErrors.ci = 'El CI debe tener 11 dígitos'
    }

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio'
    } else if (formData.nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres'
    }

    // Validaciones de contraseña si se marcó asignar contraseña
    if (asignarContrasena) {
      if (!formData.contrasena || formData.contrasena.trim() === '') {
        newErrors.contrasena = 'Debe ingresar una contraseña si desea asignarla'
      } else if (formData.contrasena.length < 4) {
        newErrors.contrasena = 'La contraseña debe tener al menos 4 caracteres'
      }
    }

    // Validaciones de rangos numéricos
    if (formData.porcentaje_fijo_estimulo !== undefined) {
      if (formData.porcentaje_fijo_estimulo < 0 || formData.porcentaje_fijo_estimulo > 100) {
        newErrors.porcentaje_fijo_estimulo = 'Debe estar entre 0 y 100'
      }
    }

    if (formData.porcentaje_variable_estimulo !== undefined) {
      if (formData.porcentaje_variable_estimulo < 0 || formData.porcentaje_variable_estimulo > 100) {
        newErrors.porcentaje_variable_estimulo = 'Debe estar entre 0 y 100'
      }
    }

    if (formData.dias_trabajables !== undefined) {
      if (formData.dias_trabajables < 1 || formData.dias_trabajables > 31) {
        newErrors.dias_trabajables = 'Debe estar entre 1 y 31'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // Preparar datos finales
    const dataToSubmit: CrearTrabajadorRRHHRequest = {
      ...formData,
      // Si no se marcó asignar contraseña, eliminar el campo
      contrasena: asignarContrasena ? formData.contrasena : undefined
    }

    await onSubmit(dataToSubmit)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Información Básica */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Información Básica</h3>

        <div>
          <Label htmlFor="ci">Cédula de Identidad *</Label>
          <Input
            id="ci"
            type="text"
            value={formData.ci}
            onChange={(e) => setFormData({ ...formData, ci: e.target.value })}
            placeholder="02091968281"
            maxLength={11}
            disabled={isSubmitting}
            className={errors.ci ? 'border-red-500' : ''}
          />
          {errors.ci && <p className="text-red-600 text-sm mt-1">{errors.ci}</p>}
        </div>

        <div>
          <Label htmlFor="nombre">Nombre Completo *</Label>
          <Input
            id="nombre"
            type="text"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="Juan Pérez García"
            disabled={isSubmitting}
            className={errors.nombre ? 'border-red-500' : ''}
          />
          {errors.nombre && <p className="text-red-600 text-sm mt-1">{errors.nombre}</p>}
        </div>

        <div>
          <Label htmlFor="cargo">Cargo</Label>
          <Input
            id="cargo"
            type="text"
            value={formData.cargo}
            onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
            placeholder="Técnico"
            disabled={isSubmitting}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_brigadista"
            checked={formData.is_brigadista || false}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, is_brigadista: checked as boolean })
            }
            disabled={isSubmitting}
          />
          <Label htmlFor="is_brigadista" className="font-normal cursor-pointer">
            Es brigadista (puede asignarse a brigadas)
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="asignar_contrasena"
            checked={asignarContrasena}
            onCheckedChange={(checked) => {
              setAsignarContrasena(checked as boolean)
              if (!checked) {
                setFormData({ ...formData, contrasena: undefined })
              }
            }}
            disabled={isSubmitting}
          />
          <Label htmlFor="asignar_contrasena" className="font-normal cursor-pointer">
            Asignar contraseña (para jefe de brigada)
          </Label>
        </div>

        {asignarContrasena && (
          <div>
            <Label htmlFor="contrasena">Contraseña</Label>
            <Input
              id="contrasena"
              type="password"
              value={formData.contrasena || ''}
              onChange={(e) => setFormData({ ...formData, contrasena: e.target.value })}
              placeholder="Mínimo 4 caracteres"
              disabled={isSubmitting}
              className={errors.contrasena ? 'border-red-500' : ''}
            />
            {errors.contrasena && <p className="text-red-600 text-sm mt-1">{errors.contrasena}</p>}
          </div>
        )}
      </div>

      {/* Datos de Nómina */}
      <div className="space-y-3 p-4 bg-purple-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Datos de Nómina</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="salario_fijo">Salario Fijo (CUP)</Label>
            <Input
              id="salario_fijo"
              type="number"
              value={formData.salario_fijo}
              onChange={(e) => setFormData({ ...formData, salario_fijo: parseFloat(e.target.value) || 0 })}
              min={0}
              step={1000}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="alimentacion">Alimentación (CUP)</Label>
            <Input
              id="alimentacion"
              type="number"
              value={formData.alimentacion}
              onChange={(e) => setFormData({ ...formData, alimentacion: parseFloat(e.target.value) || 0 })}
              min={0}
              step={100}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="porcentaje_fijo_estimulo">% Estímulo Fijo (0-100)</Label>
            <Input
              id="porcentaje_fijo_estimulo"
              type="number"
              value={formData.porcentaje_fijo_estimulo}
              onChange={(e) => setFormData({ ...formData, porcentaje_fijo_estimulo: parseFloat(e.target.value) || 0 })}
              min={0}
              max={100}
              step={1}
              disabled={isSubmitting}
              className={errors.porcentaje_fijo_estimulo ? 'border-red-500' : ''}
            />
            {errors.porcentaje_fijo_estimulo && <p className="text-red-600 text-sm mt-1">{errors.porcentaje_fijo_estimulo}</p>}
          </div>

          <div>
            <Label htmlFor="porcentaje_variable_estimulo">% Estímulo Variable (0-100)</Label>
            <Input
              id="porcentaje_variable_estimulo"
              type="number"
              value={formData.porcentaje_variable_estimulo}
              onChange={(e) => setFormData({ ...formData, porcentaje_variable_estimulo: parseFloat(e.target.value) || 0 })}
              min={0}
              max={100}
              step={1}
              disabled={isSubmitting}
              className={errors.porcentaje_variable_estimulo ? 'border-red-500' : ''}
            />
            {errors.porcentaje_variable_estimulo && <p className="text-red-600 text-sm mt-1">{errors.porcentaje_variable_estimulo}</p>}
          </div>

          <div>
            <Label htmlFor="dias_trabajables">Días Trabajables (1-31)</Label>
            <Input
              id="dias_trabajables"
              type="number"
              value={formData.dias_trabajables}
              onChange={(e) => setFormData({ ...formData, dias_trabajables: parseInt(e.target.value) || 24 })}
              min={1}
              max={31}
              step={1}
              disabled={isSubmitting}
              className={errors.dias_trabajables ? 'border-red-500' : ''}
            />
            {errors.dias_trabajables && <p className="text-red-600 text-sm mt-1">{errors.dias_trabajables}</p>}
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
        >
          {isSubmitting ? 'Creando...' : 'Crear Trabajador'}
        </Button>
      </div>
    </form>
  )
}
