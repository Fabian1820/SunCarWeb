"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import { Save, X } from "lucide-react"
import type { Material } from "@/lib/api-types"

interface EditarDatosContabilidadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: Material | null
  onSubmit: (
    materialCodigo: string,
    productoId: string,
    data: {
      codigo_contabilidad: string
      cantidad_contabilidad: number
      precio_contabilidad: number
    }
  ) => Promise<void>
  loading: boolean
}

export function EditarDatosContabilidadDialog({
  open,
  onOpenChange,
  material,
  onSubmit,
  loading,
}: EditarDatosContabilidadDialogProps) {
  const [codigoContabilidad, setCodigoContabilidad] = useState("")
  const [cantidadContabilidad, setCantidadContabilidad] = useState("")
  const [precioContabilidad, setPrecioContabilidad] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Cargar datos del material cuando cambie
  useEffect(() => {
    if (material) {
      setCodigoContabilidad(material.codigo_contabilidad || "")
      setCantidadContabilidad(
        material.cantidad_contabilidad?.toString() || "0"
      )
      setPrecioContabilidad(material.precio_contabilidad?.toString() || "0")
      setErrors({})
    }
  }, [material])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!codigoContabilidad.trim()) {
      newErrors.codigo_contabilidad = "El código de contabilidad es requerido"
    }

    const cantidad = parseFloat(cantidadContabilidad)
    if (isNaN(cantidad) || cantidad < 0) {
      newErrors.cantidad_contabilidad = "La cantidad debe ser un número válido mayor o igual a 0"
    }

    const precio = parseFloat(precioContabilidad)
    if (isNaN(precio) || precio < 0) {
      newErrors.precio_contabilidad = "El precio debe ser un número válido mayor o igual a 0"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!material) return
    if (!validateForm()) return

    try {
      await onSubmit(material.codigo, material.producto_id || "", {
        codigo_contabilidad: codigoContabilidad.trim(),
        cantidad_contabilidad: parseFloat(cantidadContabilidad),
        precio_contabilidad: parseFloat(precioContabilidad),
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Error al actualizar datos de contabilidad:", error)
    }
  }

  if (!material) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Datos de Contabilidad</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del material (solo lectura) */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-sm text-gray-700">
              Información del Material
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Código:</span>
                <span className="ml-2 font-mono">{material.codigo}</span>
              </div>
              <div>
                <span className="text-gray-600">Categoría:</span>
                <span className="ml-2">{material.categoria}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Nombre:</span>
                <span className="ml-2">
                  {material.nombre || material.descripcion}
                </span>
              </div>
            </div>
          </div>

          {/* Formulario de edición */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="codigo_contabilidad">
                Código de Contabilidad <span className="text-red-500">*</span>
              </Label>
              <Input
                id="codigo_contabilidad"
                value={codigoContabilidad}
                onChange={(e) => setCodigoContabilidad(e.target.value)}
                placeholder="Ej: 5401090096"
                className={errors.codigo_contabilidad ? "border-red-500" : ""}
                disabled={loading}
              />
              {errors.codigo_contabilidad && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.codigo_contabilidad}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cantidad_contabilidad">
                  Cantidad <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cantidad_contabilidad"
                  type="number"
                  step="0.01"
                  min="0"
                  value={cantidadContabilidad}
                  onChange={(e) => setCantidadContabilidad(e.target.value)}
                  placeholder="0.00"
                  className={
                    errors.cantidad_contabilidad ? "border-red-500" : ""
                  }
                  disabled={loading}
                />
                {errors.cantidad_contabilidad && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.cantidad_contabilidad}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="precio_contabilidad">
                  Precio (CUP) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="precio_contabilidad"
                  type="number"
                  step="0.01"
                  min="0"
                  value={precioContabilidad}
                  onChange={(e) => setPrecioContabilidad(e.target.value)}
                  placeholder="0.00"
                  className={errors.precio_contabilidad ? "border-red-500" : ""}
                  disabled={loading}
                />
                {errors.precio_contabilidad && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.precio_contabilidad}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
