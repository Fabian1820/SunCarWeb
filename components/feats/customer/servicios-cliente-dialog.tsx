"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, Trash2, Wrench, Receipt } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Badge } from "@/components/shared/atom/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import type { Cliente } from "@/lib/api-types"
import {
  ServiciosClienteService,
  type EstadoServicioCliente,
  type LineaServicioCliente,
  type ServicioCliente,
} from "@/lib/services/feats/customer/servicios-cliente-service"
import { ServicioClienteEstadoBadge } from "./servicio-cliente-estado-badge"
import { RegistrarPagoDialog } from "@/components/feats/pagos/registrar-pago-dialog"

// Deben coincidir con las keys del catálogo de módulos del panel (lib/modulos-catalogo.ts)
const MODULO_CREAR = "instalaciones/servicios-cliente"
const MODULO_FACTURAR = "facturas/obras-terminadas/servicios"

interface ServiciosClienteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente: Cliente | null
}

const lineaVacia = (): LineaServicioCliente => ({ concepto: "", monto: 0 })

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0)
}

/** Formulario de líneas de costo, reusado para crear y para editar. */
function FormularioLineas({
  descripcion,
  onDescripcionChange,
  lineas,
  onLineasChange,
  disabled,
}: {
  descripcion: string
  onDescripcionChange: (v: string) => void
  lineas: LineaServicioCliente[]
  onLineasChange: (lineas: LineaServicioCliente[]) => void
  disabled?: boolean
}) {
  const total = lineas.reduce((acc, l) => acc + (Number(l.monto) || 0), 0)

  const actualizarLinea = (idx: number, campo: keyof LineaServicioCliente, valor: string) => {
    const next = lineas.map((l, i) =>
      i === idx ? { ...l, [campo]: campo === "monto" ? Number(valor) || 0 : valor } : l,
    )
    onLineasChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Descripción del servicio</Label>
        <Textarea
          value={descripcion}
          onChange={(e) => onDescripcionChange(e.target.value)}
          placeholder="Ej: Cambio de equipo"
          disabled={disabled}
          rows={2}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Líneas de costo</Label>
        <div className="space-y-2">
          {lineas.map((linea, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={linea.concepto}
                onChange={(e) => actualizarLinea(idx, "concepto", e.target.value)}
                placeholder="Ej: Quitar equipo viejo"
                disabled={disabled}
                className="flex-1"
              />
              <Input
                type="number"
                step="0.01"
                value={linea.monto || ""}
                onChange={(e) => actualizarLinea(idx, "monto", e.target.value)}
                placeholder="0.00"
                disabled={disabled}
                className="w-28"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled || lineas.length <= 1}
                onClick={() => onLineasChange(lineas.filter((_, i) => i !== idx))}
                className="h-8 w-8 shrink-0 text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onLineasChange([...lineas, lineaVacia()])}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar línea
        </Button>
      </div>

      <div className="flex justify-between border-t pt-2 text-sm font-semibold">
        <span>Precio total</span>
        <span>{formatMoney(total)}</span>
      </div>
    </div>
  )
}

export function ServiciosClienteDialog({ open, onOpenChange, cliente }: ServiciosClienteDialogProps) {
  const { toast } = useToast()
  const { hasPermission, hasExactPermission } = useAuth()
  const puedeCrear = hasPermission(MODULO_CREAR)
  const puedeFacturar = hasExactPermission(MODULO_FACTURAR)

  const [servicios, setServicios] = useState<ServicioCliente[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [descripcion, setDescripcion] = useState("")
  const [lineas, setLineas] = useState<LineaServicioCliente[]>([lineaVacia()])
  const [estadoInicial, setEstadoInicial] = useState<EstadoServicioCliente>("pendiente")
  const [guardando, setGuardando] = useState(false)

  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [lineasEdicion, setLineasEdicion] = useState<LineaServicioCliente[]>([])
  const [descripcionEdicion, setDescripcionEdicion] = useState("")

  const [servicioPago, setServicioPago] = useState<ServicioCliente | null>(null)
  const [accionando, setAccionando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (!cliente?.numero) return
    setCargando(true)
    setError(null)
    try {
      const data = await ServiciosClienteService.listarPorCliente(cliente.numero)
      setServicios(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los servicios")
    } finally {
      setCargando(false)
    }
  }, [cliente?.numero])

  useEffect(() => {
    if (open) {
      cargar()
      setMostrarForm(false)
      setDescripcion("")
      setLineas([lineaVacia()])
      setEstadoInicial("pendiente")
      setEditandoId(null)
    }
  }, [open, cargar])

  if (!cliente) return null

  const handleCrear = async () => {
    if (!descripcion.trim()) {
      toast({ title: "Falta la descripción", variant: "destructive" })
      return
    }
    const lineasValidas = lineas.filter((l) => l.concepto.trim() && l.monto > 0)
    if (lineasValidas.length === 0) {
      toast({ title: "Agrega al menos una línea de costo con monto mayor a 0", variant: "destructive" })
      return
    }
    setGuardando(true)
    try {
      await ServiciosClienteService.crear({
        cliente_numero: cliente.numero,
        descripcion: descripcion.trim(),
        lineas: lineasValidas,
        estado: estadoInicial,
      })
      toast({ title: "Servicio creado" })
      setMostrarForm(false)
      setDescripcion("")
      setLineas([lineaVacia()])
      await cargar()
    } catch (err) {
      toast({
        title: "No se pudo crear el servicio",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  const iniciarEdicion = (servicio: ServicioCliente) => {
    setEditandoId(servicio.id)
    setDescripcionEdicion(servicio.descripcion)
    setLineasEdicion(servicio.lineas.length ? servicio.lineas.map((l) => ({ ...l })) : [lineaVacia()])
  }

  const guardarEdicion = async () => {
    if (!editandoId) return
    const lineasValidas = lineasEdicion.filter((l) => l.concepto.trim() && l.monto > 0)
    if (lineasValidas.length === 0) {
      toast({ title: "Agrega al menos una línea de costo con monto mayor a 0", variant: "destructive" })
      return
    }
    setAccionando(editandoId)
    try {
      await ServiciosClienteService.actualizarLineas(editandoId, {
        descripcion: descripcionEdicion.trim(),
        lineas: lineasValidas,
      })
      toast({ title: "Servicio actualizado" })
      setEditandoId(null)
      await cargar()
    } catch (err) {
      toast({
        title: "No se pudo actualizar",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      })
    } finally {
      setAccionando(null)
    }
  }

  const cambiarEstado = async (servicio: ServicioCliente, estado: EstadoServicioCliente) => {
    setAccionando(servicio.id)
    try {
      await ServiciosClienteService.actualizarEstado(servicio.id, estado)
      await cargar()
    } catch (err) {
      toast({
        title: "No se pudo cambiar el estado",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      })
    } finally {
      setAccionando(null)
    }
  }

  const facturar = async (servicio: ServicioCliente) => {
    setAccionando(servicio.id)
    try {
      await ServiciosClienteService.facturar(servicio.id)
      toast({ title: "Servicio facturado" })
      await cargar()
    } catch (err) {
      toast({
        title: "No se pudo facturar",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      })
    } finally {
      setAccionando(null)
    }
  }

  const eliminar = async (servicio: ServicioCliente) => {
    if (!window.confirm(`¿Eliminar el servicio "${servicio.descripcion}"?`)) return
    setAccionando(servicio.id)
    try {
      await ServiciosClienteService.eliminar(servicio.id)
      await cargar()
    } catch (err) {
      toast({
        title: "No se pudo eliminar",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      })
    } finally {
      setAccionando(null)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-emerald-600" />
              Servicios de {cliente.nombre}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {cargando ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
            </div>
          ) : (
            <div className="space-y-3">
              {servicios.length === 0 && !mostrarForm && (
                <p className="text-sm text-gray-500 py-4 text-center">
                  Este cliente no tiene servicios registrados.
                </p>
              )}

              {servicios.map((servicio) => {
                const enEdicion = editandoId === servicio.id
                return (
                  <div key={servicio.id} className="rounded-lg border border-gray-200 p-3.5 space-y-2.5">
                    {enEdicion ? (
                      <>
                        <FormularioLineas
                          descripcion={descripcionEdicion}
                          onDescripcionChange={setDescripcionEdicion}
                          lineas={lineasEdicion}
                          onLineasChange={setLineasEdicion}
                          disabled={accionando === servicio.id}
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditandoId(null)}>
                            Cancelar
                          </Button>
                          <Button size="sm" onClick={guardarEdicion} disabled={accionando === servicio.id}>
                            {accionando === servicio.id && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                            Guardar
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 break-words">{servicio.descripcion}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {servicio.lineas.map((l) => `${l.concepto} (${formatMoney(l.monto)})`).join(" · ")}
                            </p>
                          </div>
                          <ServicioClienteEstadoBadge estado={servicio.estado} />
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600">
                            Precio: <strong>{formatMoney(servicio.precio_total)}</strong>
                          </span>
                          <span className={servicio.monto_pendiente > 0 ? "text-red-600 font-medium" : "text-emerald-600"}>
                            Pendiente: {formatMoney(servicio.monto_pendiente)}
                          </span>
                        </div>

                        {servicio.facturado && (
                          <Badge variant="outline" className="bg-violet-100 text-violet-800 border-violet-200 gap-1">
                            <Receipt className="h-3 w-3" />
                            Facturado · {servicio.numero_factura}
                          </Badge>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {!servicio.facturado && puedeCrear && (
                            <Select
                              value={servicio.estado}
                              onValueChange={(v) => cambiarEstado(servicio, v as EstadoServicioCliente)}
                            >
                              <SelectTrigger className="h-8 w-36 text-xs" disabled={accionando === servicio.id}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendiente">Pendiente</SelectItem>
                                <SelectItem value="en_proceso">En proceso</SelectItem>
                                <SelectItem value="terminado">Terminado</SelectItem>
                              </SelectContent>
                            </Select>
                          )}

                          {!servicio.facturado && puedeCrear && !servicio.pagos.length && (
                            <Button variant="outline" size="sm" onClick={() => iniciarEdicion(servicio)}>
                              Editar líneas
                            </Button>
                          )}

                          {(puedeCrear || puedeFacturar) && (
                            <Button variant="outline" size="sm" onClick={() => setServicioPago(servicio)}>
                              Registrar pago
                            </Button>
                          )}

                          {!servicio.facturado && servicio.estado === "terminado" && puedeFacturar && (
                            <Button
                              size="sm"
                              onClick={() => facturar(servicio)}
                              disabled={accionando === servicio.id}
                              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                            >
                              {accionando === servicio.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                              Facturar
                            </Button>
                          )}

                          {!servicio.facturado && !servicio.pagos.length && puedeCrear && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => eliminar(servicio)}
                              disabled={accionando === servicio.id}
                              className="text-red-500 hover:text-red-600"
                            >
                              Eliminar
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}

              {puedeCrear && (
                mostrarForm ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-3">
                    <FormularioLineas
                      descripcion={descripcion}
                      onDescripcionChange={setDescripcion}
                      lineas={lineas}
                      onLineasChange={setLineas}
                      disabled={guardando}
                    />
                    <div className="space-y-1.5">
                      <Label>Estado inicial</Label>
                      <Select value={estadoInicial} onValueChange={(v) => setEstadoInicial(v as EstadoServicioCliente)}>
                        <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="en_proceso">En proceso</SelectItem>
                          <SelectItem value="terminado">Terminado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setMostrarForm(false)} disabled={guardando}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={handleCrear} disabled={guardando}>
                        {guardando && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                        Crear servicio
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setMostrarForm(true)} className="w-full gap-1.5">
                    <Plus className="h-4 w-4" />
                    Nuevo servicio
                  </Button>
                )
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <RegistrarPagoDialog
        open={servicioPago !== null}
        onOpenChange={(v) => {
          if (!v) setServicioPago(null)
        }}
        tipo="servicio"
        oferta={
          servicioPago
            ? {
                id: servicioPago.id,
                descripcion: servicioPago.descripcion,
                precio_total: servicioPago.precio_total,
                monto_pendiente: servicioPago.monto_pendiente,
                cliente_nombre: cliente.nombre,
              }
            : null
        }
        onSuccess={() => {
          setServicioPago(null)
          cargar()
        }}
      />
    </>
  )
}
