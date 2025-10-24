"use client"

import { useState } from "react"
import { Plus, Trash2, Package, AlertCircle } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { useOfertas } from "@/hooks/use-ofertas"
import type { OfertaAsignacion, OfertaSimplificada } from "@/lib/api-types"

interface OfertasAsignacionFieldsProps {
  value: OfertaAsignacion[]
  onChange: (items: OfertaAsignacion[]) => void
}

export function OfertasAsignacionFields({ value, onChange }: OfertasAsignacionFieldsProps) {
  const { ofertasSimplificadas, loading: loadingOfertas } = useOfertas()
  const [selectedOfertaId, setSelectedOfertaId] = useState<string>("")
  const [cantidad, setCantidad] = useState<number>(1)
  const [error, setError] = useState<string>("")

  // Encontrar información de oferta por ID para mostrar en la lista
  const getOfertaInfo = (ofertaId: string): OfertaSimplificada | undefined => {
    return ofertasSimplificadas.find((o) => o.id === ofertaId)
  }

  // Verificar si una oferta ya está asignada
  const isOfertaAsignada = (ofertaId: string): boolean => {
    return value.some((asignacion) => asignacion.oferta_id === ofertaId)
  }

  const handleAddAsignacion = () => {
    setError("")

    if (!selectedOfertaId) {
      setError("Por favor selecciona una oferta")
      return
    }

    if (cantidad <= 0) {
      setError("La cantidad debe ser mayor a 0")
      return
    }

    if (isOfertaAsignada(selectedOfertaId)) {
      setError("Esta oferta ya está asignada. Puedes editarla en la lista.")
      return
    }

    const nuevaAsignacion: OfertaAsignacion = {
      oferta_id: selectedOfertaId,
      cantidad: cantidad,
    }

    onChange([...value, nuevaAsignacion])
    setSelectedOfertaId("")
    setCantidad(1)
  }

  const handleRemoveAsignacion = (index: number) => {
    const newValue = value.filter((_, i) => i !== index)
    onChange(newValue)
  }

  const handleUpdateCantidad = (index: number, newCantidad: number) => {
    if (newCantidad <= 0) return
    const newValue = [...value]
    newValue[index] = { ...newValue[index], cantidad: newCantidad }
    onChange(newValue)
  }

  if (loadingOfertas) {
    return (
      <div className="space-y-2">
        <Label>Ofertas</Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4 animate-spin" />
          Cargando ofertas disponibles...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Asignar Ofertas</Label>
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[220px] basis-64">
            <Select value={selectedOfertaId} onValueChange={setSelectedOfertaId}>
              <SelectTrigger className="max-w-full text-left [&>span]:truncate">
                <span className="flex-1 min-w-0 truncate text-left">
                  <SelectValue placeholder="Selecciona una oferta del catálogo" />
                </span>
              </SelectTrigger>
              <SelectContent>
                {ofertasSimplificadas.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No hay ofertas disponibles
                  </div>
                ) : (
                  ofertasSimplificadas.map((oferta) => (
                    <SelectItem
                      key={oferta.id}
                      value={oferta.id!}
                      disabled={isOfertaAsignada(oferta.id!)}
                      className="truncate"
                    >
                      {oferta.descripcion} - ${oferta.precio} {oferta.moneda || 'USD'}
                      {isOfertaAsignada(oferta.id!) && " (ya asignada)"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24">
            <Input
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value))}
              placeholder="Cant."
            />
          </div>
          <Button
            type="button"
            onClick={handleAddAsignacion}
            variant="outline"
            size="icon"
            disabled={!selectedOfertaId || cantidad <= 0}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {value.length > 0 && (
        <div className="space-y-2">
          <Label>Ofertas Asignadas ({value.length})</Label>
          <div className="space-y-2">
            {value.map((asignacion, index) => {
              const ofertaInfo = getOfertaInfo(asignacion.oferta_id)
              return (
                <div
                  key={`${asignacion.oferta_id}-${index}`}
                  className="flex w-full items-center gap-2 rounded-lg border bg-card p-3 min-w-0 overflow-hidden"
                >
                  <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="font-medium text-sm truncate" title={ofertaInfo?.descripcion || `Oferta ${asignacion.oferta_id}`}>
                      {ofertaInfo?.descripcion || `Oferta ${asignacion.oferta_id.slice(0, 8)}...`}
                    </div>
                    {ofertaInfo && (
                      <div className="text-xs text-muted-foreground truncate">
                        ${ofertaInfo.precio} {ofertaInfo.moneda || 'USD'}
                        {ofertaInfo.marca && ` • ${ofertaInfo.marca}`}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Input
                      type="number"
                      min="1"
                      value={asignacion.cantidad}
                      onChange={(e) => handleUpdateCantidad(index, Number(e.target.value))}
                      className="w-20 text-center"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAsignacion(index)}
                      className="flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {value.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <Package className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No hay ofertas asignadas aún
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Selecciona una oferta del catálogo y agrégala
          </p>
        </div>
      )}
    </div>
  )
}
