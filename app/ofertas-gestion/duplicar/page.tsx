"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, Copy } from "lucide-react"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { ConfeccionOfertasView } from "@/components/feats/ofertas/confeccion-ofertas-view"
import { Button } from "@/components/shared/atom/button"
import { Loader } from "@/components/shared/atom/loader"
import { useOfertasConfeccion } from "@/hooks/use-ofertas-confeccion"
import type { OfertaConfeccion } from "@/hooks/use-ofertas-confeccion"

export default function DuplicarOfertaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ofertaId = searchParams.get('id')
  const { ofertas, loading } = useOfertasConfeccion()
  const [ofertaParaDuplicar, setOfertaParaDuplicar] = useState<OfertaConfeccion | null>(null)

  useEffect(() => {
    if (!ofertaId) {
      router.push('/ofertas-gestion/ver-ofertas-confeccionadas')
      return
    }

    if (!loading && ofertas.length > 0) {
      const oferta = ofertas.find(o => o.id === ofertaId)
      if (oferta) {
        setOfertaParaDuplicar(oferta)
      } else {
        router.push('/ofertas-gestion/ver-ofertas-confeccionadas')
      }
    }
  }, [ofertaId, ofertas, loading, router])

  const handleGuardarExito = () => {
    router.push('/ofertas-gestion/ver-ofertas-confeccionadas?refresh=true')
  }

  const handleVolver = () => {
    router.push('/ofertas-gestion/ver-ofertas-confeccionadas')
  }

  if (loading || !ofertaParaDuplicar) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <Loader label="Cargando oferta..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Duplicar Oferta"
        subtitle={`Creando nueva oferta basada en: ${ofertaParaDuplicar.nombre}`}
        badge={{ text: "Ventas", className: "bg-amber-100 text-amber-800" }}
        icon={<Copy className="h-6 w-6" />}
        actions={
          <Button
            onClick={handleVolver}
            variant="outline"
            className="bg-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        }
      />

      <main className="content-with-fixed-header">
        <ConfeccionOfertasView 
          modoEdicion={false}
          ofertaParaDuplicar={ofertaParaDuplicar}
          onGuardarExito={handleGuardarExito}
        />
      </main>
    </div>
  )
}
