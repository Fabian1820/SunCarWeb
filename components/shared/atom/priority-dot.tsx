"use client"

import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shared/molecule/popover"
import { Button } from "@/components/shared/atom/button"

type Prioridad = "Ninguna" | "Urgente" | "Alta" | "Media" | "Baja"

interface PriorityDotProps {
  prioridad?: Prioridad
  onChange: (prioridad: Prioridad) => void
  disabled?: boolean
}

const PRIORIDAD_CONFIG = {
  Urgente: {
    color: "bg-purple-500",
    hoverColor: "hover:bg-purple-600",
    label: "🟣 Urgente"
  },
  Alta: {
    color: "bg-red-500",
    hoverColor: "hover:bg-red-600",
    label: "🔴 Alta"
  },
  Media: {
    color: "bg-emerald-500",
    hoverColor: "hover:bg-emerald-600",
    label: "🟠 Media"
  },
  Baja: {
    color: "bg-blue-500",
    hoverColor: "hover:bg-blue-600",
    label: "🔵 Baja"
  },
  Ninguna: {
    color: "bg-gray-400",
    hoverColor: "hover:bg-gray-500",
    label: "⚪ Ninguna"
  }
}

const PRIORIDADES_VALIDAS: Prioridad[] = ["Ninguna", "Urgente", "Alta", "Media", "Baja"]

export function PriorityDot({ prioridad = "Baja", onChange, disabled = false }: PriorityDotProps) {
  const [open, setOpen] = useState(false)

  // Asegurar que siempre tengamos una prioridad válida
  const prioridadValida: Prioridad = prioridad && PRIORIDADES_VALIDAS.includes(prioridad)
    ? prioridad
    : "Baja"
  
  const config = PRIORIDAD_CONFIG[prioridadValida]

  const handleChange = (newPrioridad: Prioridad) => {
    onChange(newPrioridad)
    setOpen(false)
  }

  if (disabled) {
    return (
      <div 
        className={`w-3 h-3 rounded-full ${config.color}`}
        title={prioridadValida}
      />
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`w-3 h-3 rounded-full ${config.color} ${config.hoverColor} cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${config.color.split('-')[1]}-500`}
          title={`Prioridad: ${prioridadValida} (clic para cambiar)`}
        />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-2">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-700 mb-2 px-2">Cambiar prioridad</p>
          {(Object.keys(PRIORIDAD_CONFIG) as Prioridad[]).map((p) => {
            const pConfig = PRIORIDAD_CONFIG[p]
            return (
              <Button
                key={p}
                type="button"
                variant="ghost"
                size="sm"
                className={`w-full justify-start text-sm text-black hover:text-black ${p === prioridadValida ? 'bg-gray-200 font-semibold' : 'text-gray-700'}`}
                onClick={() => handleChange(p)}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${pConfig.color} mr-2`} />
                {pConfig.label}
              </Button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
