"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Users, Package, MapPin, Camera, Calendar, Clock, Navigation, ZoomIn } from "lucide-react"
import { MATERIAL_TYPES } from "@/lib/types"

interface FormViewerProps {
  formData: any
}

export function FormViewer({ formData }: FormViewerProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

  const getMaterialLabel = (type: string) => {
    return MATERIAL_TYPES.find((m) => m.value === type)?.label || type
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
    return "No especificada"
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-lg border border-orange-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Formulario {formData.formId}</h3>
            <p className="text-sm text-gray-600">Registro de instalación de paneles solares</p>
          </div>
          <Badge className="bg-green-100 text-green-800">Completado</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brigada */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span>Brigada de Trabajo</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Jefe de Brigada:</p>
              <p className="text-gray-900 font-semibold">{formData.brigade.leader}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Integrantes:</p>
              <div className="space-y-1">
                {formData.brigade.members.map((member: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-gray-900">{member}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fecha y Hora */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-indigo-500" />
              <span>Fecha y Hora</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3">
              <Clock className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Trabajo realizado:</p>
                <p className="text-gray-900">{formatDateTime()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Materiales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-green-500" />
            <span>Materiales Utilizados</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {formData.materials.map((material: any) => (
              <div
                key={material.id}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="bg-green-100 p-2 rounded-lg">
                  <Package className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{getMaterialLabel(material.type)}</p>
                  <p className="text-sm text-gray-600">
                    {material.quantity} {material.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ubicación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-purple-500" />
            <span>Ubicación del Trabajo</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Dirección:</p>
            <p className="text-gray-900">{formData.location.address}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Latitud:</p>
              <p className="text-gray-900">{formData.location.coordinates.lat.toFixed(6)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Longitud:</p>
              <p className="text-gray-900">{formData.location.coordinates.lng.toFixed(6)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 flex items-center">
                <Navigation className="h-4 w-4 mr-1" />
                Distancia desde HQ:
              </p>
              <p className="text-gray-900">{formData.location.distanceFromHQ} km</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fotografías */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="h-5 w-5 text-pink-500" />
            <span>Fotografías del Trabajo ({formData.photos.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {formData.photos.map((photo: any) => (
              <div key={photo.id} className="relative group">
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={photo.preview || "/placeholder.svg"}
                    alt={photo.description}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ZoomIn className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <div className="space-y-4">
                          <img
                            src={photo.preview || "/placeholder.svg"}
                            alt={photo.description}
                            className="w-full h-auto rounded-lg"
                          />
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Descripción:</h4>
                            <p className="text-gray-700">{photo.description}</p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-700 line-clamp-2">{photo.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
