"use client"

import { useRouter } from "next/navigation"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { ConfeccionOfertasView } from "@/components/feats/ofertas/confeccion-ofertas-view"

export default function ConfeccionOfertasPage() {
  const router = useRouter()

  return (
    <div className="h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex flex-col overflow-hidden">
      <ModuleHeader
        title="Confección de Ofertas"
        subtitle="Arma ofertas fotovoltaicas con materiales, margen y redondeo final."
        badge={{ text: "Ventas", className: "bg-amber-100 text-amber-800" }}
        backHref="/ofertas-gestion"
        backLabel="Volver a Gestión de Ofertas"
      />

      <main
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
        style={{ paddingTop: "var(--fixed-header-height)" }}
      >
        <ConfeccionOfertasView 
          onCerrar={() => {
            router.push("/ofertas-gestion/ver-ofertas-confeccionadas?refresh=true")
          }} 
        />
      </main>
    </div>
  )
}
