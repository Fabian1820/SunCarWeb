"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Button } from "@/components/shared/atom/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shared/molecule/tabs"
import { RefreshCw, Zap, CheckCircle, Package, TrendingUp, User, Phone, MapPin, Filter, Battery, Sun, Cpu, ChevronDown, ChevronRight } from "lucide-react"
import type { EstadoEquiposData, EquipoDetalle, ClienteConEquipo } from "@/lib/types/feats/reportes-comercial/reportes-comercial-types"

interface EstadoEquiposStatsProps {
  data: EstadoEquiposData | null
  loading: boolean
  onRefresh: () => void
}

// Componente para mostrar la tarjeta de cliente
function ClienteCard({ cliente, showUnits }: { cliente: ClienteConEquipo; showUnits?: 'vendidas' | 'entregadas' | 'servicio' | 'pendientes' }) {
  // Determinar qué cantidad mostrar según el contexto
  let cantidadMostrar = cliente.cantidad_equipos
  let labelCantidad = 'unidades'
  
  if (showUnits === 'entregadas') {
    cantidadMostrar = cliente.unidades_entregadas
    labelCantidad = 'entregadas'
  } else if (showUnits === 'servicio') {
    cantidadMostrar = cliente.unidades_en_servicio
    labelCantidad = 'en servicio'
  } else if (showUnits === 'pendientes') {
    cantidadMostrar = cliente.unidades_pendientes
    labelCantidad = 'pendientes'
  } else if (showUnits === 'vendidas') {
    cantidadMostrar = cliente.unidades_vendidas
    labelCantidad = 'vendidas'
  }
  
  return (
    <div className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-all hover:shadow-md">
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <p className="font-semibold text-gray-900">{cliente.nombre}</p>
            </div>
            <p className="text-xs text-gray-500 ml-6">{cliente.codigo}</p>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
            cliente.estado === 'Instalación completada'
              ? 'bg-green-100 text-green-700'
              : cliente.estado === 'Instalación en proceso'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-orange-100 text-orange-700'
          }`}>
            {cliente.estado}
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Phone className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{cliente.telefono}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{cliente.direccion} - {cliente.provincia}</span>
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900">
              {cantidadMostrar} {cantidadMostrar === 1 ? 'unidad' : 'unidades'}
            </span>
            <span className="text-xs text-gray-500">{labelCantidad}</span>
          </div>
          {cliente.fecha_instalacion && (
            <span className="text-xs text-gray-500">
              {new Date(cliente.fecha_instalacion).toLocaleDateString('es-ES')}
            </span>
          )}
        </div>
        
        {/* Mostrar desglose si hay diferentes estados */}
        {showUnits === 'vendidas' && (cliente.unidades_entregadas > 0 || cliente.unidades_pendientes > 0) && (
          <div className="pt-2 border-t">
            <div className="grid grid-cols-3 gap-2 text-xs">
              {cliente.unidades_entregadas > 0 && (
                <div className="text-center">
                  <p className="font-semibold text-green-600">{cliente.unidades_entregadas}</p>
                  <p className="text-gray-500">Entregadas</p>
                </div>
              )}
              {cliente.unidades_en_servicio > 0 && (
                <div className="text-center">
                  <p className="font-semibold text-purple-600">{cliente.unidades_en_servicio}</p>
                  <p className="text-gray-500">En servicio</p>
                </div>
              )}
              {cliente.unidades_pendientes > 0 && (
                <div className="text-center">
                  <p className="font-semibold text-orange-600">{cliente.unidades_pendientes}</p>
                  <p className="text-gray-500">Pendientes</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function EstadoEquiposStats({ data, loading, onRefresh }: EstadoEquiposStatsProps) {
  const [selectedTab, setSelectedTab] = useState<'vendidos' | 'entregados' | 'servicio'>('vendidos')
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todas')
  const [expandedEquipos, setExpandedEquipos] = useState<Set<string>>(new Set())
  const [equipoTabState, setEquipoTabState] = useState<Record<string, string>>({})

  // Obtener todas las categorías únicas
  const categorias = useMemo(() => {
    if (!data) return []
    return data.categorias.map(cat => cat.categoria)
  }, [data])

  // Obtener icono según categoría
  const getCategoriaIcon = (categoria: string) => {
    const lower = categoria.toLowerCase()
    if (lower.includes('inversor')) return Cpu
    if (lower.includes('batería') || lower.includes('bateria')) return Battery
    if (lower.includes('panel')) return Sun
    return Zap
  }

  // Toggle equipo expandido
  const toggleEquipo = (equipoId: string) => {
    const newExpanded = new Set(expandedEquipos)
    if (newExpanded.has(equipoId)) {
      newExpanded.delete(equipoId)
    } else {
      newExpanded.add(equipoId)
    }
    setExpandedEquipos(newExpanded)
  }

  // Expandir equipo y cambiar a un tab específico
  const expandEquipoWithTab = (equipoKey: string, tab: string, event: React.MouseEvent) => {
    event.stopPropagation() // Evitar que se propague al onClick del header
    const newExpanded = new Set(expandedEquipos)
    newExpanded.add(equipoKey)
    setExpandedEquipos(newExpanded)
    setEquipoTabState({ ...equipoTabState, [equipoKey]: tab })
  }

  // Filtrar equipos según tab y categoría seleccionada
  const equiposFiltrados = useMemo(() => {
    if (!data) return []
    
    let categoriasFiltradas = data.categorias
    if (selectedCategoria !== 'todas') {
      categoriasFiltradas = data.categorias.filter(cat => cat.categoria === selectedCategoria)
    }

    const equipos: EquipoDetalle[] = []
    categoriasFiltradas.forEach(cat => {
      equipos.push(...cat.equipos)
    })

    return equipos
  }, [data, selectedCategoria])

  // Obtener clientes según el tab seleccionado
  const getClientesPorTab = (equipo: EquipoDetalle): ClienteConEquipo[] => {
    if (!equipo.clientes) return []
    
    switch (selectedTab) {
      case 'vendidos':
        return equipo.clientes
      case 'entregados':
        return equipo.clientes.filter(c => 
          c.estado === 'Instalación completada' || c.estado === 'Instalación en proceso'
        )
      case 'servicio':
        return equipo.clientes.filter(c => c.estado === 'Instalación completada')
      default:
        return equipo.clientes
    }
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
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.suncarsrl.com'
    const apiUrl = backendUrl.endsWith('/api') ? backendUrl : `${backendUrl}/api`
    
    return (
      <Card className="border-2 border-orange-200">
        <CardContent className="p-8 text-center">
          <div className="mb-4">
            <Package className="h-16 w-16 text-orange-400 mx-auto mb-4" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No se pudieron cargar los datos
          </h3>
          <p className="text-gray-600 mb-4">
            Verifica que el backend esté corriendo en:
          </p>
          <code className="bg-gray-100 px-3 py-1 rounded text-sm text-gray-800 mb-4 inline-block">
            {apiUrl}/reportes/estado-equipos
          </code>
          <div className="mt-6">
            <Button onClick={onRefresh} className="bg-orange-600 hover:bg-orange-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { resumen, categorias: categoriasData } = data

  return (
    <div className="space-y-4">
      {/* Header compacto con botón de actualizar */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Última actualización: {new Date(data.fecha_actualizacion).toLocaleString('es-ES')}
        </p>
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

      {/* Tarjetas de resumen más compactas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Vendidos */}
        <Card 
          className={`border-2 cursor-pointer transition-all ${
            selectedTab === 'vendidos' 
              ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-white shadow-lg' 
              : 'border-blue-200 bg-white hover:shadow-md'
          }`}
          onClick={() => setSelectedTab('vendidos')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Zap className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase">Vendidos</p>
                  <p className="text-2xl font-bold text-gray-900">{resumen.total_vendidos}</p>
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
        <Card 
          className={`border-2 cursor-pointer transition-all ${
            selectedTab === 'entregados' 
              ? 'border-green-500 bg-gradient-to-br from-green-50 to-white shadow-lg' 
              : 'border-green-200 bg-white hover:shadow-md'
          }`}
          onClick={() => setSelectedTab('entregados')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase">Entregados</p>
                  <p className="text-2xl font-bold text-gray-900">{resumen.total_entregados}</p>
                </div>
              </div>
              <div className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                {resumen.porcentaje_entregados}%
              </div>
            </div>
          </CardContent>
        </Card>

        {/* En Servicio */}
        <Card 
          className={`border-2 cursor-pointer transition-all ${
            selectedTab === 'servicio' 
              ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-white shadow-lg' 
              : 'border-purple-200 bg-white hover:shadow-md'
          }`}
          onClick={() => setSelectedTab('servicio')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Package className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase">En Servicio</p>
                  <p className="text-2xl font-bold text-gray-900">{resumen.total_en_servicio}</p>
                </div>
              </div>
              <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-semibold">
                {resumen.porcentaje_en_servicio}%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros por categoría más compactos */}
      <Card className="border border-gray-200">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
              <Filter className="h-3 w-3" />
              Filtrar:
            </div>
            <Button
              variant={selectedCategoria === 'todas' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategoria('todas')}
              className={`h-8 text-xs ${selectedCategoria === 'todas' ? 'bg-blue-600' : ''}`}
            >
              Todas
            </Button>
            {categorias.map((cat) => {
              const Icon = getCategoriaIcon(cat)
              return (
                <Button
                  key={`categoria-${cat}`}
                  variant={selectedCategoria === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategoria(cat)}
                  className={`h-8 text-xs ${selectedCategoria === cat ? 'bg-blue-600' : ''}`}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {cat}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Contenido según tab seleccionado */}
      <div className="space-y-4">
        {equiposFiltrados.length === 0 ? (
          <Card className="border-2 border-gray-200">
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No hay equipos para mostrar</p>
            </CardContent>
          </Card>
        ) : (
          equiposFiltrados.map((equipo, index) => {
            const clientesFiltrados = getClientesPorTab(equipo)
            const Icon = getCategoriaIcon(equipo.categoria)
            // Crear una key única combinando múltiples campos
            const equipoKey = `${equipo.codigo || equipo.id || index}-${equipo.nombre.replace(/\s/g, '-')}`
            const isExpanded = expandedEquipos.has(equipoKey)
            
            // Determinar el valor a mostrar según el tab
            let valorPrincipal = 0
            let labelPrincipal = ''
            let colorPrincipal = ''
            
            switch (selectedTab) {
              case 'vendidos':
                valorPrincipal = equipo.unidades_vendidas
                labelPrincipal = 'Vendidos'
                colorPrincipal = 'blue'
                break
              case 'entregados':
                valorPrincipal = equipo.unidades_entregadas
                labelPrincipal = 'Entregados'
                colorPrincipal = 'green'
                break
              case 'servicio':
                valorPrincipal = equipo.unidades_en_servicio
                labelPrincipal = 'En Servicio'
                colorPrincipal = 'purple'
                break
            }

            return (
              <Card key={equipoKey} className="border-2 border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Header del equipo - Clickeable para expandir */}
                <div 
                  className={`p-4 cursor-pointer transition-colors ${
                    colorPrincipal === 'blue' ? 'bg-gradient-to-r from-blue-50 to-white hover:from-blue-100' :
                    colorPrincipal === 'green' ? 'bg-gradient-to-r from-green-50 to-white hover:from-green-100' :
                    'bg-gradient-to-r from-purple-50 to-white hover:from-purple-100'
                  }`}
                  onClick={() => toggleEquipo(equipoKey)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-600 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-600 flex-shrink-0" />
                      )}
                      <div className={`p-3 rounded-lg ${
                        colorPrincipal === 'blue' ? 'bg-blue-100' :
                        colorPrincipal === 'green' ? 'bg-green-100' :
                        'bg-purple-100'
                      }`}>
                        <Icon className={`h-6 w-6 ${
                          colorPrincipal === 'blue' ? 'text-blue-600' :
                          colorPrincipal === 'green' ? 'text-green-600' :
                          'text-purple-600'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{equipo.nombre}</h3>
                        <p className="text-sm text-gray-600">{equipo.tipo} • {equipo.categoria}</p>
                      </div>
                    </div>
                    
                    {/* Estadísticas del equipo */}
                    <div className="flex items-center gap-4">
                      {/* Vendidos */}
                      <div 
                        className="text-center min-w-[70px] cursor-pointer hover:bg-blue-50 p-2 rounded-lg transition-colors"
                        onClick={(e) => expandEquipoWithTab(equipoKey, 'todos', e)}
                      >
                        <p className="text-2xl font-bold text-blue-600">{equipo.unidades_vendidas}</p>
                        <p className="text-xs text-gray-600">Vendidos</p>
                      </div>
                      
                      {/* Entregados */}
                      <div 
                        className="text-center min-w-[70px] cursor-pointer hover:bg-green-50 p-2 rounded-lg transition-colors"
                        onClick={(e) => expandEquipoWithTab(equipoKey, 'entregados', e)}
                      >
                        <p className="text-2xl font-bold text-green-600">{equipo.unidades_entregadas}</p>
                        <p className="text-xs text-gray-600">Entregados</p>
                      </div>
                      
                      {/* En Servicio */}
                      <div 
                        className="text-center min-w-[70px] cursor-pointer hover:bg-purple-50 p-2 rounded-lg transition-colors"
                        onClick={(e) => expandEquipoWithTab(equipoKey, 'servicio', e)}
                      >
                        <p className="text-2xl font-bold text-purple-600">{equipo.unidades_en_servicio}</p>
                        <p className="text-xs text-gray-600">En Servicio</p>
                      </div>
                      
                      {/* Pendientes */}
                      <div 
                        className="text-center min-w-[70px] cursor-pointer hover:bg-orange-50 p-2 rounded-lg transition-colors"
                        onClick={(e) => expandEquipoWithTab(equipoKey, 'pendientes', e)}
                      >
                        <p className="text-2xl font-bold text-orange-600">{equipo.unidades_sin_entregar}</p>
                        <p className="text-xs text-gray-600">Pendientes</p>
                      </div>
                      
                      {/* Porcentaje */}
                      <div className={`px-3 py-2 rounded-full text-sm font-semibold min-w-[60px] text-center ${
                        colorPrincipal === 'blue' ? 'bg-blue-100 text-blue-700' :
                        colorPrincipal === 'green' ? 'bg-green-100 text-green-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {selectedTab === 'entregados' ? equipo.porcentaje_entregado : 
                         selectedTab === 'servicio' ? equipo.porcentaje_en_servicio : 
                         '100'}%
                      </div>
                      
                      {/* Badge de clientes */}
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        clientesFiltrados.length > 0 
                          ? 'bg-gray-200 text-gray-700' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {clientesFiltrados.length} {clientesFiltrados.length === 1 ? 'cliente' : 'clientes'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lista de clientes - Solo visible cuando está expandido */}
                {isExpanded && (
                  <CardContent className="p-4 border-t bg-gray-50">
                    {clientesFiltrados.length > 0 ? (
                      <div className="space-y-4">
                        {/* Tabs para organizar clientes por estado */}
                        <Tabs value={equipoTabState[equipoKey] || 'todos'} onValueChange={(value) => setEquipoTabState({ ...equipoTabState, [equipoKey]: value })} className="w-full">
                          <TabsList className="grid w-full grid-cols-4 h-9">
                            <TabsTrigger value="todos" className="text-xs">
                              <Zap className="h-3 w-3 mr-1" />
                              Todos ({equipo.clientes?.length || 0})
                            </TabsTrigger>
                            <TabsTrigger value="entregados" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Entregados ({equipo.unidades_entregadas})
                            </TabsTrigger>
                            <TabsTrigger value="servicio" className="text-xs">
                              <Package className="h-3 w-3 mr-1" />
                              En Servicio ({equipo.unidades_en_servicio})
                            </TabsTrigger>
                            <TabsTrigger value="pendientes" className="text-xs">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Pendientes ({equipo.unidades_sin_entregar})
                            </TabsTrigger>
                          </TabsList>

                          {/* Todos los clientes */}
                          <TabsContent value="todos" className="mt-3">
                            {equipo.clientes && equipo.clientes.length > 0 ? (
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {equipo.clientes.map((cliente) => (
                                  <ClienteCard key={cliente.id} cliente={cliente} showUnits="vendidas" />
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6">
                                <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No hay clientes</p>
                              </div>
                            )}
                          </TabsContent>

                          {/* Clientes con equipos entregados */}
                          <TabsContent value="entregados" className="mt-3">
                            {(() => {
                              const clientesEntregados = equipo.clientes?.filter(c => c.unidades_entregadas > 0) || []
                              return clientesEntregados.length > 0 ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                  {clientesEntregados.map((cliente) => (
                                    <ClienteCard key={cliente.id} cliente={cliente} showUnits="entregadas" />
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-6">
                                  <CheckCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                  <p className="text-sm text-gray-500">No hay clientes con equipos entregados</p>
                                </div>
                              )
                            })()}
                          </TabsContent>

                          {/* Clientes con equipos en servicio */}
                          <TabsContent value="servicio" className="mt-3">
                            {(() => {
                              const clientesServicio = equipo.clientes?.filter(c => c.unidades_en_servicio > 0) || []
                              return clientesServicio.length > 0 ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                  {clientesServicio.map((cliente) => (
                                    <ClienteCard key={cliente.id} cliente={cliente} showUnits="servicio" />
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-6">
                                  <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                  <p className="text-sm text-gray-500">No hay clientes con equipos en servicio</p>
                                </div>
                              )
                            })()}
                          </TabsContent>

                          {/* Clientes con equipos pendientes */}
                          <TabsContent value="pendientes" className="mt-3">
                            {(() => {
                              const clientesPendientes = equipo.clientes?.filter(c => c.unidades_pendientes > 0) || []
                              return clientesPendientes.length > 0 ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                  {clientesPendientes.map((cliente) => (
                                    <ClienteCard key={cliente.id} cliente={cliente} showUnits="pendientes" />
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-6">
                                  <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                  <p className="text-sm text-gray-500">No hay clientes con equipos pendientes</p>
                                </div>
                              )
                            })()}
                          </TabsContent>
                        </Tabs>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No hay clientes en esta categoría</p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
