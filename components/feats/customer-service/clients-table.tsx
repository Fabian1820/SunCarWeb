"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Label } from "@/components/shared/atom/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/shared/molecule/dialog"
import { Input } from "@/components/shared/molecule/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shared/molecule/popover"
import { Checkbox } from "@/components/shared/molecule/checkbox"
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
  Search,
  ChevronDown,
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

const CLIENT_ESTADOS = [
  "Equipo instalado con éxito",
  "Pendiente de instalación",
  "Instalacion en proceso",
]

const LEAD_FUENTES = [
  "Página Web",
  "Instagram",
  "Facebook",
  "Directo",
  "Mensaje de Whatsapp",
  "Visita",
]

const LEAD_COMERCIALES = [
  "Enelido Alexander Calero Perez",
  "Yanet Clara Rodríguez Quintana",
  "Dashel Pinillos Zubiaur",
  "Gretel María Mojena Almenares",
]

const buildSearchText = (client: Cliente) => {
  const parts: string[] = []
  const visited = new WeakSet<object>()

  const addValue = (value: unknown) => {
    if (value === null || value === undefined) return
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      parts.push(String(value))
      return
    }
    if (value instanceof Date) {
      parts.push(value.toISOString())
      return
    }
    if (Array.isArray(value)) {
      value.forEach(addValue)
      return
    }
    if (typeof value === "object") {
      if (visited.has(value)) return
      visited.add(value)
      Object.values(value as Record<string, unknown>).forEach(addValue)
    }
  }

  addValue(client)
  return parts.join(" ").toLowerCase()
}

