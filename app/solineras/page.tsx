"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, ChevronRight, MapPin, Plus, PlugZap, RefreshCw } from "lucide-react"
import { RouteGuard } from "@/components/auth/route-guard"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { Button } from "@/components/shared/atom/button"
import { Toaster } from "@/components/shared/molecule/toaster"
import { CrearSolineraDialog } from "@/components/feats/solineras/crear-solinera-dialog"
import { usePermisosSolineras, useSolineras } from "@/hooks/use-solineras"
import { etiquetaEstadoSolinera } from "@/lib/utils/solineras"
import { cn } from "@/lib/utils"
import type { EstadoSolinera, Solinera } from "@/lib/types/feats/solineras/solinera-types"

const COLOR_ESTADO: Record<EstadoSolinera, string> = {
  operativa: "bg-emerald-100 text-emerald-800",
  en_obra: "bg-amber-100 text-amber-800",
  pausada: "bg-slate-200 text-slate-700",
  cerrada: "bg-red-100 text-red-800",
}

export default function SolinerasPage() {
  return (
    <RouteGuard requiredModule="solineras">
      <SolinerasContenido />
    </RouteGuard>
  )
}

function SolinerasContenido() {
  const router = useRouter()
  const { data: solineras, loading, error, recargar, refrescando } = useSolineras()
  const { puedeAdministrarRed } = usePermisosSolineras()
  const [creando, setCreando] = useState(false)

  if (loading) return <PageLoader moduleName="Solineras" text="Cargando solineras..." />

  const lista = solineras ?? []
  const botonNueva = puedeAdministrarRed ? (
    <Button onClick={() => setCreando(true)} className="touch-manipulation">
      <Plus className="mr-2 h-4 w-4" />
      Nueva solinera
    </Button>
  ) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Solineras"
        subtitle="Estaciones de carga solar para motos, triciclos y autos"
        badge={{ text: "Solineras", className: "bg-lime-100 text-lime-800" }}
        className="bg-white shadow-sm border-b border-lime-100"
        actions={botonNueva}
      />

      <main className="content-with-fixed-header mx-auto max-w-[96rem] px-4 pb-8 pt-4 sm:px-6 sm:pt-8 lg:px-8">
        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">No se pudieron cargar las solineras</p>
              <p className="text-red-700">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void recargar()}>
              Reintentar
            </Button>
          </div>
        )}

        {lista.length === 0 && !error ? (
          <div className="mx-auto mt-10 max-w-md rounded-xl border border-dashed border-lime-300 bg-white p-8 text-center">
            <PlugZap className="mx-auto h-8 w-8 text-lime-700" />
            <h2 className="mt-3 text-lg font-semibold text-foreground">Aún no hay solineras</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {puedeAdministrarRed
                ? "Crea la primera con sus puestos de carga. Después podrás fijar las tarifas, abrir un turno y empezar a cargar."
                : "Cuando alguien con permiso de red cree una, aparecerá aquí."}
            </p>
            {botonNueva && <div className="mt-5 flex justify-center">{botonNueva}</div>}
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {lista.length} {lista.length === 1 ? "solinera" : "solineras"}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void recargar()}
                disabled={refrescando}
                className="text-muted-foreground"
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", refrescando && "animate-spin")} />
                Actualizar
              </Button>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {lista.map((solinera) => (
                <li key={solinera.id}>
                  <TarjetaSolinera solinera={solinera} />
                </li>
              ))}
            </ul>
          </>
        )}
      </main>

      <CrearSolineraDialog
        open={creando}
        onOpenChange={setCreando}
        onCreada={(nueva) => router.push(`/solineras/${nueva.id}`)}
      />
      <Toaster />
    </div>
  )
}

function TarjetaSolinera({ solinera }: { solinera: Solinera }) {
  const total = solinera.puestos_total ?? 0
  const operativos = solinera.puestos_operativos ?? 0
  const enPuesto = solinera.vehiculos_en_puesto ?? 0
  const lugar = [solinera.municipio, solinera.provincia_nombre].filter(Boolean).join(", ")

  return (
    <Link
      href={`/solineras/${solinera.id}`}
      className="group block rounded-xl border border-border bg-white p-5 shadow-sm transition-colors hover:border-lime-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-foreground">{solinera.nombre}</h2>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{solinera.codigo}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            COLOR_ESTADO[solinera.estado],
          )}
        >
          {etiquetaEstadoSolinera(solinera.estado)}
        </span>
      </div>

      {lugar && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{lugar}</span>
        </p>
      )}

      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Puestos</dt>
          <dd className="font-semibold tabular-nums">
            {operativos}
            <span className="font-normal text-muted-foreground"> / {total}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">En puesto</dt>
          <dd className="font-semibold tabular-nums">{enPuesto}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Turno</dt>
          <dd className={cn("font-semibold", solinera.turno_abierto ? "text-emerald-700" : "text-muted-foreground")}>
            {solinera.turno_abierto ? "Abierto" : "Cerrado"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-end text-sm font-medium text-primary">
        Abrir
        <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}
