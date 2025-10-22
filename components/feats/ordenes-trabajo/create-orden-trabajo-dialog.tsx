"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Calendar } from "@/components/shared/molecule/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shared/molecule/popover"
import { CalendarIcon, Plus, User, MapPin } from "lucide-react"
import { format, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { BrigadaService, ClienteService } from "@/lib/api-services"
import { LocalClientesService } from "@/lib/local-storage-clientes"
import type { Brigada } from "@/lib/brigade-types"
import type { CreateOrdenTrabajoRequest, TipoReporte } from "@/lib/api-types"
import { useToast } from "@/hooks/use-toast"
import MapPicker from "@/components/shared/organism/MapPickerNoSSR"

interface CreateOrdenTrabajoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (data: any) => void
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

  // Modo de cliente: 'select' o 'create'
  const [clienteMode, setClienteMode] = useState<'select' | 'create'>('select')

  // Datos del formulario
  const [brigadaLiderCI, setBrigadaLiderCI] = useState("")
  const [clienteNumero, setClienteNumero] = useState("")
  const [tipoReporte, setTipoReporte] = useState<TipoReporte | "">("")
  const [fechaEjecucion, setFechaEjecucion] = useState<Date>(addDays(new Date(), 1))
  const [comentarios, setComentarios] = useState("")

  // Datos para crear nuevo cliente
  const [nuevoClienteNumero, setNuevoClienteNumero] = useState("")
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState("")
  const [nuevoClienteDireccion, setNuevoClienteDireccion] = useState("")
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState("")
  const [nuevoClienteCI, setNuevoClienteCI] = useState("")
  const [nuevoClienteEquipo, setNuevoClienteEquipo] = useState("")
  const [nuevoClienteFechaInstalacion, setNuevoClienteFechaInstalacion] = useState<Date | undefined>(undefined)
  const [nuevoClienteLatLng, setNuevoClienteLatLng] = useState<{ lat: string, lng: string }>({ lat: '', lng: '' })
  const [showMapModalNewClient, setShowMapModalNewClient] = useState(false)

  // Cargar brigadas y clientes
  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    setLoadingData(true)
    try {
      const [brigadasData, clientesData] = await Promise.all([
        BrigadaService.getAllBrigadas(),
        ClienteService.getClientes()
      ])

      console.log('📊 Datos cargados:', { brigadasData, clientesData })

      setBrigadas(Array.isArray(brigadasData) ? brigadasData : [])

      // ClienteService.getClientes() devuelve { data: Cliente[], success: boolean, message: string }
      if (clientesData && clientesData.data && Array.isArray(clientesData.data)) {
        setClientes(clientesData.data)
      } else if (Array.isArray(clientesData)) {
        // Por si acaso devuelve directamente el array
        setClientes(clientesData)
      } else {
        setClientes([])
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
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

    setLoading(true)

    try {
      let finalClienteNumero = clienteNumero.trim()

      // Si el modo es crear, primero crear el cliente en el backend
      if (clienteMode === 'create') {
        if (!nuevoClienteNumero || !nuevoClienteNombre || !nuevoClienteDireccion) {
          toast({
            title: "Error",
            description: "Completa todos los campos del nuevo cliente",
            variant: "destructive",
          })
          setLoading(false)
          return
        }

        // Crear cliente usando el endpoint apropiado
        try {
          // Preparar datos del cliente - SOLO campos obligatorios
          const clienteData: any = {
            numero: nuevoClienteNumero,
            nombre: nuevoClienteNombre,
            direccion: nuevoClienteDireccion,
          }

          // Agregar campos opcionales SOLO si tienen valor
          if (nuevoClienteLatLng.lat && nuevoClienteLatLng.lat.trim()) clienteData.latitud = nuevoClienteLatLng.lat
          if (nuevoClienteLatLng.lng && nuevoClienteLatLng.lng.trim()) clienteData.longitud = nuevoClienteLatLng.lng
          if (nuevoClienteTelefono && nuevoClienteTelefono.trim()) clienteData.telefono = nuevoClienteTelefono
          if (nuevoClienteCI && nuevoClienteCI.trim()) clienteData.carnet_identidad = nuevoClienteCI
          if (nuevoClienteEquipo && nuevoClienteEquipo.trim()) clienteData.equipo_instalado = nuevoClienteEquipo
          if (nuevoClienteFechaInstalacion) clienteData.fecha_instalacion = nuevoClienteFechaInstalacion.toISOString()

          // Si tiene latitud y longitud, usar endpoint completo, sino usar simple
          const clienteResponse = (nuevoClienteLatLng.lat && nuevoClienteLatLng.lng)
            ? await ClienteService.crearCliente(clienteData)
            : await ClienteService.crearClienteSimple(clienteData)

          if (!clienteResponse.success) {
            throw new Error(clienteResponse.message || "Error al crear el cliente")
          }

          console.log('✅ Cliente creado en el backend:', clienteResponse.data)
        } catch (err: any) {
          toast({
            title: "Error al crear cliente",
            description: err.message || "No se pudo crear el cliente en el backend",
            variant: "destructive",
          })
          setLoading(false)
          return
        }

        finalClienteNumero = nuevoClienteNumero.trim()
      } else {
        // Modo seleccionar
        if (!finalClienteNumero) {
          toast({
            title: "Error",
            description: "Debes seleccionar un cliente",
            variant: "destructive",
          })
          setLoading(false)
          return
        }
      }

      // Validar/normalizar el identificador del cliente contra el backend
      try {
        const verifyResponse = await ClienteService.verificarClientePorIdentificador(finalClienteNumero)
        if (!verifyResponse.success || !verifyResponse.data?.numero) {
          throw new Error(verifyResponse.message || 'No se encontró el cliente proporcionado')
        }
        finalClienteNumero = verifyResponse.data.numero
      } catch (verificationError: any) {
        toast({
          title: "Cliente no válido",
          description:
            verificationError?.message ||
            "No se pudo validar el identificador del cliente. Verifica el número o teléfono ingresado.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Crear la orden de trabajo con la estructura correcta del backend
      const ordenData: CreateOrdenTrabajoRequest = {
        brigada_lider_ci: brigadaLiderCI,
        cliente_numero: finalClienteNumero,
        tipo_reporte: tipoReporte as TipoReporte,
        fecha: fechaEjecucion.toISOString(),
        comentarios: comentarios || undefined,
      }

      onSuccess({ ordenData })

      // Limpiar formulario
      resetForm()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error al crear orden de trabajo:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la orden de trabajo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setBrigadaLiderCI("")
    setClienteNumero("")
    setTipoReporte("")
    setFechaEjecucion(addDays(new Date(), 1))
    setComentarios("")
    setClienteMode('select')
    setNuevoClienteNumero("")
    setNuevoClienteNombre("")
    setNuevoClienteDireccion("")
    setNuevoClienteTelefono("")
    setNuevoClienteCI("")
    setNuevoClienteEquipo("")
    setNuevoClienteFechaInstalacion(undefined)
    setNuevoClienteLatLng({ lat: '', lng: '' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nueva Orden de Trabajo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
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

          {/* Modo de cliente: Seleccionar o Crear */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Cliente *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setClienteMode(clienteMode === 'select' ? 'create' : 'select')}
                className="text-orange-600 hover:text-orange-700"
              >
                {clienteMode === 'select' ? (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Crear nuevo cliente
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4 mr-1" />
                    Seleccionar cliente existente
                  </>
                )}
              </Button>
            </div>

            {clienteMode === 'select' ? (
              <Select value={clienteNumero} onValueChange={setClienteNumero} disabled={loadingData}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.numero} value={cliente.numero}>
                      {cliente.nombre} ({cliente.numero})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-3 p-4 border rounded-md bg-orange-50/50 max-h-[400px] overflow-y-auto">
                <p className="text-sm text-gray-600 mb-2">Los campos marcados con * son obligatorios</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="nuevoClienteNumero">Número de Cliente *</Label>
                    <Input
                      id="nuevoClienteNumero"
                      value={nuevoClienteNumero}
                      onChange={(e) => setNuevoClienteNumero(e.target.value)}
                      placeholder="Ej: SUN-001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nuevoClienteNombre">Nombre Completo *</Label>
                    <Input
                      id="nuevoClienteNombre"
                      value={nuevoClienteNombre}
                      onChange={(e) => setNuevoClienteNombre(e.target.value)}
                      placeholder="Juan Pérez García"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="nuevoClienteDireccion">Dirección *</Label>
                  <Input
                    id="nuevoClienteDireccion"
                    value={nuevoClienteDireccion}
                    onChange={(e) => setNuevoClienteDireccion(e.target.value)}
                    placeholder="Calle 123, Vedado, La Habana"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="nuevoClienteTelefono">Teléfono</Label>
                    <Input
                      id="nuevoClienteTelefono"
                      value={nuevoClienteTelefono}
                      onChange={(e) => setNuevoClienteTelefono(e.target.value)}
                      placeholder="555-1234"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nuevoClienteCI">Carnet de Identidad</Label>
                    <Input
                      id="nuevoClienteCI"
                      value={nuevoClienteCI}
                      onChange={(e) => setNuevoClienteCI(e.target.value)}
                      placeholder="12345678901"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="nuevoClienteEquipo">Equipo Instalado</Label>
                  <Input
                    id="nuevoClienteEquipo"
                    value={nuevoClienteEquipo}
                    onChange={(e) => setNuevoClienteEquipo(e.target.value)}
                    placeholder="Panel Solar 300W + Inversor 2000W"
                  />
                </div>

                <div>
                  <Label>Fecha de Instalación</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !nuevoClienteFechaInstalacion && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {nuevoClienteFechaInstalacion ? (
                          format(nuevoClienteFechaInstalacion, "PPP 'a las' p", { locale: es })
                        ) : (
                          <span>Seleccionar fecha (opcional)</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={nuevoClienteFechaInstalacion}
                        onSelect={setNuevoClienteFechaInstalacion}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Ubicación GPS</Label>
                  <div className="flex gap-2 items-center">
                    <Input value={nuevoClienteLatLng.lat} placeholder="Latitud" readOnly className="w-32" />
                    <Input value={nuevoClienteLatLng.lng} placeholder="Longitud" readOnly className="w-32" />
                    <Button
                      type="button"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => setShowMapModalNewClient(true)}
                    >
                      <MapPin className="h-4 w-4 mr-1" /> Seleccionar en mapa
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Usa el mapa para seleccionar la ubicación exacta del cliente
                  </p>
                </div>

                <p className="text-xs text-gray-500 italic">
                  Nota: Solo los campos marcados con * son obligatorios.
                </p>
              </div>
            )}
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
              className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white"
              disabled={loading || loadingData}
            >
              {loading ? 'Creando...' : 'Crear Orden de Trabajo'}
            </Button>
          </div>
        </form>

        {/* Modal de mapa para seleccionar ubicación del nuevo cliente */}
        <Dialog open={showMapModalNewClient} onOpenChange={setShowMapModalNewClient}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Seleccionar ubicación en el mapa</DialogTitle>
            </DialogHeader>
            <div className="mb-4 text-gray-700">Haz click en el mapa para seleccionar la ubicación del cliente.</div>
            <MapPicker
              initialLat={nuevoClienteLatLng.lat ? parseFloat(nuevoClienteLatLng.lat) : 23.1136}
              initialLng={nuevoClienteLatLng.lng ? parseFloat(nuevoClienteLatLng.lng) : -82.3666}
              onSelect={(lat: number, lng: number) => {
                setNuevoClienteLatLng({ lat: String(lat), lng: String(lng) })
              }}
            />
            <div className="flex justify-end pt-4">
              <Button type="button" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setShowMapModalNewClient(false)}>
                Confirmar ubicación
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
