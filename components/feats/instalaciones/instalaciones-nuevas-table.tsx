"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Search, Phone, MapPin, Package, User, FileText, ArrowRight, Edit } from "lucide-react"
import type { InstalacionNueva } from "@/lib/types/feats/instalaciones/instalaciones-types"
import { ClienteService, LeadService } from "@/lib/api-services"
import { useToast } from "@/hooks/use-toast"

interface InstalacionesNuevasTableProps {
  instalaciones: InstalacionNueva[]
  loading: boolean
  onFiltersChange: (filters: any) => void
  onRefresh: () => void
}

export function InstalacionesNuevasTable({
  instalaciones,
  loading,
  onFiltersChange,
  onRefresh,
}: InstalacionesNuevasTableProps) {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [tipo, setTipo] = useState<"todos" | "leads" | "clientes">("todos")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  
  const [selectedInstalacion, setSelectedInstalacion] = useState<InstalacionNueva | null>(null)
  const [isEditElementosDialogOpen, setIsEditElementosDialogOpen] = useState(false)
  const [elementosValue, setElementosValue] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  // Actualizar filtros cuando cambien
  useEffect(() => {
    onFiltersChange({
      searchTerm,
      tipo,
      fechaDesde,
      fechaHasta,
    })
  }, [searchTerm, tipo, fechaDesde, fechaHasta, onFiltersChange])

  // Mover a instalación en proceso
  const handleMoverAProceso = async (instalacion: InstalacionNueva) => {
    setIsUpdating(true)
    try {
      if (instalacion.tipo === 'lead') {
        // Para leads, actualizar el estado
        await LeadService.updateLead(instalacion.id, {
          estado: "Instalación en Proceso"
        })
      } else {
        // Para clientes, actualizar el estado
        await ClienteService.actualizarCliente(instalacion.numero!, {
          estado: "Instalación en Proceso"
        })
      }
      
      toast({
        title: "Estado actualizado",
        description: `${instalacion.nombre} movido a Instalación en Proceso`,
      })
      onRefresh()
    } catch (error: any) {
      console.error('Error al mover a proceso:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el estado",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // Abrir diálogo para editar elementos personalizados
  const handleEditElementos = (instalacion: InstalacionNueva) => {
    setSelectedInstalacion(instalacion)
    // Obtener elementos personalizados del lead/cliente (no de la oferta)
    const elementosArray = instalacion.original.elementos_personalizados || []
    // Convertir array de objetos a string para mostrar en textarea
    const elementosTexto = elementosArray.map(e => `${e.descripcion} (x${e.cantidad})`).join('\n')
    setElementosValue(elementosTexto)
    setIsEditElementosDialogOpen(true)
  }

  // Guardar cambios en elementos personalizados
  const handleSaveElementos = async () => {
    if (!selectedInstalacion) return
    
    setIsUpdating(true)
    try {
      // Convertir el texto a array de ElementoPersonalizado
      const lineas = elementosValue.split('\n').filter(l => l.trim())
      const elementosArray = lineas.map(linea => {
        // Intentar extraer cantidad si está en formato "descripcion (xN)"
        const match = linea.match(/^(.+?)\s*\(x(\d+)\)\s*$/)
        if (match) {
          return {
            descripcion: match[1].trim(),
            cantidad: parseInt(match[2])
          }
        }
        // Si no tiene cantidad, usar 1 por defecto
        return {
          descripcion: linea.trim(),
          cantidad: 1
        }
      })

      if (selectedInstalacion.tipo === 'lead') {
        await LeadService.updateLead(selectedInstalacion.id, {
          elementos_personalizados: elementosArray
        })
      } else {
        await ClienteService.actualizarCliente(selectedInstalacion.numero!, {
          elementos_personalizados: elementosArray
        })
      }
      
      toast({
        title: "Actualizado",
        description: "Elementos personalizados actualizados correctamente",
      })
      setIsEditElementosDialogOpen(false)
      onRefresh()
    } catch (error: any) {
      console.error('Error al actualizar elementos:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
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

  // Contar por tipo
  const countLeads = instalaciones.filter(i => i.tipo === 'lead').length
  const countClientes = instalaciones.filter(i => i.tipo === 'cliente').length

  if (instalaciones.length === 0 && !loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No hay instalaciones nuevas
          </h3>
          <p className="text-gray-600">
            No se encontraron leads ni clientes pendientes de instalación
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Filtros */}
      <Card className="mb-6 border-l-4 border-l-green-600">
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
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
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                className="w-full border rounded px-3 py-2"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as any)}
              >
                <option value="todos">Todos ({instalaciones.length})</option>
                <option value="leads">Leads ({countLeads})</option>
                <option value="clientes">Clientes ({countClientes})</option>
              </select>
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
      <Card className="border-l-4 border-l-green-600">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Instalaciones Nuevas ({instalaciones.length})</span>
            <div className="flex gap-2 text-sm font-normal">
              <Badge variant="outline" className="bg-blue-50">
                <User className="h-3 w-3 mr-1" />
                {countLeads} Leads
              </Badge>
              <Badge variant="outline" className="bg-green-50">
                <FileText className="h-3 w-3 mr-1" />
                {countClientes} Clientes
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Vista móvil */}
          <div className="md:hidden space-y-3">
            {instalaciones.map((instalacion) => (
              <Card key={instalacion.id} className="border-gray-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{instalacion.nombre}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Phone className="h-3 w-3" />
                        <span>{instalacion.telefono}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-gray-600 mt-1">
                        <MapPin className="h-3 w-3 mt-0.5" />
                        <span>{instalacion.direccion}</span>
                      </div>
                    </div>
                    <Badge 
                      variant={instalacion.tipo === 'lead' ? 'default' : 'secondary'}
                      className={instalacion.tipo === 'lead' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                    >
                      {instalacion.tipo === 'lead' ? 'Lead' : 'Cliente'}
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Oferta:</p>
                    <p className="text-sm text-gray-700">{formatOfertas(instalacion.ofertas || [])}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      onClick={() => handleMoverAProceso(instalacion)}
                      disabled={isUpdating}
                      title="Mover a instalación en proceso"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                      onClick={() => handleEditElementos(instalacion)}
                      title="Editar elementos personalizados"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
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
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Tipo</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Nombre</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Teléfono</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Dirección</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Oferta</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {instalaciones.map((instalacion) => (
                  <tr key={instalacion.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <Badge 
                        variant={instalacion.tipo === 'lead' ? 'default' : 'secondary'}
                        className={instalacion.tipo === 'lead' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                      >
                        {instalacion.tipo === 'lead' ? 'Lead' : 'Cliente'}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-gray-900">{instalacion.nombre}</p>
                      {instalacion.numero && (
                        <p className="text-xs text-gray-500">#{instalacion.numero}</p>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-gray-700">{instalacion.telefono}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-gray-700">{instalacion.direccion}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-gray-700">{formatOfertas(instalacion.ofertas || [])}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                          onClick={() => handleMoverAProceso(instalacion)}
                          disabled={isUpdating}
                          title="Mover a instalación en proceso"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="border-orange-300 text-orange-700 hover:bg-orange-50"
                          onClick={() => handleEditElementos(instalacion)}
                          title="Editar elementos personalizados"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo para editar elementos personalizados */}
      <Dialog open={isEditElementosDialogOpen} onOpenChange={setIsEditElementosDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Elementos Personalizados</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{selectedInstalacion?.tipo === 'lead' ? 'Lead' : 'Cliente'}: {selectedInstalacion?.nombre}</Label>
            </div>
            <div>
              <Label htmlFor="elementos">Elementos Personalizados</Label>
              <Textarea
                id="elementos"
                value={elementosValue}
                onChange={(e) => setElementosValue(e.target.value)}
                placeholder="Escribe cada elemento en una línea. Ej:&#10;Cable adicional 10m (x2)&#10;Estructura reforzada (x1)&#10;Protector de sobretensión"
                rows={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                Formato: Descripción (xCantidad). Si no especificas cantidad, se asume 1.
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsEditElementosDialogOpen(false)}
                disabled={isUpdating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveElementos}
                disabled={isUpdating}
                className="bg-gradient-to-r from-orange-500 to-orange-600"
              >
                {isUpdating ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
