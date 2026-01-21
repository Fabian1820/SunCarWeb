"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { Package, Settings } from "lucide-react"
import { useEffect, useState } from "react"
import { InventarioService } from "@/lib/api-services"
import type { Almacen } from "@/lib/inventario-types"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useAuth } from "@/contexts/auth-context"

export default function AlmacenesSuncarPage() {
  const { hasPermission } = useAuth()
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAlmacenes = async () => {
      try {
        const data = await InventarioService.getAlmacenes()
        setAlmacenes(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error("Error loading almacenes:", error)
        setAlmacenes([])
      } finally {
        setLoading(false)
      }
    }
    loadAlmacenes()
  }, [])

  if (loading) {
    return <PageLoader moduleName="Almacenes Suncar" text="Cargando almacenes..." />
  }

  const almacenesDisponibles = almacenes.filter(almacen => 
    hasPermission(`almacen:${almacen.id}`)
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <ModuleHeader
        title="Almacenes Suncar"
        subtitle="Gestión de almacenes y control de inventario"
        badge={{ text: "Inventario", className: "bg-blue-100 text-blue-800" }}
        className="bg-white shadow-sm border-b border-blue-100"
        backButton={{
          href: "/",
          label: "Volver al Dashboard"
        }}
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="space-y-6">
          {/* Módulo de Gestión de Almacenes */}
          {hasPermission('inventario') && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Administración</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link href="/inventario?tab=almacenes">
                  <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-2 bg-white/90 backdrop-blur-sm">
                    <CardContent className="p-6 text-center flex flex-col justify-center">
                      <Settings className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestión de Almacenes</h3>
                      <p className="text-sm text-gray-600">Crear y administrar almacenes</p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          )}

          {/* Almacenes Individuales */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Almacenes</h2>
            {almacenesDisponibles.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No tienes acceso a ningún almacén</p>
                <p className="text-sm text-gray-500 mt-2">Contacta con el administrador para obtener permisos</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {almacenesDisponibles.map((almacen) => (
                  <Link key={almacen.id} href={`/almacenes/${almacen.id}`}>
                    <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-2 bg-white/90 backdrop-blur-sm">
                      <CardContent className="p-6 text-center flex flex-col justify-center">
                        <Package className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{almacen.nombre}</h3>
                        <p className="text-sm text-gray-600">
                          {almacen.direccion || "Entradas, salidas y stock"}
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
