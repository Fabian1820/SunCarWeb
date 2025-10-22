"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import type { ElementoPersonalizado } from "@/lib/api-types"

interface ElementosPersonalizadosFieldsProps {
  value: ElementoPersonalizado[]
  onChange: (items: ElementoPersonalizado[]) => void
}

export function ElementosPersonalizadosFields({
  value,
  onChange,
}: ElementosPersonalizadosFieldsProps) {
  const handleItemChange = (index: number, field: keyof ElementoPersonalizado, newValue: string) => {
    const items = [...value]
    const item = { ...items[index] }

    if (field === "cantidad") {
      const parsed = Number(newValue)
      item.cantidad = Number.isNaN(parsed) ? 0 : parsed
    } else {
      item.descripcion = newValue
    }

    items[index] = item
    onChange(items)
  }

  const handleAddItem = () => {
    onChange([
      ...value,
      {
        descripcion: "",
        cantidad: 1,
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    const items = [...value]
    items.splice(index, 1)
    onChange(items)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-700">
          Elementos personalizados
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddItem}
          className="text-green-700 border-green-200 hover:bg-green-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar elemento
        </Button>
      </div>

      {value.length === 0 && (
        <p className="text-sm text-gray-500">
          Agrega elementos personalizados para registrar componentes específicos solicitados por el lead.
        </p>
      )}

      <div className="space-y-4">
        {value.map((item, index) => (
          <div key={`elemento-${index}`} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 space-y-3">
                <div>
                  <Label className="text-xs uppercase text-gray-500">Descripción</Label>
                  <Input
                    value={item.descripcion}
                    onChange={(event) => handleItemChange(index, "descripcion", event.target.value)}
                    placeholder="Describe el elemento personalizado"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase text-gray-500">Cantidad</Label>
                  <Input
                    type="number"
                    min={1}
                    value={item.cantidad ?? 1}
                    onChange={(event) => handleItemChange(index, "cantidad", event.target.value)}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveItem(index)}
                className="text-red-600 hover:text-red-800 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
