"use client"

/**
 * ExportSelectionDialog - Versión con checkboxes expandibles
 * IMPORTANTE: Este componente SIEMPRE debe mostrar checkboxes al lado de cada categoría
 * con flechitas expandibles para ver los materiales. NO usar versión con select.
 * Versión: 2.0 - Expandible con checkboxes
 */

import { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Checkbox } from "@/components/shared/molecule/checkbox"
import { Separator } from "@/components/shared/molecule/separator"
import { ScrollArea } from "@/components/shared/molecule/scroll-area"
import { ExportButtons } from "@/components/shared/molecule/export-buttons"
import { ChevronDown, ChevronRight, FileSpreadsheet, FileText, Download } from "lucide-react"

interface ExportSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  oferta: any
  exportOptions?: {
    exportOptionsCompleto: any
    exportOptionsSinPrecios: any
    exportOptionsClienteConPrecios: any
    baseFilename: string
  }
}

export function ExportSelectionDialog({
  open,
  onOpenChange,
  oferta,
  exportOptions,
}: ExportSelectionDialogProps) {
  // Generar opciones de exportación si no se proporcionan
  const generarOpcionesExportacionSimple = (oferta: any) => {
    if (!oferta) return null

    const itemsOrdenados = oferta.items || []
    
    // Nombre base del archivo
    let baseFilename = (oferta.nombre || 'oferta')
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .trim()

    // Datos básicos de la oferta
    const ofertaData = {
      numero_oferta: oferta.numero_oferta || oferta.id,
      nombre_oferta: oferta.nombre_completo || oferta.nombre,
      tipo_oferta: oferta.tipo === 'generica' ? 'Genérica' : 'Personalizada',
    }

    // Datos del cliente/lead si es personalizada
    let clienteData = undefined
    let leadData = undefined
    
    if (oferta.tipo === 'personalizada') {
      if (oferta.cliente_nombre) {
        clienteData = {
          numero: oferta.cliente_numero || oferta.cliente_id,
          nombre: oferta.cliente_nombre,
          telefono: oferta.cliente_telefono,
          direccion: oferta.cliente_direccion,
          atencion_de: oferta.cliente_nombre,
        }
      } else if (oferta.lead_nombre) {
        leadData = {
          id: oferta.lead_id,
          nombre: oferta.lead_nombre,
          telefono: oferta.lead_telefono,
          direccion: oferta.lead_direccion,
          atencion_de: oferta.lead_nombre,
        }
      }
    }

    // EXPORTACIÓN COMPLETA
    const rowsCompleto: any[] = []
    itemsOrdenados.forEach((item: any) => {
      const margenAsignado = item.margen_asignado || 0
      const costoItem = item.precio * item.cantidad
      const porcentajeMargen = costoItem > 0 && margenAsignado > 0
        ? (margenAsignado / costoItem) * 100
        : 0
      
      rowsCompleto.push({
        material_codigo: item.material_codigo,
        seccion: item.seccion,
        tipo: "Material",
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio.toFixed(2),
        porcentaje_margen: `${porcentajeMargen.toFixed(2)}%`,
        margen: margenAsignado.toFixed(2),
        total: (costoItem + margenAsignado).toFixed(2),
      })
    })

    // Total de materiales
    const totalMateriales = itemsOrdenados.reduce((sum: number, item: any) => {
      const margenAsignado = item.margen_asignado || 0
      const costoItem = item.precio * item.cantidad
      return sum + costoItem + margenAsignado
    }, 0)

    rowsCompleto.push({
      material_codigo: "",
      seccion: "Totales",
      tipo: "Subtotal",
      descripcion: "Total de materiales",
      cantidad: "",
      precio_unitario: "",
      porcentaje_margen: "",
      margen: "",
      total: totalMateriales.toFixed(2),
    })

    // Servicio de instalación
    if (oferta.margen_instalacion && oferta.margen_instalacion > 0) {
      rowsCompleto.push({
        material_codigo: "",
        seccion: "Servicios",
        tipo: "Servicio",
        descripcion: "Costo de instalación y puesta en marcha",
        cantidad: 1,
        precio_unitario: oferta.margen_instalacion.toFixed(2),
        porcentaje_margen: "",
        margen: "",
        total: oferta.margen_instalacion.toFixed(2),
      })
    }

    // Transportación
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

    // Descuento
    if (oferta.descuento_porcentaje && oferta.descuento_porcentaje > 0) {
      const montoDescuento = oferta.monto_descuento || 0
      rowsCompleto.push({
        material_codigo: "",
        seccion: "Descuento",
        tipo: "Descuento",
        descripcion: `Descuento aplicado (${oferta.descuento_porcentaje}%)`,
        cantidad: 1,
        precio_unitario: "",
        porcentaje_margen: "",
        margen: "",
        total: `- ${montoDescuento.toFixed(2)}`,
      })
    }

    // Total final
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
      clienteData,
      leadData,
      ofertaData,
      incluirFotos: false,
    }

    // EXPORTACIÓN SIN PRECIOS (simplificada)
    const rowsSinPrecios: any[] = itemsOrdenados.map((item: any) => ({
      material_codigo: item.material_codigo,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
    }))

    const exportOptionsSinPrecios = {
      title: "Oferta - Cliente sin precios",
      subtitle: oferta.nombre_completo || oferta.nombre,
      columns: [
        { header: "Material", key: "descripcion", width: 60 },
        { header: "Cant", key: "cantidad", width: 10 },
      ],
      data: rowsSinPrecios,
      logoUrl: '/logo Suncar.png',
      clienteData,
      leadData,
      ofertaData,
      incluirFotos: false,
    }

    // EXPORTACIÓN CLIENTE CON PRECIOS (simplificada)
    const rowsClienteConPrecios: any[] = itemsOrdenados.map((item: any) => {
      const margenAsignado = item.margen_asignado || 0
      const costoItem = item.precio * item.cantidad
      return {
        material_codigo: item.material_codigo,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio.toFixed(2),
        total: (costoItem + margenAsignado).toFixed(2),
      }
    })

    const exportOptionsClienteConPrecios = {
      title: "Oferta - Cliente con precios",
      subtitle: oferta.nombre_completo || oferta.nombre,
      columns: [
        { header: "Material", key: "descripcion", width: 45 },
        { header: "Cant", key: "cantidad", width: 10 },
        { header: "P.Unit ($)", key: "precio_unitario", width: 12 },
        { header: "Total ($)", key: "total", width: 14 },
      ],
      data: rowsClienteConPrecios,
      logoUrl: '/logo Suncar.png',
      clienteData,
      leadData,
      ofertaData,
      incluirFotos: false,
    }

    return {
      exportOptionsCompleto,
      exportOptionsSinPrecios,
      exportOptionsClienteConPrecios,
      baseFilename,
    }
  }

  // Usar exportOptions proporcionado o generar uno simple
  const opcionesExportacion = exportOptions || generarOpcionesExportacionSimple(oferta)

  // Agrupar items por sección
  const itemsPorSeccion = useMemo(() => {
    if (!oferta) return new Map<string, any[]>()
    const grupos = new Map<string, any[]>()
    
    oferta.items?.forEach((item: any) => {
      const seccion = item.seccion || "SIN_CATEGORIA"
      if (!grupos.has(seccion)) {
        grupos.set(seccion, [])
      }
      grupos.get(seccion)!.push(item)
    })
    
    return grupos
  }, [oferta])

  // Crear secciones especiales (secciones personalizadas y servicio de instalación)
  const seccionesEspeciales = useMemo(() => {
    if (!oferta) return []
    const secciones: Array<{ id: string; label: string; tipo: 'personalizada' | 'servicio' }> = []
    
    // Agregar secciones personalizadas
    oferta.secciones_personalizadas?.forEach((s: any) => {
      secciones.push({
        id: s.id,
        label: s.label,
        tipo: 'personalizada'
      })
    })
    
    // Agregar servicio de instalación si existe
    if (oferta.margen_instalacion && oferta.margen_instalacion > 0) {
      secciones.push({
        id: 'SERVICIO_INSTALACION',
        label: 'Servicio de Instalación',
        tipo: 'servicio'
      })
    }
    
    return secciones
  }, [oferta])

  // Obtener labels de secciones
  const seccionLabels = useMemo(() => {
    if (!oferta) return new Map<string, string>()
    const labels = new Map<string, string>()
    const seccionesEstandar = [
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
    
    seccionesEstandar.forEach(s => labels.set(s.id, s.label))
    
    // Agregar secciones personalizadas
    oferta.secciones_personalizadas?.forEach((s: any) => {
      labels.set(s.id, s.label)
    })
    
    return labels
  }, [oferta])

  // Estado de selección
  const [seccionesSeleccionadas, setSeccionesSeleccionadas] = useState<Set<string>>(
    new Set(Array.from(itemsPorSeccion.keys()))
  )
  const [materialesSeleccionados, setMaterialesSeleccionados] = useState<Set<string>>(
    new Set(oferta?.items?.map((item: any) => item.material_codigo?.toString()) || [])
  )
  const [seccionesEspecialesSeleccionadas, setSeccionesEspecialesSeleccionadas] = useState<Set<string>>(
    new Set(seccionesEspeciales.map(s => s.id))
  )
  const [seccionesExpandidas, setSeccionesExpandidas] = useState<Set<string>>(new Set())

  // Actualizar selección cuando cambie la oferta
  useEffect(() => {
    if (!oferta) return
    
    console.log('🔄 Actualizando selección por cambio de oferta:', {
      items_count: oferta.items?.length || 0,
      secciones_count: itemsPorSeccion.size,
      secciones_especiales_count: seccionesEspeciales.length
    })
    
    setSeccionesSeleccionadas(new Set(Array.from(itemsPorSeccion.keys())))
    setMaterialesSeleccionados(new Set(oferta.items?.map((item: any) => item.material_codigo?.toString()) || []))
    setSeccionesEspecialesSeleccionadas(new Set(seccionesEspeciales.map(s => s.id)))
  }, [oferta?.id, itemsPorSeccion, seccionesEspeciales, oferta?.items])

  // Toggle sección
  const toggleSeccion = (seccionId: string) => {
    const nuevasSeleccionadas = new Set(seccionesSeleccionadas)
    const items = itemsPorSeccion.get(seccionId) || []
    
    if (nuevasSeleccionadas.has(seccionId)) {
      nuevasSeleccionadas.delete(seccionId)
      // Deseleccionar todos los materiales de esta sección
      const nuevosMateriales = new Set(materialesSeleccionados)
      items.forEach(item => nuevosMateriales.delete(item.material_codigo?.toString()))
      setMaterialesSeleccionados(nuevosMateriales)
    } else {
      nuevasSeleccionadas.add(seccionId)
      // Seleccionar todos los materiales de esta sección
      const nuevosMateriales = new Set(materialesSeleccionados)
      items.forEach(item => nuevosMateriales.add(item.material_codigo?.toString()))
      setMaterialesSeleccionados(nuevosMateriales)
    }
    
    setSeccionesSeleccionadas(nuevasSeleccionadas)
  }

  // Toggle material
  const toggleMaterial = (materialCodigo: string, seccionId: string) => {
    const nuevosMateriales = new Set(materialesSeleccionados)
    
    if (nuevosMateriales.has(materialCodigo)) {
      nuevosMateriales.delete(materialCodigo)
    } else {
      nuevosMateriales.add(materialCodigo)
    }
    
    setMaterialesSeleccionados(nuevosMateriales)
    
    // Actualizar estado de la sección
    const items = itemsPorSeccion.get(seccionId) || []
    const todosSeleccionados = items.every(item => 
      nuevosMateriales.has(item.material_codigo?.toString())
    )
    
    const nuevasSeleccionadas = new Set(seccionesSeleccionadas)
    if (todosSeleccionados) {
      nuevasSeleccionadas.add(seccionId)
    } else {
      nuevasSeleccionadas.delete(seccionId)
    }
    setSeccionesSeleccionadas(nuevasSeleccionadas)
  }

  // Toggle expandir sección
  const toggleExpandir = (seccionId: string) => {
    const nuevasExpandidas = new Set(seccionesExpandidas)
    if (nuevasExpandidas.has(seccionId)) {
      nuevasExpandidas.delete(seccionId)
    } else {
      nuevasExpandidas.add(seccionId)
    }
    setSeccionesExpandidas(nuevasExpandidas)
  }

  // Seleccionar/Deseleccionar todo
  const seleccionarTodo = () => {
    setSeccionesSeleccionadas(new Set(Array.from(itemsPorSeccion.keys())))
    setMaterialesSeleccionados(
      new Set(oferta?.items?.map((item: any) => item.material_codigo?.toString()) || [])
    )
    setSeccionesEspecialesSeleccionadas(new Set(seccionesEspeciales.map(s => s.id)))
  }

  const deseleccionarTodo = () => {
    setSeccionesSeleccionadas(new Set())
    setMaterialesSeleccionados(new Set())
    setSeccionesEspecialesSeleccionadas(new Set())
  }

  // Generar opciones de exportación filtradas
  const opcionesFiltradas = useMemo(() => {
    if (!opcionesExportacion) return null
    
    const filtrarItems = (items: any[]) => {
      console.log('🔍 Filtrando items:', {
        total_items: items.length,
        materiales_seleccionados: materialesSeleccionados.size,
        secciones_especiales_seleccionadas: seccionesEspecialesSeleccionadas.size
      })
      
      const itemsFiltrados = items.filter(item => {
        // Si es un item de material, verificar si está seleccionado
        if (item.material_codigo) {
          const seleccionado = materialesSeleccionados.has(item.material_codigo?.toString())
          if (!seleccionado) {
            console.log('❌ Material NO seleccionado:', item.material_codigo, item.descripcion)
          }
          return seleccionado
        }
        
        // Si es servicio de instalación, verificar si está seleccionado
        if (item.tipo === "Servicio" || item.descripcion?.includes("Servicio de instalación") || item.descripcion?.includes("instalación y puesta en marcha")) {
          return seccionesEspecialesSeleccionadas.has('SERVICIO_INSTALACION')
        }
        
        // Si es subtotal de materiales, siempre mantenerlo
        if (item.tipo === "Subtotal" && item.descripcion?.includes("Total de materiales")) {
          return true
        }
        
        // Si es contribución, siempre mantenerla
        if (item.tipo === "Contribucion") {
          return true
        }
        
        // Si es una sección personalizada, verificar si está seleccionada
        const seccionPersonalizada = oferta?.secciones_personalizadas?.find((s: any) => 
          item.seccion === s.label || item.descripcion?.includes(s.label)
        )
        if (seccionPersonalizada) {
          return seccionesEspecialesSeleccionadas.has(seccionPersonalizada.id)
        }
        
        // Mantener items que no son materiales ni secciones especiales (totales, transportación, descuento, etc.)
        console.log('✅ Manteniendo item no-material:', item.tipo, item.descripcion)
        return true
      })
      
      console.log('✅ Items después de filtrar:', itemsFiltrados.length)
      return itemsFiltrados
    }

    console.log('🔍 DEBUG opcionesExportacion:', {
      sinPrecios_original: opcionesExportacion.exportOptionsSinPrecios?.sinPrecios,
      conPreciosCliente_original: opcionesExportacion.exportOptionsClienteConPrecios?.conPreciosCliente,
      columns_sinPrecios: opcionesExportacion.exportOptionsSinPrecios?.columns,
      columns_conPrecios: opcionesExportacion.exportOptionsClienteConPrecios?.columns,
    })
    
    return {
      exportOptionsCompleto: {
        ...opcionesExportacion.exportOptionsCompleto,
        data: filtrarItems(opcionesExportacion.exportOptionsCompleto?.data || []),
      },
      exportOptionsSinPrecios: {
        ...opcionesExportacion.exportOptionsSinPrecios,
        data: filtrarItems(opcionesExportacion.exportOptionsSinPrecios?.data || []),
      },
      exportOptionsClienteConPrecios: {
        ...opcionesExportacion.exportOptionsClienteConPrecios,
        data: filtrarItems(opcionesExportacion.exportOptionsClienteConPrecios?.data || []),
      },
    }
  }, [opcionesExportacion, materialesSeleccionados, seccionesEspecialesSeleccionadas, oferta])

  // Debug: verificar que los términos se están pasando
  console.log('🔍 ExportSelectionDialog - Términos en exportOptions:', {
    completo: opcionesExportacion?.exportOptionsCompleto?.terminosCondiciones ? 'SÍ' : 'NO',
    sinPrecios: opcionesExportacion?.exportOptionsSinPrecios?.terminosCondiciones ? 'SÍ' : 'NO',
    clienteConPrecios: opcionesExportacion?.exportOptionsClienteConPrecios?.terminosCondiciones ? 'SÍ' : 'NO',
  })

  const totalMaterialesSeleccionados = materialesSeleccionados.size
  const totalMateriales = oferta?.items?.length || 0
  const totalSeccionesEspecialesSeleccionadas = seccionesEspecialesSeleccionadas.size
  const totalSeccionesEspeciales = seccionesEspeciales.length

  // Si no hay oferta, mostrar mensaje de error
  if (!oferta) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              No se pudo cargar la información de la oferta.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col" data-version="expandable-v2">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Exportar Oferta</DialogTitle>
          <DialogDescription>
            Selecciona las categorías y materiales que deseas incluir en la exportación
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-4">
          {/* Controles de selección */}
          <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={seleccionarTodo}
                className="h-8"
              >
                Seleccionar todo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deseleccionarTodo}
                className="h-8"
              >
                Deseleccionar todo
              </Button>
            </div>
            <div className="text-sm font-medium text-slate-700">
              {totalMaterialesSeleccionados} de {totalMateriales} materiales seleccionados
              {totalSeccionesEspeciales > 0 && (
                <span className="ml-2 text-blue-600">
                  + {totalSeccionesEspecialesSeleccionadas} de {totalSeccionesEspeciales} secciones adicionales
                </span>
              )}
            </div>
          </div>

          {/* Lista de categorías y materiales */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-2">
              {Array.from(itemsPorSeccion.entries()).map(([seccionId, items]) => {
                const seccionLabel = seccionLabels.get(seccionId) || seccionId
                const isExpanded = seccionesExpandidas.has(seccionId)
                const isSelected = seccionesSeleccionadas.has(seccionId)
                const materialesEnSeccion = items.filter(item => 
                  materialesSeleccionados.has(item.material_codigo?.toString())
                ).length

                return (
                  <div key={seccionId} className="border border-slate-200 rounded-lg overflow-hidden">
                    {/* Header de sección */}
                    <div className="bg-white hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3 p-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSeccion(seccionId)}
                          className="mt-0.5"
                        />
                        <button
                          onClick={() => toggleExpandir(seccionId)}
                          className="flex-1 flex items-center gap-2 text-left"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-500" />
                          )}
                          <span className="font-semibold text-slate-900">{seccionLabel}</span>
                          <span className="text-sm text-slate-500">
                            ({materialesEnSeccion}/{items.length})
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Lista de materiales */}
                    {isExpanded && (
                      <div className="bg-slate-50 border-t border-slate-200">
                        <div className="p-3 space-y-2">
                          {items.map((item) => {
                            const materialCodigo = item.material_codigo?.toString()
                            const isChecked = materialesSeleccionados.has(materialCodigo)

                            return (
                              <div
                                key={materialCodigo}
                                className="flex items-start gap-3 p-2 bg-white rounded border border-slate-200 hover:border-slate-300 transition-colors"
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleMaterial(materialCodigo, seccionId)}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-slate-900 truncate">
                                    {item.descripcion}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                    <span>Código: {materialCodigo}</span>
                                    <span>•</span>
                                    <span>Cantidad: {item.cantidad}</span>
                                    <span>•</span>
                                    <span>Precio: ${item.precio.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Secciones especiales (personalizadas y servicio de instalación) */}
              {seccionesEspeciales.length > 0 && (
                <>
                  <div className="pt-4 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Secciones Adicionales
                      </span>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>
                  </div>

                  {seccionesEspeciales.map((seccion) => {
                    const isSelected = seccionesEspecialesSeleccionadas.has(seccion.id)
                    
                    // Obtener información específica según el tipo
                    let contenido = null
                    let icono = null
                    
                    if (seccion.tipo === 'servicio') {
                      const margenInstalacion = oferta.margen_instalacion || 0
                      icono = <span className="text-lg">🔧</span>
                      contenido = (
                        <div className="text-xs text-slate-600 mt-1">
                          <div>Precio: ${margenInstalacion.toFixed(2)}</div>
                          <div className="text-slate-500 mt-0.5">Costo de instalación y puesta en marcha</div>
                        </div>
                      )
                    } else if (seccion.tipo === 'personalizada') {
                      const seccionData = oferta.secciones_personalizadas?.find((s: any) => s.id === seccion.id)
                      icono = <span className="text-lg">📦</span>
                      if (seccionData?.elementos && seccionData.elementos.length > 0) {
                        contenido = (
                          <div className="text-xs text-slate-600 mt-1">
                            <div>{seccionData.elementos.length} elemento(s)</div>
                            <div className="text-slate-500 mt-0.5">
                              Total: ${seccionData.elementos.reduce((sum: number, el: any) => 
                                sum + (el.precio_unitario * el.cantidad), 0
                              ).toFixed(2)}
                            </div>
                          </div>
                        )
                      }
                    }

                    return (
                      <div key={seccion.id} className="border border-slate-200 rounded-lg overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="bg-white/80 hover:bg-white transition-colors">
                          <div className="flex items-start gap-3 p-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => {
                                const nuevas = new Set(seccionesEspecialesSeleccionadas)
                                if (nuevas.has(seccion.id)) {
                                  nuevas.delete(seccion.id)
                                } else {
                                  nuevas.add(seccion.id)
                                }
                                setSeccionesEspecialesSeleccionadas(nuevas)
                              }}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {icono}
                                <span className="font-semibold text-slate-900">{seccion.label}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                  {seccion.tipo === 'servicio' ? 'Servicio' : 'Personalizada'}
                                </span>
                              </div>
                              {contenido}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Botones de exportación */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-700">
              Selecciona el tipo de exportación:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Opción 1: Completo */}
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                      1
                    </div>
                    <h4 className="text-sm font-bold text-blue-900">Completo</h4>
                  </div>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Incluye todos los detalles: precios unitarios, márgenes, servicios y totales.
                  </p>
                </div>
                <ExportButtons
                  exportOptions={opcionesFiltradas.exportOptionsCompleto}
                  baseFilename={opcionesExportacion?.baseFilename || 'oferta'}
                  variant="compact"
                />
              </div>

              {/* Opción 2: Sin precios */}
              <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold">
                      2
                    </div>
                    <h4 className="text-sm font-bold text-green-900">Sin precios</h4>
                  </div>
                  <p className="text-xs text-green-700 leading-relaxed">
                    Solo materiales y cantidades. Ideal para presupuestos preliminares.
                  </p>
                </div>
                <ExportButtons
                  exportOptions={opcionesFiltradas.exportOptionsSinPrecios}
                  baseFilename={opcionesExportacion?.baseFilename || 'oferta'}
                  variant="compact"
                />
              </div>

              {/* Opción 3: Cliente con precios */}
              <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4 space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold">
                      3
                    </div>
                    <h4 className="text-sm font-bold text-purple-900">Cliente con precios</h4>
                  </div>
                  <p className="text-xs text-purple-700 leading-relaxed">
                    Materiales con precios finales. Perfecto para enviar al cliente.
                  </p>
                </div>
                <ExportButtons
                  exportOptions={opcionesFiltradas.exportOptionsClienteConPrecios}
                  baseFilename={opcionesExportacion?.baseFilename || 'oferta'}
                  variant="compact"
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
