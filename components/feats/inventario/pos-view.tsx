"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Badge } from "@/components/shared/atom/badge"
import { Package, Plus, ScanLine, Search, ShoppingCart, DollarSign } from "lucide-react"
import { useMaterials } from "@/hooks/use-materials"
import { useInventario } from "@/hooks/use-inventario"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { EntradaSalidaEfectivoDialog } from "./entrada-salida-efectivo-dialog"
import { CierreCajaDialog } from "./cierre-caja-dialog"
import { useToast } from "@/hooks/use-toast"
import { useCaja } from "@/hooks/use-caja"
import { ClienteService } from "@/lib/services/feats/customer/cliente-service"
import type { Cliente } from "@/lib/types/feats/customer/cliente-types"
import { PagoDialog } from "./pago-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { cajaService } from "@/lib/services/feats/caja/caja-service"
import type { ItemOrden as ItemOrdenBackend, OrdenCompra } from "@/lib/types/feats/caja-types"
import { ReciboService } from "@/lib/services/feats/caja/recibo-service"

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
  almacen_id: string  // Almacén del cual se descuenta
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
  sesionId: string
}

export function PosView({ tiendaId, sesionId }: PosViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoriaActiva, setCategoriaActiva] = useState("Todos")
  const [isEfectivoDialogOpen, setIsEfectivoDialogOpen] = useState(false)
  const [isPagoDialogOpen, setIsPagoDialogOpen] = useState(false)
  const [isCierreDialogOpen, setIsCierreDialogOpen] = useState(false)
  const [isOrdenesDialogOpen, setIsOrdenesDialogOpen] = useState(false)
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [ordenActiva, setOrdenActiva] = useState<string | null>(null)
  const [ordenesBackend, setOrdenesBackend] = useState<OrdenCompra[]>([])
  const [cargandoOrdenesBackend, setCargandoOrdenesBackend] = useState(false)
  const [clientesCaja, setClientesCaja] = useState<Cliente[]>([])
  const [cargandoClientesCaja, setCargandoClientesCaja] = useState(false)
  const [ordenSearch, setOrdenSearch] = useState("")
  const [ordenEstado, setOrdenEstado] = useState("todas")
  const [ordenSeleccionadaId, setOrdenSeleccionadaId] = useState<string | null>(null)
  const [itemSeleccionado, setItemSeleccionado] = useState<string | null>(null)
  const [tecladoModo, setTecladoModo] = useState<"cantidad" | "impuesto" | "descuento">("cantidad")
  const [tecladoInput, setTecladoInput] = useState("")
  const [impuestoPorcentaje, setImpuestoPorcentaje] = useState(16)
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0)
  const [almacenId, setAlmacenId] = useState<string>("")
  const router = useRouter()
  const { toast } = useToast()
  const { sesionActiva, registrarMovimiento, crearOrden, procesarPago, cerrarSesion } = useCaja(tiendaId)
  
  // Obtener categorías y materiales desde el backend
  const { categories, materials, loading: loadingCategories } = useMaterials()
  const { almacenes, tiendas, stock, refetchStock, loading: loadingAlmacenes } = useInventario()
  
  // Obtener almacenes de la tienda actual desde la relación tienda->almacenes
  const almacenesTienda = useMemo(() => {
    const tienda = tiendas.find(t => t.id === tiendaId)
    if (!tienda || !tienda.almacenes) return []
    
    // Mapear los IDs de almacenes de la tienda a los objetos completos
    return tienda.almacenes
      .map(almacenInfo => almacenes.find(a => a.id === almacenInfo.id))
      .filter((a): a is NonNullable<typeof a> => a !== undefined)
  }, [almacenes, tiendas, tiendaId])

  // Seleccionar automáticamente el primer almacén si solo hay uno
  useEffect(() => {
    if (almacenesTienda.length === 1 && !almacenId) {
      setAlmacenId(almacenesTienda[0].id)
    }
  }, [almacenesTienda, almacenId])

  // Cargar stock cuando se selecciona un almacén
  useEffect(() => {
    if (almacenId) {
      refetchStock(almacenId)
    }
  }, [almacenId, refetchStock])

  // Obtener materiales con stock en el almacén seleccionado
  const materialesConStock = useMemo(() => {
    if (!almacenId) return []
    
    // Filtrar stock del almacén seleccionado
    const stockAlmacen = stock.filter(s => s.almacen_id === almacenId && s.cantidad > 0)
    
    // Mapear a materiales con información de stock
    return stockAlmacen
      .map(stockItem => {
        const material = materials.find(m => m.codigo.toString() === stockItem.material_codigo)
        if (!material) return null
        return {
          ...material,
          stock_disponible: stockItem.cantidad
        }
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
  }, [almacenId, stock, materials])
  
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

    if (!almacenId) {
      toast({
        title: "Selecciona un almacén",
        description: "Debes seleccionar un almacén antes de agregar productos",
        variant: "destructive",
      })
      return
    }

    const materialCodigo = material.codigo.toString()
    const cantidadPrev = ordenActual?.items.find(item => item.materialCodigo === materialCodigo)?.cantidad ?? 0
    const nuevaCantidad = cantidadPrev + 1

    // Validar stock disponible
    if (material.stock_disponible && nuevaCantidad > material.stock_disponible) {
      toast({
        title: "Stock insuficiente",
        description: `Solo hay ${material.stock_disponible} unidades disponibles`,
        variant: "destructive",
      })
      return
    }

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
        // Agregar nuevo item con el almacén seleccionado
        nuevosItems = [
          ...orden.items,
          {
            materialCodigo: materialCodigo,
            descripcion: material.descripcion,
            precio: material.precio || 0,
            cantidad: 1,
            categoria: material.categoria,
            almacen_id: almacenId  // Asignar almacén seleccionado
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
    setTecladoInput(String(nuevaCantidad))
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

    // Validar stock disponible
    const materialConStock = materialesConStock.find(m => m.codigo.toString() === materialCodigo)
    if (materialConStock && materialConStock.stock_disponible && nuevaCantidad > materialConStock.stock_disponible) {
      toast({
        title: "Stock insuficiente",
        description: `Solo hay ${materialConStock.stock_disponible} unidades disponibles`,
        variant: "destructive",
      })
      return
    }

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

  // Filtrar materiales por búsqueda y categoría (solo si hay almacén seleccionado)
  const productosFiltrados = useMemo(() => {
    if (!almacenId) return [] // No mostrar productos si no hay almacén seleccionado
    
    return materialesConStock.filter((material) => {
      const matchCategoria = categoriaActiva === "Todos" || material.categoria === categoriaActiva
      const matchSearch = 
        material.codigo.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
        material.descripcion.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCategoria && matchSearch
    })
  }, [materialesConStock, categoriaActiva, searchQuery, almacenId])

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

  const handleEfectivoConfirm = async (tipo: "entrada" | "salida", monto: number, motivo: string) => {
    try {
      await registrarMovimiento(tipo, monto, motivo)
      setIsEfectivoDialogOpen(false)
    } catch (error) {
      // El error ya se muestra en el hook
    }
  }

  const handleProcesarPago = async (
    metodoPago: any,
    pagos: any[],
    clienteData?: {
      cliente_id?: string
      cliente_nombre?: string
      cliente_ci?: string
      cliente_telefono?: string
    }
  ) => {
    if (!ordenActual) {
      toast({
        title: "Error",
        description: "No hay orden activa",
        variant: "destructive",
      })
      return
    }

    // Verificar que todos los items tengan almacén asignado
    const itemsSinAlmacen = ordenActual.items.filter(item => !item.almacen_id)
    if (itemsSinAlmacen.length > 0) {
      toast({
        title: "Error",
        description: "Todos los items deben tener un almacén asignado",
        variant: "destructive",
      })
      return
    }

    try {
      // Crear la orden en el backend con almacén por item
      const items: Omit<ItemOrdenBackend, 'subtotal'>[] = ordenActual.items.map(item => ({
        material_codigo: item.materialCodigo,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        categoria: item.categoria,
        almacen_id: item.almacen_id,
      }))

      const ordenBackend = await crearOrden(
        items,
        impuestoPorcentaje,
        descuentoPorcentaje,
        clienteData
      )

      // Procesar el pago - el backend usará el almacén especificado
      // Nota: Como cada item puede tener su propio almacén, usamos el primer almacén
      // para la orden general, pero el backend debería manejar múltiples almacenes
      const primerAlmacen = ordenActual.items[0].almacen_id
      const resultadoPago = await procesarPago(ordenBackend.id, metodoPago, pagos, primerAlmacen)

      // Refrescar el stock del almacén para actualizar las cantidades disponibles
      await refetchStock(almacenId)

      // Guardar el recibo automáticamente en la carpeta seleccionada
      try {
        const tiendaActual = tiendas.find(t => t.id === tiendaId)
        
        if (ReciboService.tieneCarpetaSeleccionada()) {
          // Guardar automáticamente en la carpeta seleccionada
          await ReciboService.guardarReciboAutomatico({
            orden: resultadoPago.orden,
            nombreTienda: tiendaActual?.nombre || 'SUNCAR BOLIVIA',
            direccionTienda: tiendaActual?.direccion,
            telefonoTienda: tiendaActual?.telefono,
          })
          
          toast({
            title: "Recibo guardado",
            description: "El recibo se guardó automáticamente en la carpeta configurada",
          })
        } else {
          // Si no hay carpeta seleccionada, descargar normalmente
          ReciboService.descargarRecibo({
            orden: resultadoPago.orden,
            nombreTienda: tiendaActual?.nombre || 'SUNCAR BOLIVIA',
            direccionTienda: tiendaActual?.direccion,
            telefonoTienda: tiendaActual?.telefono,
          })
        }
      } catch (errorRecibo: any) {
        console.error('Error al guardar recibo:', errorRecibo)
        toast({
          title: "Error al guardar recibo",
          description: errorRecibo.message || "No se pudo guardar el recibo automáticamente",
          variant: "destructive",
        })
      }

      // Limpiar la orden local
      setOrdenes(prev => prev.filter(o => o.id !== ordenActiva))
      setOrdenActiva(null)
      setItemSeleccionado(null)
      setTecladoInput("")
      setIsPagoDialogOpen(false)

      toast({
        title: "Venta completada",
        description: `Orden ${ordenBackend.numero_orden} procesada exitosamente`,
      })
    } catch (error) {
      // El error ya se muestra en el hook
    }
  }

  const handleAbrirPago = () => {
    if (!ordenActual || ordenActual.items.length === 0) {
      toast({
        title: "Sin productos",
        description: "Agrega productos a la orden primero",
        variant: "destructive",
      })
      return
    }

    // Verificar que todos los items tengan almacén
    const itemsSinAlmacen = ordenActual.items.filter(item => !item.almacen_id)
    if (itemsSinAlmacen.length > 0) {
      toast({
        title: "Almacén requerido",
        description: "Todos los productos deben tener un almacén asignado",
        variant: "destructive",
      })
      return
    }

    setIsPagoDialogOpen(true)
  }

  const handleVerOrdenes = async () => {
    if (!sesionActiva) {
      toast({
        title: "Sin sesión activa",
        description: "No hay una sesión de caja abierta.",
        variant: "destructive",
      })
      return
    }

    try {
      setCargandoOrdenesBackend(true)
      const ordenes = await cajaService.listarOrdenes({
        sesion_caja_id: sesionActiva.id,
        tienda_id: tiendaId,
      })
      setOrdenesBackend(ordenes)
      if (!clientesCaja.length && !cargandoClientesCaja) {
        setCargandoClientesCaja(true)
        try {
          const data = await ClienteService.getClientes()
          setClientesCaja(Array.isArray(data) ? data : [])
        } catch (error) {
          setClientesCaja([])
        } finally {
          setCargandoClientesCaja(false)
        }
      }
      setOrdenSeleccionadaId(ordenes[0]?.id ?? null)
      setIsOrdenesDialogOpen(true)
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || error?.message || "Error al cargar órdenes"
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setCargandoOrdenesBackend(false)
    }
  }

  const ordenSeleccionada = useMemo(
    () => ordenesBackend.find((orden) => orden.id === ordenSeleccionadaId) || null,
    [ordenesBackend, ordenSeleccionadaId]
  )

  const ordenesFiltradas = useMemo(() => {
    const search = ordenSearch.trim().toLowerCase()
    const estado = ordenEstado === "todas" ? "" : ordenEstado

    return ordenesBackend
      .filter((orden) => {
        if (estado && orden.estado !== estado) return false
        if (!search) return true
        const parts = [
          orden.numero_orden,
          orden.cliente_nombre,
          orden.cliente_telefono,
          orden.metodo_pago,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return parts.includes(search)
      })
      .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
  }, [ordenesBackend, ordenSearch, ordenEstado])

  const clientesPorId = useMemo(() => {
    const map = new Map<string, string>()
    clientesCaja.forEach((cliente) => {
      if (cliente.id) map.set(cliente.id, cliente.nombre)
      if (cliente.numero) map.set(cliente.numero, cliente.nombre)
    })
    return map
  }, [clientesCaja])

  const resolveClienteNombre = (orden: OrdenCompra) => {
    if (orden.cliente_id) {
      return clientesPorId.get(orden.cliente_id) || orden.cliente_nombre || "Cliente instaladora"
    }
    return orden.cliente_nombre || "Cliente sin nombre"
  }

  const getClienteDatosOrden = (orden: OrdenCompra | null) => {
    if (!orden) return null
    let nombre = resolveClienteNombre(orden)
    let ci = orden.cliente_ci
    let telefono = orden.cliente_telefono
    if (orden.cliente_id) {
      const clienteInstaladora = clientesCaja.find(
        (cliente) => cliente.id === orden.cliente_id || cliente.numero === orden.cliente_id
      )
      if (clienteInstaladora) {
        nombre = clienteInstaladora.nombre || nombre
        ci = clienteInstaladora.carnet_identidad || ci
        telefono = clienteInstaladora.telefono || telefono
      }
    }
    return { nombre, ci, telefono }
  }

  useEffect(() => {
    if (!ordenesFiltradas.length) {
      setOrdenSeleccionadaId(null)
      return
    }
    if (!ordenSeleccionadaId || !ordenesFiltradas.some((orden) => orden.id === ordenSeleccionadaId)) {
      setOrdenSeleccionadaId(ordenesFiltradas[0].id)
    }
  }, [ordenesFiltradas, ordenSeleccionadaId])

  const getOrdenEstadoBadge = (estado: string) => {
    const base = "text-xs whitespace-nowrap px-3 py-1.5"
    if (estado === "pagada") return `${base} bg-emerald-100 text-emerald-800`
    if (estado === "cancelada") return `${base} bg-rose-100 text-rose-800`
    return `${base} bg-amber-100 text-amber-800`
  }

  const getCambioOrden = (orden: OrdenCompra | null) => {
    if (!orden) return 0
    const pagoEfectivo = orden.pagos?.find((pago) => pago.metodo === "efectivo")
    if (pagoEfectivo?.cambio) return pagoEfectivo.cambio
    if (pagoEfectivo?.monto_recibido) return Math.max(0, pagoEfectivo.monto_recibido - orden.total)
    return 0
  }

  const getPagoEfectivoOrden = (orden: OrdenCompra | null) => {
    if (!orden) return null
    return orden.pagos?.find((pago) => pago.metodo === "efectivo") || null
  }

  const calcularTotalConImpuestosDescuentos = () => {
    if (!ordenActual) return 0
    const subtotal = ordenActual.total
    const descuento = subtotal * (descuentoPorcentaje / 100)
    const base = subtotal - descuento
    const impuesto = base * (impuestoPorcentaje / 100)
    return base + impuesto
  }

  const handleCerrarCaja = async (efectivoCierre: number, notas: string) => {
    try {
      await cerrarSesion(efectivoCierre, notas)
      setIsCierreDialogOpen(false)
      router.push(`/tiendas/${tiendaId}`)
    } catch (error) {
      // El error ya se muestra en el hook
    }
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

  const clienteDatosSeleccionada = getClienteDatosOrden(ordenSeleccionada)

  return (
    <div className="flex w-full flex-1 min-h-0 flex-col bg-slate-100" data-tienda-id={tiendaId}>
      <div className="w-full h-full flex flex-col min-h-0">
        {/* Sección principal de órdenes y productos */}
        <div className="flex-1 min-h-0 flex flex-col bg-white m-4 mt-2 rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {/* Barra de órdenes con buscador integrado */}
          <div className="flex-shrink-0 border-b">
            <div className="flex items-center justify-between gap-2 px-4 py-2">
              {/* Botones de órdenes a la izquierda */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="default" 
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 h-9 px-3"
                  onClick={crearNuevaOrden}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva
                </Button>

                <Button variant="outline" size="sm" className="h-9 px-3" onClick={handleVerOrdenes}>
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Órdenes
                </Button>
              </div>

              {/* Controles a la derecha */}
              <div className="flex items-center gap-2">
                {/* Buscador */}
                <div className="relative w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 bg-slate-50 text-sm"
                  />
                </div>

                {/* Selector de almacén */}
                <Select value={almacenId} onValueChange={setAlmacenId}>
                  <SelectTrigger className={`w-[200px] h-9 ${!almacenId ? 'border-orange-300 bg-orange-50' : ''}`}>
                    <SelectValue placeholder="Seleccionar almacén" />
                  </SelectTrigger>
                  <SelectContent>
                    {almacenesTienda.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">
                        No hay almacenes
                      </div>
                    ) : (
                      almacenesTienda.map((almacen) => (
                        <SelectItem key={almacen.id} value={almacen.id}>
                          {almacen.nombre}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                {/* Categoría */}
                <Select value={categoriaActiva} onValueChange={setCategoriaActiva}>
                  <SelectTrigger className="w-[140px] h-9">
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

                {/* Botón scanner */}
                <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0">
                  <ScanLine className="h-4 w-4" />
                </Button>

                {/* Entrada/Salida */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 px-3 flex-shrink-0"
                  onClick={() => setIsEfectivoDialogOpen(true)}
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Entrada/Salida
                </Button>

                {/* Cerrar caja */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-orange-600 hover:text-orange-700 hover:bg-orange-50 flex-shrink-0"
                  onClick={() => setIsCierreDialogOpen(true)}
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
                      <Button 
                        className="h-10 bg-orange-600 hover:bg-orange-700 text-base"
                        onClick={handleAbrirPago}
                      >
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
            <div className="w-full flex-1 min-h-0 overflow-y-auto bg-white">
              {!almacenId ? (
                <div className="flex items-center justify-center min-h-full text-gray-400">
                  <div className="text-center">
                    <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium text-gray-600 mb-2">Selecciona un almacén</p>
                    <p className="text-sm text-gray-500">Elige un almacén para ver los productos disponibles</p>
                  </div>
                </div>
              ) : productosFiltrados.length === 0 ? (
                <div className="flex items-center justify-center min-h-full text-gray-400">
                  <div className="text-center">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-base font-medium text-gray-600 mb-1">No hay productos con stock</p>
                    <p className="text-sm text-gray-500">Este almacén no tiene productos disponibles</p>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-5 min-h-full">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {productosFiltrados.map((material) => (
                      <Card
                        key={`${material.codigo}-${material.categoria}`}
                        className="cursor-pointer hover:shadow-lg transition-shadow border border-slate-200 bg-white"
                        onClick={() => agregarProductoAOrden(material)}
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
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.classList.remove('hidden');
                                  }}
                                />
                                <div className="hidden w-full h-full items-center justify-center">
                                  <Package className="h-12 w-12 text-slate-300" />
                                </div>
                              </>
                            ) : (
                              <Package className="h-12 w-12 text-slate-300" />
                            )}
                            {cantidadesPorMaterial.get(material.codigo?.toString() ?? "") ? (
                              <span className="absolute top-2 right-2 rounded-full bg-orange-600 text-white text-xs font-bold px-2.5 py-1 shadow-lg border-2 border-white">
                                {cantidadesPorMaterial.get(material.codigo.toString())}
                              </span>
                            ) : null}
                            {/* Badge de stock disponible */}
                            <span className="absolute bottom-2 left-2 rounded-md bg-green-600 text-white text-xs font-semibold px-2 py-0.5 shadow-md">
                              Stock: {material.stock_disponible}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-medium text-sm line-clamp-2 min-h-[40px] text-slate-900">
                              {material.descripcion}
                            </h3>
                          </div>
                          <div className="mt-auto flex items-center justify-between gap-2">
                            <p className="text-base font-semibold text-orange-600">
                              ${material.precio ? material.precio.toFixed(2) : '0.00'}
                            </p>
                            <Badge
                              variant="outline"
                              className="text-xs border border-blue-200 text-blue-700 bg-blue-50 flex-shrink-0"
                            >
                              {material.categoria}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Diálogo de Entrada/Salida de Efectivo */}
        <EntradaSalidaEfectivoDialog
          open={isEfectivoDialogOpen}
          onOpenChange={setIsEfectivoDialogOpen}
          onConfirm={handleEfectivoConfirm}
        />

        {/* Diálogo de Pago */}
        <PagoDialog
          open={isPagoDialogOpen}
          onOpenChange={setIsPagoDialogOpen}
          total={calcularTotalConImpuestosDescuentos()}
          onConfirm={handleProcesarPago}
        />


        
        <Dialog open={isOrdenesDialogOpen} onOpenChange={setIsOrdenesDialogOpen}>
          <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Órdenes</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-6 max-h-[72vh] overflow-hidden">
              <div className="border-2 border-gray-300 rounded-lg bg-white shadow-sm flex flex-col min-h-0">
                <div className="p-4 border-b-2 border-gray-200">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Órdenes de la sesión</h3>
                        <p className="text-sm text-gray-500">Mostrando {ordenesFiltradas.length} órdenes</p>
                      </div>
                      <div className="flex gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 lg:w-[260px]">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Buscar órdenes..."
                            value={ordenSearch}
                            onChange={(e) => setOrdenSearch(e.target.value)}
                            className="pl-10 h-10 text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                        <Select value={ordenEstado} onValueChange={setOrdenEstado}>
                          <SelectTrigger className="h-10 w-[160px]">
                            <SelectValue placeholder="Estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todas">Todas</SelectItem>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="pagada">Pagada</SelectItem>
                            <SelectItem value="cancelada">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {cargandoOrdenesBackend ? (
                    <div className="p-6 text-sm text-gray-500">Cargando órdenes...</div>
                  ) : ordenesFiltradas.length === 0 ? (
                    <div className="p-6 text-sm text-gray-500">No hay órdenes registradas.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[20%]">Fecha</th>
                            <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[30%]">Cliente</th>
                            <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[18%]">Total</th>
                            <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[18%]">Estado</th>
                            <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[14%]">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {ordenesFiltradas.map((orden) => (
                            <tr
                              key={orden.id}
                              className={`transition-colors ${
                                ordenSeleccionadaId === orden.id ? "bg-emerald-50" : "hover:bg-gray-50"
                              }`}
                            >
                              <td 
                                className="py-4 px-3 cursor-pointer"
                                onClick={() => setOrdenSeleccionadaId(orden.id)}
                              >
                                <div>
                                  <p className="font-semibold text-gray-900 text-sm">
                                    {new Date(orden.fecha_creacion).toLocaleDateString("es-ES")}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(orden.fecha_creacion).toLocaleTimeString("es-ES", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                              </td>
                              <td 
                                className="py-4 px-3 cursor-pointer"
                                onClick={() => setOrdenSeleccionadaId(orden.id)}
                              >
                                {orden.cliente_id ? (
                                  <div>
                                    <p className="text-sm text-gray-900 font-medium">
                                      {resolveClienteNombre(orden)}
                                    </p>
                                    {orden.cliente_telefono ? (
                                      <p className="text-xs text-gray-500">{orden.cliente_telefono}</p>
                                    ) : null}
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-sm text-gray-900">
                                      {resolveClienteNombre(orden)}
                                    </p>
                                    {orden.cliente_telefono ? (
                                      <p className="text-xs text-gray-500">{orden.cliente_telefono}</p>
                                    ) : null}
                                  </div>
                                )}
                              </td>
                              <td 
                                className="py-4 px-3 text-right cursor-pointer"
                                onClick={() => setOrdenSeleccionadaId(orden.id)}
                              >
                                <span className="font-semibold text-gray-900 text-sm">
                                  {formatCurrency(orden.total)}
                                </span>
                              </td>
                              <td 
                                className="py-4 px-3 text-right cursor-pointer"
                                onClick={() => setOrdenSeleccionadaId(orden.id)}
                              >
                                <Badge className={getOrdenEstadoBadge(orden.estado)}>
                                  {orden.estado}
                                </Badge>
                              </td>
                              <td className="py-4 px-3 text-center">
                                {orden.estado === 'pagada' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      const tiendaActual = tiendas.find(t => t.id === tiendaId)
                                      ReciboService.descargarRecibo({
                                        orden,
                                        nombreTienda: tiendaActual?.nombre || 'SUNCAR BOLIVIA',
                                        direccionTienda: tiendaActual?.direccion,
                                        telefonoTienda: tiendaActual?.telefono,
                                      })
                                    }}
                                  >
                                    Descargar
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-2 border-gray-300 rounded-lg bg-white shadow-sm flex flex-col min-h-0">
                <div className="p-4 border-b-2 border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Detalle de orden</h3>
                      <p className="text-sm text-gray-500">Recibo de la orden seleccionada</p>
                    </div>
                    {ordenSeleccionada && ordenSeleccionada.estado === 'pagada' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const tiendaActual = tiendas.find(t => t.id === tiendaId)
                            ReciboService.descargarRecibo({
                              orden: ordenSeleccionada,
                              nombreTienda: tiendaActual?.nombre || 'SUNCAR BOLIVIA',
                              direccionTienda: tiendaActual?.direccion,
                              telefonoTienda: tiendaActual?.telefono,
                            })
                          }}
                        >
                          Descargar
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700"
                          onClick={() => {
                            const tiendaActual = tiendas.find(t => t.id === tiendaId)
                            ReciboService.imprimirRecibo({
                              orden: ordenSeleccionada,
                              nombreTienda: tiendaActual?.nombre || 'SUNCAR BOLIVIA',
                              direccionTienda: tiendaActual?.direccion,
                              telefonoTienda: tiendaActual?.telefono,
                            })
                          }}
                        >
                          Imprimir
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                  {!ordenSeleccionada ? (
                    <div className="text-sm text-gray-500">Selecciona una orden para ver el detalle.</div>
                  ) : (
                    <div className="rounded-xl border-2 border-slate-200 bg-gradient-to-b from-white via-white to-slate-50 shadow-sm p-5 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Comprobante</p>
                          <h4 className="text-lg font-bold text-slate-900">
                            Orden #{ordenSeleccionada.numero_orden}
                          </h4>
                        </div>
                        <Badge className={getOrdenEstadoBadge(ordenSeleccionada.estado)}>
                          {ordenSeleccionada.estado}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-600">
                          <span>Fecha</span>
                          <span className="font-semibold text-slate-900">
                            {new Date(ordenSeleccionada.fecha_creacion).toLocaleDateString("es-ES")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-600">
                          <span>Hora</span>
                          <span className="font-semibold text-slate-900">
                            {new Date(ordenSeleccionada.fecha_creacion).toLocaleTimeString("es-ES", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      {clienteDatosSeleccionada ? (
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                          <h5 className="text-sm font-semibold text-slate-700 mb-2">Datos del cliente</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center justify-between text-slate-600">
                              <span>Nombre</span>
                              <span className="font-semibold text-slate-900">
                                {clienteDatosSeleccionada.nombre}
                              </span>
                            </div>
                            {clienteDatosSeleccionada.ci ? (
                              <div className="flex items-center justify-between text-slate-600">
                                <span>CI</span>
                                <span className="text-slate-900">{clienteDatosSeleccionada.ci}</span>
                              </div>
                            ) : null}
                            {clienteDatosSeleccionada.telefono ? (
                              <div className="flex items-center justify-between text-slate-600">
                                <span>Telefono</span>
                                <span className="text-slate-900">{clienteDatosSeleccionada.telefono}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-semibold text-slate-700">Productos</h5>
                          <span className="text-xs text-slate-500">
                            {ordenSeleccionada.items.length} item(s)
                          </span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {ordenSeleccionada.items.map((item) => (
                            <div
                              key={`${item.material_codigo}-${item.descripcion}`}
                              className="flex items-start justify-between gap-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm text-slate-900">
                                  <span className="font-semibold mr-2">{item.cantidad}x</span>
                                  {item.descripcion}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {formatCurrency(item.precio_unitario)} / unidad
                                </p>
                              </div>
                              <div className="text-sm font-semibold text-slate-900">
                                {formatCurrency(item.subtotal)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2 text-sm">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Subtotal</span>
                          <span>{formatCurrency(ordenSeleccionada.subtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Impuestos</span>
                          <span>{formatCurrency(ordenSeleccionada.impuesto_monto)}</span>
                        </div>
                        {ordenSeleccionada.descuento_monto > 0 && (
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Descuento</span>
                            <span>-{formatCurrency(ordenSeleccionada.descuento_monto)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-base font-bold text-slate-900 pt-2 border-t border-dashed border-slate-200">
                          <span>Monto total</span>
                          <span>{formatCurrency(ordenSeleccionada.total)}</span>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2 text-sm">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Metodo de pago</span>
                          <span className="capitalize text-slate-900">
                            {ordenSeleccionada.metodo_pago || "Sin definir"}
                          </span>
                        </div>
                        {getPagoEfectivoOrden(ordenSeleccionada)?.monto_recibido ? (
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Recibido</span>
                            <span className="text-slate-900">
                              {formatCurrency(getPagoEfectivoOrden(ordenSeleccionada)?.monto_recibido || 0)}
                            </span>
                          </div>
                        ) : null}
                        {getCambioOrden(ordenSeleccionada) > 0 && (
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Cambio</span>
                            <span className="text-slate-900">{formatCurrency(getCambioOrden(ordenSeleccionada))}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>


        {/* Diálogo de Cierre de Caja */}
        <CierreCajaDialog
          open={isCierreDialogOpen}
          onOpenChange={setIsCierreDialogOpen}
          sesion={sesionActiva}
          onConfirm={handleCerrarCaja}
          nombreTienda={tiendas.find(t => t.id === tiendaId)?.nombre}
          direccionTienda={tiendas.find(t => t.id === tiendaId)?.direccion}
          telefonoTienda={tiendas.find(t => t.id === tiendaId)?.telefono}
        />
      </div>
    </div>
  )
}
