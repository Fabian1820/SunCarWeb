"use client"

import { Card, CardContent } from "@/components/shared/molecule/card"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Input } from "@/components/shared/atom/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Loader } from "@/components/shared/atom/loader"
import { useOfertasConfeccion } from "@/hooks/use-ofertas-confeccion"
import { useMaterials } from "@/hooks/use-materials"
import { ClienteService } from "@/lib/services/feats/customer/cliente-service"
import { InventarioService } from "@/lib/services/feats/inventario/inventario-service"
import type { Cliente } from "@/lib/types/feats/customer/cliente-types"
import type { Almacen } from "@/lib/inventario-types"
import { Building2, FileText, Package, Search, User } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

export function OfertasConfeccionadasView() {
  const { ofertas, loading } = useOfertasConfeccion()
  const { materials } = useMaterials()
  const [searchQuery, setSearchQuery] = useState("")
  const [estadoFiltro, setEstadoFiltro] = useState("todos")
  const [tipoFiltro, setTipoFiltro] = useState("todas")
  const [almacenFiltro, setAlmacenFiltro] = useState("todos")
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [detalleAbierto, setDetalleAbierto] = useState(false)
  const [ofertaSeleccionada, setOfertaSeleccionada] = useState<(typeof ofertas)[number] | null>(null)

  const getEstadoBadge = (estado: string) => {
    const badges = {
      en_revision: { label: "En Revisión", className: "bg-yellow-100 text-yellow-800" },
      aprobada_para_enviar: { label: "Aprobada", className: "bg-blue-100 text-blue-800" },
      enviada_a_cliente: { label: "Enviada", className: "bg-purple-100 text-purple-800" },
      confirmada_por_cliente: { label: "Confirmada", className: "bg-green-100 text-green-800" },
      reservada: { label: "Reservada", className: "bg-orange-100 text-orange-800" },
      rechazada: { label: "Rechazada", className: "bg-red-100 text-red-800" },
      cancelada: { label: "Cancelada", className: "bg-slate-200 text-slate-700" },
    }
    return badges[estado as keyof typeof badges] || badges.en_revision
  }

  const getTipoBadge = (tipo: string) => {
    return tipo === "personalizada"
      ? { label: "Personalizada", className: "bg-pink-100 text-pink-800" }
      : { label: "Genérica", className: "bg-slate-100 text-slate-800" }
  }

  const formatCurrency = (value: number) => {
    return `$${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)}`
  }

  const formatCurrencyWithSymbol = (value: number, symbol: string) => {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
    return symbol === "CUP" ? `${formatted} CUP` : `${symbol}${formatted}`
  }

  const almacenesDisponibles = useMemo(() => {
    if (almacenes.length > 0) {
      return almacenes.map((almacen) => ({
        id: almacen.id,
        nombre: almacen.nombre || almacen.id,
      }))
    }
    const map = new Map<string, string>()
    ofertas.forEach((oferta) => {
      if (oferta.almacen_id && oferta.almacen_nombre) {
        map.set(oferta.almacen_id, oferta.almacen_nombre)
      } else if (oferta.almacen_id) {
        map.set(oferta.almacen_id, oferta.almacen_id)
      }
    })
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }))
  }, [almacenes, ofertas])

  const ofertasFiltradas = useMemo(() => {
    if (!searchQuery.trim()) return ofertas
    const query = searchQuery.trim().toLowerCase()
    return ofertas.filter((oferta) => {
      return (
        oferta.nombre.toLowerCase().includes(query) ||
        oferta.cliente_nombre?.toLowerCase().includes(query)
      )
    })
  }, [ofertas, searchQuery])

  const ofertasFiltradasConFiltros = useMemo(() => {
    return ofertasFiltradas.filter((oferta) => {
      const matchEstado = estadoFiltro === "todos" || oferta.estado === estadoFiltro
      const matchTipo = tipoFiltro === "todas" || oferta.tipo === tipoFiltro
      const matchAlmacen = almacenFiltro === "todos" || oferta.almacen_id === almacenFiltro
      return matchEstado && matchTipo && matchAlmacen
    })
  }, [ofertasFiltradas, estadoFiltro, tipoFiltro, almacenFiltro])

  useEffect(() => {
    const loadClientes = async () => {
      try {
        const data = await ClienteService.getClientes()
        setClientes(Array.isArray(data) ? data : [])
      } catch (error) {
        setClientes([])
      }
    }
    const loadAlmacenes = async () => {
      try {
        const data = await InventarioService.getAlmacenes()
        setAlmacenes(Array.isArray(data) ? data : [])
      } catch (error) {
        setAlmacenes([])
      }
    }
    loadClientes()
    loadAlmacenes()
  }, [])

  const clienteNombrePorOferta = useMemo(() => {
    const map = new Map<string, string>()
    clientes.forEach((cliente) => {
      if (cliente.id && cliente.nombre) {
        map.set(cliente.id, cliente.nombre)
      }
      if (cliente.numero && cliente.nombre) {
        map.set(cliente.numero, cliente.nombre)
      }
    })
    return map
  }, [clientes])

  const clientePorOferta = useMemo(() => {
    const map = new Map<string, Cliente>()
    clientes.forEach((cliente) => {
      if (cliente.id) map.set(cliente.id, cliente)
      if (cliente.numero) map.set(cliente.numero, cliente)
    })
    return map
  }, [clientes])

  const almacenNombrePorId = useMemo(() => {
    const map = new Map<string, string>()
    almacenes.forEach((almacen) => {
      if (almacen.id && almacen.nombre) {
        map.set(almacen.id, almacen.nombre)
      }
    })
    return map
  }, [almacenes])

  const materialesMap = useMemo(() => {
    const map = new Map<string, { foto?: string; nombre?: string; descripcion?: string }>()
    materials.forEach((material) => {
      const codigo = material.codigo?.toString()
      if (!codigo) return
      map.set(codigo, {
        foto: material.foto,
        nombre: material.nombre,
        descripcion: material.descripcion,
      })
    })
    return map
  }, [materials])

  const calcularTotalesDetalle = (oferta: (typeof ofertas)[number]) => {
    const base =
      (oferta.subtotal_con_margen || 0) +
      (oferta.costo_transportacion || 0) +
      (oferta.total_elementos_personalizados || 0) +
      (oferta.total_costos_extras || 0)
    const porcentaje = oferta.porcentaje_contribucion || 0
    const contribucion = oferta.aplica_contribucion ? base * (porcentaje / 100) : 0
    const totalSinRedondeo = base + contribucion
    const redondeo = (oferta.precio_final || 0) - totalSinRedondeo
    return { base, contribucion, totalSinRedondeo, redondeo }
  }

  const calcularConversion = (oferta: (typeof ofertas)[number]) => {
    const moneda = oferta.moneda_pago || "USD"
    const tasa = oferta.tasa_cambio || 0
    if (moneda === "USD" || tasa <= 0) return null
    const base = oferta.precio_final || 0
    const convertido = moneda === "EUR" ? base / tasa : base * tasa
    return { moneda, tasa, convertido }
  }

  const abrirDetalle = (oferta: (typeof ofertas)[number]) => {
    setOfertaSeleccionada(oferta)
    setDetalleAbierto(true)
  }

  const totalesDetalle = useMemo(() => {
    if (!ofertaSeleccionada) return null
    return calcularTotalesDetalle(ofertaSeleccionada)
  }, [ofertaSeleccionada])

  const conversionDetalle = useMemo(() => {
    if (!ofertaSeleccionada) return null
    return calcularConversion(ofertaSeleccionada)
  }, [ofertaSeleccionada])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader label="Cargando ofertas confeccionadas..." />
      </div>
    )
  }

  if (ofertas.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No hay ofertas confeccionadas para mostrar</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md border-l-4 border-l-orange-600 bg-white">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre o cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{ofertasFiltradasConFiltros.length}</span>
                <span>{ofertasFiltradasConFiltros.length === 1 ? "oferta" : "ofertas"}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="en_revision">En revisión</SelectItem>
                  <SelectItem value="aprobada_para_enviar">Aprobada</SelectItem>
                  <SelectItem value="enviada_a_cliente">Enviada</SelectItem>
                  <SelectItem value="confirmada_por_cliente">Confirmada</SelectItem>
                  <SelectItem value="reservada">Reservada</SelectItem>
                  <SelectItem value="rechazada">Rechazada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>

              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tipo de oferta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todos los tipos</SelectItem>
                  <SelectItem value="generica">Genéricas</SelectItem>
                  <SelectItem value="personalizada">Personalizadas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={almacenFiltro} onValueChange={setAlmacenFiltro}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Almacén" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los almacenes</SelectItem>
                  {almacenesDisponibles.map((almacen) => (
                    <SelectItem key={almacen.id} value={almacen.id}>
                      {almacen.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {ofertasFiltradasConFiltros.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No se encontraron ofertas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {ofertasFiltradasConFiltros.map((oferta) => {
        const estadoBadge = getEstadoBadge(oferta.estado)
        const tipoBadge = getTipoBadge(oferta.tipo)

        return (
          <Card
            key={oferta.id}
            className="group overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
          >
            <CardContent className="p-0">
              <div className="relative h-48 bg-gradient-to-br from-slate-50 via-orange-50 to-yellow-100">
                {oferta.foto_portada ? (
                  <img
                    src={oferta.foto_portada}
                    alt={oferta.nombre}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="h-20 w-20 rounded-2xl bg-white/80 border border-orange-100 flex items-center justify-center shadow-sm">
                      <Building2 className="h-10 w-10 text-orange-400" />
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  <Badge className={estadoBadge.className}>{estadoBadge.label}</Badge>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-base text-slate-900 line-clamp-2 min-h-[48px]">
                  {oferta.nombre}
                </h3>

                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-slate-600" />
                  </div>
                  <span className="truncate">
                    {oferta.tipo === "personalizada"
                      ? (oferta.cliente_nombre ||
                          clienteNombrePorOferta.get(oferta.cliente_id || "") ||
                          clienteNombrePorOferta.get(oferta.cliente_numero || "") ||
                          "Cliente no asignado")
                      : "Oferta Genérica"}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Oferta confeccionada</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => abrirDetalle(oferta)}
                  >
                    Ver detalle
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
          })}
        </div>
      )}

      <Dialog open={detalleAbierto} onOpenChange={setDetalleAbierto}>
        <DialogContent className="max-w-6xl h-[90vh] overflow-hidden flex flex-col">
          {ofertaSeleccionada ? (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-semibold">{ofertaSeleccionada.nombre}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 lg:grid-cols-[360px,1fr] gap-6 flex-1 min-h-0 overflow-hidden">
                <div className="h-full min-h-0 overflow-hidden">
                  <div className="space-y-4 pr-1 lg:pr-2 overflow-y-auto max-h-full">
                    <Card className="overflow-hidden border-slate-200">
                      <CardContent className="p-0">
                        <div className="relative h-52 bg-gradient-to-br from-slate-50 via-orange-50 to-yellow-100">
                          {ofertaSeleccionada.foto_portada ? (
                            <img
                              src={ofertaSeleccionada.foto_portada}
                              alt={ofertaSeleccionada.nombre}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="h-20 w-20 rounded-2xl bg-white/80 border border-orange-100 flex items-center justify-center shadow-sm">
                                <Building2 className="h-10 w-10 text-orange-400" />
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                      <CardContent className="p-4 space-y-3">
                        <div className="text-sm text-slate-500">Información de la oferta</div>
                        <div className="space-y-2 text-sm text-slate-700">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Tipo</span>
                            <span className="font-semibold text-slate-900">
                              {ofertaSeleccionada.tipo === "personalizada" ? "Personalizada" : "Genérica"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Estado</span>
                            <span className="font-semibold text-slate-900">
                              {getEstadoBadge(ofertaSeleccionada.estado).label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Almacén</span>
                            <span className="font-semibold text-slate-900">
                              {ofertaSeleccionada.almacen_nombre ||
                                almacenNombrePorId.get(ofertaSeleccionada.almacen_id || "") ||
                                "--"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Número</span>
                            <span className="font-semibold text-slate-900">
                              {ofertaSeleccionada.numero_oferta || ofertaSeleccionada.id}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {ofertaSeleccionada.tipo === "personalizada" && (
                      <Card className="border-slate-200">
                        <CardContent className="p-4 space-y-3">
                          <div className="text-sm text-slate-500">Información del cliente</div>
                          {(() => {
                            const cliente =
                              clientePorOferta.get(ofertaSeleccionada.cliente_id || "") ||
                              clientePorOferta.get(ofertaSeleccionada.cliente_numero || "")
                            if (!cliente) {
                              return (
                                <div className="text-sm text-slate-500">
                                  Cliente no asignado
                                </div>
                              )
                            }
                            return (
                              <div className="space-y-2 text-sm text-slate-700">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Nombre</span>
                                  <span className="font-semibold text-slate-900">
                                    {cliente.nombre || "--"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">CI</span>
                                  <span className="font-semibold text-slate-900">
                                    {cliente.carnet_identidad || "--"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Teléfono</span>
                                  <span className="font-semibold text-slate-900">
                                    {cliente.telefono || "--"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Dirección</span>
                                  <span className="font-semibold text-slate-900">
                                    {cliente.direccion || "--"}
                                  </span>
                                </div>
                              </div>
                            )
                          })()}
                        </CardContent>
                      </Card>
                    )}

                    <Card className="border-slate-200">
                      <CardContent className="p-4 space-y-3">
                        <div className="text-sm text-slate-500">Totales</div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Total materiales</span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(ofertaSeleccionada.total_materiales || 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Margen comercial</span>
                            <span className="font-semibold text-slate-900">
                              {ofertaSeleccionada.margen_comercial ?? 0}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Subtotal con margen</span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(ofertaSeleccionada.subtotal_con_margen || 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Transporte</span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(ofertaSeleccionada.costo_transportacion || 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Costos extras</span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(ofertaSeleccionada.total_costos_extras || 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Elementos personalizados</span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(ofertaSeleccionada.total_elementos_personalizados || 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Contribucion</span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(totalesDetalle?.contribucion || 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Total sin redondeo</span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(totalesDetalle?.totalSinRedondeo || 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Redondeo</span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(totalesDetalle?.redondeo || 0)}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-slate-200 space-y-2 text-sm text-slate-600">
                            <div className="text-sm text-slate-500">Pago</div>
                            <div className="flex items-center justify-between">
                              <span>Pago por transferencia</span>
                              <span className="font-semibold text-slate-900">
                                {ofertaSeleccionada.pago_transferencia ? "Si" : "No"}
                              </span>
                            </div>
                            {ofertaSeleccionada.pago_transferencia && ofertaSeleccionada.datos_cuenta && (
                              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                                {ofertaSeleccionada.datos_cuenta}
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span>Aplica contribucion</span>
                              <span className="font-semibold text-slate-900">
                                {ofertaSeleccionada.aplica_contribucion ? "Si" : "No"}
                              </span>
                            </div>
                            {ofertaSeleccionada.aplica_contribucion && (
                              <div className="flex items-center justify-between">
                                <span>% Contribucion</span>
                                <span className="font-semibold text-slate-900">
                                  {ofertaSeleccionada.porcentaje_contribucion || 0}%
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="pt-2 border-t border-slate-200 space-y-2 text-sm text-slate-600">
                            <div className="flex items-center justify-between">
                              <span>Moneda de pago</span>
                              <span className="font-semibold text-slate-900">
                                {ofertaSeleccionada.moneda_pago || "USD"}
                              </span>
                            </div>
                            {ofertaSeleccionada.moneda_pago && ofertaSeleccionada.moneda_pago !== "USD" && (
                              <div className="flex items-center justify-between">
                                <span>
                                  {ofertaSeleccionada.moneda_pago === "EUR" ? "1 EUR =" : "1 USD ="}
                                </span>
                                <span className="font-semibold text-slate-900">
                                  {formatCurrencyWithSymbol(
                                    ofertaSeleccionada.tasa_cambio || 0,
                                    ofertaSeleccionada.moneda_pago === "EUR" ? "$" : "CUP"
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-800">
                            <span className="font-semibold">Precio final</span>
                            <span className="text-lg font-bold text-orange-600">
                              {formatCurrency(ofertaSeleccionada.precio_final || 0)}
                            </span>
                          </div>
                          {conversionDetalle && (
                            <div className="flex items-center justify-between text-slate-800">
                              <span className="font-semibold">
                                Precio final en {conversionDetalle.moneda}
                              </span>
                              <span className="text-lg font-bold text-orange-600">
                                {formatCurrencyWithSymbol(
                                  conversionDetalle.convertido,
                                  conversionDetalle.moneda === "EUR" ? "EUR " : "CUP"
                                )}
                              </span>
                            </div>
                          )}
                          {ofertaSeleccionada.notas && (
                            <div className="pt-2 border-t border-slate-200 text-xs text-slate-500">
                              <span className="font-semibold text-slate-600">Notas:</span>{" "}
                              {ofertaSeleccionada.notas}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="space-y-4 overflow-y-auto pr-1 lg:pr-3">
                  <Card className="border-slate-200">
                    <CardContent className="p-4 space-y-4">
                      <div className="text-sm text-slate-500">Materiales de la oferta</div>

                      {(ofertaSeleccionada.items || []).length === 0 ? (
                        <div className="text-sm text-slate-500">No hay materiales registrados.</div>
                      ) : (
                        <div className="space-y-4">
                          {Object.entries(
                            (ofertaSeleccionada.items || []).reduce<Record<string, NonNullable<typeof ofertaSeleccionada.items>>>(
                              (acc, item) => {
                                const key = item.seccion || "Sin sección"
                                if (!acc[key]) acc[key] = []
                                acc[key].push(item)
                                return acc
                              },
                              {}
                            )
                          ).map(([seccion, items]) => (
                            <div key={seccion} className="space-y-2">
                              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                {seccion === "CUSTOM_1769455569676" ? "Material vario" : seccion}
                              </div>
                              <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white">
                                {items.map((item, idx) => {
                                  const material = materialesMap.get(item.material_codigo?.toString())
                                  return (
                                    <div key={`${item.material_codigo}-${idx}`} className="flex items-center gap-3 p-3">
                                      <div className="h-12 w-12 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                                        {material?.foto ? (
                                          <img
                                            src={material.foto}
                                            alt={item.descripcion}
                                            className="w-full h-full object-contain"
                                          />
                                        ) : (
                                          <Package className="h-6 w-6 text-slate-300" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                                          {item.descripcion}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          {item.categoria} · Código {item.material_codigo}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-semibold text-slate-900">
                                          {item.cantidad} u
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          {formatCurrency(item.precio)}
                                        </p>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {(ofertaSeleccionada.elementos_personalizados || []).length > 0 && (
                    <Card className="border-slate-200">
                      <CardContent className="p-4 space-y-3">
                        <div className="text-sm text-slate-500">Elementos personalizados</div>
                        <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white">
                          {(ofertaSeleccionada.elementos_personalizados || []).map((elem, idx) => {
                            const material = materialesMap.get(elem.material_codigo?.toString())
                            return (
                              <div key={`${elem.material_codigo}-${idx}`} className="flex items-center gap-3 p-3">
                                <div className="h-12 w-12 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                                  {material?.foto ? (
                                    <img
                                      src={material.foto}
                                      alt={elem.descripcion}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <Package className="h-6 w-6 text-slate-300" />
                                  )}
                                </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                                  {elem.descripcion}
                                </p>
                                <p className="text-xs text-slate-500">{elem.categoria}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-slate-900">{elem.cantidad} u</p>
                                <p className="text-xs text-slate-500">{formatCurrency(elem.precio)}</p>
                              </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {(ofertaSeleccionada.secciones_personalizadas || []).length > 0 && (
                    <Card className="border-slate-200">
                      <CardContent className="p-4 space-y-4">
                        <div className="text-sm text-slate-500">Secciones personalizadas</div>
                        <div className="space-y-4">
                          {(ofertaSeleccionada.secciones_personalizadas || []).map((seccion) => (
                            <div key={seccion.id} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                  {seccion.label}
                                </p>
                                <Badge className="bg-slate-100 text-slate-700">{seccion.tipo}</Badge>
                              </div>

                              {seccion.tipo === "extra" && seccion.tipo_extra === "escritura" && seccion.contenido_escritura && (
                                <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white">
                                  <div className="flex items-center gap-3 p-3">
                                    <div className="h-12 w-12 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                                      <FileText className="h-6 w-6 text-slate-300" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-slate-900">Contenido</p>
                                      <p className="text-xs text-slate-500 line-clamp-2">
                                        {seccion.contenido_escritura}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {seccion.tipo === "extra" && seccion.tipo_extra === "costo" && (seccion.costos_extras || []).length > 0 && (
                                <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white">
                                  {(seccion.costos_extras || []).map((costo) => (
                                    <div key={costo.id} className="flex items-center gap-3 p-3">
                                      <div className="h-12 w-12 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                                        <Package className="h-6 w-6 text-slate-300" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                                          {costo.descripcion}
                                        </p>
                                        <p className="text-xs text-slate-500">Costo extra</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-semibold text-slate-900">
                                          {costo.cantidad} u
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          {formatCurrency(costo.precio_unitario)}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {seccion.tipo === "materiales" && seccion.categorias_materiales && seccion.categorias_materiales.length > 0 && (
                                <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white">
                                  {seccion.categorias_materiales.map((categoria, idx) => {
                                    const material = materials.find((item) => item.categoria === categoria)
                                    return (
                                      <div key={`${seccion.id}-${categoria}-${idx}`} className="flex items-center gap-3 p-3">
                                        <div className="h-12 w-12 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                                          {material?.foto ? (
                                            <img
                                              src={material.foto}
                                              alt={categoria}
                                              className="w-full h-full object-contain"
                                            />
                                          ) : (
                                            <Package className="h-6 w-6 text-slate-300" />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                                            {categoria}
                                          </p>
                                          <p className="text-xs text-slate-500">Categoría personalizada</p>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
