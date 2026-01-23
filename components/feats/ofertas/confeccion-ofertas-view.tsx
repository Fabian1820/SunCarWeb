"use client"

import { useEffect, useMemo, useState } from "react"
import { Package, Search } from "lucide-react"
import { Badge } from "@/components/shared/atom/badge"
import { Input } from "@/components/shared/atom/input"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { useMaterials } from "@/hooks/use-materials"
import { ClienteSearchSelector } from "@/components/feats/cliente/cliente-search-selector"
import { ClienteService } from "@/lib/services/feats/customer/cliente-service"
import type { Material } from "@/lib/material-types"
import type { Cliente } from "@/lib/types/feats/customer/cliente-types"

interface OfertaItem {
  id: string
  materialCodigo: string
  descripcion: string
  precio: number
  cantidad: number
  categoria: string
  seccion: string
}

interface ElementoPersonalizado {
  id: string
  materialCodigo: string
  descripcion: string
  precio: number
  cantidad: number
  categoria: string
}

export function ConfeccionOfertasView() {
  const { materials, loading } = useMaterials()
  const [items, setItems] = useState<OfertaItem[]>([])
  const [ofertaGenerica, setOfertaGenerica] = useState(true)
  const [clienteId, setClienteId] = useState("")
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clientesLoading, setClientesLoading] = useState(false)
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [margenComercial, setMargenComercial] = useState(0)
  const [costoTransportacion, setCostoTransportacion] = useState(0)
  const [elementosPersonalizados, setElementosPersonalizados] = useState<ElementoPersonalizado[]>([])
  const [mostrarElementosPersonalizados, setMostrarElementosPersonalizados] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()

  const steps = [
    {
      id: "INVERSORES",
      label: "Inversores",
      match: (categoria: string) => categoria.includes("INVERSOR"),
    },
    {
      id: "BATERIAS",
      label: "Baterias",
      match: (categoria: string) => categoria.includes("BATERIA"),
    },
    {
      id: "PANELES",
      label: "Paneles",
      match: (categoria: string) => categoria.includes("PANEL"),
    },
    {
      id: "MPPT",
      label: "MPPT",
      match: (categoria: string) => categoria.includes("MPPT"),
    },
    {
      id: "ESTRUCTURAS",
      label: "Estructuras",
      match: (categoria: string) => categoria.includes("ESTRUCTURA"),
    },
    {
      id: "CABLEADO_DC",
      label: "Cableado DC",
      match: (categoria: string) => categoria.includes("CABLE"),
    },
    {
      id: "CABLEADO_AC",
      label: "Cableado AC",
      match: (categoria: string) => categoria.includes("CABLE"),
    },
    {
      id: "CANALIZACION",
      label: "Canalizacion",
      match: (categoria: string) => categoria.includes("PVC"),
    },
    {
      id: "TIERRA",
      label: "Tierra",
      match: (categoria: string) => categoria.includes("TIERRA"),
    },
    {
      id: "PROTECCIONES_ELECTRICAS",
      label: "Protecciones electricas",
      match: (categoria: string) => categoria.includes("PROTECCION"),
    },
    {
      id: "MATERIAL_VARIO",
      label: "Material vario",
      match: (categoria: string) => categoria.includes("VARIO"),
    },
  ]

  const activeStep = steps[activeStepIndex] ?? steps[0]

  const materialesFiltrados = useMemo(() => {
    if (!activeStep) return materials
    
    let filtered = materials.filter((material) => {
      const categoria = normalizeText(material.categoria ?? "")
      return activeStep.match(categoria)
    })

    // Aplicar búsqueda si hay query
    if (searchQuery.trim()) {
      const query = normalizeText(searchQuery.trim())
      filtered = filtered.filter((material) => {
        const descripcion = normalizeText(material.descripcion)
        const codigo = normalizeText(material.codigo?.toString() ?? "")
        const categoria = normalizeText(material.categoria ?? "")
        return (
          descripcion.includes(query) ||
          codigo.includes(query) ||
          categoria.includes(query)
        )
      })
    }

    return filtered
  }, [materials, activeStep, searchQuery])

  const cantidadesPorMaterial = useMemo(() => {
    const map = new Map<string, number>()
    items.forEach((item) => {
      map.set(`${item.seccion}:${item.materialCodigo}`, item.cantidad)
    })
    // Agregar elementos personalizados
    elementosPersonalizados.forEach((elem) => {
      map.set(`PERSONALIZADO:${elem.materialCodigo}`, elem.cantidad)
    })
    return map
  }, [items, elementosPersonalizados])

  const itemsPorSeccion = useMemo(() => {
    const map = new Map<string, OfertaItem[]>()
    items.forEach((item) => {
      if (!map.has(item.seccion)) map.set(item.seccion, [])
      map.get(item.seccion)?.push(item)
    })
    return map
  }, [items])

  const subtotalPorSeccion = useMemo(() => {
    const map = new Map<string, number>()
    items.forEach((item) => {
      map.set(item.seccion, (map.get(item.seccion) ?? 0) + item.precio * item.cantidad)
    })
    return map
  }, [items])

  const totalMateriales = useMemo(() => {
    return items.reduce((sum, item) => sum + item.precio * item.cantidad, 0)
  }, [items])

  const totalElementosPersonalizados = useMemo(() => {
    return elementosPersonalizados.reduce((sum, elem) => sum + elem.precio * elem.cantidad, 0)
  }, [elementosPersonalizados])

  const subtotalConMargen = useMemo(() => {
    if (margenComercial >= 100) return totalMateriales
    return totalMateriales / (1 - margenComercial / 100)
  }, [totalMateriales, margenComercial])

  const totalSinRedondeo = useMemo(() => {
    return subtotalConMargen + costoTransportacion + totalElementosPersonalizados
  }, [subtotalConMargen, costoTransportacion, totalElementosPersonalizados])

  const precioFinal = useMemo(() => {
    return Math.ceil(totalSinRedondeo)
  }, [totalSinRedondeo])

  const formatCurrency = (value: number) => {
    return `${new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)} $`
  }

  const agregarMaterial = (material: Material) => {
    const codigo = material.codigo?.toString()
    if (!codigo) return
    if (!activeStep) return
    const itemId = `${activeStep.id}-${codigo}`

    setItems((prev) => {
      const existing = prev.find((item) => item.id === itemId)
      if (existing) {
        return prev.map((item) =>
          item.id === itemId
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      }
      return [
        ...prev,
        {
          id: itemId,
          materialCodigo: codigo,
          descripcion: material.descripcion,
          precio: material.precio || 0,
          cantidad: 1,
          categoria: material.categoria || "Sin categoria",
          seccion: activeStep.id,
        },
      ]
    })
  }

  const agregarMaterialPersonalizado = (material: Material) => {
    const codigo = material.codigo?.toString()
    if (!codigo) return
    
    const itemId = `custom-${codigo}-${Date.now()}`

    setElementosPersonalizados((prev) => {
      const existing = prev.find((elem) => elem.materialCodigo === codigo)
      if (existing) {
        return prev.map((elem) =>
          elem.materialCodigo === codigo
            ? { ...elem, cantidad: elem.cantidad + 1 }
            : elem
        )
      }
      return [
        ...prev,
        {
          id: itemId,
          materialCodigo: codigo,
          descripcion: material.descripcion,
          precio: material.precio || 0,
          cantidad: 1,
          categoria: material.categoria || "Sin categoria",
        },
      ]
    })
  }

  const actualizarCantidad = (id: string, cantidad: number) => {
    setItems((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, cantidad } : item))
        .filter((item) => item.cantidad > 0)
    )
  }

  const agregarElementoPersonalizado = () => {
    setMostrarElementosPersonalizados(true)
  }

  const actualizarCantidadElementoPersonalizado = (id: string, cantidad: number) => {
    if (cantidad <= 0) {
      eliminarElementoPersonalizado(id)
    } else {
      setElementosPersonalizados((prev) =>
        prev.map((elem) =>
          elem.id === id ? { ...elem, cantidad } : elem
        )
      )
    }
  }

  const actualizarElementoPersonalizado = (
    id: string,
    field: keyof ElementoPersonalizado,
    value: string | number
  ) => {
    setElementosPersonalizados((prev) =>
      prev.map((elem) =>
        elem.id === id ? { ...elem, [field]: value } : elem
      )
    )
  }

  const eliminarElementoPersonalizado = (id: string) => {
    setElementosPersonalizados((prev) => prev.filter((elem) => elem.id !== id))
  }

  useEffect(() => {
    const loadClientes = async () => {
      setClientesLoading(true)
      try {
        const data = await ClienteService.getClientes()
        setClientes(Array.isArray(data) ? data : [])
      } catch (error) {
        setClientes([])
      } finally {
        setClientesLoading(false)
      }
    }
    loadClientes()
  }, [])

  const selectedCliente = useMemo(() => {
    if (!clienteId) return null
    return clientes.find((cliente) => cliente.id === clienteId || cliente.numero === clienteId) || null
  }, [clientes, clienteId])


  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-sm text-slate-500">
        Cargando materiales...
      </div>
    )
  }

  return (
    <div className="flex w-full flex-1 min-h-0 flex-col bg-slate-100">
      <div className="w-full h-full flex flex-col min-h-0">
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* Lateral izquierdo: configuracion de oferta */}
          <div className="flex w-full lg:w-[880px] flex-col border-b lg:border-b-0 lg:border-r bg-white flex-shrink-0">
            <div className="flex-1 overflow-y-auto">
              <div className="sticky top-0 z-10 px-4 py-2 border-b bg-white">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Presupuesto de Oferta</h3>
                  </div>
                  <Badge className="bg-slate-900 text-white hover:bg-slate-900/90 text-xs">
                    {items.length} item(s)
                  </Badge>
                </div>
              </div>

              <div className="px-4 py-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">Tipo de oferta</span>
                  <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOfertaGenerica(true)
                        setClienteId("")
                      }}
                      className={`px-3 py-1 text-sm font-semibold rounded ${
                        ofertaGenerica ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Generica
                    </button>
                    <button
                      type="button"
                      onClick={() => setOfertaGenerica(false)}
                      className={`px-3 py-1 text-sm font-semibold rounded ${
                        !ofertaGenerica ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Personalizada
                    </button>
                  </div>
                </div>

                {!ofertaGenerica && (
                  <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-slate-500" />
                      <p className="text-sm font-semibold text-slate-900">Cliente</p>
                    </div>

                    <ClienteSearchSelector
                      label="Seleccionar cliente"
                      clients={clientes}
                      value={clienteId}
                      onChange={setClienteId}
                      loading={clientesLoading}
                    />

                    {selectedCliente && (
                      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200">
                          <p className="text-sm font-semibold text-slate-900">Datos de cliente</p>
                          {(selectedCliente.numero || selectedCliente.id) && (
                            <Badge variant="outline" className="border-slate-300 text-slate-700 text-sm">
                              #{selectedCliente.numero || selectedCliente.id}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-2 text-sm text-slate-700">
                          <p><span className="font-semibold text-slate-500">Nombre:</span> {selectedCliente.nombre || "--"}</p>
                          <p><span className="font-semibold text-slate-500">CI:</span> {selectedCliente.carnet_identidad || "--"}</p>
                          <p><span className="font-semibold text-slate-500">Telefono:</span> {selectedCliente.telefono || "--"}</p>
                          <p><span className="font-semibold text-slate-500">Provincia:</span> {selectedCliente.provincia_montaje || "--"}</p>
                          <p className="sm:col-span-2"><span className="font-semibold text-slate-500">Direccion:</span> {selectedCliente.direccion || "--"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-base font-semibold text-slate-900">Presupuesto de materiales</p>
                    <div className="text-sm text-slate-500">
                      {activeStep?.label ?? "Categoria"} · {itemsPorSeccion.get(activeStep?.id ?? "")?.length ?? 0} item(s)
                    </div>
                  </div>

                  <div className="mt-3 space-y-3">
                    {steps.map((step, index) => {
                      const itemsDeSeccion = itemsPorSeccion.get(step.id) ?? []
                      const esActual = index === activeStepIndex
                      const subtotal = subtotalPorSeccion.get(step.id) ?? 0
                      const expandir = esActual || itemsDeSeccion.length > 0

                      const tieneItems = itemsDeSeccion.length > 0
                      const seccionClass = esActual
                        ? "border-l-4 border-slate-900/50 bg-slate-100/70"
                        : tieneItems
                          ? "border-l-4 border-emerald-300 bg-emerald-50/40"
                          : "border-l-4 border-slate-200 bg-white"

                      return (
                        <div
                          key={step.id}
                          className={`rounded-md border border-slate-200 px-3 py-2 ${seccionClass}`}
                        >
                          <button
                            type="button"
                            onClick={() => setActiveStepIndex(index)}
                            className="flex w-full items-center justify-between gap-2 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-400">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <span
                                className={`text-sm font-semibold ${
                                  esActual ? "text-slate-900" : "text-slate-700"
                                }`}
                              >
                                {step.label}
                              </span>
                              {tieneItems && (
                                <span className="text-xs text-slate-500">
                                  {itemsDeSeccion.length} item(s)
                                </span>
                              )}
                            </div>
                            {subtotal > 0 ? (
                              <span className="text-sm font-semibold text-slate-900">
                                {formatCurrency(subtotal)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">
                                {esActual ? "Selecciona materiales" : "Sin materiales"}
                              </span>
                            )}
                          </button>

                          {expandir && (
                            <div className="mt-2 space-y-2">
                              {itemsDeSeccion.length > 0 ? (
                                <>
                                  <div className="grid grid-cols-[minmax(0,1fr)_90px_80px_110px] text-sm text-slate-500">
                                    <span>Material</span>
                                    <span className="text-right">P. Unit</span>
                                    <span className="text-center">Cant</span>
                                    <span className="text-right">Total</span>
                                  </div>
                                  {itemsDeSeccion.map((item) => (
                                    <div
                                      key={item.id}
                                      className="grid grid-cols-[minmax(0,1fr)_90px_80px_110px] items-center gap-2"
                                    >
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 truncate">
                                          {item.descripcion}
                                        </p>
                                        <p className="text-sm text-slate-500 truncate">{item.categoria}</p>
                                      </div>
                                      <span className="text-sm text-slate-700 text-right">
                                        {formatCurrency(item.precio)}
                                      </span>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={item.cantidad.toString()}
                                        onChange={(e) =>
                                          actualizarCantidad(item.id, Number(e.target.value) || 0)
                                        }
                                        className="h-8 text-center text-sm"
                                      />
                                      <span className="text-sm font-semibold text-slate-900 text-right">
                                        {formatCurrency(item.precio * item.cantidad)}
                                      </span>
                                    </div>
                                  ))}
                                  <div className="flex items-center justify-end text-sm font-semibold text-slate-900">
                                    Subtotal: {formatCurrency(subtotal)}
                                  </div>
                                </>
                              ) : (
                                <p className="text-sm text-slate-400">
                                  Selecciona materiales en la columna derecha.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Total de Materiales */}
                  <div className="rounded-md border-2 border-slate-900 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-slate-900">Total Materiales</span>
                      <span className="text-lg font-bold text-slate-900">
                        {formatCurrency(totalMateriales)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Margen Comercial */}
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <label className="text-sm font-semibold text-slate-900">
                      Margen Comercial (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={margenComercial}
                      onChange={(e) => setMargenComercial(Number(e.target.value) || 0)}
                      className="h-9 w-24 text-right"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Subtotal con margen</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(subtotalConMargen)}
                    </span>
                  </div>
                </div>

                {/* Costo de Transportación */}
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-semibold text-slate-900">
                      Costo de Transportación (opcional)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={costoTransportacion}
                      onChange={(e) => setCostoTransportacion(Number(e.target.value) || 0)}
                      className="h-9 w-32 text-right"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Elementos Personalizados */}
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Elementos Personalizados (opcional)
                    </p>
                    <button
                      type="button"
                      onClick={() => setMostrarElementosPersonalizados(!mostrarElementosPersonalizados)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {mostrarElementosPersonalizados ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>

                  {mostrarElementosPersonalizados && (
                    <div className="space-y-3">
                      {elementosPersonalizados.length > 0 ? (
                        <>
                          <div className="grid grid-cols-[minmax(0,1fr)_90px_80px_110px_40px] text-sm text-slate-500 gap-2">
                            <span>Material</span>
                            <span className="text-right">P. Unit</span>
                            <span className="text-center">Cant</span>
                            <span className="text-right">Total</span>
                            <span></span>
                          </div>
                          {elementosPersonalizados.map((elem) => (
                            <div
                              key={elem.id}
                              className="grid grid-cols-[minmax(0,1fr)_90px_80px_110px_40px] items-center gap-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {elem.descripcion}
                                </p>
                                <p className="text-sm text-slate-500 truncate">{elem.categoria}</p>
                              </div>
                              <span className="text-sm text-slate-700 text-right">
                                {formatCurrency(elem.precio)}
                              </span>
                              <Input
                                type="number"
                                min="0"
                                value={elem.cantidad}
                                onChange={(e) =>
                                  actualizarCantidadElementoPersonalizado(elem.id, Number(e.target.value) || 0)
                                }
                                className="h-8 text-center text-sm"
                              />
                              <span className="text-sm font-semibold text-slate-900 text-right">
                                {formatCurrency(elem.precio * elem.cantidad)}
                              </span>
                              <button
                                type="button"
                                onClick={() => eliminarElementoPersonalizado(elem.id)}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <div className="flex items-center justify-end text-sm font-semibold text-slate-900 pt-2 border-t border-slate-200">
                            Subtotal: {formatCurrency(totalElementosPersonalizados)}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-3">
                          Selecciona materiales en la columna derecha para agregar elementos personalizados
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Precio Final */}
                <div className="rounded-md border-2 border-emerald-600 bg-emerald-50 px-4 py-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-slate-700">
                      <span>Materiales + Margen ({margenComercial}%)</span>
                      <span className="font-medium">{formatCurrency(subtotalConMargen)}</span>
                    </div>
                    {costoTransportacion > 0 && (
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <span>Transportación</span>
                        <span className="font-medium">{formatCurrency(costoTransportacion)}</span>
                      </div>
                    )}
                    {totalElementosPersonalizados > 0 && (
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <span>Elementos Personalizados</span>
                        <span className="font-medium">{formatCurrency(totalElementosPersonalizados)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t-2 border-emerald-600">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-emerald-900">Precio Final</span>
                        <span className="text-xl font-bold text-emerald-900">
                          {formatCurrency(precioFinal)}
                        </span>
                      </div>
                      {precioFinal !== totalSinRedondeo && (
                        <p className="text-xs text-slate-600 text-right mt-1">
                          (Redondeado desde {formatCurrency(totalSinRedondeo)})
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel derecho: grid de materiales */}
          <div className="w-full flex-1 min-h-0 flex flex-col bg-white">
            {/* Buscador */}
            <div className="sticky top-0 z-10 px-6 py-4 border-b bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar materiales por descripción, código o categoría..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              {mostrarElementosPersonalizados && (
                <p className="text-xs text-blue-600 mt-2 font-medium">
                  Modo: Elementos Personalizados - Haz clic en un material para agregarlo
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {materialesFiltrados.length === 0 ? (
                <div className="flex items-center justify-center min-h-full text-gray-400">
                  <div className="text-center">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-base font-medium text-gray-600 mb-1">
                      {searchQuery ? "No se encontraron materiales" : "No hay materiales disponibles"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {searchQuery
                        ? `No hay resultados para "${searchQuery}"`
                        : `No hay materiales en ${activeStep?.label ?? "esta categoria"}`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-5 min-h-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {materialesFiltrados.map((material) => {
                      const key = mostrarElementosPersonalizados
                        ? `PERSONALIZADO:${material.codigo?.toString() ?? ""}`
                        : `${activeStep?.id ?? ""}:${material.codigo?.toString() ?? ""}`
                      const selectedCount = cantidadesPorMaterial.get(key) ?? 0
                      return (
                        <Card
                          key={`${material.codigo}-${material.categoria}`}
                          className="cursor-pointer hover:shadow-lg transition-shadow border border-slate-200 bg-white overflow-hidden"
                          onClick={() =>
                            mostrarElementosPersonalizados
                              ? agregarMaterialPersonalizado(material)
                              : agregarMaterial(material)
                          }
                        >
                          <CardContent className="p-3">
                            <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden border border-slate-200">
                              {material.foto ? (
                                <>
                                  <img
                                    src={material.foto}
                                    alt={material.descripcion}
                                    className="w-full h-full object-contain p-2"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.style.display = "none"
                                      const fallback = target.nextElementSibling as HTMLElement
                                      if (fallback) fallback.classList.remove("hidden")
                                    }}
                                  />
                                  <div className="hidden w-full h-full items-center justify-center">
                                    <Package className="h-12 w-12 text-slate-300" />
                                  </div>
                                </>
                              ) : (
                                <Package className="h-12 w-12 text-slate-300" />
                              )}
                              {selectedCount ? (
                                <span className="absolute top-2 right-2 rounded-full bg-orange-600 text-white text-xs font-bold px-2.5 py-1 shadow-lg border-2 border-white">
                                  {selectedCount}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
                              <h3 className="font-medium text-sm line-clamp-2 min-h-[40px] text-slate-900 break-words">
                                {material.descripcion}
                              </h3>
                            </div>
                            <div className="mt-auto flex items-center justify-between gap-2 min-w-0">
                              <p className="text-base font-semibold text-orange-600">
                                ${material.precio ? material.precio.toFixed(2) : "0.00"}
                              </p>
                              <Badge
                                variant="outline"
                                className="text-xs border border-blue-200 text-blue-700 bg-blue-50 flex-shrink-0 max-w-[60%] truncate"
                              >
                                {material.categoria}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
