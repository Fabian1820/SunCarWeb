"use client"

import { Card, CardContent } from "@/components/shared/molecule/card"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/shared/molecule/dialog"
import { Input } from "@/components/shared/atom/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Loader } from "@/components/shared/atom/loader"
import { ExportButtons } from "@/components/shared/molecule/export-buttons"
import { EditarOfertaDialog } from "./editar-oferta-dialog"
import { ExportSelectionDialog } from "./export-selection-dialog"
import { useOfertasConfeccion } from "@/hooks/use-ofertas-confeccion"
import { useMaterials } from "@/hooks/use-materials"
import { useMarcas } from "@/hooks/use-marcas"
import { ClienteService } from "@/lib/services/feats/customer/cliente-service"
import { LeadService } from "@/lib/services/feats/leads/lead-service"
import { InventarioService } from "@/lib/services/feats/inventario/inventario-service"
import type { Cliente } from "@/lib/types/feats/customer/cliente-types"
import type { Almacen } from "@/lib/inventario-types"
import { Building2, FileText, Package, Search, User, Download, Edit, Trash2, Copy } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

export function OfertasConfeccionadasView() {
  const router = useRouter()
  const { ofertas, loading, eliminarOferta, refetch } = useOfertasConfeccion()
  const { materials } = useMaterials()
  const { marcas } = useMarcas()
  const [searchQuery, setSearchQuery] = useState("")
  const [estadoFiltro, setEstadoFiltro] = useState("todos")
  const [tipoFiltro, setTipoFiltro] = useState("todas")
  const [almacenFiltro, setAlmacenFiltro] = useState("todos")
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [detalleAbierto, setDetalleAbierto] = useState(false)
  const [ofertaSeleccionada, setOfertaSeleccionada] = useState<(typeof ofertas)[number] | null>(null)
  const [mostrarDialogoExportar, setMostrarDialogoExportar] = useState(false)
  const [ofertaParaExportar, setOfertaParaExportar] = useState<(typeof ofertas)[number] | null>(null)
  const [mostrarDialogoEditar, setMostrarDialogoEditar] = useState(false)
  const [ofertaParaEditar, setOfertaParaEditar] = useState<(typeof ofertas)[number] | null>(null)
  const [mostrarDialogoEliminar, setMostrarDialogoEliminar] = useState(false)
  const [ofertaParaEliminar, setOfertaParaEliminar] = useState<(typeof ofertas)[number] | null>(null)
  const [eliminandoOferta, setEliminandoOferta] = useState(false)

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

  // Cargar clientes, leads y almacenes
  useEffect(() => {
    const loadClientes = async () => {
      try {
        const data = await ClienteService.getClientes()
        setClientes(Array.isArray(data) ? data : [])
      } catch (error) {
        setClientes([])
      }
    }
    const loadLeads = async () => {
      try {
        const data = await LeadService.getLeads()
        setLeads(Array.isArray(data) ? data : [])
      } catch (error) {
        setLeads([])
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
    loadLeads()
    loadAlmacenes()
  }, [])

  // Recargar ofertas solo cuando la página se vuelve visible después de estar oculta por más de 5 minutos
  useEffect(() => {
    let lastHiddenTime: number | null = null

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        lastHiddenTime = Date.now()
      } else if (document.visibilityState === 'visible' && lastHiddenTime) {
        const timeDiff = Date.now() - lastHiddenTime
        // Solo refrescar si estuvo oculta por más de 5 minutos (300000 ms)
        if (timeDiff > 300000) {
          refetch()
        }
        lastHiddenTime = null
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refetch])

  // Mapas de búsqueda
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

  const leadPorId = useMemo(() => {
    const map = new Map<string, any>()
    leads.forEach((lead) => {
      if (lead.id) {
        map.set(lead.id, lead)
      }
    })
    return map
  }, [leads])

  // Filtrado de ofertas
  const ofertasFiltradas = useMemo(() => {
    if (!searchQuery.trim()) return ofertas
    const query = searchQuery.trim().toLowerCase()
    return ofertas.filter((oferta) => {
      // Buscar en nombre de oferta
      if (oferta.nombre.toLowerCase().includes(query)) return true
      
      // Buscar en nombre de cliente
      if (oferta.cliente_nombre?.toLowerCase().includes(query)) return true
      
      // Buscar en nombre de lead sin agregar
      if (oferta.nombre_lead_sin_agregar?.toLowerCase().includes(query)) return true
      
      // Buscar en nombre de lead
      if (oferta.lead_nombre?.toLowerCase().includes(query)) return true
      
      // Buscar en lead cargado
      if (oferta.lead_id) {
        const lead = leadPorId.get(oferta.lead_id)
        if (lead?.nombre_completo?.toLowerCase().includes(query)) return true
        if (lead?.nombre?.toLowerCase().includes(query)) return true
        if (lead?.telefono?.toLowerCase().includes(query)) return true
        if (lead?.email?.toLowerCase().includes(query)) return true
      }
      
      return false
    })
  }, [ofertas, searchQuery, leadPorId])

  const ofertasFiltradasConFiltros = useMemo(() => {
    return ofertasFiltradas.filter((oferta) => {
      const matchEstado = estadoFiltro === "todos" || oferta.estado === estadoFiltro
      const matchTipo = tipoFiltro === "todas" || oferta.tipo === tipoFiltro
      const matchAlmacen = almacenFiltro === "todos" || oferta.almacen_id === almacenFiltro
      return matchEstado && matchTipo && matchAlmacen
    })
  }, [ofertasFiltradas, estadoFiltro, tipoFiltro, almacenFiltro])

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

  // Mapa de secciones
  const seccionLabelMap = useMemo(() => {
    const map = new Map<string, string>()
    const secciones = [
      { id: "INVERSORES", label: "Inversores" },
      { id: "BATERIAS", label: "Baterías" },
      { id: "PANELES", label: "Paneles" },
      { id: "MPPT", label: "MPPT" },
      { id: "ESTRUCTURAS", label: "Estructuras" },
      { id: "CABLEADO_DC", label: "Cableado DC" },
      { id: "CABLEADO_AC", label: "Cableado AC" },
      { id: "CANALIZACION", label: "Canalización" },
      { id: "TIERRA", label: "Tierra" },
      { id: "PROTECCIONES_ELECTRICAS", label: "Protecciones Eléctricas y Gabinetes" },
      { id: "MATERIAL_VARIO", label: "Material vario" },
    ]
    secciones.forEach(s => map.set(s.id, s.label))
    return map
  }, [])

  // Generar opciones de exportación para una oferta
  const generarOpcionesExportacion = (oferta: (typeof ofertas)[number]) => {
    const cliente = clientePorOferta.get(oferta.cliente_id || "") || clientePorOferta.get(oferta.cliente_numero || "")
    const lead = oferta.lead_id ? leadPorId.get(oferta.lead_id) : null
    
    // Orden de secciones (mismo orden que en confección de ofertas)
    const ordenSeccionesBase = [
      "INVERSORES",
      "BATERIAS",
      "PANELES",
      "MPPT",
      "ESTRUCTURAS",
      "CABLEADO_DC",
      "CABLEADO_AC",
      "CANALIZACION",
      "TIERRA",
      "PROTECCIONES_ELECTRICAS",
      "MATERIAL_VARIO",
    ]
    
    // Agregar secciones personalizadas al final si existen
    const seccionesPersonalizadasOferta = oferta.secciones_personalizadas || []
    const ordenSecciones = [
      ...ordenSeccionesBase,
      ...seccionesPersonalizadasOferta.map((s: any) => s.id)
    ]
    
    // Función para ordenar items por sección
    const ordenarItemsPorSeccion = (items: any[]) => {
      return [...items].sort((a, b) => {
        const indexA = ordenSecciones.indexOf(a.seccion)
        const indexB = ordenSecciones.indexOf(b.seccion)
        
        // Si la sección no está en el orden predefinido, ponerla al final
        const posA = indexA === -1 ? 999 : indexA
        const posB = indexB === -1 ? 999 : indexB
        
        return posA - posB
      })
    }
    
    // Ordenar items de la oferta
    const itemsOrdenados = ordenarItemsPorSeccion(oferta.items || [])
    
    // Crear mapa de fotos
    const fotosMap = new Map<string, string>()
    itemsOrdenados.forEach((item) => {
      const material = materials.find(m => m.codigo.toString() === item.material_codigo)
      if (material?.foto) {
        fotosMap.set(item.material_codigo?.toString(), material.foto)
      }
    })

    // Generar nombre base del archivo usando el mismo formato que en confección
    let baseFilename = oferta.nombre
      .replace(/[<>:"/\\|?*]/g, '') // Eliminar caracteres no válidos en nombres de archivo
      .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
      .replace(/,\s*/g, '+') // Reemplazar comas con + para el formato I-1x10kW+B-1x10kWh+P-14x590W
      .replace(/_+/g, '_') // Reemplazar múltiples guiones bajos con uno solo
      .trim()
    
    // Si es personalizada, agregar nombre del cliente/lead
    if (oferta.tipo === 'personalizada') {
      let nombreContacto = ""
      
      if (cliente?.nombre) {
        nombreContacto = cliente.nombre
      } else if (lead?.nombre_completo || lead?.nombre) {
        nombreContacto = lead.nombre_completo || lead.nombre
      } else if (oferta.nombre_lead_sin_agregar) {
        nombreContacto = oferta.nombre_lead_sin_agregar
      }
      
      if (nombreContacto) {
        const nombreLimpio = nombreContacto
          .replace(/[<>:"/\\|?*]/g, '')
          .replace(/\s+/g, '_')
          .replace(/_+/g, '_')
          .trim()
        baseFilename = `${baseFilename}-${nombreLimpio}`
      }
    }

    // Calcular margen por material (simplificado - en la oferta guardada ya viene calculado)
    const margenPorMaterial = new Map<string, number>()
    itemsOrdenados.forEach((item) => {
      // El margen ya está incluido en el precio final de cada item
      margenPorMaterial.set(item.material_codigo?.toString(), 0)
    })

    const tasaCambioNumero = oferta.tasa_cambio || 0
    const montoConvertido = tasaCambioNumero > 0 && oferta.moneda_pago !== 'USD'
      ? oferta.moneda_pago === 'EUR'
        ? (oferta.precio_final || 0) / tasaCambioNumero
        : (oferta.precio_final || 0) * tasaCambioNumero
      : 0

    // Extraer componentes principales de los items
    const componentesPrincipales: any = {}
    
    // Buscar inversor (sección INVERSORES)
    const itemsInversores = itemsOrdenados.filter(item => item.seccion === 'INVERSORES')
    if (itemsInversores.length > 0) {
      const inversor = itemsInversores[0]
      const material = materials.find(m => m.codigo.toString() === inversor.material_codigo)
      
      // Extraer potencia del nombre/descripción (buscar patrón como "10kW" o "10 kW")
      const potenciaMatch = material?.nombre?.match(/(\d+(?:\.\d+)?)\s*kw/i) || 
                           material?.descripcion?.match(/(\d+(?:\.\d+)?)\s*kw/i)
      const potencia = potenciaMatch ? parseFloat(potenciaMatch[1]) : 0
      
      // Buscar marca del inversor
      const marcaId = material?.marca_id
      const marca = marcaId ? marcasMap.get(marcaId) : undefined
      
      componentesPrincipales.inversor = {
        codigo: inversor.material_codigo,
        cantidad: inversor.cantidad,
        potencia: potencia,
        marca: marca
      }
    }
    
    // Buscar batería (sección BATERIAS)
    const itemsBaterias = itemsOrdenados.filter(item => item.seccion === 'BATERIAS')
    if (itemsBaterias.length > 0) {
      const bateria = itemsBaterias[0]
      const material = materials.find(m => m.codigo.toString() === bateria.material_codigo)
      
      // Extraer capacidad del nombre/descripción (buscar patrón como "10kWh" o "10 kWh")
      const capacidadMatch = material?.nombre?.match(/(\d+(?:\.\d+)?)\s*kwh/i) || 
                            material?.descripcion?.match(/(\d+(?:\.\d+)?)\s*kwh/i)
      const capacidad = capacidadMatch ? parseFloat(capacidadMatch[1]) : 0
      
      componentesPrincipales.bateria = {
        codigo: bateria.material_codigo,
        cantidad: bateria.cantidad,
        capacidad: capacidad
      }
    }
    
    // Buscar paneles (sección PANELES)
    const itemsPaneles = itemsOrdenados.filter(item => item.seccion === 'PANELES')
    if (itemsPaneles.length > 0) {
      const panel = itemsPaneles[0]
      const material = materials.find(m => m.codigo.toString() === panel.material_codigo)
      
      // Extraer potencia del nombre/descripción (buscar patrón como "590W" o "590 W")
      const potenciaMatch = material?.nombre?.match(/(\d+(?:\.\d+)?)\s*w(?!h)/i) || 
                           material?.descripcion?.match(/(\d+(?:\.\d+)?)\s*w(?!h)/i)
      const potencia = potenciaMatch ? parseFloat(potenciaMatch[1]) : 0
      
      componentesPrincipales.panel = {
        codigo: panel.material_codigo,
        cantidad: panel.cantidad,
        potencia: potencia
      }
    }

    // EXPORTACIÓN COMPLETA
    const rowsCompleto: any[] = []
    itemsOrdenados.forEach((item) => {
      // Buscar el label de la sección (puede ser estándar o personalizada)
      let seccionLabel = seccionLabelMap.get(item.seccion) ?? item.seccion
      
      // Si no está en el mapa estándar, buscar en secciones personalizadas
      if (seccionLabel === item.seccion && seccionesPersonalizadasOferta.length > 0) {
        const seccionPersonalizada = seccionesPersonalizadasOferta.find((s: any) => s.id === item.seccion)
        if (seccionPersonalizada) {
          seccionLabel = seccionPersonalizada.label
        }
      }
      
      // Buscar el nombre del material
      const material = materialesMap.get(item.material_codigo?.toString())
      const nombreMaterial = material?.nombre || item.descripcion
      
      // Obtener margen asignado desde el item (viene de la BD)
      const margenAsignado = (item as any).margen_asignado || 0
      const costoItem = item.precio * item.cantidad
      
      // Calcular porcentaje desde el margen asignado
      const porcentajeMargen = costoItem > 0 && margenAsignado > 0
        ? (margenAsignado / costoItem) * 100
        : 0
      
      rowsCompleto.push({
        material_codigo: item.material_codigo,
        seccion: seccionLabel,
        tipo: "Material",
        descripcion: nombreMaterial,
        cantidad: item.cantidad,
        precio_unitario: item.precio.toFixed(2),
        porcentaje_margen: `${porcentajeMargen.toFixed(2)}%`,
        margen: margenAsignado.toFixed(2),
        total: (costoItem + margenAsignado).toFixed(2),
      })
    })

    if (oferta.costo_transportacion && oferta.costo_transportacion > 0) {
      rowsCompleto.push({
        material_codigo: "",
        seccion: "Logística",
        tipo: "Transportación",
        descripcion: "Costo de transportación",
        cantidad: 1,
        precio_unitario: oferta.costo_transportacion.toFixed(2),
        porcentaje_margen: "",
        margen: "",
        total: oferta.costo_transportacion.toFixed(2),
      })
    }

    rowsCompleto.push({
      material_codigo: "",
      seccion: "Totales",
      tipo: "TOTAL",
      descripcion: "Precio final",
      cantidad: "",
      precio_unitario: "",
      porcentaje_margen: "",
      margen: "",
      total: (oferta.precio_final || 0).toFixed(2),
    })

    // Datos de pago
    if (oferta.pago_transferencia || oferta.aplica_contribucion || (oferta.moneda_pago !== 'USD' && tasaCambioNumero > 0)) {
      if (oferta.pago_transferencia) {
        rowsCompleto.push({
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
        
        if (oferta.datos_cuenta) {
          rowsCompleto.push({
            material_codigo: "",
            seccion: "PAGO",
            tipo: "Datos",
            descripcion: "Datos de la cuenta",
            cantidad: "",
            precio_unitario: "",
            porcentaje_margen: "",
            margen: "",
            total: oferta.datos_cuenta,
          })
        }
      }

      if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
        const totalesCalc = calcularTotalesDetalle(oferta)
        rowsCompleto.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Info",
          descripcion: `✓ Aplicar ${oferta.porcentaje_contribucion}% de Contribución`,
          cantidad: "",
          precio_unitario: "",
          porcentaje_margen: "",
          margen: "",
          total: "",
        })
        
        rowsCompleto.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Monto",
          descripcion: "Contribución",
          cantidad: "",
          precio_unitario: "",
          porcentaje_margen: "",
          margen: "",
          total: totalesCalc.contribucion.toFixed(2),
        })
      }

      rowsCompleto.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "TOTAL",
        descripcion: "Precio Final",
        cantidad: "",
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: (oferta.precio_final || 0).toFixed(2),
      })

      const totalesCalc = calcularTotalesDetalle(oferta)
      if (Math.abs(totalesCalc.redondeo) > 0.01) {
        rowsCompleto.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Nota",
          descripcion: `(Redondeado desde ${totalesCalc.totalSinRedondeo.toFixed(2)} $)`,
          cantidad: "",
          precio_unitario: "",
          porcentaje_margen: "",
          margen: "",
          total: "",
        })
      }

      if (oferta.moneda_pago !== 'USD' && tasaCambioNumero > 0) {
        const simboloMoneda = oferta.moneda_pago === 'EUR' ? '€' : 'CUP'
        const nombreMoneda = oferta.moneda_pago === 'EUR' ? 'Euros (EUR)' : 'Pesos Cubanos (CUP)'
        
        rowsCompleto.push({
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
        
        const tasaTexto = oferta.moneda_pago === 'EUR' 
          ? `1 EUR = ${tasaCambioNumero} USD`
          : `1 USD = ${tasaCambioNumero} CUP`
        
        rowsCompleto.push({
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
        
        rowsCompleto.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Conversión",
          descripcion: `Precio en ${oferta.moneda_pago}`,
          cantidad: "",
          precio_unitario: "",
          porcentaje_margen: "",
          margen: "",
          total: `${montoConvertido.toFixed(2)} ${simboloMoneda}`,
        })
      }
    }

    const exportOptionsCompleto = {
      title: "Oferta - Exportación completa",
      subtitle: oferta.nombre_completo || oferta.nombre,
      columns: [
        { header: "Sección", key: "seccion", width: 18 },
        { header: "Tipo", key: "tipo", width: 12 },
        { header: "Descripción", key: "descripcion", width: 45 },
        { header: "Cant", key: "cantidad", width: 8 },
        { header: "P.Unit ($)", key: "precio_unitario", width: 12 },
        { header: "% Margen", key: "porcentaje_margen", width: 8 },
        { header: "Margen ($)", key: "margen", width: 14 },
        { header: "Total ($)", key: "total", width: 14 },
      ],
      data: rowsCompleto,
      logoUrl: '/logo Suncar.png',
      clienteData: oferta.tipo === 'personalizada' && cliente ? {
        numero: cliente.numero || cliente.id,
        nombre: cliente.nombre,
        carnet_identidad: cliente.carnet_identidad,
        telefono: cliente.telefono,
        provincia_montaje: cliente.provincia_montaje,
        direccion: cliente.direccion,
        atencion_de: cliente.nombre,
      } : undefined,
      leadData: oferta.tipo === 'personalizada' && lead ? {
        id: lead.id,
        nombre: lead.nombre_completo || lead.nombre,
        telefono: lead.telefono,
        email: lead.email,
        provincia: lead.provincia,
        direccion: lead.direccion,
        atencion_de: lead.nombre_completo || lead.nombre,
      } : undefined,
      leadSinAgregarData: oferta.tipo === 'personalizada' && oferta.nombre_lead_sin_agregar ? {
        nombre: oferta.nombre_lead_sin_agregar,
        atencion_de: oferta.nombre_lead_sin_agregar,
      } : undefined,
      ofertaData: {
        numero_oferta: oferta.numero_oferta || oferta.id,
        nombre_oferta: oferta.nombre_completo || oferta.nombre,
        tipo_oferta: oferta.tipo === 'generica' ? 'Genérica' : 'Personalizada',
      },
      incluirFotos: true,
      fotosMap,
      componentesPrincipales,
    }

    // EXPORTACIÓN SIN PRECIOS
    const rowsSinPrecios: any[] = []
    itemsOrdenados.forEach((item) => {
      // Buscar el label de la sección (puede ser estándar o personalizada)
      let seccionLabel = seccionLabelMap.get(item.seccion) ?? item.seccion
      
      // Si no está en el mapa estándar, buscar en secciones personalizadas
      if (seccionLabel === item.seccion && seccionesPersonalizadasOferta.length > 0) {
        const seccionPersonalizada = seccionesPersonalizadasOferta.find((s: any) => s.id === item.seccion)
        if (seccionPersonalizada) {
          seccionLabel = seccionPersonalizada.label
        }
      }
      
      // Buscar el nombre del material
      const material = materialesMap.get(item.material_codigo?.toString())
      const nombreMaterial = material?.nombre || item.descripcion
      
      rowsSinPrecios.push({
        material_codigo: item.material_codigo,
        seccion: seccionLabel,
        tipo: "Material",
        descripcion: nombreMaterial,
        cantidad: item.cantidad,
      })
    })

    if (oferta.costo_transportacion && oferta.costo_transportacion > 0) {
      rowsSinPrecios.push({
        material_codigo: "",
        seccion: "Logística",
        tipo: "Transportación",
        descripcion: "Costo de transportación",
        cantidad: 1,
      })
    }

    rowsSinPrecios.push({
      material_codigo: "",
      seccion: "Totales",
      tipo: "TOTAL",
      descripcion: "Precio Total",
      cantidad: "",
      total: (oferta.precio_final || 0).toFixed(2),
    })

    // Datos de pago para sin precios
    if (oferta.pago_transferencia || oferta.aplica_contribucion || (oferta.moneda_pago !== 'USD' && tasaCambioNumero > 0)) {
      if (oferta.pago_transferencia) {
        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Info",
          descripcion: "✓ Pago por transferencia",
          cantidad: "",
        })
        
        if (oferta.datos_cuenta) {
          rowsSinPrecios.push({
            material_codigo: "",
            seccion: "PAGO",
            tipo: "Datos",
            descripcion: "Datos de la cuenta",
            cantidad: "",
            total: oferta.datos_cuenta,
          })
        }
      }

      if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Info",
          descripcion: `✓ Aplicar ${oferta.porcentaje_contribucion}% de Contribución`,
          cantidad: "",
        })
      }

      rowsSinPrecios.push({
        material_codigo: "",
        seccion: "PAGO",
        tipo: "TOTAL",
        descripcion: "Precio Final",
        cantidad: "",
        total: (oferta.precio_final || 0).toFixed(2),
      })

      const totalesCalc = calcularTotalesDetalle(oferta)
      if (Math.abs(totalesCalc.redondeo) > 0.01) {
        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Nota",
          descripcion: `(Redondeado desde ${totalesCalc.totalSinRedondeo.toFixed(2)} $)`,
          cantidad: "",
        })
      }

      if (oferta.moneda_pago !== 'USD' && tasaCambioNumero > 0) {
        const simboloMoneda = oferta.moneda_pago === 'EUR' ? '€' : 'CUP'
        const nombreMoneda = oferta.moneda_pago === 'EUR' ? 'Euros (EUR)' : 'Pesos Cubanos (CUP)'
        
        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Info",
          descripcion: `Moneda de pago: ${nombreMoneda}`,
          cantidad: "",
        })
        
        const tasaTexto = oferta.moneda_pago === 'EUR' 
          ? `Tasa de cambio: 1 EUR = ${tasaCambioNumero} USD`
          : `Tasa de cambio: 1 USD = ${tasaCambioNumero} CUP`
        
        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Tasa",
          descripcion: tasaTexto,
          cantidad: "",
        })
        
        rowsSinPrecios.push({
          material_codigo: "",
          seccion: "PAGO",
          tipo: "Conversión",
          descripcion: `Precio en ${oferta.moneda_pago}`,
          cantidad: "",
          total: `${montoConvertido.toFixed(2)} ${simboloMoneda}`,
        })
      }
    }

    const exportOptionsSinPrecios = {
      title: "Oferta - Cliente sin precios",
      subtitle: oferta.nombre_completo || oferta.nombre,
      columns: [
        { header: "Material", key: "descripcion", width: 60 },
        { header: "Cant", key: "cantidad", width: 10 },
      ],
      data: rowsSinPrecios,
      logoUrl: '/logo Suncar.png',
      clienteData: oferta.tipo === 'personalizada' && cliente ? {
        numero: cliente.numero || cliente.id,
        nombre: cliente.nombre,
        carnet_identidad: cliente.carnet_identidad,
        telefono: cliente.telefono,
        provincia_montaje: cliente.provincia_montaje,
        direccion: cliente.direccion,
        atencion_de: cliente.nombre,
      } : undefined,
      leadData: oferta.tipo === 'personalizada' && lead ? {
        id: lead.id,
        nombre: lead.nombre_completo || lead.nombre,
        telefono: lead.telefono,
        email: lead.email,
        provincia: lead.provincia,
        direccion: lead.direccion,
        atencion_de: lead.nombre_completo || lead.nombre,
      } : undefined,
      leadSinAgregarData: oferta.tipo === 'personalizada' && oferta.nombre_lead_sin_agregar ? {
        nombre: oferta.nombre_lead_sin_agregar,
        atencion_de: oferta.nombre_lead_sin_agregar,
      } : undefined,
      ofertaData: {
        numero_oferta: oferta.numero_oferta || oferta.id,
        nombre_oferta: oferta.nombre_completo || oferta.nombre,
        tipo_oferta: oferta.tipo === 'generica' ? 'Genérica' : 'Personalizada',
      },
      incluirFotos: true,
      fotosMap,
      sinPrecios: true,
      componentesPrincipales,
    }

    // EXPORTACIÓN CLIENTE CON PRECIOS
    const rowsClienteConPrecios: any[] = []
    itemsOrdenados.forEach((item) => {
      // Buscar el label de la sección (puede ser estándar o personalizada)
      let seccionLabel = seccionLabelMap.get(item.seccion) ?? item.seccion
      
      // Si no está en el mapa estándar, buscar en secciones personalizadas
      if (seccionLabel === item.seccion && seccionesPersonalizadasOferta.length > 0) {
        const seccionPersonalizada = seccionesPersonalizadasOferta.find((s: any) => s.id === item.seccion)
        if (seccionPersonalizada) {
          seccionLabel = seccionPersonalizada.label
        }
      }
      
      // Calcular el total con margen incluido
      const margenAsignado = (item as any).margen_asignado || 0
      const costoItem = item.precio * item.cantidad
      const totalConMargen = costoItem + margenAsignado
      
      // Buscar el nombre del material
      const material = materialesMap.get(item.material_codigo?.toString())
      const nombreMaterial = material?.nombre || item.descripcion
      
      rowsClienteConPrecios.push({
        material_codigo: item.material_codigo,
        seccion: seccionLabel,
        tipo: "Material",
        descripcion: nombreMaterial,
        cantidad: item.cantidad,
        total: totalConMargen.toFixed(2),
      })
    })

    if (oferta.costo_transportacion && oferta.costo_transportacion > 0) {
      rowsClienteConPrecios.push({
        material_codigo: "",
        seccion: "Logística",
        tipo: "Transportación",
        descripcion: "Costo de transportación",
        cantidad: 1,
        total: oferta.costo_transportacion.toFixed(2),
      })
    }

    rowsClienteConPrecios.push({
      material_codigo: "",
      seccion: "Totales",
      tipo: "TOTAL",
      descripcion: "PRECIO TOTAL",
      cantidad: "",
      total: (oferta.precio_final || 0).toFixed(2),
    })

    // Datos de pago para cliente con precios
    if (oferta.pago_transferencia || oferta.aplica_contribucion || (oferta.moneda_pago !== 'USD' && tasaCambioNumero > 0)) {
      if (oferta.pago_transferencia) {
        rowsClienteConPrecios.push({
          descripcion: "✓ Pago por transferencia",
          cantidad: "",
          seccion: "PAGO",
          tipo: "Info",
        })
        
        if (oferta.datos_cuenta) {
          rowsClienteConPrecios.push({
            descripcion: "Datos de la cuenta",
            cantidad: "",
            total: oferta.datos_cuenta,
            seccion: "PAGO",
            tipo: "Datos",
          })
        }
      }

      if (oferta.aplica_contribucion && oferta.porcentaje_contribucion) {
        const totalesCalc = calcularTotalesDetalle(oferta)
        
        rowsClienteConPrecios.push({
          descripcion: `✓ Aplicar ${oferta.porcentaje_contribucion}% de Contribución`,
          cantidad: "",
          seccion: "PAGO",
          tipo: "Info",
        })
        
        rowsClienteConPrecios.push({
          descripcion: "Contribución",
          cantidad: "",
          total: totalesCalc.contribucion.toFixed(2),
          seccion: "PAGO",
          tipo: "Monto",
        })
      }

      rowsClienteConPrecios.push({
        descripcion: "Precio Final",
        cantidad: "",
        total: (oferta.precio_final || 0).toFixed(2),
        seccion: "PAGO",
        tipo: "TOTAL",
      })

      const totalesCalc = calcularTotalesDetalle(oferta)
      if (Math.abs(totalesCalc.redondeo) > 0.01) {
        rowsClienteConPrecios.push({
          descripcion: `(Redondeado desde ${totalesCalc.totalSinRedondeo.toFixed(2)} $)`,
          cantidad: "",
          seccion: "PAGO",
          tipo: "Nota",
        })
      }

      if (oferta.moneda_pago !== 'USD' && tasaCambioNumero > 0) {
        const simboloMoneda = oferta.moneda_pago === 'EUR' ? '€' : 'CUP'
        const nombreMoneda = oferta.moneda_pago === 'EUR' ? 'Euros (EUR)' : 'Pesos Cubanos (CUP)'
        
        rowsClienteConPrecios.push({
          descripcion: `Moneda de pago: ${nombreMoneda}`,
          cantidad: "",
          seccion: "PAGO",
          tipo: "Info",
        })
        
        const tasaTexto = oferta.moneda_pago === 'EUR' 
          ? `Tasa de cambio: 1 EUR = ${tasaCambioNumero} USD`
          : `Tasa de cambio: 1 USD = ${tasaCambioNumero} CUP`
        
        rowsClienteConPrecios.push({
          descripcion: tasaTexto,
          cantidad: "",
          seccion: "PAGO",
          tipo: "Tasa",
        })
        
        rowsClienteConPrecios.push({
          descripcion: `Precio en ${oferta.moneda_pago}`,
          cantidad: "",
          total: `${montoConvertido.toFixed(2)} ${simboloMoneda}`,
          seccion: "PAGO",
          tipo: "Conversión",
        })
      }
    }

    const exportOptionsClienteConPrecios = {
      title: "Oferta - Cliente con precios",
      subtitle: oferta.nombre_completo || oferta.nombre,
      columns: [
        { header: "Material", key: "descripcion", width: 50 },
        { header: "Cant", key: "cantidad", width: 10 },
        { header: "Total ($)", key: "total", width: 15 },
      ],
      data: rowsClienteConPrecios,
      logoUrl: '/logo Suncar.png',
      clienteData: oferta.tipo === 'personalizada' && cliente ? {
        numero: cliente.numero || cliente.id,
        nombre: cliente.nombre,
        carnet_identidad: cliente.carnet_identidad,
        telefono: cliente.telefono,
        provincia_montaje: cliente.provincia_montaje,
        direccion: cliente.direccion,
        atencion_de: cliente.nombre,
      } : undefined,
      leadData: oferta.tipo === 'personalizada' && lead ? {
        id: lead.id,
        nombre: lead.nombre_completo || lead.nombre,
        telefono: lead.telefono,
        email: lead.email,
        provincia: lead.provincia,
        direccion: lead.direccion,
        atencion_de: lead.nombre_completo || lead.nombre,
      } : undefined,
      leadSinAgregarData: oferta.tipo === 'personalizada' && oferta.nombre_lead_sin_agregar ? {
        nombre: oferta.nombre_lead_sin_agregar,
        atencion_de: oferta.nombre_lead_sin_agregar,
      } : undefined,
      ofertaData: {
        numero_oferta: oferta.numero_oferta || oferta.id,
        nombre_oferta: oferta.nombre_completo || oferta.nombre,
        tipo_oferta: oferta.tipo === 'generica' ? 'Genérica' : 'Personalizada',
      },
      incluirFotos: true,
      fotosMap,
      conPreciosCliente: true,
      componentesPrincipales,
    }

    return {
      exportOptionsCompleto,
      exportOptionsSinPrecios,
      exportOptionsClienteConPrecios,
      baseFilename,
    }
  }

  const abrirDialogoExportar = (oferta: (typeof ofertas)[number]) => {
    setOfertaParaExportar(oferta)
    setMostrarDialogoExportar(true)
  }

  const abrirEditar = (oferta: (typeof ofertas)[number]) => {
    setOfertaParaEditar(oferta)
    setMostrarDialogoEditar(true)
  }

  const irADuplicar = (oferta: (typeof ofertas)[number]) => {
    router.push(`/ofertas-gestion/duplicar?id=${oferta.id}`)
  }

  const abrirDialogoEliminar = (oferta: (typeof ofertas)[number]) => {
    setOfertaParaEliminar(oferta)
    setMostrarDialogoEliminar(true)
  }

  const confirmarEliminar = async () => {
    if (!ofertaParaEliminar) return

    setEliminandoOferta(true)
    try {
      await eliminarOferta(ofertaParaEliminar.id)
      setMostrarDialogoEliminar(false)
      setOfertaParaEliminar(null)
    } catch (error) {
      // El error ya se maneja en el hook
    } finally {
      setEliminandoOferta(false)
    }
  }

  const cancelarEliminar = () => {
    setMostrarDialogoEliminar(false)
    setOfertaParaEliminar(null)
  }

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
              <div className="relative h-48 bg-gradient-to-br from-slate-50 via-orange-50 to-yellow-100 overflow-hidden">
                {oferta.foto_portada ? (
                  <img
                    src={oferta.foto_portada}
                    alt={oferta.nombre}
                    className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
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
                  {oferta.nombre_lead_sin_agregar && (
                    <Badge className="bg-amber-500 text-white border-amber-600 shadow-md">
                      <span className="mr-1">⚠️</span>
                      Lead pendiente
                    </Badge>
                  )}
                </div>
              </div>

              <div className="p-4 flex flex-col h-[180px]">
                {/* Título - altura fija */}
                <h3 className="font-semibold text-base text-slate-900 line-clamp-2 h-[48px] mb-3">
                  {oferta.nombre}
                </h3>

                {/* Sección de contacto - flex-1 para ocupar espacio disponible */}
                <div className="flex-1 space-y-1.5 min-h-0">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-slate-600" />
                    </div>
                    <span className="truncate">
                      {oferta.tipo === "personalizada"
                        ? (oferta.nombre_lead_sin_agregar ||
                            (oferta.lead_id && leadPorId.get(oferta.lead_id)?.nombre_completo) ||
                            (oferta.lead_id && leadPorId.get(oferta.lead_id)?.nombre) ||
                            oferta.lead_nombre ||
                            oferta.cliente_nombre ||
                            clienteNombrePorOferta.get(oferta.cliente_id || "") ||
                            clienteNombrePorOferta.get(oferta.cliente_numero || "") ||
                            "Contacto no asignado")
                        : "Oferta Genérica"}
                    </span>
                  </div>
                </div>

                {/* Botones - siempre en la misma posición */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2 mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 flex-1" onClick={() => abrirDialogoExportar(oferta)} title="Exportar oferta">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => irADuplicar(oferta)}
                    title="Duplicar oferta"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 flex-1" onClick={() => abrirEditar(oferta)}
                    title="Editar oferta"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => abrirDialogoEliminar(oferta)}
                    title="Eliminar oferta"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 flex-1"
                    onClick={() => abrirDetalle(oferta)} title="Ver detalle">
                    <FileText className="h-3.5 w-3.5" />
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
                        <div className="relative h-52 bg-gradient-to-br from-slate-50 via-orange-50 to-yellow-100 overflow-hidden">
                          {ofertaSeleccionada.foto_portada ? (
                            <img
                              src={ofertaSeleccionada.foto_portada}
                              alt={ofertaSeleccionada.nombre}
                              className="w-full h-full object-contain"
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
                          <div className="text-sm text-slate-500">Información del contacto</div>
                          {(() => {
                            // Prioridad: lead sin agregar > lead > cliente
                            if (ofertaSeleccionada.nombre_lead_sin_agregar) {
                              return (
                                <div className="space-y-3">
                                  <div className="space-y-2 text-sm text-slate-700">
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-500">Tipo</span>
                                      <span className="font-semibold text-slate-900">Lead (sin agregar)</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-500">Nombre</span>
                                      <span className="font-semibold text-slate-900">
                                        {ofertaSeleccionada.nombre_lead_sin_agregar}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Alerta de Lead Sin Agregar */}
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex items-start gap-2">
                                      <span className="text-amber-600 text-lg">⚠️</span>
                                      <div className="flex-1 text-xs text-amber-800">
                                        <p className="font-semibold mb-1">Lead pendiente de agregar</p>
                                        <p className="text-amber-700">
                                          Este contacto aún no está registrado en el sistema. 
                                          Considera agregarlo como lead o cliente para un mejor seguimiento.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            }
                            
                            if (ofertaSeleccionada.lead_id || ofertaSeleccionada.lead_nombre) {
                              const lead = leadPorId.get(ofertaSeleccionada.lead_id || "")
                              return (
                                <div className="space-y-2 text-sm text-slate-700">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Tipo</span>
                                    <span className="font-semibold text-slate-900">Lead</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Nombre</span>
                                    <span className="font-semibold text-slate-900">
                                      {lead?.nombre_completo || lead?.nombre || ofertaSeleccionada.lead_nombre || "--"}
                                    </span>
                                  </div>
                                  {(lead?.telefono || ofertaSeleccionada.lead_id) && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-500">{lead?.telefono ? "Teléfono" : "ID"}</span>
                                      <span className="font-semibold text-slate-900">
                                        {lead?.telefono || ofertaSeleccionada.lead_id}
                                      </span>
                                    </div>
                                  )}
                                  {lead?.email && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-500">Email</span>
                                      <span className="font-semibold text-slate-900">
                                        {lead.email}
                                      </span>
                                    </div>
                                  )}
                                  {lead?.provincia && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-500">Provincia</span>
                                      <span className="font-semibold text-slate-900">
                                        {lead.provincia}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )
                            }
                            
                            const cliente =
                              clientePorOferta.get(ofertaSeleccionada.cliente_id || "") ||
                              clientePorOferta.get(ofertaSeleccionada.cliente_numero || "")
                            if (!cliente) {
                              return (
                                <div className="text-sm text-slate-500">
                                  Contacto no asignado
                                </div>
                              )
                            }
                            return (
                              <div className="space-y-2 text-sm text-slate-700">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Tipo</span>
                                  <span className="font-semibold text-slate-900">Cliente</span>
                                </div>
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
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                  <div className="flex items-start gap-3 mb-3">
                                    <div className="h-10 w-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center flex-shrink-0">
                                      <FileText className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-slate-900">Contenido de texto</p>
                                      <p className="text-xs text-slate-500">Sección personalizada</p>
                                    </div>
                                  </div>
                                  <div className="bg-white rounded-lg border border-slate-200 p-3">
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                                      {seccion.contenido_escritura}
                                    </p>
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

      {/* Diálogo para exportar oferta */}
      {ofertaParaExportar && (
        <ExportSelectionDialog
          open={mostrarDialogoExportar}
          onOpenChange={setMostrarDialogoExportar}
          oferta={ofertaParaExportar}
          exportOptions={generarOpcionesExportacion(ofertaParaExportar)}
        />
      )}

      {/* Diálogo de Edición */}
      <EditarOfertaDialog
        open={mostrarDialogoEditar}
        onOpenChange={setMostrarDialogoEditar}
        oferta={ofertaParaEditar}
        onSuccess={() => {
          setMostrarDialogoEditar(false)
          setOfertaParaEditar(null)
          // Recargar ofertas después de editar
          refetch()
        }}
      />

      {/* Diálogo de Confirmación de Eliminación */}
      <Dialog open={mostrarDialogoEliminar} onOpenChange={setMostrarDialogoEliminar}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              ¿Eliminar oferta?
            </DialogTitle>
            <DialogDescription asChild>
              <div className="pt-4 space-y-3">
                <p className="text-slate-700">
                  Estás a punto de eliminar la oferta:
                </p>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="font-semibold text-slate-900">{ofertaParaEliminar?.nombre}</p>
                  <p className="text-sm text-slate-600 mt-1">
                    {ofertaParaEliminar?.numero_oferta || ofertaParaEliminar?.id}
                  </p>
                </div>
                <p className="text-slate-600 text-sm">
                  Esta acción no se puede deshacer. La oferta será eliminada y se limpiará 
                  la referencia en el cliente o lead asociado.
                </p>
                {ofertaParaEliminar?.estado === 'reservada' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <span className="font-semibold">⚠️ Advertencia:</span> Esta oferta tiene estado "Reservada". 
                      Verifica que no tenga materiales reservados antes de eliminar.
                    </p>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={cancelarEliminar}
              disabled={eliminandoOferta}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarEliminar}
              disabled={eliminandoOferta}
              className="bg-red-600 hover:bg-red-700"
            >
              {eliminandoOferta ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar oferta
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
