"use client"

import { useEffect, useMemo, useState } from "react"
import { Package, Search, Lock, CheckCircle, Plus, X, Upload, Image as ImageIcon, Save } from "lucide-react"
import { Badge } from "@/components/shared/atom/badge"
import { Input } from "@/components/shared/atom/input"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/shared/molecule/dialog"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { ExportButtons } from "@/components/shared/molecule/export-buttons"
import { useMaterials } from "@/hooks/use-materials"
import { useInventario } from "@/hooks/use-inventario"
import { useMarcas } from "@/hooks/use-marcas"
import { useToast } from "@/hooks/use-toast"
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

interface SeccionPersonalizada {
  id: string
  label: string
  tipo: 'materiales' | 'extra'
  tipoExtra?: 'escritura' | 'costo'
  categoriasMateriales?: string[]
  contenidoEscritura?: string
  costosExtras?: CostoExtra[]
}

const SECCION_AMPLIACION_ID = "AMPLIACION_SISTEMA"

interface CostoExtra {
  id: string
  descripcion: string
  cantidad: number
  precioUnitario: number
}

interface ServicioOferta {
  id: string
  descripcion: string
  cantidad: number
  costo: number
  porcentaje_margen_origen: number
}

export function ConfeccionOfertasView() {
  const { materials, loading } = useMaterials()
  const { almacenes, stock, refetchStock, loading: loadingAlmacenes } = useInventario()
  const { marcas, loading: loadingMarcas } = useMarcas()
  const { toast } = useToast()
  const [items, setItems] = useState<OfertaItem[]>([])
  const [ofertaGenerica, setOfertaGenerica] = useState(true)
  const [clienteId, setClienteId] = useState("")
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clientesLoading, setClientesLoading] = useState(false)
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [margenComercial, setMargenComercial] = useState(0)
  const [porcentajeMargenMateriales, setPorcentajeMargenMateriales] = useState(50)
  const [porcentajeMargenInstalacion, setPorcentajeMargenInstalacion] = useState(50)
  const [costoTransportacion, setCostoTransportacion] = useState(0)
  const [elementosPersonalizados, setElementosPersonalizados] = useState<ElementoPersonalizado[]>([])
  const [mostrarElementosPersonalizados, setMostrarElementosPersonalizados] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [almacenId, setAlmacenId] = useState<string>("")
  const [reservandoMateriales, setReservandoMateriales] = useState(false)
  const [materialesReservados, setMaterialesReservados] = useState(false)
  const [inversorSeleccionado, setInversorSeleccionado] = useState<string>("")
  const [bateriaSeleccionada, setBateriaSeleccionada] = useState<string>("")
  const [panelSeleccionado, setPanelSeleccionado] = useState<string>("")
  const [estadoOferta, setEstadoOferta] = useState<string>("en_revision")
  const [seccionesPersonalizadas, setSeccionesPersonalizadas] = useState<SeccionPersonalizada[]>([
    {
      id: SECCION_AMPLIACION_ID,
      label: "Ampliación de Sistema",
      tipo: 'materiales',
      categoriasMateriales: ["*"],
    },
  ])
  const [mostrarDialogoSeccion, setMostrarDialogoSeccion] = useState(false)
  const [tipoSeccionNueva, setTipoSeccionNueva] = useState<'materiales' | 'extra' | null>(null)
  const [tipoExtraSeccion, setTipoExtraSeccion] = useState<'escritura' | 'costo' | null>(null)
  const [nombreSeccionNueva, setNombreSeccionNueva] = useState("")
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>([])
  const [contenidoEscritura, setContenidoEscritura] = useState("")
  const [mostrarDialogoReserva, setMostrarDialogoReserva] = useState(false)
  const [tipoReserva, setTipoReserva] = useState<'temporal' | 'definitiva' | null>(null)
  const [diasReserva, setDiasReserva] = useState(7)
  const [fechaExpiracionReserva, setFechaExpiracionReserva] = useState<Date | null>(null)
  const [fotoPortada, setFotoPortada] = useState<string>("")
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [creandoOferta, setCreandoOferta] = useState(false)
  const [ofertaCreada, setOfertaCreada] = useState(false)
  const [ofertaId, setOfertaId] = useState<string>("")
  const [monedaPago, setMonedaPago] = useState<'USD' | 'EUR' | 'CUP'>('USD')
  const [tasaCambio, setTasaCambio] = useState<string>("")
  const [pagoTransferencia, setPagoTransferencia] = useState(false)
  const [datosCuenta, setDatosCuenta] = useState("")
  const [aplicaContribucion, setAplicaContribucion] = useState(false)
  const [porcentajeContribucion, setPorcentajeContribucion] = useState<number>(0)
  const [margenComercialTotal, setMargenComercialTotal] = useState(0)
  const [margenParaMateriales, setMargenParaMateriales] = useState(0)
  const [margenParaInstalacion, setMargenParaInstalacion] = useState(0)
  const [margenPorMaterial, setMargenPorMaterial] = useState<Map<string, number>>(new Map())
  const [porcentajeMargenPorItem, setPorcentajeMargenPorItem] = useState<Map<string, number>>(new Map())
  const [porcentajeAsignadoPorItem, setPorcentajeAsignadoPorItem] = useState<Record<string, number>>({})
  const [mostrarDialogoExportar, setMostrarDialogoExportar] = useState(false)

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
      esPersonalizada: false,
    },
    {
      id: "BATERIAS",
      label: "Baterias",
      match: (categoria: string) => categoria.includes("BATERIA"),
      esPersonalizada: false,
    },
    {
      id: "PANELES",
      label: "Paneles",
      match: (categoria: string) => categoria.includes("PANEL"),
      esPersonalizada: false,
    },
    {
      id: "MPPT",
      label: "MPPT",
      match: (categoria: string) => categoria.includes("MPPT"),
      esPersonalizada: false,
    },
    {
      id: "ESTRUCTURAS",
      label: "Estructuras",
      match: (categoria: string) => categoria.includes("ESTRUCTURA"),
      esPersonalizada: false,
    },
    {
      id: "CABLEADO_DC",
      label: "Cableado DC",
      match: (categoria: string) => categoria.includes("CABLE"),
      esPersonalizada: false,
    },
    {
      id: "CABLEADO_AC",
      label: "Cableado AC",
      match: (categoria: string) => categoria.includes("CABLE"),
      esPersonalizada: false,
    },
    {
      id: "CANALIZACION",
      label: "Canalizacion",
      match: (categoria: string) => categoria.includes("PVC"),
      esPersonalizada: false,
    },
    {
      id: "TIERRA",
      label: "Tierra",
      match: (categoria: string) => categoria.includes("TIERRA"),
      esPersonalizada: false,
    },
    {
      id: "PROTECCIONES_ELECTRICAS",
      label: "Protecciones y Gabinetes",
      match: (categoria: string) => categoria.includes("PROTECCION") || categoria.includes("GABINETE"),
      esPersonalizada: false,
    },
    {
      id: "MATERIAL_VARIO",
      label: "Material vario",
      match: (categoria: string) => categoria.includes("VARIO") || categoria.includes("PEQUENO"),
      esPersonalizada: false,
    },
    // Agregar secciones personalizadas
    ...seccionesPersonalizadas.map(seccion => ({
      id: seccion.id,
      label: seccion.label,
      match: (categoria: string) => {
        if (seccion.tipo === 'materiales' && seccion.categoriasMateriales) {
          if (seccion.categoriasMateriales.includes("*")) return true
          return seccion.categoriasMateriales.some(cat => 
            normalizeText(categoria).includes(normalizeText(cat))
          )
        }
        return false
      },
      esPersonalizada: true,
      seccionData: seccion,
    })),
  ]

  const activeStep = steps[activeStepIndex] ?? steps[0]

  const seccionLabelMap = useMemo(() => {
    const map = new Map<string, string>()
    steps.forEach(step => map.set(step.id, step.label))
    return map
  }, [steps])

  // Seleccionar automáticamente el primer almacén si solo hay uno
  useEffect(() => {
    if (almacenes.length === 1 && !almacenId) {
      setAlmacenId(almacenes[0]?.id ?? "")
    }
  }, [almacenes, almacenId])

  // Cargar stock cuando se selecciona un almacén
  useEffect(() => {
    if (almacenId) {
      refetchStock(almacenId)
    }
  }, [almacenId, refetchStock])

  // Obtener materiales con stock en el almacén seleccionado
  const materialesConStock = useMemo(() => {
    if (!almacenId) return materials // Si no hay almacén seleccionado, mostrar todos
    
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

  const materialesFiltrados = useMemo(() => {
    if (!activeStep) return materialesConStock
    
    let filtered = materialesConStock.filter((material) => {
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
  }, [materialesConStock, activeStep, searchQuery])

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

  const margenPorMaterialCalculado = useMemo(() => {
    const map = new Map<string, number>()
    items.forEach((item) => {
      const costoItem = item.precio * item.cantidad
      const porcentaje = typeof porcentajeAsignadoPorItem[item.id] === "number"
        ? porcentajeAsignadoPorItem[item.id]
        : (porcentajeMargenPorItem.get(item.id) ?? 0)
      map.set(item.id, costoItem * (porcentaje / 100))
    })
    return map
  }, [items, porcentajeAsignadoPorItem, porcentajeMargenPorItem])

  const subtotalPorSeccion = useMemo(() => {
    const map = new Map<string, number>()
    items.forEach((item) => {
      const margenItem = margenPorMaterialCalculado.get(item.id) ?? 0
      map.set(item.seccion, (map.get(item.seccion) ?? 0) + item.precio * item.cantidad + margenItem)
    })
    return map
  }, [items, margenPorMaterialCalculado])

  const totalMateriales = useMemo(() => {
    return items.reduce((sum, item) => sum + item.precio * item.cantidad, 0)
  }, [items])

  const totalElementosPersonalizados = useMemo(() => {
    return elementosPersonalizados.reduce((sum, elem) => sum + elem.precio * elem.cantidad, 0)
  }, [elementosPersonalizados])

  const totalCostosExtras = useMemo(() => {
    return seccionesPersonalizadas.reduce((sum, seccion) => {
      if (seccion.tipo === 'extra' && seccion.tipoExtra === 'costo' && seccion.costosExtras) {
        return sum + seccion.costosExtras.reduce((costoSum, costo) => 
          costoSum + (costo.cantidad * costo.precioUnitario), 0
        )
      }
      return sum
    }, 0)
  }, [seccionesPersonalizadas])

  useEffect(() => {
    let cancelled = false

    const resetMargins = () => {
      setMargenComercialTotal(0)
      setMargenParaMateriales(0)
      setMargenParaInstalacion(0)
      setMargenPorMaterial(new Map())
      setPorcentajeMargenPorItem(new Map())
    }

    const calcularMargenes = async () => {
      if (margenComercial <= 0 || margenComercial >= 100 || items.length === 0) {
        resetMargins()
        return
      }

      try {
        const { apiRequest } = await import('@/lib/api-config')
        const response = await apiRequest<{
          success?: boolean
          data?: {
            margen_total: number
            margen_materiales: number
            margen_instalacion?: number
            items?: Array<{
              id: string
              margen_asignado: number
              porcentaje_margen_item?: number
            }>
          }
        }>('/ofertas/confeccion/margen-materiales', {
          method: 'POST',
          body: JSON.stringify({
            margen_comercial: margenComercial,
            porcentaje_margen_materiales: porcentajeMargenMateriales,
            items: items.map((item) => ({
              id: item.id,
              material_codigo: item.materialCodigo,
              descripcion: item.descripcion,
              precio: item.precio,
              cantidad: item.cantidad,
              categoria: item.categoria,
              seccion: item.seccion,
            })),
          }),
        })

        if (cancelled) return

        const data = response?.data ?? (response as any)
        const margenTotal = data?.margen_total ?? 0
        const margenMateriales = data?.margen_materiales ?? 0
        const margenInstalacion = typeof data?.margen_instalacion === "number"
          ? data.margen_instalacion
          : Math.max(0, margenTotal - margenMateriales)

        const margenMap = new Map<string, number>()
        const porcentajeMap = new Map<string, number>()
        const asignadoMap: Record<string, number> = {}
        if (Array.isArray(data?.items)) {
          data.items.forEach((item) => {
            if (!item?.id) return
            margenMap.set(item.id, item.margen_asignado ?? 0)
            if (typeof item.porcentaje_margen_item === "number") {
              porcentajeMap.set(item.id, item.porcentaje_margen_item)
              asignadoMap[item.id] = item.porcentaje_margen_item
            }
          })
        }

        setMargenComercialTotal(margenTotal)
        setMargenParaMateriales(margenMateriales)
        setMargenParaInstalacion(margenInstalacion)
        setMargenPorMaterial(margenMap)
        setPorcentajeMargenPorItem(porcentajeMap)
        setPorcentajeAsignadoPorItem(asignadoMap)
      } catch (error) {
        if (cancelled) return
        console.error('❌ Error al calcular márgenes:', error)
        resetMargins()
      }
    }

    calcularMargenes()

    return () => {
      cancelled = true
    }
  }, [margenComercial, porcentajeMargenMateriales, items])

  const servicios = useMemo<ServicioOferta[]>(() => {
    if (margenParaInstalacion <= 0) return []
    return [
      {
        id: "SERVICIO_INSTALACION",
        descripcion: "Servicio de instalación y montaje",
        cantidad: 1,
        costo: margenParaInstalacion,
        porcentaje_margen_origen: porcentajeMargenInstalacion,
      },
    ]
  }, [margenParaInstalacion, porcentajeMargenInstalacion])

  const totalMargenAsignadoMateriales = useMemo(() => {
    let total = 0
    margenPorMaterialCalculado.forEach((value) => {
      total += value
    })
    return total
  }, [margenPorMaterialCalculado])

  const porcentajeSugeridoPorMaterial = useMemo(() => {
    const map = new Map<string, number>()
    if (margenParaMateriales <= 0 || totalMateriales <= 0) return map

    items.forEach((item) => {
      const costoItem = item.precio * item.cantidad
      if (costoItem <= 0) {
        map.set(item.id, 0)
        return
      }
      const porcentajeActual = typeof porcentajeAsignadoPorItem[item.id] === "number"
        ? porcentajeAsignadoPorItem[item.id]
        : (porcentajeMargenPorItem.get(item.id) ?? 0)
      const margenActual = costoItem * (porcentajeActual / 100)
      const margenRestante = margenParaMateriales - (totalMargenAsignadoMateriales - margenActual)
      const sugeridoRaw = margenRestante <= 0 ? 0 : (margenRestante / costoItem) * 100
      const sugerido = Math.min(100, Math.max(0, sugeridoRaw))
      map.set(item.id, sugerido)
    })

    return map
  }, [
    items,
    margenParaMateriales,
    totalMateriales,
    totalMargenAsignadoMateriales,
    porcentajeAsignadoPorItem,
    porcentajeMargenPorItem,
  ])

  const faltantePorMaterial = useMemo(() => {
    const map = new Map<string, number>()
    if (margenParaMateriales <= 0 || totalMateriales <= 0) return map

    items.forEach((item) => {
      const costoItem = item.precio * item.cantidad
      if (costoItem <= 0) {
        map.set(item.id, 0)
        return
      }
      const porcentajeActual = typeof porcentajeAsignadoPorItem[item.id] === "number"
        ? porcentajeAsignadoPorItem[item.id]
        : (porcentajeMargenPorItem.get(item.id) ?? 0)
      const margenActual = costoItem * (porcentajeActual / 100)
      const margenRestante = margenParaMateriales - (totalMargenAsignadoMateriales - margenActual)
      const sugerido = porcentajeSugeridoPorMaterial.get(item.id) || 0
      const margenConSugerido = costoItem * (sugerido / 100)
      map.set(item.id, margenRestante - margenConSugerido)
    })

    return map
  }, [
    items,
    margenParaMateriales,
    totalMateriales,
    totalMargenAsignadoMateriales,
    porcentajeAsignadoPorItem,
    porcentajeMargenPorItem,
    porcentajeSugeridoPorMaterial,
  ])

  const subtotalConMargen = useMemo(() => {
    return totalMateriales + totalMargenAsignadoMateriales
  }, [totalMateriales, totalMargenAsignadoMateriales])

  const totalSinRedondeo = useMemo(() => {
    const base = subtotalConMargen + margenParaInstalacion + costoTransportacion + totalElementosPersonalizados + totalCostosExtras
    const contribucion = aplicaContribucion ? base * (porcentajeContribucion / 100) : 0
    return base + contribucion
  }, [
    subtotalConMargen,
    margenParaInstalacion,
    costoTransportacion,
    totalElementosPersonalizados,
    totalCostosExtras,
    aplicaContribucion,
    porcentajeContribucion,
  ])

  const precioFinal = useMemo(() => {
    return Math.ceil(totalSinRedondeo)
  }, [totalSinRedondeo])

  // Crear mapa de marcas por ID
  const marcasMap = useMemo(() => {
    const map = new Map<string, string>()
    marcas.forEach(marca => {
      if (marca.id && marca.nombre) {
        map.set(marca.id, marca.nombre)
      }
    })
    return map
  }, [marcas])

  // Generar nombre automático de la oferta
  const nombreAutomatico = useMemo(() => {
    const componentes: string[] = []

    // Obtener marca del material usando marca_id
    const obtenerMarca = (materialCodigo: string): string => {
      const material = materials.find(m => m.codigo.toString() === materialCodigo)
      if (!material || !material.marca_id) return ''
      return marcasMap.get(material.marca_id) || ''
    }

    // Obtener potencia del material
    const obtenerPotencia = (materialCodigo: string): number | null => {
      const material = materials.find(m => m.codigo.toString() === materialCodigo)
      return material?.potenciaKW || null
    }

    // 1. INVERSORES - Usar el seleccionado
    if (inversorSeleccionado) {
      const inversoresDelTipo = items.filter(
        item => item.seccion === 'INVERSORES' && item.materialCodigo === inversorSeleccionado
      )
      if (inversoresDelTipo.length > 0) {
        const cantidad = inversoresDelTipo.reduce((sum, inv) => sum + inv.cantidad, 0)
        const potencia = obtenerPotencia(inversorSeleccionado)
        const marca = obtenerMarca(inversorSeleccionado)
        
        if (potencia && marca) {
          componentes.push(`${cantidad}x ${potencia}kW Inversor ${marca}`)
        } else if (potencia) {
          componentes.push(`${cantidad}x ${potencia}kW Inversor`)
        } else if (marca) {
          componentes.push(`${cantidad}x Inversor ${marca}`)
        } else {
          componentes.push(`${cantidad}x Inversor`)
        }
      }
    }

    // 2. BATERÍAS - Usar la seleccionada
    if (bateriaSeleccionada) {
      const bateriasDelTipo = items.filter(
        item => item.seccion === 'BATERIAS' && item.materialCodigo === bateriaSeleccionada
      )
      if (bateriasDelTipo.length > 0) {
        const cantidad = bateriasDelTipo.reduce((sum, bat) => sum + bat.cantidad, 0)
        const potencia = obtenerPotencia(bateriaSeleccionada)
        const marca = obtenerMarca(bateriaSeleccionada)
        
        if (potencia && marca) {
          componentes.push(`${cantidad}x ${potencia}kWh Batería ${marca}`)
        } else if (potencia) {
          componentes.push(`${cantidad}x ${potencia}kWh Batería`)
        } else if (marca) {
          componentes.push(`${cantidad}x Batería ${marca}`)
        } else {
          componentes.push(`${cantidad}x Batería`)
        }
      }
    }

    // 3. PANELES - Usar el seleccionado
    if (panelSeleccionado) {
      const panelesDelTipo = items.filter(
        item => item.seccion === 'PANELES' && item.materialCodigo === panelSeleccionado
      )
      if (panelesDelTipo.length > 0) {
        const cantidad = panelesDelTipo.reduce((sum, pan) => sum + pan.cantidad, 0)
        const potencia = obtenerPotencia(panelSeleccionado)
        const marca = obtenerMarca(panelSeleccionado)
        
        if (potencia && marca) {
          // Para paneles, convertir kW a W si es necesario
          const potenciaW = potencia >= 1 ? potencia * 1000 : potencia
          componentes.push(`${cantidad}x ${potenciaW}W Paneles ${marca}`)
        } else if (potencia) {
          const potenciaW = potencia >= 1 ? potencia * 1000 : potencia
          componentes.push(`${cantidad}x ${potenciaW}W Paneles`)
        } else if (marca) {
          componentes.push(`${cantidad}x Paneles ${marca}`)
        } else {
          componentes.push(`${cantidad}x Paneles`)
        }
      }
    }

    // Construir el nombre final
    if (componentes.length === 0) {
      return 'Oferta sin componentes principales'
    } else if (componentes.length === 1) {
      return `Oferta de ${componentes[0]}`
    } else if (componentes.length === 2) {
      return `Oferta de ${componentes[0]} y ${componentes[1]}`
    } else {
      const ultimoComponente = componentes.pop()
      return `Oferta de ${componentes.join(', ')} y ${ultimoComponente}`
    }
  }, [items, inversorSeleccionado, bateriaSeleccionada, panelSeleccionado, materials, marcasMap])

  const formatCurrency = (value: number) => {
    return `${new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)} $`
  }

  const formatCurrencyWithSymbol = (value: number, symbol: string) => {
    return `${new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)} ${symbol}`
  }

  const tasaCambioNumero = Number.parseFloat(tasaCambio) || 0
  const mostrarCambio = monedaPago !== 'USD' && tasaCambioNumero > 0
  const montoConvertido = mostrarCambio
    ? monedaPago === 'EUR'
      ? precioFinal / tasaCambioNumero
      : precioFinal * tasaCambioNumero
    : 0

  const baseFilenameExport = useMemo(() => {
    return ofertaId ? `oferta_${ofertaId}` : "oferta_confeccion"
  }, [ofertaId])

  const totalSinMargen = useMemo(() => {
    return totalMateriales + costoTransportacion + totalElementosPersonalizados + totalCostosExtras
  }, [totalMateriales, costoTransportacion, totalElementosPersonalizados, totalCostosExtras])

  const selectedCliente = useMemo(() => {
    if (!clienteId) return null
    return clientes.find((cliente) => cliente.id === clienteId || cliente.numero === clienteId) || null
  }, [clientes, clienteId])

  const exportOptionsCompleto = useMemo(() => {
    const rows: any[] = []

    // Crear mapa de fotos de materiales
    const fotosMap = new Map<string, string>()
    items.forEach((item) => {
      const material = materials.find(m => m.codigo.toString() === item.materialCodigo)
      if (material?.foto) {
        fotosMap.set(item.materialCodigo, material.foto)
      }
    })

    items.forEach((item) => {
      const seccion = seccionLabelMap.get(item.seccion) ?? item.seccion
      const costoItem = item.precio * item.cantidad
      const porcentaje = typeof porcentajeAsignadoPorItem[item.id] === "number"
        ? porcentajeAsignadoPorItem[item.id]
        : (porcentajeMargenPorItem.get(item.id) ?? 0)
      const margenItem = margenPorMaterialCalculado.get(item.id) || 0
      rows.push({
        material_codigo: item.materialCodigo,
        seccion,
        tipo: "Material",
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        porcentaje_margen: porcentaje.toFixed(2),
        margen: margenItem.toFixed(2),
        total: (costoItem + margenItem).toFixed(2),
      })
    })

    elementosPersonalizados.forEach((elem) => {
      rows.push({
        material_codigo: elem.materialCodigo,
        seccion: "Personalizados",
        tipo: "Elemento",
        descripcion: elem.descripcion,
        cantidad: elem.cantidad,
        precio_unitario: elem.precio.toFixed(2),
        porcentaje_margen: "",
        margen: "",
        total: (elem.precio * elem.cantidad).toFixed(2),
      })
    })

    seccionesPersonalizadas.forEach((seccion) => {
      if (seccion.tipo === 'extra' && seccion.tipoExtra === 'costo' && seccion.costosExtras) {
        seccion.costosExtras.forEach((costo) => {
          rows.push({
            material_codigo: "",
            seccion: seccion.label,
            tipo: "Costo extra",
            descripcion: costo.descripcion,
            cantidad: costo.cantidad,
            precio_unitario: costo.precioUnitario.toFixed(2),
            porcentaje_margen: "",
            margen: "",
            total: (costo.cantidad * costo.precioUnitario).toFixed(2),
          })
        })
      }
    })

    if (margenParaInstalacion > 0) {
      rows.push({
        material_codigo: "",
        seccion: "Servicios",
        tipo: "Servicio",
        descripcion: "Servicio de instalación y montaje",
        cantidad: 1,
        precio_unitario: margenParaInstalacion.toFixed(2),
        porcentaje_margen: porcentajeMargenInstalacion.toFixed(2),
        margen: "",
        total: margenParaInstalacion.toFixed(2),
      })
    }

    if (costoTransportacion > 0) {
      rows.push({
        material_codigo: "",
        seccion: "Logística",
        tipo: "Transportación",
        descripcion: "Costo de transportación",
        cantidad: 1,
        precio_unitario: costoTransportacion.toFixed(2),
        porcentaje_margen: "",
        margen: "",
        total: costoTransportacion.toFixed(2),
      })
    }

    rows.push({
      material_codigo: "",
      seccion: "Totales",
      tipo: "TOTAL",
      descripcion: "Precio final",
      cantidad: "",
      precio_unitario: "",
      porcentaje_margen: "",
      margen: "",
      total: precioFinal.toFixed(2),
    })

    // SECCIÓN DE PAGO
    // Agregar línea vacía para separar
    rows.push({
      material_codigo: "",
      seccion: "",
      tipo: "",
      descripcion: "",
      cantidad: "",
      precio_unitario: "",
      porcentaje_margen: "",
      margen: "",
      total: "",
    })

    // Pago por transferencia
    if (pagoTransferencia) {
      rows.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Info",
        descripcion: "✓ Pago por transferencia",
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: "",
      })
      
      if (datosCuenta) {
        rows.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Datos",
          descripcion: "Datos de la cuenta",
          cantidad: "",
          precio_unitario: "",
          porcentaje_margen: "",
          margen: "",
          total: datosCuenta,
        })
      }
    }

    // Contribución
    if (aplicaContribucion && porcentajeContribucion > 0) {
      const montoContribucion = (subtotalConMargen + margenParaInstalacion + costoTransportacion + totalElementosPersonalizados + totalCostosExtras) * (porcentajeContribucion / 100)
      rows.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Info",
        descripcion: `✓ Aplicar ${porcentajeContribucion}% de Contribución`,
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: "",
      })
      rows.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Monto",
        descripcion: "Contribución",
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: montoContribucion.toFixed(2),
      })
    }

    // Precio Final
    rows.push({
      material_codigo: "",
      seccion: "PAGO",
      tipo: "TOTAL",
      descripcion: "Precio Final",
      cantidad: "",
      precio_unitario: "",
      porcentaje_margen: "",
      margen: "",
      total: precioFinal.toFixed(2),
    })

    // Nota de redondeo si aplica
    if (precioFinal !== totalSinRedondeo) {
      rows.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Nota",
        descripcion: `(Redondeado desde ${totalSinRedondeo.toFixed(2)} $)`,
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: "",
      })
    }

    // Conversión de moneda
    if (monedaPago !== 'USD' && tasaCambioNumero > 0) {
      const simboloMoneda = monedaPago === 'EUR' ? '€' : 'CUP'
      const nombreMoneda = monedaPago === 'EUR' ? 'Euros (EUR)' : 'Pesos Cubanos (CUP)'
      
      rows.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Info",
        descripcion: "Moneda de pago",
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: nombreMoneda,
      })
      
      const tasaTexto = monedaPago === 'EUR' 
        ? `1 EUR = ${tasaCambioNumero} USD`
        : `1 USD = ${tasaCambioNumero} CUP`
      
      rows.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Tasa",
        descripcion: tasaTexto,
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: "",
      })
      
      rows.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "Conversión",
        descripcion: `Precio en ${monedaPago}`,
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: `${montoConvertido.toFixed(2)} ${simboloMoneda}`,
      })
    }

    return {
      title: "Oferta - Exportación completa",
      subtitle: nombreAutomatico,
      columns: [
        { header: "Sección", key: "seccion", width: 18 },
        { header: "Tipo", key: "tipo", width: 12 },
        { header: "Descripción", key: "descripcion", width: 40 },
        { header: "Cant", key: "cantidad", width: 8 },
        { header: "P.Unit ($)", key: "precio_unitario", width: 12 },
        { header: "% Margen", key: "porcentaje_margen", width: 10 },
        { header: "Margen ($)", key: "margen", width: 12 },
        { header: "Total ($)", key: "total", width: 12 },
      ],
      data: rows,
      logoUrl: '/logo.png',
      clienteData: !ofertaGenerica && selectedCliente ? {
        numero: selectedCliente.numero || selectedCliente.id,
        nombre: selectedCliente.nombre,
        carnet_identidad: selectedCliente.carnet_identidad,
        telefono: selectedCliente.telefono,
        provincia_montaje: selectedCliente.provincia_montaje,
        direccion: selectedCliente.direccion,
      } : undefined,
      ofertaData: {
        numero_oferta: ofertaId,
        nombre_oferta: nombreAutomatico,
        tipo_oferta: ofertaGenerica ? 'Genérica' : 'Personalizada',
      },
      incluirFotos: true,
      fotosMap,
    }
  }, [
    items,
    elementosPersonalizados,
    seccionesPersonalizadas,
    seccionLabelMap,
    porcentajeMargenPorItem,
    porcentajeAsignadoPorItem,
    margenPorMaterialCalculado,
    margenParaInstalacion,
    porcentajeMargenInstalacion,
    costoTransportacion,
    precioFinal,
    nombreAutomatico,
    materials,
    ofertaGenerica,
    selectedCliente,
    ofertaId,
    monedaPago,
    tasaCambioNumero,
    montoConvertido,
    pagoTransferencia,
    datosCuenta,
    aplicaContribucion,
    porcentajeContribucion,
    subtotalConMargen,
    totalElementosPersonalizados,
    totalCostosExtras,
  ])

  const exportOptionsSinPrecios = useMemo(() => {
    const rows: any[] = []
    items.forEach((item) => {
      const seccion = seccionLabelMap.get(item.seccion) ?? item.seccion
      rows.push({
        seccion,
        tipo: "Material",
        descripcion: item.descripcion,
        cantidad: item.cantidad,
      })
    })

    rows.push({
      seccion: "Totales",
      tipo: "TOTAL",
      descripcion: "Total sin margen",
      cantidad: "",
      total: totalSinMargen,
    })

    return {
      title: "Oferta - Cliente sin precios",
      subtitle: nombreAutomatico,
      columns: [
        { header: "Sección", key: "seccion", width: 18 },
        { header: "Tipo", key: "tipo", width: 12 },
        { header: "Descripción", key: "descripcion", width: 45 },
        { header: "Cant", key: "cantidad", width: 8 },
        { header: "Total", key: "total", width: 12 },
      ],
      data: rows,
    }
  }, [items, seccionLabelMap, totalSinMargen, nombreAutomatico])

  const exportOptionsClienteConPrecios = useMemo(() => {
    const rows: any[] = []
    items.forEach((item) => {
      const seccion = seccionLabelMap.get(item.seccion) ?? item.seccion
      const porcentaje = typeof porcentajeAsignadoPorItem[item.id] === "number"
        ? porcentajeAsignadoPorItem[item.id]
        : (porcentajeMargenPorItem.get(item.id) ?? 0)
      const unitarioConMargen = item.precio * (1 + porcentaje / 100)
      rows.push({
        seccion,
        tipo: "Material",
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: unitarioConMargen,
        total: unitarioConMargen * item.cantidad,
      })
    })

    if (margenParaInstalacion > 0) {
      rows.push({
        seccion: "Servicios",
        tipo: "Servicio",
        descripcion: "Servicio de instalación y montaje",
        cantidad: 1,
        precio_unitario: margenParaInstalacion,
        total: margenParaInstalacion,
      })
    }

    if (costoTransportacion > 0) {
      rows.push({
        seccion: "Logística",
        tipo: "Transportación",
        descripcion: "Costo de transportación",
        cantidad: 1,
        precio_unitario: costoTransportacion,
        total: costoTransportacion,
      })
    }

    rows.push({
      seccion: "Totales",
      tipo: "TOTAL",
      descripcion: "Precio final",
      cantidad: "",
      precio_unitario: "",
      total: precioFinal,
    })

    return {
      title: "Oferta - Cliente con precios",
      subtitle: nombreAutomatico,
      columns: [
        { header: "Sección", key: "seccion", width: 18 },
        { header: "Tipo", key: "tipo", width: 12 },
        { header: "Descripción", key: "descripcion", width: 40 },
        { header: "Cant", key: "cantidad", width: 8 },
        { header: "P.Unit", key: "precio_unitario", width: 12 },
        { header: "Total", key: "total", width: 12 },
      ],
      data: rows,
    }
  }, [
    items,
    seccionLabelMap,
    porcentajeMargenPorItem,
    porcentajeAsignadoPorItem,
    margenParaInstalacion,
    costoTransportacion,
    precioFinal,
    nombreAutomatico,
  ])

  const agregarMaterial = (material: Material) => {
    if (ofertaCreada) {
      toast({
        title: "Oferta ya creada",
        description: "No puedes modificar una oferta ya creada. Crea una nueva oferta.",
        variant: "destructive",
      })
      return
    }

    const codigo = material.codigo?.toString()
    if (!codigo) return
    if (!activeStep) return
    
    // Validar stock disponible si hay almacén seleccionado
    if (almacenId && 'stock_disponible' in material) {
      const itemId = `${activeStep.id}-${codigo}`
      const cantidadActual = items.find((item) => item.id === itemId)?.cantidad ?? 0
      const nuevaCantidad = cantidadActual + 1
      
      if (nuevaCantidad > (material as any).stock_disponible) {
        // No agregar si excede el stock
        return
      }
    }
    
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
    if (ofertaCreada) {
      toast({
        title: "Oferta ya creada",
        description: "No puedes modificar una oferta ya creada. Crea una nueva oferta.",
        variant: "destructive",
      })
      return
    }

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
    // Validar stock disponible si hay almacén seleccionado
    if (almacenId) {
      const item = items.find((item) => item.id === id)
      if (item) {
        const materialConStock = materialesConStock.find(
          m => m.codigo.toString() === item.materialCodigo
        )
        if (materialConStock && 'stock_disponible' in materialConStock) {
          const stockDisponible = (materialConStock as any).stock_disponible
          if (cantidad > stockDisponible) {
            // No permitir cantidad mayor al stock
            cantidad = stockDisponible
          }
        }
      }
    }
    
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

  const abrirDialogoSeccion = () => {
    setMostrarDialogoSeccion(true)
    setTipoSeccionNueva(null)
    setTipoExtraSeccion(null)
    setNombreSeccionNueva("")
    setCategoriasSeleccionadas([])
    setContenidoEscritura("")
  }

  const cerrarDialogoSeccion = () => {
    setMostrarDialogoSeccion(false)
    setTipoSeccionNueva(null)
    setTipoExtraSeccion(null)
    setNombreSeccionNueva("")
    setCategoriasSeleccionadas([])
    setContenidoEscritura("")
  }

  const agregarSeccionPersonalizada = () => {
    if (!nombreSeccionNueva.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Debes ingresar un nombre para la sección",
        variant: "destructive",
      })
      return
    }

    if (!tipoSeccionNueva) {
      toast({
        title: "Tipo requerido",
        description: "Debes seleccionar un tipo de sección",
        variant: "destructive",
      })
      return
    }

    if (tipoSeccionNueva === 'materiales' && categoriasSeleccionadas.length === 0) {
      toast({
        title: "Categorías requeridas",
        description: "Debes seleccionar al menos una categoría de materiales",
        variant: "destructive",
      })
      return
    }

    if (tipoSeccionNueva === 'extra' && !tipoExtraSeccion) {
      toast({
        title: "Tipo extra requerido",
        description: "Debes seleccionar si es escritura o costo",
        variant: "destructive",
      })
      return
    }

    const nuevaSeccion: SeccionPersonalizada = {
      id: `CUSTOM_${Date.now()}`,
      label: nombreSeccionNueva,
      tipo: tipoSeccionNueva,
      tipoExtra: tipoSeccionNueva === 'extra' ? tipoExtraSeccion! : undefined,
      categoriasMateriales: tipoSeccionNueva === 'materiales' ? categoriasSeleccionadas : undefined,
      contenidoEscritura: tipoSeccionNueva === 'extra' && tipoExtraSeccion === 'escritura' ? contenidoEscritura : undefined,
      costosExtras: tipoSeccionNueva === 'extra' && tipoExtraSeccion === 'costo' ? [] : undefined,
    }

    setSeccionesPersonalizadas(prev => [...prev, nuevaSeccion])
    cerrarDialogoSeccion()
    
    toast({
      title: "Sección agregada",
      description: `La sección "${nombreSeccionNueva}" ha sido agregada exitosamente`,
    })
  }

  const eliminarSeccionPersonalizada = (seccionId: string) => {
    if (seccionId === SECCION_AMPLIACION_ID) {
      toast({
        title: "Sección protegida",
        description: "La sección de Ampliación de Sistema no se puede eliminar",
        variant: "destructive",
      })
      return
    }
    setSeccionesPersonalizadas(prev => prev.filter(s => s.id !== seccionId))
    // Eliminar items de esta sección
    setItems(prev => prev.filter(item => item.seccion !== seccionId))
    
    toast({
      title: "Sección eliminada",
      description: "La sección personalizada ha sido eliminada",
    })
  }

  const actualizarContenidoEscritura = (seccionId: string, contenido: string) => {
    setSeccionesPersonalizadas(prev => 
      prev.map(s => s.id === seccionId ? { ...s, contenidoEscritura: contenido } : s)
    )
  }

  const agregarCostoExtra = (seccionId: string) => {
    setSeccionesPersonalizadas(prev => 
      prev.map(s => {
        if (s.id === seccionId && s.costosExtras) {
          return {
            ...s,
            costosExtras: [
              ...s.costosExtras,
              {
                id: `COSTO_${Date.now()}`,
                descripcion: "",
                cantidad: 1,
                precioUnitario: 0,
              }
            ]
          }
        }
        return s
      })
    )
  }

  const actualizarCostoExtra = (seccionId: string, costoId: string, field: keyof CostoExtra, value: string | number) => {
    setSeccionesPersonalizadas(prev => 
      prev.map(s => {
        if (s.id === seccionId && s.costosExtras) {
          return {
            ...s,
            costosExtras: s.costosExtras.map(c => 
              c.id === costoId ? { ...c, [field]: value } : c
            )
          }
        }
        return s
      })
    )
  }

  const eliminarCostoExtra = (seccionId: string, costoId: string) => {
    setSeccionesPersonalizadas(prev => 
      prev.map(s => {
        if (s.id === seccionId && s.costosExtras) {
          return {
            ...s,
            costosExtras: s.costosExtras.filter(c => c.id !== costoId)
          }
        }
        return s
      })
    )
  }

  // Obtener categorías únicas de materiales
  const categoriasDisponibles = useMemo(() => {
    const categorias = new Set<string>()
    materials.forEach(m => {
      if (m.categoria) {
        categorias.add(m.categoria)
      }
    })
    return Array.from(categorias).sort()
  }, [materials])

  // Seleccionar automáticamente el primer material cuando solo hay uno de cada tipo
  useEffect(() => {
    const inversores = items.filter(item => item.seccion === 'INVERSORES')
    const inversoresUnicos = Array.from(new Set(inversores.map(i => i.materialCodigo)))
    if (inversoresUnicos.length === 1 && !inversorSeleccionado) {
      setInversorSeleccionado(inversoresUnicos[0])
    } else if (inversoresUnicos.length === 0) {
      setInversorSeleccionado("")
    } else if (!inversoresUnicos.includes(inversorSeleccionado)) {
      setInversorSeleccionado(inversoresUnicos[0] || "")
    }
  }, [items, inversorSeleccionado])

  useEffect(() => {
    const baterias = items.filter(item => item.seccion === 'BATERIAS')
    const bateriasUnicas = Array.from(new Set(baterias.map(b => b.materialCodigo)))
    if (bateriasUnicas.length === 1 && !bateriaSeleccionada) {
      setBateriaSeleccionada(bateriasUnicas[0])
    } else if (bateriasUnicas.length === 0) {
      setBateriaSeleccionada("")
    } else if (!bateriasUnicas.includes(bateriaSeleccionada)) {
      setBateriaSeleccionada(bateriasUnicas[0] || "")
    }
  }, [items, bateriaSeleccionada])

  useEffect(() => {
    const paneles = items.filter(item => item.seccion === 'PANELES')
    const panelesUnicos = Array.from(new Set(paneles.map(p => p.materialCodigo)))
    if (panelesUnicos.length === 1 && !panelSeleccionado) {
      setPanelSeleccionado(panelesUnicos[0])
    } else if (panelesUnicos.length === 0) {
      setPanelSeleccionado("")
    } else if (!panelesUnicos.includes(panelSeleccionado)) {
      setPanelSeleccionado(panelesUnicos[0] || "")
    }
  }, [items, panelSeleccionado])

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

  // Determinar si hay múltiples tipos de materiales en cada categoría
  const tieneMultiplesInversores = useMemo(() => {
    const inversores = items.filter(item => item.seccion === 'INVERSORES')
    const inversoresUnicos = Array.from(new Set(inversores.map(i => i.materialCodigo)))
    return inversoresUnicos.length > 1
  }, [items])

  const tieneMultiplesBaterias = useMemo(() => {
    const baterias = items.filter(item => item.seccion === 'BATERIAS')
    const bateriasUnicas = Array.from(new Set(baterias.map(b => b.materialCodigo)))
    return bateriasUnicas.length > 1
  }, [items])

  const tieneMultiplesPaneles = useMemo(() => {
    const paneles = items.filter(item => item.seccion === 'PANELES')
    const panelesUnicos = Array.from(new Set(paneles.map(p => p.materialCodigo)))
    return panelesUnicos.length > 1
  }, [items])

  const mostrarSelectoresMateriales = useMemo(() => {
    return tieneMultiplesInversores || tieneMultiplesBaterias || tieneMultiplesPaneles
  }, [tieneMultiplesInversores, tieneMultiplesBaterias, tieneMultiplesPaneles])

  // Estados disponibles según el tipo de oferta
  const estadosDisponibles = useMemo(() => {
    if (ofertaGenerica) {
      return [
        { value: 'en_revision', label: 'En Revisión' },
        { value: 'aprobada_para_enviar', label: 'Aprobada para Enviar' },
      ]
    } else {
      return [
        { value: 'en_revision', label: 'En Revisión' },
        { value: 'aprobada_para_enviar', label: 'Aprobada para Enviar' },
        { value: 'enviada_a_cliente', label: 'Enviada a Cliente' },
        { value: 'confirmada_por_cliente', label: 'Confirmada por Cliente' },
        { value: 'reservada', label: 'Reservada' },
      ]
    }
  }, [ofertaGenerica])

  // Resetear estado si cambia el tipo de oferta y el estado actual no es válido
  useEffect(() => {
    const estadosValidos = estadosDisponibles.map(e => e.value)
    if (!estadosValidos.includes(estadoOferta)) {
      setEstadoOferta('en_revision')
    }
  }, [ofertaGenerica, estadosDisponibles, estadoOferta])

  const handleReservarMateriales = async () => {
    if (!ofertaCreada) {
      toast({
        title: "Oferta no creada",
        description: "Debes crear la oferta antes de reservar materiales",
        variant: "destructive",
      })
      return
    }

    if (!almacenId) {
      toast({
        title: "Almacén requerido",
        description: "Debes seleccionar un almacén antes de reservar materiales",
        variant: "destructive",
      })
      return
    }

    if (items.length === 0) {
      toast({
        title: "Sin materiales",
        description: "Agrega materiales a la oferta antes de reservar",
        variant: "destructive",
      })
      return
    }

    // Abrir diálogo para seleccionar tipo de reserva
    setMostrarDialogoReserva(true)
  }

  const confirmarReserva = async () => {
    if (!tipoReserva) {
      toast({
        title: "Tipo de reserva requerido",
        description: "Debes seleccionar si la reserva es temporal o definitiva",
        variant: "destructive",
      })
      return
    }

    if (tipoReserva === 'temporal' && diasReserva <= 0) {
      toast({
        title: "Días inválidos",
        description: "Debes especificar al menos 1 día para la reserva temporal",
        variant: "destructive",
      })
      return
    }

    setReservandoMateriales(true)
    setMostrarDialogoReserva(false)

    try {
      // Calcular fecha de expiración si es temporal
      let fechaExpiracion: Date | null = null
      if (tipoReserva === 'temporal') {
        fechaExpiracion = new Date()
        fechaExpiracion.setDate(fechaExpiracion.getDate() + diasReserva)
      }

      // TODO: Implementar llamada al backend cuando esté disponible
      // const response = await fetch('/api/ofertas/confeccion/', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     tipo_oferta: ofertaGenerica ? 'generica' : 'personalizada',
      //     cliente_id: ofertaGenerica ? null : clienteId,
      //     almacen_id: almacenId,
      //     items: items,
      //     elementos_personalizados: elementosPersonalizados,
      //     margen_comercial: margenComercial,
      //     costo_transportacion: costoTransportacion,
      //     total_materiales: totalMateriales,
      //     subtotal_con_margen: subtotalConMargen,
      //     total_elementos_personalizados: totalElementosPersonalizados,
      //     precio_final: precioFinal,
      //     tipo_reserva: tipoReserva,
      //     dias_reserva: tipoReserva === 'temporal' ? diasReserva : null,
      //     fecha_expiracion_reserva: fechaExpiracion?.toISOString()
      //   })
      // })
      // const oferta = await response.json()
      
      // Luego reservar los materiales
      // await fetch(`/api/ofertas/confeccion/${oferta.id}/reservar-materiales`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ 
      //     notas: 'Reserva desde confección de ofertas',
      //     tipo_reserva: tipoReserva,
      //     fecha_expiracion: fechaExpiracion?.toISOString()
      //   })
      // })

      // Simulación temporal hasta que el backend esté listo
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setMaterialesReservados(true)
      setFechaExpiracionReserva(fechaExpiracion)
      
      toast({
        title: "Materiales reservados",
        description: tipoReserva === 'temporal' 
          ? `Se han reservado ${items.length} materiales por ${diasReserva} días`
          : `Se han reservado ${items.length} materiales de forma definitiva`,
      })

      // Refrescar el stock
      await refetchStock(almacenId)
    } catch (error: any) {
      console.error('Error al reservar materiales:', error)
      toast({
        title: "Error al reservar",
        description: error.message || "No se pudieron reservar los materiales",
        variant: "destructive",
      })
    } finally {
      setReservandoMateriales(false)
    }
  }

  const cancelarReserva = async () => {
    if (!materialesReservados) return

    try {
      // TODO: Implementar llamada al backend
      // await fetch(`/api/ofertas/confeccion/${ofertaId}/liberar-materiales`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' }
      // })

      // Simulación temporal
      await new Promise(resolve => setTimeout(resolve, 1000))

      setMaterialesReservados(false)
      setFechaExpiracionReserva(null)
      setTipoReserva(null)

      toast({
        title: "Reserva cancelada",
        description: "Los materiales han sido liberados y están disponibles nuevamente",
      })

      // Refrescar el stock
      if (almacenId) {
        await refetchStock(almacenId)
      }
    } catch (error: any) {
      console.error('Error al cancelar reserva:', error)
      toast({
        title: "Error al cancelar",
        description: error.message || "No se pudo cancelar la reserva",
        variant: "destructive",
      })
    }
  }

  const cerrarDialogoReserva = () => {
    setMostrarDialogoReserva(false)
    setTipoReserva(null)
    setDiasReserva(7)
  }

  const handleSubirFotoPortada = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Archivo inválido",
        description: "Solo se permiten archivos de imagen",
        variant: "destructive",
      })
      return
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "La imagen no debe superar los 5MB",
        variant: "destructive",
      })
      return
    }

    setSubiendoFoto(true)

    try {
      // Preparar FormData
      const formData = new FormData()
      formData.append('foto', file)
      formData.append('tipo', 'oferta_portada')

      console.log('📤 Subiendo foto de portada...')

      // Llamada al backend
      const { apiRequest } = await import('@/lib/api-config')
      
      const response = await apiRequest<{
        success: boolean
        url: string
        filename: string
        size: number
        content_type: string
      }>('/ofertas/confeccion/upload-foto-portada', {
        method: 'POST',
        body: formData
      })

      console.log('✅ Foto subida:', response)

      if (response.success && response.url) {
        setFotoPortada(response.url)
        toast({
          title: "Foto subida",
          description: "La foto de portada se ha cargado exitosamente",
        })
      } else {
        throw new Error('No se recibió la URL de la foto')
      }

    } catch (error: any) {
      console.error('❌ Error al subir foto:', error)
      
      let errorMessage = "No se pudo subir la imagen"
      
      if (error.message) {
        if (error.message.includes('Archivo inválido') || error.message.includes('muy grande')) {
          errorMessage = error.message
        } else if (error.message.includes('Tipo de archivo no soportado')) {
          errorMessage = "Formato de imagen no soportado. Usa JPG, PNG o WebP"
        } else if (error.message.includes('Not authenticated')) {
          errorMessage = "Sesión expirada. Por favor, inicia sesión nuevamente"
        } else {
          errorMessage = error.message
        }
      }
      
      toast({
        title: "Error al subir foto",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setSubiendoFoto(false)
    }
  }

  const eliminarFotoPortada = () => {
    setFotoPortada("")
    toast({
      title: "Foto eliminada",
      description: "La foto de portada ha sido eliminada",
    })
  }

  const handleCrearOferta = async () => {
    // Validaciones
    if (!almacenId) {
      toast({
        title: "Almacén requerido",
        description: "Debes seleccionar un almacén antes de crear la oferta",
        variant: "destructive",
      })
      return
    }

    if (items.length === 0) {
      toast({
        title: "Sin materiales",
        description: "Agrega al menos un material a la oferta",
        variant: "destructive",
      })
      return
    }

    if (!ofertaGenerica && !clienteId) {
      toast({
        title: "Cliente requerido",
        description: "Debes seleccionar un cliente para ofertas personalizadas",
        variant: "destructive",
      })
      return
    }

    setCreandoOferta(true)

    try {
      // Preparar datos de la oferta según la documentación del backend
      const ofertaData = {
        tipo_oferta: ofertaGenerica ? 'generica' : 'personalizada',
        cliente_numero: ofertaGenerica ? undefined : (selectedCliente?.numero || clienteId),
        almacen_id: almacenId,
        foto_portada: fotoPortada || undefined,
        // Compatibilidad con endpoint antiguo que espera foto_portada_url
        foto_portada_url: fotoPortada || undefined,
        estado: estadoOferta,
        
        items: items.map(item => ({
          material_codigo: item.materialCodigo,
          descripcion: item.descripcion,
          precio: item.precio,
          cantidad: item.cantidad,
          categoria: item.categoria,
          seccion: item.seccion,
          margen_asignado: margenPorMaterialCalculado.get(item.id) || 0
        })),

        servicios: servicios.length > 0 ? servicios : undefined,
        
        secciones_personalizadas: seccionesPersonalizadas.length > 0 ? seccionesPersonalizadas.map(seccion => ({
          id: seccion.id,
          label: seccion.label,
          tipo: seccion.tipo,
          tipo_extra: seccion.tipoExtra,
          categorias_materiales: seccion.categoriasMateriales,
          contenido_escritura: seccion.contenidoEscritura,
          costos_extras: seccion.costosExtras?.map(costo => ({
            id: costo.id,
            descripcion: costo.descripcion,
            cantidad: costo.cantidad,
            precio_unitario: costo.precioUnitario,
          })),
        })) : undefined,
        
        elementos_personalizados: elementosPersonalizados.length > 0 ? elementosPersonalizados.map(elem => ({
          material_codigo: elem.materialCodigo,
          descripcion: elem.descripcion,
          precio: elem.precio,
          cantidad: elem.cantidad,
          categoria: elem.categoria
        })) : undefined,
        
        componentes_principales: {
          inversor_seleccionado: inversorSeleccionado || undefined,
          bateria_seleccionada: bateriaSeleccionada || undefined,
          panel_seleccionado: panelSeleccionado || undefined
        },
        
        margen_comercial: margenComercial,
        porcentaje_margen_materiales: porcentajeMargenMateriales,
        porcentaje_margen_instalacion: porcentajeMargenInstalacion,
        margen_total: margenComercialTotal,
        margen_materiales: margenParaMateriales,
        margen_instalacion: margenParaInstalacion,
        costo_transportacion: costoTransportacion,
        total_materiales: totalMateriales,
        subtotal_con_margen: subtotalConMargen,
        total_elementos_personalizados: totalElementosPersonalizados,
        total_costos_extras: totalCostosExtras,
        precio_final: precioFinal,
        moneda_pago: monedaPago,
        tasa_cambio: monedaPago !== 'USD' ? Number.parseFloat(tasaCambio) || 0 : 0,
        pago_transferencia: pagoTransferencia,
        datos_cuenta: pagoTransferencia ? datosCuenta : "",
        aplica_contribucion: aplicaContribucion,
        porcentaje_contribucion: aplicaContribucion ? porcentajeContribucion : 0
      }

      console.log('📤 Enviando oferta al backend:', ofertaData)

      // Llamada al backend usando apiRequest
      const { apiRequest } = await import('@/lib/api-config')
      
      const response = await apiRequest<{
        success: boolean
        message: string
        data: {
          id: string
          numero_oferta: string
          nombre_automatico: string
          [key: string]: any
        }
      }>('/ofertas/confeccion/', {
        method: 'POST',
        body: JSON.stringify(ofertaData)
      })

      console.log('✅ Respuesta del backend:', response)

      if (response.success && response.data) {
        setOfertaId(response.data.numero_oferta || response.data.id)
        setOfertaCreada(true)

        toast({
          title: "Oferta creada exitosamente",
          description: `${response.data.numero_oferta}: ${response.data.nombre_automatico}`,
        })
      } else {
        throw new Error(response.message || 'Error al crear la oferta')
      }

    } catch (error: any) {
      console.error('❌ Error al crear oferta:', error)
      
      let errorMessage = "No se pudo crear la oferta"
      
      // Parsear mensajes de error comunes del backend
      if (error.message) {
        if (error.message.includes('Stock insuficiente')) {
          errorMessage = error.message
        } else if (error.message.includes('Cliente') && error.message.includes('no encontrado')) {
          errorMessage = "El cliente seleccionado no existe"
        } else if (error.message.includes('Almacén') && error.message.includes('no encontrado')) {
          errorMessage = "El almacén seleccionado no existe"
        } else if (error.message.includes('Not authenticated')) {
          errorMessage = "Sesión expirada. Por favor, inicia sesión nuevamente"
        } else {
          errorMessage = error.message
        }
      }
      
      toast({
        title: "Error al crear oferta",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setCreandoOferta(false)
    }
  }

  const resetearOferta = () => {
    setItems([])
    setElementosPersonalizados([])
    setSeccionesPersonalizadas([])
    setMargenComercial(0)
    setPorcentajeMargenMateriales(50)
    setPorcentajeMargenInstalacion(50)
    setCostoTransportacion(0)
    setFotoPortada("")
    setClienteId("")
    setEstadoOferta("en_revision")
    setMaterialesReservados(false)
    setOfertaCreada(false)
    setOfertaId("")
    setInversorSeleccionado("")
    setBateriaSeleccionada("")
    setPanelSeleccionado("")
    setMonedaPago("USD")
    setTasaCambio("")
    setPagoTransferencia(false)
    setDatosCuenta("")
    setAplicaContribucion(false)
    setPorcentajeContribucion(0)
    setMargenComercialTotal(0)
    setMargenParaMateriales(0)
    setMargenParaInstalacion(0)
    setMargenPorMaterial(new Map())
    setPorcentajeMargenPorItem(new Map())
    setPorcentajeAsignadoPorItem({})
    
    setSeccionesPersonalizadas([
      {
        id: SECCION_AMPLIACION_ID,
        label: "Ampliación de Sistema",
        tipo: 'materiales',
        categoriasMateriales: ["*"],
      },
    ])

    toast({
      title: "Oferta reseteada",
      description: "Puedes crear una nueva oferta",
    })
  }


  if (loading || loadingAlmacenes || loadingMarcas) {
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">Presupuesto de Oferta</h3>
                      {ofertaCreada && (
                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-xs">
                          Creada
                        </Badge>
                      )}
                    </div>
                    {items.length > 0 && (
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                        {nombreAutomatico}
                      </p>
                    )}
                    {ofertaCreada && ofertaId && (
                      <p className="text-xs text-emerald-700 mt-1">
                        ID: {ofertaId}
                      </p>
                    )}
                  </div>
                  <Badge className="bg-slate-900 text-white hover:bg-slate-900/90 text-xs flex-shrink-0">
                    {items.length} item(s)
                  </Badge>
                </div>
              </div>

              <div className="px-4 py-3 space-y-3">
                {/* Foto de Portada - Compacta */}
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <ImageIcon className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <p className="text-sm font-semibold text-slate-900">Foto de Portada</p>
                    </div>
                    
                    {fotoPortada ? (
                      <div className="flex items-center gap-2">
                        <div className="relative w-20 h-12 rounded overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0 group">
                          <img
                            src={fotoPortada}
                            alt="Portada"
                            className="w-full h-full object-cover"
                          />
                          <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                            <Upload className="h-4 w-4 text-white" />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleSubirFotoPortada}
                              className="hidden"
                              disabled={subiendoFoto}
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={eliminarFotoPortada}
                          className="text-red-600 hover:text-red-700 p-1"
                          title="Eliminar foto"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 px-3 py-1.5 rounded-md border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors flex-shrink-0">
                        {subiendoFoto ? (
                          <>
                            <div className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full" />
                            <span className="text-xs text-slate-600">Subiendo...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 text-slate-500" />
                            <span className="text-xs font-medium text-slate-700">Subir foto</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSubirFotoPortada}
                          className="hidden"
                          disabled={subiendoFoto}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Selectores para el nombre automático - Solo si hay múltiples materiales */}
                {items.length > 0 && mostrarSelectoresMateriales && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3 space-y-2">
                    <p className="text-xs font-semibold text-blue-900 mb-2">
                      Selecciona los materiales para el nombre de la oferta:
                    </p>
                    
                    {/* Selector de Inversor - Solo si hay múltiples */}
                    {tieneMultiplesInversores && (
                      <div className="space-y-1">
                        <label className="text-xs text-blue-700">Inversor:</label>
                        <Select value={inversorSeleccionado} onValueChange={setInversorSeleccionado}>
                          <SelectTrigger className="h-8 text-xs bg-white">
                            <SelectValue placeholder="Seleccionar inversor" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from(new Set(items.filter(i => i.seccion === 'INVERSORES').map(i => i.materialCodigo)))
                              .map(codigo => {
                                const item = items.find(i => i.materialCodigo === codigo)
                                const cantidad = items.filter(i => i.materialCodigo === codigo).reduce((sum, i) => sum + i.cantidad, 0)
                                const material = materials.find(m => m.codigo.toString() === codigo)
                                return (
                                  <SelectItem key={codigo} value={codigo}>
                                    {material?.nombre || item?.descripcion} ({cantidad}x)
                                  </SelectItem>
                                )
                              })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Selector de Batería - Solo si hay múltiples */}
                    {tieneMultiplesBaterias && (
                      <div className="space-y-1">
                        <label className="text-xs text-blue-700">Batería:</label>
                        <Select value={bateriaSeleccionada} onValueChange={setBateriaSeleccionada}>
                          <SelectTrigger className="h-8 text-xs bg-white">
                            <SelectValue placeholder="Seleccionar batería" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from(new Set(items.filter(i => i.seccion === 'BATERIAS').map(i => i.materialCodigo)))
                              .map(codigo => {
                                const item = items.find(i => i.materialCodigo === codigo)
                                const cantidad = items.filter(i => i.materialCodigo === codigo).reduce((sum, i) => sum + i.cantidad, 0)
                                const material = materials.find(m => m.codigo.toString() === codigo)
                                return (
                                  <SelectItem key={codigo} value={codigo}>
                                    {material?.nombre || item?.descripcion} ({cantidad}x)
                                  </SelectItem>
                                )
                              })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Selector de Panel - Solo si hay múltiples */}
                    {tieneMultiplesPaneles && (
                      <div className="space-y-1">
                        <label className="text-xs text-blue-700">Paneles:</label>
                        <Select value={panelSeleccionado} onValueChange={setPanelSeleccionado}>
                          <SelectTrigger className="h-8 text-xs bg-white">
                            <SelectValue placeholder="Seleccionar panel" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from(new Set(items.filter(i => i.seccion === 'PANELES').map(i => i.materialCodigo)))
                              .map(codigo => {
                                const item = items.find(i => i.materialCodigo === codigo)
                                const cantidad = items.filter(i => i.materialCodigo === codigo).reduce((sum, i) => sum + i.cantidad, 0)
                                const material = materials.find(m => m.codigo.toString() === codigo)
                                return (
                                  <SelectItem key={codigo} value={codigo}>
                                    {material?.nombre || item?.descripcion} ({cantidad}x)
                                  </SelectItem>
                                )
                              })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">Tipo de oferta</span>
                  <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (ofertaCreada) return
                        setOfertaGenerica(true)
                        setClienteId("")
                      }}
                      disabled={ofertaCreada}
                      className={`px-3 py-1 text-sm font-semibold rounded ${
                        ofertaGenerica ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                      } ${ofertaCreada ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      Generica
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (ofertaCreada) return
                        setOfertaGenerica(false)
                      }}
                      disabled={ofertaCreada}
                      className={`px-3 py-1 text-sm font-semibold rounded ${
                        !ofertaGenerica ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                      } ${ofertaCreada ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      Personalizada
                    </button>
                  </div>
                </div>

                {/* Selector de Estado */}
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <label className="text-sm font-semibold text-slate-900 mb-2 block">
                    Estado de la Oferta
                  </label>
                  <Select value={estadoOferta} onValueChange={setEstadoOferta}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {estadosDisponibles.map((estado) => (
                        <SelectItem key={estado.value} value={estado.value}>
                          {estado.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!ofertaGenerica && estadoOferta === 'reservada' && (
                    <p className="text-xs text-amber-600 mt-2">
                      ⚠️ Al marcar como "Reservada", los materiales se descontarán del stock
                    </p>
                  )}
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

                      const esPersonalizada = 'esPersonalizada' in step && step.esPersonalizada
                      const seccionData = 'seccionData' in step ? step.seccionData as SeccionPersonalizada : null
                      const puedeEliminar = esPersonalizada && step.id !== SECCION_AMPLIACION_ID

                      return (
                        <div
                          key={step.id}
                          className={`rounded-md border border-slate-200 px-3 py-2 ${seccionClass} ${esPersonalizada ? 'border-purple-300' : ''}`}
                        >
                          <div className="flex w-full items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveStepIndex(index)}
                              className="flex-1 flex items-center gap-2 text-left min-w-0"
                            >
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
                              {esPersonalizada && (
                                <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-50">
                                  {seccionData?.tipo === 'materiales' ? 'Materiales' : seccionData?.tipoExtra === 'escritura' ? 'Texto' : 'Costos'}
                                </Badge>
                              )}
                              {tieneItems && (
                                <span className="text-xs text-slate-500">
                                  {itemsDeSeccion.length} item(s)
                                </span>
                              )}
                            </button>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {subtotal > 0 ? (
                                <span className="text-sm font-semibold text-slate-900">
                                  {formatCurrency(subtotal)}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  {esActual ? "Selecciona materiales" : "Sin materiales"}
                                </span>
                              )}
                              {puedeEliminar && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    eliminarSeccionPersonalizada(step.id)
                                  }}
                                  className="text-red-600 hover:text-red-700 p-1"
                                  title="Eliminar sección"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {expandir && (
                            <div className="mt-2 space-y-2">
                              {/* Sección de escritura */}
                              {seccionData?.tipo === 'extra' && seccionData.tipoExtra === 'escritura' && (
                                <div className="space-y-2">
                                  <Label className="text-sm text-slate-700">Contenido:</Label>
                                  <Textarea
                                    value={seccionData.contenidoEscritura || ""}
                                    onChange={(e) => actualizarContenidoEscritura(step.id, e.target.value)}
                                    placeholder="Escribe aquí el contenido de esta sección..."
                                    className="min-h-[100px] text-sm"
                                  />
                                </div>
                              )}

                              {/* Sección de costos extras */}
                              {seccionData?.tipo === 'extra' && seccionData.tipoExtra === 'costo' && (
                                <div className="space-y-3">
                                  {seccionData.costosExtras && seccionData.costosExtras.length > 0 ? (
                                    <>
                                      <div className="grid grid-cols-[minmax(0,1fr)_80px_90px_110px_40px] text-sm text-slate-500 gap-2">
                                        <span>Descripción</span>
                                        <span className="text-center">Cant</span>
                                        <span className="text-right">P. Unit</span>
                                        <span className="text-right">Total</span>
                                        <span></span>
                                      </div>
                                      {seccionData.costosExtras.map((costo) => (
                                        <div
                                          key={costo.id}
                                          className="grid grid-cols-[minmax(0,1fr)_80px_90px_110px_40px] items-center gap-2"
                                        >
                                          <Input
                                            type="text"
                                            value={costo.descripcion}
                                            onChange={(e) => actualizarCostoExtra(step.id, costo.id, 'descripcion', e.target.value)}
                                            placeholder="Descripción del costo"
                                            className="h-8 text-sm"
                                          />
                                          <Input
                                            type="number"
                                            min="0"
                                            value={costo.cantidad}
                                            onChange={(e) => actualizarCostoExtra(step.id, costo.id, 'cantidad', Number(e.target.value) || 0)}
                                            className="h-8 text-center text-sm"
                                          />
                                          <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={costo.precioUnitario}
                                            onChange={(e) => actualizarCostoExtra(step.id, costo.id, 'precioUnitario', Number(e.target.value) || 0)}
                                            className="h-8 text-right text-sm"
                                          />
                                          <span className="text-sm font-semibold text-slate-900 text-right">
                                            {formatCurrency(costo.cantidad * costo.precioUnitario)}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => eliminarCostoExtra(step.id, costo.id)}
                                            className="text-red-600 hover:text-red-700 text-sm"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ))}
                                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => agregarCostoExtra(step.id)}
                                          className="h-8 text-xs"
                                        >
                                          <Plus className="h-3 w-3 mr-1" />
                                          Agregar costo
                                        </Button>
                                        <span className="text-sm font-semibold text-slate-900">
                                          Subtotal: {formatCurrency(
                                            seccionData.costosExtras.reduce((sum, c) => sum + (c.cantidad * c.precioUnitario), 0)
                                          )}
                                        </span>
                                      </div>
                                    </>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => agregarCostoExtra(step.id)}
                                      className="w-full h-8 text-xs"
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Agregar primer costo
                                    </Button>
                                  )}
                                </div>
                              )}

                              {/* Sección de materiales (normal o personalizada) */}
                              {(!seccionData || seccionData.tipo === 'materiales') && (
                                <>
                                  {itemsDeSeccion.length > 0 ? (
                                    <>
                                      <div className="grid grid-cols-[minmax(0,1fr)_90px_80px_120px_120px_40px] text-sm text-slate-500 gap-2">
                                        <span>Material</span>
                                        <span className="text-right">P. Unit</span>
                                        <span className="text-center">Cant</span>
                                        <span className="text-right">Total</span>
                                        <span className="text-right">Margen (%)</span>
                                        <span></span>
                                      </div>
                                      {itemsDeSeccion.map((item) => (
                                        <div
                                          key={item.id}
                                          className="grid grid-cols-[minmax(0,1fr)_90px_80px_120px_120px_40px] items-center gap-2"
                                        >
                                          <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-900 truncate">
                                              {materials.find(m => m.codigo.toString() === item.materialCodigo)?.nombre || item.descripcion}
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
                                          <div className="flex flex-col items-end">
                                            <span className="text-sm font-semibold text-slate-900">
                                              {formatCurrency(item.precio * item.cantidad)}
                                            </span>
                                            <span className="text-[11px] text-slate-500">
                                              + {formatCurrency(margenPorMaterialCalculado.get(item.id) || 0)}
                                            </span>
                                            <span className="text-[11px] font-semibold text-slate-900">
                                              {formatCurrency(
                                                item.precio * item.cantidad + (margenPorMaterialCalculado.get(item.id) || 0)
                                              )}
                                            </span>
                                          </div>
                                          <div className="flex flex-col items-end gap-1">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-slate-500">%</span>
                                              <Input
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={
                                                  typeof porcentajeAsignadoPorItem[item.id] === "number"
                                                    ? porcentajeAsignadoPorItem[item.id].toString()
                                                    : (porcentajeMargenPorItem.get(item.id)?.toString() ?? "")
                                                }
                                                onChange={(e) => {
                                                  const value = e.target.value
                                                  setPorcentajeAsignadoPorItem((prev) => {
                                                    const next = { ...prev }
                                                    if (value === "") {
                                                      delete next[item.id]
                                                      return next
                                                    }
                                                    const parsed = Number(value)
                                                    if (Number.isNaN(parsed)) {
                                                      delete next[item.id]
                                                    } else {
                                                      next[item.id] = Math.min(100, Math.max(0, parsed))
                                                    }
                                                    return next
                                                  })
                                                }}
                                                className="h-8 w-20 text-right text-sm"
                                                placeholder="Auto"
                                              />
                                            </div>
                                            {(() => {
                                              const currentPercent = typeof porcentajeAsignadoPorItem[item.id] === "number"
                                                ? porcentajeAsignadoPorItem[item.id]
                                                : (porcentajeMargenPorItem.get(item.id) ?? 0)
                                              const sugerido = porcentajeSugeridoPorMaterial.get(item.id) ?? 0
                                              const delta = sugerido - currentPercent
                                              return (
                                                <>
                                            <span className="text-[11px] text-slate-500">
                                                  {`${currentPercent.toFixed(2)}% · ${formatCurrency(margenPorMaterialCalculado.get(item.id) || 0)}`}
                                            </span>
                                            {Math.abs(faltantePorMaterial.get(item.id) || 0) > 0.01 && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const sugerido = porcentajeSugeridoPorMaterial.get(item.id) || 0
                                                  setPorcentajeAsignadoPorItem((prev) => ({
                                                    ...prev,
                                                    [item.id]: Number(sugerido.toFixed(2)),
                                                  }))
                                                }}
                                                className="text-[11px] text-blue-600 hover:text-blue-700"
                                              >
                                                Ajuste recomendado: {sugerido.toFixed(2)}% ({delta >= 0 ? "+" : ""}{delta.toFixed(2)}%)
                                              </button>
                                            )}
                                            {Math.abs(faltantePorMaterial.get(item.id) || 0) > 0.01 && (
                                              <span className="text-[11px] text-amber-600">
                                                {faltantePorMaterial.get(item.id)! > 0
                                                  ? `Falta ${formatCurrency(faltantePorMaterial.get(item.id) || 0)}`
                                                  : `Sobra ${formatCurrency(Math.abs(faltantePorMaterial.get(item.id) || 0))}`}
                                              </span>
                                            )}
                                                </>
                                              )
                                            })()}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => actualizarCantidad(item.id, 0)}
                                            className="text-red-600 hover:text-red-700 text-sm"
                                          >
                                            ✕
                                          </button>
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
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Botón para agregar sección */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={abrirDialogoSeccion}
                      className="w-full border-dashed border-2 border-purple-300 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Sección Personalizada
                    </Button>

                    {servicios.length > 0 && (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50/40 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-emerald-900">Servicios</span>
                          <span className="text-sm font-semibold text-emerald-900">
                            {formatCurrency(margenParaInstalacion)}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_70px_110px] items-center gap-2 text-sm">
                          <span className="text-slate-700 truncate">
                            Servicio de instalación y montaje
                          </span>
                          <span className="text-center text-slate-600">1</span>
                          <span className="text-right font-medium text-slate-800">
                            {formatCurrency(margenParaInstalacion)}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-emerald-700">
                          Calculado desde el % de margen comercial asignado a instalación.
                        </p>
                      </div>
                    )}
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
                <div className="rounded-md border border-slate-200 bg-white p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-semibold text-slate-900">
                      Margen Comercial (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="99"
                      step="0.1"
                      value={margenComercial}
                      onChange={(e) => setMargenComercial(Number(e.target.value) || 0)}
                      className="h-9 w-24 text-right"
                      placeholder="0"
                    />
                  </div>

                  {margenComercial > 0 && (
                    <>
                      <div className="pt-2 border-t border-slate-200 space-y-3">
                        <p className="text-xs font-semibold text-slate-700">
                          Distribución del margen comercial:
                        </p>
                        
                        {/* Distribución Materiales */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <label className="text-xs text-slate-600">
                              Para Materiales (%)
                            </label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={porcentajeMargenMateriales}
                                onChange={(e) => {
                                  const valor = Number(e.target.value) || 0
                                  const ajustado = Math.min(100, Math.max(0, valor))
                                  setPorcentajeMargenMateriales(ajustado)
                                  setPorcentajeMargenInstalacion(100 - ajustado)
                                }}
                                className="h-8 w-20 text-right text-xs"
                              />
                              <span className="text-xs text-slate-500 w-16">
                                {formatCurrency(margenParaMateriales)}
                              </span>
                            </div>
                          </div>
                          
                          {/* Barra de progreso para materiales */}
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all"
                              style={{ width: `${porcentajeMargenMateriales}%` }}
                            />
                          </div>
                        </div>

                        {/* Distribución Instalación */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <label className="text-xs text-slate-600">
                              Para Instalación (%)
                            </label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={porcentajeMargenInstalacion}
                                onChange={(e) => {
                                  const valor = Number(e.target.value) || 0
                                  const ajustado = Math.min(100, Math.max(0, valor))
                                  setPorcentajeMargenInstalacion(ajustado)
                                  setPorcentajeMargenMateriales(100 - ajustado)
                                }}
                                className="h-8 w-20 text-right text-xs"
                              />
                              <span className="text-xs text-slate-500 w-16">
                                {formatCurrency(margenParaInstalacion)}
                              </span>
                            </div>
                          </div>
                          
                          {/* Barra de progreso para instalación */}
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 transition-all"
                              style={{ width: `${porcentajeMargenInstalacion}%` }}
                            />
                          </div>
                        </div>

                        {porcentajeMargenMateriales + porcentajeMargenInstalacion !== 100 && (
                          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                            ⚠️ La suma debe ser 100% (actual: {porcentajeMargenMateriales + porcentajeMargenInstalacion}%)
                          </p>
                        )}
                        {Math.abs(totalMargenAsignadoMateriales - margenParaMateriales) > 0.01 && (
                          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                            ⚠️ El margen asignado a materiales ({formatCurrency(totalMargenAsignadoMateriales)}) no coincide con el margen de materiales ({formatCurrency(margenParaMateriales)}).
                          </p>
                        )}
                        {totalMargenAsignadoMateriales - margenParaMateriales > 0.01 && (
                          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                            ⛔ Estás por encima de lo acordado: supera el margen de materiales en {formatCurrency(totalMargenAsignadoMateriales - margenParaMateriales)}.
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">Total materiales base</span>
                          <span className="font-medium text-slate-900">
                            {formatCurrency(totalMateriales)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">Margen total ({margenComercial}%)</span>
                          <span className="font-medium text-slate-900">
                            {formatCurrency(margenComercialTotal)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-semibold pt-1 border-t border-slate-200">
                          <span className="text-slate-900">Subtotal con margen</span>
                          <span className="text-slate-900">
                            {formatCurrency(subtotalConMargen)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
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
                                  {materials.find(m => m.codigo.toString() === elem.materialCodigo)?.nombre || elem.descripcion}
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
                      <span>Materiales base</span>
                      <span className="font-medium">{formatCurrency(totalMateriales)}</span>
                    </div>
                    {margenParaMateriales > 0 && (
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <span>Margen sobre materiales ({porcentajeMargenMateriales}%)</span>
                        <span className="font-medium">{formatCurrency(margenParaMateriales)}</span>
                      </div>
                    )}
                    {margenParaInstalacion > 0 && (
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <span>Servicio de instalación y montaje ({porcentajeMargenInstalacion}%)</span>
                        <span className="font-medium">{formatCurrency(margenParaInstalacion)}</span>
                      </div>
                    )}
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
                    {totalCostosExtras > 0 && (
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <span>Costos Extras</span>
                        <span className="font-medium">{formatCurrency(totalCostosExtras)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t-2 border-emerald-600 space-y-2">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={pagoTransferencia}
                            onChange={(e) => {
                              setPagoTransferencia(e.target.checked)
                              if (!e.target.checked) setDatosCuenta("")
                            }}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          Pago por transferencia
                        </label>
                        {pagoTransferencia && (
                          <div className="space-y-1">
                            <span className="text-xs text-slate-500">Datos de la cuenta</span>
                            <Textarea
                              value={datosCuenta}
                              onChange={(e) => setDatosCuenta(e.target.value)}
                              placeholder="Banco, titular, número de cuenta, etc."
                              className="min-h-[90px]"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={aplicaContribucion}
                            onChange={(e) => {
                              setAplicaContribucion(e.target.checked)
                              if (!e.target.checked) setPorcentajeContribucion(0)
                            }}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          Aplicar % de Contribución
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={porcentajeContribucion}
                          onChange={(e) => setPorcentajeContribucion(Number(e.target.value) || 0)}
                          className="h-8 w-[110px] text-right bg-white"
                          placeholder="0.00"
                          disabled={!aplicaContribucion}
                        />
                      </div>
                      {aplicaContribucion && porcentajeContribucion > 0 && (
                        <div className="flex items-center justify-between text-sm text-slate-700">
                          <span>Contribución</span>
                          <span className="font-medium">
                            {formatCurrency(
                              (subtotalConMargen +
                                margenParaInstalacion +
                                costoTransportacion +
                                totalElementosPersonalizados +
                                totalCostosExtras) *
                                (porcentajeContribucion / 100)
                            )}
                          </span>
                        </div>
                      )}
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

                    <div className="pt-3 border-t border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <span>Moneda de pago</span>
                        <Select
                          value={monedaPago}
                          onValueChange={(value) => {
                            setMonedaPago(value as 'USD' | 'EUR' | 'CUP')
                            if (value === 'USD') setTasaCambio("")
                          }}
                        >
                          <SelectTrigger className="h-8 w-[140px] bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">Dólares (USD)</SelectItem>
                            <SelectItem value="EUR">Euros (EUR)</SelectItem>
                            <SelectItem value="CUP">CUP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {monedaPago !== 'USD' && (
                        <div className="flex items-center justify-between text-sm text-slate-700">
                          <span>{monedaPago === 'EUR' ? '1 EUR =' : '1 USD ='}</span>
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={tasaCambio}
                              onChange={(e) => {
                                const next = e.target.value.replace(',', '.')
                                if (/^\d*([.]?\d{0,4})?$/.test(next)) {
                                  setTasaCambio(next)
                                }
                              }}
                              placeholder="0.0000"
                              className="h-8 w-[140px] bg-white text-right"
                            />
                            <span className="text-xs font-semibold text-slate-600">
                              {monedaPago === 'EUR' ? 'USD' : 'CUP'}
                            </span>
                          </div>
                        </div>
                      )}

                    {mostrarCambio && (
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <span>Precio en {monedaPago}</span>
                        <span className="font-semibold text-emerald-900">
                          {formatCurrencyWithSymbol(
                            montoConvertido,
                            monedaPago === 'EUR' ? '€' : 'CUP'
                          )}
                        </span>
                      </div>
                    )}

                    
                  </div>
                </div>
                </div>

                <Button
                  onClick={() => setMostrarDialogoExportar(true)}
                  disabled={items.length === 0}
                  variant="outline"
                  className="w-full border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Exportar oferta
                </Button>

                {/* Botón de Crear Oferta */}
                {!ofertaCreada ? (
                  <Button
                    onClick={handleCrearOferta}
                    disabled={creandoOferta || items.length === 0 || !almacenId || (!ofertaGenerica && !clienteId)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-semibold"
                  >
                    {creandoOferta ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Creando Oferta...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5 mr-2" />
                        Crear Oferta
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-md border-2 border-emerald-600 bg-emerald-50 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-emerald-900 mb-1">
                            Oferta Creada Exitosamente
                          </h4>
                          <p className="text-xs text-emerald-700 mb-2">
                            ID: {ofertaId}
                          </p>
                          <p className="text-xs text-emerald-700">
                            {nombreAutomatico}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={resetearOferta}
                        variant="outline"
                        className="flex-1"
                      >
                        Nueva Oferta
                      </Button>
                      {!materialesReservados && almacenId && (
                        <Button
                          onClick={handleReservarMateriales}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          Reservar Materiales
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Botón de Reservar Materiales - Solo si la oferta ya está creada */}
                {ofertaCreada && items.length > 0 && almacenId && !materialesReservados && (
                  <div className="rounded-md border border-slate-300 bg-slate-50 px-4 py-3">
                    <p className="text-xs text-slate-600 text-center">
                      💡 Puedes reservar los materiales usando el botón de arriba
                    </p>
                  </div>
                )}

                {/* Sección de Reserva - Solo visible después de crear la oferta */}
                {ofertaCreada && items.length > 0 && almacenId && (
                  <div className="rounded-md border-2 border-blue-600 bg-blue-50 px-4 py-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Lock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-blue-900 mb-1">
                            Reservar Materiales del Almacén
                          </h4>
                          {materialesReservados ? (
                            <div className="space-y-2">
                              <p className="text-xs text-blue-700">
                                Los materiales de esta oferta están reservados en el almacén
                              </p>
                              {fechaExpiracionReserva && (
                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                  ⏰ Reserva temporal hasta: {fechaExpiracionReserva.toLocaleDateString('es-ES', { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              )}
                              {!fechaExpiracionReserva && (
                                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                                  ✓ Reserva definitiva
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-blue-700">
                              Reserva los materiales para asegurar su disponibilidad. Puedes elegir una reserva temporal o definitiva.
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {materialesReservados ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                            <CheckCircle className="h-4 w-4" />
                            <span className="font-medium">
                              {items.length} material{items.length !== 1 ? 'es' : ''} reservado{items.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {fechaExpiracionReserva && (
                            <Button
                              onClick={cancelarReserva}
                              variant="outline"
                              className="w-full border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancelar Reserva
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          onClick={handleReservarMateriales}
                          disabled={reservandoMateriales}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {reservandoMateriales ? (
                            <>
                              <span className="animate-spin mr-2">⏳</span>
                              Reservando...
                            </>
                          ) : (
                            <>
                              <Lock className="h-4 w-4 mr-2" />
                              Reservar {items.length} Material{items.length !== 1 ? 'es' : ''}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Panel derecho: grid de materiales */}
          <div className="w-full flex-1 min-h-0 flex flex-col bg-white">
            {/* Buscador y selector de almacén */}
            <div className="sticky top-0 z-10 px-6 py-4 border-b bg-white space-y-3">
              {/* Selector de almacén */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                  Almacén:
                </label>
                <Select value={almacenId} onValueChange={setAlmacenId}>
                  <SelectTrigger className={`w-full max-w-[300px] h-9 ${!almacenId ? 'border-orange-300 bg-orange-50' : ''}`}>
                    <SelectValue placeholder="Seleccionar almacén" />
                  </SelectTrigger>
                  <SelectContent>
                    {almacenes.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">
                        No hay almacenes disponibles
                      </div>
                    ) : (
                      almacenes.map((almacen) => (
                        <SelectItem key={almacen.id} value={almacen.id ?? ""}>
                          {almacen.nombre}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {almacenId && (
                  <Badge variant="outline" className="text-xs">
                    {materialesConStock.length} materiales con stock
                  </Badge>
                )}
              </div>

              {/* Buscador */}
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
                <p className="text-xs text-blue-600 font-medium">
                  Modo: Elementos Personalizados - Haz clic en un material para agregarlo
                </p>
              )}
              {ofertaCreada && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <p className="text-xs text-emerald-700 font-medium">
                    ✓ Oferta creada - Para modificar, crea una nueva oferta
                  </p>
                </div>
              )}
              {!almacenId && (
                <p className="text-xs text-orange-600 font-medium">
                  ⚠️ Selecciona un almacén para ver los materiales disponibles
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
                        : activeStep && 'seccionData' in activeStep && activeStep.seccionData?.tipo === 'extra'
                        ? `Esta es una sección de ${activeStep.seccionData.tipoExtra === 'escritura' ? 'texto' : 'costos extras'}`
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
                          className={`cursor-pointer hover:shadow-lg transition-shadow border border-slate-200 bg-white overflow-hidden ${
                            ofertaCreada ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          onClick={() => {
                            if (ofertaCreada) return
                            mostrarElementosPersonalizados
                              ? agregarMaterialPersonalizado(material)
                              : agregarMaterial(material)
                          }}
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
                              {/* Badge de stock disponible */}
                              {almacenId && 'stock_disponible' in material && typeof (material as any).stock_disponible === 'number' && (
                                <span className={`absolute bottom-2 left-2 rounded-md text-white text-xs font-semibold px-2 py-0.5 shadow-md ${
                                  (material as any).stock_disponible > 10
                                    ? 'bg-emerald-600'
                                    : (material as any).stock_disponible > 0
                                    ? 'bg-amber-600'
                                    : 'bg-red-600'
                                }`}>
                                  Stock: {(material as any).stock_disponible}
                                </span>
                              )}
                            </div>
                            <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
                              <h3 className="font-medium text-sm line-clamp-2 min-h-[40px] text-slate-900 break-words">
                                {material.nombre || material.descripcion}
                              </h3>
                            </div>
                            <div className="mt-auto">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                                  <p className="text-base font-semibold text-orange-600 whitespace-nowrap">
                                    ${material.precio ? material.precio.toFixed(2) : "0.00"}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className="text-xs border border-blue-200 text-blue-700 bg-blue-50 w-fit"
                                    title={material.categoria}
                                  >
                                    {material.categoria}
                                  </Badge>
                                </div>
                                {selectedCount > 0 && (
                                  <Badge className="bg-slate-900 text-white text-xs whitespace-nowrap flex-shrink-0">
                                    En oferta: {selectedCount}
                                  </Badge>
                                )}
                              </div>
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

      {/* Diálogo para exportar oferta */}
      <Dialog open={mostrarDialogoExportar} onOpenChange={setMostrarDialogoExportar}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Exportar oferta</DialogTitle>
            <DialogDescription>
              Selecciona el tipo de exportación y el formato (Excel o PDF).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-4 space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">1) Completo</h4>
                <p className="text-xs text-slate-600">
                  Incluye precios, márgenes, servicios y totales.
                </p>
              </div>
              <ExportButtons
                exportOptions={exportOptionsCompleto}
                baseFilename={`${baseFilenameExport}_completo`}
                variant="compact"
              />
            </div>

            <div className="rounded-lg border border-slate-200 p-4 space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">2) Sin precios</h4>
                <p className="text-xs text-slate-600">
                  Solo materiales y cantidades, con total sin margen.
                </p>
              </div>
              <ExportButtons
                exportOptions={exportOptionsSinPrecios}
                baseFilename={`${baseFilenameExport}_sin_precios`}
                variant="compact"
              />
            </div>

            <div className="rounded-lg border border-slate-200 p-4 space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">3) Cliente con precios</h4>
                <p className="text-xs text-slate-600">
                  Precios por material con su % aplicado.
                </p>
              </div>
              <ExportButtons
                exportOptions={exportOptionsClienteConPrecios}
                baseFilename={`${baseFilenameExport}_cliente_precios`}
                variant="compact"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para agregar sección personalizada */}
      <Dialog open={mostrarDialogoSeccion} onOpenChange={setMostrarDialogoSeccion}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar Sección Personalizada</DialogTitle>
            <DialogDescription>
              Crea una nueva sección para materiales específicos, notas adicionales o costos extras en tu oferta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Nombre de la sección */}
            <div className="space-y-2">
              <Label htmlFor="nombre-seccion">Nombre de la sección *</Label>
              <Input
                id="nombre-seccion"
                value={nombreSeccionNueva}
                onChange={(e) => setNombreSeccionNueva(e.target.value)}
                placeholder="Ej: Instalación, Mano de obra, Notas adicionales..."
              />
            </div>

            {/* Tipo de sección */}
            <div className="space-y-2">
              <Label>Tipo de sección *</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTipoSeccionNueva('materiales')
                    setTipoExtraSeccion(null)
                  }}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    tipoSeccionNueva === 'materiales'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Package className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <p className="font-semibold text-sm">Materiales</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Selecciona categorías de materiales para mostrar
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipoSeccionNueva('extra')
                    setTipoExtraSeccion(null)
                  }}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    tipoSeccionNueva === 'extra'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Plus className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                  <p className="font-semibold text-sm">Extra</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Agrega texto o costos adicionales
                  </p>
                </button>
              </div>
            </div>

            {/* Configuración para materiales */}
            {tipoSeccionNueva === 'materiales' && (
              <div className="space-y-2">
                <Label>Categorías de materiales a mostrar *</Label>
                <div className="border rounded-lg p-3 max-h-[300px] overflow-y-auto space-y-2">
                  {categoriasDisponibles.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">
                      No hay categorías disponibles
                    </p>
                  ) : (
                    categoriasDisponibles.map((categoria) => (
                      <label
                        key={categoria}
                        className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={categoriasSeleccionadas.includes(categoria)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCategoriasSeleccionadas(prev => [...prev, categoria])
                            } else {
                              setCategoriasSeleccionadas(prev => prev.filter(c => c !== categoria))
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{categoria}</span>
                      </label>
                    ))
                  )}
                </div>
                {categoriasSeleccionadas.length > 0 && (
                  <p className="text-xs text-slate-600">
                    {categoriasSeleccionadas.length} categoría(s) seleccionada(s)
                  </p>
                )}
              </div>
            )}

            {/* Configuración para extras */}
            {tipoSeccionNueva === 'extra' && (
              <div className="space-y-3">
                <Label>Tipo de contenido extra *</Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoExtraSeccion('escritura')}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      tipoExtraSeccion === 'escritura'
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-semibold text-sm">Solo Escritura</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Campo de texto libre para notas o descripciones
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoExtraSeccion('costo')}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      tipoExtraSeccion === 'costo'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-semibold text-sm">Costo Extra</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Agrega costos con descripción, cantidad y precio
                    </p>
                  </button>
                </div>

                {tipoExtraSeccion === 'escritura' && (
                  <div className="space-y-2">
                    <Label htmlFor="contenido-escritura">Contenido inicial (opcional)</Label>
                    <Textarea
                      id="contenido-escritura"
                      value={contenidoEscritura}
                      onChange={(e) => setContenidoEscritura(e.target.value)}
                      placeholder="Puedes agregar contenido inicial o dejarlo vacío para llenarlo después..."
                      className="min-h-[100px]"
                    />
                  </div>
                )}

                {tipoExtraSeccion === 'costo' && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm text-slate-600">
                      Los costos se agregarán después de crear la sección. Podrás añadir múltiples costos con descripción, cantidad y precio unitario.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cerrarDialogoSeccion}>
              Cancelar
            </Button>
            <Button onClick={agregarSeccionPersonalizada}>
              Agregar Sección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para seleccionar tipo de reserva */}
      <Dialog open={mostrarDialogoReserva} onOpenChange={setMostrarDialogoReserva}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tipo de Reserva de Materiales</DialogTitle>
            <DialogDescription>
              Selecciona si deseas reservar los materiales de forma temporal o definitiva.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {/* Opción Temporal */}
              <button
                type="button"
                onClick={() => setTipoReserva('temporal')}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  tipoReserva === 'temporal'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    tipoReserva === 'temporal' ? 'border-amber-500' : 'border-slate-300'
                  }`}>
                    {tipoReserva === 'temporal' && (
                      <div className="h-3 w-3 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-slate-900 mb-1">
                      Reserva Temporal
                    </p>
                    <p className="text-xs text-slate-600 mb-2">
                      Los materiales se reservan por un período específico. Al vencer el plazo, la reserva se cancela automáticamente y los materiales vuelven a estar disponibles.
                    </p>
                    {tipoReserva === 'temporal' && (
                      <div className="mt-3 space-y-2">
                        <Label htmlFor="dias-reserva" className="text-xs">
                          Días de reserva:
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="dias-reserva"
                            type="number"
                            min="1"
                            max="365"
                            value={diasReserva}
                            onChange={(e) => setDiasReserva(Number(e.target.value) || 1)}
                            className="h-9 w-24"
                          />
                          <span className="text-sm text-slate-600">
                            días ({diasReserva === 1 ? '1 día' : `${diasReserva} días`})
                          </span>
                        </div>
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                          ⏰ Expira el: {new Date(Date.now() + diasReserva * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </button>

              {/* Opción Definitiva */}
              <button
                type="button"
                onClick={() => setTipoReserva('definitiva')}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  tipoReserva === 'definitiva'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    tipoReserva === 'definitiva' ? 'border-emerald-500' : 'border-slate-300'
                  }`}>
                    {tipoReserva === 'definitiva' && (
                      <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-slate-900 mb-1">
                      Reserva Definitiva
                    </p>
                    <p className="text-xs text-slate-600">
                      Los materiales se reservan de forma permanente hasta que se complete la oferta o se cancele manualmente. No hay fecha de expiración automática.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Resumen de materiales */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-700 mb-2">
                Materiales a reservar:
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Total de materiales:</span>
                  <span className="font-semibold text-slate-900">{items.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Almacén:</span>
                  <span className="font-semibold text-slate-900">
                    {almacenes.find(a => a.id === almacenId)?.nombre || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cerrarDialogoReserva}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmarReserva}
              disabled={!tipoReserva}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Lock className="h-4 w-4 mr-2" />
              Confirmar Reserva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
