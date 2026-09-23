"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { resolverDestinoVolver } from "@/lib/navegacion-modulos"
import { RouteGuard } from "@/components/auth/route-guard"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Switch } from "@/components/shared/molecule/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shared/molecule/tabs"
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Loader2,
  RefreshCw,
  Scale,
  Search,
} from "lucide-react"
import {
  FacturacionPendienteService,
  type ClientePorFacturar,
  type VistaPorFacturar,
} from "@/lib/services/feats/facturacion-pendiente/facturacion-pendiente-service"
import { DetalleClientePorFacturar } from "@/components/feats/facturacion-pendiente/detalle-cliente-por-facturar"
import { ComparativaOfertaAlmacen } from "@/components/feats/facturacion-pendiente/comparativa-oferta-almacen"
import { ESTADO_FACTURACION, formatFecha } from "@/components/feats/facturacion-pendiente/formato"
import {
  PERMISOS_POR_FACTURAR,
  PERMISO_POR_FACTURAR_COMPARATIVA,
  PERMISO_POR_FACTURAR_FACTURAR,
} from "@/lib/constants/por-facturar-permisos"

const LIMITE = 30

export default function PorFacturarPage() {
  return (
    <RouteGuard requiredModule={PERMISOS_POR_FACTURAR} exact>
      <Suspense fallback={<PageLoader />}>
        <PorFacturar />
      </Suspense>
    </RouteGuard>
  )
}

