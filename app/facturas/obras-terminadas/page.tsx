"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import {
  ArrowLeft,
  RefreshCw,
  HardHat,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  FilterX,
  Users,
} from "lucide-react"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/shared/molecule/tabs"
import { useObrasTerminadas } from "@/hooks/use-obras-terminadas"
import { ObrasTerminadasTable } from "@/components/feats/obras-terminadas/obras-terminadas-table"
import { FacturasObrasTerminadasTable } from "@/components/feats/obras-terminadas/facturas-obras-terminadas-table"
import type { ObrasTerminadasFiltros } from "@/lib/services/feats/obras-terminadas/obras-terminadas-service"
import { ObrasTerminadasService } from "@/lib/services/feats/obras-terminadas/obras-terminadas-service"
import { ExportFacturaClienteService } from "@/lib/services/feats/obras-terminadas/export-factura-cliente-service"
import { ExportObrasTerminadasExcelService } from "@/lib/services/feats/obras-terminadas/export-obras-terminadas-excel-service"
import { useToast } from "@/hooks/use-toast"

type Vista = "obras" | "facturas"

export default function ObrasTerminadasPage() {
  const [vista, setVista] = useState<Vista>("obras")
  const { toast } = useToast()

  /* ── Vista: Obras (tabla original, sin cambios) ─────────────────────── */
  const [serverFiltros, setServerFiltros] = useState<ObrasTerminadasFiltros>({})
  const [exportingAll, setExportingAll] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingExcelSinMateriales, setExportingExcelSinMateriales] = useState(false)

  const {
    ofertasConPagos, loading, error, fetchData,
    fetchDetalle, detalleCache, detalleLoading, detalleError,
    fetchFacturasCliente, facturasClienteCache, facturasClienteLoading, facturasClienteError,
    page, total, totales, totalPages, goToPage,
  } = useObrasTerminadas()

  useEffect(() => {
    if (vista === "obras") fetchData(serverFiltros, 0)
  }, [fetchData, serverFiltros, vista])

  const handleServerFiltersChange = useCallback((next: ObrasTerminadasFiltros) => {
    setServerFiltros(next)
  }, [])

  const handleExportarTodasPDF = useCallback(async () => {
    setExportingAll(true)
    try {
      const PAGE_SIZE = 500
      let allData: typeof ofertasConPagos = []
      let skip = 0
      let hasMore = true
      while (hasMore) {
        const resp = await ObrasTerminadasService.getDatos(
          { ...serverFiltros, limit: PAGE_SIZE, skip },
        )
        allData = [...allData, ...resp.data]
        skip += PAGE_SIZE
        hasMore = resp.data.length === PAGE_SIZE
      }
      const facturadas = allData.filter((o) => o.facturada && o.oferta_id)
      if (!facturadas.length) return

      const results = (
        await Promise.all(
          facturadas.map(async (obra) => {
            try {
              const facturas = await ObrasTerminadasService.getFacturasCliente(obra.oferta_id!)
              return facturas.length ? { obra, factura: facturas[0] } : null
            } catch {
              return null
            }
          }),
        )
      ).filter((r): r is { obra: typeof facturadas[0]; factura: Awaited<ReturnType<typeof ObrasTerminadasService.getFacturasCliente>>[0] } => r !== null)

      if (results.length) {
        await ExportFacturaClienteService.exportarMultiplesPDF(results)
      }
    } finally {
      setExportingAll(false)
    }
  }, [serverFiltros])

  const handleExportarExcel = useCallback(async () => {
    setExportingExcel(true)
    try {
      const resultado = await ExportObrasTerminadasExcelService.exportar(serverFiltros)
      toast({
        title: "Exportación exitosa",
        description: `${resultado.count} obra${resultado.count === 1 ? "" : "s"} exportada${resultado.count === 1 ? "" : "s"} a ${resultado.filename}.xlsx`,
      })
    } catch (error) {
      toast({
        title: "Error al exportar",
        description: error instanceof Error ? error.message : "No se pudo generar el archivo Excel",
        variant: "destructive",
      })
    } finally {
      setExportingExcel(false)
    }
  }, [serverFiltros, toast])

  const handleExportarExcelSinMateriales = useCallback(async () => {
    setExportingExcelSinMateriales(true)
    try {
      const resultado = await ExportObrasTerminadasExcelService.exportarSinMateriales(serverFiltros)
      toast({
        title: "Exportación exitosa",
        description: `${resultado.count} obra${resultado.count === 1 ? "" : "s"} exportada${resultado.count === 1 ? "" : "s"} a ${resultado.filename}.xlsx`,
      })
    } catch (error) {
      toast({
        title: "Error al exportar",
        description: error instanceof Error ? error.message : "No se pudo generar el archivo Excel",
        variant: "destructive",
      })
    } finally {
      setExportingExcelSinMateriales(false)
    }
  }, [serverFiltros, toast])

  /* ── Vista: Facturas de obras terminadas — 2 sub-pestañas (clientes/trabajadores) ── */
  const [subVista, setSubVista] = useState<"clientes" | "trabajadores">("clientes")
  const [fSearch, setFSearch] = useState("")
  const [fComercial, setFComercial] = useState("")
  const [fEstado, setFEstado] = useState<"" | "pagada" | "pendiente">("")
  const [fDesde, setFDesde] = useState("")
  const [fHasta, setFHasta] = useState("")
  const [exportingAllFacturasClientes, setExportingAllFacturasClientes] = useState(false)
  const [exportingAllFacturasTrabajadores, setExportingAllFacturasTrabajadores] = useState(false)
  const [exportingExcelFacturasClientes, setExportingExcelFacturasClientes] = useState(false)
  const [exportingExcelFacturasTrabajadores, setExportingExcelFacturasTrabajadores] = useState(false)

  const facturasClientesHook = useObrasTerminadas()
  const facturasTrabajadoresHook = useObrasTerminadas()

  const filtrosClientesFacturas = useMemo<ObrasTerminadasFiltros>(() => ({
    q: fSearch || undefined,
    comercial: fComercial || undefined,
    estado_factura: fEstado || "facturada",
    fecha_facturacion_desde: fDesde || undefined,
    fecha_facturacion_hasta: fHasta || undefined,
    es_trabajador_suncar: false,
  }), [fSearch, fComercial, fEstado, fDesde, fHasta])

  const filtrosTrabajadoresFacturas = useMemo<ObrasTerminadasFiltros>(() => ({
    q: fSearch || undefined,
    comercial: fComercial || undefined,
    estado_factura: fEstado || "facturada",
    fecha_facturacion_desde: fDesde || undefined,
    fecha_facturacion_hasta: fHasta || undefined,
    es_trabajador_suncar: true,
  }), [fSearch, fComercial, fEstado, fDesde, fHasta])

  // Carga perezosa + cache: solo se fetchea la sub-pestaña activa, y solo si sus
  // filtros cambiaron desde la última vez que se cargó (evita refetch al solo
  // alternar entre pestañas ya visitadas con los mismos filtros).
  const ultimaFirmaCargada = useRef<{ clientes?: string; trabajadores?: string }>({})
  useEffect(() => {
    if (vista !== "facturas") return
    const filtros = subVista === "clientes" ? filtrosClientesFacturas : filtrosTrabajadoresFacturas
    const firma = JSON.stringify(filtros)
    if (ultimaFirmaCargada.current[subVista] === firma) return
    const timeout = setTimeout(() => {
      const hook = subVista === "clientes" ? facturasClientesHook : facturasTrabajadoresHook
      hook.fetchData(filtros, 0)
      ultimaFirmaCargada.current[subVista] = firma
    }, 250)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, subVista, filtrosClientesFacturas, filtrosTrabajadoresFacturas])

  const comercialesFacturas = useMemo(() => {
    const set = new Set<string>()
    for (const o of [...facturasClientesHook.ofertasConPagos, ...facturasTrabajadoresHook.ofertasConPagos]) {
      const c = (o.comercial || "").trim()
      if (c) set.add(c)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"))
  }, [facturasClientesHook.ofertasConPagos, facturasTrabajadoresHook.ofertasConPagos])

  const hayFiltrosFacturas = !!(fComercial || fEstado || fDesde || fHasta)
  const limpiarFiltrosFacturas = () => {
    setFComercial(""); setFEstado(""); setFDesde(""); setFHasta("")
  }

  const handleExportarTodasPDFFacturas = useCallback(async (
    obrasListadas: typeof facturasClientesHook.ofertasConPagos,
    setExporting: (v: boolean) => void,
  ) => {
    setExporting(true)
    try {
      const results = (
        await Promise.all(
          obrasListadas.filter((o) => o.oferta_id).map(async (obra) => {
            try {
              const facturasCliente = await ObrasTerminadasService.getFacturasCliente(obra.oferta_id!)
              return facturasCliente.length ? { obra, factura: facturasCliente[0] } : null
            } catch {
              return null
            }
          }),
        )
      ).filter((r): r is { obra: typeof obrasListadas[0]; factura: Awaited<ReturnType<typeof ObrasTerminadasService.getFacturasCliente>>[0] } => r !== null)

      if (results.length) {
        await ExportFacturaClienteService.exportarMultiplesPDF(results)
      }
    } finally {
      setExporting(false)
    }
  }, [])

  const handleExportarExcelFacturas = useCallback(async (
    filtros: ObrasTerminadasFiltros,
    setExporting: (v: boolean) => void,
  ) => {
    setExporting(true)
    try {
      const resultado = await ExportObrasTerminadasExcelService.exportar(filtros)
      toast({
        title: "Exportación exitosa",
        description: `${resultado.count} factura${resultado.count === 1 ? "" : "s"} exportada${resultado.count === 1 ? "" : "s"} a ${resultado.filename}.xlsx`,
      })
    } catch (error) {
      toast({
        title: "Error al exportar",
        description: error instanceof Error ? error.message : "No se pudo generar el archivo Excel",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }, [toast])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      {/* Header */}
      <header className="fixed-header bg-white shadow-sm border-b border-emerald-100">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-5 gap-4">
            <div className="flex items-center space-x-3">
              <Link href="/facturas">
                <Button
                  variant="ghost"
                  size="icon"
                  className="touch-manipulation h-9 w-9 sm:h-10 sm:w-auto sm:px-4 sm:rounded-md gap-2"
                  aria-label="Volver a Facturación"
                  title="Volver a Facturación"
                >
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Volver a Facturación</span>
                </Button>
              </Link>
              <div className="rounded-xl bg-suncar-primary shadow-sm flex items-center justify-center h-9 w-9 sm:h-12 sm:w-12 shrink-0 p-1.5 sm:p-2">
                <img
                  src="/brand/suncar-v1-iso.png"
                  alt="Logo Suncar"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate flex items-center gap-2">
                  <HardHat className="h-5 w-5 text-emerald-500" />
                  Obras Terminadas
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    Resultados Contabilidad
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                  Ofertas con pagos · Trabajos diarios · Pago por resultados
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {vista === "obras" ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportarTodasPDF}
                    disabled={exportingAll || loading || !ofertasConPagos.some((o) => o.facturada)}
                    className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
                    title="Exportar todas las facturas cliente en un PDF unificado"
                  >
                    {exportingAll
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <FileDown className="h-4 w-4" />}
                    <span className="hidden sm:inline">PDF unificado</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportarExcel}
                    disabled={exportingExcel || loading || total === 0}
                    className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50"
                    title="Exportar obras terminadas y materiales instalados a Excel"
                  >
                    {exportingExcel
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <FileSpreadsheet className="h-4 w-4" />}
                    <span className="hidden sm:inline">Exportar Excel</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportarExcelSinMateriales}
                    disabled={exportingExcelSinMateriales || loading || total === 0}
                    className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50"
                    title="Exportar obras terminadas a Excel, sin las columnas de materiales"
                  >
                    {exportingExcelSinMateriales
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <FileSpreadsheet className="h-4 w-4" />}
                    <span className="hidden sm:inline">Exportar Excel sin materiales</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchData(serverFiltros, page)}
                    disabled={loading}
                    className="gap-1.5"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    <span className="hidden sm:inline">Actualizar</span>
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (subVista === "clientes") {
                      facturasClientesHook.fetchData(filtrosClientesFacturas, facturasClientesHook.page)
                    } else {
                      facturasTrabajadoresHook.fetchData(filtrosTrabajadoresFacturas, facturasTrabajadoresHook.page)
                    }
                  }}
                  disabled={subVista === "clientes" ? facturasClientesHook.loading : facturasTrabajadoresHook.loading}
                  className="gap-1.5"
                >
                  <RefreshCw className={`h-4 w-4 ${(subVista === "clientes" ? facturasClientesHook.loading : facturasTrabajadoresHook.loading) ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Actualizar</span>
                </Button>
              )}
            </div>
          </div>

          {/* Selector de vista */}
          <div className="flex gap-1 pb-3">
            <button
              onClick={() => setVista("obras")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                vista === "obras"
                  ? "bg-emerald-600 text-white"
                  : "text-gray-600 hover:bg-emerald-50"
              }`}
            >
              <HardHat className="h-4 w-4" />
              Obras
            </button>
            <button
              onClick={() => setVista("facturas")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                vista === "facturas"
                  ? "bg-emerald-600 text-white"
                  : "text-gray-600 hover:bg-emerald-50"
              }`}
            >
              <FileText className="h-4 w-4" />
              Facturas
            </button>
          </div>
        </div>
      </header>

      <main className="content-with-fixed-header pb-10 px-4 sm:px-6 lg:px-8">
        {vista === "obras" ? (
          <>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Error al cargar datos:</strong> {error}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchData()}
                  className="ml-auto border-red-300 text-red-700 hover:bg-red-100"
                >
                  Reintentar
                </Button>
              </div>
            )}

            <div className="bg-white rounded-lg border border-emerald-100 shadow-sm p-4 overflow-x-auto">
              <ObrasTerminadasTable
                ofertasConPagos={ofertasConPagos}
                totales={totales}
                loading={loading}
                fetchDetalle={fetchDetalle}
                detalleCache={detalleCache}
                detalleLoading={detalleLoading}
                detalleError={detalleError}
                fetchFacturasCliente={fetchFacturasCliente}
                facturasClienteCache={facturasClienteCache}
                facturasClienteLoading={facturasClienteLoading}
                facturasClienteError={facturasClienteError}
                serverFiltros={serverFiltros}
                onServerFiltersChange={handleServerFiltersChange}
              />

              {totalPages > 0 && (
                <div className="mt-4 flex flex-col gap-3 border-t border-emerald-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-600">
                    Página <strong>{page + 1}</strong> de <strong>{totalPages}</strong> ·{" "}
                    <strong>{total}</strong> resultados
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(page - 1)}
                      disabled={loading || page <= 0}
                      className="gap-1.5"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(page + 1)}
                      disabled={loading || page >= totalPages - 1}
                      className="gap-1.5"
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {(subVista === "clientes" ? facturasClientesHook.error : facturasTrabajadoresHook.error) && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Error al cargar facturas:</strong>{" "}
                  {subVista === "clientes" ? facturasClientesHook.error : facturasTrabajadoresHook.error}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (subVista === "clientes") facturasClientesHook.fetchData(filtrosClientesFacturas, 0)
                    else facturasTrabajadoresHook.fetchData(filtrosTrabajadoresFacturas, 0)
                  }}
                  className="ml-auto border-red-300 text-red-700 hover:bg-red-100"
                >
                  Reintentar
                </Button>
              </div>
            )}

            <div className="bg-white rounded-lg border border-emerald-100 shadow-sm overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 py-3 border-b bg-gray-50/60">
                <Input
                  type="date"
                  value={fDesde}
                  onChange={(e) => setFDesde(e.target.value)}
                  className="h-8 w-36 text-xs"
                  title="Fecha facturación desde"
                />
                <Input
                  type="date"
                  value={fHasta}
                  onChange={(e) => setFHasta(e.target.value)}
                  className="h-8 w-36 text-xs"
                  title="Fecha facturación hasta"
                />
                <Select value={fEstado || "all"} onValueChange={(v) => setFEstado(v === "all" ? "" : (v as "pagada" | "pendiente"))}>
                  <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="pagada">Pagada</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={fComercial || "all"} onValueChange={(v) => setFComercial(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Comercial" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los comerciales</SelectItem>
                    {comercialesFacturas.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hayFiltrosFacturas && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-gray-600"
                    onClick={limpiarFiltrosFacturas}
                  >
                    <FilterX className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Tabs value={subVista} onValueChange={(v) => setSubVista(v as "clientes" | "trabajadores")}>
                <div className="px-4 sm:px-6 pt-3">
                  <TabsList>
                    <TabsTrigger value="clientes" className="gap-1.5">
                      <FileText className="h-4 w-4" />
                      Facturas clientes
                    </TabsTrigger>
                    <TabsTrigger value="trabajadores" className="gap-1.5">
                      <Users className="h-4 w-4" />
                      Facturas trabajadores
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="clientes" forceMount className={subVista === "clientes" ? "" : "hidden"}>
                  <FacturasObrasTerminadasTable
                    obras={facturasClientesHook.ofertasConPagos}
                    loading={facturasClientesHook.loading}
                    error={null}
                    onRefresh={() => facturasClientesHook.fetchData(filtrosClientesFacturas, facturasClientesHook.page)}
                    onExportarTodas={(obras) => handleExportarTodasPDFFacturas(obras, setExportingAllFacturasClientes)}
                    onExportarExcel={() => handleExportarExcelFacturas(filtrosClientesFacturas, setExportingExcelFacturasClientes)}
                    variant="embedded"
                    searchValue={fSearch}
                    onSearchChange={setFSearch}
                    totalCount={facturasClientesHook.total}
                    totales={facturasClientesHook.totales}
                    footer={facturasClientesHook.totalPages > 0 ? (
                      <div className="flex flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-gray-600">
                          Página <strong>{facturasClientesHook.page + 1}</strong> de <strong>{facturasClientesHook.totalPages}</strong> ·{" "}
                          <strong>{facturasClientesHook.total}</strong> resultados
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => facturasClientesHook.goToPage(facturasClientesHook.page - 1)}
                            disabled={facturasClientesHook.loading || facturasClientesHook.page <= 0}
                            className="gap-1.5"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Anterior
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => facturasClientesHook.goToPage(facturasClientesHook.page + 1)}
                            disabled={facturasClientesHook.loading || facturasClientesHook.page >= facturasClientesHook.totalPages - 1}
                            className="gap-1.5"
                          >
                            Siguiente
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  />
                </TabsContent>

                <TabsContent value="trabajadores" forceMount className={subVista === "trabajadores" ? "" : "hidden"}>
                  <FacturasObrasTerminadasTable
                    obras={facturasTrabajadoresHook.ofertasConPagos}
                    loading={facturasTrabajadoresHook.loading}
                    error={null}
                    onRefresh={() => facturasTrabajadoresHook.fetchData(filtrosTrabajadoresFacturas, facturasTrabajadoresHook.page)}
                    onExportarTodas={(obras) => handleExportarTodasPDFFacturas(obras, setExportingAllFacturasTrabajadores)}
                    onExportarExcel={() => handleExportarExcelFacturas(filtrosTrabajadoresFacturas, setExportingExcelFacturasTrabajadores)}
                    variant="embedded"
                    searchValue={fSearch}
                    onSearchChange={setFSearch}
                    totalCount={facturasTrabajadoresHook.total}
                    totales={facturasTrabajadoresHook.totales}
                    footer={facturasTrabajadoresHook.totalPages > 0 ? (
                      <div className="flex flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-gray-600">
                          Página <strong>{facturasTrabajadoresHook.page + 1}</strong> de <strong>{facturasTrabajadoresHook.totalPages}</strong> ·{" "}
                          <strong>{facturasTrabajadoresHook.total}</strong> resultados
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => facturasTrabajadoresHook.goToPage(facturasTrabajadoresHook.page - 1)}
                            disabled={facturasTrabajadoresHook.loading || facturasTrabajadoresHook.page <= 0}
                            className="gap-1.5"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Anterior
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => facturasTrabajadoresHook.goToPage(facturasTrabajadoresHook.page + 1)}
                            disabled={facturasTrabajadoresHook.loading || facturasTrabajadoresHook.page >= facturasTrabajadoresHook.totalPages - 1}
                            className="gap-1.5"
                          >
                            Siguiente
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
