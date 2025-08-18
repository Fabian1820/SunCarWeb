"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import {
  FileCheck,
  Search,
  Eye,
  Wrench,
  User,
  MapPin,
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  Map,
  Edit,
  Trash2
} from "lucide-react"
import { ReportsTable } from "@/components/feats/reports/reports-table"
import { ClienteService, ReporteService } from "@/lib/api-services"
import { ClientReportsChart } from "@/components/feats/reports/client-reports-chart"
import MapPicker from "@/components/shared/organism/MapPickerNoSSR"

interface ClientsTableProps {
  clients: any[]
  onEdit: (client: any) => void
  onDelete: (client: any) => void
  onViewLocation: (client: any) => void
  loading?: boolean
}

export function ClientsTable({ clients, onEdit, onDelete, onViewLocation, loading = false }: ClientsTableProps) {
  const [selectedClientReports, setSelectedClientReports] = useState<any[] | null>(null)
  const [selectedClient, setSelectedClient] = useState<any | null>(null)
  const [loadingClientReports, setLoadingClientReports] = useState(false)
  const [showClientLocation, setShowClientLocation] = useState(false)
  const [clientLocation, setClientLocation] = useState<{ lat: number, lng: number } | null>(null)

  // Acción para ver reportes de un cliente
  const handleViewClientReports = async (client: any) => {
    setSelectedClient(client)
    setLoadingClientReports(true)
    try {
      const data = await ReporteService.getReportesPorCliente(client.numero)
      setSelectedClientReports(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setSelectedClientReports([])
    } finally {
      setLoadingClientReports(false)
    }
  }

  // Acción para ver ubicación del cliente
  const handleViewClientLocation = (client: any) => {
    if (client.latitud && client.longitud) {
      setClientLocation({ lat: parseFloat(client.latitud), lng: parseFloat(client.longitud) })
      setShowClientLocation(true)
    }
  }

  // Columnas para reportes (para el modal de reportes de cliente)
  const reportColumns = [
    { key: "tipo_reporte", label: "Tipo de Servicio" },
    { key: "cliente", label: "Cliente", render: (row: any) => row.cliente?.numero || "-" },
    { key: "brigada", label: "Líder", render: (row: any) => row.brigada?.lider?.nombre || "-" },
    { key: "fecha_hora", label: "Fecha", render: (row: any) => row.fecha_hora?.fecha || "-" },
    { key: "descripcion", label: "Descripción", render: (row: any) => row.descripcion ? row.descripcion.slice(0, 40) + (row.descripcion.length > 40 ? '...' : '') : "-" },
  ]

  if (clients.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron clientes</h3>
        <p className="text-gray-600">No hay clientes que coincidan con los filtros aplicados.</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Cliente</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Número</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Dirección</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client._id || client.numero} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <Building2 className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{client.nombre}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <Badge variant="outline" className="bg-gray-50">
                    {client.numero}
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <div className="max-w-xs">
                    <p className="text-sm text-gray-600 truncate">{client.direccion}</p>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(client)}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        title="Editar cliente"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(client)}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        title="Eliminar cliente"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewClientLocation(client)}
                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                        disabled={!client.latitud || !client.longitud}
                        title={client.latitud && client.longitud ? "Ver ubicación" : "Sin ubicación registrada"}
                    >
                      <MapPin className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewClientReports(client)}
                      className="border-green-300 text-emerald-600 hover:bg-green-50"
                      title="Ver reportes del cliente"
                    >
                      <FileCheck className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de reportes de cliente */}
      <Dialog open={!!selectedClientReports} onOpenChange={v => { if (!v) { setSelectedClientReports(null); setSelectedClient(null); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reportes de {selectedClient?.nombre || selectedClient?.numero}</DialogTitle>
          </DialogHeader>
          {loadingClientReports ? (
            <div className="text-center py-8">Cargando reportes...</div>
          ) : (
            <>
              <ClientReportsChart reports={selectedClientReports || []} />
              <ReportsTable
                data={selectedClientReports || []}
                columns={reportColumns}
                getRowId={(row) => row._id || row.id}
                loading={loadingClientReports}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal para ver ubicación del cliente */}
      <Dialog open={showClientLocation} onOpenChange={setShowClientLocation}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Ubicación del cliente</DialogTitle>
          </DialogHeader>
          {clientLocation ? (
            <MapPicker
              initialLat={clientLocation.lat}
              initialLng={clientLocation.lng}
            />
          ) : (
            <div className="text-gray-500">No hay ubicación registrada para este cliente.</div>
          )}
          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setShowClientLocation(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
