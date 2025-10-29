/**
 * Badge que muestra si un trabajador está en la oficina o no
 */

import { Badge } from "@/components/shared/atom/badge"
import { CircleDot, CircleOff } from "lucide-react"

interface AsistenciaBadgeProps {
  estaEnOficina: boolean
  loading?: boolean
}

export function AsistenciaBadge({ estaEnOficina, loading }: AsistenciaBadgeProps) {
  if (loading) {
    return (
      <Badge variant="outline" className="text-xs">
        <span className="animate-pulse">...</span>
      </Badge>
    )
  }

  if (estaEnOficina) {
    return (
      <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white text-xs gap-1">
        <CircleDot className="h-3 w-3" />
        En oficina
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="text-gray-500 text-xs gap-1">
      <CircleOff className="h-3 w-3" />
      Fuera
    </Badge>
  )
}
