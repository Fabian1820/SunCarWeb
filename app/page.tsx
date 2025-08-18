"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Badge } from "@/components/shared/atom/badge"
import { Sun, FileText, Users, FileCheck, Calendar, Package, User, MessageCircle, UserPlus } from "lucide-react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import FormViewer from "@/components/feats/reports/FormViewerNoSSR"
import { ReporteService } from "@/lib/api-services"
import { Loader } from "@/components/shared/atom/loader"
import { Wrench, Zap } from "lucide-react"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

export default function Dashboard() {
  const [selectedForm, setSelectedForm] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [recentReports, setRecentReports] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<any[]>([])

  useEffect(() => {
    // Obtener los reportes más recientes del backend
    const fetchRecentReports = async () => {
      setLoading(true)
      try {
        const data = await ReporteService.getReportes();
        // Ordenar por fecha descendente y tomar los 3 más recientes
        const sorted = Array.isArray(data)
          ? [...data].sort((a, b) => new Date(b.fecha_hora?.fecha || b.dateTime?.date || b.fecha_creacion || 0).getTime() - new Date(a.fecha_hora?.fecha || a.dateTime?.date || a.fecha_creacion || 0).getTime())
          : [];
        setRecentReports(sorted.slice(0, 3));
      } catch (e) {
        setRecentReports([]);
      } finally {
        setLoading(false);
      }
    };

    // Cargar clientes siempre
    const fetchClients = async () => {
      try {
        const allClients = await (await import("@/lib/api-services")).ClienteService.getClientes() as any[];
        setClients(allClients);
      } catch (e) {
        setClients([]);
      }
    };

    fetchRecentReports();
    fetchClients();
  }, []);

  const openFormDialog = (form: any) => {
    setSelectedForm(form)
    setIsDialogOpen(true)
  }

  const getClienteByNumero = (numero: string | number) => clients.find(c => String(c.numero) === String(numero));

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header className="fixed-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="p-0 rounded-full bg-white shadow border border-orange-200 flex items-center justify-center h-12 w-12">
                <img src="/logo.png" alt="Logo SunCar" className="h-10 w-10 object-contain rounded-full" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Administración de SUNCAR</h1>
                <p className="text-sm text-gray-600">Sistema de Gestión de Empresarial.</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-200px)]">
          
          {/* Left Column - Recent Reports */}
          <div className="flex flex-col lg:col-span-1">
            <Card className="border-0 shadow-lg hover:shadow-2xl flex-1">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileCheck className="h-5 w-5 text-emerald-600" />
                  <span>Reportes del Día</span>
                </CardTitle>
                <CardDescription>Últimos reportes H-1114 registrados en el sistema.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                  {loading ? (
                    <Loader label="Cargando reportes recientes..." />
                  ) : recentReports.length === 0 ? (
                    <div className="text-gray-500 text-center py-4">No hay reportes registrados en el día de hoy.</div>
                  ) : (
                    recentReports.map((report) => {
                      let Icon = FileCheck;
                      let iconColor = "text-green-500";
                      if (report.tipo_reporte === "inversion") {
                        Icon = Sun;
                        iconColor = "text-blue-500";
                      } else if (report.tipo_reporte === "mantenimiento") {
                        Icon = Wrench;
                        iconColor = "text-yellow-600";
                      } else if (report.tipo_reporte === "averia") {
                        Icon = Zap;
                        iconColor = "text-red-500";
                      }
                      return (
                        <div
                          key={report._id || report.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => openFormDialog(report)}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="p-2 rounded-lg bg-white border border-gray-200">
                              <Icon className={`h-4 w-4 ${iconColor}`} />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{report.cliente?.numero || "-"}</p>
                              <p className="text-sm text-gray-600">
                                {getClienteByNumero(report.cliente?.numero)?.direccion || "Sin dirección"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-500">{report.fecha_hora?.fecha || report.dateTime?.date || report.fecha_creacion || "-"}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - System Modules */}
          <div className="flex flex-col lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Módulos del Sistema</h2>
            <div className="grid grid-cols-2 gap-6 flex-1">
              {/* Row 1 - Azul para Brigadas y Trabajadores */}
              <Link href="/brigadas">
                <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full hover:-translate-y-2">
                  <CardContent className="p-6 text-center flex flex-col justify-center h-full">
                    <Users className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestionar Brigadas</h3>
                    <p className="text-sm text-gray-600">Administrar equipos de trabajo y asignaciones.</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/trabajadores">
                <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full hover:-translate-y-2">
                  <CardContent className="p-6 text-center flex flex-col justify-center h-full">
                    <UserPlus className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestionar Trabajadores</h3>
                    <p className="text-sm text-gray-600">Administrar personal y asignaciones.</p>
                  </CardContent>
                </Card>
              </Link>

              {/* Row 2 - Verde para Materiales y Reportes */}
              <Link href="/materiales">
                <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full hover:-translate-y-2">
                  <CardContent className="p-6 text-center flex flex-col justify-center h-full">
                    <Package className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestionar Materiales</h3>
                    <p className="text-sm text-gray-600">Administrar catálogo de materiales.</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/reportes">
                <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full hover:-translate-y-2">
                  <CardContent className="p-6 text-center flex flex-col justify-center h-full">
                    <FileCheck className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestionar Reportes</h3>
                    <p className="text-sm text-gray-600">Administrar historial de reportes.</p>
                  </CardContent>
                </Card>
              </Link>

              {/* Row 3 - Naranja para Clientes y Atención al Cliente */}
              <Link href="/clientes">
                <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full hover:-translate-y-2">
                  <CardContent className="p-6 text-center flex flex-col justify-center h-full">
                    <User className="h-10 w-10 text-orange-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestionar Clientes</h3>
                    <p className="text-sm text-gray-600">Administrar información y reportes de clientes.</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/atencion-cliente">
                <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full relative hover:-translate-y-2">
                  <CardContent className="p-6 text-center flex flex-col justify-center h-full">
                    <MessageCircle className="h-10 w-10 text-orange-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Atención al Cliente</h3>
                    <p className="text-sm text-gray-600">Administrar mensajes y respuestas de clientes.</p>
                    
                    {/* Indicador de desarrollo */}
                    <div className="absolute -top-2 -right-2">
                      <div className="relative">
                        <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs px-3 py-1 rounded-full shadow-lg animate-pulse">
                          ✨ En desarollo
                        </Badge>
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-30 animate-ping"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Form Viewer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* DialogTitle oculto para accesibilidad */}
          <VisuallyHidden asChild>
            <DialogTitle>Reporte H-1114</DialogTitle>
          </VisuallyHidden>
          {/* El encabezado visual se muestra solo dentro de FormViewer */}
          {selectedForm && <FormViewer formData={selectedForm} clienteCompleto={getClienteByNumero(selectedForm.cliente?.numero)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
