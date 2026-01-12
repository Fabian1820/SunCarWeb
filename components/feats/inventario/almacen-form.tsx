"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Switch } from "@/components/shared/molecule/switch"
import { Save, X, Loader2, AlertCircle } from "lucide-react"
import type { Almacen, AlmacenCreateData } from "@/lib/inventario-types"

interface AlmacenFormProps {
  initialData?: Almacen
  onSubmit: (data: AlmacenCreateData) => Promise<void> | void
  onCancel: () => void
  isEditing?: boolean
}

export function AlmacenForm({ initialData, onSubmit, onCancel, isEditing = false }: AlmacenFormProps) {
  const [formData, setFormData] = useState<AlmacenCreateData>({
    nombre: initialData?.nombre || "",
    codigo: initialData?.codigo || "",
    direccion: initialData?.direccion || "",
    telefono: initialData?.telefono || "",
    responsable: initialData?.responsable || "",
    activo: initialData?.activo ?? true,
  })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setFormData({
      nombre: initialData?.nombre || "",
      codigo: initialData?.codigo || "",
      direccion: initialData?.direccion || "",
      telefono: initialData?.telefono || "",
      responsable: initialData?.responsable || "",
      activo: initialData?.activo ?? true,
    })
    setError(null)
  }, [initialData])

  const validate = () => {
    if (!formData.nombre.trim()) {
      setError("El nombre del almacen es requerido")
      return false
    }
    setError(null)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el almacen")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="almacen-nombre" className="text-sm font-medium text-gray-700 mb-2 block">
            Nombre del almacen *
          </Label>
          <Input
            id="almacen-nombre"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="Almacen central"
            className={error && !formData.nombre ? "border-red-300" : ""}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="almacen-codigo" className="text-sm font-medium text-gray-700 mb-2 block">
              Codigo
            </Label>
            <Input
              id="almacen-codigo"
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
              placeholder="ALM-001"
            />
          </div>
          <div>
            <Label htmlFor="almacen-telefono" className="text-sm font-medium text-gray-700 mb-2 block">
              Telefono
            </Label>
            <Input
              id="almacen-telefono"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              placeholder="70000000"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="almacen-direccion" className="text-sm font-medium text-gray-700 mb-2 block">
            Direccion
          </Label>
          <Input
            id="almacen-direccion"
            value={formData.direccion}
            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
            placeholder="Av. Principal 123"
          />
        </div>

        <div>
          <Label htmlFor="almacen-responsable" className="text-sm font-medium text-gray-700 mb-2 block">
            Responsable
          </Label>
          <Input
            id="almacen-responsable"
            value={formData.responsable}
            onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
            placeholder="Nombre del responsable"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Activo</p>
            <p className="text-xs text-gray-600">Desactiva el almacen si no debe recibir movimientos.</p>
          </div>
          <Switch
            checked={formData.activo ?? true}
            onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
          />
        </div>
      </div>

      {error ? (
        <div className="flex items-center text-red-600">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEditing ? "Actualizar" : "Crear"} almacen
        </Button>
      </div>
    </form>
  )
}
