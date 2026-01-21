"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { ShoppingBag, Package, Settings } from "lucide-react"
import { useEffect, useState } from "react"
import { InventarioService } from "@/lib/api-services"
import type { Tienda } from "@/lib/inventario-types"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useAuth } from "@/contexts/auth-context"

export default function TiendasSuncarVentasPage() {
  const { hasPermission } = useAuth()
  const [tiendas, setTiendas] = useState<Tienda[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTiendas = async () => {
      try {
        const data = await InventarioService.getTiendas()
        setTiendas(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error("Error loading tiendas:", error)
        setTiendas([])
      } finally {
        setLoading(false)
      }
    }
    loadTiendas()
  }, [])

  if (loading) {
    return <PageLoader moduleName="Tiendas Suncar Ventas" text="Cargando tiendas..." />
  }

  const tiendasDisponibles = tiendas.filter(tienda => 
    hasPermission(`tienda:${tienda.id}`)
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Tiendas Suncar Ventas"
        subtitle="Gestión de tiendas y puntos de venta"
        badge={{ text: "Ventas", className: "bg-orange-100 text-orange-800" }}
        className="bg-white shadow-sm border-b border-orange-100"
        backButton={{
          href: "/",
          label: "Volver al Dashboard"
        }}
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="space-y-6">
          {/* Módulo de Gestión de Tiendas */}
          {hasPermission('inventario') && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Administración</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link href="/inventario?tab=tiendas">
                  <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-2 bg-white/90 backdrop-blur-sm">
                    <CardContent className="p-6 text-center flex flex-col justify-center">
                      <Settings className="h-10 w-10 text-orange-600 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestión de Tiendas</h3>
                      <p className="text-sm text-gray-600">Crear y administrar sucursales</p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          )}

          {/* Tiendas Individuales */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Puntos de Venta</h2>
            {tiendasDisponibles.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No tienes acceso a ninguna tienda</p>
                <p className="text-sm text-gray-500 mt-2">Contacta con el administrador para obtener permisos</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tiendasDisponibles.map((tienda) => (
                  <Link key={tienda.id} href={`/tiendas/${tienda.id}`}>
                    <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-2 bg-white/90 backdrop-blur-sm">
                      <CardContent className="p-6 text-center flex flex-col justify-center">
                        <ShoppingBag className="h-10 w-10 text-orange-600 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{tienda.nombre}</h3>
                        <p className="text-sm text-gray-600">
                          {tienda.almacen_nombre 
                            ? `Almacén: ${tienda.almacen_nombre}` 
                            : "Ventas y stock"}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
