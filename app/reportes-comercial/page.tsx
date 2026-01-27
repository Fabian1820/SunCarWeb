"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { BarChart3, Clock } from "lucide-react"

export default function ReportesComercialPage() {
  const router = useRouter()

  const opciones = [
    {
      id: 'pendientes-instalacion',
      title: 'Pendientes de Instalación',
      description: 'No iniciadas y en proceso de leads y clientes',
      icon: Clock,
      color: 'blue',
      href: '/reportes-comercial/pendientes-instalacion'
    }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        hover: 'hover:bg-blue-100'
      }
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <ModuleHeader
        title="Reportes de Comercial"
        subtitle="Reportes y análisis del área comercial"
        badge={{ text: "Reportes", className: "bg-purple-100 text-purple-800" }}
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {opciones.map((opcion) => {
            const Icon = opcion.icon
            const colors = getColorClasses(opcion.color)
            
            return (
              <Card
                key={opcion.id}
                className={`cursor-pointer transition-all duration-200 ${colors.border} ${colors.hover} border-2`}
                onClick={() => router.push(opcion.href)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`${colors.bg} p-4 rounded-full`}>
                      <Icon className={`h-8 w-8 ${colors.icon}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {opcion.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {opcion.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>
    </div>
  )
}
