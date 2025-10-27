"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Badge } from "@/components/shared/atom/badge"
import {
  DollarSign,
  Image as ImageIcon,
  Package,
  Shield,
  Edit,
  Trash2,
  X,
  FileText,
  CreditCard,
  Percent,
  Tag
} from "lucide-react"
import type { Oferta } from "@/lib/api-types"

interface OfertaDetailsDialogProps {
  isOpen: boolean
  onClose: () => void
  oferta: Oferta | null
  onEdit?: (oferta: Oferta) => void
  onDelete?: (ofertaId: string) => void
}

export default function OfertaDetailsDialog({
  isOpen,
  onClose,
  oferta,
  onEdit,
  onDelete
}: OfertaDetailsDialogProps) {
  if (!oferta) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              Detalles de la Oferta
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información principal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <span className="flex-1">{oferta.descripcion}</span>
                <div className="text-left sm:text-right">
                  <div className="flex items-center gap-2 text-green-600">
                    <DollarSign className="h-5 w-5" />
                    <span className="text-2xl font-bold">
                      {oferta.precio.toLocaleString()} {oferta.moneda?.toUpperCase() || 'USD'}
                    </span>
                  </div>
                  {oferta.precio_cliente && (
                    <div className="flex items-center gap-2 text-blue-600 mt-1">
                      <span className="text-sm font-medium">Cliente:</span>
                      <span className="text-lg font-semibold">
                        {oferta.precio_cliente.toLocaleString()} {oferta.moneda?.toUpperCase() || 'USD'}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    {oferta.financiamiento && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        <CreditCard className="h-3 w-3 mr-1" />
                        Financiamiento
                      </Badge>
                    )}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Tag className="h-4 w-4 text-orange-500" />
                <span>{oferta.marca?.trim() || "Sin marca"}</span>
              </div>

              {oferta.descripcion_detallada && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <FileText className="h-5 w-5 text-gray-600 mt-0.5" />
                    <h4 className="font-semibold text-gray-900">Descripción Detallada</h4>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{oferta.descripcion_detallada}</p>
                </div>
              )}

              {oferta.descuentos && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-start gap-2 mb-2">
                    <Percent className="h-5 w-5 text-green-600 mt-0.5" />
                    <h4 className="font-semibold text-green-900">Descuentos y Promociones</h4>
                  </div>
                  <p className="text-green-700 whitespace-pre-wrap">{oferta.descuentos}</p>
                </div>
              )}

              {oferta.imagen ? (
                <div className="w-full max-w-md mx-auto">
                  <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={oferta.imagen}
                      alt={oferta.descripcion}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                    <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-100">
                      <ImageIcon className="h-12 w-12 text-gray-400" />
                      <p className="text-gray-500 mt-2">Imagen no disponible</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-md mx-auto h-48 rounded-lg bg-gray-100 flex flex-col items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-gray-500">Sin imagen</p>
                </div>
              )}

              {oferta.pdf && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <FileText className="h-4 w-4" />
                  <a
                    href={oferta.pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Ver ficha técnica (PDF)
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Garantías */}
          {oferta.garantias && oferta.garantias.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Garantías
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {oferta.garantias.map((garantia, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                      <span className="text-gray-700">{garantia}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Elementos */}
          {oferta.elementos && oferta.elementos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  Elementos Incluidos ({oferta.elementos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {oferta.elementos.map((elemento, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          {elemento.categoria && (
                            <Badge variant="outline" className="mb-2">
                              {elemento.categoria}
                            </Badge>
                          )}
                          <h4 className="font-semibold text-gray-900">
                            {elemento.descripcion || "Sin descripción"}
                          </h4>
                        </div>
                        {elemento.cantidad && (
                          <Badge variant="secondary" className="ml-2">
                            x{elemento.cantidad}
                          </Badge>
                        )}
                      </div>

                      {elemento.foto && (
                        <div className="mt-3">
                          <div className="w-full h-24 rounded overflow-hidden bg-gray-100">
                            <img
                              src={elemento.foto}
                              alt={elemento.descripcion || "Elemento"}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                            <div className="hidden flex items-center justify-center h-full bg-gray-100">
                              <ImageIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botón cerrar */}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
