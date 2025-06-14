"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, X, Plus, Minus } from "lucide-react"
import type { Brigade, BrigadeFormData } from "@/lib/brigade-types"

interface BrigadeFormProps {
  initialData?: Brigade
  onSubmit: (brigade: BrigadeFormData | Brigade) => void
  onCancel: () => void
  isEditing?: boolean
}

export function BrigadeForm({ initialData, onSubmit, onCancel, isEditing = false }: BrigadeFormProps) {
  const [formData, setFormData] = useState<BrigadeFormData>({
    name: initialData?.name || "",
    leaderName: initialData?.leader.name || "",
    leaderPhone: initialData?.leader.phone || "",
    leaderEmail: initialData?.leader.email || "",
    members: initialData?.members.map((m) => ({ name: m.name, phone: m.phone, email: m.email })) || [
      { name: "", phone: "", email: "" },
    ],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "El nombre de la brigada es requerido"
    }

    if (!formData.leaderName.trim()) {
      newErrors.leaderName = "El nombre del jefe es requerido"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    if (isEditing && initialData) {
      const updatedBrigade: Brigade = {
        ...initialData,
        name: formData.name,
        leader: {
          ...initialData.leader,
          name: formData.leaderName,
          phone: formData.leaderPhone,
          email: formData.leaderEmail,
        },
        members: formData.members
          .filter((m) => m.name.trim() !== "")
          .map((member, index) => ({
            id: initialData.members[index]?.id || Date.now().toString() + "_" + index,
            name: member.name,
            role: "trabajador" as const,
            phone: member.phone,
            email: member.email,
          })),
      }
      onSubmit(updatedBrigade)
    } else {
      onSubmit(formData)
    }
  }

  const addMember = () => {
    setFormData({
      ...formData,
      members: [...formData.members, { name: "", phone: "", email: "" }],
    })
  }

  const removeMember = (index: number) => {
    if (formData.members.length > 1) {
      setFormData({
        ...formData,
        members: formData.members.filter((_, i) => i !== index),
      })
    }
  }

  const updateMember = (index: number, field: string, value: string) => {
    const newMembers = [...formData.members]
    newMembers[index] = { ...newMembers[index], [field]: value }
    setFormData({ ...formData, members: newMembers })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Nombre de la Brigada */}
        <div>
          <Label htmlFor="brigade-name" className="text-sm font-medium text-gray-700 mb-2 block">
            Nombre de la Brigada *
          </Label>
          <Input
            id="brigade-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ej: Brigada Alpha"
            className={errors.name ? "border-red-300" : ""}
          />
          {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* Jefe de Brigada */}
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <h3 className="text-lg font-semibold text-orange-900 mb-4">Jefe de Brigada</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="leader-name" className="text-sm font-medium text-gray-700 mb-2 block">
                Nombre Completo *
              </Label>
              <Input
                id="leader-name"
                value={formData.leaderName}
                onChange={(e) => setFormData({ ...formData, leaderName: e.target.value })}
                placeholder="Nombre del jefe"
                className={errors.leaderName ? "border-red-300" : ""}
              />
              {errors.leaderName && <p className="text-red-600 text-sm mt-1">{errors.leaderName}</p>}
            </div>
            <div>
              <Label htmlFor="leader-phone" className="text-sm font-medium text-gray-700 mb-2 block">
                Teléfono
              </Label>
              <Input
                id="leader-phone"
                value={formData.leaderPhone}
                onChange={(e) => setFormData({ ...formData, leaderPhone: e.target.value })}
                placeholder="300-123-4567"
              />
            </div>
            <div>
              <Label htmlFor="leader-email" className="text-sm font-medium text-gray-700 mb-2 block">
                Email
              </Label>
              <Input
                id="leader-email"
                type="email"
                value={formData.leaderEmail}
                onChange={(e) => setFormData({ ...formData, leaderEmail: e.target.value })}
                placeholder="jefe@empresa.com"
              />
            </div>
          </div>
        </div>

        {/* Trabajadores */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-900">Trabajadores</h3>
            <Button
              type="button"
              onClick={addMember}
              variant="outline"
              size="sm"
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Trabajador
            </Button>
          </div>
          <div className="space-y-4">
            {formData.members.map((member, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3 bg-white rounded-lg border">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Nombre</Label>
                  <Input
                    value={member.name}
                    onChange={(e) => updateMember(index, "name", e.target.value)}
                    placeholder="Nombre del trabajador"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Teléfono</Label>
                  <Input
                    value={member.phone}
                    onChange={(e) => updateMember(index, "phone", e.target.value)}
                    placeholder="300-123-4567"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Email</Label>
                  <Input
                    type="email"
                    value={member.email}
                    onChange={(e) => updateMember(index, "email", e.target.value)}
                    placeholder="trabajador@empresa.com"
                  />
                </div>
                <div className="flex items-end">
                  {formData.members.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeMember(index)}
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
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
