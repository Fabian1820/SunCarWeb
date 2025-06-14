"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, X } from "lucide-react"
import type { Brigade } from "@/lib/brigade-types"

interface WorkerFormProps {
  onSubmit: (worker: any) => void
  onCancel: () => void
  brigades: Brigade[]
}

export function WorkerForm({ onSubmit, onCancel, brigades }: WorkerFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    role: "",
    brigadeId: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido"
    }

    if (!formData.role) {
      newErrors.role = "Selecciona un rol"
    }

    if (formData.role === "trabajador" && !formData.brigadeId) {
      newErrors.brigadeId = "Selecciona una brigada para el trabajador"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="worker-name" className="text-sm font-medium text-gray-700 mb-2 block">
            Nombre Completo *
          </Label>
          <Input
            id="worker-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nombre completo de la persona"
            className={errors.name ? "border-red-300" : ""}
          />
          {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <Label htmlFor="worker-role" className="text-sm font-medium text-gray-700 mb-2 block">
            Rol *
          </Label>
          <Select
            value={formData.role}
            onValueChange={(value) => setFormData({ ...formData, role: value, brigadeId: "" })}
          >
            <SelectTrigger className={errors.role ? "border-red-300" : ""}>
              <SelectValue placeholder="Seleccionar rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jefe">Jefe de Brigada (crear nueva brigada)</SelectItem>
              <SelectItem value="trabajador">Trabajador (agregar a brigada existente)</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && <p className="text-red-600 text-sm mt-1">{errors.role}</p>}
        </div>

        {formData.role === "trabajador" && (
          <div>
            <Label htmlFor="brigade-select" className="text-sm font-medium text-gray-700 mb-2 block">
              Brigada *
            </Label>
            <Select
              value={formData.brigadeId}
              onValueChange={(value) => setFormData({ ...formData, brigadeId: value })}
            >
              <SelectTrigger className={errors.brigadeId ? "border-red-300" : ""}>
                <SelectValue placeholder="Seleccionar brigada" />
              </SelectTrigger>
              <SelectContent>
                {brigades
                  .filter((b) => b.isActive)
                  .map((brigade) => (
                    <SelectItem key={brigade.id} value={brigade.id}>
                      {brigade.name} - {brigade.leader.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.brigadeId && <p className="text-red-600 text-sm mt-1">{errors.brigadeId}</p>}
          </div>
        )}

        <div>
          <Label htmlFor="worker-phone" className="text-sm font-medium text-gray-700 mb-2 block">
            Teléfono
          </Label>
          <Input
            id="worker-phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="300-123-4567"
          />
        </div>

        <div>
          <Label htmlFor="worker-email" className="text-sm font-medium text-gray-700 mb-2 block">
            Email
          </Label>
          <Input
            id="worker-email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="persona@empresa.com"
          />
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
          {formData.role === "jefe" ? "Crear Brigada" : "Agregar a Brigada"}
        </Button>
      </div>
    </form>
  )
}
