"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { ArrowLeft, RefreshCw, HardHat, AlertCircle } from "lucide-react"
import { useObrasTerminadas } from "@/hooks/use-obras-terminadas"
import { ObrasTerminadasTable } from "@/components/feats/obras-terminadas/obras-terminadas-table"

export default function ObrasTerminadasPage() {
  const { ofertasConPagos, loading, error, fetchData, getTrabajosPorCliente, getValesPorCliente } =
    useObrasTerminadas()

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header className="fixed-header bg-white shadow-sm border-b border-orange-100">
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
              <div className="p-0 rounded-full bg-white shadow border border-orange-200 flex items-center justify-center h-8 w-8 sm:h-12 sm:w-12">
                <img
                  src="/logo.png"
                  alt="Logo SunCar"
                  className="h-6 w-6 sm:h-10 sm:w-10 object-contain rounded-full"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate flex items-center gap-2">
                  <HardHat className="h-5 w-5 text-orange-500" />
                  Obras Terminadas
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
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
                onClick={fetchData}
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
        {/* Descripción */}
        <div className="mb-6 bg-white rounded-lg border border-orange-100 shadow-sm p-4">
          <p className="text-sm text-gray-600">
            Vista consolidada de <strong>todas las ofertas con pagos</strong>.
            Haz clic en una fila para desplegar sus{" "}
            <strong>pagos recibidos</strong>, los{" "}
            <strong>trabajos diarios</strong> realizados al cliente y el{" "}
            <strong>resumen de resultados</strong> para calcular el pago al
            comercial.
          </p>
        </div>

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
              onClick={fetchData}
              className="ml-auto border-red-300 text-red-700 hover:bg-red-100"
            >
              Reintentar
            </Button>
          </div>
        )}

        {/* Tabla principal */}
        <div className="bg-white rounded-lg border border-orange-100 shadow-sm p-4 overflow-x-auto">
          <ObrasTerminadasTable
            ofertasConPagos={ofertasConPagos}
            loading={loading}
            getTrabajosPorCliente={getTrabajosPorCliente}
            getValesPorCliente={getValesPorCliente}
          />
        </div>
      </main>
    </div>
  )
}
