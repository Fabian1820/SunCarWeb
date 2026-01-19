"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Checkbox } from "@/components/shared/molecule/checkbox"
import { Loader2 } from "lucide-react"
import type { Marca, MarcaCreateRequest, MarcaUpdateRequest, TipoMaterial } from "@/lib/types/feats/marcas/marca-types"

interface MarcaFormProps {
  initialData?: Marca
  onSubmit: (data: MarcaCreateRequest | MarcaUpdateRequest) => Promise<void>
  onCancel: () => void
  isEditing?: boolean
}

const TIPOS_MATERIAL: TipoMaterial[] = ['BATERÍAS', 'INVERSORES', 'PANELES', 'OTRO']

export function MarcaForm({ initialData, onSubmit, onCancel, isEditing = false }: MarcaFormProps) {
  const [formData, setFormData] = useState({
    nombre: initialData?.nombre || "",
    descripcion: initialData?.descripcion || "",
    tipos_material: initialData?.tipos_material || [] as TipoMaterial[],
    is_active: initialData?.is_active ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es requerido"
    }

    if (formData.tipos_material.length === 0) {
      newErrors.tipos_material = "Debe seleccionar al menos un tipo de material"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error("Error al guardar marca:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleTipoMaterialChange = (tipo: TipoMaterial, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      tipos_material: checked
        ? [...prev.tipos_material, tipo]
        : prev.tipos_material.filter(t => t !== tipo)
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nombre */}
      <div className="space-y-2">
        <Label htmlFor="nombre">
          Nombre <span className="text-red-500">*</span>
        </Label>
        <Input
          id="nombre"
          value={formData.nombre}
          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          placeholder="Ej: Must, Pylotech, Greenheis"
          className={errors.nombre ? "border-red-500" : ""}
        />
        {errors.nombre && (
          <p className="text-sm text-red-500">{errors.nombre}</p>
        )}
      </div>

      {/* Descripción */}
      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea
          id="descripcion"
          value={formData.descripcion}
          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          placeholder="Descripción de la marca..."
          rows={3}
        />
      </div>

      {/* Tipos de Material */}
      <div className="space-y-2">
        <Label>
          Tipos de Material <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-gray-50">
          {TIPOS_MATERIAL.map((tipo) => (
            <div key={tipo} className="flex items-center space-x-2">
              <Checkbox
                id={`tipo-${tipo}`}
                checked={formData.tipos_material.includes(tipo)}
                onCheckedChange={(checked) => handleTipoMaterialChange(tipo, checked as boolean)}
              />
              <Label
                htmlFor={`tipo-${tipo}`}
                className="text-sm font-normal cursor-pointer"
              >
                {tipo}
              </Label>
            </div>
          ))}
        </div>
        {errors.tipos_material && (
          <p className="text-sm text-red-500">{errors.tipos_material}</p>
        )}
      </div>

      {/* Estado Activo */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
        />
        <Label htmlFor="is_active" className="text-sm font-normal cursor-pointer">
          Marca activa
        </Label>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>{isEditing ? "Actualizar" : "Crear"} Marca</>
          )}
        </Button>
      </div>
    </form>
  )
}
