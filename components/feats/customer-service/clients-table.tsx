"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/shared/molecule/dialog"
import {
  FileCheck,
  Eye,
  MapPin,
  Building2,
  Phone,
  Edit,
  Trash2,
  ListChecks,
  Plus,
} from "lucide-react"
import { ReportsTable } from "@/components/feats/reports/reports-table"
import { ReporteService } from "@/lib/api-services"
import { ClientReportsChart } from "@/components/feats/reports/client-reports-chart"
import MapPicker from "@/components/shared/organism/MapPickerNoSSR"
import { ClienteDetallesDialog } from "@/components/feats/customer/cliente-detalles-dialog"
import { useOfertasPersonalizadas } from "@/hooks/use-ofertas-personalizadas"
import { OfertasPersonalizadasTable } from "@/components/feats/ofertas-personalizadas/ofertas-personalizadas-table"
import { CreateOfertaDialog } from "@/components/feats/ofertas-personalizadas/create-oferta-dialog"
import { EditOfertaDialog } from "@/components/feats/ofertas-personalizadas/edit-oferta-dialog"
import type {
  OfertaPersonalizada,
  OfertaPersonalizadaCreateRequest,
  OfertaPersonalizadaUpdateRequest,
} from "@/lib/types/feats/ofertas-personalizadas/oferta-personalizada-types"
import { useToast } from "@/hooks/use-toast"
import type { Cliente } from "@/lib/api-types"

interface ClientsTableProps {
  clients: Cliente[]
  onEdit: (client: Cliente) => void
  onDelete: (client: Cliente) => void
  onViewLocation: (client: Cliente) => void
  loading?: boolean
}

