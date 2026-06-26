"use client"

import { useEffect, useState } from "react"
import { ClipboardCheck, Plus, CalendarDays, Users } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shared/molecule/tabs"
import { Input } from "@/components/shared/molecule/input"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { Toaster } from "@/components/shared/molecule/toaster"
import { RouteGuard } from "@/components/auth/route-guard"
import { QuienEstaPanel } from "@/components/feats/asistencia/quien-esta-panel"
import { ReporteDiarioTable } from "@/components/feats/asistencia/reporte-diario-table"
import { MarcarDialog } from "@/components/feats/asistencia/marcar-dialog"
import { useAsistencia } from "@/hooks/use-asistencia"
import { useToast } from "@/hooks/use-toast"

export default function AsistenciaPage() {
  return (
    <RouteGuard requiredModule="asistencia">
      <AsistenciaPageContent />
    </RouteGuard>
  )
}

function AsistenciaPageContent() {
  const {
    presentes,
    totalPresentes,
    reporte,
    resumen,
    fechaReporte,
    setFechaReporte,
    loadingPresentes,
    loadingReporte,
    error,
    clearError,
    loadPresentes,
    loadReporte,
    marcarAsistencia,
  } = useAsistencia()

  const { toast } = useToast()
  const [marcarOpen, setMarcarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("ahora")

  useEffect(() => {
    if (activeTab === "reporte") {
      loadReporte(fechaReporte)
    }
  }, [activeTab, fechaReporte, loadReporte])

  const handleMarcar = async (ci: string, comentarios?: string) => {
    const res = await marcarAsistencia(ci, comentarios)
    if (res.ok) {
      toast({
        title: res.tipo === "entrada" ? "Entrada registrada" : "Salida registrada",
        description: res.message,
      })
      if (activeTab === "reporte") loadReporte(fechaReporte)
    } else {
      toast({ title: "Error al marcar", description: res.message, variant: "destructive" })
    }
    return res
  }

  if (loadingPresentes && presentes.length === 0) {
    return <PageLoader moduleName="Asistencia" text="Cargando asistencia..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Control de Asistencia"
        subtitle="Seguimiento en tiempo real de la presencia del personal"
        badge={{ text: `${totalPresentes} en oficina`, className: "bg-green-100 text-green-800" }}
        actions={
          <Button onClick={() => setMarcarOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Marcar asistencia
          </Button>
        }
      />

      <main className="pt-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center justify-between">
              <p className="text-red-800 text-sm">{error}</p>
              <Button variant="ghost" size="sm" onClick={clearError}>✕</Button>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="ahora" className="gap-2">
              <Users className="h-4 w-4" />
              Ahora mismo
            </TabsTrigger>
            <TabsTrigger value="reporte" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Reporte del día
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Quién está ahora ── */}
          <TabsContent value="ahora">
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-green-600" />
                  Personal en la oficina
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QuienEstaPanel
                  presentes={presentes}
                  total={totalPresentes}
                  loading={loadingPresentes}
                  onRefresh={loadPresentes}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 2: Reporte del día ── */}
          <TabsContent value="reporte">
            <div className="space-y-4">
              {/* Resumen */}
              {resumen && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total", value: resumen.total_trabajadores, color: "text-gray-800" },
                    { label: "Vinieron hoy", value: resumen.presentes_hoy, color: "text-blue-700" },
                    { label: "Ausentes", value: resumen.ausentes, color: "text-red-600" },
                    { label: "En oficina ahora", value: resumen.actualmente_en_oficina, color: "text-green-700" },
                  ].map((stat) => (
                    <Card key={stat.label} className="text-center py-3">
                      <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                    </Card>
                  ))}
                </div>
              )}

              <Card className="border-l-4 border-l-violet-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-violet-600" />
                      Asistencia del día
                    </CardTitle>
                    <Input
                      type="date"
                      value={fechaReporte}
                      onChange={(e) => setFechaReporte(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <ReporteDiarioTable trabajadores={reporte} loading={loadingReporte} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <MarcarDialog open={marcarOpen} onOpenChange={setMarcarOpen} onMarcar={handleMarcar} />
      <Toaster />
    </div>
  )
}
