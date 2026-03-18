"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { Input } from "@/components/shared/molecule/input"
import { Slider } from "@/components/shared/molecule/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Badge } from "@/components/shared/atom/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ConfirmDeleteDialog,
} from "@/components/shared/molecule/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shared/molecule/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/shared/molecule/command"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import {
  Calculator,
  Plus,
  X,
  Zap,
  RotateCcw,
  ArrowLeft,
  Battery,
  Cpu,
  Lightbulb,
  Minus,
  Search,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react"
import { CalculoEnergeticoService } from "@/lib/api-services"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { PageLoader } from "@/components/shared/atom/page-loader"
import type { CalculoEnergeticoCategoria } from "@/lib/types/calculo-energetico-types"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { Download } from "lucide-react"

const categoriaIconos: Record<string, string> = {
  "Electrodomésticos de Cocina": "🏠",
  "Equipos de Sala y Entretenimiento": "🛋️",
  "Climatización y Ventilación": "❄️",
  "Iluminación": "💡",
  "Dormitorio y Uso General": "🛏️",
  "Lavandería y Limpieza": "🧺",
  "Agua y Servicios": "💧",
  "Otros Equipos y Herramientas": "🔧",
}

const getEquipoKey = (categoriaId: string, equipoNombre: string) => `${categoriaId}::${equipoNombre}`

type EquipoWithMeta = {
  key: string
  categoriaId: string
  categoriaNombre: string
  nombre: string
  potencia_kw: number
  energia_kwh: number
}

interface CreateEquipoForm {
  nombre: string
  potencia_kw: string
  energia_kwh: string
  categoria: string
  categoriaPersonalizada: string
}

const createEmptyCreateForm = (): CreateEquipoForm => ({
  nombre: "",
  potencia_kw: "",
  energia_kwh: "",
  categoria: "",
  categoriaPersonalizada: "",
})

interface EditEquipoForm {
  nombre: string
  potencia_kw: string
  energia_kwh: string
}

const createEmptyEditForm = (): EditEquipoForm => ({
  nombre: "",
  potencia_kw: "",
  energia_kwh: "",
})

export default function CalculadoraPage() {
  const { toast } = useToast()

  const headerRef = useRef<HTMLElement | null>(null)
  const [headerHeight, setHeaderHeight] = useState<number>(120)

  const [categorias, setCategorias] = useState<CalculoEnergeticoCategoria[]>([])
  const [equiposCantidad, setEquiposCantidad] = useState<Map<string, number>>(new Map())
  const [showRecomendaciones, setShowRecomendaciones] = useState(false)
  const [bateriaKwh, setBateriaKwh] = useState([0])
  const [openBuscador, setOpenBuscador] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [cantidadBuscador, setCantidadBuscador] = useState<Map<string, number>>(new Map())
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateEquipoForm>(() => createEmptyCreateForm())
  const [createLoading, setCreateLoading] = useState(false)
  const [editingEquipo, setEditingEquipo] = useState<EquipoWithMeta | null>(null)
  const [editForm, setEditForm] = useState<EditEquipoForm>(() => createEmptyEditForm())
  const [editLoading, setEditLoading] = useState(false)
  const [equipoToDelete, setEquipoToDelete] = useState<EquipoWithMeta | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingCategorias, setLoadingCategorias] = useState(false)
  const [categoriasError, setCategoriasError] = useState<string | null>(null)
  const [exportingPDF, setExportingPDF] = useState(false)

  const fetchCategorias = useCallback(async () => {
    setLoadingCategorias(true)
    try {
      const data = await CalculoEnergeticoService.getCategorias()
      setCategorias(data)
      setCategoriasError(null)
    } catch (error) {
      console.error("[Calculadora] Error al cargar categorías:", error)
      setCategorias([])
      setCategoriasError(
        error instanceof Error ? error.message : "No se pudieron cargar los equipos. Intenta nuevamente."
      )
    } finally {
      setLoadingCategorias(false)
      setInitialLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategorias()
  }, [fetchCategorias])

  const equiposConMeta = useMemo<EquipoWithMeta[]>(() => {
    return categorias.flatMap((categoria) =>
      (categoria.equipos || []).map((equipo) => ({
        key: getEquipoKey(categoria.id, equipo.nombre),
        categoriaId: categoria.id,
        categoriaNombre: categoria.nombre,
        nombre: equipo.nombre,
        potencia_kw: equipo.potencia_kw,
        energia_kwh: equipo.energia_kwh,
      }))
    )
  }, [categorias])

  const equiposIndex = useMemo(() => {
    const map = new Map<string, EquipoWithMeta>()
    equiposConMeta.forEach((equipo) => map.set(equipo.key, equipo))
    return map
  }, [equiposConMeta])

  useEffect(() => {
    const validKeys = new Set(equiposConMeta.map((equipo) => equipo.key))
    const pruneMap = <T,>(source: Map<string, T>) => {
      let changed = false
      const next = new Map<string, T>()
      source.forEach((value, key) => {
        if (validKeys.has(key)) {
          next.set(key, value)
        } else {
          changed = true
        }
      })

      if (!changed && source.size === next.size) {
        let identical = true
        source.forEach((value, key) => {
          if (next.get(key) !== value) {
            identical = false
          }
        })
        if (identical) {
          return source
        }
      }
      return next
    }

    setEquiposCantidad((prev) => pruneMap(prev))
    setCantidadBuscador((prev) => pruneMap(prev))
  }, [equiposConMeta])

  const potenciaTotalKw = useMemo(() => {
    let total = 0
    equiposCantidad.forEach((cantidad, key) => {
      const equipo = equiposIndex.get(key)
      if (equipo) {
        total += equipo.potencia_kw * cantidad
      }
    })
    return total
  }, [equiposCantidad, equiposIndex])

  const consumoRealKwh = useMemo(() => {
    let total = 0
    equiposCantidad.forEach((cantidad, key) => {
      const equipo = equiposIndex.get(key)
      if (equipo) {
        total += equipo.energia_kwh * cantidad
      }
    })
    return total
  }, [equiposCantidad, equiposIndex])

  const inversorRecomendado = potenciaTotalKw * 1.25
  const bateriaRecomendada5h = consumoRealKwh * 5
  const duracionConBateria = consumoRealKwh > 0 ? bateriaKwh[0] / consumoRealKwh : 0
  const totalEquipos = equiposCantidad.size
  const categoriaOptions = useMemo(() => categorias.map((categoria) => categoria.nombre), [categorias])
  const noEquiposRegistrados = useMemo(
    () => categorias.every((categoria) => (categoria.equipos || []).length === 0),
    [categorias]
  )

  const restablecerParametros = () => {
    setEquiposCantidad(new Map())
    setCantidadBuscador(new Map())
  }

  const agregarEquipo = (equipoKey: string, cantidad = 1) => {
    if (!equiposIndex.has(equipoKey)) return

    setEquiposCantidad((prev) => {
      const next = new Map(prev)
      next.set(equipoKey, cantidad)
      return next
    })
  }

  const eliminarEquipo = (equipoKey: string) => {
    setEquiposCantidad((prev) => {
      const next = new Map(prev)
      next.delete(equipoKey)
      return next
    })
  }

  const incrementarCantidad = (equipoKey: string) => {
    setEquiposCantidad((prev) => {
      const next = new Map(prev)
      const actual = next.get(equipoKey) || 0
      next.set(equipoKey, actual + 1)
      return next
    })
  }

  const decrementarCantidad = (equipoKey: string) => {
    setEquiposCantidad((prev) => {
      const next = new Map(prev)
      const actual = next.get(equipoKey) || 0
      if (actual > 1) {
        next.set(equipoKey, actual - 1)
      } else {
        next.delete(equipoKey)
      }
      return next
    })
  }

  const agregarDesdeBuscador = (equipoKey: string) => {
    const cantidad = Math.max(1, cantidadBuscador.get(equipoKey) || 1)
    agregarEquipo(equipoKey, cantidad)
    setCantidadBuscador((prev) => {
      const next = new Map(prev)
      next.delete(equipoKey)
      return next
    })
    setOpenBuscador(false)
    setBusqueda("")
  }

  const actualizarCantidadBuscador = (equipoKey: string, cantidad: number) => {
    setCantidadBuscador((prev) => {
      const next = new Map(prev)
      if (cantidad > 0) {
        next.set(equipoKey, cantidad)
      } else {
        next.delete(equipoKey)
      }
      return next
    })
  }

  const handleOpenRecomendaciones = () => {
    setBateriaKwh([parseFloat(bateriaRecomendada5h.toFixed(2))])
    setShowRecomendaciones(true)
  }

  const handleCreateDialogChange = (open: boolean) => {
    setIsCreateDialogOpen(open)
    if (!open) {
      setCreateForm(createEmptyCreateForm())
    }
  }

  const handleCreateEquipo = async () => {
    const nombre = createForm.nombre.trim()
    const potencia = parseFloat(createForm.potencia_kw)
    const energia = parseFloat(createForm.energia_kwh)
    const categoriaSeleccionada =
      createForm.categoria === "otro" ? createForm.categoriaPersonalizada.trim() : createForm.categoria.trim()

    if (!nombre) {
      toast({ title: "Campos incompletos", description: "Ingresa el nombre del equipo.", variant: "destructive" })
      return
    }

    if (!categoriaSeleccionada) {
      toast({ title: "Campos incompletos", description: "Selecciona o ingresa una categoría.", variant: "destructive" })
      return
    }

    if (Number.isNaN(potencia) || potencia <= 0) {
      toast({
        title: "Dato inválido",
        description: "La potencia debe ser un número positivo en kW.",
        variant: "destructive",
      })
      return
    }

    if (Number.isNaN(energia) || energia <= 0) {
      toast({
        title: "Dato inválido",
        description: "La energía debe ser un número positivo en kWh.",
        variant: "destructive",
      })
      return
    }

    setCreateLoading(true)
    try {
      await CalculoEnergeticoService.createEquipo({
        nombre,
        potencia_kw: potencia,
        energia_kwh: energia,
        categoria: categoriaSeleccionada,
      })
      toast({ title: "Equipo registrado", description: "El equipo se agregó correctamente." })
      handleCreateDialogChange(false)
      await fetchCategorias()
    } catch (error) {
      console.error("[Calculadora] Error al crear equipo:", error)
      toast({
        title: "No se pudo crear el equipo",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEditEquipo = (equipo: EquipoWithMeta) => {
    setEditingEquipo(equipo)
    setEditForm({
      nombre: equipo.nombre,
      potencia_kw: equipo.potencia_kw.toString(),
      energia_kwh: equipo.energia_kwh.toString(),
    })
  }

  const handleEditDialogChange = (open: boolean) => {
    if (!open) {
      setEditingEquipo(null)
      setEditForm(createEmptyEditForm())
    }
  }

  const handleUpdateEquipo = async () => {
    if (!editingEquipo) return

    const nombre = editForm.nombre.trim()
    const potencia = parseFloat(editForm.potencia_kw)
    const energia = parseFloat(editForm.energia_kwh)

    if (!nombre) {
      toast({ title: "Nombre requerido", description: "El nombre no puede estar vacío.", variant: "destructive" })
      return
    }

    if (Number.isNaN(potencia) || potencia <= 0) {
      toast({
        title: "Dato inválido",
        description: "La potencia debe ser mayor a 0 kW.",
        variant: "destructive",
      })
      return
    }

    if (Number.isNaN(energia) || energia <= 0) {
      toast({
        title: "Dato inválido",
        description: "La energía debe ser mayor a 0 kWh.",
        variant: "destructive",
      })
      return
    }

    const payload: {
      nombre?: string
      potencia_kw?: number
      energia_kwh?: number
    } = {}

    if (nombre !== editingEquipo.nombre) payload.nombre = nombre
    if (potencia !== editingEquipo.potencia_kw) payload.potencia_kw = potencia
    if (energia !== editingEquipo.energia_kwh) payload.energia_kwh = energia

    if (Object.keys(payload).length === 0) {
      toast({ title: "Sin cambios", description: "Actualiza algún campo antes de guardar." })
      return
    }

    setEditLoading(true)
    try {
      await CalculoEnergeticoService.updateEquipo(editingEquipo.categoriaId, editingEquipo.nombre, payload)
      toast({ title: "Equipo actualizado", description: "Los datos del equipo fueron guardados." })
      handleEditDialogChange(false)
      await fetchCategorias()
    } catch (error) {
      console.error("[Calculadora] Error al actualizar equipo:", error)
      toast({
        title: "No se pudo actualizar",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteEquipo = (equipo: EquipoWithMeta) => {
    setEquipoToDelete(equipo)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteEquipo = async () => {
    if (!equipoToDelete) return

    setDeleteLoading(true)
    try {
      await CalculoEnergeticoService.deleteEquipo(equipoToDelete.categoriaId, equipoToDelete.nombre)
      toast({ title: "Equipo eliminado", description: "El equipo se eliminó correctamente." })
      setEquiposCantidad((prev) => {
        const next = new Map(prev)
        next.delete(equipoToDelete.key)
        return next
      })
      setCantidadBuscador((prev) => {
        const next = new Map(prev)
        next.delete(equipoToDelete.key)
        return next
      })
      await fetchCategorias()
    } catch (error) {
      console.error("[Calculadora] Error al eliminar equipo:", error)
      toast({
        title: "No se pudo eliminar el equipo",
        description: error instanceof Error ? error.message : "Intenta más tarde.",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
      setEquipoToDelete(null)
      setIsDeleteDialogOpen(false)
    }
  }

  useLayoutEffect(() => {
    if (!headerRef.current) return

    const element = headerRef.current
    const update = () => setHeaderHeight(Math.ceil(element.getBoundingClientRect().height))

    update()

    const resizeObserver = new ResizeObserver(() => update())
    resizeObserver.observe(element)
    window.addEventListener("resize", update)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [])

  const generarPDF = async () => {
    setExportingPDF(true)
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      let yPosition = 15

      // Encabezado con logo
      doc.setFillColor(189, 215, 176)
      doc.rect(0, 0, pageWidth, 35, "F")

      // Logo
      try {
        const logoUrl = "/logo.png"
        const response = await fetch(logoUrl)
        const blob = await response.blob()
        const logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
        doc.addImage(logoBase64, "PNG", pageWidth - 32, 3, 28, 28)
      } catch (error) {
        console.error("Error cargando logo:", error)
      }

      // Título
      doc.setFontSize(20)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(0, 0, 0)
      doc.text("FICHA DE COSTO", 10, 15)

      // Subtítulo
      doc.setFontSize(11)
      doc.setFont("helvetica", "normal")
      doc.text("Calculadora de Consumo Eléctrico", 10, 23)

      // Fecha
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      const fecha = new Date().toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      doc.text(`Fecha: ${fecha}`, 10, 30)

      yPosition = 45

      // Resumen de consumo
      doc.setFillColor(250, 250, 250)
      doc.rect(10, yPosition, pageWidth - 20, 35, "F")

      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(0, 0, 0)
      doc.text("Resumen de Consumo", 15, yPosition + 8)

      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text(`Potencia Total (Inversor): ${potenciaTotalKw.toFixed(2)} kW`, 15, yPosition + 16)
      doc.text(`Consumo Real por Hora: ${consumoRealKwh.toFixed(3)} kWh`, 15, yPosition + 23)
      doc.text(`Total de Equipos: ${totalEquipos}`, 15, yPosition + 30)

      yPosition += 45

      // Tabla de equipos seleccionados
      if (equiposCantidad.size > 0) {
        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        doc.text("Equipos Seleccionados", 10, yPosition)
        yPosition += 5

        const equiposData: any[] = []
        equiposCantidad.forEach((cantidad, key) => {
          const equipo = equiposIndex.get(key)
          if (equipo) {
            equiposData.push([
              equipo.categoriaNombre,
              equipo.nombre,
              cantidad,
              `${Math.round(equipo.potencia_kw * 1000)} W`,
              `${Math.round(equipo.energia_kwh * 1000)} W`,
              `${(equipo.potencia_kw * cantidad).toFixed(2)} kW`,
              `${(equipo.energia_kwh * cantidad).toFixed(3)} kWh`,
            ])
          }
        })

        autoTable(doc, {
          startY: yPosition,
          head: [["Categoría", "Equipo", "Cant", "Potencia", "Consumo", "Total Pot.", "Total Cons."]],
          body: equiposData,
          theme: "grid",
          headStyles: {
            fillColor: [234, 88, 12],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: "bold",
          },
          bodyStyles: {
            fontSize: 8,
          },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 50 },
            2: { cellWidth: 15, halign: "center" },
            3: { cellWidth: 20, halign: "right" },
            4: { cellWidth: 20, halign: "right" },
            5: { cellWidth: 22, halign: "right" },
            6: { cellWidth: 22, halign: "right" },
          },
          margin: { left: 10, right: 10 },
        })

        yPosition = (doc as any).lastAutoTable.finalY + 10
      }

      // Recomendaciones de dimensionamiento
      if (showRecomendaciones || totalEquipos > 0) {
        if (yPosition > 220) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        doc.text("Dimensionamiento del Sistema", 10, yPosition)
        yPosition += 10

        // Inversor
        doc.setFillColor(255, 243, 224)
        doc.rect(10, yPosition, pageWidth - 20, 25, "F")

        doc.setFontSize(10)
        doc.setFont("helvetica", "bold")
        doc.text("Inversor Recomendado", 15, yPosition + 7)

        doc.setFontSize(14)
        doc.setTextColor(234, 88, 12)
        doc.text(`${inversorRecomendado.toFixed(2)} kW`, 15, yPosition + 15)

        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text(`Potencia base: ${potenciaTotalKw.toFixed(2)} kW + 25% de margen`, 15, yPosition + 21)

        yPosition += 30

        // Batería
        doc.setFillColor(224, 242, 254)
        doc.rect(10, yPosition, pageWidth - 20, 35, "F")

        doc.setFontSize(10)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(0, 0, 0)
        doc.text("Banco de Baterías", 15, yPosition + 7)

        doc.setFontSize(14)
        doc.setTextColor(234, 88, 12)
        doc.text(`${bateriaRecomendada5h.toFixed(2)} kWh`, 15, yPosition + 15)

        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text(`Capacidad recomendada para 5 horas de autonomía`, 15, yPosition + 21)
        doc.text(`Duración estimada: ${duracionConBateria.toFixed(1)} horas`, 15, yPosition + 27)
        doc.text(`Consumo diario (24h): ${(consumoRealKwh * 24).toFixed(2)} kWh`, 15, yPosition + 32)
      }

      // Guardar PDF
      const filename = `Ficha_Costo_${fecha.replace(/\//g, "-")}.pdf`
      doc.save(filename)

      toast({
        title: "PDF generado",
        description: "La ficha de costo se ha descargado correctamente.",
      })
    } catch (error) {
      console.error("Error generando PDF:", error)
      toast({
        title: "Error al generar PDF",
        description: "No se pudo generar el archivo. Intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setExportingPDF(false)
    }
  }

  if (initialLoading) {
    return <PageLoader moduleName="Calculadora" text="Cargando equipos del backend..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header ref={headerRef} className="fixed-header bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-[auto,1fr,auto] items-center gap-2 py-2 sm:py-6">
	            <Link href="/" className="flex">
	              <Button
	                variant="ghost"
	                size="sm"
	                aria-label="Volver al dashboard"
	                className="flex items-center justify-center gap-2 h-9 w-9 p-0 rounded-full sm:rounded-md sm:w-auto sm:px-3"
	              >
	                <ArrowLeft className="h-4 w-4 sm:mr-2" />
	                <span className="hidden sm:inline">Volver al Dashboard</span>
	                <span className="sr-only">Volver al Dashboard</span>
	              </Button>
	            </Link>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 justify-self-center">
              <div className="hidden sm:flex p-0 rounded-full bg-white shadow border border-orange-200 items-center justify-center h-12 w-12">
                <img src="/logo.png" alt="Logo SunCar" className="h-10 w-10 object-contain rounded-full" />
              </div>
              <div>
                <h1 className="text-base sm:text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
                  <Calculator className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                  <span className="truncate">Calculadora</span>
                  <span className="hidden sm:inline">de Consumo Eléctrico</span>
                </h1>
                <p className="hidden sm:block text-sm text-gray-600">Calcula el consumo de tus equipos eléctricos.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 justify-end">
              {loadingCategorias && (
                <span className="flex items-center gap-2 text-sm text-orange-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Actualizando</span>
                </span>
              )}
	              <Button
	                onClick={restablecerParametros}
	                variant="outline"
	                size="sm"
	                aria-label="Restablecer"
	                className="flex items-center justify-center gap-2 border-orange-200 hover:bg-orange-50 hover:border-orange-300 h-9 w-9 p-0 rounded-full sm:rounded-md sm:w-auto sm:px-3"
	                disabled={totalEquipos === 0}
	              >
	                <RotateCcw className="h-4 w-4 text-orange-600" />
	                <span className="sr-only">Restablecer</span>
	              </Button>
	              <Button
	                onClick={() => setIsCreateDialogOpen(true)}
	                size="sm"
	                aria-label="Registrar equipo"
	                className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white h-9 w-9 p-0 rounded-full sm:rounded-md sm:w-auto sm:px-3"
	              >
	                <Plus className="h-4 w-4" />
	                <span className="sr-only">Registrar equipo</span>
	              </Button>
            </div>
          </div>
        </div>
      </header>

      <main
        className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
        style={{ paddingTop: headerHeight + 8 }}
      >
        {/* Panel de consumo total */}
        <div className="-mx-4 sm:mx-0">
          <div
            className="sticky z-10 bg-gradient-to-br from-orange-50 to-yellow-50 px-4 sm:px-0 pb-3 sm:pb-6"
            style={{ top: headerHeight }}
          >
            {/* Subheader compacto (móvil) */}
            <Card className="sm:hidden bg-white/95 backdrop-blur border-orange-200 shadow-sm">
              <CardContent className="p-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">Potencia</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{potenciaTotalKw.toFixed(2)} kW</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">Consumo/h</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{consumoRealKwh.toFixed(3)} kWh</p>
                  </div>
                  <div className="flex justify-end">
                    <Badge variant="outline" className="text-xs px-2 py-1 bg-white h-fit">
                      {totalEquipos} {totalEquipos === 1 ? "eq" : "eqs"}
                    </Badge>
                  </div>
                </div>

                {totalEquipos > 0 && (
                  <Button
                    onClick={handleOpenRecomendaciones}
                    className="mt-3 w-full h-9 bg-orange-600 hover:bg-orange-700 flex items-center justify-center gap-2"
                  >
                    <Lightbulb className="h-4 w-4" />
                    Dimensionar
                  </Button>
                )}
                {totalEquipos > 0 && (
                  <Button
                    onClick={generarPDF}
                    disabled={exportingPDF}
                    variant="outline"
                    className="mt-2 w-full h-9 border-orange-200 hover:bg-orange-50 flex items-center justify-center gap-2"
                  >
                    {exportingPDF ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Descargar PDF
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Panel completo (desktop/tablet) */}
            <Card className="hidden sm:block bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Potencia Total (Inversor)</p>
                        <p className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                          <Cpu className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
                          {potenciaTotalKw.toFixed(2)} kW
                        </p>
                        <p className="text-xs text-gray-500 mt-1">= {(potenciaTotalKw * 1000).toFixed(0)} Watts</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Consumo Real por Hora (Batería)</p>
                        <p className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                          <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
                          {consumoRealKwh.toFixed(3)} kWh
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Consumo diario (24h): {(consumoRealKwh * 24).toFixed(2)} kWh
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end sm:justify-start">
                    <Badge variant="outline" className="text-sm sm:text-lg px-3 py-1.5 sm:px-4 sm:py-2 bg-white">
                      {totalEquipos} {totalEquipos === 1 ? "equipo" : "equipos"}
                    </Badge>
                  </div>
                </div>

                {totalEquipos > 0 && (
                  <div className="border-t border-orange-200 pt-4">
                    <Button
                      onClick={handleOpenRecomendaciones}
                      className="w-full bg-orange-600 hover:bg-orange-700 flex items-center justify-center gap-2"
                    >
                      <Lightbulb className="h-5 w-5" />
                      Dimensionar Inversor y Batería
                    </Button>
                    <Button
                      onClick={generarPDF}
                      disabled={exportingPDF}
                      variant="outline"
                      className="w-full mt-2 border-orange-200 hover:bg-orange-50 flex items-center justify-center gap-2"
                    >
                      {exportingPDF ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Generando PDF...
                        </>
                      ) : (
                        <>
                          <Download className="h-5 w-5" />
                          Descargar PDF
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Buscador de equipos */}
        <div className="mb-6">
          <Card className="border-orange-200">
            <CardContent className="pt-6">
              <Popover open={openBuscador} onOpenChange={setOpenBuscador}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openBuscador}
                    className="w-full justify-start text-left font-normal border-orange-200 hover:bg-orange-50"
                  >
                    <Search className="mr-2 h-4 w-4 shrink-0 text-orange-600" />
                    <span className="text-gray-500">Buscar equipos...</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-2rem)] max-w-[600px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Buscar por nombre o categoría..."
                      value={busqueda}
                      onValueChange={setBusqueda}
                    />
                    <CommandList>
                      <CommandEmpty>Sin resultados para la búsqueda.</CommandEmpty>
                      {categorias.map((categoria) => {
                        const equiposCategoria = (categoria.equipos || []).filter((equipo) => {
                          if (!busqueda.trim()) return true
                          const busquedaLower = busqueda.toLowerCase()
                          return (
                            equipo.nombre.toLowerCase().includes(busquedaLower) ||
                            categoria.nombre.toLowerCase().includes(busquedaLower)
                          )
                        })

                        if (equiposCategoria.length === 0) return null

                        return (
                          <CommandGroup key={categoria.id} heading={categoria.nombre}>
                            {equiposCategoria.map((equipo) => {
                              const equipoKey = getEquipoKey(categoria.id, equipo.nombre)
                              const yaAgregado = equiposCantidad.has(equipoKey)
                              const cantidadActual = cantidadBuscador.get(equipoKey) || 1

                              return (
                                <CommandItem
                                  key={equipoKey}
                                  value={equipoKey}
                                  onSelect={() => agregarDesdeBuscador(equipoKey)}
                                  className="flex flex-col sm:flex-row sm:items-center gap-3"
                                >
                                  <div className="w-full sm:flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{equipo.nombre}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          {Math.round(equipo.potencia_kw * 1000)} W •{" "}
                                          {Math.round(equipo.energia_kwh * 1000)} W real/h
                                        </p>
                                      </div>
                                      {yaAgregado && (
                                        <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 shrink-0">
                                          Agregado
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 truncate">{categoria.nombre}</div>
                                  </div>
                                  <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2">
                                    <div className="flex items-center gap-1">
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          actualizarCantidadBuscador(equipoKey, Math.max(1, cantidadActual - 1))
                                        }}
                                        size="sm"
                                        variant="outline"
                                        className="h-8 w-8 p-0"
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={cantidadActual}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          e.stopPropagation()
                                          const valor = parseInt(e.target.value, 10) || 1
                                          actualizarCantidadBuscador(equipoKey, Math.max(1, valor))
                                        }}
                                        className="w-16 h-8 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          actualizarCantidadBuscador(equipoKey, cantidadActual + 1)
                                        }}
                                        size="sm"
                                        variant="outline"
                                        className="h-8 w-8 p-0"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        agregarDesdeBuscador(equipoKey)
                                      }}
                                      size="sm"
                                      className="bg-orange-600 hover:bg-orange-700 h-8 px-3"
                                    >
                                      Agregar
                                    </Button>
                                  </div>
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        )
                      })}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>
        </div>

        {categoriasError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {categoriasError}
          </div>
        )}

        {/* Contenido principal */}
        <div className="space-y-6">
          {noEquiposRegistrados && !loadingCategorias ? (
            <Card className="border-dashed border-orange-200">
              <CardContent className="py-10 text-center">
                <p className="text-gray-600">Aún no hay equipos registrados en el backend.</p>
                <p className="text-sm text-gray-500 mt-2">Usa el botón &quot;Registrar equipo&quot; para comenzar.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {categorias.map((categoria) => {
                if ((categoria.equipos || []).length === 0) return null
                const icono = categoriaIconos[categoria.nombre] || "⚡️"

                return (
                  <Card key={categoria.id} className="border-orange-100">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span>{icono}</span>
                        {categoria.nombre}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(categoria.equipos || []).map((equipo) => {
                          const equipoKey = getEquipoKey(categoria.id, equipo.nombre)
                          const cantidad = equiposCantidad.get(equipoKey) || 0
                          const seleccionado = cantidad > 0
                          const equipoMeta =
                            equiposIndex.get(equipoKey) || {
                              key: equipoKey,
                              categoriaId: categoria.id,
                              categoriaNombre: categoria.nombre,
                              nombre: equipo.nombre,
                              potencia_kw: equipo.potencia_kw,
                              energia_kwh: equipo.energia_kwh,
                            }

                          return (
                            <div
                              key={equipoKey}
                              className={`p-3 rounded-lg border transition-colors ${
                                seleccionado ? "border-orange-300 bg-orange-50" : "border-gray-200 bg-white"
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900">{equipo.nombre}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {Math.round(equipo.potencia_kw * 1000)} W •{" "}
                                    {Math.round(equipo.energia_kwh * 1000)} W real/h
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                    onClick={() => handleEditEquipo(equipoMeta)}
                                    aria-label={`Editar ${equipo.nombre}`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDeleteEquipo(equipoMeta)}
                                    aria-label={`Eliminar ${equipo.nombre}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              {!seleccionado ? (
                                <Button
                                  onClick={() => agregarEquipo(equipoKey, 1)}
                                  size="sm"
                                  variant="outline"
                                  className="w-full border-orange-200 hover:bg-orange-100"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Agregar
                                </Button>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Button
                                    onClick={() => decrementarCantidad(equipoKey)}
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <div className="flex-1 text-center">
                                    <span className="text-sm font-semibold">{cantidad}</span>
                                  </div>
                                  <Button
                                    onClick={() => incrementarCantidad(equipoKey)}
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    onClick={() => eliminarEquipo(equipoKey)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Crear equipo */}
      <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogChange}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Registrar nuevo equipo</DialogTitle>
            <DialogDescription>Ingresa los datos para crear el equipo en la colección del backend.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nuevo-equipo-nombre">Nombre del equipo</Label>
              <Input
                id="nuevo-equipo-nombre"
                placeholder="Ej: Refrigerador (A++)"
                value={createForm.nombre}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, nombre: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nuevo-equipo-potencia">Potencia instantánea (kW)</Label>
                <Input
                  id="nuevo-equipo-potencia"
                  type="number"
                  inputMode="decimal"
                  placeholder="Ej: 0.15"
                  min="0"
                  step="0.01"
                  value={createForm.potencia_kw}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, potencia_kw: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="nuevo-equipo-energia">Consumo real (kWh)</Label>
                <Input
                  id="nuevo-equipo-energia"
                  type="number"
                  inputMode="decimal"
                  placeholder="Ej: 0.06"
                  min="0"
                  step="0.01"
                  value={createForm.energia_kwh}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, energia_kwh: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Categoría</Label>
              <Select
                value={createForm.categoria}
                onValueChange={(value) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    categoria: value,
                    categoriaPersonalizada: value === "otro" ? prev.categoriaPersonalizada : "",
                  }))
                }
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categoriaOptions.map((nombre) => (
                    <SelectItem key={nombre} value={nombre}>
                      {nombre}
                    </SelectItem>
                  ))}
                  <SelectItem value="otro">Otra categoría</SelectItem>
                </SelectContent>
              </Select>
              {createForm.categoria === "otro" && (
                <Input
                  className="mt-3"
                  placeholder="Nombre de la nueva categoría"
                  value={createForm.categoriaPersonalizada}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, categoriaPersonalizada: e.target.value }))}
                />
              )}
            </div>
          </div>
          <DialogFooter className="pt-4 gap-2">
            <Button variant="outline" onClick={() => handleCreateDialogChange(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleCreateEquipo} disabled={createLoading} className="w-full sm:w-auto">
              {createLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar equipo */}
      <Dialog open={Boolean(editingEquipo)} onOpenChange={handleEditDialogChange}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Editar equipo</DialogTitle>
            <DialogDescription>Actualiza la información del equipo seleccionado.</DialogDescription>
          </DialogHeader>
          {editingEquipo && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editar-equipo-nombre">Nombre del equipo</Label>
                <Input
                  id="editar-equipo-nombre"
                  value={editForm.nombre}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, nombre: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editar-equipo-potencia">Potencia (kW)</Label>
                  <Input
                    id="editar-equipo-potencia"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={editForm.potencia_kw}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, potencia_kw: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="editar-equipo-energia">Consumo (kWh)</Label>
                  <Input
                    id="editar-equipo-energia"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={editForm.energia_kwh}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, energia_kwh: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="pt-4 gap-2">
            <Button variant="outline" onClick={() => handleEditDialogChange(false)} disabled={editLoading} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleUpdateEquipo} disabled={editLoading} className="w-full sm:w-auto">
              {editLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación para eliminar equipo */}
      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) {
            setEquipoToDelete(null)
          }
        }}
        title="Eliminar equipo"
        message={
          equipoToDelete
            ? `¿Seguro que deseas eliminar el equipo "${equipoToDelete.nombre}" de la categoría "${equipoToDelete.categoriaNombre}"?`
            : "¿Seguro que deseas eliminar este equipo?"
        }
        onConfirm={confirmDeleteEquipo}
        confirmText="Eliminar equipo"
        isLoading={deleteLoading}
      />

      {/* Modal de Recomendaciones */}
      <Dialog open={showRecomendaciones} onOpenChange={setShowRecomendaciones}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 pt-6 pb-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-orange-600" />
                Dimensionamiento de Sistema Solar
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              <Card className="border-orange-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-orange-600" />
                    Inversor Recomendado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-orange-50 p-3 sm:p-4 rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Potencia del Inversor</p>
                    <p className="text-xl sm:text-2xl font-bold text-orange-600">{inversorRecomendado.toFixed(2)} kW</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Potencia base: {potenciaTotalKw.toFixed(2)} kW + 25% de margen
                    </p>
                  </div>
                  <p className="text-xs text-gray-600">
                    ℹ️ El margen del 25% cubre picos de arranque de motores (aires acondicionados, refrigeradores) y
                    permite expansión futura.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-orange-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Battery className="h-5 w-5 text-orange-600" />
                    Banco de Baterías
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-orange-50 p-3 sm:p-4 rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Capacidad Recomendada (5 horas)</p>
                    <p className="text-xl sm:text-2xl font-bold text-orange-600">{bateriaRecomendada5h.toFixed(2)} kWh</p>
                    <p className="text-xs text-gray-500 mt-2">{consumoRealKwh.toFixed(3)} kWh/h × 5 horas de autonomía</p>
                  </div>
                  <div className="border-t border-orange-200 pt-4">
                    <Label htmlFor="bateria-kwh" className="text-xs sm:text-sm font-medium">
                      Ajustar Capacidad de Batería: {bateriaKwh[0].toFixed(2)} kWh
                    </Label>
                    <Slider
                      id="bateria-kwh"
                      min={0.5}
                      max={50}
                      step={0.5}
                      value={bateriaKwh}
                      onValueChange={setBateriaKwh}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0.5 kWh</span>
                      <span>50 kWh</span>
                    </div>
                  </div>
                  <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                      ⏱️ Duración con {bateriaKwh[0].toFixed(2)} kWh
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-blue-600">{duracionConBateria.toFixed(1)} horas</p>
                    <p className="text-xs text-gray-600 mt-2">
                      Con {bateriaKwh[0].toFixed(2)} kWh de batería y un consumo real de {consumoRealKwh.toFixed(3)} kWh/h,
                      el sistema funcionará aproximadamente {duracionConBateria.toFixed(1)} horas sin red eléctrica.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="border-t border-gray-200 px-6 py-4 bg-white">
            <div className="flex justify-end gap-3">
              <Button 
                onClick={generarPDF} 
                disabled={exportingPDF}
                className="bg-orange-600 hover:bg-orange-700 flex items-center gap-2"
              >
                {exportingPDF ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generando PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Descargar PDF
                  </>
                )}
              </Button>
              <Button onClick={() => setShowRecomendaciones(false)} variant="outline">
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  )
}
