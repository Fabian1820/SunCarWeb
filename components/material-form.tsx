"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Save, X, Plus } from "lucide-react"
import type { Material, MaterialType, MaterialBrand } from "@/lib/types"

interface MaterialFormProps {
  initialData?: Material
  onSubmit: (material: Material | Omit<Material, "id">) => void
  onCancel: () => void
  materialTypes: MaterialType[]
  materialBrands: MaterialBrand[]
  onTypeAdded: (type: MaterialType) => void
  onBrandAdded: (brand: MaterialBrand) => void
  isEditing?: boolean
}

export function MaterialForm({
  initialData,
  onSubmit,
  onCancel,
  materialTypes,
  materialBrands,
  onTypeAdded,
  onBrandAdded,
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
  const [newTypeName, setNewTypeName] = useState("")
  const [newBrandName, setNewBrandName] = useState("")

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

  const handleAddType = async () => {
    if (!newTypeName.trim()) return

    try {
      const response = await fetch("/api/material-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTypeName.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        onTypeAdded(data.data)
        setFormData({ ...formData, type: data.data.name })
        setNewTypeName("")
        setIsAddTypeDialogOpen(false)
      } else {
        alert(data.error || "Error al agregar tipo")
      }
    } catch (error) {
      console.error("Error adding type:", error)
      alert("Error al agregar tipo")
    }
  }

  const handleAddBrand = async () => {
    if (!newBrandName.trim()) return

    try {
      const response = await fetch("/api/material-brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBrandName.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        onBrandAdded(data.data)
        setFormData({ ...formData, brand: data.data.name })
        setNewBrandName("")
        setIsAddBrandDialogOpen(false)
      } else {
        alert(data.error || "Error al agregar marca")
      }
    } catch (error) {
      console.error("Error adding brand:", error)
      alert("Error al agregar marca")
    }
  }

  return (
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
            placeholder="Ej: Panel Solar 450W Monocristalino"
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
                {materialTypes.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isAddTypeDialogOpen} onOpenChange={setIsAddTypeDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar Nuevo Tipo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new-type" className="text-sm font-medium text-gray-700 mb-2 block">
                      Nombre del Tipo
                    </Label>
                    <Input
                      id="new-type"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder="Ej: Cable THHN"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddTypeDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="button" onClick={handleAddType}>
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
                {materialBrands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.name}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isAddBrandDialogOpen} onOpenChange={setIsAddBrandDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar Nueva Marca</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new-brand" className="text-sm font-medium text-gray-700 mb-2 block">
                      Nombre de la Marca
                    </Label>
                    <Input
                      id="new-brand"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      placeholder="Ej: Nexans"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddBrandDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="button" onClick={handleAddBrand}>
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
  )
}
