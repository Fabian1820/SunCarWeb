"use client"

import { Badge } from "@/components/shared/atom/badge"

type Prioridad = "Alta" | "Media" | "Baja"

interface PriorityBadgeProps {
  prioridad?: Prioridad
}

const PRIORIDAD_CONFIG = {
  Alta: {
    className: "bg-red-100 text-red-800 border-red-300",
    icon: "🔴"
  },
  Media: {
    className: "bg-orange-100 text-orange-800 border-orange-300",
    icon: "🟠"
  },
  Baja: {
    className: "bg-blue-100 text-blue-800 border-blue-300",
    icon: "🔵"
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
