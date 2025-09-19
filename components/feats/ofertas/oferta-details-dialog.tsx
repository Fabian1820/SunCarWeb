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
  X
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
              <CardTitle className="text-xl flex items-center justify-between">
                <span>{oferta.descripcion}</span>
                <div className="flex items-center gap-2 text-green-600">
                  <DollarSign className="h-5 w-5" />
                  <span className="text-2xl font-bold">${oferta.precio.toLocaleString()}</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                        {elemento.cantidad && elemento.cantidad > 1 && (
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