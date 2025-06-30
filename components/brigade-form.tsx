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
    leaderName: initialData?.leader.name || "",
    leaderCi: initialData?.leader.ci || "",
    leaderPhone: initialData?.leader.phone || "",
    leaderEmail: initialData?.leader.email || "",
    members: initialData?.members.map((m) => ({ name: m.name, ci: m.ci, phone: m.phone, email: m.email })) || [
      { name: "", ci: "", phone: "", email: "" },
    ],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.leaderName.trim()) {
      newErrors.leaderName = "El nombre del jefe es requerido"
    }
    if (!formData.leaderCi.trim()) {
      newErrors.leaderCi = "El CI del jefe es requerido"
    }
    formData.members.forEach((m, idx) => {
      if (!m.name.trim()) {
        newErrors[`memberName_${idx}`] = "El nombre del trabajador es requerido"
      }
      if (!m.ci.trim()) {
        newErrors[`memberCi_${idx}`] = "El CI del trabajador es requerido"
      }
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    if (isEditing && initialData) {
      const updatedBrigade: Brigade = {
        ...initialData,
        leader: {
          ...initialData.leader,
          name: formData.leaderName,
          ci: formData.leaderCi,
          phone: formData.leaderPhone,
          email: formData.leaderEmail,
        },
        members: formData.members
          .filter((m) => m.name.trim() !== "" && m.ci.trim() !== "")
          .map((member, index) => ({
            id: initialData.members[index]?.id || Date.now().toString() + "_" + index,
            name: member.name,
            ci: member.ci,
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
      members: [...formData.members, { name: "", ci: "", phone: "", email: "" }],
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
        {/* Jefe de Brigada */}
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <h3 className="text-lg font-semibold text-orange-900 mb-4">Jefe de Brigada</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="leader-ci" className="text-sm font-medium text-gray-700 mb-2 block">
                Carnet de Identidad (CI) *
              </Label>
              <Input
                id="leader-ci"
                value={formData.leaderCi}
                onChange={(e) => setFormData({ ...formData, leaderCi: e.target.value })}
                placeholder="CI del jefe"
                className={errors.leaderCi ? "border-red-300" : ""}
              />
              {errors.leaderCi && <p className="text-red-600 text-sm mt-1">{errors.leaderCi}</p>}
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
              <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-white rounded-lg border">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Nombre *</Label>
                  <Input
                    value={member.name}
                    onChange={(e) => updateMember(index, "name", e.target.value)}
                    placeholder="Nombre del trabajador"
                    className={errors[`memberName_${index}`] ? "border-red-300" : ""}
                  />
                  {errors[`memberName_${index}`] && <p className="text-red-600 text-sm mt-1">{errors[`memberName_${index}`]}</p>}
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Carnet de Identidad (CI) *</Label>
                  <Input
                    value={member.ci}
                    onChange={(e) => updateMember(index, "ci", e.target.value)}
                    placeholder="CI del trabajador"
                    className={errors[`memberCi_${index}`] ? "border-red-300" : ""}
                  />
                  {errors[`memberCi_${index}`] && <p className="text-red-600 text-sm mt-1">{errors[`memberCi_${index}`]}</p>}
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
