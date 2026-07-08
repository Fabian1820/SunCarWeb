"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { Label } from "@/components/shared/atom/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import {
  Package,
  Search,
  AlertCircle,
  Loader2,
  TrendingUp,
  Eye,
  Pencil,
  Plus,
  FileSpreadsheet,
  Boxes,
  Coins,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Input } from "@/components/shared/molecule/input"
import { Toaster } from "@/components/shared/molecule/toaster"
import { useToast } from "@/hooks/use-toast"
import { RouteGuard } from "@/components/auth/route-guard"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { MaterialForm } from "@/components/feats/materials/material-form"
import { MaterialContableDetalle } from "@/components/feats/fichas-costo/material-contable-detalle"
import { MaterialStockDialog } from "@/components/feats/fichas-costo/material-stock-dialog"
import { EstablecerCostoDialog, type CostoMaterialRef } from "@/components/feats/fichas-costo/establecer-costo-dialog"
import { InventarioService } from "@/lib/services/feats/inventario/inventario-service"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/shared/molecule/tooltip"
import { useMaterials } from "@/hooks/use-materials"
import { useMarcas } from "@/hooks/use-marcas"
import { useAuth } from "@/contexts/auth-context"
import { exportToExcel, generateFilename } from "@/lib/export-service"
import type { Material } from "@/lib/material-types"

const PAGE_SIZE = 20

type PrecioFiltro = "all" | "sin-precio" | "sin-costo" | "margen-negativo"

// Margen sobre el precio de venta (mostrado en la tabla).
const calcMargen = (m: Material): number | null => {
  if (typeof m.costo !== "number" || typeof m.precio !== "number" || m.costo <= 0) return null
  return ((m.precio - m.costo) / m.costo) * 100
}

export default function FichasCostoPage() {
  return (
    <RouteGuard requiredModule="fichas-costo">
      <FichasCostoPageContent />
    </RouteGuard>
  )
}

