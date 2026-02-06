"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/atom/input"
import { Loader2, FileCheck, Search, Image as ImageIcon, Zap, Battery, Sun, Cable, Boxes } from "lucide-react"
import type { OfertaConfeccion } from "@/hooks/use-ofertas-confeccion"
import type { Cliente } from "@/lib/api-types"
import Image from "next/image"

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
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (open) {
      loadOfertas()
    } else {
      // Limpiar estado al cerrar
      setOfertas([])
      setSelectedOfertaId(null)
      setSearchQuery("")
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

  // Función para obtener el material con mayor cantidad por categoría
  const getCategoryMaxItems = (oferta: OfertaConfeccion) => {
    const maxItems = {
      inversor: null as { cantidad: number; descripcion: string } | null,
      bateria: null as { cantidad: number; descripcion: string } | null,
      panel: null as { cantidad: number; descripcion: string } | null,
      cableadoAC: null as { cantidad: number; descripcion: string } | null,
      cableadoDC: null as { cantidad: number; descripcion: string } | null,
      canalizacion: null as { cantidad: number; descripcion: string } | null,
    }

    oferta.items?.forEach((item) => {
      const seccion = item.seccion?.toLowerCase() || ''
      const itemData = { cantidad: item.cantidad, descripcion: item.descripcion }
      
      if (seccion === 'inversor' || seccion === 'inversores') {
        if (!maxItems.inversor || item.cantidad > maxItems.inversor.cantidad) {
          maxItems.inversor = itemData
        }
      } else if (seccion === 'bateria' || seccion === 'baterias' || seccion === 'batería' || seccion === 'baterías') {
        if (!maxItems.bateria || item.cantidad > maxItems.bateria.cantidad) {
          maxItems.bateria = itemData
        }
      } else if (seccion === 'panel' || seccion === 'paneles') {
        if (!maxItems.panel || item.cantidad > maxItems.panel.cantidad) {
          maxItems.panel = itemData
        }
      } else if (seccion === 'cableado_ac') {
        if (!maxItems.cableadoAC || item.cantidad > maxItems.cableadoAC.cantidad) {
          maxItems.cableadoAC = itemData
        }
      } else if (seccion === 'cableado_dc') {
        if (!maxItems.cableadoDC || item.cantidad > maxItems.cableadoDC.cantidad) {
          maxItems.cableadoDC = itemData
        }
      } else if (seccion === 'canalizacion' || seccion === 'canalización') {
        if (!maxItems.canalizacion || item.cantidad > maxItems.canalizacion.cantidad) {
          maxItems.canalizacion = itemData
        }
      }
    })

    return maxItems
  }

  // Filtrar ofertas por búsqueda
  const ofertasFiltradas = useMemo(() => {
    if (!searchQuery.trim()) return ofertas

    const query = searchQuery.toLowerCase()
    return ofertas.filter((oferta) => {
      return (
        oferta.nombre?.toLowerCase().includes(query) ||
        oferta.nombre_completo?.toLowerCase().includes(query) ||
        oferta.numero_oferta?.toLowerCase().includes(query) ||
        oferta.precio_final.toString().includes(query)
      )
    })
  }, [ofertas, searchQuery])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
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
          <div className="flex flex-col min-h-0 flex-1">
            {/* Buscador - fijo */}
            <div className="flex-shrink-0 mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre, número o precio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Contador de resultados - fijo */}
            <div className="flex-shrink-0 text-sm text-gray-600 mb-3">
              {ofertasFiltradas.length} {ofertasFiltradas.length === 1 ? "oferta disponible" : "ofertas disponibles"}
              {searchQuery && ofertasFiltradas.length !== ofertas.length && (
                <span className="text-orange-600 ml-1">
                  (filtradas de {ofertas.length})
                </span>
              )}
            </div>

            {/* Lista de ofertas - con scroll */}
            {ofertasFiltradas.length === 0 ? (
              <div className="text-center py-8">
                <FileCheck className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No se encontraron ofertas</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                <div className="grid grid-cols-1 gap-2">{ofertasFiltradas.map((oferta) => {
                  const maxItems = getCategoryMaxItems(oferta)
                  
                  return (
                    <Card
                      key={oferta.id}
                      className="border hover:shadow-md transition-all hover:border-orange-300"
                    >
                      <CardContent className="p-2.5">
                        <div className="flex gap-2.5">
                          {/* Foto - más grande y mejor calidad */}
                          <div className="flex-shrink-0">
                            <div className="w-20 h-20 bg-gray-100 rounded-md overflow-hidden relative border">
                              {oferta.foto_portada ? (
                                <Image
                                  src={oferta.foto_portada}
                                  alt={oferta.nombre}
                                  fill
                                  className="object-cover"
                                  sizes="80px"
                                  quality={90}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-7 w-7 text-gray-300" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Contenido principal */}
                          <div className="flex-1 min-w-0">
                            {/* Nombre + Precio + Margen en una línea */}
                            <div className="flex items-center gap-2 mb-1.5">
                              <h3 className="font-semibold text-sm text-gray-900 truncate flex-1">
                                {oferta.nombre}
                              </h3>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="text-sm font-bold text-orange-600">
                                  {formatPrice(oferta.precio_final, oferta.moneda_pago)}
                                </span>
                                <span className="text-gray-400">|</span>
                                <span className="text-xs font-semibold text-green-600">
                                  {oferta.margen_comercial?.toFixed(1)}%
                                </span>
                              </div>
                            </div>

                            {/* Componentes principales - horizontal */}
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] mb-1">
                              {maxItems.inversor && (
                                <div className="flex items-center gap-1 text-gray-700">
                                  <Zap className="h-2.5 w-2.5 text-orange-500 flex-shrink-0" />
                                  <span className="font-medium">{maxItems.inversor.cantidad}x</span>
                                  <span className="truncate max-w-[180px]">{maxItems.inversor.descripcion}</span>
                                </div>
                              )}
                              {maxItems.bateria && (
                                <div className="flex items-center gap-1 text-gray-700">
                                  <Battery className="h-2.5 w-2.5 text-green-500 flex-shrink-0" />
                                  <span className="font-medium">{maxItems.bateria.cantidad}x</span>
                                  <span className="truncate max-w-[180px]">{maxItems.bateria.descripcion}</span>
                                </div>
                              )}
                              {maxItems.panel && (
                                <div className="flex items-center gap-1 text-gray-700">
                                  <Sun className="h-2.5 w-2.5 text-yellow-500 flex-shrink-0" />
                                  <span className="font-medium">{maxItems.panel.cantidad}x</span>
                                  <span className="truncate max-w-[180px]">{maxItems.panel.descripcion}</span>
                                </div>
                              )}
                            </div>

                            {/* Componentes secundarios - inline compacto */}
                            {(maxItems.cableadoAC || maxItems.cableadoDC || maxItems.canalizacion) && (
                              <div className="flex items-center gap-2.5 text-[10px] text-gray-600 border-t pt-1">
                                {maxItems.cableadoAC && (
                                  <div className="flex items-center gap-0.5">
                                    <Cable className="h-2 w-2 text-blue-500 flex-shrink-0" />
                                    <span className="font-medium">{maxItems.cableadoAC.cantidad}</span>
                                    <span className="text-gray-500">AC</span>
                                  </div>
                                )}
                                {maxItems.cableadoDC && (
                                  <div className="flex items-center gap-0.5">
                                    <Cable className="h-2 w-2 text-purple-500 flex-shrink-0" />
                                    <span className="font-medium">{maxItems.cableadoDC.cantidad}</span>
                                    <span className="text-gray-500">DC</span>
                                  </div>
                                )}
                                {maxItems.canalizacion && (
                                  <div className="flex items-center gap-0.5">
                                    <Boxes className="h-2 w-2 text-gray-500 flex-shrink-0" />
                                    <span className="font-medium">{maxItems.canalizacion.cantidad}</span>
                                    <span className="text-gray-500">Canal.</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Botón de asignar - rediseñado */}
                          <div className="flex-shrink-0 flex items-center">
                            <Button
                              onClick={() => handleAsignar(oferta.id)}
                              disabled={asignando}
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 h-auto rounded-md shadow-sm"
                            >
                              {asignando && selectedOfertaId === oferta.id ? (
                                <div className="flex items-center gap-1.5">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  <span className="text-xs font-medium">Asignando...</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <FileCheck className="h-3.5 w-3.5" />
                                  <span className="text-xs font-medium">Asignar</span>
                                </div>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
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
