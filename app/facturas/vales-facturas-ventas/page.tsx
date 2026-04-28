"use client"

import { FacturasVentasSection } from "@/components/feats/facturas/facturas-ventas-section"
import { FacturasSubmoduleGuard } from "@/components/auth/facturas-submodule-guard"

export default function ValesFacturasVentasPage() {
    return (
        <FacturasSubmoduleGuard>
            <FacturasVentasSection />
        </FacturasSubmoduleGuard>
    )
}
