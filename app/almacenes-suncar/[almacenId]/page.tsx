"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { InventarioService } from "@/lib/api-services"
import type { Almacen } from "@/lib/inventario-types"
import { BarChart3, FileOutput } from "lucide-react"

export default function AlmacenHubPage() {
  const params = useParams()
  const router = useRouter()
  const almacenId = params.almacenId as string

  const [almacen, setAlmacen] = useState<Almacen | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await InventarioService.getAlmacenes()
        const found = Array.isArray(data) ? data.find((a) => a.id === almacenId) : null
        setAlmacen(found || null)
      } catch {
        setAlmacen(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [almacenId])

  if (loading) {
    return <PageLoader moduleName="Almacén" text="Cargando almacén..." />
  }

  const opciones = [
    {
      id: "stock",
      title: "Stock",
      description: "Ver y gestionar el inventario de este almacén",
      icon: BarChart3,
      color: "blue",
      href: `/almacenes/${almacenId}`,
    },
    {
      id: "vales-salida",
      title: "Vales de Salida",
      description: "Gestionar vales de salida de materiales",
      icon: FileOutput,
      color: "orange",
      href: `/almacenes-suncar/${almacenId}/vales-salida`,
    },
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; icon: string; hover: string }> = {
      blue: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        icon: "text-blue-600",
        hover: "hover:bg-blue-100",
      },
      orange: {
        bg: "bg-orange-50",
        border: "border-orange-200",
        icon: "text-orange-600",
        hover: "hover:bg-orange-100",
      },
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <ModuleHeader
        title={almacen?.nombre || "Almacén"}
        subtitle={almacen?.direccion || "Gestión de stock y vales de salida"}
        badge={{ text: "Almacenes", className: "bg-blue-100 text-blue-800" }}
        className="bg-white shadow-sm border-b border-blue-100"
        backButton={{ href: "/almacenes-suncar", label: "Volver a Almacenes" }}
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{opcion.title}</h3>
                      <p className="text-sm text-gray-600">{opcion.description}</p>
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
