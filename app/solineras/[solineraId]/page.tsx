"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { RouteGuard } from "@/components/auth/route-guard"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { Button } from "@/components/shared/atom/button"
import { Toaster } from "@/components/shared/molecule/toaster"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shared/molecule/tabs"
import { PanelEnVivo } from "@/components/feats/solineras/panel-en-vivo"
import { ReservasTab } from "@/components/feats/solineras/reservas-tab"
import { ClientesTab } from "@/components/feats/solineras/clientes-tab"
import { TarifasTab } from "@/components/feats/solineras/tarifas-tab"
import { TurnosTab } from "@/components/feats/solineras/turnos-tab"
import { PagosTab } from "@/components/feats/solineras/pagos-tab"
import { ConfiguracionTab } from "@/components/feats/solineras/configuracion-tab"
import { useSolinera } from "@/hooks/use-solineras"
import { etiquetaEstadoSolinera } from "@/lib/utils/solineras"
import type { EstadoSolinera } from "@/lib/types/feats/solineras/solinera-types"

const PESTANAS = [
  { valor: "panel", etiqueta: "En vivo" },
  { valor: "reservas", etiqueta: "Reservas" },
  { valor: "clientes", etiqueta: "Clientes" },
  { valor: "tarifas", etiqueta: "Tarifas" },
  { valor: "turnos", etiqueta: "Turnos" },
  { valor: "pagos", etiqueta: "Pagos" },
  { valor: "configuracion", etiqueta: "Configuración" },
] as const

type Pestana = (typeof PESTANAS)[number]["valor"]

const COLOR_ESTADO: Record<EstadoSolinera, string> = {
  operativa: "bg-emerald-100 text-emerald-800",
  en_obra: "bg-amber-100 text-amber-800",
  pausada: "bg-slate-200 text-slate-700",
  cerrada: "bg-red-100 text-red-800",
}

export default function SolineraPage() {
  return (
    <RouteGuard requiredModule="solineras">
      <Suspense fallback={<PageLoader moduleName="Solineras" text="Cargando solinera..." />}>
        <SolineraContenido />
      </Suspense>
    </RouteGuard>
  )
}

function SolineraContenido() {
  const { solineraId } = useParams<{ solineraId: string }>()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: solinera, loading, error, recargar } = useSolinera(solineraId)

  const pedida = searchParams.get("tab")
  const pestana: Pestana = PESTANAS.some((p) => p.valor === pedida) ? (pedida as Pestana) : "panel"

  // La pestaña va en la URL: se puede compartir el enlace y el botón atrás funciona.
  const cambiarPestana = (valor: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (valor === "panel") params.delete("tab")
    else params.set("tab", valor)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  if (loading) return <PageLoader moduleName="Solineras" text="Cargando solinera..." />

  if (error || !solinera) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee] p-4">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
          <h1 className="mt-3 text-lg font-semibold">No se pudo abrir la solinera</h1>
          <p className="mt-1 text-sm text-muted-foreground">{error ?? "No existe o no tienes acceso."}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/solineras">Volver a Solineras</Link>
            </Button>
            <Button onClick={() => void recargar()}>Reintentar</Button>
          </div>
        </div>
      </div>
    )
  }

  const lugar = [solinera.municipio, solinera.provincia_nombre].filter(Boolean).join(", ")
  const propiedades = { solinera, recargarSolinera: recargar }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title={solinera.nombre}
        subtitle={[solinera.codigo, lugar].filter(Boolean).join(" · ")}
        badge={{
          text: etiquetaEstadoSolinera(solinera.estado),
          className: COLOR_ESTADO[solinera.estado],
        }}
        className="bg-white shadow-sm border-b border-lime-100"
      />

      <main className="content-with-fixed-header mx-auto max-w-[96rem] px-4 pb-10 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        <Tabs value={pestana} onValueChange={cambiarPestana}>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <TabsList className="h-11 w-max">
              {PESTANAS.map((p) => (
                <TabsTrigger key={p.valor} value={p.valor} className="px-4">
                  {p.etiqueta}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Solo la pestaña activa está montada: el panel en vivo se refresca cada
              15 s y no tiene sentido que siga pidiendo datos mientras se mira otra. */}
          <TabsContent value="panel" className="mt-4">
            <PanelEnVivo {...propiedades} />
          </TabsContent>
          <TabsContent value="reservas" className="mt-4">
            <ReservasTab {...propiedades} />
          </TabsContent>
          <TabsContent value="clientes" className="mt-4">
            <ClientesTab {...propiedades} />
          </TabsContent>
          <TabsContent value="tarifas" className="mt-4">
            <TarifasTab {...propiedades} />
          </TabsContent>
          <TabsContent value="turnos" className="mt-4">
            <TurnosTab {...propiedades} />
          </TabsContent>
          <TabsContent value="pagos" className="mt-4">
            <PagosTab {...propiedades} />
          </TabsContent>
          <TabsContent value="configuracion" className="mt-4">
            <ConfiguracionTab {...propiedades} />
          </TabsContent>
        </Tabs>
      </main>
      <Toaster />
    </div>
  )
}
