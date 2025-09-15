"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shared/molecule/dialog"
import { Save, X, Plus, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import type { Material, MaterialFormData } from "@/lib/material-types"
import { useToast } from "@/hooks/use-toast"

interface MaterialFormProps {
  initialData?: Material
  onSubmit?: (material: Material | Omit<Material, "id">) => void
  onCancel: () => void
  onClose?: () => void
  existingCategories: string[]
  existingUnits: string[]
  isEditing?: boolean
}

export function MaterialForm({
  initialData,
  onSubmit,
  onCancel,
  onClose,
  existingCategories,
  existingUnits,
  isEditing = false,
}: MaterialFormProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState<MaterialFormData>({
    codigo: initialData?.codigo.toString() || "",
    categoria: initialData?.categoria || "",
    descripcion: initialData?.descripcion || "",
    um: initialData?.um || "",
  })
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false)
  const [isAddUnitDialogOpen, setIsAddUnitDialogOpen] = useState(false)
  const [newCategory, setNewCategory] = useState("")
  const [newUnit, setNewUnit] = useState("")
  const [localCategories, setLocalCategories] = useState(existingCategories)
  const [localUnits, setLocalUnits] = useState(existingUnits)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.codigo.trim()) {
      newErrors.codigo = "El código es requerido"
    } else if (isNaN(Number(formData.codigo))) {
      newErrors.codigo = "El código debe ser un número"
    }
    if (!formData.categoria) {
      newErrors.categoria = "Selecciona una categoría"
    }
    if (!formData.descripcion.trim()) {
      newErrors.descripcion = "La descripción es requerida"
    }
    if (!formData.um) {
      newErrors.um = "Selecciona una unidad de medida"
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
        await onSubmit({
          codigo: Number(formData.codigo),
          categoria: formData.categoria,
          descripcion: formData.descripcion,
          um: formData.um
        } as any)
        if (!isEditing) {
          setFormData({ codigo: "", categoria: "", descripcion: "", um: "" })
        }
        if (onClose) onClose();
      }
    } catch (err: any) {
      const errorMessage = err.message || (isEditing ? "Error al actualizar el material" : "Error al guardar el material");
      setError(errorMessage);
      // Solo mostrar toast si no es edición (el padre ya maneja los toasts para edición)
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

  const addNewCategory = async () => {
    if (newCategory.trim() && !localCategories.includes(newCategory.trim())) {
      setIsCreatingCategory(true)
      try {
        // Solo actualizar localmente; la creación real se maneja en el padre al guardar
        setLocalCategories([...localCategories, newCategory.trim()])
        setFormData({ ...formData, categoria: newCategory.trim() })
        setNewCategory("")
        setIsAddCategoryDialogOpen(false)
      } catch (err: any) {
        setError(err.message || "Error al crear la categoría")
      } finally {
        setIsCreatingCategory(false)
      }
    }
  }

  const addNewUnit = () => {
    if (newUnit.trim() && !localUnits.includes(newUnit.trim())) {
      const updatedUnits = [...localUnits, newUnit.trim()]
      setLocalUnits(updatedUnits)
      setFormData({ ...formData, um: newUnit.trim() })
      setNewUnit("")
      setIsAddUnitDialogOpen(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="material-codigo" className="text-sm font-medium text-gray-700 mb-2 block">
              Código del Material *
            </Label>
            <Input
              id="material-codigo"
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
              placeholder="Ej: 5401090096"
              className={error && !formData.codigo ? "border-red-300" : ""}
            />
          </div>
          <div>
            <Label htmlFor="material-categoria" className="text-sm font-medium text-gray-700 mb-2 block">
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
                        placeholder="Ej: ESTRUCTURAS"
                        disabled={isCreatingCategory}
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <Button type="button" variant="outline" onClick={() => setIsAddCategoryDialogOpen(false)} disabled={isCreatingCategory}>
                        Cancelar
                      </Button>
                      <Button type="button" onClick={addNewCategory} disabled={isCreatingCategory || !newCategory.trim()}>
                        {isCreatingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Agregar Categoría
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div>
            <Label htmlFor="material-descripcion" className="text-sm font-medium text-gray-700 mb-2 block">
              Descripción del Material *
            </Label>
            <Textarea
              id="material-descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Ej: Estructura para montaje de módulo fotovoltáico..."
              className={error && !formData.descripcion ? "border-red-300" : ""}
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="material-um" className="text-sm font-medium text-gray-700 mb-2 block">
              Unidad de Medida *
            </Label>
            <div className="flex space-x-2">
              <Select value={formData.um} onValueChange={(value) => setFormData({ ...formData, um: value })}>
                <SelectTrigger className={`flex-1 ${error && !formData.um ? "border-red-300" : ""}`}>
                  <SelectValue placeholder="Seleccionar unidad" />
                </SelectTrigger>
                <SelectContent>
                  {localUnits.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={isAddUnitDialogOpen} onOpenChange={setIsAddUnitDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar Nueva Unidad de Medida</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="new-unit" className="text-sm font-medium text-gray-700 mb-2 block">
                        Unidad de Medida
                      </Label>
                      <Input
                        id="new-unit"
                        value={newUnit}
                        onChange={(e) => setNewUnit(e.target.value)}
                        placeholder="Ej: u, m, kg, etc."
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <Button type="button" variant="outline" onClick={() => setIsAddUnitDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="button" onClick={addNewUnit} disabled={!newUnit.trim()}>
                        <Plus className="h-4 w-4" />
                        Agregar Unidad
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
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