function PorFacturar() {
  const destinoVolver = resolverDestinoVolver(usePathname() ?? "/")
  const searchParams = useSearchParams()
  const { hasExactPermission } = useAuth()
  const puedeFacturar = hasExactPermission(PERMISO_POR_FACTURAR_FACTURAR)
  const puedeComparar = hasExactPermission(PERMISO_POR_FACTURAR_COMPARATIVA)

  const [pestana, setPestana] = useState<"pendientes" | "comparativa">("pendientes")
  const [clienteComparado, setClienteComparado] = useState<string | null>(null)

  const [busqueda, setBusqueda] = useState(searchParams.get("cliente") ?? "")
  const [q, setQ] = useState(busqueda)
  const [vista, setVista] = useState<Exclude<VistaPorFacturar, "todos">>("nuevos")
  const [verResueltos, setVerResueltos] = useState(false)
  const [pagina, setPagina] = useState(0)
  const [clientes, setClientes] = useState<ClientePorFacturar[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [abierto, setAbierto] = useState<string | null>(searchParams.get("cliente"))
  const abortRef = useRef<AbortController | null>(null)
  // Los avisos de la campana enlazan con ?cliente=; si ese cliente no está en
  // Nuevos (p. ej. los que esperaban decisión de Economía), está en Histórico.
  const clienteEnlace = useRef<string | null>(searchParams.get("cliente"))

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(busqueda)
      setPagina(0)
    }, 350)
    return () => clearTimeout(t)
  }, [busqueda])

  const cargar = useCallback(async () => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setCargando(true)
    setError(null)
    try {
      const r = await FacturacionPendienteService.listar(
        {
          q,
          vista,
          solo_pendientes: !verResueltos,
          skip: pagina * LIMITE,
          limit: LIMITE,
        },
        ctrl.signal,
      )
      if (ctrl.signal.aborted) return
      if (clienteEnlace.current) {
        const buscado = clienteEnlace.current
        clienteEnlace.current = null
        if (vista === "nuevos" && q === buscado && r.total === 0) {
          setVista("historico")
          return
        }
      }
      setClientes(r.data)
      setTotal(r.total)
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : "No se pudo cargar la lista")
    } finally {
      if (!ctrl.signal.aborted) setCargando(false)
    }
  }, [q, vista, verResueltos, pagina])

  useEffect(() => {
    cargar()
  }, [cargar])

  const comparar = (numero: string) => {
    setClienteComparado(numero)
    setPestana("comparativa")
  }

  const paginas = Math.ceil(total / LIMITE)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <header className="fixed-header bg-white shadow-sm border-b border-emerald-100">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-5 gap-4">
            <div className="flex items-center space-x-3">
              <Link href={destinoVolver.href}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="touch-manipulation h-9 w-9 sm:h-10 sm:w-auto sm:px-4 sm:rounded-md gap-2"
                  aria-label={destinoVolver.label}
                  title={destinoVolver.label}
                >
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{destinoVolver.label}</span>
                </Button>
              </Link>
              <div className="rounded-xl bg-suncar-primary shadow-sm flex items-center justify-center h-9 w-9 sm:h-12 sm:w-12 shrink-0 p-1.5 sm:p-2">
                <img src="/brand/suncar-v1-iso.png" alt="Logo Suncar" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate flex items-center gap-2">
                  <FileCheck2 className="h-5 w-5 text-emerald-500" />
                  Por facturar
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                  Clientes instalados con ofertas confirmadas sin facturar
                </p>
              </div>
            </div>
            {pestana === "pendientes" && (
              <Button variant="outline" size="sm" onClick={cargar} disabled={cargando} className="gap-1.5 self-start sm:self-auto">
                <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="content-with-fixed-header pb-10 px-4 sm:px-6 lg:px-8">
        <Tabs value={pestana} onValueChange={(v) => setPestana(v as typeof pestana)}>
          {puedeComparar && (
            <TabsList className="mb-4">
              <TabsTrigger value="pendientes">Por facturar</TabsTrigger>
              <TabsTrigger value="comparativa" className="gap-1.5">
                <Scale className="h-4 w-4" />
                Oferta vs almacén
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="pendientes" className="mt-0 space-y-4">
            <div className="bg-white rounded-lg border border-emerald-100 shadow-sm p-4 space-y-3">
              <div className="flex gap-1">
                {([
                  { v: "nuevos", label: "Nuevos" },
                  { v: "historico", label: "Histórico" },
                ] as const).map((t) => (
                  <button
                    key={t.v}
                    onClick={() => {
                      setVista(t.v)
                      setPagina(0)
                      setAbierto(null)
                    }}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      vista === t.v ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-emerald-50"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-700">
                {vista === "nuevos" ? (
                  <>
                    La factura ya no se genera sola al instalar. Desde el 23-sep-2026, al pasar a{" "}
                    <strong>Equipo instalado con éxito</strong> (o al confirmarse una ampliación), el cliente aparece aquí
                    con todas sus ofertas confirmadas: elige cuál facturar. La factura sale en Obras Terminadas igual que
                    antes.
                  </>
                ) : (
                  <>
                    Lo que quedó sin facturar antes del 23-sep-2026. Primero van los clientes que la factura automática
                    dejó <strong>pendientes de decisión de Economía</strong> (tenían 2 o más ofertas sin facturar). No
                    aparecen los clientes de antes del sistema que no tienen ni vales ni facturas.
                  </>
                )}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Cliente, número o comercial..."
                    className="pl-9"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <Switch
                    checked={verResueltos}
                    onCheckedChange={(v) => {
                      setVerResueltos(v)
                      setPagina(0)
                    }}
                  />
                  Ver también los ya resueltos
                </label>
                <span className="text-sm text-gray-600 sm:ml-auto">
                  <strong>{total}</strong> {total === 1 ? "cliente" : "clientes"}
                </span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
                <Button variant="outline" size="sm" className="ml-auto" onClick={cargar}>
                  Reintentar
                </Button>
              </div>
            )}

            <div className="bg-white rounded-lg border border-emerald-100 shadow-sm divide-y">
              {cargando && clientes.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-sm text-gray-600">
                  <Loader2 className="h-5 w-5 animate-spin mr-2 text-emerald-600" />
                  Cargando clientes...
                </div>
              ) : clientes.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  {q
                    ? "Ningún cliente coincide con la búsqueda."
                    : vista === "nuevos"
                      ? "No hay clientes nuevos pendientes de facturar. Lo anterior al 23-sep-2026 está en Histórico."
                      : "No hay clientes pendientes en el histórico."}
                </div>
              ) : (
                clientes.map((c) => {
                  const expandido = abierto === c.cliente_numero
                  return (
                    <div key={c.cliente_numero}>
                      <button
                        className="flex w-full flex-col gap-2 px-4 py-3 text-left hover:bg-emerald-50/50 sm:flex-row sm:items-center"
                        onClick={() => setAbierto(expandido ? null : c.cliente_numero)}
                        aria-expanded={expandido}
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-2">
                          {expandido ? (
                            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                          ) : (
                            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-gray-900">{c.cliente_nombre}</span>
                              <span className="text-xs text-gray-500">{c.cliente_numero}</span>
                              {c.es_trabajador_suncar && (
                                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] text-violet-800">Trabajador SunCar</span>
                              )}
                              {c.equipo_propio && (
                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] text-sky-800">Equipo propio</span>
                              )}
                              {c.pendiente_decision_economia && (
                                <span
                                  className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900"
                                  title="La factura automática no eligió oferta (2 o más sin facturar) y avisó a Economía para que decidiera."
                                >
                                  Pendiente de decisión de Economía
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600">
                              Instalado {formatFecha(c.fecha_equipo_instalado)}
                              {c.comercial ? ` · ${c.comercial}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-6 sm:pl-0">
                          {c.ofertas.map((o) => (
                            <span
                              key={o.oferta_id}
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${ESTADO_FACTURACION[o.estado_facturacion].className}`}
                              title={ESTADO_FACTURACION[o.estado_facturacion].label}
                            >
                              {o.numero_oferta}
                              {o.estado_facturacion === "facturada" && o.numero_factura ? ` · ${o.numero_factura}` : ""}
                            </span>
                          ))}
                        </div>
                      </button>
                      {expandido && (
                        <div className="border-t border-emerald-100 bg-emerald-50/40 px-4 py-4">
                          <DetalleClientePorFacturar
                            clienteNumero={c.cliente_numero}
                            puedeFacturar={puedeFacturar}
                            puedeComparar={puedeComparar}
                            onCambio={cargar}
                            onComparar={comparar}
                          />
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {paginas > 1 && (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Página <strong>{pagina + 1}</strong> de <strong>{paginas}</strong>
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={pagina === 0 || cargando} onClick={() => setPagina((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagina + 1 >= paginas || cargando}
                    onClick={() => setPagina((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {puedeComparar && (
            <TabsContent value="comparativa" className="mt-0">
              <ComparativaOfertaAlmacen clienteNumero={clienteComparado} onClienteChange={setClienteComparado} />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  )
}
