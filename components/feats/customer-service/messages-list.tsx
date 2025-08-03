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
  Search
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
    if (newFiltros.estado) apiFilters.estado = newFiltros.estado as any
    if (newFiltros.tipo) apiFilters.tipo = newFiltros.tipo as any
    if (newFiltros.prioridad) apiFilters.prioridad = newFiltros.prioridad as any
    if (newFiltros.busqueda) apiFilters.cliente_numero = newFiltros.busqueda
    
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
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por cliente, número o asunto..."
              value={filtros.busqueda}
              onChange={(e) => handleFilterChange('busqueda', e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <Select value={filtros.estado} onValueChange={(value) => handleFilterChange('estado', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los estados</SelectItem>
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
                <SelectItem value="">Todos los tipos</SelectItem>
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
                <SelectItem value="">Todas las prioridades</SelectItem>
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
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    selectedMessageId === mensaje._id
                      ? 'bg-blue-50 border-blue-200 shadow-sm'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => onSelectMessage(mensaje)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getTipoIcon(mensaje.tipo)}
                      <span className="font-semibold text-gray-900">{mensaje.asunto}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getEstadoIcon(mensaje.estado)}
                      <Badge variant="outline" className={getPrioridadColor(mensaje.prioridad)}>
                        {getPrioridadLabel(mensaje.prioridad)}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{mensaje.cliente_nombre} (#{mensaje.cliente_numero})</span>
                    </div>
                    {mensaje.cliente_telefono && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{mensaje.cliente_telefono}</span>
                      </div>
                    )}
                    {mensaje.cliente_email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>{mensaje.cliente_email}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                    {mensaje.mensaje}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">
                        {getTipoLabel(mensaje.tipo)}
                      </Badge>
                      <Badge variant="outline">
                        {getEstadoLabel(mensaje.estado)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(mensaje.fecha_creacion), {
                        addSuffix: true,
                        locale: es
                      })}
                    </div>
                  </div>

                  {mensaje.respuestas && mensaje.respuestas.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        {mensaje.respuestas.length} respuesta{mensaje.respuestas.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}