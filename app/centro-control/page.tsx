"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import { RouteGuard } from "@/components/auth/route-guard"

const CentroControlView = dynamic(
  () => import("@/components/feats/centro-control/centro-control-view"),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-amber-400 animate-spin" />
          <p className="text-amber-400 font-medium text-sm">
            Cargando Centro de Control...
          </p>
        </div>
      </div>
    ),
  }
)

export default function CentroControlPage() {
  return (
    <RouteGuard requiredModule="centro-control">
      <CentroControlView />
    </RouteGuard>
  )
}
