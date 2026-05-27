"use client"

import Link from "next/link"
import { Calculator, Ship } from "lucide-react"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { useAuth } from "@/contexts/auth-context"

interface SubModule {
  /** Permission key (cómo está guardado en BD) */
  id: string
  href: string
  title: string
  description: string
  icon: typeof Ship
  iconClass: string
}

const SUB_MODULES: SubModule[] = [
  {
    id: "envio-contenedores",
    href: "/compras",
    title: "Compras",
    description: "Registrar y monitorear compras y contenedores.",
    icon: Ship,
    iconClass: "text-cyan-700",
  },
  {
    // Kardex es el reemplazo del módulo Fichas de Costo: aquí se consulta el
    // costo promedio ponderado de los materiales por almacén tras cada entrada.
    id: "kardex-costo",
    href: "/kardex-costo",
    title: "Kardex de Costos",
    description: "Costo promedio ponderado por material y almacén con histórico de entradas.",
    icon: Calculator,
    iconClass: "text-violet-600",
  },
]

export default function ComprasEnviosCostosPage() {
  const { hasPermission, user } = useAuth()

  const visibleSubModules = SUB_MODULES.filter(
    (m) => user?.is_superAdmin === true || hasPermission(m.id),
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Compras, Envíos y Costos"
        subtitle="Compras, contenedores y kardex de costos en un solo lugar"
        badge={{ text: "Economía", className: "bg-teal-100 text-teal-800" }}
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {visibleSubModules.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500 text-sm">
              No tienes permisos para acceder a los submódulos de esta sección.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {visibleSubModules.map((mod) => {
              const Icon = mod.icon
              return (
                <Link key={mod.id} href={mod.href}>
                  <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full hover:-translate-y-2 bg-white/90 backdrop-blur-sm">
                    <CardContent className="p-4 sm:p-6 text-center flex flex-col justify-center h-full">
                      <Icon
                        className={`h-8 w-8 sm:h-10 sm:w-10 ${mod.iconClass} mx-auto mb-3`}
                      />
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        {mod.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {mod.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
