"use client"

import dynamic from "next/dynamic"
import { RouteGuard } from "@/components/auth/route-guard"
import { Loader2 } from "lucide-react"

const ResultadosView = dynamic(
  () => import("@/components/feats/resultados/resultados-view"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-amber-600 animate-spin" />
          <p className="text-amber-800 font-medium">Cargando resultados...</p>
        </div>
      </div>
    ),
  }
)

export default function ResultadosPage() {
  return (
    <RouteGuard requiredModule="resultados">
      <ResultadosView />
    </RouteGuard>
  )
}
