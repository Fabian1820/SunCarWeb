"use client"

import dynamic from "next/dynamic"
import { RouteGuard } from "@/components/auth/route-guard"
import Link from "next/link"
import { ArrowLeft, Shield, Satellite, Radio } from "lucide-react"

const FuturisticRadarHeatmap = dynamic(
  () => import("@/components/feats/radar-energetico/futuristic-radar-heatmap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[calc(100vh-120px)] rounded-2xl border border-cyan-400/20 bg-[#020a18] flex flex-col items-center justify-center text-cyan-100 gap-4">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping" />
          <div className="absolute inset-2 rounded-full border border-cyan-400/60 animate-spin" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-4 rounded-full bg-cyan-400/20 animate-pulse" />
        </div>
        <span className="text-sm font-mono tracking-[0.2em] text-cyan-300/70 uppercase">Inicializando radar...</span>
      </div>
    ),
  },
)

export default function RadarEnergeticoPage() {
  return (
    <RouteGuard requiredModule="estadisticas">
      <div className="min-h-screen bg-[#010810] text-cyan-100 overflow-hidden relative">
        {/* Ambient background effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(6,182,212,0.06),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(14,116,144,0.05),transparent_50%)]" />
          <div className="absolute inset-0 opacity-[0.03] bg-[repeating-linear-gradient(0deg,rgba(56,189,248,0.5)_0px,transparent_1px,transparent_3px)]" />
        </div>

        {/* Top bar */}
        <header className="relative z-50 border-b border-cyan-400/15 bg-[#010810]/90 backdrop-blur-xl">
          <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-2 text-cyan-300/70 hover:text-cyan-100 transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-xs font-mono tracking-wider uppercase hidden sm:inline">Dashboard</span>
                </Link>
                <div className="h-6 w-px bg-cyan-400/20" />
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Shield className="h-5 w-5 text-cyan-400" />
                    <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-sm font-bold tracking-wide text-cyan-50 font-mono uppercase">Radar Energético</h1>
                    <p className="text-[10px] font-mono tracking-[0.15em] text-cyan-400/60 uppercase">Mapa táctico de potencia instalada</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-400/15 bg-cyan-400/5">
                  <Satellite className="h-3.5 w-3.5 text-cyan-400/70" />
                  <span className="text-[10px] font-mono tracking-wider text-cyan-300/60 uppercase">SAT-LINK</span>
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-400/15 bg-cyan-400/5">
                  <Radio className="h-3.5 w-3.5 text-cyan-400/70" />
                  <span className="text-[10px] font-mono tracking-wider text-cyan-300/60 uppercase">SIGINT</span>
                </div>
                <div className="px-3 py-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10">
                  <span className="text-[10px] font-mono tracking-wider text-amber-300 uppercase font-bold">Clasificado</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <FuturisticRadarHeatmap />
        </main>
      </div>
    </RouteGuard>
  )
}
