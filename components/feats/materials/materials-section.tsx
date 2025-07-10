"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Package, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import type { FormData, Material } from "@/lib/types"

interface MaterialsSectionProps {
  formData: FormData
  setFormData: (data: FormData) => void
  onNext: () => void
  onPrev: () => void
}

export function MaterialsSection({ formData, setFormData, onNext, onPrev }: MaterialsSectionProps) {
  const [newMaterial, setNewMaterial] = useState({
    name: "",
    type: "",
    brand: "",
  })

  const addMaterial = () => {
    if (newMaterial.name.trim() && newMaterial.type && newMaterial.brand) {
      const material: Material = {
        id: Date.now().toString(),
        name: newMaterial.name.trim(),
        type: newMaterial.type,
        brand: newMaterial.brand,
      }

      setFormData({
        ...formData,
        materials: [...formData.materials, material],
      })

      setNewMaterial({ name: "", type: "", brand: "" })
    }
  }

  const removeMaterial = (id: string) => {
    setFormData({
      ...formData,
      materials: formData.materials.filter((m) => m.id !== id),
    })
  }

  const isValid = formData.materials.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 rounded-lg">
          <Package className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Materiales Utilizados</h2>
          <p className="text-gray-600">Registra todos los materiales empleados en la instalación</p>
        </div>
      </div>

      {/* Agregar Material */}
      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
        <h3 className="text-lg font-semibold text-green-900 mb-4">Agregar Material</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="material-name" className="text-sm font-medium text-gray-700 mb-2 block">
              Nombre del Material
            </Label>
            <Input
              id="material-name"
              value={newMaterial.name}
              onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
              placeholder="Ej: Panel Solar 450W"
              className="bg-white border-green-300"
            />
          </div>
          <div>
            <Label htmlFor="material-type" className="text-sm font-medium text-gray-700 mb-2 block">
              Tipo
            </Label>
            <Input
              id="material-type"
              value={newMaterial.type}
              onChange={(e) => setNewMaterial({ ...newMaterial, type: e.target.value })}
              placeholder="Ej: Panel Solar"
              className="bg-white border-green-300"
            />
          </div>
          <div>
            <Label htmlFor="material-brand" className="text-sm font-medium text-gray-700 mb-2 block">
              Marca
            </Label>
            <Input
              id="material-brand"
              value={newMaterial.brand}
              onChange={(e) => setNewMaterial({ ...newMaterial, brand: e.target.value })}
              placeholder="Ej: Canadian Solar"
              className="bg-white border-green-300"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={addMaterial}
              disabled={!newMaterial.name.trim() || !newMaterial.type || !newMaterial.brand}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de Materiales */}
      {formData.materials.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Materiales Registrados</h3>
          <div className="grid gap-3">
            {formData.materials.map((material) => (
              <div
                key={material.id}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <Package className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{material.name}</p>
                    <p className="text-sm text-gray-600">
                      {material.type} • {material.brand}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => removeMaterial(material.id)}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Resumen */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Resumen de Materiales</h4>
            <p className="text-blue-800">
              Total de tipos de materiales: <strong>{formData.materials.length}</strong>
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-6 border-t">
        <Button onClick={onPrev} variant="outline">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Anterior: Brigada
        </Button>
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
        >
          Siguiente: Ubicación
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
