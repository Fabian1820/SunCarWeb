"use client"

import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { OfertasConfeccionadasView } from "@/components/feats/ofertas/ofertas-confeccionadas-view"
import { Button } from "@/components/shared/atom/button"

export default function VerOfertasConfeccionadasPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Ver Ofertas Confeccionadas"
        subtitle="Consulta las ofertas confeccionadas en formato de cards."
        badge={{ text: "Ventas", className: "bg-amber-100 text-amber-800" }}
        backHref="/ofertas-gestion"
        backLabel="Volver a Gestión de Ofertas"
        actions={
          <Button
            onClick={() => router.push("/ofertas-gestion/confeccion")}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear Oferta
          </Button>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <OfertasConfeccionadasView />
      </main>
    </div>
  )
}
