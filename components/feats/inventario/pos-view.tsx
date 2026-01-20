"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Badge } from "@/components/shared/atom/badge"
import { Package, Plus, ScanLine, Search, ShoppingCart, DollarSign } from "lucide-react"
import { useMaterials } from "@/hooks/use-materials"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { EntradaSalidaEfectivoDialog } from "./entrada-salida-efectivo-dialog"
import { useToast } from "@/hooks/use-toast"

interface Producto {
  id: string
  nombre: string
  precio: number
  categoria: string
  imagen?: string
}

interface ItemOrden {
  materialCodigo: string
  descripcion: string
  precio: number
  cantidad: number
  categoria: string
}

interface Orden {
  id: string
  numero: string
  items: ItemOrden[]
  total: number
  fecha: Date
}

interface PosViewProps {
  tiendaId: string
}

export function PosView({ tiendaId }: PosViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoriaActiva, setCategoriaActiva] = useState("Todos")
  const [isEfectivoDialogOpen, setIsEfectivoDialogOpen] = useState(false)
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [ordenActiva, setOrdenActiva] = useState<string | null>(null)
  const [itemSeleccionado, setItemSeleccionado] = useState<string | null>(null)
  const [tecladoModo, setTecladoModo] = useState<"cantidad" | "impuesto" | "descuento">("cantidad")
  const [tecladoInput, setTecladoInput] = useState("")
  const [impuestoPorcentaje, setImpuestoPorcentaje] = useState(0)
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0)
  const router = useRouter()
  const { toast } = useToast()
  
  // Obtener categorías y materiales desde el backend
  const { categories, materials, loading: loadingCategories } = useMaterials()
  
  // Agregar "Todos" al inicio de las categorías
  const categorias = useMemo(() => ["Todos", ...categories], [categories])

  const categoriaStyles = useMemo(
    () => ({
      Todos: "border-gray-200 text-gray-700",
    }),
    []
  )

  // Obtener la orden activa
  const ordenActual = useMemo(() => {
    return ordenes.find(o => o.id === ordenActiva) || null
  }, [ordenes, ordenActiva])

  // Generar número de orden en formato YYYYMMDD-consecutivo
  const generarNumeroOrden = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const datePrefix = `${year}${month}${day}`
    
    // Contar órdenes del día
    const ordenesHoy = ordenes.filter(o => o.numero.startsWith(datePrefix))
    const consecutivo = String(ordenesHoy.length + 1).padStart(3, '0')
    
    return `${datePrefix}-${consecutivo}`
  }

  // Crear nueva orden
  const crearNuevaOrden = () => {
    const numeroOrden = generarNumeroOrden()
    const nuevaOrden: Orden = {
      id: `orden-${Date.now()}`,
      numero: numeroOrden,
      items: [],
      total: 0,
      fecha: new Date()
    }
    
    setOrdenes(prev => [...prev, nuevaOrden])
    setOrdenActiva(nuevaOrden.id)
    
    toast({
      title: "Orden creada",
      description: `Orden ${numeroOrden} creada exitosamente`,
    })
  }

  // Agregar producto a la orden activa
  const agregarProductoAOrden = (material: any) => {
    if (!ordenActiva) {
      toast({
        title: "Sin orden activa",
        description: "Crea una orden primero",
        variant: "destructive",
      })
      return
    }

    const materialCodigo = material.codigo.toString()
    const cantidadPrev = ordenActual?.items.find(item => item.materialCodigo === materialCodigo)?.cantidad ?? 0

    setOrdenes(prev => prev.map(orden => {
      if (orden.id !== ordenActiva) return orden

      const itemExistente = orden.items.find(item => item.materialCodigo === materialCodigo)
      
      let nuevosItems: ItemOrden[]
      if (itemExistente) {
        // Incrementar cantidad
        nuevosItems = orden.items.map(item =>
          item.materialCodigo === materialCodigo
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      } else {
        // Agregar nuevo item
        nuevosItems = [
          ...orden.items,
          {
            materialCodigo: materialCodigo,
            descripcion: material.descripcion,
            precio: material.precio || 0,
            cantidad: 1,
            categoria: material.categoria
          }
        ]
      }

      const nuevoTotal = nuevosItems.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)

      return {
        ...orden,
        items: nuevosItems,
        total: nuevoTotal
      }
    }))

    setItemSeleccionado(materialCodigo)
    setTecladoModo("cantidad")
    setTecladoInput(String(cantidadPrev + 1))
  }

  // Eliminar item de la orden
  const eliminarItemDeOrden = (materialCodigo: string) => {
    if (!ordenActiva) return

    setOrdenes(prev => prev.map(orden => {
      if (orden.id !== ordenActiva) return orden

      const nuevosItems = orden.items.filter(item => item.materialCodigo !== materialCodigo)
      const nuevoTotal = nuevosItems.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)

      return {
        ...orden,
        items: nuevosItems,
        total: nuevoTotal
      }
    }))
  }

  // Cambiar cantidad de un item
  const cambiarCantidadItem = (materialCodigo: string, nuevaCantidad: number) => {
    if (!ordenActiva || nuevaCantidad < 0) return

    setOrdenes(prev => prev.map(orden => {
      if (orden.id !== ordenActiva) return orden

      const nuevosItems = orden.items.map(item =>
        item.materialCodigo === materialCodigo
          ? { ...item, cantidad: nuevaCantidad }
          : item
      )

      const nuevoTotal = nuevosItems.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)

      return {
        ...orden,
        items: nuevosItems,
        total: nuevoTotal
      }
    }))
  }

  // Filtrar materiales por búsqueda y categoría
  const productosFiltrados = useMemo(() => {
    return materials.filter((material) => {
      const matchCategoria = categoriaActiva === "Todos" || material.categoria === categoriaActiva
      const matchSearch = 
        material.codigo.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
        material.descripcion.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCategoria && matchSearch
    })
  }, [materials, categoriaActiva, searchQuery])

  const itemActual = useMemo(() => {
    if (!ordenActual || !itemSeleccionado) return null
    return ordenActual.items.find(item => item.materialCodigo === itemSeleccionado) || null
  }, [ordenActual, itemSeleccionado])

  const cantidadesPorMaterial = useMemo(() => {
    const map = new Map<string, number>()
    if (!ordenActual) return map
    ordenActual.items.forEach((item) => {
      map.set(item.materialCodigo, item.cantidad)
    })
    return map
  }, [ordenActual])

  const handleEfectivoConfirm = (tipo: "entrada" | "salida", monto: number, motivo: string) => {
    // TODO: Llamar al endpoint del backend para registrar el movimiento
    toast({
      title: tipo === "entrada" ? "Entrada registrada" : "Salida registrada",
      description: `${tipo === "entrada" ? "Entrada" : "Salida"} de $${monto.toFixed(2)} registrada correctamente`,
    })
    setIsEfectivoDialogOpen(false)
  }

  const aplicarValorTeclado = (next: string) => {
    const parsed = parseFloat(next.replace(",", "."))
    const safeParsed = Number.isNaN(parsed) ? 0 : parsed

    if (tecladoModo === "impuesto") {
      setImpuestoPorcentaje(Math.max(0, safeParsed))
      return
    }
    if (tecladoModo === "descuento") {
      setDescuentoPorcentaje(Math.max(0, safeParsed))
      return
    }

    if (!itemSeleccionado) {
      toast({
        title: "Selecciona un producto",
        description: "Elige un item de la orden para editarlo.",
      })
      return
    }

    if (tecladoModo === "cantidad") {
      const cantidad = Math.max(0, Math.floor(safeParsed))
      cambiarCantidadItem(itemSeleccionado, cantidad)
    }
  }

  const clearAllItems = () => {
    if (!ordenActiva) return
    setOrdenes(prev => prev.map(orden => (
      orden.id === ordenActiva
        ? { ...orden, items: [], total: 0 }
        : orden
    )))
    setItemSeleccionado(null)
    setTecladoInput("")
  }

  const handleTecla = (key: string) => {
    let next = tecladoInput

    if (key === "C") {
      next = next.slice(0, -1)
    } else if (key === "AC") {
      next = ""
    } else if (key === ",") {
      if (!next.includes(",")) {
        next = next.length === 0 ? "0," : `${next},`
      }
    } else {
      next = `${next}${key}`
    }

    setTecladoInput(next)
    aplicarValorTeclado(next)
  }

  const formatCurrency = (value: number) => {
    return `${new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} $`
  }

  const formatInputValue = (value: number) => {
    return value.toFixed(2).replace(".", ",")
  }

  return (
    <div className="flex h-full flex-col bg-slate-100" data-tienda-id={tiendaId}>
      <div className="w-full h-full flex flex-col min-h-0">
        {/* Sección principal de órdenes y productos */}
        <div className="flex-1 min-h-0 flex flex-col bg-white m-4 mt-2 rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {/* Barra de órdenes con buscador integrado */}
          <div className="flex-shrink-0 border-b">
            <div className="flex flex-wrap items-center gap-3 px-6 py-2">
              {/* Botones de órdenes a la izquierda */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="default" 
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 h-9"
                  onClick={crearNuevaOrden}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva orden
                </Button>

                <Button variant="outline" size="sm" className="h-9">
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Ver órdenes
                </Button>
              </div>

              {/* Buscador, filtro y botones a la derecha */}
              <div className="w-full lg:w-auto lg:ml-auto flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar productos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-slate-50 text-sm"
                  />
                </div>

                <Select value={categoriaActiva} onValueChange={setCategoriaActiva}>
                  <SelectTrigger className="w-full sm:w-[180px] h-9">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" size="icon" className="h-9 w-9">
                  <ScanLine className="h-4 w-4" />
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9"
                  onClick={() => setIsEfectivoDialogOpen(true)}
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Entrada/Salida de efectivo
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  onClick={() => router.push(`/tiendas/${tiendaId}`)}
                >
                  Cerrar caja
                </Button>
              </div>
            </div>
          </div>

          {/* Contenedor de productos con scroll */}
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
            {/* Panel izquierdo de orden */}
            <div className="flex w-full lg:w-[400px] flex-col border-b lg:border-b-0 lg:border-r bg-white flex-shrink-0">
              {ordenActual ? (
                <>
                  <div className="flex-1 overflow-y-auto">
                    <div className="divide-y divide-slate-100">
                      {ordenActual.items.map((item) => (
                        <div
                          key={item.materialCodigo}
                          className={`px-3 py-2 flex items-start justify-between gap-3 cursor-pointer group ${
                            itemSeleccionado === item.materialCodigo ? "bg-teal-50" : "hover:bg-teal-50"
                          }`}
                          onClick={() => {
                            setItemSeleccionado(item.materialCodigo)
                            setTecladoModo("cantidad")
                            setTecladoInput(String(item.cantidad))
                          }}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <span className="w-8 text-right text-base font-semibold text-slate-900">
                              {item.cantidad}
                            </span>
                            <div className="min-w-0">
                              <p className="text-base font-normal text-slate-900 truncate">
                                {item.descripcion}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-semibold text-slate-900 whitespace-nowrap">
                              {formatCurrency(item.precio * item.cantidad)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                eliminarItemDeOrden(item.materialCodigo)
                              }}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-orange-600 text-lg leading-none transition-opacity"
                              aria-label="Quitar producto"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {ordenActual.items.length === 0 && (
                      <div className="flex items-center justify-center h-64 text-gray-400">
                        <div className="text-center">
                          <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">Sin productos</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t px-3 py-2 space-y-1">
                    <div className="flex items-center justify-between text-base text-slate-500">
                      <span>Impuestos ({impuestoPorcentaje.toFixed(2)}%)</span>
                      <span>{formatCurrency(ordenActual.total * (impuestoPorcentaje / 100))}</span>
                    </div>
                    {descuentoPorcentaje > 0 ? (
                      <div className="flex items-center justify-between text-base text-slate-500">
                        <span>Descuento ({descuentoPorcentaje.toFixed(2)}%)</span>
                        <span>-{formatCurrency(ordenActual.total * (descuentoPorcentaje / 100))}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between text-xl font-semibold text-slate-900">
                      <span>Total</span>
                      <span>
                        {formatCurrency(
                          ordenActual.total
                          - (ordenActual.total * (descuentoPorcentaje / 100))
                          + (ordenActual.total * (impuestoPorcentaje / 100))
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="border-t px-4 py-4">
                    <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                      <span>
                        {tecladoModo === "cantidad" && "Modo: Cantidad"}
                        {tecladoModo === "impuesto" && "Modo: Impuesto"}
                        {tecladoModo === "descuento" && "Modo: Descuento"}
                      </span>
                      <span className="text-slate-700">{tecladoInput || "0"}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-0 rounded-md overflow-hidden border border-slate-200 bg-slate-50">
                      {[
                        "1", "2", "3", "Cant.",
                        "4", "5", "6", "Desc.",
                        "7", "8", "9", "Imp.",
                        ",", "0", "C", "AC",
                      ].map((key, index) => {
                        const isModo =
                          (key === "Cant." && tecladoModo === "cantidad") ||
                          (key === "Imp." && tecladoModo === "impuesto") ||
                          (key === "Desc." && tecladoModo === "descuento")

                        return (
                          <button
                            key={`${key}-${index}`}
                            type="button"
                            onClick={() => {
                              if (key === "Cant.") {
                                setTecladoModo("cantidad")
                                setTecladoInput(itemActual ? String(itemActual.cantidad) : "")
                                return
                              }
                              if (key === "Imp.") {
                                setTecladoModo("impuesto")
                                setTecladoInput(formatInputValue(impuestoPorcentaje))
                                return
                              }
                              if (key === "Desc.") {
                                setTecladoModo("descuento")
                                setTecladoInput(formatInputValue(descuentoPorcentaje))
                                return
                              }

                              if (key === "AC") {
                                clearAllItems()
                                return
                              }

                              handleTecla(key)
                            }}
                              className={[
                              "h-14 text-lg font-extrabold border border-slate-200 bg-slate-50 transition-colors",
                              isModo ? "bg-teal-100 border-teal-400 text-teal-900" : "",
                              key === "Desc." ? "bg-amber-200 hover:bg-amber-300" : "",
                              key === "," ? "bg-orange-100 hover:bg-orange-200" : "",
                              key === "C" ? "bg-rose-200 text-rose-800 hover:bg-rose-300" : "",
                              key === "AC" ? "bg-rose-300 text-rose-900 hover:bg-rose-400" : "",
                              key === "Cant." ? "bg-sky-100 hover:bg-sky-200" : "",
                              key === "Imp." ? "bg-emerald-100 hover:bg-emerald-200" : "",
                              key === "+" ? "bg-slate-50" : "",
                            ].join(" ").trim()}
                          >
                            {key}
                          </button>
                        )
                      })}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3 w-full">
                      <Button className="h-10 bg-orange-600 hover:bg-orange-700 text-base">
                        Pago
                      </Button>
                      <Button variant="outline" className="h-10 text-slate-700 bg-white text-base">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center text-slate-500">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">Crea una orden para comenzar</p>
                  </div>
                </div>
              )}
            </div>

            {/* Area principal de productos con scroll */}
            <div className="w-full flex-1 min-h-0 overflow-y-auto">
              <div className="px-6 py-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {productosFiltrados.map((material) => (
                      <Card
                        key={`${material.codigo}-${material.categoria}`}
                        className="cursor-pointer hover:shadow-lg transition-shadow border border-slate-200 bg-white"
                        onClick={() => agregarProductoAOrden(material)}
                      >
                        <CardContent className="p-3">
                          <div className="relative aspect-[4/3] bg-slate-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                            {material.foto ? (
                              <img 
                                src={material.foto} 
                                alt={material.descripcion}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <Package className={`h-10 w-10 text-slate-300 ${material.foto ? 'hidden' : ''}`} />
                            {cantidadesPorMaterial.get(material.codigo?.toString() ?? "") ? (
                              <span className="absolute top-2 right-2 rounded-full bg-orange-600 text-white text-xs font-semibold px-2 py-0.5 shadow-md">
                                {cantidadesPorMaterial.get(material.codigo.toString())}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-medium text-sm line-clamp-2 min-h-[40px] text-slate-900">
                              {material.descripcion}
                            </h3>
                            <Badge
                              variant="outline"
                              className="text-xs border border-blue-200 text-blue-700 bg-blue-50 flex-shrink-0"
                            >
                              {material.categoria}
                            </Badge>
                          </div>
                          <div className="mt-auto">
                            <p className="text-base font-semibold text-orange-600">
                              ${material.precio ? material.precio.toFixed(2) : '0.00'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {productosFiltrados.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <p>No se encontraron materiales</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Diálogo de Entrada/Salida de Efectivo */}
        <EntradaSalidaEfectivoDialog
          open={isEfectivoDialogOpen}
          onOpenChange={setIsEfectivoDialogOpen}
          onConfirm={handleEfectivoConfirm}
        />
      </div>
    )
}

