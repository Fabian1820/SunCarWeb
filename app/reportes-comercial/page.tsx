"use client"

import { ModuleCard } from "@/components/shared/molecule/module-card"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { BarChart3, Clock, PackageCheck, PackageSearch, TrendingUp } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { RouteGuard } from "@/components/auth/route-guard"

function ReportesComercialPageContent() {
  const { hasPermission } = useAuth()

  const opciones = [
    {
      id: 'pendientes-instalacion',
      title: 'Pendientes de Instalación',
      description: 'No iniciadas y en proceso de leads y clientes',
      icon: Clock,
      iconClass: 'text-emerald-600',
      href: '/reportes-comercial/pendientes-instalacion',
      hidden: !hasPermission('reportes-comercial/pendientes-instalacion')
    },
    {
      id: 'resultados-comercial',
      title: 'Resultados por Comercial',
      description: 'Ofertas cerradas con pagos y márgenes por comercial',
      icon: TrendingUp,
      iconClass: 'text-emerald-600',
      href: '/reportes-comercial/resultados-comercial',
      hidden: !hasPermission('reportes-comercial/resultados-comercial')
    },
    {
      id: 'estado-equipos',
      title: 'Estado de Equipos',
      description: 'Equipos vendidos, entregados y en servicio',
      icon: BarChart3,
      iconClass: 'text-emerald-600',
      href: '/reportes-comercial/estado-equipos',
      hidden: !hasPermission('reportes-comercial/estado-equipos')
    },
    {
      id: 'materiales-ofertas',
      title: 'Materiales en Ofertas',
      description: 'En qué ofertas está un material, a qué precio y con qué cliente',
      icon: PackageSearch,
      iconClass: 'text-emerald-600',
      href: '/reportes-comercial/materiales-ofertas',
      hidden: !hasPermission('reportes-comercial/materiales-ofertas')
    },
    {
      // El mismo módulo de Operaciones: lo que salió del almacén cada día y lo que volvió.
      id: 'entregas-devoluciones',
      title: 'Entregas y devoluciones',
      description: 'Lo que sale del almacén cada día, a quién y qué se devolvió',
      icon: PackageCheck,
      iconClass: 'text-emerald-600',
      href: '/entregas-devoluciones',
      hidden: !hasPermission('reportes-comercial/entregas-devoluciones')
    }
  ]

  // Una tarjeta = un sub-permiso `reportes-comercial/<id>`; el módulo completo
  // las concede todas.
  const opcionesVisibles = opciones.filter(opcion => !opcion.hidden)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Reportes de Comercial"
        subtitle="Reportes y análisis del área comercial"
        badge={{ text: "Comercial Instaladora", className: "bg-emerald-100 text-emerald-800" }}
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {opcionesVisibles.map((opcion) => (
            <ModuleCard
              key={opcion.id}
              href={opcion.href}
              icon={opcion.icon}
              iconClass={opcion.iconClass}
              title={opcion.title}
              description={opcion.description}
            />
          ))}
        </div>
      </main>
    </div>
  )
}

export default function ReportesComercialPage() {
  return (
    <RouteGuard requiredModule="reportes-comercial">
      <ReportesComercialPageContent />
    </RouteGuard>
  )
}
