"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Badge } from "@/components/shared/atom/badge"
import { Sun, FileText, Users, FileCheck, Calendar, Package, User } from "lucide-react"
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
                <h1 className="text-2xl font-bold text-gray-900">SunCar Admin</h1>
                <p className="text-sm text-gray-600">Sistema de Gestión de Instalaciones</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Recent Forms */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileCheck className="h-5 w-5 text-green-500" />
              <span>Reportes Recientes</span>
            </CardTitle>
            <CardDescription>Últimos reportes H-1114 registrados en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <Loader label="Cargando reportes recientes..." />
              ) : recentReports.length === 0 ? (
                <div className="text-gray-500 text-center py-4">No hay reportes recientes.</div>
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

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Módulos del sistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/brigadas">
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestionar Brigadas</h3>
                  <p className="text-sm text-gray-600">Administrar equipos de trabajo y asignaciones</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/materiales">
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Package className="h-12 w-12 text-amber-700 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestionar Materiales</h3>
                  <p className="text-sm text-gray-600">Administrar catálogo de materiales y componentes</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/reportes">
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <FileCheck className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestionar Reportes</h3>
                  <p className="text-sm text-gray-600">Administrar historial de reportes</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/clientes">
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <User className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestionar Clientes</h3>
                  <p className="text-sm text-gray-600">Administrar información y reportes de clientes</p>
                </CardContent>
              </Card>
            </Link>
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
