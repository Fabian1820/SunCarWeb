"use client"

import { Card, CardContent } from "@/components/shared/molecule/card"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { Eye, Zap } from "lucide-react"
import { useRouter } from "next/navigation"

export default function OfertasGestionPage() {
  const router = useRouter()

  const opciones = [
    {
      id: 'confeccion',
      title: 'Confección de Ofertas',
      description: 'Arma ofertas fotovoltaicas con materiales, margen y redondeo final',
      icon: Zap,
      color: 'amber',
      href: '/ofertas-gestion/confeccion'
    },
    {
      id: 'ver-ofertas-confeccionadas',
      title: 'Ver Ofertas Confeccionadas',
      description: 'Explora las ofertas confeccionadas en formato de cards',
      icon: Eye,
      color: 'orange',
      href: '/ofertas-gestion/ver-ofertas-confeccionadas'
    }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      amber: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: 'text-amber-600',
        hover: 'hover:bg-amber-100'
      },
      orange: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        icon: 'text-orange-600',
        hover: 'hover:bg-orange-100'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        icon: 'text-purple-600',
        hover: 'hover:bg-purple-100'
      }
    }
    return colors[color as keyof typeof colors] || colors.amber
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Gestionar Ofertas"
        subtitle="Administrar confección de ofertas y herramientas de ventas"
        badge={{ text: "Ventas", className: "bg-amber-100 text-amber-800" }}
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
