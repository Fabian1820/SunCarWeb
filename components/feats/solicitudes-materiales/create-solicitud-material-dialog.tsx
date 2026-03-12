"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import {
  Search,
  Plus,
  Trash2,
  Loader2,
  Package,
  AlertTriangle,
  X,
} from "lucide-react"
import { Badge } from "@/components/shared/atom/badge"
import {
  ClienteService,
  InventarioService,
  MaterialService,
  SolicitudMaterialService,
} from "@/lib/api-services"
import type { Almacen } from "@/lib/api-types"
import type {
  SolicitudMaterialCreateData,
  MaterialSugerido,
} from "@/lib/types/feats/solicitudes-materiales/solicitud-material-types"

interface MaterialRow {
  material_id: string
  codigo: string
  nombre: string
  descripcion: string
  um: string
  cantidad: number
  foto?: string
  sinVinculo?: boolean
}

interface CreateSolicitudMaterialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateSolicitudMaterialDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateSolicitudMaterialDialogProps) {
  // Client search
  const [clienteSearch, setClienteSearch] = useState("")
  const [clienteResults, setClienteResults] = useState<any[]>([])
  const [selectedCliente, setSelectedCliente] = useState<any | null>(null)
  const [clienteLoading, setClienteLoading] = useState(false)
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)

  // Materials
  const [materiales, setMateriales] = useState<MaterialRow[]>([])
  const [materialesSinVinculo, setMaterialesSinVinculo] = useState<string[]>([])
  const [loadingSugeridos, setLoadingSugeridos] = useState(false)

  // Material search for manual add
  const [materialSearch, setMaterialSearch] = useState("")
  const [materialResults, setMaterialResults] = useState<any[]>([])
  const [materialSearchLoading, setMaterialSearchLoading] = useState(false)
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false)

  // All materials (catalog)
  const [allMaterials, setAllMaterials] = useState<any[]>([])

  // Almacenes
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [selectedAlmacenId, setSelectedAlmacenId] = useState("")
  const [almacenesLoading, setAlmacenesLoading] = useState(false)

  // Submit
  const [submitting, setSubmitting] = useState(false)

  // Load almacenes and materials catalog when dialog opens
  useEffect(() => {
    if (!open) return

    const loadData = async () => {
      setAlmacenesLoading(true)
      try {
        const [almacenesData, materialsData] = await Promise.all([
          InventarioService.getAlmacenes(),
          MaterialService.getAllMaterials(),
        ])
        setAlmacenes(Array.isArray(almacenesData) ? almacenesData : [])
        setAllMaterials(Array.isArray(materialsData) ? materialsData : [])
      } catch (error) {
        console.error("Error loading dialog data:", error)
      } finally {
        setAlmacenesLoading(false)
      }
    }

    loadData()
  }, [open])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setClienteSearch("")
      setClienteResults([])
      setSelectedCliente(null)
      setMateriales([])
      setMaterialesSinVinculo([])
      setSelectedAlmacenId("")
      setMaterialSearch("")
      setMaterialResults([])
    }
  }, [open])

  // Debounced client search
  useEffect(() => {
    if (!clienteSearch.trim() || selectedCliente) {
      setClienteResults([])
      setShowClienteDropdown(false)
      return
    }

    const handler = setTimeout(async () => {
      setClienteLoading(true)
      try {
        const data = await ClienteService.getClientes({ nombre: clienteSearch })
        setClienteResults(data.clients || [])
        setShowClienteDropdown(true)
      } catch {
        setClienteResults([])
      } finally {
        setClienteLoading(false)
      }
    }, 350)

    return () => clearTimeout(handler)
  }, [clienteSearch, selectedCliente])

  // Load suggested materials when client is selected
  const loadSugeridos = useCallback(async (clienteId: string) => {
    setLoadingSugeridos(true)
    try {
      const { materiales: sugeridos, materiales_sin_vinculo } =
        await SolicitudMaterialService.getMaterialesSugeridos(clienteId)

      const rows: MaterialRow[] = sugeridos.map((s: MaterialSugerido) => ({
        material_id: s.material_id || "",
        codigo: s.codigo || "",
        nombre: s.nombre || s.descripcion || s.codigo || "",
        descripcion: s.descripcion || s.nombre || s.codigo || "",
        um: s.um || "U",
        cantidad: s.cantidad || 0,
        foto: s.foto,
        sinVinculo: !s.material_id,
      }))

      setMateriales(rows)
      setMaterialesSinVinculo(materiales_sin_vinculo || [])
    } catch (error) {
      console.error("Error loading suggested materials:", error)
      setMateriales([])
    } finally {
      setLoadingSugeridos(false)
    }
  }, [])

  const handleSelectCliente = (cliente: any) => {
    setSelectedCliente(cliente)
    setClienteSearch(cliente.nombre || cliente.numero || "")
    setShowClienteDropdown(false)
    if (cliente.id || cliente._id) {
      loadSugeridos(cliente.id || cliente._id)
    }
  }

  const handleClearCliente = () => {
    setSelectedCliente(null)
    setClienteSearch("")
    setMateriales([])
    setMaterialesSinVinculo([])
  }

  // Material search for adding manually
  useEffect(() => {
    if (!materialSearch.trim()) {
      setMaterialResults([])
      setShowMaterialDropdown(false)
      return
    }

    const handler = setTimeout(() => {
      setMaterialSearchLoading(true)
      const term = materialSearch.toLowerCase()
      const filtered = allMaterials
        .filter(
          (m) =>
            (m.descripcion?.toLowerCase().includes(term) ||
              m.codigo?.toString().toLowerCase().includes(term)) &&
            !materiales.some((row) => row.material_id === (m.id || m._id))
        )
        .slice(0, 15)

      setMaterialResults(filtered)
      setShowMaterialDropdown(filtered.length > 0)
      setMaterialSearchLoading(false)
    }, 200)

    return () => clearTimeout(handler)
  }, [materialSearch, allMaterials, materiales])

  const handleAddMaterial = (material: any) => {
    const id = material.id || material._id || ""
    if (materiales.some((m) => m.material_id === id)) return

    setMateriales((prev) => [
      ...prev,
      {
        material_id: id,
        codigo: material.codigo?.toString() || "",
        nombre: material.nombre || material.descripcion || "",
        descripcion: material.descripcion || material.nombre || "",
        um: material.um || "U",
        cantidad: 1,
        foto: material.foto,
      },
    ])
    setMaterialSearch("")
    setShowMaterialDropdown(false)
  }

  const handleRemoveMaterial = (index: number) => {
    setMateriales((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCantidadChange = (index: number, value: string) => {
    const num = parseFloat(value)
    if (isNaN(num) || num < 0) return
    setMateriales((prev) =>
      prev.map((m, i) => (i === index ? { ...m, cantidad: num } : m))
    )
  }

  const handleSubmit = async () => {
    if (!selectedAlmacenId) return
    const validMaterials = materiales.filter(
      (m) => m.material_id && !m.sinVinculo
    )
    if (validMaterials.length === 0) return

    setSubmitting(true)
    try {
      const payload: SolicitudMaterialCreateData = {
        almacen_id: selectedAlmacenId,
        materiales: validMaterials.map((m) => ({
          material_id: m.material_id,
          cantidad: m.cantidad,
        })),
      }
      if (selectedCliente) {
        payload.cliente_id = selectedCliente.id || selectedCliente._id
      }

      await SolicitudMaterialService.createSolicitud(payload)
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error creating solicitud:", error)
      alert(error.message || "Error al crear la solicitud")
    } finally {
      setSubmitting(false)
    }
  }

  const hasSinVinculo = materiales.some((m) => m.sinVinculo)
  const validCount = materiales.filter(
    (m) => m.material_id && !m.sinVinculo
  ).length
  const canSubmit =
    selectedAlmacenId && validCount > 0 && !submitting && !hasSinVinculo

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            Nueva Solicitud de Materiales
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 1. Client Search */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Cliente{" "}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </Label>
            <div className="relative">
              {selectedCliente ? (
                <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-purple-50 border-purple-200">
                  <span className="text-sm font-medium text-purple-800 flex-1">
                    {selectedCliente.nombre || selectedCliente.numero}
                    {selectedCliente.numero && (
                      <span className="ml-2 text-purple-500 font-normal">
                        N° {selectedCliente.numero}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={handleClearCliente}
                    className="text-purple-400 hover:text-purple-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar cliente por nombre..."
                    value={clienteSearch}
                    onChange={(e) => setClienteSearch(e.target.value)}
                    className="pl-10"
                  />
                  {clienteLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                  )}
                </>
              )}
              {showClienteDropdown && clienteResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {clienteResults.map((c: any) => (
                    <button
                      key={c.id || c._id}
                      className="w-full text-left px-4 py-2 hover:bg-purple-50 text-sm"
                      onClick={() => handleSelectCliente(c)}
                    >
                      <span className="font-medium">{c.nombre}</span>
                      {c.numero && (
                        <span className="ml-2 text-gray-500">
                          N° {c.numero}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 2. Materials list */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Materiales</Label>

            {loadingSugeridos && (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando materiales sugeridos del cliente...
              </div>
            )}

            {materialesSinVinculo.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
                <div className="flex items-center gap-1.5 text-amber-700 font-medium mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  Materiales sin vínculo
                </div>
                <p className="text-amber-600 text-xs">
                  Los siguientes códigos no tienen un material válido asociado.
                  Deben seleccionarse manualmente:{" "}
                  {materialesSinVinculo.join(", ")}
                </p>
              </div>
            )}

            {/* Material rows */}
            {materiales.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left py-2 px-3 font-medium text-gray-700">
                        Material
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 w-20">
                        UM
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 w-28">
                        Cantidad
                      </th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {materiales.map((mat, idx) => (
                      <tr
                        key={idx}
                        className={`border-b last:border-b-0 ${
                          mat.sinVinculo ? "bg-red-50" : ""
                        }`}
                      >
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            {mat.foto ? (
                              <img
                                src={mat.foto}
                                alt={mat.nombre || mat.descripcion}
                                className="h-8 w-8 rounded object-cover border border-gray-200 flex-shrink-0"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                              />
                            ) : (
                              <div className="h-8 w-8 rounded bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                                <Package className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className={`font-medium leading-tight ${mat.sinVinculo ? "text-red-700" : "text-gray-900"}`}>
                                {mat.nombre || mat.descripcion || mat.codigo}
                              </p>
                              {mat.codigo && (
                                <p className="text-xs text-gray-400">{mat.codigo}</p>
                              )}
                              {mat.sinVinculo && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-red-100 text-red-700 border-red-300"
                                >
                                  Sin vínculo
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-gray-500">{mat.um}</td>
                        <td className="py-2 px-3">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={mat.cantidad}
                            onChange={(e) =>
                              handleCantidadChange(idx, e.target.value)
                            }
                            className="h-8 w-24"
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add material search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar material para agregar..."
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
                className="pl-10"
              />
              {materialSearchLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
              {showMaterialDropdown && materialResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {materialResults.map((m: any) => (
                    <button
                      key={m.id || m._id}
                      className="w-full text-left px-3 py-2 hover:bg-purple-50 text-sm flex items-center gap-2"
                      onClick={() => handleAddMaterial(m)}
                    >
                      {m.foto ? (
                        <img
                          src={m.foto}
                          alt={m.nombre || m.descripcion}
                          className="h-7 w-7 rounded object-cover border border-gray-200 flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                        />
                      ) : (
                        <div className="h-7 w-7 rounded bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                          <Package className="h-3 w-3 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{m.nombre || m.descripcion}</p>
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

            {materiales.length === 0 && !loadingSugeridos && (
              <p className="text-sm text-gray-400 text-center py-2">
                {selectedCliente
                  ? "No se encontraron materiales sugeridos. Agregue materiales manualmente."
                  : "Seleccione un cliente para cargar sugeridos o agregue materiales manualmente."}
              </p>
            )}
          </div>

          {/* 3. Warehouse */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Almacén <span className="text-red-500">*</span>
            </Label>
            {almacenesLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando almacenes...
              </div>
            ) : (
              <Select
                value={selectedAlmacenId}
                onValueChange={setSelectedAlmacenId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un almacén" />
                </SelectTrigger>
                <SelectContent>
                  {almacenes.map((a) => (
                    <SelectItem key={a.id} value={a.id!}>
                      {a.nombre}
                      {a.codigo && ` (${a.codigo})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Solicitud ({validCount} materiales)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
