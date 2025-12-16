"use client"

import { cn } from "@/lib/utils"

interface EstadoBadgeProps {
    pagada: boolean
    terminada: boolean
    className?: string
}

export function EstadoBadge({ pagada, terminada, className }: EstadoBadgeProps) {
    // Verde: pagada (terminada y pagada)
    // Amarillo: no terminada
    // Rojo: terminada y no pagada

    const getColor = () => {
        if (pagada && terminada) return "bg-green-500"
        if (!terminada) return "bg-yellow-500"
        return "bg-red-500"
    }

    const getTooltip = () => {
        if (pagada && terminada) return "Pagada"
        if (!terminada) return "No terminada"
        return "Terminada - No pagada"
    }

    return (
        <div
            className={cn("w-3 h-3 rounded-full inline-block", getColor(), className)}
            title={getTooltip()}
        />
    )
}
