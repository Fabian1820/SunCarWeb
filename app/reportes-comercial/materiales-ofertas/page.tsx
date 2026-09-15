"use client"

import { ModuleHeader } from "@/components/shared/organism/module-header"
import { MaterialesOfertasReport } from "@/components/feats/reportes-comercial/materiales-ofertas-report"

export default function MaterialesOfertasPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Materiales en Ofertas"
        subtitle="En qué ofertas está cada material, a qué precio y con qué cliente"
        badge={{ text: "Reporte", className: "bg-blue-100 text-blue-800" }}
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <MaterialesOfertasReport />
      </main>
    </div>
  )
}
