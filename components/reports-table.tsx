"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, FileText, Calendar, MapPin, Users } from "lucide-react"
import type { FormData } from "@/lib/types"

interface ReportsTableProps {
  reports: FormData[]
  reportStatuses: Record<string, "Revisado" | "No Revisado">
  onView: (report: FormData) => void
}

export function ReportsTable({ reports, reportStatuses, onView }: ReportsTableProps) {
  const getServiceTypeLabel = (value: string) => {
    const types = {
      inversion: "Inversión",
      mantenimiento: "Mantenimiento",
      averia: "Avería",
    }
    return types[value as keyof typeof types] || value
  }

  const getServiceTypeBadgeColor = (value: string) => {
    const colors = {
      inversion: "bg-blue-100 text-blue-800 border-blue-200",
      mantenimiento: "bg-yellow-100 text-yellow-800 border-yellow-200",
      averia: "bg-red-100 text-red-800 border-red-200",
    }
    return colors[value as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron reportes</h3>
        <p className="text-gray-600">No hay reportes que coincidan con los filtros aplicados.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Reporte</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Tipo de Servicio</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Brigada</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Ubicación</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => {
            const status = reportStatuses[report.formId]
            return (
              <tr key={report.formId} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-lg ${
                        status === "Revisado"
                          ? "bg-gradient-to-r from-green-500 to-green-600"
                          : "bg-gradient-to-r from-gray-400 to-gray-500"
                      }`}
                    >
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{report.formId}</p>
                      <p className="text-sm text-gray-600">{report.materials.length} materiales utilizados</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <Badge variant="outline" className={getServiceTypeBadgeColor(report.serviceType)}>
                    {getServiceTypeLabel(report.serviceType)}
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900">{report.brigade.leader}</p>
                      <p className="text-sm text-gray-600">{report.brigade.members.length} miembros</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-sm text-gray-900 max-w-xs truncate">{report.location.address}</p>
                      <p className="text-xs text-gray-600">{report.location.distanceFromHQ} km de HQ</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    <div>
                      <p className="text-sm text-gray-900">
                        {new Date(report.dateTime.date).toLocaleDateString("es-CO")}
                      </p>
                      <p className="text-xs text-gray-600">{report.dateTime.time}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <Badge
                    variant={status === "Revisado" ? "default" : "outline"}
                    className={
                      status === "Revisado"
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-green-50 text-green-700 border-green-200"
                    }
                  >
                    {status}
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onView(report)}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
