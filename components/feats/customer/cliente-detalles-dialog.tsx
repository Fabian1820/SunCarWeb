"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Calendar, MapPin, Phone, CreditCard, User, Building2, Navigation, UserCheck, Package, ListChecks } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { Cliente } from "@/lib/api-types"

interface ClienteDetallesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente: Cliente | null
  onViewMap?: (cliente: Cliente) => void
}

export function ClienteDetallesDialog({
  open,
  onOpenChange,
  cliente,
  onViewMap,
}: ClienteDetallesDialogProps) {
  if (!cliente) return null

  const hasLocation = cliente.latitud !== undefined && cliente.latitud !== null && cliente.longitud !== undefined && cliente.longitud !== null
  const latNumber = hasLocation
    ? (typeof cliente.latitud === 'number' ? cliente.latitud : parseFloat(cliente.latitud))
    : null
  const lngNumber = hasLocation
    ? (typeof cliente.longitud === 'number' ? cliente.longitud : parseFloat(cliente.longitud))
    : null
  const ofertas = cliente.ofertas || []
  const elementos = cliente.elementos_personalizados || []

  const formatCurrency = (value?: number, currency = 'USD') => {
    if (typeof value !== 'number' || Number.isNaN(value)) return null
    try {
      return value.toLocaleString(undefined, { style: 'currency', currency })
    } catch {
      return `${value} ${currency}`
    }
  }

  const formatDateLabel = (value?: string) => {
    if (!value) return null
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return format(parsed, "PPP", { locale: es })
  }

  const fechaContactoFormatted = formatDateLabel(cliente.fecha_contacto)
  const fechaMontajeFormatted = formatDateLabel(cliente.fecha_montaje)
  const fechaInstalacionFormatted = cliente.fecha_instalacion
    ? format(new Date(cliente.fecha_instalacion), "PPP 'a las' p", { locale: es })
    : null

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
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{cliente.nombre}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                    N° {cliente.numero}
                  </Badge>
                  {cliente.estado && (
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
                      {cliente.estado}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Dirección</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">{cliente.direccion || 'Sin dirección'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Phone className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-gray-500">Teléfonos</p>
                  <p className="text-base font-semibold text-gray-900">{cliente.telefono || 'No registrado'}</p>
                  {cliente.telefono_adicional && (
                    <p className="text-sm text-gray-600">Secundario: {cliente.telefono_adicional}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 md:col-span-2">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-gray-500">Seguimiento</p>
                  {cliente.comercial && <p className="text-sm text-gray-700">Comercial: <span className="font-medium">{cliente.comercial}</span></p>}
                  {cliente.fuente && <p className="text-sm text-gray-600">Fuente: {cliente.fuente}</p>}
                  {cliente.referencia && <p className="text-sm text-gray-600">Referencia: {cliente.referencia}</p>}
                  {(cliente.pais_contacto || cliente.provincia_montaje) && (
                    <p className="text-sm text-gray-600">
                      {cliente.pais_contacto && `País: ${cliente.pais_contacto}`}
                      {cliente.pais_contacto && cliente.provincia_montaje && ' · '}
                      {cliente.provincia_montaje && `Provincia: ${cliente.provincia_montaje}`}
                    </p>
                  )}
                </div>
              </div>
            </div>

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

            {hasLocation && latNumber !== null && lngNumber !== null && !Number.isNaN(latNumber) && !Number.isNaN(lngNumber) && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Navigation className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">Coordenadas GPS</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {latNumber.toFixed(6)}, {lngNumber.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {cliente.comentario && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-500 mb-2">Comentario</p>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{cliente.comentario}</p>
            </div>
          )}

          {(fechaContactoFormatted || fechaMontajeFormatted || fechaInstalacionFormatted) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {fechaContactoFormatted && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Fecha de contacto</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{fechaContactoFormatted}</p>
                    </div>
                  </div>
                </div>
              )}
              {fechaMontajeFormatted && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Fecha de montaje</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{fechaMontajeFormatted}</p>
                    </div>
                  </div>
                </div>
              )}
              {fechaInstalacionFormatted && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-rose-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-rose-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Fecha de instalación</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{fechaInstalacionFormatted}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {ofertas.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                <Package className="h-4 w-4 text-orange-500" />
                Ofertas asociadas
              </h3>
              <div className="space-y-3">
                {ofertas.map((oferta, index) => {
                  const precioBase = formatCurrency(oferta.precio, oferta.moneda || 'USD')
                  const precioCliente = formatCurrency(oferta.precio_cliente, oferta.moneda || 'USD')
                  return (
                    <div key={`oferta-${cliente.numero}-${index}`} className="border border-orange-100 rounded-lg p-3 bg-orange-50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-900">{oferta.descripcion}</span>
                        <Badge variant="outline" className="text-xs">
                          Cantidad: {oferta.cantidad}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 mt-1 space-y-1">
                        {precioBase && <p>Precio base: {precioBase}</p>}
                        {precioCliente && <p>Precio cliente: {precioCliente}</p>}
                        {oferta.descuentos && <p>Descuentos: {oferta.descuentos}</p>}
                        {oferta.garantias && oferta.garantias.length > 0 && <p>Garantías: {oferta.garantias.join(', ')}</p>}
                      </div>
                      {oferta.descripcion_detallada && (
                        <p className="text-xs text-gray-600 mt-2">{oferta.descripcion_detallada}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {elementos.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-green-600" />
                Elementos personalizados
              </h3>
              <div className="space-y-2">
                {elementos.map((item, index) => (
                  <div key={`elemento-${cliente.numero}-${index}`} className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2 bg-white">
                    <span className="text-sm text-gray-700">{item.descripcion}</span>
                    <Badge variant="outline" className="text-xs bg-gray-50">
                      {item.cantidad}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            {hasLocation && latNumber !== null && lngNumber !== null && !Number.isNaN(latNumber) && !Number.isNaN(lngNumber) && onViewMap && (
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
