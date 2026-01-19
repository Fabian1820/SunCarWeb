"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { AlertCircle, RefreshCw, DollarSign } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { InventarioService } from "@/lib/api-services"
import type { Almacen, Tienda } from "@/lib/inventario-types"
import { RouteGuard } from "@/components/auth/route-guard"

export default function TiendaDetallePage() {
  const params = useParams()
  const router = useRouter()
  const tiendaId = params.tiendaId as string

  const [tienda, setTienda] = useState<Tienda | null>(null)
  const [almacen, setAlmacen] = useState<Almacen | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDetalle = async () => {
    setLoading(true)
    setError(null)
    try {
      const [tiendasData, almacenesData] = await Promise.all([
        InventarioService.getTiendas(),
        InventarioService.getAlmacenes(),
      ])
      const tiendaEncontrada = tiendasData.find((item) => item.id === tiendaId) || null
      setTienda(tiendaEncontrada)
      const almacenEncontrado = almacenesData.find((item) => item.id === tiendaEncontrada?.almacen_id) || null
      setAlmacen(almacenEncontrado)
    } catch (err) {
      console.error("Error loading tienda detalle:", err)
      setError(err instanceof Error ? err.message : "No se pudo cargar la tienda")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDetalle()
  }, [tiendaId])

  const submodulos = [
    {
      id: 'caja',
      title: 'Abrir caja registradora',
      description: 'Gestionar caja registradora de la tienda',
      icon: DollarSign,
      color: 'green',
      href: `/tiendas/${tiendaId}/caja`
    }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: 'text-green-600',
        hover: 'hover:bg-green-100'
      },
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        hover: 'hover:bg-blue-100'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        icon: 'text-purple-600',
        hover: 'hover:bg-purple-100'
      },
      orange: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        icon: 'text-orange-600',
        hover: 'hover:bg-orange-100'
      }
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  if (loading) {
    return <PageLoader moduleName="Tienda" text="Cargando detalles..." />
  }

  if (error || !tienda) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar tienda</h3>
          <p className="text-gray-600 mb-4">{error || "No se encontró la tienda solicitada."}</p>
          <Button
            size="icon"
            onClick={loadDetalle}
            className="h-10 w-10 bg-amber-600 hover:bg-amber-700 touch-manipulation"
            aria-label="Reintentar"
            title="Reintentar"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">Reintentar</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <RouteGuard requiredModule={`tienda:${tiendaId}`}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
        <ModuleHeader
          title={`Tienda: ${tienda.nombre}`}
          subtitle={almacen ? `Almacén asociado: ${almacen.nombre}` : "Sin almacén asignado"}
          badge={{ text: "Gestión", className: "bg-orange-100 text-orange-800" }}
          className="bg-white shadow-sm border-b border-orange-100"
        />

        <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {submodulos.map((submodulo) => {
              const Icon = submodulo.icon
              const colors = getColorClasses(submodulo.color)
              
              return (
                <Card
                  key={submodulo.id}
                  className={`cursor-pointer transition-all duration-200 ${colors.border} ${colors.hover} border-2`}
                  onClick={() => router.push(submodulo.href)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className={`${colors.bg} p-4 rounded-full`}>
                        <Icon className={`h-8 w-8 ${colors.icon}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {submodulo.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {submodulo.description}
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
    </RouteGuard>
  )
}
