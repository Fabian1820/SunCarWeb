"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Calendar, MapPin, Phone, CreditCard, Wrench, User, Building2, Navigation } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ClienteDetallesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente: any | null
  onViewMap?: (cliente: any) => void
}

export function ClienteDetallesDialog({
  open,
  onOpenChange,
  cliente,
  onViewMap,
}: ClienteDetallesDialogProps) {
  if (!cliente) return null

  const hasLocation = cliente.latitud && cliente.longitud

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-orange-600" />
            Detalles del Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información Básica */}
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{cliente.nombre}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                    N° {cliente.numero}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Grid de Información */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dirección */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Dirección</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">{cliente.direccion}</p>
                </div>
              </div>
            </div>

            {/* Teléfono */}
            {cliente.telefono && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">Teléfono</p>
                    <p className="text-base font-semibold text-gray-900 mt-1">{cliente.telefono}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Carnet de Identidad */}
            {cliente.carnet_identidad && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <CreditCard className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">Carnet de Identidad</p>
                    <p className="text-base font-semibold text-gray-900 mt-1">{cliente.carnet_identidad}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Coordenadas GPS */}
            {hasLocation && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Navigation className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">Coordenadas GPS</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {parseFloat(cliente.latitud).toFixed(6)}, {parseFloat(cliente.longitud).toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Equipo Instalado */}
          {cliente.equipo_instalado && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Wrench className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 mb-2">Equipo Instalado</p>
                  <p className="text-base text-gray-900 leading-relaxed">{cliente.equipo_instalado}</p>
                </div>
              </div>
            </div>
          )}

          {/* Fecha de Instalación */}
          {cliente.fecha_instalacion && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Fecha de Instalación</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">
                    {format(new Date(cliente.fecha_instalacion), "PPP 'a las' p", { locale: es })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sin datos adicionales */}
          {!cliente.telefono && !cliente.carnet_identidad && !cliente.equipo_instalado && !cliente.fecha_instalacion && (
            <div className="text-center py-8 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay información adicional registrada para este cliente.</p>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {hasLocation && onViewMap && (
              <Button
                variant="outline"
                onClick={() => {
                  onViewMap(cliente)
                  onOpenChange(false)
                }}
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Ver en Mapa
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
