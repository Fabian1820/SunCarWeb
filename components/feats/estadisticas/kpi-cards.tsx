"use client"

import { Card, CardContent } from "@/components/shared/molecule/card"
import { Users, TrendingUp, TrendingDown, Zap, Sun } from "lucide-react"
import type { EstadisticasCrecimiento } from "@/lib/types/feats/estadisticas/estadisticas-types"

interface KpiCardsProps {
  estadisticas: EstadisticasCrecimiento | null
}

export function KpiCards({ estadisticas }: KpiCardsProps) {
  if (!estadisticas) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-0 shadow-md animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-3 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-8 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const isPositiveChange = estadisticas.diferencia >= 0

  const cards = [
    {
      title: "Clientes del Mes",
      value: estadisticas.clientesMesActual,
      subtitle: `Acumulados hasta ${estadisticas.mes}/${estadisticas.año}`,
      icon: Users,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      borderColor: "border-l-blue-600",
    },
    {
      title: "Crecimiento Mensual",
      value: `${isPositiveChange ? '+' : ''}${estadisticas.porcentajeCambio.toFixed(1)}%`,
      subtitle: `${isPositiveChange ? '+' : ''}${estadisticas.diferencia} vs mes anterior`,
      icon: isPositiveChange ? TrendingUp : TrendingDown,
      iconBg: isPositiveChange ? "bg-green-100" : "bg-red-100",
      iconColor: isPositiveChange ? "text-green-600" : "text-red-600",
      borderColor: isPositiveChange ? "border-l-green-600" : "border-l-red-600",
      valueColor: isPositiveChange ? "text-green-600" : "text-red-600",
    },
    {
      title: "Inversores Instalados",
      value: `${(estadisticas.potenciaInversores / 1000).toFixed(1)} kW`,
      subtitle: "Potencia total de inversores",
      icon: Zap,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      borderColor: "border-l-orange-600",
    },
    {
      title: "Paneles Instalados",
      value: `${(estadisticas.potenciaPaneles / 1000).toFixed(1)} kW`,
      subtitle: "Potencia total de paneles",
      icon: Sun,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      borderColor: "border-l-yellow-600",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card
            key={index}
            className={`border-0 shadow-md border-l-4 ${card.borderColor} hover:shadow-lg transition-shadow`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">{card.title}</p>
                  <p className={`text-2xl font-bold ${card.valueColor || 'text-gray-900'}`}>
                    {card.value}
                  </p>
                  <p className="text-xs text-gray-400">{card.subtitle}</p>
                </div>
                <div className={`p-3 ${card.iconBg} rounded-lg`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
