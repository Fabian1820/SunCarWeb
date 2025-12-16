"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Calendar } from "@/components/shared/molecule/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shared/molecule/popover"
import { CalendarIcon, Plus, ListPlus, Trash2, Search } from "lucide-react"
import { format, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { BrigadaService, ClienteService } from "@/lib/api-services"
import type { Brigada } from "@/lib/brigade-types"
import type { CreateOrdenTrabajoItem, CreateOrdenTrabajoRequest, TipoReporte } from "@/lib/api-types"
import { useToast } from "@/hooks/use-toast"

interface CreateOrdenTrabajoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (data: { payload: CreateOrdenTrabajoRequest }) => void
}

export function CreateOrdenTrabajoDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateOrdenTrabajoDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [brigadas, setBrigadas] = useState<Brigada[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [clienteSearch, setClienteSearch] = useState("")

  // Datos del formulario
  const [brigadaLiderCI, setBrigadaLiderCI] = useState("")
  const [clienteNumero, setClienteNumero] = useState("")
  const [tipoReporte, setTipoReporte] = useState<TipoReporte | "">("")
  const [fechaEjecucion, setFechaEjecucion] = useState<Date>(addDays(new Date(), 1))
  const [comentarios, setComentarios] = useState("")
  const [comentarioTransporte, setComentarioTransporte] = useState("")

  const [ordenesPendientes, setOrdenesPendientes] = useState<CreateOrdenTrabajoItem[]>([])

  // Cargar brigadas y clientes
  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = setTimeout(() => {
      fetchClientes(clienteSearch)
    }, 350)
    return () => clearTimeout(handler)
  }, [clienteSearch, open])

  const loadData = async () => {
    setLoadingData(true)
    try {
      const [brigadasData, clientesData] = await Promise.all([
        BrigadaService.getAllBrigadas(),
        ClienteService.getClientes()
      ])

      console.log('📊 Datos cargados:', { brigadasData, clientesData })

      setBrigadas(Array.isArray(brigadasData) ? brigadasData : [])
      setClientes(Array.isArray(clientesData) ? clientesData : [])
    } catch (error) {
      console.error('Error al cargar datos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos necesarios",
        variant: "destructive",
      })
      setBrigadas([])
      setClientes([])
    } finally {
      setLoadingData(false)
    }
  }

  const fetchClientes = async (nombre?: string) => {
    setLoadingData(true)
    try {
      const data = await ClienteService.getClientes(nombre ? { nombre } : {})
      setClientes(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error al buscar clientes:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive",
      })
    } finally {
      setLoadingData(false)
    }
  }

  const handleAddOrden = (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (!brigadaLiderCI) {
      toast({
        title: "Error",
        description: "Debes seleccionar una brigada",
        variant: "destructive",
      })
      return
    }

    if (!tipoReporte) {
      toast({
        title: "Error",
        description: "Debes seleccionar un tipo de reporte",
        variant: "destructive",
      })
      return
    }

    if (!clienteNumero.trim()) {
      toast({
        title: "Error",
        description: "Debes seleccionar un cliente existente",
        variant: "destructive",
      })
      return
    }

    const nuevaOrden: CreateOrdenTrabajoItem = {
      brigada_lider_ci: brigadaLiderCI,
      cliente_numero: clienteNumero.trim(),
      tipo_reporte: tipoReporte as TipoReporte,
      fecha: fechaEjecucion.toISOString(),
      comentarios: comentarios || undefined,
      comentario_transporte: comentarioTransporte || undefined,
    }

    setOrdenesPendientes((prev) => [...prev, nuevaOrden])
    setComentarios("")
    setComentarioTransporte("")
  }

  const handleCreateOrdenes = async () => {
    if (ordenesPendientes.length === 0) {
      toast({
        title: "Agrega al menos una orden",
        description: "Añade órdenes a la lista antes de crear.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const payload: CreateOrdenTrabajoRequest = { ordenes: ordenesPendientes }
      onSuccess({ payload })
      resetForm()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error al crear órdenes de trabajo:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudieron crear las órdenes de trabajo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredClientes = useMemo(() => {
    if (!clienteSearch.trim()) return clientes
    const searchLower = clienteSearch.toLowerCase()
    return clientes.filter((c) => c.nombre?.toLowerCase().includes(searchLower))
  }, [clientes, clienteSearch])

  const resetForm = () => {
    setBrigadaLiderCI("")
    setClienteNumero("")
    setTipoReporte("")
    setFechaEjecucion(addDays(new Date(), 1))
    setComentarios("")
    setComentarioTransporte("")
    setClienteSearch("")
    setOrdenesPendientes([])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nueva Orden de Trabajo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddOrden} className="space-y-6">
          {/* Selección de brigada - Usa CI del líder como valor */}
          <div>
            <Label htmlFor="brigada">Brigada *</Label>
            <Select value={brigadaLiderCI} onValueChange={setBrigadaLiderCI} disabled={loadingData}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una brigada" />
              </SelectTrigger>
              <SelectContent>
                {brigadas.map((brigada) => (
                  <SelectItem key={brigada.lider?.CI || brigada._id || brigada.id} value={brigada.lider?.CI || ''}>
                    {brigada.lider?.nombre || 'Sin líder'} {brigada.integrantes?.length > 0 && `(${brigada.integrantes.length} integrantes)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selección de cliente existente con búsqueda */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Cliente existente *</Label>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Search className="h-4 w-4" />
                Busca por nombre
              </div>
            </div>
            <Input
              placeholder="Escribe el nombre del cliente para buscar"
              value={clienteSearch}
              onChange={(e) => setClienteSearch(e.target.value)}
            />
            <Select value={clienteNumero} onValueChange={setClienteNumero} disabled={loadingData}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {filteredClientes.map((cliente) => (
                  <SelectItem key={cliente.numero} value={cliente.numero}>
                    {cliente.nombre} ({cliente.numero})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de reporte */}
          <div>
            <Label htmlFor="tipoReporte">Tipo de Reporte *</Label>
            <Select value={tipoReporte} onValueChange={(value) => setTipoReporte(value as TipoReporte)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de reporte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inversion">Inversión</SelectItem>
                <SelectItem value="averia">Avería</SelectItem>
                <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fecha de ejecución */}
          <div>
            <Label>Fecha de Ejecución *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !fechaEjecucion && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaEjecucion ? (
                    format(fechaEjecucion, "PPP", { locale: es })
                  ) : (
                    <span>Selecciona una fecha</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fechaEjecucion}
                  onSelect={(date) => date && setFechaEjecucion(date)}
                  locale={es}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-gray-500 mt-1">Por defecto: {format(addDays(new Date(), 1), "PPP", { locale: es })}</p>
          </div>

          {/* Comentarios */}
          <div>
            <Label htmlFor="comentarios">Comentarios (opcional)</Label>
            <Textarea
              id="comentarios"
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="Indicaciones específicas para la orden de trabajo..."
              rows={4}
            />
          </div>

          {/* Comentario transporte */}
          <div>
            <Label htmlFor="comentarioTransporte">Comentario de Transporte (opcional)</Label>
            <Textarea
              id="comentarioTransporte"
              value={comentarioTransporte}
              onChange={(e) => setComentarioTransporte(e.target.value)}
              placeholder="Disponibilidad u observaciones logísticas..."
              rows={3}
            />
          </div>

          {/* Lista de órdenes en cola */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ListPlus className="h-4 w-4 text-orange-600" />
              <p className="font-semibold text-gray-800">Órdenes en la lista ({ordenesPendientes.length})</p>
            </div>
            {ordenesPendientes.length === 0 ? (
              <p className="text-sm text-gray-500">Agrega órdenes y se enviarán todas juntas.</p>
            ) : (
              <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                {ordenesPendientes.map((orden, idx) => (
                  <div key={`${orden.cliente_numero}-${idx}`} className="p-3 flex items-start justify-between gap-3">
                    <div className="text-sm text-gray-700">
                      <p className="font-semibold">{orden.cliente_numero} · {orden.tipo_reporte.toUpperCase()}</p>
                      <p className="text-xs text-gray-500">Brigada líder: {orden.brigada_lider_ci}</p>
                      <p className="text-xs text-gray-500">
                        Fecha: {format(new Date(orden.fecha), "PPP", { locale: es })}
                      </p>
                      {orden.comentarios && <p className="text-xs text-gray-600 mt-1">💬 {orden.comentarios}</p>}
                      {orden.comentario_transporte && <p className="text-xs text-gray-600 mt-1">🚌 {orden.comentario_transporte}</p>}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setOrdenesPendientes((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm()
                onOpenChange(false)
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="secondary"
              className="border-orange-200 text-orange-700"
              disabled={loading || loadingData}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar a la lista
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white"
              disabled={loading || loadingData}
              onClick={handleCreateOrdenes}
            >
              {loading ? 'Creando...' : `Crear ${ordenesPendientes.length || ''} orden(es)`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