export function ClientsTable({ clients, onEdit, onDelete, onViewLocation, loading = false }: ClientsTableProps) {
  const { toast } = useToast()
  const {
    ofertas,
    loading: ofertasLoading,
    createOferta,
    updateOferta,
    deleteOferta,
  } = useOfertasPersonalizadas()
  const [selectedClientReports, setSelectedClientReports] = useState<any[] | null>(null)
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null)
  const [loadingClientReports, setLoadingClientReports] = useState(false)
  const [showClientLocation, setShowClientLocation] = useState(false)
  const [clientLocation, setClientLocation] = useState<{ lat: number, lng: number } | null>(null)
  const [showClientDetails, setShowClientDetails] = useState(false)
  const [clientForDetails, setClientForDetails] = useState<Cliente | null>(null)
  const [showOfertasDialog, setShowOfertasDialog] = useState(false)
  const [clientForOfertas, setClientForOfertas] = useState<Cliente | null>(null)
  const [isCreateOfertaOpen, setIsCreateOfertaOpen] = useState(false)
  const [isEditOfertaOpen, setIsEditOfertaOpen] = useState(false)
  const [editingOferta, setEditingOferta] = useState<OfertaPersonalizada | null>(null)
  const [ofertaSubmitting, setOfertaSubmitting] = useState(false)

  const ofertasDelCliente = useMemo(() => {
    if (!clientForOfertas) return []
    const posiblesIds = [clientForOfertas.numero, (clientForOfertas as any)?._id].filter(Boolean) as string[]
    return ofertas.filter((o) => o.cliente_id && posiblesIds.includes(o.cliente_id))
  }, [ofertas, clientForOfertas])

  // Acción para ver reportes de un cliente
  const handleViewClientReports = async (client: Cliente) => {
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
  const handleViewClientLocation = (client: Cliente) => {
    if (client.latitud !== undefined && client.longitud !== undefined && client.latitud !== null && client.longitud !== null) {
      const lat = typeof client.latitud === 'number' ? client.latitud : parseFloat(client.latitud)
      const lng = typeof client.longitud === 'number' ? client.longitud : parseFloat(client.longitud)
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        setClientLocation({ lat, lng })
        setShowClientLocation(true)
      }
    }
  }

  // Acción para ver detalles completos del cliente
  const handleViewClientDetails = (client: Cliente) => {
    setClientForDetails(client)
    setShowClientDetails(true)
  }

  const openOfertasCliente = (client: Cliente) => {
    setClientForOfertas(client)
    setShowOfertasDialog(true)
  }

  const closeOfertasDialog = () => {
    setShowOfertasDialog(false)
    setClientForOfertas(null)
    setIsCreateOfertaOpen(false)
    setIsEditOfertaOpen(false)
    setEditingOferta(null)
  }

  const handleCreateOfertaCliente = async (payload: OfertaPersonalizadaCreateRequest) => {
    const clienteId = clientForOfertas?.numero || (clientForOfertas as any)?._id
    if (!clienteId) return
    setOfertaSubmitting(true)
    try {
      const success = await createOferta({
        ...payload,
        cliente_id: clienteId,
        lead_id: undefined,
      })
      toast({
        title: success ? "Oferta creada" : "No se pudo crear la oferta",
        description: success
          ? "Se registró la oferta personalizada para el cliente."
          : "Intenta nuevamente más tarde.",
        variant: success ? "default" : "destructive",
      })
      if (success) {
        setIsCreateOfertaOpen(false)
      }
    } finally {
      setOfertaSubmitting(false)
    }
  }

  const handleUpdateOfertaCliente = async (id: string, data: OfertaPersonalizadaUpdateRequest) => {
    const clienteId = clientForOfertas?.numero || (clientForOfertas as any)?._id
    if (!clienteId || !id) return
    setOfertaSubmitting(true)
    try {
      const success = await updateOferta(id, {
        ...data,
        cliente_id: clienteId,
        lead_id: undefined,
      })
      toast({
        title: success ? "Oferta actualizada" : "No se pudo actualizar la oferta",
        description: success
          ? "Cambios guardados correctamente."
          : "Intenta nuevamente más tarde.",
        variant: success ? "default" : "destructive",
      })
      if (success) {
        setIsEditOfertaOpen(false)
        setEditingOferta(null)
      }
    } finally {
      setOfertaSubmitting(false)
    }
  }

  const handleDeleteOfertaCliente = async (id: string) => {
    if (!id) return
    setOfertaSubmitting(true)
    try {
      const success = await deleteOferta(id)
      toast({
        title: success ? "Oferta eliminada" : "No se pudo eliminar",
        description: success ? "Se eliminó la oferta personalizada." : "Intenta nuevamente.",
        variant: success ? "default" : "destructive",
      })
    } finally {
      setOfertaSubmitting(false)
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
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Contacto</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Seguimiento</th>
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
                      <Badge variant="outline" className="bg-gray-50 mt-1">
                        {client.numero}
                      </Badge>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center text-sm text-gray-700 gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{client.telefono || 'Sin teléfono'}</span>
                    </div>
                    {client.telefono_adicional && (
                      <div className="text-xs text-gray-500 pl-6">
                        Secundario: {client.telefono_adicional}
                      </div>
                    )}
                    {client.direccion && (
                      <div className="text-xs text-gray-500 pl-6 truncate max-w-xs">
                        {client.direccion}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex flex-col gap-1">
                    {client.estado && (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 w-fit">
                        {client.estado}
                      </Badge>
                    )}
                    {client.comercial && (
                      <div className="text-xs text-gray-600">
                        Comercial: {client.comercial}
                      </div>
                    )}
                    {client.fuente && (
                      <div className="text-xs text-gray-500">
                        Fuente: {client.fuente}
                      </div>
                    )}
                    {client.fecha_contacto && (
                      <div className="text-xs text-gray-400">
                        Contacto: {client.fecha_contacto}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewClientDetails(client)}
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                      title="Ver detalles completos"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
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
                      onClick={() => openOfertasCliente(client)}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                      title="Ofertas personalizadas"
                    >
                      <ListChecks className="h-4 w-4" />
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
                      onClick={() => handleViewClientReports(client)}
                      className="border-green-300 text-emerald-600 hover:bg-green-50"
                      title="Ver reportes del cliente"
                    >
                      <FileCheck className="h-4 w-4" />
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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ofertas personalizadas */}
      <Dialog
        open={showOfertasDialog}
        onOpenChange={(open) => {
          setShowOfertasDialog(open)
          if (!open) {
            closeOfertasDialog()
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ofertas personalizadas del cliente</DialogTitle>
            <DialogDescription>
              {clientForOfertas ? `${clientForOfertas.nombre} (${clientForOfertas.numero})` : 'Selecciona un cliente'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              {ofertasDelCliente.length} {ofertasDelCliente.length === 1 ? 'oferta' : 'ofertas'} asociadas.
            </div>
            <Button
              onClick={() => setIsCreateOfertaOpen(true)}
              disabled={!clientForOfertas?.numero}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva oferta
            </Button>
          </div>
          <OfertasPersonalizadasTable
            ofertas={ofertasDelCliente}
            onEdit={(oferta) => {
              setEditingOferta(oferta)
              setIsEditOfertaOpen(true)
            }}
            onDelete={handleDeleteOfertaCliente}
            loading={ofertasLoading || ofertaSubmitting}
          />
        </DialogContent>
      </Dialog>

      <CreateOfertaDialog
        open={isCreateOfertaOpen}
        onOpenChange={setIsCreateOfertaOpen}
        onSubmit={handleCreateOfertaCliente}
        isLoading={ofertaSubmitting}
        defaultContactType="cliente"
        defaultClienteId={
          clientForOfertas?.numero || (clientForOfertas as any)?._id || ''
        }
        lockContactType="cliente"
        lockClienteId={clientForOfertas?.numero || (clientForOfertas as any)?._id || ''}
      />

      <EditOfertaDialog
        open={isEditOfertaOpen}
        onOpenChange={(open) => {
          setIsEditOfertaOpen(open)
          if (!open) setEditingOferta(null)
        }}
        oferta={editingOferta}
        onSubmit={handleUpdateOfertaCliente}
        isLoading={ofertaSubmitting}
        lockContactType="cliente"
        lockClienteId={clientForOfertas?.numero || (clientForOfertas as any)?._id || ''}
      />

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

      {/* Modal de detalles completos del cliente */}
      <ClienteDetallesDialog
        open={showClientDetails}
        onOpenChange={setShowClientDetails}
        cliente={clientForDetails}
        onViewMap={handleViewClientLocation}
      />
    </>
  )
}
