"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Save, X, Loader2, AlertCircle } from "lucide-react"
import type { Almacen, InventarioMovimientoTipo, MovimientoCreateData, Tienda } from "@/lib/inventario-types"
import type { Material } from "@/lib/material-types"

interface MovimientoFormProps {
  almacenes: Almacen[]
  tiendas: Tienda[]
  materiales: Material[]
  defaultTipo?: InventarioMovimientoTipo
  onSubmit: (data: MovimientoCreateData) => Promise<void> | void
  onCancel: () => void
}

const tipoOptions: { value: InventarioMovimientoTipo; label: string }[] = [
  { value: "entrada", label: "Entrada" },
  { value: "salida", label: "Salida" },
  { value: "transferencia", label: "Transferencia" },
  { value: "ajuste", label: "Ajuste" },
  { value: "venta", label: "Venta" },
]

export function MovimientoForm({ almacenes, tiendas, materiales, defaultTipo = "entrada", onSubmit, onCancel }: MovimientoFormProps) {
  const [formData, setFormData] = useState({
    tipo: defaultTipo,
    material_codigo: "",
    cantidad: "",
    almacen_origen_id: "",
    almacen_destino_id: "",
    tienda_id: "",
    motivo: "",
    referencia: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const materialSeleccionado = useMemo(() => {
    return materiales.find(m => String(m.codigo) === formData.material_codigo)
  }, [materiales, formData.material_codigo])

  const tiendaSeleccionada = useMemo(() => {
    return tiendas.find(t => t.id === formData.tienda_id || t.nombre === formData.tienda_id)
  }, [tiendas, formData.tienda_id])

  useEffect(() => {
    setFormData({
      tipo: defaultTipo,
      material_codigo: "",
      cantidad: "",
      almacen_origen_id: "",
      almacen_destino_id: "",
      tienda_id: "",
      motivo: "",
      referencia: "",
    })
  }, [defaultTipo])

  useEffect(() => {
    if (formData.tipo === "venta" && tiendaSeleccionada?.almacen_id) {
      setFormData(prev => ({ ...prev, almacen_origen_id: tiendaSeleccionada.almacen_id }))
    }
  }, [formData.tipo, tiendaSeleccionada])

  const validate = () => {
    if (!formData.material_codigo) {
      setError("Selecciona un material")
      return false
    }
    const cantidad = Number(formData.cantidad)
    if (!cantidad || cantidad <= 0) {
      setError("La cantidad debe ser mayor a cero")
      return false
    }
    if (formData.tipo === "transferencia") {
      if (!formData.almacen_origen_id || !formData.almacen_destino_id) {
        setError("Selecciona almacen origen y destino")
        return false
      }
      if (formData.almacen_origen_id === formData.almacen_destino_id) {
        setError("El almacen destino debe ser diferente al origen")
        return false
      }
    } else if (formData.tipo === "venta") {
      if (!formData.tienda_id) {
        setError("Selecciona una tienda")
        return false
      }
    } else if (!formData.almacen_origen_id) {
      setError("Selecciona un almacen")
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
      await onSubmit({
        tipo: formData.tipo as InventarioMovimientoTipo,
        material_codigo: formData.material_codigo,
        cantidad: Number(formData.cantidad),
        almacen_origen_id: formData.almacen_origen_id || undefined,
        almacen_destino_id: formData.almacen_destino_id || undefined,
        tienda_id: formData.tienda_id || undefined,
        motivo: formData.motivo || undefined,
        referencia: formData.referencia || undefined,
      })
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
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Tipo de movimiento *</Label>
          <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value as InventarioMovimientoTipo })}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {tipoOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Material *</Label>
          <Select value={formData.material_codigo} onValueChange={(value) => setFormData({ ...formData, material_codigo: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar material" />
            </SelectTrigger>
            <SelectContent>
              {materiales.map(material => (
                <SelectItem key={`${material.categoria}-${material.codigo}`} value={String(material.codigo)}>
                  {material.codigo} - {material.descripcion}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {materialSeleccionado?.um ? (
            <p className="text-xs text-gray-500 mt-1">Unidad: {materialSeleccionado.um}</p>
          ) : null}
        </div>

        {formData.tipo === "venta" ? (
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Tienda *</Label>
            <Select value={formData.tienda_id} onValueChange={(value) => setFormData({ ...formData, tienda_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tienda" />
              </SelectTrigger>
              <SelectContent>
                {tiendas.map(tienda => (
                  <SelectItem key={tienda.id || tienda.nombre} value={tienda.id || tienda.nombre}>
                    {tienda.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tiendaSeleccionada?.almacen_id ? (
              <p className="text-xs text-gray-500 mt-1">
                Almacen asociado: {tiendaSeleccionada.almacen_nombre || tiendaSeleccionada.almacen_id}
              </p>
            ) : null}
          </div>
        ) : (
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Almacen origen *</Label>
            <Select value={formData.almacen_origen_id} onValueChange={(value) => setFormData({ ...formData, almacen_origen_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar almacen" />
              </SelectTrigger>
              <SelectContent>
                {almacenes.map(almacen => (
                  <SelectItem key={almacen.id || almacen.nombre} value={almacen.id || almacen.nombre}>
                    {almacen.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {formData.tipo === "transferencia" ? (
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Almacen destino *</Label>
            <Select value={formData.almacen_destino_id} onValueChange={(value) => setFormData({ ...formData, almacen_destino_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar almacen destino" />
              </SelectTrigger>
              <SelectContent>
                {almacenes.map(almacen => (
                  <SelectItem key={almacen.id || almacen.nombre} value={almacen.id || almacen.nombre}>
                    {almacen.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div>
          <Label htmlFor="movimiento-cantidad" className="text-sm font-medium text-gray-700 mb-2 block">
            Cantidad *
          </Label>
          <Input
            id="movimiento-cantidad"
            type="number"
            min="0"
            step="0.01"
            value={formData.cantidad}
            onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
            placeholder="0"
          />
        </div>

        <div>
          <Label htmlFor="movimiento-referencia" className="text-sm font-medium text-gray-700 mb-2 block">
            Referencia
          </Label>
          <Input
            id="movimiento-referencia"
            value={formData.referencia}
            onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
            placeholder="Factura, guia, etc."
          />
        </div>

        <div>
          <Label htmlFor="movimiento-motivo" className="text-sm font-medium text-gray-700 mb-2 block">
            Motivo
          </Label>
          <Input
            id="movimiento-motivo"
            value={formData.motivo}
            onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
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

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Registrar movimiento
        </Button>
      </div>
    </form>
  )
}
