"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Save, X, Crown, Users, Eye, EyeOff } from "lucide-react"
import type { Brigade, BrigadeFormData } from "@/lib/brigade-types"

interface BrigadeFormProps {
  initialData?: Brigade
  onSubmit: (brigade: BrigadeFormData | Brigade) => void
  onCancel: () => void
  isEditing?: boolean
  existingWorkers?: any[] // Trabajadores existentes para seleccionar como jefe o integrantes
}

export function BrigadeForm({ initialData, onSubmit, onCancel, isEditing = false, existingWorkers = [] }: BrigadeFormProps) {
  const [formData, setFormData] = useState<BrigadeFormData>({
    leaderName: initialData?.leader.name || "",
    leaderCi: initialData?.leader.ci || "",
    leaderPhone: initialData?.leader.phone || "",
    leaderEmail: initialData?.leader.email || "",
    members: initialData?.members.map((m) => ({ name: m.name, ci: m.ci, phone: m.phone, email: m.email })) || [],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedJefe, setSelectedJefe] = useState('')
  const [selectedIntegrantes, setSelectedIntegrantes] = useState<string[]>([])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!selectedJefe) {
      newErrors.selectedJefe = "Debes seleccionar un jefe"
    }
    if (selectedIntegrantes.length === 0) {
      newErrors.selectedIntegrantes = "Debes seleccionar al menos un trabajador"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    const jefeSeleccionado = existingWorkers.find(w => w.CI === selectedJefe)
    if (jefeSeleccionado) {
      const brigadeData = {
        leaderName: jefeSeleccionado.nombre,
        leaderCi: jefeSeleccionado.CI,
        leaderPhone: jefeSeleccionado.telefono || '',
        leaderEmail: jefeSeleccionado.email || '',
        members: selectedIntegrantes.map(ci => {
          const worker = existingWorkers.find(w => w.CI === ci)
          return {
            name: worker?.nombre || '',
            ci: worker?.CI || '',
            phone: worker?.telefono || '',
            email: worker?.email || '',
          }
        })
      }
      onSubmit(brigadeData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Solo selección de jefe existente */}
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <h3 className="text-lg font-semibold text-orange-900 mb-4 flex items-center">
            <Crown className="h-5 w-5 mr-2" />
            Jefe de Brigada
          </h3>
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Seleccionar jefe existente *
            </Label>
            <select
              className={`border px-2 py-2 rounded w-full ${errors.selectedJefe ? 'border-red-300' : ''}`}
              value={selectedJefe}
              onChange={e => setSelectedJefe(e.target.value)}
            >
              <option value="">Seleccionar jefe</option>
              {existingWorkers.filter(w => w.tiene_contraseña).map((worker) => (
                <option key={worker.CI} value={worker.CI}>
                  {worker.nombre} ({worker.CI})
                </option>
              ))}
            </select>
            {errors.selectedJefe && <p className="text-red-600 text-sm mt-1">{errors.selectedJefe}</p>}
          </div>
        </div>

        {/* Integrantes */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Integrantes de la Brigada
          </h3>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Seleccionar trabajadores existentes *
          </Label>
          <div className="border rounded p-3 max-h-48 overflow-y-auto">
            {existingWorkers.filter(w => !w.tiene_contraseña).length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {existingWorkers.filter(w => !w.tiene_contraseña).map(w => (
                  <label key={w.id || w.CI} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedIntegrantes.includes(w.CI)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedIntegrantes([...selectedIntegrantes, w.CI])
                        } else {
                          setSelectedIntegrantes(selectedIntegrantes.filter(ci => ci !== w.CI))
                        }
                      }}
                    />
                    <span>{w.nombre} ({w.CI})</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No hay trabajadores disponibles para asignar</p>
            )}
          </div>
          {errors.selectedIntegrantes && <p className="text-red-600 text-sm mt-1">{errors.selectedIntegrantes}</p>}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
        >
          <Save className="mr-2 h-4 w-4" />
          {isEditing ? "Actualizar" : "Crear"} Brigada
        </Button>
      </div>
    </form>
  )
}
