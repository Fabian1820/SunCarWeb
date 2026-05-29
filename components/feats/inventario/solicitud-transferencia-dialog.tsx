"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { Badge } from "@/components/shared/atom/badge"
import {
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  ArrowRightLeft,
  Search,
  Package,
} from "lucide-react"
import type { Almacen, SolicitudTransferencia, StockItem } from "@/lib/inventario-types"
import type { Material } from "@/lib/material-types"
import { InventarioService } from "@/lib/api-services"

interface ItemRow {
  material_id: string
  material_codigo: string
  nombre: string
  descripcion: string
  um: string
  foto?: string
  cantidad: number
}

interface SolicitudTransferenciaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  almacenes: Almacen[]
  materiales: Material[]
  stock: StockItem[]
  currentAlmacenId?: string
  onSuccess: () => void
  solicitud?: SolicitudTransferencia
}

export function SolicitudTransferenciaDialog({
  open,
  onOpenChange,
  almacenes,
  materiales,
  stock,
  currentAlmacenId,
  onSuccess,
  solicitud,
}: SolicitudTransferenciaDialogProps) {
  const isEditMode = !!solicitud
  const [origenId, setOrigenId] = useState(currentAlmacenId || "")
  const [destinoId, setDestinoId] = useState("")
  const [items, setItems] = useState<ItemRow[]>([])
  const [motivo, setMotivo] = useState("")
  const [referencia, setReferencia] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Material search
  const [materialSearch, setMaterialSearch] = useState("")
  const [materialResults, setMaterialResults] = useState<Material[]>([])
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false)

  // Stock real por material_id obtenido directamente del API
  const [stockReal, setStockReal] = useState<Map<string, number>>(new Map())
  const [fetchingStockIds, setFetchingStockIds] = useState<Set<string>>(new Set())

  const fetchStockMaterial = useCallback(async (materialId: string, almacenId: string) => {
    if (!materialId || !almacenId) return
    setFetchingStockIds(prev => new Set(prev).add(materialId))
    try {
      const result = await InventarioService.getStock({ almacen_id: almacenId, material_id: materialId, limit: 1 })
      const cantidad = result.data.reduce((sum, item) => sum + (item.cantidad ?? 0), 0)
      setStockReal(prev => new Map(prev).set(materialId, cantidad))
    } catch {
      setStockReal(prev => new Map(prev).set(materialId, 0))
    } finally {
      setFetchingStockIds(prev => { const s = new Set(prev); s.delete(materialId); return s })
    }
  }, [])

  // Reset form when dialog opens
  useEffect(() => {
    if (!open) return

    if (solicitud) {
      const origen = solicitud.almacen_origen_id || ""
      setOrigenId(origen)
      setDestinoId(solicitud.almacen_destino_id || "")
      setMotivo(solicitud.motivo || "")
      setReferencia(solicitud.referencia || "")

      const buildRows = (src: SolicitudTransferencia): ItemRow[] =>
        src.items.map((item) => {
          const codigoStr = item.material_codigo != null ? String(item.material_codigo) : ""
          // Display lookup only. Backend normalizes material refs
          // (ObjectId / codigo / numero_serie) on its side, so material_id
          // can be passed through as-is to /inventario/stock.
          const mat =
            materiales.find((m) => m.id === item.material_id) ||
            (codigoStr ? materiales.find((m) => String(m.codigo) === codigoStr) : undefined)

          return {
            material_id: item.material_id,
            material_codigo: String(mat?.codigo ?? item.material_codigo ?? ""),
            nombre: mat?.nombre || mat?.descripcion || "",
            descripcion: mat?.descripcion || mat?.nombre || "",
            um: mat?.um || "U",
            foto: mat?.foto,
            cantidad: item.cantidad,
          }
        })

      const initialRows = buildRows(solicitud)
      setItems(initialRows)

      // Seed stockReal from any stock_disponible_actual already present
      // (in case the parent passed an enriched solicitud).
      const seedStock = new Map<string, number>()
      solicitud.items.forEach((item, idx) => {
        const v = item.stock_disponible_actual
        if (typeof v === "number") {
          seedStock.set(initialRows[idx].material_id, v)
        }
      })
      setStockReal(seedStock)
      setFetchingStockIds(new Set())

      // Fetch the enriched detail (backend computes live stock_disponible_actual
      // per item against almacen_origen_id). One request replaces N stock calls.
      let cancelled = false
      ;(async () => {
        try {
          const detail = await InventarioService.getSolicitudTransferenciaById(solicitud.id)
          if (cancelled || !detail) return
          const rows = buildRows(detail)
          setItems(rows)
          const map = new Map<string, number>()
          detail.items.forEach((item, idx) => {
            const v = item.stock_disponible_actual
            map.set(rows[idx].material_id, typeof v === "number" ? v : 0)
          })
          setStockReal(map)
        } catch (err) {
          // Fallback: if the enriched GET fails, query stock per item as before.
          if (cancelled) return
          console.warn("getSolicitudTransferenciaById failed, falling back to per-item stock fetch", err)
          if (origen) {
            for (const item of initialRows) {
              if (item.material_id) fetchStockMaterial(item.material_id, origen)
            }
          }
        }
      })()

      setError(null)
      setMaterialSearch("")
      setMaterialResults([])
      setShowMaterialDropdown(false)
      return () => {
        cancelled = true
      }
    } else {
      setOrigenId(currentAlmacenId || "")
      setDestinoId("")
      setItems([])
      setMotivo("")
      setReferencia("")
      setStockReal(new Map())
      setFetchingStockIds(new Set())
      setError(null)
      setMaterialSearch("")
      setMaterialResults([])
      setShowMaterialDropdown(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentAlmacenId, solicitud])

  // Re-fetch stock para todos los items cuando cambia el almacén origen
  useEffect(() => {
    if (!origenId || items.length === 0) return
    setStockReal(new Map())
    for (const item of items) {
      if (item.material_id) fetchStockMaterial(item.material_id, origenId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origenId])

  const getStockDisponible = (materialId: string) => {
    return stockReal.get(materialId) ?? 0
  }

  // Material search with debounce
  useEffect(() => {
    if (!materialSearch.trim()) {
      setMaterialResults([])
      setShowMaterialDropdown(false)
      return
    }

    const handler = setTimeout(() => {
      const term = materialSearch.toLowerCase()
      const filtered = materiales
        .filter(
          (m) =>
            (m.descripcion?.toLowerCase().includes(term) ||
              m.nombre?.toLowerCase().includes(term) ||
              m.codigo?.toString().toLowerCase().includes(term) ||
              m.numero_serie?.toLowerCase().includes(term)) &&
            !items.some((row) => row.material_id === m.id),
        )
        .slice(0, 15)

      setMaterialResults(filtered)
      setShowMaterialDropdown(filtered.length > 0)
    }, 200)

    return () => clearTimeout(handler)
  }, [materialSearch, materiales, items])

  const handleAddMaterial = (material: Material) => {
    const id = material.id || ""
    if (items.some((m) => m.material_id === id)) return

    setItems((prev) => [
      ...prev,
      {
        material_id: id,
        material_codigo: String(material.codigo || ""),
        nombre: material.nombre || material.descripcion || "",
        descripcion: material.descripcion || material.nombre || "",
        um: material.um || "U",
        foto: material.foto,
        cantidad: 1,
      },
    ])
    setMaterialSearch("")
    setShowMaterialDropdown(false)

    if (origenId) fetchStockMaterial(id, origenId)
  }

  const handleRemoveMaterial = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCantidadChange = (index: number, value: string) => {
    if (value === "") {
      setItems((prev) =>
        prev.map((m, i) => (i === index ? { ...m, cantidad: 0 } : m)),
      )
      return
    }
    const num = Number.parseInt(value, 10)
    if (Number.isNaN(num) || num < 0) return
    setItems((prev) =>
      prev.map((m, i) => (i === index ? { ...m, cantidad: num } : m)),
    )
  }

  const validate = (): boolean => {
    if (!origenId) {
      setError("Selecciona el almacén de origen")
      return false
    }
    if (!destinoId) {
      setError("Selecciona el almacén de destino")
      return false
    }
    if (origenId === destinoId) {
      setError("El almacén de origen y destino deben ser diferentes")
      return false
    }
    if (items.length === 0) {
      setError("Agrega al menos un material")
      return false
    }
    for (const item of items) {
      if (!item.cantidad || item.cantidad <= 0) {
        setError(`"${item.nombre || item.material_codigo}": la cantidad debe ser mayor a 0`)
        return false
      }
      const disponible = getStockDisponible(item.material_id)
      if (item.cantidad > disponible) {
        setError(
          `"${item.nombre || item.material_codigo}": solo hay ${disponible} disponibles en el almacén origen`,
        )
        return false
      }
    }
    setError(null)
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setIsSubmitting(true)
    setError(null)
    try {
      const payload = {
        almacen_origen_id: origenId,
        almacen_destino_id: destinoId,
        items: items.map((item) => ({
          material_id: item.material_id || item.material_codigo,
          cantidad: item.cantidad,
        })),
        motivo: motivo || undefined,
        referencia: referencia || undefined,
      }
      if (isEditMode && solicitud) {
        await InventarioService.updateSolicitudTransferencia(solicitud.id, payload)
      } else {
        await InventarioService.createSolicitudTransferencia(payload)
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditMode
            ? "Error al actualizar la solicitud"
            : "Error al crear la solicitud",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetAndClose = (value: boolean) => {
    if (!value) {
      setError(null)
    }
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-amber-600" />
            {isEditMode ? "Editar Solicitud de Traspaso" : "Solicitar Traspaso de Materiales"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Almacén Origen y Destino */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Almacén Origen <span className="text-red-500">*</span>
              </Label>
              <Select value={origenId} onValueChange={setOrigenId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar origen" />
                </SelectTrigger>
                <SelectContent>
                  {almacenes.map((a) => (
                    <SelectItem key={a.id} value={a.id || ""}>
                      {a.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Almacén Destino <span className="text-red-500">*</span>
              </Label>
              <Select value={destinoId} onValueChange={setDestinoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar destino" />
                </SelectTrigger>
                <SelectContent>
                  {almacenes
                    .filter((a) => a.id !== origenId)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id || ""}>
                        {a.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Materiales */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Materiales</Label>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Quitar todos
                </button>
              )}
            </div>

            {/* Items table */}
            {items.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left py-2 px-3 font-medium text-gray-700">
                        Material
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 w-24">
                        En stock
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 w-28">
                        Cantidad
                      </th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((mat, idx) => {
                      const disponible = getStockDisponible(mat.material_id)
                      const loadingStock = fetchingStockIds.has(mat.material_id)
                      const excede = !loadingStock && mat.cantidad > disponible
                      return (
                        <tr
                          key={idx}
                          className={`border-b last:border-b-0 ${excede ? "bg-red-50" : ""}`}
                        >
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              {mat.foto ? (
                                <img
                                  src={mat.foto}
                                  alt={mat.nombre || mat.descripcion}
                                  className="h-8 w-8 rounded object-cover border border-gray-200 flex-shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none"
                                  }}
                                />
                              ) : (
                                <div className="h-8 w-8 rounded bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                                  <Package className="h-4 w-4 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium leading-tight text-gray-900">
                                  {mat.nombre || mat.descripcion || mat.material_codigo}
                                </p>
                                {mat.material_codigo && (
                                  <p className="text-xs text-gray-400">
                                    {mat.material_codigo}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            {loadingStock ? (
                              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                            ) : (
                              <Badge
                                variant="outline"
                                className={
                                  excede
                                    ? "bg-red-100 text-red-700 border-red-300"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                }
                              >
                                {disponible}
                              </Badge>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              min="1"
                              max={loadingStock ? undefined : disponible}
                              step="1"
                              value={mat.cantidad === 0 ? "" : mat.cantidad}
                              onChange={(e) =>
                                handleCantidadChange(idx, e.target.value)
                              }
                              className={`h-8 w-24 ${excede ? "border-red-400" : ""}`}
                              placeholder="0"
                              disabled={loadingStock}
                            />
                          </td>
                          <td className="py-2 px-3">
                            <button
                              onClick={() => handleRemoveMaterial(idx)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Material search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar material para agregar..."
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
                className="pl-10"
              />
              {showMaterialDropdown && materialResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {materialResults.map((m) => (
                    <button
                      key={m.id}
                      className="w-full text-left px-3 py-2 hover:bg-amber-50 text-sm flex items-center gap-2"
                      onClick={() => handleAddMaterial(m)}
                    >
                      {m.foto ? (
                        <img
                          src={m.foto}
                          alt={m.nombre || m.descripcion}
                          className="h-7 w-7 rounded object-cover border border-gray-200 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none"
                          }}
                        />
                      ) : (
                        <div className="h-7 w-7 rounded bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                          <Package className="h-3 w-3 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {m.nombre || m.descripcion}
                        </p>
                        {m.codigo && (
                          <p className="text-xs text-gray-400">{m.codigo}</p>
                        )}
                      </div>
                      <Plus className="h-4 w-4 text-green-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {items.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-2">
                Busque y seleccione materiales para agregar al traspaso.
              </p>
            )}
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Motivo</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo del traspaso..."
              rows={2}
            />
          </div>

          {isEditMode && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Referencia</Label>
              <Input
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Referencia (opcional)"
              />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => resetAndClose(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || items.length === 0 || fetchingStockIds.size > 0}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRightLeft className="h-4 w-4 mr-2" />
              )}
              {isEditMode
                ? `Guardar cambios (${items.length})`
                : `Solicitar Traspaso (${items.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
