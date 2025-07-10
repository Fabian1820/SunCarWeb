"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sun, ChevronRight } from "lucide-react"
import type { FormData } from "@/lib/types"
import { SERVICE_TYPES } from "@/lib/types"

interface ServiceTypeSectionProps {
  formData: FormData
  setFormData: (data: FormData) => void
  onNext: () => void
}

export function ServiceTypeSection({ formData, setFormData, onNext }: ServiceTypeSectionProps) {
  const updateServiceType = (serviceType: string) => {
    setFormData({
      ...formData,
      serviceType,
    })
  }

  const getServiceTypeLabel = (value: string) => {
    return SERVICE_TYPES.find((type) => type.value === value)?.label || value
  }

  const isValid = formData.serviceType !== ""

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-3 rounded-lg">
          <Sun className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tipo de Servicio</h2>
          <p className="text-gray-600">Selecciona el tipo de servicio que se va a realizar</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Tipo de Servicio */}
        <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
          <Label htmlFor="service-type" className="text-base font-semibold text-orange-900 mb-3 block">
            Tipo de Servicio *
          </Label>
          <Select value={formData.serviceType} onValueChange={updateServiceType}>
            <SelectTrigger className="bg-white border-orange-300 focus:border-orange-500">
              <SelectValue placeholder="Seleccionar tipo de servicio" />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_TYPES.map((serviceType) => (
                <SelectItem key={serviceType.value} value={serviceType.value}>
                  {serviceType.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Descripción del servicio seleccionado */}
        {formData.serviceType && (
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3">Descripción del Servicio</h4>
            <div className="text-blue-800">
              {formData.serviceType === "inversion" && (
                <div>
                  <p className="font-medium mb-2">Inversión</p>
                  <p>
                    Instalación nueva de sistema de paneles solares, incluyendo todos los componentes necesarios para la
                    generación de energía solar.
                  </p>
                </div>
              )}
              {formData.serviceType === "mantenimiento" && (
                <div>
                  <p className="font-medium mb-2">Mantenimiento</p>
                  <p>
                    Revisión, limpieza y mantenimiento preventivo o correctivo de sistemas de paneles solares
                    existentes.
                  </p>
                </div>
              )}
              {formData.serviceType === "averia" && (
                <div>
                  <p className="font-medium mb-2">Avería</p>
                  <p>Reparación de fallas o problemas técnicos en sistemas de paneles solares ya instalados.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resumen */}
        {isValid && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2">Servicio Seleccionado</h4>
            <p className="text-green-800">
              <strong>Tipo:</strong> {getServiceTypeLabel(formData.serviceType)}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-6 border-t">
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
        >
          Siguiente: Brigada
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
