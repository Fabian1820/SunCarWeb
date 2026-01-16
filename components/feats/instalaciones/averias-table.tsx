"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Toaster } from "@/components/shared/molecule/toaster"
import { Search, Phone, MapPin, Package, AlertTriangle, CheckCircle, Edit2, Plus } from "lucide-react"
import { AveriaService } from "@/lib/api-services"
import { useToast } from "@/hooks/use-toast"
import { CrearAveriaDialog } from "./crear-averia-dialog"
import type { Cliente } from "@/lib/api-types"

interface AveriasTableProps {
  clients: Cliente[]
  loading: boolean
  onFiltersChange: (filters: any) => void
  onRefresh: () => void
}

export function AveriasTable({
  clients,
  loading,
  onFiltersChange,
  onRefresh,
}: AveriasTableProps) {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [estadoAveria, setEstadoAveria] = useState<"todas" | "pendientes" | "solucionadas">("pendientes")
  const [updatingAveria, setUpdatingAveria] = useState<string | null>(null)
  const [showCrearAveriaDialog, setShowCrearAveriaDialog] = useState(false)

  // Actualizar filtros cuando cambien
  useEffect(() => {
    onFiltersChange({
      searchTerm,
      fechaDesde,
      fechaHasta,
      estadoAveria,
    })
  }, [searchTerm, fechaDesde, fechaHasta, estadoAveria, onFiltersChange])

  // Función para filtrar averías según el estado seleccionado
  const filtrarAverias = (averias: any[]) => {
    if (!averias || averias.length === 0) return []
    
    if (estadoAveria === 'pendientes') {
      return averias.filter(a => a.estado === 'Pendiente')
    } else if (estadoAveria === 'solucionadas') {
      return averias.filter(a => a.estado === 'Solucionada')
    }
    // Si es 'todas', retornar todas
    return averias
  }

  // Función para obtener el título de la columna
  const getTituloAverias = () => {
    if (estadoAveria === 'pendientes') return 'Averías Pendientes'
    if (estadoAveria === 'solucionadas') return 'Averías Solucionadas'
    return 'Todas las Averías'
  }

  // Función para obtener el color del badge según el estado
  const getBadgeColor = (estado: string) => {
    return estado === 'Pendiente'
      ? 'bg-red-50 text-red-700 border-red-300'
      : 'bg-green-50 text-green-700 border-green-300'
  }

  // Función para obtener el color del borde según el estado
  const getBorderColor = (estado: string) => {
    return estado === 'Pendiente' ? 'border-red-400' : 'border-green-400'
  }

  // Función para cambiar el estado de una avería
  const handleCambiarEstado = async (clienteNumero: string, averiaId: string, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'Pendiente' ? 'Solucionada' : 'Pendiente'
    
    setUpdatingAveria(averiaId)
    try {
      await AveriaService.actualizarAveria(clienteNumero, averiaId, {
        estado: nuevoEstado,
      })

      toast({
        title: "Estado actualizado",
        description: `La avería se marcó como ${nuevoEstado.toLowerCase()}`,
      })

      // Refrescar la lista
      onRefresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el estado",
        variant: "destructive",
      })
    } finally {
      setUpdatingAveria(null)
    }
  }

  // Formatear ofertas para mostrar
  const formatOfertas = (ofertas: any[]) => {
    if (!ofertas || ofertas.length === 0) return "Sin oferta"
    
    return ofertas.map((oferta: any) => {
      const productos: string[] = []
      
      if (oferta.inversor_codigo && oferta.inversor_cantidad > 0) {
        const nombre = oferta.inversor_nombre || oferta.inversor_codigo
        productos.push(`${oferta.inversor_cantidad}x ${nombre}`)
      }
      
      if (oferta.bateria_codigo && oferta.bateria_cantidad > 0) {
        const nombre = oferta.bateria_nombre || oferta.bateria_codigo
        productos.push(`${oferta.bateria_cantidad}x ${nombre}`)
      }
      
      if (oferta.panel_codigo && oferta.panel_cantidad > 0) {
        const nombre = oferta.panel_nombre || oferta.panel_codigo
        productos.push(`${oferta.panel_cantidad}x ${nombre}`)
      }
      
      if (oferta.elementos_personalizados) {
        productos.push(oferta.elementos_personalizados)
      }
      
      return productos.join(" • ")
    }).join(" | ")
  }

  if (clients.length === 0 && !loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No hay averías pendientes
          </h3>
          <p className="text-gray-600">
            No se encontraron clientes con averías sin resolver
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Filtros */}
      <Card className="mb-6 border-l-4 border-l-red-600">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtros de Búsqueda</CardTitle>
            <Button
              onClick={() => setShowCrearAveriaDialog(true)}
              className="bg-gradient-to-r from-red-500 to-red-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Avería
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nombre, teléfono, dirección..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="estado-averia">Estado de Avería</Label>
              <Select value={estadoAveria} onValueChange={(value: any) => setEstadoAveria(value)}>
                <SelectTrigger id="estado-averia">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las averías</SelectItem>
                  <SelectItem value="pendientes">Solo pendientes</SelectItem>
                  <SelectItem value="solucionadas">Solo solucionadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fecha-desde">Fecha Desde</Label>
              <Input
                id="fecha-desde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="fecha-hasta">Fecha Hasta</Label>
              <Input
                id="fecha-hasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="border-l-4 border-l-red-600">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {estadoAveria === 'todas' && `Clientes con Averías (${clients.length})`}
              {estadoAveria === 'pendientes' && `Clientes con Averías Pendientes (${clients.length})`}
              {estadoAveria === 'solucionadas' && `Clientes con Averías Solucionadas (${clients.length})`}
            </span>
            <Badge 
              variant="outline" 
              className={
                estadoAveria === 'solucionadas' 
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              {clients.reduce((total, client) => {
                const averiasFiltered = filtrarAverias(client.averias || [])
                return total + averiasFiltered.length
              }, 0)} {estadoAveria === 'todas' ? 'Total' : estadoAveria === 'pendientes' ? 'Pendientes' : 'Solucionadas'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Vista móvil */}
          <div className="md:hidden space-y-3">
            {clients.map((client) => (
              <Card key={client.numero} className="border-gray-200">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="font-semibold text-gray-900">{client.nombre}</p>
                    <p className="text-xs text-gray-500">#{client.numero}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Phone className="h-3 w-3" />
                      <span>{client.telefono}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-gray-600 mt-1">
                      <MapPin className="h-3 w-3 mt-0.5" />
                      <span>{client.direccion}</span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Oferta:</p>
                    <p className="text-sm text-gray-700">{formatOfertas(client.ofertas || [])}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500 mb-2">{getTituloAverias()}:</p>
                    <div className="space-y-2">
                      {(() => {
                        const averiasFiltered = filtrarAverias(client.averias || [])
                        return averiasFiltered.length > 0 ? (
                          averiasFiltered.map((averia, idx) => (
                            <div key={averia.id || idx} className={`border-l-2 ${getBorderColor(averia.estado)} pl-3 pr-2 py-2 bg-gray-50 rounded-r`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="text-sm text-gray-900 font-medium">{averia.descripcion}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge 
                                      variant="outline" 
                                      className={getBadgeColor(averia.estado)}
                                    >
                                      {averia.estado === 'Pendiente' && <AlertTriangle className="h-3 w-3 mr-1" />}
                                      {averia.estado === 'Solucionada' && <CheckCircle className="h-3 w-3 mr-1" />}
                                      {averia.estado}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      {new Date(averia.fecha_reporte).toLocaleDateString('es-ES')}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={`h-7 w-7 flex-shrink-0 ${
                                    averia.estado === 'Pendiente'
                                      ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                      : 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                                  }`}
                                  onClick={() => handleCambiarEstado(client.numero, averia.id, averia.estado)}
                                  disabled={updatingAveria === averia.id}
                                  title={averia.estado === 'Pendiente' ? 'Marcar como solucionada' : 'Marcar como pendiente'}
                                >
                                  {updatingAveria === averia.id ? (
                                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  ) : averia.estado === 'Pendiente' ? (
                                    <CheckCircle className="h-4 w-4" />
                                  ) : (
                                    <Edit2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">Sin averías {estadoAveria === 'todas' ? '' : estadoAveria}</span>
                        )
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Vista escritorio */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Cliente</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Teléfonos</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Dirección</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Oferta</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{getTituloAverias()}</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.numero} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <p className="font-semibold text-gray-900">{client.nombre}</p>
                      <p className="text-xs text-gray-500">#{client.numero}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-gray-700">{client.telefono}</p>
                      {client.telefono_adicional && (
                        <p className="text-xs text-gray-500">{client.telefono_adicional}</p>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-gray-700">{client.direccion}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-gray-700">{formatOfertas(client.ofertas || [])}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-2">
                        {(() => {
                          const averiasFiltered = filtrarAverias(client.averias || [])
                          return averiasFiltered.length > 0 ? (
                            averiasFiltered.map((averia, idx) => (
                              <div key={averia.id || idx} className={`border-l-2 ${getBorderColor(averia.estado)} pl-3 pr-2 py-2 bg-gray-50 rounded-r`}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="text-sm text-gray-900 font-medium">{averia.descripcion}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge 
                                        variant="outline" 
                                        className={getBadgeColor(averia.estado)}
                                      >
                                        {averia.estado === 'Pendiente' && <AlertTriangle className="h-3 w-3 mr-1" />}
                                        {averia.estado === 'Solucionada' && <CheckCircle className="h-3 w-3 mr-1" />}
                                        {averia.estado}
                                      </Badge>
                                      <span className="text-xs text-gray-500">
                                        {new Date(averia.fecha_reporte).toLocaleDateString('es-ES')}
                                      </span>
                                    </div>
                                  </div>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className={`h-7 w-7 flex-shrink-0 ${
                                      averia.estado === 'Pendiente'
                                        ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                        : 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                                    }`}
                                    onClick={() => handleCambiarEstado(client.numero, averia.id, averia.estado)}
                                    disabled={updatingAveria === averia.id}
                                    title={averia.estado === 'Pendiente' ? 'Marcar como solucionada' : 'Marcar como pendiente'}
                                  >
                                    {updatingAveria === averia.id ? (
                                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : averia.estado === 'Pendiente' ? (
                                      <CheckCircle className="h-4 w-4" />
                                    ) : (
                                      <Edit2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">Sin averías {estadoAveria === 'todas' ? '' : estadoAveria}</span>
                          )
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para crear nueva avería */}
      <CrearAveriaDialog
        open={showCrearAveriaDialog}
        onOpenChange={setShowCrearAveriaDialog}
        onSuccess={onRefresh}
      />

      <Toaster />
    </>
  )
}
