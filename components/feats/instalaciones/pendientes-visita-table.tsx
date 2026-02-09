"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import { Search, Phone, MapPin, Package, User, FileText, MessageSquare } from "lucide-react"
import type { PendienteVisita } from "@/lib/types/feats/instalaciones/instalaciones-types"

interface PendientesVisitaTableProps {
  pendientes: PendienteVisita[]
  loading: boolean
  onRefresh: () => void
}

export function PendientesVisitaTable({
  pendientes,
  loading,
  onRefresh,
}: PendientesVisitaTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [tipoFilter, setTipoFilter] = useState<"todos" | "leads" | "clientes">("todos")
  const [provinciaFilter, setProvinciaFilter] = useState("todas")

  // Filtrar pendientes
  const pendientesFiltrados = useMemo(() => {
    return pendientes.filter(pendiente => {
      // Filtro de búsqueda
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchesSearch = 
          pendiente.nombre.toLowerCase().includes(search) ||
          pendiente.telefono.toLowerCase().includes(search) ||
          pendiente.direccion.toLowerCase().includes(search) ||
          pendiente.comentario.toLowerCase().includes(search) ||
          pendiente.fuente.toLowerCase().includes(search)
        
        if (!matchesSearch) return false
      }

      // Filtro de tipo
      if (tipoFilter !== "todos" && pendiente.tipo !== tipoFilter.slice(0, -1)) {
        return false
      }

      // Filtro de provincia
      if (provinciaFilter !== "todas" && pendiente.provincia !== provinciaFilter) {
        return false
      }

      return true
    })
  }, [pendientes, searchTerm, tipoFilter, provinciaFilter])

  // Obtener lista de provincias únicas
  const provincias = useMemo(() => {
    const uniqueProvincias = new Set(pendientes.map(p => p.provincia))
    return Array.from(uniqueProvincias).sort((a, b) => {
      // La Habana primero
      if (a.toLowerCase().includes('habana')) return -1
      if (b.toLowerCase().includes('habana')) return 1
      return a.localeCompare(b)
    })
  }, [pendientes])

  // Contar por tipo
  const countLeads = pendientesFiltrados.filter(p => p.tipo === 'lead').length
  const countClientes = pendientesFiltrados.filter(p => p.tipo === 'cliente').length

  const handleAgregarResultado = (pendiente: PendienteVisita) => {
    // TODO: Implementar diálogo para agregar resultados de la visita
    console.log('Agregar resultado para:', pendiente)
  }

  return (
    <>
      {/* Filtros */}
      <Card className="mb-6 border-l-4 border-l-orange-600">
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value as any)}
              >
                <option value="todos">Todos</option>
                <option value="leads">Leads</option>
                <option value="clientes">Clientes</option>
              </select>
            </div>
            <div>
              <Label htmlFor="provincia">Provincia</Label>
              <select
                id="provincia"
                className="w-full border rounded px-3 py-2"
                value={provinciaFilter}
                onChange={(e) => setProvinciaFilter(e.target.value)}
              >
                <option value="todas">Todas</option>
                {provincias.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="border-l-4 border-l-orange-600">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pendientes de Visita ({pendientesFiltrados.length})</span>
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
          {pendientesFiltrados.length === 0 && !loading ? (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay pendientes de visita
              </h3>
              <p className="text-gray-600">
                No se encontraron registros con los filtros aplicados
              </p>
            </div>
          ) : (
            <>
              {/* Vista móvil */}
              <div className="md:hidden space-y-3">
                {pendientesFiltrados.map((pendiente) => (
                  <Card key={pendiente.id} className="border-gray-200">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{pendiente.nombre}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <Phone className="h-3 w-3" />
                            <span>{pendiente.telefono}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm text-gray-600 mt-1">
                            <MapPin className="h-3 w-3 mt-0.5" />
                            <span>{pendiente.direccion}</span>
                          </div>
                        </div>
                        <Badge 
                          variant={pendiente.tipo === 'lead' ? 'default' : 'secondary'}
                          className={pendiente.tipo === 'lead' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                        >
                          {pendiente.tipo === 'lead' ? 'Lead' : 'Cliente'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Provincia:</p>
                          <p className="text-gray-700">{pendiente.provincia}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Fuente:</p>
                          <p className="text-gray-700">{pendiente.fuente || 'N/A'}</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Oferta:</p>
                        <p className="text-sm text-gray-700">{pendiente.oferta}</p>
                      </div>
                      
                      {pendiente.comentario && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Comentario:</p>
                          <p className="text-sm text-gray-700">{pendiente.comentario}</p>
                        </div>
                      )}

                      <Button
                        onClick={() => handleAgregarResultado(pendiente)}
                        size="sm"
                        className="w-full bg-orange-600 hover:bg-orange-700"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Agregar Resultado de Visita
                      </Button>
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
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Provincia</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Oferta</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Comentario</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Fuente</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendientesFiltrados.map((pendiente) => (
                      <tr key={pendiente.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <Badge 
                            variant={pendiente.tipo === 'lead' ? 'default' : 'secondary'}
                            className={pendiente.tipo === 'lead' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                          >
                            {pendiente.tipo === 'lead' ? 'Lead' : 'Cliente'}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold text-gray-900">{pendiente.nombre}</p>
                          {pendiente.numero && (
                            <p className="text-xs text-gray-500">#{pendiente.numero}</p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">{pendiente.telefono}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">{pendiente.direccion}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">{pendiente.provincia}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">{pendiente.oferta}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">{pendiente.comentario || 'N/A'}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">{pendiente.fuente || 'N/A'}</p>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <Button
                            onClick={() => handleAgregarResultado(pendiente)}
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Agregar Resultado
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  )
}
