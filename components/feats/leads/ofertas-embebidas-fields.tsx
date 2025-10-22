"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, Search } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Switch } from "@/components/shared/molecule/switch"
import { useOfertas } from "@/hooks/use-ofertas"
import type { OfertaEmbebida } from "@/lib/api-types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"

interface OfertasEmbebidasFieldsProps {
  value: OfertaEmbebida[]
  onChange: (items: OfertaEmbebida[]) => void
}

const defaultOferta = (): OfertaEmbebida => ({
  descripcion: "",
  precio: 0,
  cantidad: 1,
  garantias: [],
  elementos: [],
})

export function OfertasEmbebidasFields({ value, onChange }: OfertasEmbebidasFieldsProps) {
  const { ofertasSimplificadas, loading: loadingOfertas } = useOfertas()
  const [elementosText, setElementosText] = useState<string[]>([])
  const [elementosErrors, setElementosErrors] = useState<Record<number, string>>({})
  const [selectedOfertaId, setSelectedOfertaId] = useState<string>("")

  useEffect(() => {
    setElementosText((prev) => {
      const next = value.map((item, index) => {
        if (prev[index] !== undefined) return prev[index]
        if (!item.elementos || item.elementos.length === 0) return ""
        try {
          return JSON.stringify(item.elementos, null, 2)
        } catch {
          return ""
        }
      })
      return next
    })
  }, [value.length])

  const updateOferta = (index: number, updates: Partial<OfertaEmbebida>) => {
    const items = [...value]
    items[index] = {
      ...items[index],
      ...updates,
    }
    onChange(items)
  }

  const handleGarantiasChange = (index: number, raw: string) => {
    const garantias = raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
    updateOferta(index, { garantias })
  }

  const handleAddOferta = () => {
    onChange([...value, defaultOferta()])
    setElementosText((prev) => [...prev, ""])
    setSelectedOfertaId("")
  }

  const handleAddOfertaFromSelect = () => {
    if (!selectedOfertaId) return
    
    const ofertaSeleccionada = ofertasSimplificadas.find(o => o.id === selectedOfertaId)
    if (!ofertaSeleccionada) return

    const nuevaOferta: OfertaEmbebida = {
      id: ofertaSeleccionada.id,
      descripcion: ofertaSeleccionada.descripcion,
      descripcion_detallada: ofertaSeleccionada.descripcion_detallada,
      precio: ofertaSeleccionada.precio,
      precio_cliente: ofertaSeleccionada.precio_cliente,
      marca: ofertaSeleccionada.marca,
      imagen: ofertaSeleccionada.imagen,
      moneda: ofertaSeleccionada.moneda,
      financiamiento: ofertaSeleccionada.financiamiento,
      descuentos: ofertaSeleccionada.descuentos,
      cantidad: 1,
      garantias: [],
      elementos: [],
    }
    
    onChange([...value, nuevaOferta])
    setElementosText((prev) => [...prev, ""])
    setSelectedOfertaId("")
  }

  const handleRemoveOferta = (index: number) => {
    const items = [...value]
    items.splice(index, 1)
    onChange(items)
    setElementosText((prev) => prev.filter((_, idx) => idx !== index))
    setElementosErrors((prev) => {
      const { [index]: _, ...rest } = prev
      return rest
    })
  }

  const handleElementosChange = (index: number, text: string) => {
    setElementosText((prev) => {
      const next = [...prev]
      next[index] = text
      return next
    })

    if (!text.trim()) {
      updateOferta(index, { elementos: [] })
      setElementosErrors((prev) => {
        const { [index]: _, ...rest } = prev
        return rest
      })
      return
    }

    try {
      const parsed = JSON.parse(text)
      if (!Array.isArray(parsed)) {
        throw new Error("Debe ser un arreglo JSON")
      }
      updateOferta(index, { elementos: parsed })
      setElementosErrors((prev) => {
        const { [index]: _, ...rest } = prev
        return rest
      })
    } catch (error) {
      setElementosErrors((prev) => ({
        ...prev,
        [index]: error instanceof Error ? error.message : "JSON inválido",
      }))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-700">
          Ofertas asociadas
        </Label>
      </div>

      {/* Selector de ofertas existentes */}
      <div className="border border-gray-200 rounded-lg p-4 bg-blue-50 space-y-3">
        <Label className="text-sm font-medium text-gray-700">
          Seleccionar oferta existente
        </Label>
        <div className="flex gap-2">
          <Select value={selectedOfertaId} onValueChange={setSelectedOfertaId} disabled={loadingOfertas}>
            <SelectTrigger className="flex-1 bg-white">
              <SelectValue placeholder={loadingOfertas ? "Cargando ofertas..." : "Selecciona una oferta"} />
            </SelectTrigger>
            <SelectContent>
              {ofertasSimplificadas.map((oferta) => (
                <SelectItem key={oferta.id} value={oferta.id}>
                  {oferta.descripcion} - {oferta.precio} {oferta.moneda || "USD"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            onClick={handleAddOfertaFromSelect}
            disabled={!selectedOfertaId || loadingOfertas}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar
          </Button>
        </div>
        <p className="text-xs text-gray-600">
          Selecciona una oferta del catálogo. Los datos se cargarán automáticamente.
        </p>
      </div>

      {value.length === 0 && (
        <p className="text-sm text-gray-500">
          Selecciona ofertas del catálogo para asociarlas con este lead/cliente.
        </p>
      )}

      <div className="space-y-4">
        {value.map((oferta, index) => (
          <div key={`oferta-${index}`} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {oferta.id && (
                  <div className="mb-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded inline-block">
                    Oferta del catálogo
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs uppercase text-gray-500">Descripción</Label>
                    <Input
                      value={oferta.descripcion}
                      onChange={(event) => updateOferta(index, { descripcion: event.target.value })}
                      placeholder="Descripción comercial de la oferta"
                      readOnly={!!oferta.id}
                      className={oferta.id ? "bg-gray-50" : ""}
                    />
                  </div>
                  {oferta.descripcion_detallada && (
                    <div>
                      <Label className="text-xs uppercase text-gray-500">Descripción detallada</Label>
                      <Textarea
                        value={oferta.descripcion_detallada ?? ""}
                        onChange={(event) => updateOferta(index, { descripcion_detallada: event.target.value })}
                        rows={3}
                        placeholder="Información adicional"
                        readOnly={!!oferta.id}
                        className={oferta.id ? "bg-gray-50" : ""}
                      />
                    </div>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveOferta(index)}
                className="text-red-600 hover:text-red-800 hover:bg-red-50 ml-3"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs uppercase text-gray-500">Precio</Label>
                <Input
                  type="number"
                  min={0}
                  value={oferta.precio}
                  onChange={(event) => updateOferta(index, { precio: Number(event.target.value) || 0 })}
                  readOnly={!!oferta.id}
                  className={oferta.id ? "bg-gray-50" : ""}
                />
              </div>
              <div>
                <Label className="text-xs uppercase text-gray-500">Precio Cliente</Label>
                <Input
                  type="number"
                  min={0}
                  value={oferta.precio_cliente ?? ""}
                  onChange={(event) => {
                    const parsed = Number(event.target.value)
                    updateOferta(index, {
                      precio_cliente: event.target.value === "" ? undefined : Number.isNaN(parsed) ? undefined : parsed,
                    })
                  }}
                  placeholder="Puede ser diferente al precio base"
                  readOnly={!!oferta.id}
                  className={oferta.id ? "bg-gray-50" : ""}
                />
              </div>
              <div>
                <Label className="text-xs uppercase text-gray-500">Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  value={oferta.cantidad}
                  onChange={(event) => updateOferta(index, { cantidad: Number(event.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase text-gray-500">Moneda</Label>
                <Input
                  value={oferta.moneda ?? ""}
                  onChange={(event) => updateOferta(index, { moneda: event.target.value })}
                  placeholder="USD, EUR, CUP"
                  readOnly={!!oferta.id}
                  className={oferta.id ? "bg-gray-50" : ""}
                />
              </div>
              <div>
                <Label className="text-xs uppercase text-gray-500">Marca</Label>
                <Input
                  value={oferta.marca ?? ""}
                  onChange={(event) => updateOferta(index, { marca: event.target.value })}
                  placeholder="Marca asociada"
                  readOnly={!!oferta.id}
                  className={oferta.id ? "bg-gray-50" : ""}
                />
              </div>
            </div>

            {(oferta.descuentos || oferta.financiamiento) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {oferta.descuentos && (
                  <div>
                    <Label className="text-xs uppercase text-gray-500">Descuentos</Label>
                    <Input
                      value={oferta.descuentos ?? ""}
                      onChange={(event) => updateOferta(index, { descuentos: event.target.value })}
                      readOnly={!!oferta.id}
                      className={oferta.id ? "bg-gray-50" : ""}
                    />
                  </div>
                )}
                {oferta.financiamiento && (
                  <div className="flex items-center space-x-2">
                    <div className="px-3 py-2 bg-blue-100 text-blue-800 text-sm rounded">
                      ✓ Financiamiento disponible
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
