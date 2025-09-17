"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Badge } from "@/components/shared/atom/badge"
import {
  Plus,
  X,
  Trash2,
  DollarSign,
  Image as ImageIcon,
  Package,
  Shield,
  Save,
  Loader2
} from "lucide-react"
import type { Oferta, CreateOfertaRequest, UpdateOfertaRequest, ElementoOferta } from "@/lib/api-types"
import { toast } from "sonner"

interface CreateEditOfertaDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CreateOfertaRequest | UpdateOfertaRequest) => Promise<boolean>
  oferta?: Oferta | null // Si se pasa, es modo edición
  loading?: boolean
}

export default function CreateEditOfertaDialog({
  isOpen,
  onClose,
  onSave,
  oferta,
  loading = false
}: CreateEditOfertaDialogProps) {
  const isEditMode = !!oferta

  // Estados del formulario
  const [formData, setFormData] = useState<CreateOfertaRequest>({
    descripcion: "",
    precio: 0,
    imagen: "",
    garantias: [],
    elementos: []
  })

  const [nuevaGarantia, setNuevaGarantia] = useState("")
  const [nuevoElemento, setNuevoElemento] = useState<ElementoOferta>({
    categoria: "",
    foto: "",
    descripcion: "",
    cantidad: 1
  })

  const [saving, setSaving] = useState(false)

  // Cargar datos cuando se abre en modo edición
  useEffect(() => {
    if (isOpen && oferta) {
      setFormData({
        descripcion: oferta.descripcion,
        precio: oferta.precio,
        imagen: oferta.imagen || "",
        garantias: [...oferta.garantias],
        elementos: [...oferta.elementos]
      })
    } else if (isOpen) {
      // Resetear formulario en modo creación
      setFormData({
        descripcion: "",
        precio: 0,
        imagen: "",
        garantias: [],
        elementos: []
      })
    }
  }, [isOpen, oferta])

  const handleSave = async () => {
    // Validaciones básicas
    if (!formData.descripcion.trim()) {
      toast.error("La descripción es requerida")
      return
    }

    if (formData.precio <= 0) {
      toast.error("El precio debe ser mayor a 0")
      return
    }

    try {
      setSaving(true)
      const success = await onSave(formData)

      if (success) {
        toast.success(isEditMode ? "Oferta actualizada correctamente" : "Oferta creada correctamente")
        onClose()
      }
    } catch (error) {
      console.error("Error al guardar oferta:", error)
    } finally {
      setSaving(false)
    }
  }

  const agregarGarantia = () => {
    if (nuevaGarantia.trim() && !formData.garantias.includes(nuevaGarantia.trim())) {
      setFormData(prev => ({
        ...prev,
        garantias: [...prev.garantias, nuevaGarantia.trim()]
      }))
      setNuevaGarantia("")
    }
  }

  const eliminarGarantia = (index: number) => {
    setFormData(prev => ({
      ...prev,
      garantias: prev.garantias.filter((_, i) => i !== index)
    }))
  }

  const agregarElemento = () => {
    if (nuevoElemento.descripcion?.trim() || nuevoElemento.categoria?.trim()) {
      setFormData(prev => ({
        ...prev,
        elementos: [...prev.elementos, { ...nuevoElemento }]
      }))
      setNuevoElemento({
        categoria: "",
        foto: "",
        descripcion: "",
        cantidad: 1
      })
    }
  }

  const eliminarElemento = (index: number) => {
    setFormData(prev => ({
      ...prev,
      elementos: prev.elementos.filter((_, i) => i !== index)
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" />
            {isEditMode ? "Editar Oferta" : "Nueva Oferta"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información básica */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="descripcion">Descripción *</Label>
                <Textarea
                  id="descripcion"
                  placeholder="Describe la oferta..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <Label htmlFor="precio">Precio *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="precio"
                    type="number"
                    placeholder="0.00"
                    value={formData.precio || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, precio: parseFloat(e.target.value) || 0 }))}
                    className="pl-10"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="imagen">URL de Imagen</Label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="imagen"
                    placeholder="https://ejemplo.com/imagen.jpg"
                    value={formData.imagen || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, imagen: e.target.value }))}
                    className="pl-10"
                  />
                </div>
                {formData.imagen && (
                  <div className="mt-2 w-32 h-20 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={formData.imagen}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Garantías */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Garantías
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Agregar garantía..."
                  value={nuevaGarantia}
                  onChange={(e) => setNuevaGarantia(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && agregarGarantia()}
                />
                <Button onClick={agregarGarantia} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {formData.garantias.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.garantias.map((garantia, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {garantia}
                      <button
                        onClick={() => eliminarGarantia(index)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Elementos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-4 w-4" />
                Elementos de la Oferta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Formulario para agregar elemento */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <Input
                  placeholder="Categoría"
                  value={nuevoElemento.categoria || ""}
                  onChange={(e) => setNuevoElemento(prev => ({ ...prev, categoria: e.target.value }))}
                />
                <Input
                  placeholder="Descripción"
                  value={nuevoElemento.descripcion || ""}
                  onChange={(e) => setNuevoElemento(prev => ({ ...prev, descripcion: e.target.value }))}
                />
                <Input
                  type="number"
                  placeholder="Cantidad"
                  value={nuevoElemento.cantidad || ""}
                  onChange={(e) => setNuevoElemento(prev => ({ ...prev, cantidad: parseInt(e.target.value) || 1 }))}
                  min="1"
                />
                <Button onClick={agregarElemento} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </div>

              <Input
                placeholder="URL de foto (opcional)"
                value={nuevoElemento.foto || ""}
                onChange={(e) => setNuevoElemento(prev => ({ ...prev, foto: e.target.value }))}
              />

              {/* Lista de elementos */}
              {formData.elementos.length > 0 && (
                <div className="space-y-2">
                  {formData.elementos.map((elemento, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {elemento.categoria && (
                            <Badge variant="outline" className="text-xs">
                              {elemento.categoria}
                            </Badge>
                          )}
                          <span className="font-medium">
                            {elemento.descripcion || "Sin descripción"}
                          </span>
                          {elemento.cantidad && elemento.cantidad > 1 && (
                            <span className="text-gray-500 text-sm">x{elemento.cantidad}</span>
                          )}
                        </div>
                        {elemento.foto && (
                          <div className="mt-2 w-16 h-10 rounded overflow-hidden bg-gray-100">
                            <img
                              src={elemento.foto}
                              alt="Elemento"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarElemento(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditMode ? "Actualizar" : "Crear"} Oferta
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}