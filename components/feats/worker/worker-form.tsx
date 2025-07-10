"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, X, Eye, EyeOff } from "lucide-react"
import type { Brigade } from "@/lib/brigade-types"

interface WorkerFormProps {
  onSubmit: (worker: any) => void
  onCancel: () => void
  brigades: Brigade[]
  workers: any[]
}

export function WorkerForm({ onSubmit, onCancel, brigades, workers }: WorkerFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    ci: "",
    brigadeId: "",
    password: "",
    integrantes: [] as string[],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido"
    }

    if (!formData.ci.trim()) {
      newErrors.ci = "El CI es requerido"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      password: value,
      brigadeId: value ? "" : prev.brigadeId,
      integrantes: value ? prev.integrantes : [],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    if (!formData.password) {
      // Trabajador normal
      if (formData.brigadeId) {
        onSubmit({
          ci: formData.ci,
          name: formData.name,
          brigadeId: formData.brigadeId,
          mode: 'trabajador_asignar',
        })
      } else {
        onSubmit({
          ci: formData.ci,
          name: formData.name,
          mode: 'trabajador',
        })
      }
    } else {
      // Jefe
      if (formData.integrantes.length > 0) {
        onSubmit({
          ci: formData.ci,
          name: formData.name,
          password: formData.password,
          integrantes: formData.integrantes,
          mode: 'jefe_brigada',
        })
      } else {
        onSubmit({
          ci: formData.ci,
          name: formData.name,
          password: formData.password,
          mode: 'jefe',
        })
      }
    }
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
            placeholder="Nombre completo del trabajador"
            className={errors.name ? "border-red-300" : ""}
          />
          {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
        </div>
        <div>
          <Label htmlFor="worker-ci" className="text-sm font-medium text-gray-700 mb-2 block">
            Carnet de Identidad (CI) *
          </Label>
          <Input
            id="worker-ci"
            value={formData.ci}
            onChange={(e) => setFormData({ ...formData, ci: e.target.value })}
            placeholder="CI del trabajador"
            className={errors.ci ? "border-red-300" : ""}
          />
          {errors.ci && <p className="text-red-600 text-sm mt-1">{errors.ci}</p>}
        </div>
        <div>
          <Label htmlFor="worker-password" className="text-sm font-medium text-gray-700 mb-2 block">
            Contraseña (solo para jefe, opcional)
          </Label>
          <div className="relative">
            <Input
              id="worker-password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handlePasswordChange}
              placeholder="Contraseña para jefe de brigada"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>
        {!formData.password && (
          <div>
            <Label htmlFor="brigade-select" className="text-sm font-medium text-gray-700 mb-2 block">
              Brigada (opcional)
            </Label>
            <Select
              value={formData.brigadeId}
              onValueChange={(value) => setFormData({ ...formData, brigadeId: value })}
            >
              <SelectTrigger className={errors.brigadeId ? "border-red-300" : ""}>
                <SelectValue placeholder="Seleccionar brigada" />
              </SelectTrigger>
              <SelectContent>
                {brigades.map((brigade) => (
                  <SelectItem key={brigade.id || brigade.leader.ci} value={brigade.id || brigade.leader.ci}>
                    Jefe: {brigade.leader.name} (CI: {brigade.leader.ci})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {formData.password && (
          <div>
            <Label htmlFor="integrantes-select" className="text-sm font-medium text-gray-700 mb-2 block">
              Integrantes de la brigada (opcional)
            </Label>
            <div className="border rounded p-3 max-h-48 overflow-y-auto">
              {workers.filter(w => !w.tiene_contraseña).length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {workers.filter(w => !w.tiene_contraseña).map(w => (
                    <label key={w.id || w.CI} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={formData.integrantes.includes(w.CI)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              integrantes: [...formData.integrantes, w.CI]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              integrantes: formData.integrantes.filter(ci => ci !== w.CI)
                            });
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">
                        <span className="font-medium">{w.nombre}</span>
                        <span className="text-gray-500 ml-1">({w.CI})</span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">
                  No hay trabajadores disponibles para asignar
                </p>
              )}
            </div>
            {formData.integrantes.length > 0 && (
              <p className="text-xs text-gray-600 mt-1">
                Seleccionados: {formData.integrantes.length} trabajador{formData.integrantes.length !== 1 ? 'es' : ''}
              </p>
            )}
          </div>
        )}
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
          Crear
        </Button>
      </div>
    </form>
  )
}
