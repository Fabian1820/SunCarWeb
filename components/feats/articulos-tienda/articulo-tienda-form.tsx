"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shared/molecule/dialog"
import { Save, X, Plus, Loader2, CheckCircle2, AlertCircle, Package, Trash2 } from "lucide-react"
import { FileUpload } from "@/components/shared/molecule/file-upload"
import type { ArticuloTienda, ArticuloTiendaFormData, EspecificacionesSugeridas } from "@/lib/articulos-tienda-types"
import { useToast } from "@/hooks/use-toast"

const parseJsonField = (value: any): Record<string, any> => {
    if (value === null || value === undefined || value === '') return {}
    if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, any>

    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value)
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, any>
        } catch (error) {
            console.warn("[ArticuloTiendaForm] No se pudo parsear campo JSON:", value, error)
        }
    }

    return {}
}

interface ArticuloTiendaFormProps {
    initialData?: ArticuloTienda
    onSubmit?: (articulo: ArticuloTienda | Omit<ArticuloTienda, "id">) => void
    onCancel: () => void
    onClose?: () => void
    existingCategories: string[]
    isEditing?: boolean
}

export function ArticuloTiendaForm({
                                       initialData,
                                       onSubmit,
                                       onCancel,
                                       onClose,
                                       existingCategories,
                                       isEditing = false,
                                   }: ArticuloTiendaFormProps) {
    const { toast } = useToast()
    const parsedEspecificaciones = parseJsonField(initialData?.especificaciones)
    const parsedPrecioPorCantidad = parseJsonField(initialData?.precio_por_cantidad) as Record<string, number>
    const [formData, setFormData] = useState<ArticuloTiendaFormData>({
        categoria: initialData?.categoria || "",
        modelo: initialData?.modelo || "",
        descripcion_uso: initialData?.descripcion_uso || "",
        foto: initialData?.foto || "",
        unidad: initialData?.unidad || "pieza",
        precio: initialData?.precio || "",
        precio_por_cantidad: parsedPrecioPorCantidad,
        especificaciones: parsedEspecificaciones,
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [success, setSuccess] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [photoFile, setPhotoFile] = useState<File | null>(null)

    // Categorías predefinidas en español
    const predefinedCategories = [
        "Batería de Litio",
        "Inversor",
        "Otras Partes de Batería",
        "Controlador Solar",
        "Caja Combinadora",
        "Paneles"
    ]

    // Combinar categorías predefinidas con las existentes, eliminando duplicados
    const [localCategories, setLocalCategories] = useState(() => {
        const combined = [...predefinedCategories, ...existingCategories]
        return Array.from(new Set(combined)).sort()
    })
    const [newCategory, setNewCategory] = useState("")
    const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false)
    const [especificaciones, setEspecificaciones] = useState<Record<string, any>>(
        parsedEspecificaciones
    )
    const [newSpecKey, setNewSpecKey] = useState("")
    const [newSpecValue, setNewSpecValue] = useState("")
    const [newSpecType, setNewSpecType] = useState<"string" | "number" | "boolean">("string")
    const [precioPorCantidad, setPrecioPorCantidad] = useState<Record<string, number>>(
        parsedPrecioPorCantidad
    )
    const [newCantidad, setNewCantidad] = useState("")
    const [newPrecioCantidad, setNewPrecioCantidad] = useState("")

    // Actualizar categorías locales cuando cambien las existentes
    useEffect(() => {
        const combined = [...predefinedCategories, ...existingCategories]
        setLocalCategories(Array.from(new Set(combined)).sort())
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingCategories])

    // Sincronizar datos cuando cambia el artículo a editar
    useEffect(() => {
        if (!initialData) return

        const nextEspecificaciones = parseJsonField(initialData.especificaciones)
        const nextPrecioPorCantidad = parseJsonField(initialData.precio_por_cantidad) as Record<string, number>

        setFormData({
            categoria: initialData.categoria || "",
            modelo: initialData.modelo || "",
            descripcion_uso: initialData.descripcion_uso || "",
            foto: initialData.foto || "",
            unidad: initialData.unidad || "pieza",
            precio: initialData.precio || "",
            precio_por_cantidad: nextPrecioPorCantidad,
            especificaciones: nextEspecificaciones,
        })
        setEspecificaciones(nextEspecificaciones)
        setPrecioPorCantidad(nextPrecioPorCantidad)
        setPhotoFile(null)
    }, [initialData])

    // Atributos sugeridos para especificaciones
    const suggestedSpecs: Array<{ key: string; label: string; type: "string" | "number" | "boolean" }> = [
        { key: "capacidad", label: "Capacidad", type: "string" },
        { key: "voltaje", label: "Voltaje", type: "string" },
        { key: "ac_voltaje", label: "AC Voltaje", type: "string" },
        { key: "dc_voltaje_entrada", label: "DC Voltaje Entrada", type: "string" },
        { key: "peso_neto", label: "Peso Neto", type: "string" },
        { key: "peso_bruto", label: "Peso Bruto", type: "string" },
        { key: "tamano_embalaje", label: "Tamaño Embalaje", type: "string" },
        { key: "energia", label: "Energía", type: "string" },
        { key: "max_piezas_paralelo", label: "Max Piezas Paralelo", type: "string" },
        { key: "ciclos_vida", label: "Ciclos Vida", type: "string" },
        { key: "tamano_producto", label: "Tamaño Producto", type: "string" },
        { key: "garantia", label: "Garantía", type: "string" },
        { key: "comunicacion", label: "Comunicación", type: "string" },
        { key: "minima_cantidad_apilada", label: "Mínima Cantidad Apilada", type: "string" },
        { key: "energia_modulo", label: "Energía Módulo", type: "string" },
        { key: "con_bateria", label: "Con Batería", type: "boolean" },
        { key: "voltaje_puesta_marcha", label: "Voltaje Puesta Marcha", type: "string" },
        { key: "maxima_carga_actual", label: "Máxima Carga Actual", type: "string" },
        { key: "voltaje_maximo_entrada_solar", label: "Voltaje Máximo Entrada Solar", type: "string" },
        { key: "numero_maximo_rutas_entrada", label: "Número Máximo Rutas Entrada", type: "string" },
        { key: "voltaje_nominal_rama", label: "Voltaje Nominal Rama", type: "string" },
        { key: "corriente_nominal_rama", label: "Corriente Nominal Rama", type: "string" },
    ]

    const validateForm = () => {
        const newErrors: Record<string, string> = {}
        if (!formData.categoria.trim()) {
            newErrors.categoria = "La categoría es requerida"
        }
        if (!formData.modelo.trim()) {
            newErrors.modelo = "El modelo es requerido"
        }
        if (!formData.unidad) {
            newErrors.unidad = "Selecciona una unidad"
        }
        if (!formData.precio || (typeof formData.precio === 'number' && formData.precio <= 0) ||
            (typeof formData.precio === 'string' && (formData.precio === '' || parseFloat(formData.precio) <= 0))) {
            newErrors.precio = "El precio es requerido y debe ser mayor a 0"
        }
        setError(null)
        return Object.keys(newErrors).length === 0 ? null : newErrors
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSuccess(null)
        setError(null)
        const errors = validateForm()
        if (errors) {
            setError("Por favor completa todos los campos requeridos correctamente.")
            return
        }
        setIsSubmitting(true)
        try {
            if (onSubmit) {
                const precio = typeof formData.precio === 'string' ? parseFloat(formData.precio) : formData.precio

                const articuloData: any = {
                    categoria: formData.categoria,
                    modelo: formData.modelo,
                    unidad: formData.unidad as "pieza" | "set",
                    precio: precio,
                }

                // ✅ descripcion_uso: enviar string (vacío para eliminar, valor para actualizar)
                if (formData.descripcion_uso !== undefined) {
                    articuloData.descripcion_uso = formData.descripcion_uso || ''
                }

                // ✅ foto: solo si hay archivo nuevo
                if (photoFile) {
                    articuloData.foto = photoFile
                }

                // ✅ En modo EDICIÓN: siempre enviar especificaciones y precio_por_cantidad
                // (vacío {} para eliminar, con contenido para actualizar)
                if (isEditing) {
                    // Siempre enviar, incluso si están vacíos (para permitir eliminación)
                    articuloData.especificaciones = especificaciones
                    articuloData.precio_por_cantidad = precioPorCantidad
                    console.log('[Form] Modo edición - Enviando especificaciones:', especificaciones)
                    console.log('[Form] Modo edición - Enviando precio_por_cantidad:', precioPorCantidad)
                } else {
                    // ✅ En modo CREACIÓN: solo enviar si tienen contenido
                    if (Object.keys(especificaciones).length > 0) {
                        articuloData.especificaciones = especificaciones
                    }
                    if (Object.keys(precioPorCantidad).length > 0) {
                        articuloData.precio_por_cantidad = precioPorCantidad
                    }
                }

                console.log('[Form] Datos a enviar:', articuloData)
                await onSubmit(articuloData)

                if (!isEditing) {
                    setFormData({ categoria: "", modelo: "", descripcion_uso: "", foto: "", unidad: "pieza", precio: "", precio_por_cantidad: {}, especificaciones: {} })
                    setEspecificaciones({})
                    setPrecioPorCantidad({})
                    setPhotoFile(null)
                }
                if (onClose) onClose()
            }
        } catch (err: any) {
            const errorMessage = err.message || (isEditing ? "Error al actualizar el artículo" : "Error al guardar el artículo")
            setError(errorMessage)
            if (!isEditing) {
                toast({
                    title: "Error",
                    description: errorMessage,
                    variant: "destructive",
                })
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const addNewCategory = () => {
        if (newCategory.trim() && !localCategories.includes(newCategory.trim())) {
            const trimmedCategory = newCategory.trim()
            setLocalCategories([...localCategories, trimmedCategory])
            setFormData({ ...formData, categoria: trimmedCategory })
            setNewCategory("")
            setIsAddCategoryDialogOpen(false)
        }
    }

    const addPrecioPorCantidad = () => {
        const cantidad = newCantidad.trim()
        const precio = parseFloat(newPrecioCantidad)

        if (cantidad && !isNaN(precio) && precio > 0) {
            setPrecioPorCantidad({ ...precioPorCantidad, [cantidad]: precio })
            setNewCantidad("")
            setNewPrecioCantidad("")
        }
    }

    const removePrecioPorCantidad = (cantidad: string) => {
        const newPrecios = { ...precioPorCantidad }
        delete newPrecios[cantidad]
        setPrecioPorCantidad(newPrecios)
    }

    const addSpecification = () => {
        if (newSpecKey.trim()) {
            let value: any = newSpecValue
            if (newSpecType === "number") {
                value = parseFloat(newSpecValue) || 0
            } else if (newSpecType === "boolean") {
                value = newSpecValue.toLowerCase() === "true" || newSpecValue === "1"
            }
            setEspecificaciones({ ...especificaciones, [newSpecKey.trim()]: value })
            setNewSpecKey("")
            setNewSpecValue("")
        }
    }

    const removeSpecification = (key: string) => {
        const newSpecs = { ...especificaciones }
        delete newSpecs[key]
        setEspecificaciones(newSpecs)
    }

    const addSuggestedSpec = (spec: typeof suggestedSpecs[0]) => {
        if (!especificaciones[spec.key]) {
            setEspecificaciones({ ...especificaciones, [spec.key]: "" })
        }
    }

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="articulo-categoria" className="text-sm font-medium text-gray-700 mb-2 block">
                            Categoría *
                        </Label>
                        <div className="flex space-x-2">
                            <Select value={formData.categoria} onValueChange={(value) => setFormData({ ...formData, categoria: value })}>
                                <SelectTrigger className={`flex-1 ${error && !formData.categoria ? "border-red-300" : ""}`}>
                                    <SelectValue placeholder="Seleccionar categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    {localCategories.map((category, idx) => (
                                        <SelectItem key={category || idx} value={category}>
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button type="button" variant="outline" size="sm">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Agregar Nueva Categoría</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="new-category" className="text-sm font-medium text-gray-700 mb-2 block">
                                                Nombre de la Categoría
                                            </Label>
                                            <Input
                                                id="new-category"
                                                value={newCategory}
                                                onChange={(e) => setNewCategory(e.target.value)}
                                                placeholder="Ej: Inversores"
                                            />
                                        </div>
                                        <div className="flex justify-end space-x-3">
                                            <Button type="button" variant="outline" onClick={() => setIsAddCategoryDialogOpen(false)}>
                                                Cancelar
                                            </Button>
                                            <Button type="button" onClick={addNewCategory} disabled={!newCategory.trim()}>
                                                <Plus className="h-4 w-4" />
                                                Agregar Categoría
                                            </Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="articulo-modelo" className="text-sm font-medium text-gray-700 mb-2 block">
                            Modelo *
                        </Label>
                        <Input
                            id="articulo-modelo"
                            value={formData.modelo}
                            onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                            placeholder="Ej: GH-IH Style 12,5A 5000W"
                            className={error && !formData.modelo ? "border-red-300" : ""}
                        />
                    </div>

                    <div>
                        <Label htmlFor="articulo-unidad" className="text-sm font-medium text-gray-700 mb-2 block">
                            Unidad *
                        </Label>
                        <Select value={formData.unidad} onValueChange={(value) => setFormData({ ...formData, unidad: value as "pieza" | "set" })}>
                            <SelectTrigger className={`${error && !formData.unidad ? "border-red-300" : ""}`}>
                                <SelectValue placeholder="Seleccionar unidad" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pieza">Pieza</SelectItem>
                                <SelectItem value="set">Set</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="articulo-precio" className="text-sm font-medium text-gray-700 mb-2 block">
                            Precio *
                        </Label>
                        <Input
                            id="articulo-precio"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={formData.precio}
                            onChange={(e) => {
                                const value = e.target.value
                                setFormData({
                                    ...formData,
                                    precio: value === "" ? "" : parseFloat(value) || 0
                                })
                            }}
                            placeholder="0.00"
                            className={error && (!formData.precio || (typeof formData.precio === 'number' && formData.precio <= 0)) ? "border-red-300" : ""}
                        />
                    </div>

                    {/* Precios por Cantidad */}
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Precios por Cantidad (opcional)
                                </Label>
                                <p className="text-xs text-gray-500">Define precios especiales según la cantidad comprada</p>
                            </div>
                        </div>

                        {/* Precios existentes */}
                        {Object.keys(precioPorCantidad).length > 0 && (
                            <div className="space-y-2">
                                {Object.entries(precioPorCantidad)
                                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                    .map(([cantidad, precio]) => (
                                        <div key={cantidad} className="flex items-center space-x-2 p-2 bg-white rounded border">
                      <span className="text-sm font-medium text-gray-700 flex-1">
                        {cantidad} unidades:
                      </span>
                                            <span className="text-sm text-gray-600 flex-1">${precio.toFixed(2)}</span>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => removePrecioPorCantidad(cantidad)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                            </div>
                        )}

                        {/* Agregar nuevo precio por cantidad */}
                        <div className="flex gap-3">
                            <Input
                                placeholder="Cantidad (ej: 10)"
                                type="number"
                                min="1"
                                value={newCantidad}
                                onChange={(e) => setNewCantidad(e.target.value)}
                                className="flex-1"
                            />
                            <Input
                                placeholder="Precio (ej: 950.0)"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={newPrecioCantidad}
                                onChange={(e) => setNewPrecioCantidad(e.target.value)}
                                className="flex-1"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="default"
                                onClick={addPrecioPorCantidad}
                                disabled={!newCantidad.trim() || !newPrecioCantidad.trim() || parseFloat(newPrecioCantidad) <= 0}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="articulo-descripcion" className="text-sm font-medium text-gray-700 mb-2 block">
                            Descripción de Uso (opcional)
                        </Label>
                        <Textarea
                            id="articulo-descripcion"
                            value={formData.descripcion_uso || ""}
                            onChange={(e) => setFormData({ ...formData, descripcion_uso: e.target.value })}
                            placeholder="Descripción del uso del artículo..."
                            rows={3}
                        />
                    </div>

                    <div>
                        <FileUpload
                            id="articulo-foto"
                            label="Foto del Artículo (opcional)"
                            accept="image/*"
                            value={photoFile}
                            onChange={setPhotoFile}
                            maxSizeInMB={10}
                            showPreview={true}
                            currentImageUrl={formData.foto}
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Especificaciones */}
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Especificaciones (opcional)
                                </Label>
                                <p className="text-xs text-gray-500">Agrega atributos personalizados al artículo</p>
                            </div>
                        </div>

                        {/* Especificaciones existentes */}
                        {Object.keys(especificaciones).length > 0 && (
                            <div className="space-y-2">
                                {Object.entries(especificaciones).map(([key, value]) => (
                                    <div key={key} className="flex items-center space-x-2 p-2 bg-white rounded border">
                                        <span className="text-sm font-medium text-gray-700 flex-1">{key}:</span>
                                        <span className="text-sm text-gray-600 flex-1">{String(value)}</span>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeSpecification(key)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Agregar especificación sugerida */}
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-gray-600">Atributos sugeridos:</Label>
                            <div className="flex flex-wrap gap-2">
                                {suggestedSpecs
                                    .filter(spec => !especificaciones[spec.key])
                                    .slice(0, 6)
                                    .map((spec) => (
                                        <Button
                                            key={spec.key}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => addSuggestedSpec(spec)}
                                            className="text-xs"
                                        >
                                            <Plus className="h-3 w-3 mr-1" />
                                            {spec.label}
                                        </Button>
                                    ))}
                            </div>
                        </div>

                        {/* Agregar especificación personalizada */}
                        <div className="grid grid-cols-12 gap-2">
                            <Input
                                placeholder="Clave (ej: capacidad)"
                                value={newSpecKey}
                                onChange={(e) => setNewSpecKey(e.target.value)}
                                className="col-span-4"
                            />
                            <Select value={newSpecType} onValueChange={(value) => setNewSpecType(value as any)}>
                                <SelectTrigger className="col-span-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="string">Texto</SelectItem>
                                    <SelectItem value="number">Número</SelectItem>
                                    <SelectItem value="boolean">Booleano</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input
                                placeholder="Valor"
                                value={newSpecValue}
                                onChange={(e) => setNewSpecValue(e.target.value)}
                                className="col-span-4"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addSpecification}
                                disabled={!newSpecKey.trim()}
                                className="col-span-2"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center text-red-600 mt-2">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        <span>{error}</span>
                    </div>
                )}
                {success && !isEditing && (
                    <div className="flex items-center text-green-600 mt-2">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        <span>{success}</span>
                    </div>
                )}
                <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" onClick={onClose || onCancel} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Guardar
                    </Button>
                </div>
            </form>
        </>
    )
}

