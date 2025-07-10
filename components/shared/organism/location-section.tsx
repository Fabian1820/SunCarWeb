"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Search, Navigation, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import type { FormData } from "@/lib/types"

interface LocationSectionProps {
  formData: FormData
  setFormData: (data: FormData) => void
  onNext: () => void
  onPrev: () => void
}

export function LocationSection({ formData, setFormData, onNext, onPrev }: LocationSectionProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false)

  // Coordenadas de la sede de la empresa (ejemplo)
  const HQ_COORDINATES = { lat: 4.6097, lng: -74.0817 } // Bogotá, Colombia

  const searchLocation = async () => {
    if (!formData.location.address.trim()) return

    setIsSearching(true)
    try {
      // Usando Nominatim API (OpenStreetMap) - gratuita
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.location.address)}&limit=5&countrycodes=co`,
      )
      const results = await response.json()
      setSearchResults(results)
    } catch (error) {
      console.error("Error searching location:", error)
      alert("Error al buscar la ubicación. Intenta nuevamente.")
    } finally {
      setIsSearching(false)
    }
  }

  const selectLocation = async (result: any) => {
    const coordinates = {
      lat: Number.parseFloat(result.lat),
      lng: Number.parseFloat(result.lon),
    }

    setFormData({
      ...formData,
      location: {
        ...formData.location,
        address: result.display_name,
        coordinates,
      },
    })

    setSearchResults([])

    // Calcular distancia
    await calculateDistance(coordinates)
  }

  const calculateDistance = async (coordinates: { lat: number; lng: number }) => {
    setIsCalculatingDistance(true)
    try {
      // Fórmula de Haversine para calcular distancia
      const R = 6371 // Radio de la Tierra en km
      const dLat = ((coordinates.lat - HQ_COORDINATES.lat) * Math.PI) / 180
      const dLng = ((coordinates.lng - HQ_COORDINATES.lng) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((HQ_COORDINATES.lat * Math.PI) / 180) *
          Math.cos((coordinates.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const distance = R * c

      setFormData({
        ...formData,
        location: {
          ...formData.location,
          coordinates,
          distanceFromHQ: Math.round(distance * 100) / 100, // Redondear a 2 decimales
        },
      })
    } catch (error) {
      console.error("Error calculating distance:", error)
    } finally {
      setIsCalculatingDistance(false)
    }
  }

  const updateAddress = (address: string) => {
    setFormData({
      ...formData,
      location: {
        ...formData.location,
        address,
      },
    })
    setSearchResults([])
  }

  const isValid = formData.location.address.trim() !== ""

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-3 rounded-lg">
          <MapPin className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ubicación del Trabajo</h2>
          <p className="text-gray-600">Registra la ubicación exacta donde se realizó la instalación</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Búsqueda de Dirección */}
        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
          <Label htmlFor="address" className="text-base font-semibold text-purple-900 mb-3 block">
            Dirección del Trabajo *
          </Label>
          <div className="flex space-x-3">
            <Input
              id="address"
              value={formData.location.address}
              onChange={(e) => updateAddress(e.target.value)}
              placeholder="Ingresa la dirección completa"
              className="flex-1 bg-white border-purple-300 focus:border-purple-500"
              onKeyPress={(e) => e.key === "Enter" && searchLocation()}
            />
            <Button
              type="button"
              onClick={searchLocation}
              disabled={isSearching || !formData.location.address.trim()}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Resultados de Búsqueda */}
        {searchResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Resultados de Búsqueda</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  className="p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => selectLocation(result)}
                >
                  <p className="font-medium text-gray-900">{result.display_name}</p>
                  <p className="text-sm text-gray-600">
                    Lat: {Number.parseFloat(result.lat).toFixed(6)}, Lng: {Number.parseFloat(result.lon).toFixed(6)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Información de Ubicación Seleccionada */}
        {formData.location.coordinates && (
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-900 mb-4">Ubicación Confirmada</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-green-800">Dirección:</p>
                <p className="text-green-700">{formData.location.address}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-green-800">Coordenadas:</p>
                  <p className="text-green-700">
                    {formData.location.coordinates.lat.toFixed(6)}, {formData.location.coordinates.lng.toFixed(6)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800">Distancia desde HQ:</p>
                  {isCalculatingDistance ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                      <span className="text-green-700">Calculando...</span>
                    </div>
                  ) : formData.location.distanceFromHQ ? (
                    <p className="text-green-700">{formData.location.distanceFromHQ} km</p>
                  ) : (
                    <p className="text-red-600">No calculada</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Información de la Sede */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
            <Navigation className="h-4 w-4 mr-2" />
            Sede de la Empresa
          </h4>
          <p className="text-blue-800">
            Coordenadas: {HQ_COORDINATES.lat}, {HQ_COORDINATES.lng}
          </p>
          <p className="text-sm text-blue-700 mt-1">Las distancias se calculan desde esta ubicación</p>
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t">
        <Button onClick={onPrev} variant="outline">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Anterior: Materiales
        </Button>
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
        >
          Siguiente: Fotos
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
