"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ModuleCard } from "@/components/shared/molecule/module-card"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { InventarioService } from "@/lib/api-services"
import type { Almacen } from "@/lib/inventario-types"
import { BarChart3, FileOutput, PackagePlus } from "lucide-react"

export default function AlmacenHubPage() {
  const params = useParams()
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
      href: `/almacenes/${almacenId}`,
    },
    {
      id: "solicitudes-entrada",
      title: "Solicitudes de Entrada",
      description: "Aprobar o rechazar recepciones de mercancía",
      icon: PackagePlus,
      href: `/almacenes-suncar/${almacenId}/solicitudes-entrada`,
    },
    {
      id: "vales-salida",
      title: "Vales de Salida",
      description: "Gestionar vales de salida de materiales",
      icon: FileOutput,
      href: `/almacenes-suncar/${almacenId}/vales-salida`,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title={almacen?.nombre || "Almacén"}
        subtitle={almacen?.direccion || "Gestión de stock y vales de salida"}
        badge={{ text: "Gestión de Almacenes", className: "bg-sky-100 text-sky-800" }}
        className="bg-white shadow-sm border-b border-sky-100"
        backButton={{ href: "/almacenes-suncar", label: "Volver a Almacenes" }}
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {opciones.map((opcion) => (
            <ModuleCard
              key={opcion.id}
              href={opcion.href}
              icon={opcion.icon}
              iconClass="text-sky-700"
              title={opcion.title}
              description={opcion.description}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
