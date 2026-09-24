"use client"

import { FacturasSection } from "@/components/feats/facturas/facturas-section"
import { RouteGuard } from "@/components/auth/route-guard"

export default function ValesFacturasInstaladoraPage() {
    return (
        <RouteGuard requiredModule="facturas/vales-facturas-instaladora">
            <FacturasSection />
        </RouteGuard>
    )
}
