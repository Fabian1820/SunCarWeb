"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { Badge } from "@/components/shared/atom/badge"
import { Loader2, FileCheck, DollarSign } from "lucide-react"
import type { OfertaConfeccion } from "@/hooks/use-ofertas-confeccion"
import type { Cliente } from "@/lib/api-types"

interface AsignarOfertaGenericaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente: Cliente | null
  onAsignar: (ofertaGenericaId: string) => Promise<void>
  fetchOfertasGenericas: () => Promise<OfertaConfeccion[]>
}

export function AsignarOfertaGenericaDialog({
  open,
  onOpenChange,
  cliente,
  onAsignar,
  fetchOfertasGenericas,
}: AsignarOfertaGenericaDialogProps) {
  const [ofertas, setOfertas] = useState<OfertaConfeccion[]>([])
  const [loading, setLoading] = useState(false)
  const [asignando, setAsignando] = useState(false)
  const [selectedOfertaId, setSelectedOfertaId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadOfertas()
    } else {
      // Limpiar estado al cerrar
      setOfertas([])
      setSelectedOfertaId(null)
    }
  }, [open])

  const loadOfertas = async () => {
    setLoading(true)
    try {
      const data = await fetchOfertasGenericas()
      setOfertas(data)
    } catch (error) {
      console.error('Error cargando ofertas genéricas:', error)
      setOfertas([])
    } finally {
      setLoading(false)
    }
  }

  const handleAsignar = async (ofertaId: string) => {
    setAsignando(true)
    setSelectedOfertaId(ofertaId)
    try {
      await onAsignar(ofertaId)
      onOpenChange(false)
    } catch (error) {
      console.error('Error asignando oferta:', error)
    } finally {
      setAsignando(false)
      setSelectedOfertaId(null)
    }
  }

  const formatPrice = (price: number, moneda: string = 'USD') => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 2,
    }).format(price)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asignar Oferta Genérica</DialogTitle>
          <DialogDescription>
            {cliente ? (
              <>
                Selecciona una oferta genérica aprobada para asignar a{" "}
                <span className="font-semibold text-gray-900">{cliente.nombre}</span>
                {" "}({cliente.numero})
              </>
            ) : (
              "Selecciona un cliente primero"
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            <span className="ml-3 text-gray-600">Cargando ofertas genéricas...</span>
          </div>
        ) : ofertas.length === 0 ? (
          <div className="text-center py-12">
            <FileCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay ofertas genéricas aprobadas
            </h3>
            <p className="text-gray-600">
              Crea y aprueba ofertas genéricas para poder asignarlas a clientes.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              {ofertas.length} {ofertas.length === 1 ? "oferta disponible" : "ofertas disponibles"}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {ofertas.map((oferta) => (
                <Card
                  key={oferta.id}
                  className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        {/* Número de oferta */}
                        {oferta.numero_oferta && (
                          <div className="text-xs text-gray-500 font-mono">
                            {oferta.numero_oferta}
                          </div>
                        )}

                        {/* Nombre automático */}
                        <h3 className="font-semibold text-gray-900 text-base">
                          {oferta.nombre}
                        </h3>

                        {/* Nombre completo */}
                        {oferta.nombre_completo && oferta.nombre_completo !== oferta.nombre && (
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {oferta.nombre_completo}
                          </p>
                        )}

                        {/* Items principales */}
                        {oferta.items && oferta.items.length > 0 && (
                          <div className="space-y-1 text-sm">
                            {oferta.items.slice(0, 5).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-gray-700">
                                <span className="text-gray-400">•</span>
                                <span className="font-medium">{item.cantidad}x</span>
                                <span>{item.descripcion}</span>
                              </div>
                            ))}
                            {oferta.items.length > 5 && (
                              <div className="text-xs text-gray-500 ml-4">
                                +{oferta.items.length - 5} materiales más
                              </div>
                            )}
                          </div>
                        )}

                        {/* Badges de información */}
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Badge variant="outline" className="text-xs">
                            {oferta.moneda_pago || 'USD'}
                          </Badge>
                          {oferta.almacen_nombre && (
                            <Badge variant="outline" className="text-xs">
                              Almacén: {oferta.almacen_nombre}
                            </Badge>
                          )}
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            Aprobada
                          </Badge>
                        </div>
                      </div>

                      {/* Precio y botón */}
                      <div className="flex flex-col items-end gap-3 min-w-[180px]">
                        <div className="text-right">
                          <div className="text-xs text-gray-500 mb-1">Precio Final</div>
                          <div className="text-2xl font-bold text-orange-600">
                            {formatPrice(oferta.precio_final, oferta.moneda_pago)}
                          </div>
                        </div>

                        <Button
                          onClick={() => handleAsignar(oferta.id)}
                          disabled={asignando}
                          className="bg-orange-600 hover:bg-orange-700 text-white w-full"
                        >
                          {asignando && selectedOfertaId === oferta.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Asignando...
                            </>
                          ) : (
                            <>
                              <FileCheck className="h-4 w-4 mr-2" />
                              Asignar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={asignando}
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
