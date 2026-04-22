"use client"

import { FacturasSection } from "@/components/feats/facturas/facturas-section"
import { FacturasSubmoduleGuard } from "@/components/auth/facturas-submodule-guard"

export default function ValesFacturasInstaladoraPage() {
    return (
        <FacturasSubmoduleGuard>
            <FacturasSection />
        </FacturasSubmoduleGuard>
    )
}
