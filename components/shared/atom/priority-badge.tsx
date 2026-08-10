"use client"

import { Badge } from "@/components/shared/atom/badge"

type Prioridad = "Ninguna" | "Urgente" | "Alta" | "Media" | "Baja"

interface PriorityBadgeProps {
  prioridad?: Prioridad
}

const PRIORIDAD_CONFIG = {
  Urgente: {
    className: "bg-purple-100 text-purple-800 border-purple-300",
    icon: "🟣"
  },
  Alta: {
    className: "bg-red-100 text-red-800 border-red-300",
    icon: "🔴"
  },
  Media: {
    className: "bg-emerald-100 text-emerald-800 border-emerald-300",
    icon: "🟠"
  },
  Baja: {
    className: "bg-blue-100 text-blue-800 border-blue-300",
    icon: "🔵"
  },
  Ninguna: {
    className: "bg-gray-100 text-gray-800 border-gray-300",
    icon: "⚪"
  }
}

export function PriorityBadge({ prioridad = "Baja" }: PriorityBadgeProps) {
  const config = PRIORIDAD_CONFIG[prioridad]

  return (
    <Badge className={`${config.className} text-xs font-semibold border px-2 py-1`}>
      {config.icon} {prioridad}
    </Badge>
  )
}
