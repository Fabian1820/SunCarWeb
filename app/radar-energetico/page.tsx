"use client"

import dynamic from "next/dynamic"
import { RouteGuard } from "@/components/auth/route-guard"
import Link from "next/link"
import { ArrowLeft, Shield, Satellite, Radio, Eye, Lock } from "lucide-react"

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
        <span className="text-sm font-mono tracking-[0.2em] text-cyan-300/70 uppercase">Inicializando sistema...</span>
        <div className="flex items-center gap-3 text-[9px] font-mono text-cyan-400/30 tracking-widest uppercase">
          <span>Verificando acceso</span>
          <span className="animate-pulse">...</span>
          <span>Cargando capas GIS</span>
        </div>
      </div>
    ),
  },
)

export default function RadarEnergeticoPage() {
  return (
    <RouteGuard requiredModule="estadisticas">
      <div className="min-h-screen bg-[#010810] text-cyan-100 overflow-hidden relative">
        {/* Ambient background */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(6,182,212,0.05),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(14,116,144,0.04),transparent_50%)]" />
          {/* Grid pattern like military screens */}
          <div className="absolute inset-0 opacity-[0.015] bg-[repeating-linear-gradient(0deg,rgba(56,189,248,1)_0px,transparent_1px,transparent_40px),repeating-linear-gradient(90deg,rgba(56,189,248,1)_0px,transparent_1px,transparent_40px)]" />
          {/* Horizontal scan lines */}
          <div className="absolute inset-0 opacity-[0.025] bg-[repeating-linear-gradient(0deg,rgba(56,189,248,0.5)_0px,transparent_1px,transparent_3px)]" />
        </div>

        {/* Top bar */}
        <header className="relative z-50 border-b border-cyan-400/15 bg-[#010810]/95 backdrop-blur-xl">
          <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-2 text-cyan-300/60 hover:text-cyan-100 transition-colors group">
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                  <span className="text-[10px] font-mono tracking-[0.2em] uppercase hidden sm:inline">Base</span>
                </Link>
                <div className="h-5 w-px bg-cyan-400/15" />
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Shield className="h-5 w-5 text-cyan-400/80" />
                    <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xs font-bold tracking-[0.15em] text-cyan-50 font-mono uppercase">Radar Energético</h1>
                      <Lock className="h-3 w-3 text-amber-400/50" />
                    </div>
                    <p className="text-[9px] font-mono tracking-[0.2em] text-cyan-400/40 uppercase">Centro de Inteligencia Energética</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded border border-cyan-400/10 bg-cyan-400/[0.03]">
                  <Eye className="h-3 w-3 text-cyan-400/50" />
                  <span className="text-[9px] font-mono tracking-[0.15em] text-cyan-300/40 uppercase">RECON</span>
                  <div className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded border border-cyan-400/10 bg-cyan-400/[0.03]">
                  <Satellite className="h-3 w-3 text-cyan-400/50" />
                  <span className="text-[9px] font-mono tracking-[0.15em] text-cyan-300/40 uppercase">SAT-7</span>
                  <div className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded border border-cyan-400/10 bg-cyan-400/[0.03]">
                  <Radio className="h-3 w-3 text-cyan-400/50" />
                  <span className="text-[9px] font-mono tracking-[0.15em] text-cyan-300/40 uppercase">SIGINT</span>
                </div>
                <div className="px-2.5 py-1 rounded border border-red-500/25 bg-red-500/[0.06]">
                  <span className="text-[9px] font-mono tracking-[0.2em] text-red-400/80 uppercase font-bold">Top Secret</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-[1920px] mx-auto px-3 sm:px-5 lg:px-6 py-3">
          <FuturisticRadarHeatmap />
        </main>
      </div>
    </RouteGuard>
  )
}
