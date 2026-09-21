"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Lock, LockOpen, RefreshCw, UserPlus } from "lucide-react"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useAuth } from "@/contexts/auth-context"
import { useNomina } from "@/hooks/use-nomina"
import { NominaDepartamento } from "@/components/feats/nomina/nomina-departamento"
import { CeldaNumero, formatoMonto } from "@/components/feats/nomina/celdas"

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

export default function NominaPage() {
  return (
    <SoloSuperAdmin>
      <NominaContenido />
    </SoloSuperAdmin>
  )
}

/**
 * La nómina incluye la parte complementaria, que solo debe ver el superAdmin
 * (igual que en el backend). No se usa RouteGuard: ese da acceso a cualquiera
 * que tenga el permiso asignado.
 */
function SoloSuperAdmin({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (isLoading) return <PageLoader />
  if (!isAuthenticated) return null

  if (!user?.is_superAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">Acceso Denegado</h1>
          <p className="mb-6 text-gray-600">La nómina es solo para super administradores.</p>
          <Link href="/">
            <Button>Volver al Inicio</Button>
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

function NominaContenido() {
  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const n = useNomina(anio, mes)
  const { hoja } = n
  const cerrada = hoja?.estado === "cerrada"

  const moverMes = (delta: number) => {
    const total = anio * 12 + (mes - 1) + delta
    setAnio(Math.floor(total / 12))
    setMes((total % 12) + 1)
  }

  const cerrarMes = async () => {
    if (window.confirm(`¿Cerrar la nómina de ${MESES[mes - 1]} ${anio}? Después no se podrá editar hasta reabrirla.`)) {
      await n.cerrar()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Nómina Mensual"
        subtitle="Lo oficial y lo complementario de cada trabajador, mes a mes"
        badge={{ text: "Solo superAdmin", className: "bg-red-100 text-red-700" }}
        actions={
          <Button variant="outline" onClick={n.recargar} disabled={n.loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${n.loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        }
      />

      <main className="content-with-fixed-header mx-auto max-w-[110rem] space-y-6 px-4 pb-10 sm:px-6 lg:px-8">
        {/* Mes, tasa y cierre */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1">
            <Button variant="ghost" size="icon" onClick={() => moverMes(-1)} aria-label="Mes anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[9.5rem] text-center text-sm font-semibold text-[#012928]">
              {MESES[mes - 1]} {anio}
            </span>
            <Button variant="ghost" size="icon" onClick={() => moverMes(1)} aria-label="Mes siguiente">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {hoja && (
            <>
              <Badge className={cerrada ? "bg-gray-200 text-gray-700" : "bg-emerald-100 text-emerald-800"}>
                {cerrada ? "Cerrada" : "Abierta"}
              </Badge>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                Tasa
                <span className="flex items-center rounded-lg border border-gray-300 bg-white pl-2">
                  <span className="text-xs text-gray-500">CUP por USD</span>
                  <CeldaNumero
                    ariaLabel="Tasa de cambio CUP por USD"
                    value={hoja.tasa_cambio ?? 0}
                    disabled={cerrada}
                    onCommit={(v) => n.cambiarTasa(v > 0 ? v : null)}
                    className="w-24 border-0"
                  />
                </span>
              </label>

              <div className="ml-auto flex items-center gap-2">
                {n.guardando && <span className="text-xs text-gray-500">Guardando…</span>}
                {!cerrada && (
                  <Button variant="outline" onClick={n.abrir} disabled={n.guardando}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Añadir trabajadores nuevos
                  </Button>
                )}
                {cerrada ? (
                  <Button variant="outline" onClick={n.reabrir} disabled={n.guardando}>
                    <LockOpen className="mr-2 h-4 w-4" />
                    Reabrir mes
                  </Button>
                ) : (
                  <Button onClick={cerrarMes} disabled={n.guardando}>
                    <Lock className="mr-2 h-4 w-4" />
                    Cerrar mes
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        {n.error && (
          <Card className="border-rose-200 bg-rose-50">
            <CardContent className="p-4 text-sm text-rose-800">{n.error}</CardContent>
          </Card>
        )}

        {n.loading && !hoja && <PageLoader />}

        {/* Mes sin abrir */}
        {!n.loading && !hoja && !n.error && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <p className="text-gray-700">
                La nómina de {MESES[mes - 1]} {anio} todavía no está abierta.
              </p>
              <p className="max-w-md text-sm text-gray-500">
                Al abrirla se añaden todos los trabajadores activos y se copian del mes anterior la
                tarifa, el porcentaje, la forma de cobro y la tarjeta. Las horas y las retenciones
                empiezan en cero.
              </p>
              <Button onClick={n.abrir} disabled={n.guardando}>
                Abrir {MESES[mes - 1]} {anio}
              </Button>
            </CardContent>
          </Card>
        )}

        {hoja && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Resumen titulo="Horas del mes" valor={hoja.totales.horas.toLocaleString("es", { maximumFractionDigits: 2 })} />
              <Resumen titulo="Bruto oficial" valor={`${formatoMonto(hoja.totales.bruto_cup)} CUP`} />
              <Resumen titulo="Neto oficial" valor={`${formatoMonto(hoja.totales.neto_cup)} CUP`} />
              <Resumen titulo="Complementario" valor={`${formatoMonto(hoja.totales.complementario_usd)} USD`} />
              <Resumen
                titulo="Total real"
                valor={hoja.totales.total_real_cup === null ? "—" : `${formatoMonto(hoja.totales.total_real_cup)} CUP`}
                nota={hoja.totales.total_real_cup === null ? "Pon la tasa para verlo" : "Neto + complementario a la tasa"}
              />
            </div>

            <div className="space-y-6">
              {hoja.departamentos.map((d) => (
                <NominaDepartamento
                  key={d.departamento_id}
                  departamento={d}
                  bloqueado={cerrada}
                  onEditarLinea={n.editarLinea}
                  onFijarFondo={n.fijarFondo}
                />
              ))}
              {hoja.departamentos.length === 0 && (
                <p className="text-sm text-gray-500">No hay trabajadores activos.</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Resumen({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{titulo}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-[#012928]">{valor}</p>
      {nota && <p className="text-xs text-gray-400">{nota}</p>}
    </div>
  )
}
