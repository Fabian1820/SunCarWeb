"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { ArrowLeft, RefreshCw, HardHat, AlertCircle, ChevronLeft, ChevronRight, FileDown, Loader2 } from "lucide-react"
import { useObrasTerminadas } from "@/hooks/use-obras-terminadas"
import { ObrasTerminadasTable } from "@/components/feats/obras-terminadas/obras-terminadas-table"
import type { ObrasTerminadasFiltros } from "@/lib/services/feats/obras-terminadas/obras-terminadas-service"
import { ObrasTerminadasService } from "@/lib/services/feats/obras-terminadas/obras-terminadas-service"
import { ExportFacturaClienteService } from "@/lib/services/feats/obras-terminadas/export-factura-cliente-service"

export default function ObrasTerminadasPage() {
  const [serverFiltros, setServerFiltros] = useState<ObrasTerminadasFiltros>({})
  const [exportingAll, setExportingAll] = useState(false)

  const {
    ofertasConPagos, loading, error, fetchData,
    fetchDetalle, detalleCache, detalleLoading, detalleError,
    fetchFacturasCliente, facturasClienteCache, facturasClienteLoading, facturasClienteError,
    page, total, totalPages, goToPage,
  } = useObrasTerminadas()

  useEffect(() => {
    fetchData(serverFiltros, 0)
  }, [fetchData, serverFiltros])

  const handleServerFiltersChange = useCallback((next: ObrasTerminadasFiltros) => {
    setServerFiltros(next)
  }, [])

  const handleExportarTodasPDF = useCallback(async () => {
    setExportingAll(true)
    try {
      // Traer TODOS los resultados filtrados (no solo la página actual)
      const todosResp = await ObrasTerminadasService.getDatos(
        { ...serverFiltros, limit: Math.max(total, 1000), skip: 0 },
      )
      const facturadas = todosResp.data.filter((o) => o.facturada && o.oferta_id)
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
  }, [serverFiltros, total])

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
              <div className="p-0 rounded-full bg-white shadow border border-emerald-200 flex items-center justify-center h-8 w-8 sm:h-12 sm:w-12">
                <img
                  src="/logo.png"
                  alt="Logo SunCar"
                  className="h-6 w-6 sm:h-10 sm:w-10 object-contain rounded-full"
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
                onClick={() => fetchData(serverFiltros, page)}
                disabled={loading}
                className="gap-1.5"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Actualizar</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="content-with-fixed-header pb-10 px-4 sm:px-6 lg:px-8">
        {/* Error */}
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

        {/* Tabla principal */}
        <div className="bg-white rounded-lg border border-emerald-100 shadow-sm p-4 overflow-x-auto">
          <ObrasTerminadasTable
            ofertasConPagos={ofertasConPagos}
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
      </main>
    </div>
  )
}
