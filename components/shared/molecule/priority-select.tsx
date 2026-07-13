"use client"

import { Label } from "@/components/shared/atom/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"

type Prioridad = "Ninguna" | "Urgente" | "Alta" | "Media" | "Baja"

interface PrioritySelectProps {
  value?: Prioridad
  onChange: (value: Prioridad) => void
  label?: string
  showHelp?: boolean
  disabled?: boolean
}

export function PrioritySelect({ 
  value = "Baja", 
  onChange, 
  label = "Prioridad",
  showHelp = true,
  disabled = false
}: PrioritySelectProps) {
  return (
    <div>
      <Label htmlFor="prioridad" className="text-gray-700">
        {label}
      </Label>
      <Select
        value={value}
        onValueChange={(val) => onChange(val as Prioridad)}
        disabled={disabled}
      >
        <SelectTrigger id="prioridad" className="text-gray-900">
          <SelectValue placeholder="Seleccionar prioridad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Urgente">🟣 Urgente</SelectItem>
          <SelectItem value="Alta">🔴 Alta</SelectItem>
          <SelectItem value="Media">🟠 Media</SelectItem>
          <SelectItem value="Baja">🔵 Baja</SelectItem>
          <SelectItem value="Ninguna">⚪ Ninguna</SelectItem>
        </SelectContent>
      </Select>
      {showHelp && (
        <p className="text-xs text-gray-500 mt-1">
          💡 Se asigna "Alta" automáticamente si la fuente es Fernando, Kelly, Ale o Andy
        </p>
      )}
    </div>
  )
}
