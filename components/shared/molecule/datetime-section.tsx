"use client"

import { useEffect } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Calendar, Clock, ChevronLeft, Save, CheckCircle } from "lucide-react"
import type { FormData } from "@/lib/types"

interface DateTimeSectionProps {
  formData: FormData
  setFormData: (data: FormData) => void
  onPrev: () => void
  onSave: () => void
}

export function DateTimeSection({ formData, setFormData, onPrev, onSave }: DateTimeSectionProps) {
  // Set current date and time as default
  useEffect(() => {
    if (!formData.dateTime.date || !formData.dateTime.time) {
      const now = new Date()
      const currentDate = now.toISOString().split("T")[0]
      const currentTime = now.toTimeString().slice(0, 5)

      setFormData({
        ...formData,
        dateTime: {
          date: formData.dateTime.date || currentDate,
          time: formData.dateTime.time || currentTime,
        },
      })
    }
  }, [])

  const updateDate = (date: string) => {
    setFormData({
      ...formData,
      dateTime: {
        ...formData.dateTime,
        date,
      },
    })
  }

  const updateTime = (time: string) => {
    setFormData({
      ...formData,
      dateTime: {
        ...formData.dateTime,
        time,
      },
    })
  }

  const setCurrentDateTime = () => {
    const now = new Date()
    const currentDate = now.toISOString().split("T")[0]
    const currentTime = now.toTimeString().slice(0, 5)

    setFormData({
      ...formData,
      dateTime: {
        date: currentDate,
        time: currentTime,
      },
    })
  }

  const formatDateTime = () => {
    if (formData.dateTime.date && formData.dateTime.time) {
      const date = new Date(`${formData.dateTime.date}T${formData.dateTime.time}`)
      return date.toLocaleString("es-CO", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    }
    return ""
  }

  const isValid = formData.dateTime.date !== "" && formData.dateTime.time !== ""

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-3 rounded-lg">
          <Calendar className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fecha y Hora del Trabajo</h2>
          <p className="text-gray-600">Registra cuándo se realizó la instalación</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Date and Time Inputs */}
        <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="work-date" className="text-base font-semibold text-indigo-900 mb-3 block">
                <Calendar className="inline h-4 w-4 mr-2" />
                Fecha del Trabajo *
              </Label>
              <Input
                id="work-date"
                type="date"
                value={formData.dateTime.date}
                onChange={(e) => updateDate(e.target.value)}
                className="bg-white border-indigo-300 focus:border-indigo-500"
              />
            </div>
            <div>
              <Label htmlFor="work-time" className="text-base font-semibold text-indigo-900 mb-3 block">
                <Clock className="inline h-4 w-4 mr-2" />
                Hora del Trabajo *
              </Label>
              <Input
                id="work-time"
                type="time"
                value={formData.dateTime.time}
                onChange={(e) => updateTime(e.target.value)}
                className="bg-white border-indigo-300 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              onClick={setCurrentDateTime}
              variant="outline"
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
            >
              <Clock className="mr-2 h-4 w-4" />
              Usar Fecha y Hora Actual
            </Button>
          </div>
        </div>

        {/* DateTime Preview */}
        {isValid && (
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Fecha y Hora Confirmada
            </h3>
            <p className="text-green-800 text-lg">{formatDateTime()}</p>
          </div>
        )}

        {/* Form Summary */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Formulario H-1114</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700">ID del Formulario:</p>
              <p className="text-gray-600">{formData.formId}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Jefe de Brigada:</p>
              <p className="text-gray-600">{formData.brigade.leader || "No especificado"}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Integrantes:</p>
              <p className="text-gray-600">{formData.brigade.members.filter((m) => m.trim() !== "").length}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Materiales:</p>
              <p className="text-gray-600">{formData.materials.length} tipos</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Ubicación:</p>
              <p className="text-gray-600">{formData.location.address ? "Especificada" : "No especificada"}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Fotografías:</p>
              <p className="text-gray-600">{formData.photos.length} fotos</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Distancia desde HQ:</p>
              <p className="text-gray-600">
                {formData.location.distanceFromHQ ? `${formData.location.distanceFromHQ} km` : "No calculada"}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Fecha y Hora:</p>
              <p className="text-gray-600">{isValid ? "Especificada" : "No especificada"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t">
        <Button onClick={onPrev} variant="outline">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Anterior: Fotos
        </Button>
        <Button
          onClick={onSave}
          disabled={!isValid}
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
        >
          <Save className="mr-2 h-4 w-4" />
          Guardar Formulario H-1114
        </Button>
      </div>
    </div>
  )
}
