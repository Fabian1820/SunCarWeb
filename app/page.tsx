"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sun, FileText, Users, FileCheck, Calendar, Package } from "lucide-react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FormViewer } from "@/components/form-viewer"

export default function Dashboard() {
  const [selectedForm, setSelectedForm] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const recentForms = [
    { id: "H1114-001", brigade: "Brigada Alpha", location: "Zona Norte", status: "Revisado", date: "2024-01-15" },
    { id: "H1114-002", brigade: "Brigada Beta", location: "Zona Sur", status: "No Revisado", date: "2024-01-16" },
    { id: "H1114-003", brigade: "Brigada Gamma", location: "Zona Este", status: "No Revisado", date: "2024-01-17" },
  ]

  // Datos simulados de formularios completos
  const formsData = {
    "H1114-001": {
      formId: "H1114-001",
      serviceType: "inversion",
      brigade: {
        leader: "Carlos Rodríguez",
        members: ["Ana García", "Luis Martínez", "Pedro Sánchez"],
      },
      materials: [
        { id: "1", name: "Panel Solar 450W", type: "Panel Solar", brand: "Canadian Solar" },
        { id: "2", name: "Inversor 5kW", type: "Inversor", brand: "Fronius" },
        { id: "3", name: "Cable DC 4mm", type: "Cable", brand: "Prysmian" },
      ],
      location: {
        address: "Calle 123 #45-67, Bogotá, Colombia",
        coordinates: { lat: 4.6097, lng: -74.0817 },
        distanceFromHQ: 15.5,
      },
      photos: [
        {
          id: "1",
          preview: "/placeholder.svg?height=300&width=400",
          description: "Instalación de paneles en el techo",
        },
        { id: "2", preview: "/placeholder.svg?height=300&width=400", description: "Conexiones eléctricas completadas" },
      ],
      dateTime: { date: "2024-01-15", time: "14:30" },
    },
    "H1114-002": {
      formId: "H1114-002",
      serviceType: "mantenimiento",
      brigade: {
        leader: "María López",
        members: ["Juan Pérez", "Sofia Herrera"],
      },
      materials: [
        { id: "1", name: "Panel Solar 400W", type: "Panel Solar", brand: "Jinko Solar" },
        { id: "2", name: "Batería Litio 100Ah", type: "Batería", brand: "Tesla" },
      ],
      location: {
        address: "Carrera 45 #12-34, Medellín, Colombia",
        coordinates: { lat: 6.2442, lng: -75.5812 },
        distanceFromHQ: 240.8,
      },
      photos: [{ id: "1", preview: "/placeholder.svg?height=300&width=400", description: "Trabajo en progreso" }],
      dateTime: { date: "2024-01-16", time: "09:15" },
      description: "Mantenimiento preventivo de paneles solares, limpieza y revisión de conexiones eléctricas.",
    },
  }

  const openFormDialog = (formId: string) => {
    const formData = formsData[formId as keyof typeof formsData]
    if (formData) {
      setSelectedForm(formData)
      setIsDialogOpen(true)
    }
  }

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
              {recentForms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => openFormDialog(form.id)}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`p-2 rounded-lg ${
                        form.status === "Revisado"
                          ? "bg-gradient-to-r from-green-500 to-green-600"
                          : "bg-gradient-to-r from-gray-400 to-gray-500"
                      }`}
                    >
                      <FileCheck className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{form.id}</p>
                      <p className="text-sm text-gray-600">
                        {form.brigade} • {form.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge
                      variant={form.status === "Revisado" ? "default" : "outline"}
                      className={
                        form.status === "Revisado"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : "bg-green-50 text-green-700 border-green-200"
                      }
                    >
                      {form.status}
                    </Badge>
                    <span className="text-sm text-gray-500">{form.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
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
        </div>
      </main>

      {/* Form Viewer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Reporte {selectedForm?.formId}</DialogTitle>
          </DialogHeader>
          {selectedForm && <FormViewer formData={selectedForm} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
