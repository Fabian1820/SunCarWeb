"use client"

import { Card, CardContent } from "@/components/shared/molecule/card"
import { Users, TrendingUp, TrendingDown, Zap, Sun, Battery } from "lucide-react"
import type { EstadisticaLineaTiempoItemFrontend } from "@/lib/types/feats/estadisticas/estadisticas-types"

interface KpiCardsProps {
  estadisticas: EstadisticaLineaTiempoItemFrontend[]
  selectedYear: number
  selectedMonth: number
}

export function KpiCards({ estadisticas, selectedYear, selectedMonth }: KpiCardsProps) {
  if (!estadisticas || estadisticas.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
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

  // Encontrar el mes seleccionado
  const mesActual = estadisticas.find(e => e.año === selectedYear && e.mes === selectedMonth)
  
  // Encontrar el mes anterior
  let mesAnterior = null
  const indexActual = estadisticas.findIndex(e => e.año === selectedYear && e.mes === selectedMonth)
  if (indexActual > 0) {
    mesAnterior = estadisticas[indexActual - 1]
  }

  // Si no hay datos del mes seleccionado, usar el último mes disponible
  const datosActuales = mesActual || estadisticas[estadisticas.length - 1]
  
  // Calcular diferencia y porcentaje de cambio
  let diferencia = 0
  let porcentajeCambio = 0
  if (mesAnterior) {
    diferencia = datosActuales.numeroClientes - mesAnterior.numeroClientes
    if (mesAnterior.numeroClientes > 0) {
      porcentajeCambio = (diferencia / mesAnterior.numeroClientes) * 100
    }
  }

  const isPositiveChange = diferencia >= 0

  const cards = [
    {
      title: "Clientes del Mes",
      value: datosActuales.numeroClientes,
      subtitle: `${getMesNombre(datosActuales.mes)} ${datosActuales.año}`,
      icon: Users,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      borderColor: "border-l-blue-600",
    },
    {
      title: "Crecimiento Mensual",
      value: `${isPositiveChange ? '+' : ''}${porcentajeCambio.toFixed(1)}%`,
      subtitle: `${isPositiveChange ? '+' : ''}${diferencia} vs mes anterior`,
      icon: isPositiveChange ? TrendingUp : TrendingDown,
      iconBg: isPositiveChange ? "bg-green-100" : "bg-red-100",
      iconColor: isPositiveChange ? "text-green-600" : "text-red-600",
      borderColor: isPositiveChange ? "border-l-green-600" : "border-l-red-600",
      valueColor: isPositiveChange ? "text-green-600" : "text-red-600",
    },
    {
      title: "Inversores Instalados",
      value: `${datosActuales.potenciaInversores.toFixed(1)} kW`,
      subtitle: "Potencia total de inversores",
      icon: Zap,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      borderColor: "border-l-orange-600",
    },
    {
      title: "Baterías Instaladas",
      value: `${datosActuales.potenciaBaterias.toFixed(1)} kW`,
      subtitle: "Potencia total de baterías",
      icon: Battery,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      borderColor: "border-l-purple-600",
    },
    {
      title: "Paneles Instalados",
      value: `${datosActuales.potenciaPaneles.toFixed(1)} kW`,
      subtitle: "Potencia total de paneles",
      icon: Sun,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      borderColor: "border-l-yellow-600",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

function getMesNombre(mesNum: number): string {
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ]
  return meses[mesNum - 1] || ""
}
