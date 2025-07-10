"use client"

import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Plus, Minus, Users, ChevronRight, ChevronLeft } from "lucide-react"
import type { FormData } from "@/lib/types"

interface BrigadeSectionProps {
  formData: FormData
  setFormData: (data: FormData) => void
  onNext: () => void
  onPrev?: () => void
}

export function BrigadeSection({ formData, setFormData, onNext, onPrev }: BrigadeSectionProps) {
  const addMember = () => {
    setFormData({
      ...formData,
      brigade: {
        ...formData.brigade,
        members: [...formData.brigade.members, ""],
      },
    })
  }

  const removeMember = (index: number) => {
    if (formData.brigade.members.length > 1) {
      const newMembers = formData.brigade.members.filter((_, i) => i !== index)
      setFormData({
        ...formData,
        brigade: {
          ...formData.brigade,
          members: newMembers,
        },
      })
    }
  }

  const updateMember = (index: number, value: string) => {
    const newMembers = [...formData.brigade.members]
    newMembers[index] = value
    setFormData({
      ...formData,
      brigade: {
        ...formData.brigade,
        members: newMembers,
      },
    })
  }

  const updateLeader = (value: string) => {
    setFormData({
      ...formData,
      brigade: {
        ...formData.brigade,
        leader: value,
      },
    })
  }

  const isValid =
    formData.brigade.leader.trim() !== "" && formData.brigade.members.some((member) => member.trim() !== "")

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 rounded-lg">
          <Users className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Identificación de Brigada</h2>
          <p className="text-gray-600">Registra el jefe de brigada y los integrantes del equipo</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Jefe de Brigada */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <Label htmlFor="leader" className="text-base font-semibold text-blue-900 mb-3 block">
            Jefe de Brigada *
          </Label>
          <Input
            id="leader"
            value={formData.brigade.leader}
            onChange={(e) => updateLeader(e.target.value)}
            placeholder="Nombre completo del jefe de brigada"
            className="bg-white border-blue-300 focus:border-blue-500"
          />
        </div>

        {/* Integrantes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold text-gray-900">Integrantes de la Brigada *</Label>
            <Button
              type="button"
              onClick={addMember}
              variant="outline"
              size="sm"
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Integrante
            </Button>
          </div>

          <div className="space-y-3">
            {formData.brigade.members.map((member, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="flex-1">
                  <Input
                    value={member}
                    onChange={(e) => updateMember(index, e.target.value)}
                    placeholder={`Integrante ${index + 1}`}
                    className="border-gray-300 focus:border-blue-500"
                  />
                </div>
                {formData.brigade.members.length > 1 && (
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
            ))}
          </div>
        </div>

        {/* Resumen */}
        {isValid && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2">Resumen de la Brigada</h4>
            <p className="text-green-800">
              <strong>Jefe:</strong> {formData.brigade.leader}
            </p>
            <p className="text-green-800">
              <strong>Integrantes:</strong> {formData.brigade.members.filter((m) => m.trim() !== "").length}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-6 border-t">
        {onPrev && (
          <Button onClick={onPrev} variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Anterior: Tipo de Servicio
          </Button>
        )}
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 ml-auto"
        >
          Siguiente: Materiales
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
