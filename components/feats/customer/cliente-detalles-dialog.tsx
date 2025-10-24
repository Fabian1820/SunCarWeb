"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Calendar, MapPin, Phone, CreditCard, User, Building2, Navigation, UserCheck, Package, ListChecks, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { Cliente, OfertaEmbebida } from "@/lib/api-types"

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
  const [selectedOferta, setSelectedOferta] = useState<OfertaEmbebida | null>(null)
  const [isOfertaElementosDialogOpen, setIsOfertaElementosDialogOpen] = useState(false)

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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Building2 className="h-5 w-5 text-orange-600 flex-shrink-0" />
            <span className="truncate">Detalles del Cliente</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 pr-2">
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-3 sm:p-4 rounded-lg border border-orange-200">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 break-words">{cliente.nombre}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs sm:text-sm">
                    N° {cliente.numero}
                  </Badge>
                  {cliente.estado && (
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300 text-xs sm:text-sm">
                      {cliente.estado}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 min-w-0">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Dirección</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-900 mt-1 break-words">{cliente.direccion || 'Sin dirección'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 min-w-0">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                  <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Teléfonos</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-900 break-words">{cliente.telefono || 'No registrado'}</p>
                  {cliente.telefono_adicional && (
                    <p className="text-xs sm:text-sm text-gray-600 break-words">Secundario: {cliente.telefono_adicional}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 md:col-span-2 min-w-0">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg flex-shrink-0">
                  <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Seguimiento</p>
                  {cliente.comercial && <p className="text-xs sm:text-sm text-gray-700 break-words">Comercial: <span className="font-medium">{cliente.comercial}</span></p>}
                  {cliente.fuente && <p className="text-xs sm:text-sm text-gray-600 break-words">Fuente: {cliente.fuente}</p>}
                  {cliente.referencia && <p className="text-xs sm:text-sm text-gray-600 break-words">Referencia: {cliente.referencia}</p>}
                  {(cliente.pais_contacto || cliente.provincia_montaje) && (
                    <p className="text-xs sm:text-sm text-gray-600 break-words">
                      {cliente.pais_contacto && `País: ${cliente.pais_contacto}`}
                      {cliente.pais_contacto && cliente.provincia_montaje && ' · '}
                      {cliente.provincia_montaje && `Provincia: ${cliente.provincia_montaje}`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {cliente.carnet_identidad && (
              <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 min-w-0">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-500">Carnet de Identidad</p>
                    <p className="text-sm sm:text-base font-semibold text-gray-900 mt-1 break-words">{cliente.carnet_identidad}</p>
                  </div>
                </div>
              </div>
            )}

            {hasLocation && latNumber !== null && lngNumber !== null && !Number.isNaN(latNumber) && !Number.isNaN(lngNumber) && (
              <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 min-w-0">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg flex-shrink-0">
                    <Navigation className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-500">Coordenadas GPS</p>
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 mt-1 break-all">
                      {latNumber.toFixed(6)}, {lngNumber.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {cliente.comentario && (
            <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Comentario</p>
              <p className="text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">{cliente.comentario}</p>
            </div>
          )}

          {(fechaContactoFormatted || fechaMontajeFormatted || fechaInstalacionFormatted) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {fechaContactoFormatted && (
                <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 min-w-0">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-500">Fecha de contacto</p>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 mt-1 break-words">{fechaContactoFormatted}</p>
                    </div>
                  </div>
                </div>
              )}
              {fechaMontajeFormatted && (
                <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 min-w-0">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg flex-shrink-0">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-500">Fecha de montaje</p>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 mt-1 break-words">{fechaMontajeFormatted}</p>
                    </div>
                  </div>
                </div>
              )}
              {fechaInstalacionFormatted && (
                <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 min-w-0 sm:col-span-2 lg:col-span-1">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="p-2 bg-rose-100 rounded-lg flex-shrink-0">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-500">Fecha de instalación</p>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 mt-1 break-words">{fechaInstalacionFormatted}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {ofertas.length > 0 && (
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                <Package className="h-4 w-4 text-orange-500 flex-shrink-0" />
                <span>Ofertas asociadas</span>
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {ofertas.map((oferta, index) => {
                  const precioBase = formatCurrency(oferta.precio, oferta.moneda || 'USD')
                  const precioCliente = formatCurrency(oferta.precio_cliente, oferta.moneda || 'USD')
                  return (
                    <div key={`oferta-${cliente.numero}-${index}`} className="border border-orange-100 rounded-lg p-2 sm:p-3 bg-orange-50 min-w-0 overflow-hidden">
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate block" title={oferta.descripcion}>{oferta.descripcion}</span>
                            {oferta.marca && (
                              <p className="text-xs text-gray-600 mt-1 truncate" title={oferta.marca}>Marca: {oferta.marca}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs self-start sm:self-auto flex-shrink-0">
                            Cant: {oferta.cantidad}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {precioBase && (
                            <div className="text-gray-600 truncate">
                              <span className="font-medium">Precio base:</span> {precioBase}
                            </div>
                          )}
                          {precioCliente && (
                            <div className="text-gray-600 truncate">
                              <span className="font-medium">P. Cliente:</span> {precioCliente}
                            </div>
                          )}
                        </div>

                        {oferta.descuentos && (
                          <div className="text-xs text-gray-600 truncate" title={oferta.descuentos}>
                            <span className="font-medium">Descuentos:</span> {oferta.descuentos}
                          </div>
                        )}
                        {oferta.garantias && oferta.garantias.length > 0 && (
                          <div className="text-xs text-gray-600 truncate" title={oferta.garantias.join(', ')}>
                            <span className="font-medium">Garantías:</span> {oferta.garantias.join(', ')}
                          </div>
                        )}

                        {oferta.elementos && oferta.elementos.length > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full mt-1 text-xs h-8 text-orange-700 border-orange-200 hover:bg-orange-100"
                            onClick={() => {
                              setSelectedOferta(oferta)
                              setIsOfertaElementosDialogOpen(true)
                            }}
                          >
                            <Package className="h-3 w-3 mr-1" />
                            Ver elementos ({oferta.elementos.length})
                            <ChevronRight className="h-3 w-3 ml-auto" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {elementos.length > 0 && (
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Elementos personalizados</span>
              </h3>
              <div className="space-y-2">
                {elementos.map((item, index) => (
                  <div key={`elemento-${cliente.numero}-${index}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-gray-200 rounded-md px-2 sm:px-3 py-2 bg-white min-w-0">
                    <span className="text-xs sm:text-sm text-gray-700 break-words min-w-0">{item.descripcion}</span>
                    <Badge variant="outline" className="text-xs bg-gray-50 self-start sm:self-auto flex-shrink-0">
                      {item.cantidad}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
            {hasLocation && latNumber !== null && lngNumber !== null && !Number.isNaN(latNumber) && !Number.isNaN(lngNumber) && onViewMap && (
              <Button
                variant="outline"
                onClick={() => {
                  onViewMap(cliente)
                  onOpenChange(false)
                }}
                className="border-purple-300 text-purple-700 hover:bg-purple-50 w-full sm:w-auto"
              >
                <MapPin className="h-4 w-4 mr-2" />
                <span className="truncate">Ver en Mapa</span>
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Dialog Elementos de Oferta */}
      <Dialog open={isOfertaElementosDialogOpen} onOpenChange={setIsOfertaElementosDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Elementos de la Oferta</DialogTitle>
          </DialogHeader>
          {selectedOferta && (
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{selectedOferta.descripcion}</h3>
                {selectedOferta.marca && (
                  <p className="text-sm text-gray-600">Marca: {selectedOferta.marca}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm">
                  {formatCurrency(selectedOferta.precio, selectedOferta.moneda || 'USD') && (
                    <span className="text-gray-700">
                      <span className="font-medium">Precio:</span> {formatCurrency(selectedOferta.precio, selectedOferta.moneda || 'USD')}
                    </span>
                  )}
                  <Badge variant="outline" className="text-xs">
                    Cantidad: {selectedOferta.cantidad}
                  </Badge>
                </div>
              </div>

              {selectedOferta.elementos && selectedOferta.elementos.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Elementos incluidos ({selectedOferta.elementos.length})
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {selectedOferta.elementos.map((elemento: any, index: number) => (
                      <div
                        key={`elemento-${index}`}
                        className="flex items-start gap-3 border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                          <Package className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 break-words">
                                {elemento.nombre || elemento.descripcion || elemento.name || 'Elemento sin nombre'}
                              </p>
                              {elemento.material && (
                                <p className="text-xs text-gray-600 mt-1">Material: {elemento.material}</p>
                              )}
                              {elemento.descripcion && elemento.nombre && (
                                <p className="text-xs text-gray-600 mt-1">{elemento.descripcion}</p>
                              )}
                            </div>
                            {elemento.cantidad && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {elemento.cantidad}
                              </Badge>
                            )}
                          </div>
                          {elemento.precio && (
                            <p className="text-xs text-gray-600 mt-1">
                              Precio: {formatCurrency(elemento.precio, elemento.moneda || selectedOferta.moneda || 'USD')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No hay elementos disponibles para esta oferta</p>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOfertaElementosDialogOpen(false)}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
