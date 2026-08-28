"use client"

import { ShoppingBag, Settings } from "lucide-react"
import { useEffect, useState } from "react"
import { InventarioService } from "@/lib/api-services"
import type { Tienda } from "@/lib/inventario-types"
import { ModuleCard } from "@/components/shared/molecule/module-card"
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
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Tiendas Suncar Ventas"
        subtitle="Gestión de tiendas y puntos de venta"
        badge={{ text: "Comercial Ventas", className: "bg-indigo-100 text-indigo-800" }}
        className="bg-white shadow-sm border-b border-indigo-100"
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="space-y-6">
          {/* Módulo de Gestión de Tiendas */}
          {hasPermission('inventario') && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ModuleCard
                href="/inventario/tiendas"
                icon={Settings}
                iconClass="text-indigo-600"
                title="Gestión de Tiendas"
                description="Crear y administrar sucursales"
              />
            </div>
          )}

          {/* Tiendas Individuales */}
          <div>
            {tiendasDisponibles.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No tienes acceso a ninguna tienda</p>
                <p className="text-sm text-gray-500 mt-2">Contacta con el administrador para obtener permisos</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tiendasDisponibles.map((tienda) => (
                  <ModuleCard
                    key={tienda.id}
                    href={`/tiendas/${tienda.id}`}
                    icon={ShoppingBag}
                    iconClass="text-indigo-600"
                    title={tienda.nombre}
                    // El nombre del almacén lo escribe el usuario: se recorta
                    // para que una tarjeta no estire toda la fila.
                    description={
                      tienda.almacen_nombre
                        ? `Almacén: ${tienda.almacen_nombre}`
                        : "Ventas y stock"
                    }
                    clampDescription
                    tieneSubmodulos
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
