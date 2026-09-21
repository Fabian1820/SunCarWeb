"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Coins, Landmark, Lock, LockOpen, RefreshCw, Search, UserPlus } from "lucide-react"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shared/molecule/tabs"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useAuth } from "@/contexts/auth-context"
import { useNomina } from "@/hooks/use-nomina"
import { formatoMonto } from "@/components/feats/nomina/celdas"
import { NominaOficial } from "@/components/feats/nomina/nomina-oficial"
import { NominaComplementario } from "@/components/feats/nomina/nomina-complementario"
import { filtrarDepartamentos } from "@/components/feats/nomina/filtro"

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
  const [vista, setVista] = useState("oficial")
  const [busqueda, setBusqueda] = useState("")
  const [soloSeleccionados, setSoloSeleccionados] = useState(false)
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

  const departamentosOficial = hoja ? filtrarDepartamentos(hoja.departamentos, busqueda) : []
  const departamentosComplementario = hoja
    ? filtrarDepartamentos(hoja.departamentos, busqueda, soloSeleccionados)
    : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Nómina Mensual"
        subtitle="Salario oficial y salario complementario, mes a mes"
        badge={{ text: "Solo superAdmin", className: "bg-red-100 text-red-700" }}
        actions={
          <Button variant="outline" onClick={n.recargar} disabled={n.loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${n.loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        }
      />

      <main className="content-with-fixed-header mx-auto max-w-[90rem] space-y-6 px-4 pb-10 sm:px-6 lg:px-8">
        {/* Mes y cierre */}
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

              <div className="ml-auto flex items-center gap-2">
                {n.guardando && <span className="text-xs text-gray-500">Guardando…</span>}
                {!cerrada && (
                  <Button
                    variant="outline"
                    onClick={n.abrir}
                    disabled={n.guardando}
                    title="Añade a quien haya entrado y pone al día salario, cargo y departamento desde la ficha"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Sincronizar trabajadores
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
                Al abrirla se añaden todos los trabajadores activos con su salario básico. Del mes
                anterior se copia quién participa en el salario complementario y su porcentaje. Las
                horas empiezan en cero.
              </p>
              <Button onClick={n.abrir} disabled={n.guardando}>
                Abrir {MESES[mes - 1]} {anio}
              </Button>
            </CardContent>
          </Card>
        )}

        {hoja && (
          <Tabs value={vista} onValueChange={setVista} className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <TabsList>
                <TabsTrigger value="oficial">
                  <Landmark className="mr-2 h-4 w-4" />
                  Salario Oficial
                </TabsTrigger>
                <TabsTrigger value="complementario">
                  <Coins className="mr-2 h-4 w-4" />
                  Salario Complementario
                </TabsTrigger>
              </TabsList>

              <label className="relative ml-auto w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar trabajador, cargo o departamento"
                  aria-label="Buscar"
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm focus:border-[#012928] focus:outline-none focus:ring-1 focus:ring-[#012928]"
                />
              </label>
            </div>

            <TabsContent value="oficial" className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:max-w-xl">
                <Resumen
                  titulo="Horas del mes"
                  valor={hoja.totales.horas.toLocaleString("es", { maximumFractionDigits: 2 })}
                />
                <Resumen titulo="Total a cobrar" valor={`${formatoMonto(hoja.totales.a_cobrar_cup)} CUP`} />
              </div>
              <NominaOficial
                departamentos={departamentosOficial}
                horasBase={hoja.horas_base_mes}
                bloqueado={cerrada}
                onEditarLinea={n.editarLinea}
              />
            </TabsContent>

            <TabsContent value="complementario" className="space-y-4">
              <label className="flex w-fit items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={soloSeleccionados}
                  onChange={(e) => setSoloSeleccionados(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Ver solo los seleccionados
              </label>
              <NominaComplementario
                hoja={hoja}
                departamentos={departamentosComplementario}
                bloqueado={cerrada}
                onEditarLinea={n.editarLinea}
                onFijarTotal={n.fijarTotal}
              />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  )
}

function Resumen({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{titulo}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-[#012928]">{valor}</p>
    </div>
  )
}