function FichasCostoPageContent() {
  const { toast } = useToast()
  const {
    materials,
    categories,
    loading,
    error,
    catalogs,
    deleteMaterialByCodigo,
    editMaterialInProduct,
    createCategory,
    addMaterialToProduct,
    refetch,
    refetchBackground,
    registerNewCategory,
  } = useMaterials()
  const { marcasSimplificadas } = useMarcas()

  // Permiso "solo precios": el usuario tiene ÚNICAMENTE el sub-permiso
  // `fichas-costo/solo-precios` y NO el padre completo `fichas-costo`. En ese
  // caso la tabla se reduce a Precio Venta · P. Instaladora · % Rebajable, y se
  // ocultan costo, margen, acciones (crear/editar/ver/stock), filtros sensibles
  // (rango precio, "Valores") y export. SuperAdmin siempre ve todo.
  const { user, modulosPermitidos } = useAuth()
  const soloPrecios =
    !user?.is_superAdmin &&
    !modulosPermitidos.includes("fichas-costo") &&
    modulosPermitidos.includes("fichas-costo/solo-precios")

  // Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedMarca, setSelectedMarca] = useState("all")
  const [precioFiltro, setPrecioFiltro] = useState<PrecioFiltro>("all")
  const [precioMin, setPrecioMin] = useState("")
  const [precioMax, setPrecioMax] = useState("")
  const [page, setPage] = useState(1)

  // Diálogos
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [detalleMaterial, setDetalleMaterial] = useState<Material | null>(null)
  const [isDetalleOpen, setIsDetalleOpen] = useState(false)
  const [stockMaterial, setStockMaterial] = useState<Material | null>(null)
  const [isStockOpen, setIsStockOpen] = useState(false)
  const [costoMaterial, setCostoMaterial] = useState<CostoMaterialRef | null>(null)
  const [isCostoOpen, setIsCostoOpen] = useState(false)
  const [stockPorMaterial, setStockPorMaterial] = useState<Record<string, number>>({})
  const [stockReady, setStockReady] = useState(false)
  const [exporting, setExporting] = useState(false)

  const units = useMemo(
    () => Array.from(new Set(materials.map((m) => m.um).filter(Boolean))).sort(),
    [materials],
  )

  const marcaPorId = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of marcasSimplificadas) map.set(m.id, m.nombre)
    return map
  }, [marcasSimplificadas])

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    const min = precioMin.trim() === "" ? null : Number(precioMin)
    const max = precioMax.trim() === "" ? null : Number(precioMax)

    return materials
      .filter((m) => {
        // Búsqueda libre
        if (q) {
          const marca = (m.marca_id ? marcaPorId.get(m.marca_id) : "") || ""
          const hay =
            String(m.codigo || "").toLowerCase().includes(q) ||
            (m.descripcion || "").toLowerCase().includes(q) ||
            (m.nombre || "").toLowerCase().includes(q) ||
            (m.categoria || "").toLowerCase().includes(q) ||
            marca.toLowerCase().includes(q) ||
            (typeof m.numero_serie === "string" && m.numero_serie.toLowerCase().includes(q))
          if (!hay) return false
        }
        // Categoría
        if (selectedCategory !== "all" && m.categoria !== selectedCategory) return false
        // Marca
        if (selectedMarca !== "all" && m.marca_id !== selectedMarca) return false
        // Filtro de precio
        if (precioFiltro === "sin-precio" && !(m.precio == null || m.precio === 0)) return false
        if (precioFiltro === "sin-costo" && !(m.costo == null || m.costo === 0)) return false
        if (precioFiltro === "margen-negativo") {
          const neg = typeof m.costo === "number" && typeof m.precio === "number" && m.costo > 0 && m.precio < m.costo
          if (!neg) return false
        }
        // Rango de precio (sobre precio de venta)
        if (min != null && !Number.isNaN(min) && !(typeof m.precio === "number" && m.precio >= min)) return false
        if (max != null && !Number.isNaN(max) && !(typeof m.precio === "number" && m.precio <= max)) return false
        return true
      })
      .sort((a, b) => (a.nombre || a.descripcion || "").toLowerCase().localeCompare((b.nombre || b.descripcion || "").toLowerCase()))
  }, [materials, searchTerm, selectedCategory, selectedMarca, precioFiltro, precioMin, precioMax, marcaPorId])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  )

  const hasFilters =
    searchTerm.trim() !== "" ||
    selectedCategory !== "all" ||
    selectedMarca !== "all" ||
    precioFiltro !== "all" ||
    precioMin.trim() !== "" ||
    precioMax.trim() !== ""

  const resetPage = () => setPage(1)
  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedCategory("all")
    setSelectedMarca("all")
    setPrecioFiltro("all")
    setPrecioMin("")
    setPrecioMax("")
    setPage(1)
  }

  // ---------- Crear / editar material (descriptivo + web + contable) ----------
  const addMaterial = async (material: Omit<Material, "id"> | Material) => {
    const m = material as any
    const categoria = m.categoria
    const materialData = {
      codigo: String(m.codigo),
      descripcion: m.descripcion,
      um: m.um,
      ...(m.nombre && { nombre: m.nombre }),
      ...(m.foto && { foto: m.foto }),
      ...(m.marca_id && { marca_id: m.marca_id }),
      ...(m.potenciaKW && { potenciaKW: m.potenciaKW }),
      comentario: m.comentario?.trim() || null,
      habilitar_venta_web: m.habilitar_venta_web ?? false,
      especificaciones: m.especificaciones || null,
      ficha_tecnica_url: m.ficha_tecnica_url || null,
      numero_serie: m.numero_serie?.trim() || null,
      // Contables
      costo: m.costo,
      precio: m.precio,
      precio_instaladora: m.precio_instaladora,
      porciento_rebajable_venta: m.porciento_rebajable_venta,
    }

    try {
      let productoId: string | undefined
      if (m.isNewCategory) {
        const { MaterialService } = await import("@/lib/services/feats/materials/material-service")
        productoId = await MaterialService.createCategoryWithMaterials({
          categoria,
          materiales: [materialData as any],
        })
        registerNewCategory(categoria, productoId as any, materialData as any)
        await refetchBackground()
      } else {
        const producto = catalogs.find((c) => c.categoria === categoria)
        productoId = producto?.id as any
        if (!productoId) productoId = await createCategory(categoria)
        if (!productoId) throw new Error("No se pudo determinar el producto para la categoría")
        await addMaterialToProduct(productoId as any, materialData as any, categoria)
      }
      toast({ title: "Éxito", description: "Material creado correctamente." })
      setIsAddOpen(false)
      await refetch()
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Error al crear material", variant: "destructive" })
    }
  }

  const updateMaterial = async (material: Omit<Material, "id"> | Material) => {
    const m = material as any
    const codigo = String(m.codigo)
    const categoria = m.categoria
    const materialCodigo = String(editingMaterial?.codigo || codigo)
    const categoriaOriginal = editingMaterial?.categoria
    const categoriaChanged = categoriaOriginal !== categoria

    const payload = {
      codigo,
      descripcion: m.descripcion,
      um: m.um,
      nombre: m.nombre,
      foto: m.foto,
      marca_id: m.marca_id,
      potenciaKW: m.potenciaKW,
      comentario: m.comentario?.trim() || null,
      habilitar_venta_web: m.habilitar_venta_web,
      especificaciones: m.especificaciones,
      ficha_tecnica_url: m.ficha_tecnica_url || null,
      numero_serie: m.numero_serie?.trim() || null,
      costo: m.costo,
      precio: m.precio,
      precio_instaladora: m.precio_instaladora,
      porciento_rebajable_venta: m.porciento_rebajable_venta,
    }

    try {
      if (categoriaChanged) {
        await deleteMaterialByCodigo(materialCodigo, categoriaOriginal)
        let productoNuevo = catalogs.find((c) => c.categoria === categoria)
        let productoNuevoId = productoNuevo?.id
        if (!productoNuevoId) productoNuevoId = await createCategory(categoria)
        await addMaterialToProduct(productoNuevoId as any, payload as any, categoria)
      } else {
        const producto = catalogs.find((c) => c.categoria === categoria)
        if (!producto) {
          toast({ title: "Error", description: "No se encontró el producto para este material", variant: "destructive" })
          return
        }
        // El costo NO se edita desde aquí: se gestiona con la acción "Costo"
        // (kardex / saldo inicial). Solo persistimos el resto de campos.
        const payloadSinCosto = { ...payload }
        delete (payloadSinCosto as any).costo
        await editMaterialInProduct(producto.id, materialCodigo, payloadSinCosto as any, categoria)
      }
      toast({ title: "Éxito", description: "Material actualizado correctamente." })
      setIsEditOpen(false)
      setEditingMaterial(null)
      await refetch()
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Error al actualizar material", variant: "destructive" })
    }
  }

  // ---------- Export Excel (todo lo filtrado, ignora paginación) ----------
  const handleExport = async () => {
    setExporting(true)
    try {
      const normalizeValue = (value: unknown): string | number => {
        if (typeof value === "number") return value
        if (typeof value === "boolean") return value ? "Sí" : "No"
        if (value === null || value === undefined || value === "") return "-"
        return String(value)
      }
      await exportToExcel({
        title: "Suncar SRL - Fichas de Costo",
        subtitle: `Materiales: ${filtered.length}`,
        filename: generateFilename("fichas_costo"),
        columns: [
          { header: "Código", key: "codigo", width: 18 },
          { header: "Categoría", key: "categoria", width: 18 },
          { header: "Nombre", key: "nombre", width: 32 },
          { header: "Descripción", key: "descripcion", width: 42 },
          { header: "UM", key: "um", width: 10 },
          { header: "Marca", key: "marca", width: 22 },
          { header: "Costo", key: "costo", width: 14 },
          { header: "Precio Venta", key: "precio", width: 14 },
          { header: "Precio Instaladora", key: "precio_instaladora", width: 18 },
          { header: "% Rebajable", key: "porciento_rebajable_venta", width: 14 },
          { header: "Margen % (s/ venta)", key: "margen", width: 16 },
        ],
        data: filtered.map((m) => {
          const margen = calcMargen(m)
          return {
            codigo: normalizeValue(m.codigo),
            categoria: normalizeValue(m.categoria),
            nombre: normalizeValue(m.nombre),
            descripcion: normalizeValue(m.descripcion),
            um: normalizeValue(m.um),
            marca: m.marca_id ? normalizeValue(marcaPorId.get(m.marca_id) || m.marca_id) : "-",
            costo: m.costo ?? "-",
            precio: m.precio ?? "-",
            precio_instaladora: m.precio_instaladora ?? "-",
            porciento_rebajable_venta: m.porciento_rebajable_venta ?? "-",
            margen: margen != null ? Number(margen.toFixed(1)) : "-",
          }
        }),
      })
      toast({ title: "Exportación exitosa", description: `Se exportaron ${filtered.length} materiales.` })
    } catch (err: any) {
      toast({ title: "Error al exportar", description: err?.message || "No se pudo exportar.", variant: "destructive" })
    } finally {
      setExporting(false)
    }
  }

  const openEdit = (m: Material) => {
    setEditingMaterial(m)
    setIsEditOpen(true)
  }
  const openDetalle = (m: Material) => {
    setDetalleMaterial(m)
    setIsDetalleOpen(true)
  }
  const openStock = (m: Material) => {
    setStockMaterial(m)
    setIsStockOpen(true)
  }
  const openCosto = (m: Material) => {
    const material_id = String((m as any)._id || (m as any).material_id || (m as any).id || "")
    const producto = catalogs.find((c) => c.categoria === m.categoria)
    setCostoMaterial({
      material_id,
      producto_id: producto?.id,
      codigo: m.codigo,
      nombre: m.nombre || m.descripcion,
      costo: m.costo,
    })
    setIsCostoOpen(true)
  }

  // Stock total por material: la acción "Costo" solo se muestra a los que tienen
  // existencias. Los que no tienen stock reciben su costo solo por compras (no a mano).
  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        const res = await InventarioService.getMaterialesStock({ limit: 2000 })
        const map: Record<string, number> = {}
        for (const it of ((res?.data ?? []) as any[])) {
          const total = Number(it?.total ?? 0)
          if (it?.material_id) map[String(it.material_id)] = total
          if (it?.codigo != null) map[`c:${String(it.codigo)}`] = total
        }
        if (!cancel) {
          setStockPorMaterial(map)
          setStockReady(true)
        }
      } catch {
        // fail-open: si falla la carga de stock, se muestra el botón igual
      }
    })()
    return () => {
      cancel = true
    }
  }, [])

  const tieneExistencias = (m: Material): boolean => {
    if (!stockReady) return true // fail-open hasta que cargue el stock
    const id = String((m as any)._id || (m as any).material_id || (m as any).id || "")
    const total = stockPorMaterial[id] ?? stockPorMaterial[`c:${String(m.codigo)}`] ?? 0
    return total > 0
  }

  const from = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const to = Math.min(currentPage * PAGE_SIZE, filtered.length)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdf6ec] via-white to-[#fbe6cf]">
      <ModuleHeader
        title="Fichas de Costo"
        subtitle="Vista contable de materiales: costos, precios, márgenes, kardex y compras"
        badge={{ text: "Costos", className: "bg-amber-100 text-amber-800" }}
        backHref="/compras-envios-costos"
        backLabel="Volver a Compras, Envíos y Costos"
        actions={
          soloPrecios ? null : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleExport()}
                disabled={exporting || filtered.length === 0}
                title="Exportar a Excel"
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                <span className="hidden sm:inline ml-1">Exportar</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setIsAddOpen(true)}
                className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
                title="Crear material"
              >
                <Plus className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Crear material</span>
              </Button>
            </div>
          )
        }
      />

      <main className="content-with-fixed-header max-w-[98vw] 2xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros */}
        <Card className="border-0 shadow-md border-l-4 border-l-amber-600">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Buscar Material</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por código, descripción, nombre o N° serie..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); resetPage() }}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 lg:w-auto">
                <div className="lg:w-44">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Categoría</Label>
                  <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); resetPage() }}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      {categories.map((c, i) => (<SelectItem key={c || i} value={c}>{c}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="lg:w-44">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Marca</Label>
                  <Select value={selectedMarca} onValueChange={(v) => { setSelectedMarca(v); resetPage() }}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las marcas</SelectItem>
                      {marcasSimplificadas.map((m) => (<SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                {!soloPrecios && (
                  <>
                    <div className="lg:w-48">
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Valores</Label>
                      <Select value={precioFiltro} onValueChange={(v) => { setPrecioFiltro(v as PrecioFiltro); resetPage() }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="sin-precio">Sin precio (0 o vacío)</SelectItem>
                          <SelectItem value="sin-costo">Sin costo (0 o vacío)</SelectItem>
                          <SelectItem value="margen-negativo">Margen negativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="lg:w-44">
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Rango precio venta</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={precioMin}
                          onChange={(e) => { setPrecioMin(e.target.value); resetPage() }}
                          className="h-9"
                        />
                        <span className="text-gray-400">–</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={precioMax}
                          onChange={(e) => { setPrecioMax(e.target.value); resetPage() }}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
              {hasFilters && (
                <div className="flex items-end">
                  <Button variant="outline" size="sm" onClick={handleClearFilters} className="text-gray-600">
                    <X className="h-4 w-4 mr-1" />
                    Limpiar
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card className="border-l-4 border-l-amber-600">
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Materiales</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {loading ? "Cargando..." : `${filtered.length} materiales${hasFilters ? " (filtrados)" : ""}`}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                <span className="text-sm">Cargando materiales...</span>
              </div>
            ) : paged.length === 0 ? (
              <div className="text-center py-16">
                <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {hasFilters ? "Sin resultados para los filtros." : "No hay materiales disponibles."}
                </p>
              </div>
            ) : (
              <TooltipProvider delayDuration={200}>
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[150px]">Código</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[110px]">Categoría</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Nombre</th>
                        {!soloPrecios && (
                          <th className="text-right py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[90px]">Costo</th>
                        )}
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[100px]">Precio Venta</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[110px]">P. Instaladora</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[90px]">% Rebajable</th>
                        {!soloPrecios && (
                          <>
                            <th className="text-right py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[110px]" title="Margen sobre el costo, calculado con el precio de venta">Margen s/ venta</th>
                            <th className="text-left py-2.5 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[130px]">Acciones</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((row) => {
                        const margen = calcMargen(row)
                        return (
                          <tr key={row.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                {row.foto ? (
                                  <div className="relative w-8 h-8 rounded-md overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-200">
                                    <img src={row.foto} alt={row.nombre || row.descripcion} className="w-full h-full object-contain p-0.5" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                                  </div>
                                ) : (
                                  <div className="bg-amber-100 p-1.5 rounded-md flex-shrink-0">
                                    <Package className="h-3 w-3 text-amber-700" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <p className="font-semibold text-gray-900 text-xs truncate cursor-help">{row.codigo ?? "-"}</p>
                                    </TooltipTrigger>
                                    <TooltipContent side="top"><p className="max-w-xs break-words">{row.codigo ?? "-"}</p></TooltipContent>
                                  </Tooltip>
                                  {row.numero_serie && <p className="text-[10px] text-gray-500 truncate">N/S: {row.numero_serie}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs max-w-[100px] truncate inline-block">{row.categoria || "-"}</Badge>
                            </td>
                            <td className="py-2.5 px-3">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="font-medium text-gray-900 truncate text-sm cursor-help">{row.nombre || row.descripcion || "-"}</p>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p className="max-w-xs break-words">{row.nombre || row.descripcion || "-"}</p></TooltipContent>
                              </Tooltip>
                              {row.marca_id && marcaPorId.get(row.marca_id) && <p className="text-xs text-gray-400 truncate">{marcaPorId.get(row.marca_id)}</p>}
                            </td>
                            {!soloPrecios && (
                              <td className="py-2.5 px-3 text-right"><span className="font-medium text-gray-900 text-xs">{row.costo != null ? `$${row.costo.toFixed(2)}` : "N/A"}</span></td>
                            )}
                            <td className="py-2.5 px-3 text-right"><span className="font-medium text-emerald-700 text-xs">{row.precio != null ? `$${row.precio.toFixed(2)}` : "N/A"}</span></td>
                            <td className="py-2.5 px-3 text-right"><span className="font-medium text-indigo-700 text-xs">{row.precio_instaladora != null ? `$${row.precio_instaladora.toFixed(2)}` : "N/A"}</span></td>
                            <td className="py-2.5 px-3 text-right"><span className="font-medium text-gray-900 text-xs">{row.porciento_rebajable_venta != null ? `${row.porciento_rebajable_venta}%` : "N/A"}</span></td>
                            {!soloPrecios && (
                              <>
                                <td className="py-2.5 px-3 text-right">
                                  {margen != null ? (
                                    <div className="inline-flex items-center gap-0.5 justify-end">
                                      <TrendingUp className={`h-3 w-3 flex-shrink-0 ${margen >= 0 ? "text-amber-500" : "text-red-500"}`} />
                                      <span className={`font-semibold text-xs ${margen >= 0 ? "text-amber-700" : "text-red-600"}`}>{margen.toFixed(1)}%</span>
                                    </div>
                                  ) : (<span className="text-xs text-gray-300">N/A</span>)}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => openEdit(row)} title="Editar material" className="inline-flex items-center justify-center rounded p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    {tieneExistencias(row) && (
                                      <button onClick={() => openCosto(row)} title="Establecer / corregir costo" className="inline-flex items-center justify-center rounded p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors">
                                        <Coins className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                    <button onClick={() => openDetalle(row)} title="Ver ficha (kardex y compras)" className="inline-flex items-center justify-center rounded p-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors">
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => openStock(row)} title="Ver stock en almacenes" className="inline-flex items-center justify-center rounded p-1 text-sky-600 hover:text-sky-700 hover:bg-sky-50 transition-colors">
                                      <Boxes className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                      Mostrando <span className="font-medium">{from}–{to}</span> de <span className="font-medium">{filtered.length}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1} className="h-8 w-8 p-0" title="Anterior">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium text-gray-700 min-w-[80px] text-center">{currentPage} / {totalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages} className="h-8 w-8 p-0" title="Siguiente">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </TooltipProvider>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Crear material */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear material</DialogTitle>
          </DialogHeader>
          <MaterialForm
            onSubmit={addMaterial}
            onCancel={() => setIsAddOpen(false)}
            onClose={() => setIsAddOpen(false)}
            existingCategories={categories}
            existingUnits={units}
            showContableFields
          />
        </DialogContent>
      </Dialog>

      {/* Editar material */}
      <Dialog open={isEditOpen} onOpenChange={(o) => { setIsEditOpen(o); if (!o) setEditingMaterial(null) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar material</DialogTitle>
          </DialogHeader>
          {editingMaterial && (
            <MaterialForm
              key={`edit-${editingMaterial.codigo}-${categories.length}`}
              initialData={editingMaterial}
              onSubmit={updateMaterial}
              onCancel={() => { setIsEditOpen(false); setEditingMaterial(null) }}
              onClose={() => { setIsEditOpen(false); setEditingMaterial(null) }}
              existingCategories={categories}
              existingUnits={units}
              isEditing
              showContableFields
              costoReadonly
            />
          )}
        </DialogContent>
      </Dialog>

      <MaterialContableDetalle
        open={isDetalleOpen}
        onOpenChange={(o) => { setIsDetalleOpen(o); if (!o) setDetalleMaterial(null) }}
        material={
          detalleMaterial
            ? {
                material_id: (detalleMaterial as any)._id || detalleMaterial.material_id || detalleMaterial.id,
                codigo: detalleMaterial.codigo,
                nombre: detalleMaterial.nombre,
                descripcion: detalleMaterial.descripcion,
                marca: detalleMaterial.marca_id ? marcaPorId.get(detalleMaterial.marca_id) : undefined,
                um: detalleMaterial.um,
                costo: detalleMaterial.costo,
                precio: detalleMaterial.precio,
                precio_instaladora: detalleMaterial.precio_instaladora,
                porciento_rebajable_venta: detalleMaterial.porciento_rebajable_venta,
              }
            : null
        }
      />

      <MaterialStockDialog
        open={isStockOpen}
        onOpenChange={(o) => { setIsStockOpen(o); if (!o) setStockMaterial(null) }}
        material={
          stockMaterial
            ? {
                material_id: (stockMaterial as any)._id || stockMaterial.material_id || stockMaterial.id,
                codigo: stockMaterial.codigo,
                nombre: stockMaterial.nombre,
                descripcion: stockMaterial.descripcion,
                um: stockMaterial.um,
              }
            : null
        }
      />

      <EstablecerCostoDialog
        open={isCostoOpen}
        onOpenChange={(o) => { setIsCostoOpen(o); if (!o) setCostoMaterial(null) }}
        material={costoMaterial}
        onSaved={() => { void refetch() }}
      />

      <Toaster />
    </div>
  )
}
