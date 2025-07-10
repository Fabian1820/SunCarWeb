"use client"

import type React from "react"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Camera, Upload, Trash2, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react"
import type { FormData, Photo } from "@/lib/types"

interface PhotosSectionProps {
  formData: FormData
  setFormData: (data: FormData) => void
  onNext: () => void
  onPrev: () => void
}

export function PhotosSection({ formData, setFormData, onNext, onPrev }: PhotosSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const photo: Photo = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            file,
            preview: e.target?.result as string,
            description: "",
          }

          setFormData({
            ...formData,
            photos: [...formData.photos, photo],
          })
        }
        reader.readAsDataURL(file)
      }
    })

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removePhoto = (id: string) => {
    setFormData({
      ...formData,
      photos: formData.photos.filter((photo) => photo.id !== id),
    })
  }

  const updatePhotoDescription = (id: string, description: string) => {
    setFormData({
      ...formData,
      photos: formData.photos.map((photo) => (photo.id === id ? { ...photo, description } : photo)),
    })
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const isValid = formData.photos.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-gradient-to-r from-pink-500 to-pink-600 p-3 rounded-lg">
          <Camera className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fotografías del Trabajo</h2>
          <p className="text-gray-600">Adjunta fotos que documenten la instalación realizada</p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-pink-50 p-6 rounded-lg border border-pink-200">
        <div className="text-center">
          <div className="bg-pink-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Upload className="h-8 w-8 text-pink-600" />
          </div>
          <h3 className="text-lg font-semibold text-pink-900 mb-2">Subir Fotografías</h3>
          <p className="text-pink-700 mb-4">Selecciona múltiples imágenes para documentar el trabajo realizado</p>
          <Button
            type="button"
            onClick={triggerFileInput}
            className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700"
          >
            <Camera className="mr-2 h-4 w-4" />
            Seleccionar Fotos
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Photos Grid */}
      {formData.photos.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Fotos Adjuntadas ({formData.photos.length})</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {formData.photos.map((photo) => (
              <div key={photo.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="relative">
                  <img
                    src={photo.preview || "/placeholder.svg"}
                    alt="Foto del trabajo"
                    className="w-full h-48 object-cover"
                  />
                  <Button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4">
                  <Label htmlFor={`description-${photo.id}`} className="text-sm font-medium text-gray-700 mb-2 block">
                    Descripción de la foto
                  </Label>
                  <Textarea
                    id={`description-${photo.id}`}
                    value={photo.description}
                    onChange={(e) => updatePhotoDescription(photo.id, e.target.value)}
                    placeholder="Describe qué muestra esta fotografía..."
                    className="min-h-[80px] resize-none"
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    Archivo: {photo.file.name} ({(photo.file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2 flex items-center">
              <ImageIcon className="h-4 w-4 mr-2" />
              Resumen de Fotografías
            </h4>
            <p className="text-green-800">
              Total de fotos adjuntadas: <strong>{formData.photos.length}</strong>
            </p>
            <p className="text-green-800">
              Fotos con descripción:{" "}
              <strong>{formData.photos.filter((p) => p.description.trim() !== "").length}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Guidelines */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">Recomendaciones para las Fotografías</h4>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Incluye fotos del antes, durante y después de la instalación</li>
          <li>• Documenta la ubicación de los paneles solares</li>
          <li>• Captura detalles de las conexiones eléctricas</li>
          <li>• Muestra el estado final de la instalación</li>
          <li>• Agrega descripciones detalladas a cada foto</li>
        </ul>
      </div>

      <div className="flex justify-between pt-6 border-t">
        <Button onClick={onPrev} variant="outline">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Anterior: Ubicación
        </Button>
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700"
        >
          Siguiente: Fecha y Hora
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
