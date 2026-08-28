"use client"

import { Package, Settings } from "lucide-react"
import { useEffect, useState } from "react"
import { InventarioService } from "@/lib/api-services"
import type { Almacen } from "@/lib/inventario-types"
import { ModuleCard } from "@/components/shared/molecule/module-card"
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
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Almacenes Suncar"
        subtitle="Gestión de almacenes y control de inventario"
        badge={{ text: "Gestión de Almacenes", className: "bg-sky-100 text-sky-800" }}
        className="bg-white shadow-sm border-b border-sky-100"
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="space-y-6">
          {/* Módulo de Gestión de Almacenes. Solicitudes de Envío ya no vive
              aquí: es un módulo propio dentro de Gestión de Almacenes. */}
          {hasPermission('inventario') && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ModuleCard
                href="/inventario/almacenes"
                icon={Settings}
                iconClass="text-sky-700"
                title="Gestión de Almacenes"
                description="Crear y administrar almacenes"
              />
            </div>
          )}

          {/* Almacenes Individuales */}
          <div>
            {almacenesDisponibles.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No tienes acceso a ningún almacén</p>
                <p className="text-sm text-gray-500 mt-2">Contacta con el administrador para obtener permisos</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {almacenesDisponibles.map((almacen) => (
                  <ModuleCard
                    key={almacen.id}
                    href={`/almacenes-suncar/${almacen.id}`}
                    icon={Package}
                    iconClass="text-sky-700"
                    title={almacen.nombre}
                    // La dirección la escribe el usuario y puede ser larga: se
                    // recorta para que una tarjeta no estire toda la fila.
                    description={almacen.direccion || "Entradas, salidas y stock"}
                    clampDescription
                    // Dentro de cada almacén hay stock, solicitudes de entrada
                    // y vales de salida.
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
