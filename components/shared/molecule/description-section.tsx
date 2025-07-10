"use client"

import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { FileText, ArrowLeft, ArrowRight } from "lucide-react"
import type { FormData } from "@/lib/types"

interface DescriptionSectionProps {
  formData: FormData
  setFormData: (data: FormData) => void
  onNext?: () => void
  onPrev: () => void
  onSave: () => void
}

export function DescriptionSection({ formData, setFormData, onNext, onPrev, onSave }: DescriptionSectionProps) {
  const needsDescription = formData.serviceType === "mantenimiento" || formData.serviceType === "averia"

  const handleDescriptionChange = (description: string) => {
    setFormData({
      ...formData,
      description,
    })
  }

  const getServiceTypeLabel = () => {
    const labels = {
      mantenimiento: "Mantenimiento",
      averia: "Avería",
    }
    return labels[formData.serviceType as keyof typeof labels] || formData.serviceType
  }

  if (!needsDescription) {
    // Si no necesita descripción, ir directamente al siguiente paso o guardar
    if (onNext) {
      onNext()
    } else {
      onSave()
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="bg-green-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <FileText className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Descripción del Trabajo</h2>
        <p className="text-gray-600">
          Describe detalladamente el trabajo de {getServiceTypeLabel().toLowerCase()} realizado
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="description" className="text-sm font-medium text-gray-700 mb-2 block">
            Descripción del Trabajo *
          </Label>
          <Textarea
            id="description"
            placeholder={`Describe el trabajo de ${getServiceTypeLabel().toLowerCase()} realizado, incluyendo detalles específicos, problemas encontrados, soluciones aplicadas, etc.`}
            value={formData.description || ""}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            className="min-h-[120px]"
            required
          />
          <p className="text-sm text-gray-500 mt-1">Proporciona una descripción detallada del trabajo realizado</p>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Anterior
        </Button>

        <div className="flex space-x-3">
          {onNext ? (
            <Button
              onClick={onNext}
              disabled={!formData.description?.trim()}
              className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
            >
              Siguiente
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={onSave}
              disabled={!formData.description?.trim()}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              Guardar Reporte
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
