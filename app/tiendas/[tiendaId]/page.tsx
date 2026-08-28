"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ModuleCard } from "@/components/shared/molecule/module-card"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { AlertCircle, RefreshCw, DollarSign } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { InventarioService } from "@/lib/api-services"
import type { Almacen, Tienda } from "@/lib/inventario-types"
import { RouteGuard } from "@/components/auth/route-guard"

export default function TiendaDetallePage() {
  const params = useParams()
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
      href: `/tiendas/${tiendaId}/caja`
    }
  ]

  if (loading) {
    return <PageLoader moduleName="Tienda" text="Cargando detalles..." />
  }

  if (error || !tienda) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee] flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
        <ModuleHeader
          title={`Tienda: ${tienda.nombre}`}
          subtitle={almacen ? `Almacén asociado: ${almacen.nombre}` : "Sin almacén asignado"}
          badge={{ text: "Comercial Ventas", className: "bg-indigo-100 text-indigo-800" }}
          className="bg-white shadow-sm border-b border-indigo-100"
          backButton={{
            href: "/tiendas-suncarventas",
            label: "Volver a Tiendas"
          }}
        />

        <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {submodulos.map((submodulo) => (
              <ModuleCard
                key={submodulo.id}
                href={submodulo.href}
                icon={submodulo.icon}
                iconClass="text-indigo-600"
                title={submodulo.title}
                description={submodulo.description}
              />
            ))}
          </div>
        </main>
      </div>
    </RouteGuard>
  )
}
