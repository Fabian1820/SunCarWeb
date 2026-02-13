"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/molecule/card"
import { BarChart3, Calendar, RefreshCw } from "lucide-react"
import { useEstadisticas } from "@/hooks/use-estadisticas"
import { KpiMonthSelector } from "@/components/feats/estadisticas/kpi-month-selector"
import { KpiCards } from "@/components/feats/estadisticas/kpi-cards"
import { EstadisticasCharts } from "@/components/feats/estadisticas/estadisticas-charts"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { RouteGuard } from "@/components/auth/route-guard"
import { ModuleHeader } from "@/components/shared/organism/module-header"

export default function EstadisticasPage() {
  return (
    <RouteGuard requiredModule="estadisticas">
      <EstadisticasPageContent />
    </RouteGuard>
  )
}

function EstadisticasPageContent() {
  const currentDate = new Date()
  const [año, setAño] = useState(currentDate.getFullYear())
  const [mes, setMes] = useState(currentDate.getMonth() + 1)
  const [estados, setEstados] = useState('confirmada_por_cliente,reservada')

  const {
    timelineData,
    loading,
    error,
    loadLineaTiempo,
    clearError
  } = useEstadisticas()
  const { toast } = useToast()

  useEffect(() => {
    handleConsultar()
  }, [])

  const handleConsultar = () => {
    loadLineaTiempo(estados)
  }

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      })
    }
  }, [error, toast])

  const getMesNombre = (mesNum: number) => {
    const meses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ]
    return meses[mesNum - 1] || ""
  }

  const getRangoFechas = () => {
    if (timelineData.length === 0) return ""
    const mesInicial = timelineData[0]
    const mesFinal = timelineData[timelineData.length - 1]
    return `${getMesNombre(mesInicial.mes)} ${mesInicial.año} - ${getMesNombre(mesFinal.mes)} ${mesFinal.año}`
  }

	  return (
	    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
	      {/* Header */}
	      <ModuleHeader
	        title="Estadísticas"
	        subtitle="Métricas de crecimiento y rendimiento"
	        badge={{ text: "Analytics", className: "bg-orange-100 text-orange-800" }}
	        className="bg-white shadow-sm border-b border-orange-100"
	        actions={
	          <Button
	            onClick={handleConsultar}
	            disabled={loading}
	            variant="outline"
	            size="icon"
	            className="h-9 w-9 border-orange-200 hover:bg-orange-50 touch-manipulation"
	            aria-label="Actualizar"
	            title="Actualizar"
	          >
	            <RefreshCw className={`h-4 w-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
	            <span className="hidden sm:inline">Actualizar</span>
	            <span className="sr-only">Actualizar</span>
	          </Button>
	        }
	      />

	      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-10">
	        {/* Error Alert */}
	        {error && (
	          <Card className="mb-6 border-red-200 bg-red-50 border-l-4 border-l-red-500">
	            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-red-800">{error}</p>
                <Button variant="ghost" size="sm" onClick={clearError}>
                  ✕
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ==================== SECCIÓN 1: KPI DEL MES ==================== */}
        <section className="mb-10">
          <Card className="border-0 shadow-md border-l-4 border-l-orange-600 mb-6">
            <CardHeader className="pb-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Resumen Mensual</CardTitle>
                    <CardDescription>Indicadores clave del mes seleccionado</CardDescription>
                  </div>
                </div>

                <KpiMonthSelector
                  año={año}
                  mes={mes}
                  onChangeAño={setAño}
                  onChangeMes={setMes}
                  onConsultar={() => {}}
                  loading={loading}
                />
              </div>
            </CardHeader>
          </Card>

          {/* KPI Cards */}
          <KpiCards estadisticas={timelineData} selectedYear={año} selectedMonth={mes} />
        </section>

        {/* ==================== SECCIÓN 2: LÍNEA DE TIEMPO ==================== */}
        <section>
          <Card className="border-0 shadow-md border-l-4 border-l-orange-600 mb-6">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Evolución Temporal</CardTitle>
                    <CardDescription>Análisis histórico de todas las ofertas</CardDescription>
                  </div>
                </div>
                <Button
                  onClick={() => loadLineaTiempo(estados)}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="border-orange-200 hover:bg-orange-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Loading State */}
          {loading && timelineData.length === 0 && (
            <PageLoader moduleName="Estadísticas" text="Cargando datos..." />
          )}

          {/* Charts Content */}
          {timelineData.length > 0 ? (
            <div className="space-y-6">
              {/* Period Header */}
              <Card className="border-0 shadow-sm bg-gray-50">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold text-gray-900">
                        Período: {getRangoFechas()}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Análisis de {timelineData.length} meses
                      </p>
                    </div>
                    <span className="text-sm font-medium text-orange-700 bg-orange-100 px-3 py-1 rounded-full">
                      {timelineData.length} períodos
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Charts */}
              <EstadisticasCharts estadisticas={timelineData} />
            </div>
          ) : !loading && !error && (
            <Card className="border-0 shadow-md border-l-4 border-l-gray-400">
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">
                  No hay datos disponibles para el período seleccionado.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      </main>

      <Toaster />
    </div>
  )
}
