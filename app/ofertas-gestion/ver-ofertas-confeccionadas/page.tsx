"use client"

import { ModuleHeader } from "@/components/shared/organism/module-header"
import { OfertasConfeccionadasView } from "@/components/feats/ofertas/ofertas-confeccionadas-view"

export default function VerOfertasConfeccionadasPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Ver Ofertas Confeccionadas"
        subtitle="Consulta las ofertas confeccionadas en formato de cards."
        badge={{ text: "Ventas", className: "bg-amber-100 text-amber-800" }}
        backHref="/ofertas-gestion"
        backLabel="Volver a Gestión de Ofertas"
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <OfertasConfeccionadasView />
      </main>
    </div>
  )
}
