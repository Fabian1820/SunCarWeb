"use client"

import { useState, useMemo } from "react"
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
  exportOptions: {
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
  // Agrupar items por sección
  const itemsPorSeccion = useMemo(() => {
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

  // Obtener labels de secciones
  const seccionLabels = useMemo(() => {
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
    new Set(oferta.items?.map((item: any) => item.material_codigo?.toString()) || [])
  )
  const [seccionesExpandidas, setSeccionesExpandidas] = useState<Set<string>>(new Set())

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
      new Set(oferta.items?.map((item: any) => item.material_codigo?.toString()) || [])
    )
  }

  const deseleccionarTodo = () => {
    setSeccionesSeleccionadas(new Set())
    setMaterialesSeleccionados(new Set())
  }

  // Generar opciones de exportación filtradas
  const opcionesFiltradas = useMemo(() => {
    const filtrarItems = (items: any[]) => {
      return items.filter(item => {
        // Si es un item de material, verificar si está seleccionado
        if (item.material_codigo) {
          return materialesSeleccionados.has(item.material_codigo?.toString())
        }
        // Mantener items que no son materiales (totales, transportación, etc.)
        return true
      })
    }

    return {
      exportOptionsCompleto: {
        ...exportOptions.exportOptionsCompleto,
        data: filtrarItems(exportOptions.exportOptionsCompleto.data),
      },
      exportOptionsSinPrecios: {
        ...exportOptions.exportOptionsSinPrecios,
        data: filtrarItems(exportOptions.exportOptionsSinPrecios.data),
      },
      exportOptionsClienteConPrecios: {
        ...exportOptions.exportOptionsClienteConPrecios,
        data: filtrarItems(exportOptions.exportOptionsClienteConPrecios.data),
      },
    }
  }, [exportOptions, materialesSeleccionados])

  const totalMaterialesSeleccionados = materialesSeleccionados.size
  const totalMateriales = oferta.items?.length || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col">
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
                  baseFilename={exportOptions.baseFilename}
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
                  baseFilename={exportOptions.baseFilename}
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
                  baseFilename={exportOptions.baseFilename}
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
