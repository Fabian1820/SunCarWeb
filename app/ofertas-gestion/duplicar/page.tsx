"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, Copy } from "lucide-react"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { ConfeccionOfertasView } from "@/components/feats/ofertas/confeccion-ofertas-view"
import { Button } from "@/components/shared/atom/button"
import { Loader } from "@/components/shared/atom/loader"
import { normalizeOfertaConfeccion } from "@/hooks/use-ofertas-confeccion"
import type { OfertaConfeccion } from "@/hooks/use-ofertas-confeccion"
import { apiRequest } from "@/lib/api-config"

export default function DuplicarOfertaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ofertaId = searchParams.get('id')
  const [ofertaParaDuplicar, setOfertaParaDuplicar] = useState<OfertaConfeccion | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ofertaId) {
      router.push('/ofertas-gestion/ver-ofertas-confeccionadas')
      return
    }

    const cargarOfertaCompleta = async () => {
      try {
        setLoading(true)
        const response = await apiRequest<any>(`/ofertas/confeccion/${ofertaId}`, {
          method: "GET",
          cache: "no-store",
        })
        const raw = response?.data ?? response
        if (!raw) {
          router.push('/ofertas-gestion/ver-ofertas-confeccionadas')
          return
        }
        setOfertaParaDuplicar(normalizeOfertaConfeccion(raw))
      } catch {
        router.push('/ofertas-gestion/ver-ofertas-confeccionadas')
      } finally {
        setLoading(false)
      }
    }

    cargarOfertaCompleta()
  }, [ofertaId, router])

  const handleGuardarExito = () => {
    router.push('/ofertas-gestion/ver-ofertas-confeccionadas?refresh=true')
  }

  const handleVolver = () => {
    if (ofertaId) {
      localStorage.removeItem(`oferta-duplicar-${ofertaId}`)
    }
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex flex-col">
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

      <main className="flex-1 flex flex-col min-h-0" style={{ paddingTop: "var(--fixed-header-height)" }}>
        <ConfeccionOfertasView 
          modoEdicion={false}
          ofertaParaDuplicar={ofertaParaDuplicar}
          onGuardarExito={handleGuardarExito}
        />
      </main>
    </div>
  )
}
