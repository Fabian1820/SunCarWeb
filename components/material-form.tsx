"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Save, X, Plus } from "lucide-react"
import type { Material } from "@/lib/types"

interface MaterialFormProps {
  initialData?: Material
  onSubmit: (material: Material | Omit<Material, "id">) => void
  onCancel: () => void
  existingTypes: string[]
  existingBrands: string[]
  isEditing?: boolean
}

export function MaterialForm({
  initialData,
  onSubmit,
  onCancel,
  existingTypes,
  existingBrands,
  isEditing = false,
}: MaterialFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    type: initialData?.type || "",
    brand: initialData?.brand || "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isAddTypeDialogOpen, setIsAddTypeDialogOpen] = useState(false)
  const [isAddBrandDialogOpen, setIsAddBrandDialogOpen] = useState(false)
  const [newType, setNewType] = useState("")
  const [newBrand, setNewBrand] = useState("")
  const [localTypes, setLocalTypes] = useState(existingTypes)
  const [localBrands, setLocalBrands] = useState(existingBrands)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido"
    }

    if (!formData.type) {
      newErrors.type = "Selecciona un tipo de material"
    }

    if (!formData.brand) {
      newErrors.brand = "Selecciona una marca"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    if (isEditing && initialData) {
      onSubmit({
        ...initialData,
        ...formData,
      })
    } else {
      onSubmit(formData)
    }
  }

  const addNewType = () => {
    if (newType.trim() && !localTypes.includes(newType.trim())) {
      const updatedTypes = [...localTypes, newType.trim()]
      setLocalTypes(updatedTypes)
      setFormData({ ...formData, type: newType.trim() })
      setNewType("")
      setIsAddTypeDialogOpen(false)
    }
  }

  const addNewBrand = () => {
    if (newBrand.trim() && !localBrands.includes(newBrand.trim())) {
      const updatedBrands = [...localBrands, newBrand.trim()]
      setLocalBrands(updatedBrands)
      setFormData({ ...formData, brand: newBrand.trim() })
      setNewBrand("")
      setIsAddBrandDialogOpen(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="material-name" className="text-sm font-medium text-gray-700 mb-2 block">
              Nombre del Material *
            </Label>
            <Input
              id="material-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Panel Solar 450W"
              className={errors.name ? "border-red-300" : ""}
            />
            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="material-type" className="text-sm font-medium text-gray-700 mb-2 block">
              Tipo de Material *
            </Label>
            <div className="flex space-x-2">
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className={`flex-1 ${errors.type ? "border-red-300" : ""}`}>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {localTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={isAddTypeDialogOpen} onOpenChange={setIsAddTypeDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Agregar Nuevo Tipo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      placeholder="Nombre del nuevo tipo"
                      onKeyPress={(e) => e.key === "Enter" && addNewType()}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsAddTypeDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="button" onClick={addNewType}>
                        Agregar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {errors.type && <p className="text-red-600 text-sm mt-1">{errors.type}</p>}
          </div>

          <div>
            <Label htmlFor="material-brand" className="text-sm font-medium text-gray-700 mb-2 block">
              Marca *
            </Label>
            <div className="flex space-x-2">
              <Select value={formData.brand} onValueChange={(value) => setFormData({ ...formData, brand: value })}>
                <SelectTrigger className={`flex-1 ${errors.brand ? "border-red-300" : ""}`}>
                  <SelectValue placeholder="Seleccionar marca" />
                </SelectTrigger>
                <SelectContent>
                  {localBrands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={isAddBrandDialogOpen} onOpenChange={setIsAddBrandDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Agregar Nueva Marca</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      placeholder="Nombre de la nueva marca"
                      onKeyPress={(e) => e.key === "Enter" && addNewBrand()}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsAddBrandDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="button" onClick={addNewBrand}>
                        Agregar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {errors.brand && <p className="text-red-600 text-sm mt-1">{errors.brand}</p>}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
          >
            <Save className="mr-2 h-4 w-4" />
            {isEditing ? "Actualizar" : "Agregar"} Material
          </Button>
        </div>
      </form>
    </>
  )
}
