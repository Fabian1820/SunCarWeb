"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Button } from "@/components/shared/atom/button"
import { RefreshCw, Zap, CheckCircle, Package, TrendingUp, ChevronDown, ChevronRight, User, Phone, MapPin } from "lucide-react"
import type { EstadoEquiposData, EquipoDetalle } from "@/lib/types/feats/reportes-comercial/reportes-comercial-types"

interface EstadoEquiposStatsProps {
  data: EstadoEquiposData | null
  loading: boolean
  onRefresh: () => void
}

export function EstadoEquiposStats({ data, loading, onRefresh }: EstadoEquiposStatsProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedEquipos, setExpandedEquipos] = useState<Set<string>>(new Set())

  const toggleCategory = (categoria: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoria)) {
      newExpanded.delete(categoria)
    } else {
      newExpanded.add(categoria)
    }
    setExpandedCategories(newExpanded)
  }

  const toggleEquipo = (equipoId: string) => {
    const newExpanded = new Set(expandedEquipos)
    if (newExpanded.has(equipoId)) {
      newExpanded.delete(equipoId)
    } else {
      newExpanded.add(equipoId)
    }
    setExpandedEquipos(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-600">No hay datos disponibles</p>
          <Button onClick={onRefresh} className="mt-4">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { resumen, categorias } = data

  return (
    <div className="space-y-6">
      {/* Header con botón de actualizar */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">
            Última actualización: {new Date(data.fecha_actualizacion).toLocaleString('es-ES')}
          </p>
        </div>
        <Button
          onClick={onRefresh}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Vendidos */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Zap className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">TOTAL VENDIDOS</p>
                    <p className="text-3xl font-bold text-gray-900">{resumen.total_vendidos}</p>
                  </div>
                </div>
              </div>
              {resumen.variacion_mensual !== 0 && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                  resumen.variacion_mensual > 0 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  <TrendingUp className={`h-3 w-3 ${resumen.variacion_mensual < 0 ? 'rotate-180' : ''}`} />
                  {Math.abs(resumen.variacion_mensual)}%
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Entregados */}
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-green-100 p-3 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">ENTREGADOS</p>
                    <p className="text-3xl font-bold text-gray-900">{resumen.total_entregados}</p>
                  </div>
                </div>
              </div>
              <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                {resumen.porcentaje_entregados}%
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sin Entregar */}
        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-orange-100 p-3 rounded-full">
                    <Package className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">SIN ENTREGAR</p>
                    <p className="text-3xl font-bold text-gray-900">{resumen.total_sin_entregar}</p>
                  </div>
                </div>
              </div>
              <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">
                {100 - resumen.porcentaje_entregados}%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categorías expandibles */}
      <div className="space-y-4">
        {categorias.map((categoria) => {
          const isExpanded = expandedCategories.has(categoria.categoria)
          
          return (
            <Card key={categoria.categoria} className="border-2 overflow-hidden">
              {/* Header de categoría */}
              <div
                className="p-4 bg-gradient-to-r from-blue-50 to-white cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => toggleCategory(categoria.categoria)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-600" />
                    )}
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Zap className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{categoria.categoria}</h3>
                      <p className="text-sm text-gray-600">{categoria.descripcion}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{categoria.unidades_vendidas}</p>
                      <p className="text-xs text-gray-600">Vendidos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{categoria.unidades_entregadas}</p>
                      <p className="text-xs text-gray-600">Entregados</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{categoria.unidades_sin_entregar}</p>
                      <p className="text-xs text-gray-600">Pendientes</p>
                    </div>
                    <div className="bg-blue-100 text-blue-700 px-3 py-2 rounded-full text-sm font-semibold min-w-[60px] text-center">
                      {categoria.porcentaje_entregado}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de equipos (expandible) */}
              {isExpanded && categoria.equipos.length > 0 && (
                <CardContent className="p-0 border-t">
                  <div className="divide-y">
                    {categoria.equipos.map((equipo) => {
                      const isEquipoExpanded = expandedEquipos.has(equipo.id)
                      
                      return (
                        <div key={equipo.id}>
                          {/* Fila del equipo */}
                          <div
                            className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => toggleEquipo(equipo.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                {isEquipoExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-500" />
                                )}
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900">{equipo.nombre}</p>
                                  <p className="text-sm text-gray-600">{equipo.tipo}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="text-center min-w-[80px]">
                                  <p className="text-lg font-bold text-gray-900">{equipo.unidades_vendidas}</p>
                                  <p className="text-xs text-gray-600">Vendidos</p>
                                </div>
                                <div className="text-center min-w-[80px]">
                                  <p className="text-lg font-bold text-green-600">{equipo.unidades_entregadas}</p>
                                  <p className="text-xs text-gray-600">Entregados</p>
                                </div>
                                <div className="text-center min-w-[80px]">
                                  <p className="text-lg font-bold text-blue-600">{equipo.unidades_en_servicio}</p>
                                  <p className="text-xs text-gray-600">En Servicio</p>
                                </div>
                                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold min-w-[60px] text-center">
                                  {equipo.porcentaje_entregado}%
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Lista de clientes (expandible) */}
                          {isEquipoExpanded && equipo.clientes && equipo.clientes.length > 0 && (
                            <div className="bg-gray-50 border-t">
                              <div className="p-4">
                                <p className="text-sm font-semibold text-gray-700 mb-3">
                                  Clientes con este equipo ({equipo.clientes.length})
                                </p>
                                <div className="space-y-2">
                                  {equipo.clientes.map((cliente) => (
                                    <div
                                      key={cliente.id}
                                      className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1 space-y-1">
                                          <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-gray-500" />
                                            <p className="font-semibold text-gray-900">{cliente.nombre}</p>
                                            <span className="text-xs text-gray-500">({cliente.codigo})</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Phone className="h-3 w-3" />
                                            <span>{cliente.telefono}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <MapPin className="h-3 w-3" />
                                            <span>{cliente.direccion} - {cliente.provincia}</span>
                                          </div>
                                        </div>
                                        <div className="text-right ml-4">
                                          <div className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                            cliente.estado === 'Instalación completada'
                                              ? 'bg-green-100 text-green-700'
                                              : cliente.estado === 'Instalación en proceso'
                                              ? 'bg-blue-100 text-blue-700'
                                              : 'bg-orange-100 text-orange-700'
                                          }`}>
                                            {cliente.estado}
                                          </div>
                                          {cliente.fecha_instalacion && (
                                            <p className="text-xs text-gray-500 mt-1">
                                              {new Date(cliente.fecha_instalacion).toLocaleDateString('es-ES')}
                                            </p>
                                          )}
                                          <p className="text-sm font-semibold text-gray-900 mt-1">
                                            {cliente.cantidad_equipos} {cliente.cantidad_equipos === 1 ? 'unidad' : 'unidades'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
