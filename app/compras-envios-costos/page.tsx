"use client"

import Link from "next/link"
import { useState } from "react"
import { Calculator, FileSpreadsheet, Ship } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { CalcPorcentajeDialog } from "@/components/feats/fichas-costo/calc-porcentaje-dialog"
import { FichaCostoService } from "@/lib/api-services"
import { useAuth } from "@/contexts/auth-context"
import type { MaterialFichaResumen } from "@/lib/types/feats/fichas-costo/ficha-costo-types"

interface SubModule {
  id: string
  href: string
  title: string
  description: string
  icon: typeof Ship
  iconClass: string
  borderClass: string
}

const SUB_MODULES: SubModule[] = [
  {
    id: "envio-contenedores",
    href: "/envio-contenedores",
    title: "Envío de Contenedores",
    description: "Registrar y monitorear envíos de contenedores.",
    icon: Ship,
    iconClass: "text-cyan-700",
    borderClass: "border-l-cyan-600",
  },
  {
    id: "fichas-costo",
    href: "/fichas-costo",
    title: "Fichas de Costo",
    description: "Gestión de fichas de costo de materiales.",
    icon: FileSpreadsheet,
    iconClass: "text-teal-600",
    borderClass: "border-l-teal-600",
  },
]

export default function ComprasEnviosCostosPage() {
  const { hasPermission, user } = useAuth()
  const [isCalcOpen, setIsCalcOpen] = useState(false)
  const [materiales, setMateriales] = useState<MaterialFichaResumen[]>([])
  const [loadingCalc, setLoadingCalc] = useState(false)

  const handleOpenCalc = async () => {
    if (materiales.length === 0) {
      setLoadingCalc(true)
      try {
        const data = await FichaCostoService.getTodosMaterialesConFichas()
        setMateriales(Array.isArray(data) ? data : [])
      } catch {
        setMateriales([])
      } finally {
        setLoadingCalc(false)
      }
    }
    setIsCalcOpen(true)
  }

  const visibleSubModules = SUB_MODULES.filter(
    (m) => user?.is_superAdmin === true || hasPermission(m.id),
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Compras, Envíos y Costos"
        subtitle="Envíos de contenedores y fichas de costo en un solo lugar"
        badge={{ text: "Economía", className: "bg-teal-100 text-teal-800" }}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenCalc}
            disabled={loadingCalc}
            className="border-teal-200 text-teal-700 hover:bg-teal-50"
          >
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">
              {loadingCalc ? "Cargando..." : "Calculadora %"}
            </span>
          </Button>
        }
      />

      <main className="content-with-fixed-header max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {visibleSubModules.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500 text-sm">
              No tienes permisos para acceder a los submódulos de esta sección.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleSubModules.map((mod) => {
              const Icon = mod.icon
              return (
                <Link key={mod.id} href={mod.href} className="block group">
                  <Card
                    className={`border-l-4 ${mod.borderClass} hover:shadow-md transition-shadow h-full`}
                  >
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="rounded-lg bg-white border border-gray-200 p-3 flex-shrink-0 group-hover:scale-105 transition-transform">
                        <Icon className={`h-6 w-6 ${mod.iconClass}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {mod.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {mod.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <CalcPorcentajeDialog
        open={isCalcOpen}
        onOpenChange={setIsCalcOpen}
        materiales={materiales}
      />
    </div>
  )
}