const parseDateValue = (value?: string) => {
  if (!value) return null
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split("/").map(Number)
    const parsed = new Date(year, month - 1, day)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
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
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    estado: [] as string[],
    fuente: "",
    comercial: "",
    fechaDesde: "",
    fechaHasta: "",
  })

  const ofertasDelCliente = useMemo(() => {
    if (!clientForOfertas) return []
    // Usar solo el ID de MongoDB para filtrar ofertas
    const clienteId = clientForOfertas.id
    if (!clienteId) return []
    return ofertas.filter((o) => o.cliente_id === clienteId)
  }, [ofertas, clientForOfertas])

  const availableEstados = CLIENT_ESTADOS
  const availableFuentes = LEAD_FUENTES
  const availableComerciales = LEAD_COMERCIALES

  const toggleEstado = (estado: string) => {
    setFilters((prev) => {
      const next = prev.estado.includes(estado)
        ? prev.estado.filter((value) => value !== estado)
        : [...prev.estado, estado]
      return { ...prev, estado: next }
    })
  }

  const filteredClients = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    const fechaDesde = parseDateValue(filters.fechaDesde)
    const fechaHasta = parseDateValue(filters.fechaHasta)
    const selectedEstados = filters.estado.map((estado) => estado.toLowerCase())
    const selectedFuente = filters.fuente.trim().toLowerCase()
    const selectedComercial = filters.comercial.trim().toLowerCase()

    if (fechaDesde) fechaDesde.setHours(0, 0, 0, 0)
    if (fechaHasta) fechaHasta.setHours(23, 59, 59, 999)

    return clients.filter((client) => {
      if (search) {
        const text = buildSearchText(client)
        if (!text.includes(search)) {
          return false
        }
      }

      if (filters.estado.length > 0) {
        const estado = client.estado?.trim()
        if (!estado || !selectedEstados.includes(estado.toLowerCase())) {
          return false
        }
      }

      if (filters.fuente) {
        const fuente = client.fuente?.trim().toLowerCase()
        if (!fuente || fuente !== selectedFuente) {
          return false
        }
      }

      if (filters.comercial) {
        const comercial = client.comercial?.trim().toLowerCase()
        if (!comercial || comercial !== selectedComercial) {
          return false
        }
      }

      if (fechaDesde || fechaHasta) {
        const fecha = parseDateValue(client.fecha_contacto)
        if (!fecha) return false
        if (fechaDesde && fecha < fechaDesde) return false
        if (fechaHasta && fecha > fechaHasta) return false
      }

      return true
    })
  }, [clients, searchTerm, filters])

  const hasActiveFilters =
    searchTerm.trim() ||
    filters.estado.length > 0 ||
    filters.fuente ||
    filters.comercial ||
    filters.fechaDesde ||
    filters.fechaHasta

  const handleClearFilters = () => {
    setSearchTerm("")
    setFilters({
      estado: [],
      fuente: "",
      comercial: "",
      fechaDesde: "",
      fechaHasta: "",
    })
  }

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
    // Usar solo el ID de MongoDB del cliente
    const clienteId = clientForOfertas?.id
    if (!clienteId) {
      toast({
        title: "Error",
        description: "El cliente no tiene un ID válido de MongoDB.",
        variant: "destructive",
      })
      return
    }
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
    // Usar solo el ID de MongoDB del cliente
    const clienteId = clientForOfertas?.id
    if (!clienteId || !id) {
      toast({
        title: "Error",
        description: "El cliente no tiene un ID válido de MongoDB.",
        variant: "destructive",
      })
      return
    }
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

  return (
    <>
      <Card className="mb-6 border-l-4 border-l-orange-600">
        <CardContent className="p-6">
        <div className="flex gap-3 mb-4 flex-col sm:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="search-client"
              placeholder="Buscar por cualquier dato..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="text-gray-600 hover:text-gray-800 whitespace-nowrap"
            disabled={!hasActiveFilters}
          >
            Limpiar Filtros
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="truncate">
                    {filters.estado.length > 0
                      ? `${filters.estado.length} estado${filters.estado.length > 1 ? "s" : ""}`
                      : "Todos los estados"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm text-gray-700">Estado</Label>
                  {filters.estado.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setFilters((prev) => ({ ...prev, estado: [] }))}
                    >
                      Limpiar
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {availableEstados.map((estado) => (
                    <label key={estado} className="flex items-center gap-2 text-sm text-gray-700">
                      <Checkbox
                        checked={filters.estado.includes(estado)}
                        onCheckedChange={() => toggleEstado(estado)}
                      />
                      <span>{estado}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Select
              value={filters.fuente || "todas"}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, fuente: value === "todas" ? "" : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas las fuentes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las fuentes</SelectItem>
                {availableFuentes.map((fuente) => (
                  <SelectItem key={fuente} value={fuente}>
                    {fuente}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={filters.comercial || "todos"}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, comercial: value === "todos" ? "" : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los comerciales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los comerciales</SelectItem>
                {availableComerciales.map((comercial) => (
                  <SelectItem key={comercial} value={comercial}>
                    {comercial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Input
              type="date"
              value={filters.fechaDesde}
              onChange={(event) => setFilters((prev) => ({ ...prev, fechaDesde: event.target.value }))}
              placeholder="Fecha desde"
            />
          </div>

          <div>
            <Input
              type="date"
              value={filters.fechaHasta}
              onChange={(event) => setFilters((prev) => ({ ...prev, fechaHasta: event.target.value }))}
              placeholder="Fecha hasta"
            />
          </div>
        </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-orange-600">
        <CardHeader>
          <CardTitle>Clientes</CardTitle>
          <CardDescription>
            Mostrando {filteredClients.length} cliente{filteredClients.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron clientes</h3>
              <p className="text-gray-600">No hay clientes que coincidan con los filtros aplicados.</p>
            </div>
          ) : (
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
                  {filteredClients.map((client) => (
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
                            <span>{client.telefono || "Sin telefono"}</span>
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
                            title={client.latitud && client.longitud ? "Ver ubicacion" : "Sin ubicacion registrada"}
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
          )}
        </CardContent>
      </Card>


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
              disabled={!clientForOfertas?.id}
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
        defaultClienteId={clientForOfertas?.id || ''}
        lockContactType="cliente"
        lockClienteId={clientForOfertas?.id || ''}
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
        lockClienteId={clientForOfertas?.id || ''}
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
