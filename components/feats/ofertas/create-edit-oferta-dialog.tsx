"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Badge } from "@/components/shared/atom/badge"
import { FileUpload } from "@/components/shared/molecule/file-upload"
import {
  Plus,
  X,
  DollarSign,
  Image as ImageIcon,
  Package,
  Shield,
  Save,
  Loader2
} from "lucide-react"
import type { Oferta, CreateOfertaRequest, UpdateOfertaRequest } from "@/lib/api-types"
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

  // Estados del formulario - solo información básica y garantías
  const [formData, setFormData] = useState<CreateOfertaRequest>({
    descripcion: "",
    precio: 0,
    precio_cliente: null,
    imagen: null,
    garantias: []
  })

  const [nuevaGarantia, setNuevaGarantia] = useState("")
  const [saving, setSaving] = useState(false)

  // Cargar datos cuando se abre en modo edición
  useEffect(() => {
    if (isOpen && oferta) {
      setFormData({
        descripcion: oferta.descripcion,
        precio: oferta.precio,
        precio_cliente: oferta.precio_cliente || null,
        imagen: null, // No podemos pre-cargar un File desde URL
        garantias: [...oferta.garantias]
      })
    } else if (isOpen) {
      // Resetear formulario en modo creación
      setFormData({
        descripcion: "",
        precio: 0,
        precio_cliente: null,
        imagen: null,
        garantias: []
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

    // Validación opcional del precio cliente
    if (formData.precio_cliente !== null && formData.precio_cliente !== undefined && formData.precio_cliente <= 0) {
      toast.error("El precio cliente debe ser mayor a 0 si se especifica")
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
      toast.error("Error al guardar la oferta. Intenta de nuevo.")
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="precio-cliente">Precio Cliente (opcional)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="precio-cliente"
                      type="number"
                      placeholder="0.00"
                      value={formData.precio_cliente || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, precio_cliente: e.target.value ? parseFloat(e.target.value) : null }))}
                      className="pl-10"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              <FileUpload
                id="imagen"
                label="Imagen de la oferta"
                accept="image/*"
                value={formData.imagen}
                onChange={(file) => setFormData(prev => ({ ...prev, imagen: file }))}
                maxSizeInMB={10}
                showPreview={true}
                currentImageUrl={isEditMode && oferta?.imagen && !formData.imagen ? oferta.imagen : undefined}
                disabled={saving}
              />
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