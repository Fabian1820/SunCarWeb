"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Label } from "@/components/shared/atom/label"
import { 
  Calendar, 
  MapPin, 
  Phone, 
  CreditCard, 
  UserCheck, 
  Package, 
  ListChecks, 
  PhoneForwarded,
  Edit,
  Download,
  Navigation
} from "lucide-react"
import type { Cliente } from "@/lib/api-types"
import { downloadFile } from "@/lib/utils/download-file"

interface ClienteDetallesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente: Cliente | null
  onEdit?: (cliente: Cliente) => void
  onDownloadComprobante?: (cliente: Cliente) => Promise<void>
}

export function ClienteDetallesDialog({
  open,
  onOpenChange,
  cliente,
  onEdit,
  onDownloadComprobante,
}: ClienteDetallesDialogProps) {
  if (!cliente) return null

  const hasLocation = cliente.latitud !== undefined && cliente.latitud !== null && cliente.longitud !== undefined && cliente.longitud !== null
  const latNumber = hasLocation
    ? (typeof cliente.latitud === 'number' ? cliente.latitud : parseFloat(cliente.latitud))
    : null
  const lngNumber = hasLocation
    ? (typeof cliente.longitud === 'number' ? cliente.longitud : parseFloat(cliente.longitud))
    : null

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    // Si ya está en formato DD/MM/YYYY, devolverlo tal como está
    if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dateString
    }
    // Si está en formato ISO (YYYY-MM-DD), convertir a DD/MM/YYYY
    const date = new Date(dateString)
    if (!isNaN(date.getTime())) {
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    }
    return dateString
  }

  const handleDownloadComprobante = async () => {
    if (!cliente.comprobante_pago_url) return

    try {
      if (onDownloadComprobante) {
        await onDownloadComprobante(cliente)
        return
      }
      await downloadFile(cliente.comprobante_pago_url, `comprobante-cliente-${cliente.nombre || cliente.id || 'archivo'}`)
    } catch (error) {
      console.error('Error downloading comprobante for cliente', cliente.id, error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Información del Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Sección 1: Datos Personales */}
          <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
            <div className="pb-4 mb-4 border-b-2 border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Datos Personales</h3>
              <p className="text-sm text-gray-500 mt-1">Información básica del contacto</p>
            </div>
            <div className="space-y-4">
              {/* Fila 1: Nombre y Referencia */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">Nombre</Label>
                  <p className="text-gray-900 font-medium mt-1">{cliente.nombre}</p>
                </div>
                {cliente.referencia && (
                  <div>
                    <Label className="text-gray-700">Referencia</Label>
                    <p className="text-gray-900 mt-1">{cliente.referencia}</p>
                  </div>
                )}
              </div>

              {/* Fila 2: Código y Carnet */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">Código de Cliente</Label>
                  <p className="text-gray-900 font-medium mt-1">N° {cliente.numero}</p>
                </div>
                {cliente.carnet_identidad && (
                  <div>
                    <Label className="text-gray-700">Carnet de Identidad</Label>
                    <p className="text-gray-900 flex items-center gap-2 mt-1">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      {cliente.carnet_identidad}
                    </p>
                  </div>
                )}
              </div>

              {/* Fila 3: Teléfono y Teléfono Adicional */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">Teléfono</Label>
                  <p className="text-gray-900 font-medium flex items-center gap-2 mt-1">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {cliente.telefono || 'No registrado'}
                  </p>
                </div>
                {cliente.telefono_adicional && (
                  <div>
                    <Label className="text-gray-700">Teléfono Adicional</Label>
                    <p className="text-gray-900 flex items-center gap-2 mt-1">
                      <PhoneForwarded className="h-4 w-4 text-gray-400" />
                      {cliente.telefono_adicional}
                    </p>
                  </div>
                )}
              </div>

              {/* Fila 4: Estado, Fuente y Fecha de Contacto */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {cliente.estado && (
                  <div>
                    <Label className="text-gray-700">Estado</Label>
                    <div className="mt-1">
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-sm px-3 py-1">
                        {cliente.estado}
                      </Badge>
                    </div>
                  </div>
                )}
                {cliente.fuente && (
                  <div>
                    <Label className="text-gray-700">Fuente</Label>
                    <p className="text-gray-900 mt-1">{cliente.fuente}</p>
                  </div>
                )}
                {cliente.fecha_contacto && (
                  <div>
                    <Label className="text-gray-700">Fecha de Contacto</Label>
                    <p className="text-gray-900 flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {formatDate(cliente.fecha_contacto)}
                    </p>
                  </div>
                )}
              </div>

              {/* Fila 5: Dirección (ancho completo) */}
              <div>
                <Label className="text-gray-700">Dirección</Label>
                <p className="text-gray-900 flex items-start gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  {cliente.direccion || 'Sin dirección'}
                </p>
              </div>

              {/* Fila 6: Provincia, Municipio y País */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {cliente.provincia_montaje && (
                  <div>
                    <Label className="text-gray-700">Provincia</Label>
                    <p className="text-gray-900 mt-1">{cliente.provincia_montaje}</p>
                  </div>
                )}
                {cliente.municipio && (
                  <div>
                    <Label className="text-gray-700">Municipio</Label>
                    <p className="text-gray-900 mt-1">{cliente.municipio}</p>
                  </div>
                )}
                {cliente.pais_contacto && (
                  <div>
                    <Label className="text-gray-700">País de Contacto</Label>
                    <p className="text-gray-900 mt-1">{cliente.pais_contacto}</p>
                  </div>
                )}
              </div>

              {/* Fila 7: Coordenadas GPS */}
              {hasLocation && latNumber !== null && lngNumber !== null && !Number.isNaN(latNumber) && !Number.isNaN(lngNumber) && (
                <div>
                  <Label className="text-gray-700">Coordenadas GPS</Label>
                  <p className="text-gray-900 flex items-center gap-2 mt-1">
                    <Navigation className="h-4 w-4 text-gray-400" />
                    {latNumber.toFixed(6)}, {lngNumber.toFixed(6)}
                  </p>
                </div>
              )}

              {/* Fila 8: Comercial */}
              {cliente.comercial && (
                <div>
                  <Label className="text-gray-700">Comercial Asignado</Label>
                  <p className="text-gray-900 flex items-center gap-2 mt-1">
                    <UserCheck className="h-4 w-4 text-gray-400" />
                    {cliente.comercial}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sección 2: Fechas de Instalación */}
          {(cliente.fecha_montaje || cliente.fecha_instalacion) && (
            <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
              <div className="pb-4 mb-4 border-b-2 border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Fechas de Instalación</h3>
                <p className="text-sm text-gray-500 mt-1">Inicio y fin de la instalación</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cliente.fecha_montaje && (
                  <div>
                    <Label className="text-gray-700">Fecha de Inicio de Instalación</Label>
                    <p className="text-gray-900 flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {formatDate(cliente.fecha_montaje)}
                    </p>
                  </div>
                )}
                {cliente.fecha_instalacion && (
                  <div>
                    <Label className="text-gray-700">Fecha de Fin de Instalación</Label>
                    <p className="text-gray-900 flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {formatDate(cliente.fecha_instalacion)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sección 3: Oferta */}
          {cliente.ofertas && cliente.ofertas.length > 0 && (
            <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
              <div className="pb-4 mb-4 border-b-2 border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Oferta</h3>
                <p className="text-sm text-gray-500 mt-1">Detalles de productos y cantidades</p>
              </div>
              <div className="space-y-4">
                {cliente.ofertas.map((oferta, idx) => (
                  <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                    {/* Productos en Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Inversor */}
                      {oferta.inversor_codigo && oferta.inversor_cantidad > 0 && (
                        <div>
                          <Label className="text-gray-700">Inversor</Label>
                          <p className="text-gray-900 font-medium mt-1">
                            {oferta.inversor_nombre || oferta.inversor_codigo}
                          </p>
                          <p className="text-sm text-gray-500">Cantidad: {oferta.inversor_cantidad}</p>
                        </div>
                      )}

                      {/* Batería */}
                      {oferta.bateria_codigo && oferta.bateria_cantidad > 0 && (
                        <div>
                          <Label className="text-gray-700">Batería</Label>
                          <p className="text-gray-900 font-medium mt-1">
                            {oferta.bateria_nombre || oferta.bateria_codigo}
                          </p>
                          <p className="text-sm text-gray-500">Cantidad: {oferta.bateria_cantidad}</p>
                        </div>
                      )}

                      {/* Panel */}
                      {oferta.panel_codigo && oferta.panel_cantidad > 0 && (
                        <div>
                          <Label className="text-gray-700">Panel</Label>
                          <p className="text-gray-900 font-medium mt-1">
                            {oferta.panel_nombre || oferta.panel_codigo}
                          </p>
                          <p className="text-sm text-gray-500">Cantidad: {oferta.panel_cantidad}</p>
                        </div>
                      )}
                    </div>

                    {/* Estado de la Oferta */}
                    {(oferta.aprobada || oferta.pagada) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {oferta.aprobada && (
                          <div className="flex items-center space-x-2 p-3 border rounded-md bg-white">
                            <input
                              type="checkbox"
                              checked={true}
                              disabled
                              className="h-5 w-5 rounded border-gray-300 text-green-600"
                            />
                            <Label className="font-medium">Oferta Aprobada</Label>
                          </div>
                        )}
                        {oferta.pagada && (
                          <div className="flex items-center space-x-2 p-3 border rounded-md bg-white">
                            <input
                              type="checkbox"
                              checked={true}
                              disabled
                              className="h-5 w-5 rounded border-gray-300 text-blue-600"
                            />
                            <Label className="font-medium">Oferta Pagada</Label>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Elementos Personalizados */}
                    {oferta.elementos_personalizados && (
                      <div className="mt-4">
                        <Label className="text-gray-700">Elementos Personalizados (Comentario)</Label>
                        <p className="text-sm text-gray-700 bg-white p-3 rounded-md border mt-1">
                          {oferta.elementos_personalizados}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sección 4: Costos y Pago */}
          {cliente.ofertas && cliente.ofertas.length > 0 && (
            <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
              <div className="pb-4 mb-4 border-b-2 border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Costos y Pago</h3>
                <p className="text-sm text-gray-500 mt-1">Información financiera de la oferta</p>
              </div>
              <div className="space-y-4">
                {cliente.ofertas.map((oferta, idx) => {
                  const costoOferta = oferta.costo_oferta || 0
                  const costoExtra = oferta.costo_extra || 0
                  const costoTransporte = oferta.costo_transporte || 0
                  const costoFinal = costoOferta + costoExtra + costoTransporte
                  
                  return (
                  <div key={`costos-${idx}`}>
                    {/* Costos - Primera fila */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-gray-700">Costo de Oferta</Label>
                        <p className="text-gray-900 font-semibold mt-1">
                          ${costoOferta.toFixed(2)}
                        </p>
                      </div>
                      {costoExtra > 0 && (
                        <div>
                          <Label className="text-gray-700">Costo Extra</Label>
                          <p className="text-gray-900 font-semibold mt-1">
                            ${costoExtra.toFixed(2)}
                          </p>
                        </div>
                      )}
                      {costoTransporte > 0 && (
                        <div>
                          <Label className="text-gray-700">Costo de Transporte</Label>
                          <p className="text-gray-900 font-semibold mt-1">
                            ${costoTransporte.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Costo Final */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                      <Label className="text-gray-700">Costo Final</Label>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        ${costoFinal.toFixed(2)}
                      </p>
                    </div>

                    {/* Razón del Costo Extra */}
                    {oferta.razon_costo_extra && (
                      <div className="mt-4">
                        <Label className="text-gray-700">Razón del Costo Extra</Label>
                        <p className="text-sm text-gray-700 bg-white p-3 rounded-md border mt-1">
                          {oferta.razon_costo_extra}
                        </p>
                      </div>
                    )}
                  </div>
                  )
                })}

                {/* Método de Pago y Moneda */}
                {(cliente.metodo_pago || cliente.moneda) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    {cliente.metodo_pago && (
                      <div>
                        <Label className="text-gray-700">Método de Pago</Label>
                        <p className="text-gray-900 font-medium mt-1">{cliente.metodo_pago}</p>
                      </div>
                    )}
                    {cliente.moneda && (
                      <div>
                        <Label className="text-gray-700">Moneda</Label>
                        <p className="text-gray-900 font-medium mt-1">{cliente.moneda}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Comprobante de Pago */}
                {cliente.comprobante_pago_url && (
                  <div className="pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadComprobante}
                      className="w-full md:w-auto"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar Comprobante
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sección 5: Comentarios (Condicional) */}
          {cliente.comentario && (
            <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
              <div className="pb-4 mb-4 border-b-2 border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Comentarios</h3>
                <p className="text-sm text-gray-500 mt-1">Notas adicionales sobre el cliente</p>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words bg-gray-50 p-4 rounded-lg border">
                  {cliente.comentario}
                </p>
              </div>
            </div>
          )}

          {/* Sección 6: Elementos Personalizados (Condicional) */}
          {cliente.elementos_personalizados && cliente.elementos_personalizados.length > 0 && (
            <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
              <div className="pb-4 mb-4 border-b-2 border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Elementos Personalizados
                </h3>
                <p className="text-sm text-gray-500 mt-1">Elementos adicionales del cliente</p>
              </div>
              <div className="space-y-2">
                {cliente.elementos_personalizados.map((elemento, index) => (
                  <div key={index} className="flex items-center justify-between border rounded-md px-4 py-3 bg-gray-50">
                    <span className="text-sm text-gray-900">{elemento.descripcion}</span>
                    <span className="text-sm font-medium text-gray-600 ml-4">
                      Cant: {elemento.cantidad}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {onEdit && (
              <Button
                variant="outline"
                onClick={() => {
                  onEdit(cliente)
                  onOpenChange(false)
                }}
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar Cliente
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
