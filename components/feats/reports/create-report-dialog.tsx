import { useState, useEffect } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Sun, Wrench, AlertTriangle, MapPin } from "lucide-react"
import { useBrigadasTrabajadores } from "@/hooks/use-brigadas-trabajadores"
import { useMaterials } from "@/hooks/use-materials"
import { useToast } from "@/hooks/use-toast"
import MapPicker from "@/components/shared/organism/MapPickerNoSSR"

export function CreateReportDialog({ open, onOpenChange, clients }: { open: boolean, onOpenChange: (v: boolean) => void, clients: any[] }) {
  console.log('CreateReportDialog - clients recibidos:', clients)
  const [tipoReporte, setTipoReporte] = useState<string>("")
  const [clienteNuevo, setClienteNuevo] = useState({ nombre: "", numero: "", direccion: "", latitud: "", longitud: "" })
  const [clienteExistente, setClienteExistente] = useState("")
  const [jefeBrigada, setJefeBrigada] = useState("")
  const [integrantes, setIntegrantes] = useState<string[]>([])
  type MaterialReporte = { nombre: string; cantidad: string; codigo: string | number; categoria: string; um: string };
  const [materiales, setMateriales] = useState<MaterialReporte[]>([])
  const [fecha, setFecha] = useState("")
  const [horaInicio, setHoraInicio] = useState("")
  const [horaFin, setHoraFin] = useState("")
  const [fechaLarga, setFechaLarga] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [showIntegrantesSelector, setShowIntegrantesSelector] = useState(false)
  const { materials, categories, loading: loadingMaterials, error: errorMaterials } = useMaterials()
  const [tipoMaterial, setTipoMaterial] = useState("")
  const [materialSeleccionado, setMaterialSeleccionado] = useState("")
  const [cantidadMaterial, setCantidadMaterial] = useState("")
  const { toast } = useToast()
  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [modoClienteInversion, setModoClienteInversion] = useState<"existente" | "nuevo">("existente")

  const { trabajadores, brigadas, loading: loadingTrabajadores, error: errorTrabajadores } = useBrigadasTrabajadores()

  useEffect(() => {
    if (!jefeBrigada) {
      setIntegrantes([])
      return
    }
    const brigada = brigadas.find(b => {
      const lider = b.lider;
      return lider && typeof lider === 'object' && lider !== null && typeof (lider as any).CI === 'string' && (lider as any).CI === jefeBrigada;
    });
    if (brigada && Array.isArray(brigada.integrantes)) {
      const integrantesCIs: string[] = brigada.integrantes
        .map((i: any) => {
          if (typeof i === 'string') return i;
          if (i && typeof i === 'object' && 'CI' in i && typeof i.CI === 'string') return i.CI;
          if (i && typeof i === 'object' && 'CI' in i && typeof i.CI === 'number') return String(i.CI);
          return null;
        })
        .filter((ci): ci is string => typeof ci === 'string' && !!ci);
      setIntegrantes(integrantesCIs)
    } else {
      setIntegrantes([])
    }
  }, [jefeBrigada, brigadas])

  const handleAddMaterial = () => {
    if (materialSeleccionado && cantidadMaterial && !isNaN(Number(cantidadMaterial))) {
      const mat = materials.find(m => (m.id || m.codigo) === materialSeleccionado)
      if (mat) {
        setMateriales([...materiales, { nombre: mat.descripcion, cantidad: cantidadMaterial, codigo: mat.codigo, categoria: mat.categoria, um: mat.um }])
        setMaterialSeleccionado("")
        setCantidadMaterial("")
      }
    }
  }
  const handleRemoveMaterial = (idx: number) => {
    setMateriales(materiales.filter((_, i) => i !== idx))
  }

  useEffect(() => {
    if (!fecha || !horaInicio || !horaFin) {
      const now = new Date()
      const yyyy = now.getFullYear()
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      const dateStr = `${yyyy}-${mm}-${dd}`
      const hh = String(now.getHours()).padStart(2, '0')
      const min = String(now.getMinutes()).padStart(2, '0')
      const timeStr = `${hh}:${min}`
      setFecha(f => f || dateStr)
      setHoraInicio(h => h || timeStr)
      setHoraFin(h => h || timeStr)
    }
  }, [])

  useEffect(() => {
    if (fecha) {
      const [yyyy, mm, dd] = fecha.split('-').map(Number)
      const dateObj = new Date(yyyy, mm - 1, dd)
      const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      // @ts-ignore
      setFechaLarga(dateObj.toLocaleDateString('es-ES', opciones))
    } else {
      setFechaLarga("")
    }
  }, [fecha])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingSubmit(true)
    setFormError(null)
    try {
      if (!tipoReporte) throw new Error("Selecciona el tipo de reporte")
      if (tipoReporte === "inversion" && modoClienteInversion === "nuevo" && (!clienteNuevo.nombre || !clienteNuevo.numero)) throw new Error("Completa los datos del cliente")
      if ((tipoReporte === "mantenimiento" || tipoReporte === "averia") && !clienteExistente) throw new Error("Selecciona un cliente existente")
      if (!jefeBrigada) throw new Error("Selecciona un jefe de brigada")
      if (integrantes.length === 0) throw new Error("Selecciona al menos un integrante")
      if (materiales.length === 0) throw new Error("Agrega al menos un material")
      if (!fecha || !horaInicio || !horaFin) throw new Error("Completa la fecha y las horas")
      if ((tipoReporte === "mantenimiento" || tipoReporte === "averia") && !descripcion.trim()) throw new Error("Agrega una descripción")

      let clienteParaReporte: any = null;
      if (tipoReporte === "inversion") {
        if (modoClienteInversion === "existente") {
          const clienteSeleccionado = clients.find(c => String(c.numero) === String(clienteExistente))
          if (!clienteSeleccionado) throw new Error("Selecciona un cliente existente")
          clienteParaReporte = clienteSeleccionado
        } else {
          const clienteExistenteObj = clients.find(c => String(c.numero) === String(clienteNuevo.numero))
          if (!clienteExistenteObj) {
            const resCliente = await fetch("/api/clientes/", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(clienteNuevo)
            })
            let dataCliente: any = null
            try {
              dataCliente = await resCliente.json()
            } catch (jsonErr) {
              throw new Error("Respuesta inesperada del servidor al crear cliente")
            }
            if (!resCliente.ok || !dataCliente.success) {
              let errorMsg = dataCliente.message || "Error al crear el cliente"
              if (dataCliente.errors && typeof dataCliente.errors === "object") {
                errorMsg += ": " + Object.entries(dataCliente.errors).map(([field, msg]) => `${field}: ${msg}`).join("; ")
              }
              throw new Error(errorMsg)
            }
            clienteParaReporte = dataCliente.data
          } else {
            clienteParaReporte = clienteExistenteObj
          }
        }
      } else {
        const clienteSeleccionado = clients.find(c => String(c.numero) === String(clienteExistente))
        if (!clienteSeleccionado) {
          throw new Error("El cliente seleccionado no existe. Debe crearse primero desde la sección de clientes.")
        } else {
          clienteParaReporte = clienteSeleccionado
        }
      }

      const formData = new FormData()
      formData.append("tipo_reporte", tipoReporte)
      formData.append("brigada", JSON.stringify({
        lider: trabajadores.find(w => w.CI === jefeBrigada),
        integrantes: integrantes.map(ci => trabajadores.find(w => w.CI === ci))
      }))
      formData.append("materiales", JSON.stringify(materiales.map(m => ({
        tipo: m.categoria, // categoria es el tipo de material
        nombre: m.nombre, // nombre del material
        unidad_medida: m.um, // um es la unidad de medida
        codigo_producto: m.codigo, // codigo es el codigo del producto
        cantidad: m.cantidad
      }))))
      formData.append("cliente", JSON.stringify(clienteParaReporte))
      formData.append("fecha_hora", JSON.stringify({ fecha, hora_inicio: horaInicio, hora_fin: horaFin }))
      if (tipoReporte === "mantenimiento" || tipoReporte === "averia") {
        formData.append("descripcion", descripcion)
      }
      let endpoint = ""
      if (tipoReporte === "inversion") endpoint = "/api/reportes/inversion"
      if (tipoReporte === "mantenimiento") endpoint = "/api/reportes/mantenimiento"
      if (tipoReporte === "averia") endpoint = "/api/reportes/averia"

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData
      })
      let data: any = null
      try {
        data = await res.json()
      } catch (jsonErr) {
        throw new Error("Respuesta inesperada del servidor")
      }
      if (!res.ok || !data.success) {
        let errorMsg = data.message || "Error al crear el reporte"
        if (data.errors && typeof data.errors === "object") {
          errorMsg += ": " + Object.entries(data.errors).map(([field, msg]) => `${field}: ${msg}`).join("; ")
        }
        throw new Error(errorMsg)
      }
      toast({ title: "Reporte creado", description: data.message, variant: "default" })
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("closeCreateReportModal"))
        window.dispatchEvent(new CustomEvent("refreshReportsTable"))
        window.dispatchEvent(new CustomEvent("refreshClientsTable"))
      }
    } catch (err: any) {
      setFormError(err.message || "Error desconocido")
      toast({
        title: "Error al crear el reporte",
        description: err.message || "Error desconocido",
        variant: "destructive"
      })
    } finally {
      setLoadingSubmit(false)
    }
  }

  if (loadingTrabajadores) {
    return <div className="text-center py-8 text-gray-500">Cargando trabajadores y jefes de brigada...</div>
  }
  if (errorTrabajadores) {
    return <div className="text-center py-8 text-red-500">Error al cargar trabajadores: {errorTrabajadores}</div>
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear nuevo reporte</DialogTitle>
        </DialogHeader>
        <form className="space-y-6 max-h-[70vh] overflow-y-auto pr-2" onSubmit={handleSubmit}>
          {formError && <div className="text-red-600 text-sm pb-2">{formError}</div>}
          {/* Tipo de reporte */}
          <div>
            <Label htmlFor="tipo-reporte">Tipo de reporte</Label>
            <Select value={tipoReporte} onValueChange={setTipoReporte}>
              <SelectTrigger id="tipo-reporte" className="mt-1 w-full">
                <SelectValue placeholder="Selecciona el tipo de reporte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inversion">
                  <span className="flex items-center gap-2"><Sun className="h-4 w-4 text-orange-500" /> Inversión</span>
                </SelectItem>
                <SelectItem value="mantenimiento">
                  <span className="flex items-center gap-2"><Wrench className="h-4 w-4 text-blue-600" /> Mantenimiento</span>
                </SelectItem>
                <SelectItem value="averia">
                  <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-600" /> Avería</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Brigada */}
          <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <Label className="font-semibold">Brigada</Label>
            <div>
              <Label>Jefe de Brigada</Label>
              <select className="w-full border rounded p-2 mt-1" value={jefeBrigada} onChange={e => setJefeBrigada(e.target.value)} title="Selecciona un jefe de brigada">
                <option value="">Selecciona un jefe...</option>
                {trabajadores.filter(w => w.tiene_contraseña).map(w => (
                  <option key={w.CI} value={w.CI}>{w.nombre} ({w.CI})</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Integrantes seleccionados</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {integrantes.map(ci => {
                  const w = trabajadores.find(t => t.CI === ci)
                  if (!w) return null
                  return (
                    <div key={ci} className="flex items-center bg-gray-100 text-gray-900 rounded px-3 py-1">
                      <span>{w.nombre} ({w.CI})</span>
                      <button
                        type="button"
                        className="ml-2 text-blue-700 hover:text-red-600 font-bold"
                        onClick={() => setIntegrantes(integrantes.filter(i => i !== ci))}
                        title="Quitar integrante"
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
                {integrantes.length === 0 && <span className="text-gray-400">Ningún integrante seleccionado</span>}
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={() => setShowIntegrantesSelector(v => !v)}
              >
                {showIntegrantesSelector ? 'Ocultar listado' : 'Agregar más integrantes'}
              </Button>
              {showIntegrantesSelector && (
                <div className="border rounded p-3 max-h-32 overflow-y-auto mt-2 bg-white">
                  {trabajadores.filter(w => !w.tiene_contraseña && w.CI !== jefeBrigada && !integrantes.includes(w.CI)).length === 0 ? (
                    <div className="text-gray-400 text-sm">No hay más trabajadores disponibles</div>
                  ) : (
                    trabajadores.filter(w => !w.tiene_contraseña && w.CI !== jefeBrigada && !integrantes.includes(w.CI)).map(w => (
                      <label key={w.CI} className="flex items-center space-x-2 cursor-pointer hover:bg-blue-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={e => {
                            if (e.target.checked) setIntegrantes([...integrantes, w.CI])
                          }}
                        />
                        <span>{w.nombre} ({w.CI})</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Materiales */}
          <div className="space-y-4 bg-amber-50 p-4 rounded-lg border border-amber-200">
            <Label className="font-semibold">Materiales utilizados</Label>
            {loadingMaterials ? (
              <div className="text-center text-amber-700">Cargando materiales...</div>
            ) : errorMaterials ? (
              <div className="text-center text-red-600">Error al cargar materiales</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <Label>Tipo</Label>
                  <select className="w-full border rounded p-2 mt-1" value={tipoMaterial} onChange={e => {
                    setTipoMaterial(e.target.value)
                    setMaterialSeleccionado("")
                  }} title="Selecciona un tipo de material">
                    <option value="">Selecciona un tipo...</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Material</Label>
                  <select
                    className="w-full border rounded p-2 mt-1"
                    value={materialSeleccionado}
                    onChange={e => setMaterialSeleccionado(e.target.value)}
                    disabled={!tipoMaterial}
                    title="Selecciona un material"
                  >
                    <option value="">{tipoMaterial ? "Selecciona un material..." : "Selecciona un tipo primero"}</option>
                    {materials.filter(m => m.categoria === tipoMaterial).map(m => (
                      <option key={m.id || m.codigo} value={m.id || m.codigo}>{m.descripcion} ({m.codigo})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Cantidad</Label>
                  <Input type="number" min="1" value={cantidadMaterial} onChange={e => setCantidadMaterial(e.target.value)} placeholder="Cantidad" disabled={!materialSeleccionado} />
                </div>
                <div>
                  <Button
                    type="button"
                    onClick={handleAddMaterial}
                    disabled={!materialSeleccionado || !cantidadMaterial || isNaN(Number(cantidadMaterial))}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            )}
            {materiales.length > 0 && (
              <div className="space-y-2 mt-4">
                {materiales.map((mat, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white border rounded p-2">
                    <span>{mat.nombre} (Cod: {mat.codigo}) - {mat.cantidad} {mat.um}</span>
                    <Button type="button" size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => handleRemoveMaterial(idx)}>Quitar</Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cliente */}
          {tipoReporte === "inversion" && (
            <div className="space-y-4 bg-green-50 p-4 rounded-lg border border-green-200">
              <Label className="font-semibold">Cliente</Label>
              <div className="flex gap-4 mb-2">
                <Button
                  type="button"
                  variant={modoClienteInversion === "existente" ? "default" : "outline"}
                  onClick={() => setModoClienteInversion("existente")}
                >
                  Seleccionar existente
                </Button>
                <Button
                  type="button"
                  variant={modoClienteInversion === "nuevo" ? "default" : "outline"}
                  onClick={() => setModoClienteInversion("nuevo")}
                >
                  Crear nuevo
                </Button>
              </div>
              {modoClienteInversion === "existente" ? (
                <div>
                  <Label>Selecciona un cliente existente</Label>
                  <select
                    className="w-full border rounded p-2 mt-1"
                    value={clienteExistente}
                    onChange={e => setClienteExistente(e.target.value)}
                    title="Selecciona un cliente existente"
                  >
                    <option value="">Selecciona un cliente...</option>
                    {clients.length === 0 ? (
                      <option value="" disabled>No hay clientes disponibles</option>
                    ) : (
                      clients.map((c) => (
                        <option key={c.numero} value={c.numero}>{c.nombre} ({c.numero})</option>
                      ))
                    )}
                  </select>
                  {clients.length === 0 && (
                    <p className="text-sm text-orange-600 mt-1">No hay clientes cargados. Ve a la sección de Clientes para crear algunos.</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cliente-nombre">Nombre</Label>
                    <Input id="cliente-nombre" name="cliente-nombre" placeholder="Nombre del cliente" value={clienteNuevo.nombre} onChange={e => setClienteNuevo({ ...clienteNuevo, nombre: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="cliente-numero">Número</Label>
                    <Input id="cliente-numero" name="cliente-numero" placeholder="Número identificador" value={clienteNuevo.numero} onChange={e => setClienteNuevo({ ...clienteNuevo, numero: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="cliente-direccion">Dirección</Label>
                    <div className="flex gap-2">
                      <Input id="cliente-direccion" name="cliente-direccion" placeholder="Dirección" value={clienteNuevo.direccion} onChange={e => setClienteNuevo({ ...clienteNuevo, direccion: e.target.value })} />
                      <Button type="button" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setShowMapModal(true)}>
                        <MapPin className="h-4 w-4 mr-1" /> Seleccionar ubicación en el mapa
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="cliente-latitud">Latitud</Label>
                    <Input id="cliente-latitud" name="cliente-latitud" placeholder="Latitud" value={clienteNuevo.latitud} onChange={e => setClienteNuevo({ ...clienteNuevo, latitud: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="cliente-longitud">Longitud</Label>
                    <Input id="cliente-longitud" name="cliente-longitud" placeholder="Longitud" value={clienteNuevo.longitud} onChange={e => setClienteNuevo({ ...clienteNuevo, longitud: e.target.value })} />
                  </div>
                </div>
              )}
              {/* Modal de mapa */}
              <Dialog open={showMapModal} onOpenChange={setShowMapModal}>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Seleccionar ubicación en el mapa</DialogTitle>
                  </DialogHeader>
                  <div className="mb-4 text-gray-700">Haz click en el mapa para seleccionar la ubicación. Solo se guardarán latitud y longitud.</div>
                  <MapPicker
                    initialLat={clienteNuevo.latitud ? parseFloat(clienteNuevo.latitud) : 23.1136}
                    initialLng={clienteNuevo.longitud ? parseFloat(clienteNuevo.longitud) : -82.3666}
                    onSelect={(lat: number, lng: number) => {
                      setClienteNuevo(c => ({ ...c, latitud: String(lat), longitud: String(lng) }))
                    }}
                  />
                  <div className="flex justify-end pt-4">
                    <Button type="button" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setShowMapModal(false)}>
                      Confirmar ubicación
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
          {(tipoReporte === "mantenimiento" || tipoReporte === "averia") && (
            <div className="space-y-4 bg-green-50 p-4 rounded-lg border border-green-200">
              <Label className="font-semibold">Selecciona un cliente existente</Label>
              <select className="w-full border rounded p-2 mt-1" value={clienteExistente} onChange={e => setClienteExistente(e.target.value)} title="Selecciona un cliente existente">
                <option value="">Selecciona un cliente...</option>
                {clients.length === 0 ? (
                  <option value="" disabled>No hay clientes disponibles</option>
                ) : (
                  clients.map((c) => (
                    <option key={c.numero} value={c.numero}>{c.nombre} ({c.numero})</option>
                  ))
                )}
              </select>
              {clients.length === 0 && (
                <p className="text-sm text-orange-600 mt-1">No hay clientes cargados. Ve a la sección de Clientes para crear algunos.</p>
              )}
            </div>
          )}

          {/* Fecha y hora */}
          <div className="space-y-4 bg-purple-200 p-4 rounded-lg border border-purple-300">
            <Label className="font-semibold">Fecha y hora del trabajo</Label>
            <div className="mb-2 text-purple-900 font-bold text-lg">
              {fechaLarga && <span>{fechaLarga}</span>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
              </div>
              <div>
                <Label>Hora de inicio</Label>
                <Input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
              </div>
              <div>
                <Label>Hora de fin</Label>
                <Input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Descripción */}
          {(tipoReporte === "mantenimiento" || tipoReporte === "averia") && (
            <div className="space-y-4 bg-green-50 p-4 rounded-lg border border-green-200">
              <Label className="font-semibold">Descripción del trabajo</Label>
              <textarea className="w-full border rounded p-2 min-h-[80px]" value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Describe el trabajo realizado..." />
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6" disabled={loadingSubmit}>
              {loadingSubmit ? "Creando..." : "Crear Reporte"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 