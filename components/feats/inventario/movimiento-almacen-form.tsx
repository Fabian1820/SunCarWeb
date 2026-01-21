"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Save, AlertCircle, Loader2, Plus } from "lucide-react"
import type { Almacen, MovimientoCreateData } from "@/lib/inventario-types"
import type { Material } from "@/lib/material-types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"

interface MovimientoAlmacenFormProps {
  almacen: Almacen
  tipo: "entrada" | "salida"
  materiales: Material[]
  onSubmit: (data: MovimientoCreateData) => Promise<void> | void
  onCreateMaterial?: (query: string) => void
}

export function MovimientoAlmacenForm({
  almacen,
  tipo,
  materiales,
  onSubmit,
  onCreateMaterial,
}: MovimientoAlmacenFormProps) {
  const [materialCodigo, setMaterialCodigo] = useState("")
  const [cantidad, setCantidad] = useState("1")
  const [referencia, setReferencia] = useState("")
  const [motivo, setMotivo] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = () => {
    if (!materialCodigo) {
      setError("Selecciona un material")
      return false
    }
    const cantidadNum = Number(cantidad)
    if (!cantidadNum || cantidadNum <= 0) {
      setError("La cantidad debe ser mayor a cero")
      return false
    }
    setError(null)
    return true
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        tipo,
        material_codigo: materialCodigo,
        cantidad: Number(cantidad),
        almacen_origen_id: almacen.id,
        referencia: referencia || undefined,
        motivo: motivo || undefined,
      })
      setMaterialCodigo("")
      setCantidad("1")
      setReferencia("")
      setMotivo("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el movimiento")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Almacen</Label>
          <div className="rounded-md border px-3 py-2 text-sm text-gray-700 bg-gray-50">
            {almacen.nombre}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Material *</Label>
          <Select value={materialCodigo} onValueChange={setMaterialCodigo}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un material" />
            </SelectTrigger>
            <SelectContent>
              {materiales.map((material) => (
                <SelectItem key={material.codigo} value={String(material.codigo)}>
                  {material.codigo} - {material.descripcion}
                </SelectItem>
              ))}
              {materiales.length === 0 && (
                <SelectItem value="no-materiales" disabled>
                  No hay materiales disponibles
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {tipo === "entrada" && onCreateMaterial && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => onCreateMaterial("")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear nuevo material
            </Button>
          )}
        </div>

        <div>
          <Label htmlFor="movimiento-cantidad" className="text-sm font-medium text-gray-700 mb-2 block">
            Cantidad *
          </Label>
          <Input
            id="movimiento-cantidad"
            type="number"
            min="0"
            step="0.01"
            value={cantidad}
            onChange={(event) => setCantidad(event.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="movimiento-referencia" className="text-sm font-medium text-gray-700 mb-2 block">
            Referencia
          </Label>
          <Input
            id="movimiento-referencia"
            value={referencia}
            onChange={(event) => setReferencia(event.target.value)}
            placeholder="Factura, guia, etc."
          />
        </div>

        <div>
          <Label htmlFor="movimiento-motivo" className="text-sm font-medium text-gray-700 mb-2 block">
            Motivo
          </Label>
          <Input
            id="movimiento-motivo"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            placeholder="Detalle del movimiento"
          />
        </div>
      </div>

      {error ? (
        <div className="flex items-center text-red-600">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Registrar {tipo}
        </Button>
      </div>
    </form>
  )
}
