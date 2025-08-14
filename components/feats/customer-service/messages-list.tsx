"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Separator } from "@/components/shared/molecule/separator"
import { 
  MessageCircle, 
  AlertTriangle, 
  HelpCircle, 
  FileText, 
  Clock, 
  User, 
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  X
} from "lucide-react"
import type { MensajeCliente } from "@/lib/api-types"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface MessagesListProps {
  mensajes: MensajeCliente[]
  loading: boolean
  onSelectMessage: (mensaje: MensajeCliente) => void
  selectedMessageId?: string
  onFilterChange: (filtros: {
    estado?: 'nuevo' | 'en_proceso' | 'respondido' | 'cerrado'
    tipo?: 'queja' | 'consulta' | 'sugerencia' | 'reclamo'
    prioridad?: 'baja' | 'media' | 'alta' | 'urgente'
    cliente_numero?: string
  }) => void
}

export default function MessagesList({ 
  mensajes, 
  loading, 
  onSelectMessage, 
  selectedMessageId,
  onFilterChange 
}: MessagesListProps) {
  const [filtros, setFiltros] = useState({
    busqueda: '',
    estado: '',
    tipo: '',
    prioridad: ''
  })
  const [searchTerm, setSearchTerm] = useState('')

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'queja':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'consulta':
        return <HelpCircle className="h-4 w-4 text-blue-500" />
      case 'sugerencia':
        return <MessageCircle className="h-4 w-4 text-green-500" />
      case 'reclamo':
        return <FileText className="h-4 w-4 text-orange-500" />
      default:
        return <MessageCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'nuevo':
        return <AlertCircle className="h-4 w-4 text-blue-500" />
      case 'en_proceso':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'respondido':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'cerrado':
        return <XCircle className="h-4 w-4 text-gray-500" />
      default:
        return <MessageCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getTipoLabel = (tipo: string) => {
    const tipos = {
      queja: 'Queja',
      consulta: 'Consulta',
      sugerencia: 'Sugerencia',
      reclamo: 'Reclamo'
    }
    return tipos[tipo as keyof typeof tipos] || tipo
  }

  const getEstadoLabel = (estado: string) => {
    const estados = {
      nuevo: 'Nuevo',
      en_proceso: 'En Proceso',
      respondido: 'Respondido',
      cerrado: 'Cerrado'
    }
    return estados[estado as keyof typeof estados] || estado
  }

  const getPrioridadColor = (prioridad: string) => {
    const colores = {
      baja: 'bg-gray-100 text-gray-800 border-gray-200',
      media: 'bg-blue-100 text-blue-800 border-blue-200',
      alta: 'bg-orange-100 text-orange-800 border-orange-200',
      urgente: 'bg-red-100 text-red-800 border-red-200'
    }
    return colores[prioridad as keyof typeof colores] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getPrioridadLabel = (prioridad: string) => {
    const prioridades = {
      baja: 'Baja',
      media: 'Media',
      alta: 'Alta',
      urgente: 'Urgente'
    }
    return prioridades[prioridad as keyof typeof prioridades] || prioridad
  }

  const handleFilterChange = (key: string, value: string) => {
    const newFiltros = { ...filtros, [key]: value }
    setFiltros(newFiltros)
    
    const apiFilters: any = {}
    // Solo agregar filtros si no son los valores "todos"
    if (newFiltros.estado && newFiltros.estado !== 'todos_estados') {
      apiFilters.estado = newFiltros.estado as any
    }
    if (newFiltros.tipo && newFiltros.tipo !== 'todos_tipos') {
      apiFilters.tipo = newFiltros.tipo as any
    }
    if (newFiltros.prioridad && newFiltros.prioridad !== 'todas_prioridades') {
      apiFilters.prioridad = newFiltros.prioridad as any
    }
    if (newFiltros.busqueda) {
      apiFilters.cliente_numero = newFiltros.busqueda
    }
    
    onFilterChange(apiFilters)
  }

  const handleSearch = () => {
    const newFiltros = { ...filtros, busqueda: searchTerm }
    setFiltros(newFiltros)
    
    const apiFilters: any = {}
    if (newFiltros.estado && newFiltros.estado !== 'todos_estados') {
      apiFilters.estado = newFiltros.estado as any
    }
    if (newFiltros.tipo && newFiltros.tipo !== 'todos_tipos') {
      apiFilters.tipo = newFiltros.tipo as any
    }
    if (newFiltros.prioridad && newFiltros.prioridad !== 'todas_prioridades') {
      apiFilters.prioridad = newFiltros.prioridad as any
    }
    if (searchTerm.trim()) {
      apiFilters.cliente_numero = searchTerm.trim()
    }
    
    onFilterChange(apiFilters)
  }

  const clearSearch = () => {
    setSearchTerm('')
    const newFiltros = { ...filtros, busqueda: '' }
    setFiltros(newFiltros)
    
    const apiFilters: any = {}
    if (newFiltros.estado && newFiltros.estado !== 'todos_estados') {
      apiFilters.estado = newFiltros.estado as any
    }
    if (newFiltros.tipo && newFiltros.tipo !== 'todos_tipos') {
      apiFilters.tipo = newFiltros.tipo as any
    }
    if (newFiltros.prioridad && newFiltros.prioridad !== 'todas_prioridades') {
      apiFilters.prioridad = newFiltros.prioridad as any
    }
    
    onFilterChange(apiFilters)
  }

  const mensajesFiltrados = mensajes.filter(mensaje => {
    if (filtros.busqueda && !mensaje.cliente_numero.toLowerCase().includes(filtros.busqueda.toLowerCase()) &&
        !mensaje.cliente_nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()) &&
        !mensaje.asunto.toLowerCase().includes(filtros.busqueda.toLowerCase())) {
      return false
    }
    return true
  })

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Mensajes de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Cargando mensajes...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-blue-500" />
          Mensajes de Clientes
        </CardTitle>
        
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por cliente, número o asunto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button 
              onClick={handleSearch}
              disabled={!searchTerm.trim()}
              variant="outline"
              className="px-4 transition-all duration-200 hover:bg-blue-50 hover:border-blue-300"
            >
              <Search className="h-4 w-4" />
            </Button>
            {filtros.busqueda && (
              <Button 
                onClick={clearSearch}
                variant="outline"
                className="px-3 text-gray-500 hover:text-red-600 hover:border-red-300"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select value={filtros.estado} onValueChange={(value) => handleFilterChange('estado', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos_estados">Todos los estados</SelectItem>
                <SelectItem value="nuevo">Nuevo</SelectItem>
                <SelectItem value="en_proceso">En Proceso</SelectItem>
                <SelectItem value="respondido">Respondido</SelectItem>
                <SelectItem value="cerrado">Cerrado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtros.tipo} onValueChange={(value) => handleFilterChange('tipo', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos_tipos">Todos los tipos</SelectItem>
                <SelectItem value="queja">Queja</SelectItem>
                <SelectItem value="consulta">Consulta</SelectItem>
                <SelectItem value="sugerencia">Sugerencia</SelectItem>
                <SelectItem value="reclamo">Reclamo</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtros.prioridad} onValueChange={(value) => handleFilterChange('prioridad', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas_prioridades">Todas las prioridades</SelectItem>
                <SelectItem value="baja">Baja</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="h-full overflow-y-auto">
          {mensajesFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <MessageCircle className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500 text-center">No hay mensajes que coincidan con los filtros</p>
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {mensajesFiltrados.map((mensaje) => (
                <div
                  key={mensaje._id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-[1.02] hover:shadow-lg ${
                    selectedMessageId === mensaje._id
                      ? 'bg-blue-50 border-blue-200 shadow-md scale-[1.01]'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => onSelectMessage(mensaje)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getTipoIcon(mensaje.tipo)}
                      <span className="font-semibold text-gray-900 truncate">{mensaje.asunto}</span>
                    </div>
                    <Badge variant="outline" className={`${getPrioridadColor(mensaje.prioridad)} flex-shrink-0 self-start sm:ml-2`}>
                      {getPrioridadLabel(mensaje.prioridad)}
                    </Badge>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{mensaje.cliente_nombre}</span>
                    </div>
                    <span className="text-gray-400 hidden sm:inline">•</span>
                    <Badge variant="outline" className="flex-shrink-0 self-start">
                      {getEstadoLabel(mensaje.estado)}
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                    {mensaje.mensaje}
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span className="truncate">
                        {formatDistanceToNow(new Date(mensaje.fecha_creacion), {
                          addSuffix: true,
                          locale: es
                        })}
                      </span>
                    </div>
                    {mensaje.respuestas && mensaje.respuestas.length > 0 && (
                      <span className="text-xs text-blue-600 font-medium flex-shrink-0">
                        {mensaje.respuestas.length} respuesta{mensaje.respuestas.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}