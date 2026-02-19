"use client"

import dynamic from "next/dynamic"
import { RouteGuard } from "@/components/auth/route-guard"
import { ModuleHeader } from "@/components/shared/organism/module-header"

const FuturisticRadarHeatmap = dynamic(
  () => import("@/components/feats/radar-energetico/futuristic-radar-heatmap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[680px] rounded-3xl border border-cyan-400/30 bg-slate-900 flex items-center justify-center text-cyan-100">
        Cargando radar energético...
      </div>
    ),
  },
)

export default function RadarEnergeticoPage() {
  return (
    <RouteGuard requiredModule="estadisticas">
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
        <ModuleHeader
          title="Radar Energético"
          subtitle="Mapa táctico de potencia instalada por municipio"
          badge={{ text: "CIA Mode", className: "bg-slate-900 text-cyan-200" }}
          className="bg-white shadow-sm border-b border-orange-100"
        />

        <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-10">
          <FuturisticRadarHeatmap />
        </main>
      </div>
    </RouteGuard>
  )
}
