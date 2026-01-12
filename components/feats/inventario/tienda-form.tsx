"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Switch } from "@/components/shared/molecule/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Save, X, Loader2, AlertCircle } from "lucide-react"
import type { Almacen, Tienda, TiendaCreateData } from "@/lib/inventario-types"

interface TiendaFormProps {
  initialData?: Tienda
  almacenes: Almacen[]
  onSubmit: (data: TiendaCreateData) => Promise<void> | void
  onCancel: () => void
  isEditing?: boolean
}

export function TiendaForm({ initialData, almacenes, onSubmit, onCancel, isEditing = false }: TiendaFormProps) {
  const [formData, setFormData] = useState<TiendaCreateData>({
    nombre: initialData?.nombre || "",
    codigo: initialData?.codigo || "",
    direccion: initialData?.direccion || "",
    telefono: initialData?.telefono || "",
    almacen_id: initialData?.almacen_id || "",
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
      almacen_id: initialData?.almacen_id || "",
      activo: initialData?.activo ?? true,
    })
    setError(null)
  }, [initialData])

  const almacenesOrdenados = useMemo(() => {
    return [...almacenes].sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [almacenes])

  const validate = () => {
    if (!formData.nombre.trim()) {
      setError("El nombre de la tienda es requerido")
      return false
    }
    if (!formData.almacen_id) {
      setError("Selecciona un almacen para la tienda")
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
      setError(err instanceof Error ? err.message : "No se pudo guardar la tienda")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="tienda-nombre" className="text-sm font-medium text-gray-700 mb-2 block">
            Nombre de la tienda *
          </Label>
          <Input
            id="tienda-nombre"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="Sucursal Centro"
            className={error && !formData.nombre ? "border-red-300" : ""}
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Almacen asignado *</Label>
          <Select
            value={formData.almacen_id}
            onValueChange={(value) => setFormData({ ...formData, almacen_id: value })}
          >
            <SelectTrigger className={error && !formData.almacen_id ? "border-red-300" : ""}>
              <SelectValue placeholder="Seleccionar almacen" />
            </SelectTrigger>
            <SelectContent>
              {almacenesOrdenados.map((almacen) => (
                <SelectItem key={almacen.id || almacen.nombre} value={almacen.id || almacen.nombre}>
                  {almacen.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="tienda-codigo" className="text-sm font-medium text-gray-700 mb-2 block">
              Codigo
            </Label>
            <Input
              id="tienda-codigo"
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
              placeholder="TND-001"
            />
          </div>
          <div>
            <Label htmlFor="tienda-telefono" className="text-sm font-medium text-gray-700 mb-2 block">
              Telefono
            </Label>
            <Input
              id="tienda-telefono"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              placeholder="70000000"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="tienda-direccion" className="text-sm font-medium text-gray-700 mb-2 block">
            Direccion
          </Label>
          <Input
            id="tienda-direccion"
            value={formData.direccion}
            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
            placeholder="Av. Principal 456"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Activa</p>
            <p className="text-xs text-gray-600">Desactiva la tienda si no debe vender.</p>
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
          {isEditing ? "Actualizar" : "Crear"} tienda
        </Button>
      </div>
    </form>
  )
}
