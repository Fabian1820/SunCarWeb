"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Switch } from "@/components/shared/molecule/switch"
import { FileUpload } from "@/components/shared/molecule/file-upload"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Save, X, Loader2, CheckCircle2, AlertCircle, Package } from "lucide-react"
import type { CreateCategoryRequest, CreateMaterialRequest } from "@/lib/material-types"
import { useToast } from "@/hooks/use-toast"

interface CategoryFormProps {
  initialData?: {
    categoria: string
    foto?: string
    esVendible?: boolean
    materiales?: CreateMaterialRequest[]
  }
  onSubmit?: (data: CreateCategoryRequest) => void
  onCancel: () => void
  onClose?: () => void
  isEditing?: boolean
}

export function CategoryForm({
  initialData,
  onSubmit,
  onCancel,
  onClose,
  isEditing = false,
}: CategoryFormProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState<CreateCategoryRequest>({
    categoria: initialData?.categoria || "",
    foto: null,
    esVendible: initialData?.esVendible ?? true,
    materiales: initialData?.materiales || []
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newMaterial, setNewMaterial] = useState<CreateMaterialRequest>({
    codigo: "",
    descripcion: "",
    um: "",
    precio: 0
  })

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.categoria.trim()) {
      newErrors.categoria = "El nombre de la categoría es requerido"
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
      setError("Por favor completa todos los campos correctamente.")
      return
    }
    setIsSubmitting(true)
    try {
      if (onSubmit) {
        await onSubmit(formData)
        if (!isEditing) {
          setFormData({ categoria: "", foto: null, esVendible: true, materiales: [] })
        }
        if (onClose) onClose();
      }
    } catch (err: any) {
      const errorMessage = err.message || (isEditing ? "Error al actualizar la categoría" : "Error al guardar la categoría");
      setError(errorMessage);
      if (!isEditing) {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const addMaterial = () => {
    if (newMaterial.codigo.trim() && newMaterial.descripcion.trim() && newMaterial.um.trim()) {
      setFormData(prev => ({
        ...prev,
        materiales: [...prev.materiales, { ...newMaterial }]
      }))
      setNewMaterial({ codigo: "", descripcion: "", um: "", precio: 0 })
    }
  }

  const removeMaterial = (index: number) => {
    setFormData(prev => ({
      ...prev,
      materiales: prev.materiales.filter((_, i) => i !== index)
    }))
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="category-name" className="text-sm font-medium text-gray-700 mb-2 block">
              Nombre de la Categoría *
            </Label>
            <Input
              id="category-name"
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              placeholder="Ej: Lubricantes, Repuestos, etc."
              className={error && !formData.categoria ? "border-red-300" : ""}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="esVendible"
              checked={formData.esVendible}
              onCheckedChange={(checked) => setFormData({ ...formData, esVendible: checked })}
            />
            <Label htmlFor="esVendible" className="cursor-pointer">
              Es vendible
            </Label>
          </div>

          <FileUpload
            id="category-photo"
            label="Foto de la Categoría (opcional)"
            accept="image/*"
            value={formData.foto}
            onChange={(file) => setFormData({ ...formData, foto: file })}
            maxSizeInMB={10}
            showPreview={true}
            disabled={isSubmitting}
            currentImageUrl={isEditing && initialData?.foto && !formData.foto ? initialData.foto : undefined}
          />

          {/* Materiales opcionales */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Materiales (opcional)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label htmlFor="material-codigo" className="text-sm font-medium text-gray-700 mb-1 block">
                  Código
                </Label>
                <Input
                  id="material-codigo"
                  value={newMaterial.codigo}
                  onChange={(e) => setNewMaterial({ ...newMaterial, codigo: e.target.value })}
                  placeholder="Ej: ACE001"
                />
              </div>
              <div>
                <Label htmlFor="material-descripcion" className="text-sm font-medium text-gray-700 mb-1 block">
                  Descripción
                </Label>
                <Input
                  id="material-descripcion"
                  value={newMaterial.descripcion}
                  onChange={(e) => setNewMaterial({ ...newMaterial, descripcion: e.target.value })}
                  placeholder="Ej: Aceite sintético"
                />
              </div>
              <div>
                <Label htmlFor="material-um" className="text-sm font-medium text-gray-700 mb-1 block">
                  Unidad
                </Label>
                <Input
                  id="material-um"
                  value={newMaterial.um}
                  onChange={(e) => setNewMaterial({ ...newMaterial, um: e.target.value })}
                  placeholder="Ej: litro"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={addMaterial}
                  disabled={!newMaterial.codigo.trim() || !newMaterial.descripcion.trim() || !newMaterial.um.trim()}
                  className="w-full"
                >
                  Agregar
                </Button>
              </div>
            </div>

            {formData.materiales.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Materiales agregados:</h4>
                <div className="space-y-2">
                  {formData.materiales.map((material, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{material.codigo}</span>
                          <span className="text-sm text-gray-600">-</span>
                          <span className="text-sm">{material.descripcion}</span>
                          <span className="text-xs text-gray-500">({material.um})</span>
                          {material.precio && material.precio > 0 && (
                            <span className="text-xs text-green-600">${material.precio.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeMaterial(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            {isEditing ? "Actualizar" : "Crear"} Categoría
          </Button>
        </div>
      </form>
    </>
  )
}
